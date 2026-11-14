-- Review history is a transactional PostgreSQL record, not an immudb receipt.
CREATE TABLE IF NOT EXISTS governance_reviews (
  review_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  alert_id UUID NOT NULL REFERENCES compliance_alerts(alert_id),
  request_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Acknowledged', 'Escalated')),
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  reviewed_by TEXT NOT NULL CHECK (char_length(reviewed_by) BETWEEN 1 AND 256),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, request_id)
);
CREATE INDEX IF NOT EXISTS governance_reviews_alert_time
  ON governance_reviews (tenant_id, alert_id, reviewed_at DESC, review_id DESC);
