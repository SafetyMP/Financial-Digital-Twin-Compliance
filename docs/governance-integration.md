# Connected governance workspace

The governance workspace now has two entry points with a shared interface:

- `apps/governance-console`: the synthetic, browser-local static demo, still exported and published by the existing GitHub Pages workflow.
- `apps/governance-live`: a Next.js server on port 3006. It reads the existing alert service and linked audit evidence through same-origin routes. It never substitutes demo fixtures when a backend fails.

## Run with existing services

Use Node 22 for the test commands. Keep the repository's existing pinned Next.js/React versions.

```bash
npm ci --prefix apps/governance-console
npm ci --prefix apps/governance-live
npm test --prefix apps/governance-live
npm run build --prefix apps/governance-live
ALERT_SERVICE_URL=http://127.0.0.1:8085 \
AUDIT_SERVICE_URL=http://127.0.0.1:8090 \
GOVERNANCE_PRINCIPAL=governance-reviewer-dev \
npm start --prefix apps/governance-live
```

Open `http://127.0.0.1:3006`. The alert service must be rebuilt from this branch so its review API and migration003 are present. The Docker overlay sets `GOVERNANCE_ORIGIN=http://127.0.0.1:3006` so browser-origin checks use the external loopback URL rather than the container bind address. For a different development hostname, set that server-only canonical origin explicitly. Configure the same `INTERNAL_API_TOKEN` on the alert service and workspace when that existing protection is enabled. No backend token or actor is accepted from the browser; the proxy supplies its configured development principal.

For an existing local Compose stack, the optional overlay builds the connected console, updates alert-service, and publishes only the new UI's loopback port:

```bash
GOVERNANCE_PRINCIPAL=governance-reviewer-dev \
docker compose -f docker-compose.dev.yml -f docker-compose.governance.yml \
  up -d --build governance-console alert-service
```

This is a trusted development integration. `GOVERNANCE_PRINCIPAL` is a configured reviewer identity, not end-user authentication. Do not expose it publicly or describe it as a production access-control solution. GitHub Pages remains the public synthetic demo; it cannot run these server routes.

## Review behavior

1. Load alerts from the actual alert service. Search, filters, counts, history, and exports apply to loaded issues; Load more issues retrieves additional pages.
2. Select an issue to see actual reported values and thresholds. Missing values stay “Not provided”; no demo thresholds, institutions, or owners are substituted.
3. Open Evidence. The gateway reads that alert's `evidenceRef`, then asks the audit service for the referenced entry. The existing audit API can return its PostgreSQL index when immudb retrieval fails; the UI explicitly distinguishes that fallback from a ledger record.
4. Select Verify audit chain. The UI reports the actual audit service result and checked-entry count. A valid empty chain is not a successful nonempty check. Retrieval alone does not establish integrity.
5. Record an acknowledgement or escalation with an optional note. The alert service transaction appends a review and updates the alert status together. Failed or ambiguous responses display an error; retrying an unchanged submission reuses its request ID.
6. Review history and JSON export read persisted records. Reloading, using a fresh browser, or restarting alert-service does not depend on browser storage for connected reviews.

Review history is PostgreSQL application data. It is not written to immudb, is not a signed receipt, and does not resolve the underlying financial issue, approve an exception, or notify a team. A follow-up review appends history rather than silently replacing a prior note. The existing acknowledgement endpoint remains compatible and now also records history.

Twin explorer in connected mode visualizes the selected alert's entity and signal; it is not a query of the graph service. The synthetic Scenario lab is available only in the Pages demo. No additional Cedar policy evaluation or regulatory report submission is implied.

## API and persistence

- `GET /api/v1/alerts/{alertId}/reviews?limit=200&offset=0` returns persisted reviews, newest first.
- `POST /api/v1/alerts/{alertId}/reviews` accepts `{requestId, status, note}` and requires `X-Principal` from the gateway. Allowed statuses are `Acknowledged` and `Escalated`.
- The successful response is `{review, alert, replayed}`. A repeated request ID with identical input returns the original review and current alert without undoing later reviews; changed input with that ID returns409.
- Mutation gateway routes require same-origin requests. Actor fields supplied by the browser are rejected. Fixed server-configured upstream URLs, request timeouts, sanitized errors, and no-store responses keep service access behind the server.
- Migration `003_governance_reviews.sql` creates the review history table and tenant-scoped request uniqueness. Existing alert and audit data are retained. The application runs this migration with the existing startup migrations.

## End-to-end verification boundary

`.github/workflows/governance-integration.yml` runs the actual standalone governance frontend container, real alert/audit service containers, Kafka, PostgreSQL, and immudb in an isolated Compose project. It injects two synthetic `ComplianceAlertRaised` envelopes at the Kafka alert boundary. The real alert consumer writes them, publishes audit intents, and receives references from the real audit service after immudb writes. This checks the full review workflow from an ingested alert through browser evidence, chain check, decision, stored history, and reload.

It does **not** rerun upstream CDC, Flink detection, Cedar evaluation, graph simulation, or a customer usability study. Those are separate existing pipeline capabilities and checks.

The test covers browser acknowledgement and escalation with notes; backend restart and a fresh mobile browser context; history export; duplicate retry and conflict handling; foreign-origin rejection; and an unavailable backend without synthetic fallback. Evidence JSON, screenshots, and service logs are uploaded as workflow artifacts. The static Pages tests and export build also run in this workflow.

To reproduce on a machine with Docker and Node22:

```bash
npm ci
npm ci --prefix apps/governance-console
npm ci --prefix apps/governance-live
npx playwright install chromium
npm run build --prefix apps/governance-live
scripts/governance-e2e/start-stack.sh
node scripts/governance-e2e/review-workflow.mjs
```

The isolated test uses synthetic data and its own service names, project, and ports. Its cleanup command removes only that test project's resources; preserve any existing development stack.

## Local verification before remote execution

Both static and connected production builds and TypeScript checks passed. All six demo model tests, nine connected-adapter tests, and seven gateway tests passed. The seven non-database alert-service package suites and store validation tests passed. Independent review findings about Docker origin handling and in-flight issue switching were fixed and rechecked.

This host has no Docker. PostgreSQL integration and the full browser workflow must pass in the remote workflow before this integration is reported as verified. A broader local Kafka contract command could not start its Go toolchain download under the filesystem sandbox; no pass is claimed for that separate command.
