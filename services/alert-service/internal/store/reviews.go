package store

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var ErrReviewConflict = errors.New("requestId already used for a different review")
var ErrInvalidReview = errors.New("invalid review")

type Review struct {
	ReviewID   string    `json:"reviewId"`
	IssueID    string    `json:"issueId"`
	RequestID  string    `json:"requestId"`
	Status     string    `json:"status"`
	Note       string    `json:"note"`
	At         time.Time `json:"at"`
	ReviewedBy string    `json:"reviewedBy"`
}

type ReviewInput struct {
	AlertID    string
	RequestID  string
	Status     string
	Note       string
	ReviewedBy string
}

type ReviewResult struct {
	Review   Review `json:"review"`
	Alert    Alert  `json:"alert"`
	Replayed bool   `json:"replayed"`
}

func ValidUUID(value string) bool {
	parsed, err := uuid.Parse(value)
	return err == nil && parsed != uuid.Nil && len(value) == 36
}

func ValidateReview(input ReviewInput) error {
	if !ValidUUID(input.AlertID) || !ValidUUID(input.RequestID) ||
		(input.Status != "Acknowledged" && input.Status != "Escalated") ||
		!utf8.ValidString(input.Note) || utf8.RuneCountInString(input.Note) > 2000 || strings.ContainsRune(input.Note, 0) ||
		strings.TrimSpace(input.ReviewedBy) == "" || utf8.RuneCountInString(input.ReviewedBy) > 256 ||
		!utf8.ValidString(input.ReviewedBy) || strings.IndexFunc(input.ReviewedBy, unicode.IsControl) >= 0 {
		return ErrInvalidReview
	}
	return nil
}

const alertColumns = `alert_id, tenant_id, rule_code, regime, severity, status,
 persona_id, persona_type, summary, details, detected_at,
 acknowledged_at, acknowledged_by, idempotency_key, evidence_ref`
const reviewColumns = `review_id, alert_id, request_id, status, note, reviewed_at, reviewed_by`

func scanReview(row scannable) (Review, error) {
	var review Review
	err := row.Scan(&review.ReviewID, &review.IssueID, &review.RequestID, &review.Status,
		&review.Note, &review.At, &review.ReviewedBy)
	return review, err
}

// RecordReview atomically appends history and changes current status. A replay
// returns the original review and current alert without undoing any later review.
func (s *Store) RecordReview(ctx context.Context, input ReviewInput) (ReviewResult, error) {
	if err := ValidateReview(input); err != nil {
		return ReviewResult{}, err
	}
	input.AlertID = strings.ToLower(input.AlertID)
	input.RequestID = strings.ToLower(input.RequestID)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ReviewResult{}, err
	}
	defer tx.Rollback(ctx)
	alert, err := scanAlert(tx.QueryRow(ctx, `SELECT `+alertColumns+` FROM compliance_alerts
  WHERE tenant_id = $1 AND alert_id = $2 FOR UPDATE`, s.tenantID, input.AlertID))
	if errors.Is(err, pgx.ErrNoRows) {
		return ReviewResult{}, ErrNotFound
	}
	if err != nil {
		return ReviewResult{}, err
	}
	review, err := scanReview(tx.QueryRow(ctx, `INSERT INTO governance_reviews
  (review_id, tenant_id, alert_id, request_id, status, note, reviewed_by)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (tenant_id, request_id) DO NOTHING RETURNING `+reviewColumns,
		uuid.NewString(), s.tenantID, input.AlertID, input.RequestID, input.Status, input.Note, input.ReviewedBy))
	if errors.Is(err, pgx.ErrNoRows) {
		review, err = scanReview(tx.QueryRow(ctx, `SELECT `+reviewColumns+` FROM governance_reviews
   WHERE tenant_id = $1 AND request_id = $2`, s.tenantID, input.RequestID))
		if err != nil {
			return ReviewResult{}, err
		}
		if review.IssueID != input.AlertID || review.Status != input.Status || review.Note != input.Note || review.ReviewedBy != input.ReviewedBy {
			return ReviewResult{}, ErrReviewConflict
		}
		if err := tx.Commit(ctx); err != nil {
			return ReviewResult{}, err
		}
		return ReviewResult{Review: review, Alert: alert, Replayed: true}, nil
	}
	if err != nil {
		return ReviewResult{}, err
	}
	alert, err = scanAlert(tx.QueryRow(ctx, `UPDATE compliance_alerts SET status=$3,
  acknowledged_at=CASE WHEN $3='Acknowledged' THEN $4::timestamptz ELSE NULL END,
  acknowledged_by=CASE WHEN $3='Acknowledged' THEN $5::text ELSE NULL END, updated_at=$4
  WHERE tenant_id=$1 AND alert_id=$2 RETURNING `+alertColumns,
		s.tenantID, input.AlertID, input.Status, review.At, input.ReviewedBy))
	if err != nil {
		return ReviewResult{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ReviewResult{}, err
	}
	return ReviewResult{Review: review, Alert: alert}, nil
}

func (s *Store) ListReviews(ctx context.Context, alertID string, limit, offset int) ([]Review, error) {
	if !ValidUUID(alertID) || limit < 1 || limit > 200 || offset < 0 {
		return nil, ErrInvalidReview
	}
	if _, err := s.GetAlert(ctx, alertID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `SELECT `+reviewColumns+` FROM governance_reviews
  WHERE tenant_id=$1 AND alert_id=$2 ORDER BY reviewed_at DESC, review_id DESC LIMIT $3 OFFSET $4`, s.tenantID, alertID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	reviews := []Review{}
	for rows.Next() {
		review, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, review)
	}
	return reviews, rows.Err()
}
