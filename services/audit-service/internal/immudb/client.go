package immudb

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/codenotary/immudb/pkg/api/schema"
	"github.com/codenotary/immudb/pkg/client"
	"github.com/digital-twin/platform/services/audit-service/internal/events"
)

const (
	headKeyPrefix  = "audit:head"
	entryKeyPrefix = "audit:entry:"
)

type HeadState struct {
	LastSequence    int64  `json:"lastSequence"`
	LastPayloadHash string `json:"lastPayloadHash"`
}

type Ledger interface {
	Ping(ctx context.Context) error
	AppendEntry(ctx context.Context, entry events.AuditEntry) error
	GetEntry(ctx context.Context, entryID string) (events.AuditEntry, error)
	GetHead(ctx context.Context) (HeadState, error)
}

// chainStore is the immudb surface the ledger uses. SetAll writes every key in
// one transaction. VerifiedGet checks the inclusion proof for a key.
type chainStore interface {
	VerifiedGet(ctx context.Context, key []byte, opts ...client.GetOption) (*schema.Entry, error)
	Set(ctx context.Context, key []byte, value []byte) (*schema.TxHeader, error)
	SetAll(ctx context.Context, req *schema.SetRequest) (*schema.TxHeader, error)
	HealthCheck(ctx context.Context) error
}

type sessionCloser interface {
	CloseSession(ctx context.Context) error
	Disconnect() error
}

type Client struct {
	cli      chainStore
	session  sessionCloser
	database string
}

func Connect(ctx context.Context, host string, port int, database, user, password string) (*Client, error) {
	opts := client.DefaultOptions().
		WithAddress(host).
		WithPort(port)

	cli := client.NewClient()
	cli.WithOptions(opts)

	if err := cli.OpenSession(ctx, []byte(user), []byte(password), database); err != nil {
		_ = cli.CloseSession(ctx)
		_ = cli.Disconnect()
		if createErr := tryCreateDatabase(ctx, host, port, user, password, database); createErr != nil {
			return nil, fmt.Errorf("open session: %w (ensure db: %v)", err, createErr)
		}
		cli = client.NewClient()
		cli.WithOptions(opts)
		if err := cli.OpenSession(ctx, []byte(user), []byte(password), database); err != nil {
			_ = cli.CloseSession(ctx)
			_ = cli.Disconnect()
			return nil, fmt.Errorf("open session after create: %w", err)
		}
	}

	return &Client{cli: cli, session: cli, database: database}, nil
}

func tryCreateDatabase(ctx context.Context, host string, port int, user, password, database string) error {
	opts := client.DefaultOptions().WithAddress(host).WithPort(port)
	cli := client.NewClient()
	cli.WithOptions(opts)
	defer cli.Disconnect()

	if err := cli.OpenSession(ctx, []byte(user), []byte(password), "defaultdb"); err != nil {
		return err
	}
	defer func() { _ = cli.CloseSession(ctx) }()

	_, err := cli.CreateDatabaseV2(ctx, database, &schema.DatabaseNullableSettings{})
	return err
}

func (c *Client) Close() error {
	if c == nil || c.session == nil {
		return nil
	}
	ctx := context.Background()
	_ = c.session.CloseSession(ctx)
	return c.session.Disconnect()
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.cli == nil {
		return fmt.Errorf("immudb client not initialized")
	}
	return c.cli.HealthCheck(ctx)
}

func (c *Client) ResetHead(ctx context.Context) error {
	headBytes, err := json.Marshal(HeadState{})
	if err != nil {
		return err
	}
	_, err = c.cli.Set(ctx, []byte(headKeyPrefix), headBytes)
	return err
}

func (c *Client) verifiedGet(ctx context.Context, key []byte) (*schema.Entry, error) {
	// VerifiedGet checks the immudb inclusion proof before returning the value.
	return c.cli.VerifiedGet(ctx, key)
}

func (c *Client) GetHead(ctx context.Context) (HeadState, error) {
	entry, err := c.verifiedGet(ctx, []byte(headKeyPrefix))
	if err != nil {
		if IsKeyNotFound(err) {
			return HeadState{}, nil
		}
		return HeadState{}, fmt.Errorf("get head: %w", err)
	}
	var head HeadState
	if err := json.Unmarshal(entry.Value, &head); err != nil {
		return HeadState{}, fmt.Errorf("decode head: %w", err)
	}
	return head, nil
}

func (c *Client) AppendEntry(ctx context.Context, entry events.AuditEntry) error {
	if existing, err := c.GetEntry(ctx, entry.EntryID); err == nil {
		if existing.PayloadHash == entry.PayloadHash && existing.SequenceNumber == entry.SequenceNumber {
			return nil
		}
		return fmt.Errorf("entry %s already exists with different content", entry.EntryID)
	} else if !IsKeyNotFound(err) {
		return err
	}

	headNow, err := c.GetHead(ctx)
	if err != nil {
		return err
	}
	if headNow.LastSequence == 0 {
		if entry.PreviousHash != "" || entry.SequenceNumber != 1 {
			return fmt.Errorf("first audit entry must be sequence 1 with an empty previous hash")
		}
	} else if entry.PreviousHash != headNow.LastPayloadHash || entry.SequenceNumber != headNow.LastSequence+1 {
		return fmt.Errorf("audit entry does not extend the head")
	}

	body, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	head := HeadState{
		LastSequence:    entry.SequenceNumber,
		LastPayloadHash: entry.PayloadHash,
	}
	headBytes, err := json.Marshal(head)
	if err != nil {
		return err
	}
	// One SetAll transaction commits the entry and the head together. A failure
	// leaves both keys unchanged, so the head cannot move without the entry.
	key := entryKeyPrefix + entry.EntryID
	_, err = c.cli.SetAll(ctx, &schema.SetRequest{
		KVs: []*schema.KeyValue{
			{Key: []byte(key), Value: body},
			{Key: []byte(headKeyPrefix), Value: headBytes},
		},
	})
	if err != nil {
		return fmt.Errorf("commit entry and head: %w", err)
	}
	slog.Info("appended audit entry to immudb", "entryId", entry.EntryID, "sequence", entry.SequenceNumber)
	return nil
}

func (c *Client) GetEntry(ctx context.Context, entryID string) (events.AuditEntry, error) {
	entry, err := c.verifiedGet(ctx, []byte(entryKeyPrefix+entryID))
	if err != nil {
		return events.AuditEntry{}, fmt.Errorf("get entry %s: %w", entryID, err)
	}
	var out events.AuditEntry
	if err := json.Unmarshal(entry.Value, &out); err != nil {
		return events.AuditEntry{}, err
	}
	return out, nil
}
