# Governance integration check

This check runs the existing Go alert and audit services, PostgreSQL, Kafka, and
immudb with the connected Next.js governance workspace. It injects two synthetic
`ComplianceAlertRaised` envelopes at Kafka. The alert service creates real alert
rows and audit-pending events; the audit service writes real immudb entries and
returns evidence references to the alerts. This verifies the review workflow from
the alert input boundary. It does **not** run CDC, Flink, or evaluate a Cedar policy.

The isolated Compose project publishes only loopback ports `18085` (alerts) and
`18090` (audit), and `3006` (standalone governance workspace). Kafka, immudb and both PostgreSQL instances have no published ports.
All credentials and reviewer identities are test-only. The gateway's configured
reviewer is not an authenticated production user.

## Run

Requirements: Docker Compose v2, Node 22, Go 1.26 for the full service unit tests.
Run from the repository root, after the three npm dependency installs used in
`.github/workflows/governance-integration.yml`:

```bash
export COMPOSE_PROJECT_NAME=governance-e2e-local
export ALERT_SERVICE_URL=http://127.0.0.1:18085
export AUDIT_SERVICE_URL=http://127.0.0.1:18090
export INTERNAL_API_TOKEN=governance-e2e-synthetic-internal-token
export GOVERNANCE_PRINCIPAL=governance-e2e
export GOVERNANCE_ORIGIN=http://127.0.0.1:3006
scripts/governance-e2e/start-stack.sh
```

The startup script builds and starts the production Docker entrypoint for the workspace. Run with the same Compose project environment:

```bash
node scripts/governance-e2e/review-workflow.mjs
```

The browser test validates a foreign-Origin rejection, actual linked ledger
entry and chain verification, acknowledgement with a note, in-flight review UI locking, escalation, history
in a fresh browser after an alert-service restart, exported records, retry
idempotency/conflict handling, and an unavailable-backend error with no synthetic
fallback. The test deliberately restarts/stops only its own alert service.

Evidence JSON, screenshots, exports, and logs live in the ignored `artifacts/`
directory. A failed assertion remains a failed workflow; artifacts support
diagnosis rather than changing that outcome. The static Pages application is
built and tested separately in this workflow and remains independently deployed
by its Pages workflow.

After inspecting results, remove only this
isolated test stack:

```bash
docker compose -p "$COMPOSE_PROJECT_NAME" -f docker-compose.governance-test.yml down --volumes --remove-orphans
```

Use a new Compose project name, or remove the prior isolated stack, before a fresh
run. The fixture event IDs are deterministic; retained state is deliberately not
silently reset by the startup script.
