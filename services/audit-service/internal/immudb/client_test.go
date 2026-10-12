package immudb

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/codenotary/immudb/pkg/api/schema"
	"github.com/codenotary/immudb/pkg/client"
	"github.com/digital-twin/platform/services/audit-service/internal/events"
)

// memStore applies SetAll as one commit. A failed call writes neither key, which
// is the crash case two separate Set calls cannot guarantee.
type memStore struct {
	values       map[string][]byte
	setAllErr    error
	setAllCalls  int
	setCalls     int
	verifiedGets int
	lastKVCount  int
}

func (m *memStore) VerifiedGet(ctx context.Context, key []byte, opts ...client.GetOption) (*schema.Entry, error) {
	m.verifiedGets++
	value, ok := m.values[string(key)]
	if !ok {
		return nil, errors.New("key not found")
	}
	copied := append([]byte(nil), value...)
	return &schema.Entry{Key: append([]byte(nil), key...), Value: copied}, nil
}

func (m *memStore) Set(ctx context.Context, key []byte, value []byte) (*schema.TxHeader, error) {
	m.setCalls++
	if m.values == nil {
		m.values = map[string][]byte{}
	}
	m.values[string(key)] = append([]byte(nil), value...)
	return &schema.TxHeader{Nentries: 1}, nil
}

func (m *memStore) SetAll(ctx context.Context, req *schema.SetRequest) (*schema.TxHeader, error) {
	m.setAllCalls++
	m.lastKVCount = len(req.KVs)
	if m.setAllErr != nil {
		return nil, m.setAllErr
	}
	if m.values == nil {
		m.values = map[string][]byte{}
	}
	staged := make(map[string][]byte, len(req.KVs))
	for _, kv := range req.KVs {
		staged[string(kv.Key)] = append([]byte(nil), kv.Value...)
	}
	for key, value := range staged {
		m.values[key] = value
	}
	return &schema.TxHeader{Nentries: int32(len(req.KVs))}, nil
}

func (m *memStore) HealthCheck(ctx context.Context) error { return nil }

func sampleEntry(id string, seq int64, hash, previous string) events.AuditEntry {
	return events.AuditEntry{
		EntryID:        id,
		EntryType:      "Alert",
		SequenceNumber: seq,
		PayloadHash:    hash,
		PreviousHash:   previous,
		Payload:        json.RawMessage(`{"alertId":"a1"}`),
		Metadata:       json.RawMessage(`{}`),
	}
}

func TestAppendEntryCommitsEntryAndHeadTogether(t *testing.T) {
	t.Parallel()

	store := &memStore{values: map[string][]byte{}}
	c := &Client{cli: store}
	entry := sampleEntry("entry-1", 1, "sha256:abc", "")

	if err := c.AppendEntry(context.Background(), entry); err != nil {
		t.Fatalf("append: %v", err)
	}
	if store.setCalls != 0 {
		t.Fatalf("entry and head were written with Set, not one SetAll: setCalls=%d", store.setCalls)
	}
	if store.setAllCalls != 1 || store.lastKVCount != 2 {
		t.Fatalf("setAllCalls=%d keys=%d, want one transaction with entry and head", store.setAllCalls, store.lastKVCount)
	}
	if store.verifiedGets == 0 {
		t.Fatal("reads did not use VerifiedGet")
	}

	head, err := c.GetHead(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if head.LastSequence != 1 || head.LastPayloadHash != "sha256:abc" {
		t.Fatalf("head = %+v", head)
	}
	got, err := c.GetEntry(context.Background(), entry.EntryID)
	if err != nil {
		t.Fatal(err)
	}
	if got.SequenceNumber != head.LastSequence || got.PayloadHash != head.LastPayloadHash {
		t.Fatalf("entry and head diverged: entry=%d %s head=%d %s", got.SequenceNumber, got.PayloadHash, head.LastSequence, head.LastPayloadHash)
	}

	if err := c.AppendEntry(context.Background(), entry); err != nil {
		t.Fatalf("idempotent replay: %v", err)
	}
	if store.setAllCalls != 1 {
		t.Fatalf("replay committed again: setAllCalls=%d", store.setAllCalls)
	}
}

func TestAppendEntrySetAllFailureDoesNotAdvanceHead(t *testing.T) {
	t.Parallel()

	prev, err := json.Marshal(HeadState{LastSequence: 4, LastPayloadHash: "sha256:prev"})
	if err != nil {
		t.Fatal(err)
	}
	store := &memStore{
		values:    map[string][]byte{headKeyPrefix: append([]byte(nil), prev...)},
		setAllErr: errors.New("tx aborted"),
	}
	c := &Client{cli: store}
	entry := sampleEntry("entry-2", 5, "sha256:next", "sha256:prev")

	err = c.AppendEntry(context.Background(), entry)
	if err == nil {
		t.Fatal("expected commit failure")
	}
	if store.setCalls != 0 {
		t.Fatal("failure path wrote a key with Set")
	}
	if store.lastKVCount != 2 {
		t.Fatalf("failed transaction had %d keys, want entry and head together", store.lastKVCount)
	}
	if !bytes.Equal(prev, store.values[headKeyPrefix]) {
		t.Fatalf("head changed on failed commit: %s", store.values[headKeyPrefix])
	}
	if _, exists := store.values[entryKeyPrefix+entry.EntryID]; exists {
		t.Fatal("entry stored without a matching head")
	}

	head, err := c.GetHead(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if head.LastSequence != 4 || head.LastPayloadHash != "sha256:prev" {
		t.Fatalf("published a new head: %+v", head)
	}
	if _, err := c.GetEntry(context.Background(), entry.EntryID); !IsKeyNotFound(err) {
		t.Fatalf("entry readable after failed commit: %v", err)
	}
}

func TestAppendEntryRejectsConflictingReplay(t *testing.T) {
	t.Parallel()

	store := &memStore{values: map[string][]byte{}}
	c := &Client{cli: store}
	if err := c.AppendEntry(context.Background(), sampleEntry("entry-3", 1, "sha256:one", "")); err != nil {
		t.Fatal(err)
	}
	err := c.AppendEntry(context.Background(), sampleEntry("entry-3", 1, "sha256:other", ""))
	if err == nil {
		t.Fatal("expected conflicting replay to fail")
	}
	if store.setAllCalls != 1 {
		t.Fatalf("conflict wrote another transaction: setAllCalls=%d", store.setAllCalls)
	}
	head, err := c.GetHead(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if head.LastPayloadHash != "sha256:one" {
		t.Fatalf("head = %+v", head)
	}
}

func TestAppendEntryRejectsABrokenLink(t *testing.T) {
	t.Parallel()

	store := &memStore{values: map[string][]byte{}}
	c := &Client{cli: store}
	if err := c.AppendEntry(context.Background(), sampleEntry("entry-1", 1, "sha256:one", "")); err != nil {
		t.Fatal(err)
	}
	err := c.AppendEntry(context.Background(), sampleEntry("entry-2", 2, "sha256:two", "sha256:nope"))
	if err == nil {
		t.Fatal("expected a broken previous hash to fail")
	}
	if store.setAllCalls != 1 {
		t.Fatalf("broken link was committed: setAllCalls=%d", store.setAllCalls)
	}
	if err := c.AppendEntry(context.Background(), sampleEntry("entry-2", 2, "sha256:two", "sha256:one")); err != nil {
		t.Fatal(err)
	}
	head, err := c.GetHead(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if head.LastSequence != 2 || head.LastPayloadHash != "sha256:two" {
		t.Fatalf("head = %+v", head)
	}
}
