package store

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
)

func newReviewAlert(t *testing.T, st *Store) Alert {
	t.Helper()
	alert, _, err := st.UpsertAlert(context.Background(), UpsertInput{
		AlertID: uuid.NewString(), RuleCode: "BASEL-M001", Regime: "Basel", Severity: "Critical", Status: "Open",
		PersonaID: uuid.NewString(), PersonaType: "Institution", Summary: "Synthetic liquidity fixture", DetectedAt: time.Now().UTC(), IdempotencyKey: uuid.NewString(),
	})
	if err != nil {
		t.Fatal(err)
	}
	return alert
}

func TestReviewHistoryReplayAndIsolation(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	st := newTestStore(t, ctx)
	alert := newReviewAlert(t, st)
	input := ReviewInput{AlertID: alert.AlertID, RequestID: uuid.NewString(), Status: "Acknowledged", Note: "", ReviewedBy: "governance-reviewer"}
	first, err := st.RecordReview(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	if first.Replayed || first.Alert.Status != "Acknowledged" || first.Alert.AcknowledgedBy == nil || *first.Alert.AcknowledgedBy != input.ReviewedBy || first.Review.ReviewID == "" {
		t.Fatalf("first=%+v", first)
	}
	secondInput := input
	secondInput.RequestID = uuid.NewString()
	secondInput.Status = "Escalated"
	secondInput.Note = "Treasury follow-up needed"
	second, err := st.RecordReview(ctx, secondInput)
	if err != nil {
		t.Fatal(err)
	}
	if second.Alert.Status != "Escalated" || second.Alert.AcknowledgedAt != nil || second.Alert.AcknowledgedBy != nil {
		t.Fatalf("escalated=%+v", second.Alert)
	}
	replay, err := st.RecordReview(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	if !replay.Replayed || replay.Review.ReviewID != first.Review.ReviewID || !replay.Review.At.Equal(first.Review.At) || replay.Alert.Status != "Escalated" {
		t.Fatalf("replay changed state: %+v", replay)
	}
	history, err := st.ListReviews(ctx, alert.AlertID, 200, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(history) != 2 || history[0].ReviewID != second.Review.ReviewID || history[1].ReviewID != first.Review.ReviewID {
		t.Fatalf("history=%+v", history)
	}
	page, err := st.ListReviews(ctx, alert.AlertID, 1, 1)
	if err != nil || len(page) != 1 || page[0].ReviewID != first.Review.ReviewID {
		t.Fatalf("page=%+v err=%v", page, err)
	}
	for _, field := range []string{"note", "actor", "status", "issue"} {
		changed := input
		switch field {
		case "note":
			changed.Note = "different"
		case "actor":
			changed.ReviewedBy = "other"
		case "status":
			changed.Status = "Escalated"
		case "issue":
			changed.AlertID = newReviewAlert(t, st).AlertID
		}
		if _, err := st.RecordReview(ctx, changed); !errors.Is(err, ErrReviewConflict) {
			t.Fatalf("changed %s: %v", field, err)
		}
	}
	otherTenant := New(st.pool, uuid.NewString())
	if _, err := otherTenant.RecordReview(ctx, input); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross tenant write: %v", err)
	}
	if _, err := otherTenant.ListReviews(ctx, alert.AlertID, 200, 0); !errors.Is(err, ErrNotFound) {
		t.Fatalf("cross tenant read: %v", err)
	}
	// A failed conflicting request did not append a row or undo the latest status.
	current, err := st.GetAlert(ctx, alert.AlertID)
	if err != nil || current.Status != "Escalated" {
		t.Fatalf("current=%+v err=%v", current, err)
	}
}

func TestConcurrentReviewRetriesCreateOneRecord(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	st := newTestStore(t, ctx)
	alert := newReviewAlert(t, st)
	input := ReviewInput{AlertID: alert.AlertID, RequestID: uuid.NewString(), Status: "Acknowledged", Note: "Reconcile inputs", ReviewedBy: "reviewer"}
	var wg sync.WaitGroup
	results := make(chan ReviewResult, 12)
	errs := make(chan error, 12)
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); result, err := st.RecordReview(ctx, input); results <- result; errs <- err }()
	}
	wg.Wait()
	close(results)
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	created := 0
	id := ""
	for result := range results {
		if !result.Replayed {
			created++
		}
		if id == "" {
			id = result.Review.ReviewID
		}
		if result.Review.ReviewID != id {
			t.Fatal("retry returned different receipt")
		}
	}
	if created != 1 {
		t.Fatalf("created=%d", created)
	}
	history, err := st.ListReviews(ctx, alert.AlertID, 200, 0)
	if err != nil || len(history) != 1 {
		t.Fatalf("history=%+v err=%v", history, err)
	}
}

func TestReviewTransactionRollsBackHistoryWhenStatusUpdateFails(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	st := newTestStore(t, ctx)
	alert := newReviewAlert(t, st)
	_, err := st.pool.Exec(ctx, `CREATE FUNCTION reject_test_review_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic update failure'; END $$;
 CREATE TRIGGER reject_test_review_update BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION reject_test_review_update();`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = st.RecordReview(ctx, ReviewInput{AlertID: alert.AlertID, RequestID: uuid.NewString(), Status: "Escalated", Note: "Synthetic transaction test", ReviewedBy: "reviewer"})
	if err == nil {
		t.Fatal("expected failing status update")
	}
	history, err := st.ListReviews(ctx, alert.AlertID, 200, 0)
	if err != nil || len(history) != 0 {
		t.Fatalf("history committed despite failed status update: %+v %v", history, err)
	}
	current, err := st.GetAlert(ctx, alert.AlertID)
	if err != nil || current.Status != "Open" {
		t.Fatalf("current=%+v err=%v", current, err)
	}
}

func TestLegacyAcknowledgementCreatesReviewHistory(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	st := newTestStore(t, ctx)
	alert := newReviewAlert(t, st)
	_, err := st.Acknowledge(ctx, alert.AlertID, "legacy-reviewer")
	if err != nil {
		t.Fatal(err)
	}
	history, err := st.ListReviews(ctx, alert.AlertID, 200, 0)
	if err != nil || len(history) != 1 || history[0].ReviewedBy != "legacy-reviewer" || history[0].Status != "Acknowledged" {
		t.Fatalf("history=%+v err=%v", history, err)
	}
}

func TestValidateReviewUnicodeAndUnsupportedValues(t *testing.T) {
	input := ReviewInput{AlertID: uuid.NewString(), RequestID: uuid.NewString(), Status: "Acknowledged", ReviewedBy: "reviewer", Note: strings.Repeat("界", 2000)}
	if err := ValidateReview(input); err != nil {
		t.Fatalf("valid Unicode boundary: %v", err)
	}
	for _, field := range []string{"note", "null", "status", "request", "issue", "principal"} {
		invalid := input
		switch field {
		case "note":
			invalid.Note += "界"
		case "null":
			invalid.Note = "bad\x00note"
		case "status":
			invalid.Status = "Approved"
		case "request":
			invalid.RequestID = "bad"
		case "issue":
			invalid.AlertID = uuid.Nil.String()
		case "principal":
			invalid.ReviewedBy = "bad\nactor"
		}
		if !errors.Is(ValidateReview(invalid), ErrInvalidReview) {
			t.Fatalf("accepted invalid %s", field)
		}
	}
}
