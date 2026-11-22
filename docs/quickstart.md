# Quickstart

Choose the public demo to evaluate the workflow, the connected development workspace to review service-backed issues, or the full reference stack to develop the underlying pipeline.

## 1. Try the public demo

[Open Financial Digital Twin](https://safetymp.github.io/Financial-Digital-Twin-Compliance/). No account or backend is required.

Compare Treasury’s original and revised 30-day cash outflows. Select an as-of date and handoff, then test the CFO’s pilot assumptions. Open the [case inspector](https://safetymp.github.io/Financial-Digital-Twin-Compliance/workspace/) from the case to carry your selection into the timing and evidence trials. The inspector can reproduce a synthetic packet checksum in the browser. The connected service separately handles ledger verification.

To run that same demo locally, use Node 22:

```bash
git clone https://github.com/SafetyMP/Financial-Digital-Twin-Compliance.git
cd Financial-Digital-Twin-Compliance
npm ci --prefix apps/governance-console
npm run dev --prefix apps/governance-console
```

Use the local URL printed by Next.js. To check the static build:

```bash
npm test --prefix apps/governance-console
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console
```

## 2. Connect to existing development services

The connected workspace needs the current alert and audit services, with their databases, Kafka, and immudb. Use a trusted local development stack with synthetic inputs. This mode does not have end-user authentication.

With those services already running, follow [connected setup](governance-integration.md#run-with-existing-services). The shortest Compose path is:

```bash
GOVERNANCE_PRINCIPAL=governance-reviewer-dev \
docker compose -f docker-compose.dev.yml -f docker-compose.governance.yml \
  up -d --build governance-console alert-service
```

Open [http://127.0.0.1:3006](http://127.0.0.1:3006). The configured principal identifies development reviews. Actual review notes and status changes persist in the alert database; audit evidence is fetched separately. An empty queue means no service alerts have been ingested, not that the synthetic demo should appear.

Alternatively, run the connected Next.js server with Node 22 against services on the default local ports:

```bash
npm ci --prefix apps/governance-console
npm ci --prefix apps/governance-live
npm run build --prefix apps/governance-live
ALERT_SERVICE_URL=http://127.0.0.1:8085 \
AUDIT_SERVICE_URL=http://127.0.0.1:8090 \
GOVERNANCE_ORIGIN=http://127.0.0.1:3006 \
GOVERNANCE_PRINCIPAL=governance-reviewer-dev \
npm start --prefix apps/governance-live
```

If the alert service uses `INTERNAL_API_TOKEN`, configure the same server-only token for this workspace. Use `npm test --prefix apps/governance-live` for the gateway/adapter tests.

## 3. Start the full engineering reference stack

Prerequisites: Docker with Compose v2, PostgreSQL client (`psql`), `curl`, `jq`, and Python 3. The services and consoles build in Docker. Node 22 is needed for governance frontend tests; Go and Java/Maven are only needed for host-side development commands. Existing engineering CI uses its pinned per-component versions.

From the repository root:

```bash
test -f .env || cp .env.example .env
export COMPOSE_PROJECT_NAME=digitaltwin

# Create topics before any application consumer joins its group.
docker compose -f docker-compose.dev.yml up -d --wait kafka
./scripts/create-kafka-topics.sh

docker compose -f docker-compose.dev.yml up -d --wait
./scripts/seed.sh
./scripts/register-schemas.sh
./scripts/register-debezium-connector.sh
docker compose -f docker-compose.dev.yml restart state-service alert-service
docker compose -f docker-compose.dev.yml up -d --wait state-service alert-service audit-service
./scripts/wait-outbox-drained.sh
docker compose -f docker-compose.dev.yml restart graph-service
docker compose -f docker-compose.dev.yml up -d --wait graph-service
./scripts/wait-graph-seeded.sh
./scripts/verify-state-twin-pipeline.sh
./scripts/submit-flink-job.sh

GOVERNANCE_PRINCIPAL=governance-reviewer-dev \
docker compose -f docker-compose.dev.yml -f docker-compose.governance.yml \
  up -d --build governance-console alert-service
```

The default Compose stack exposes development service ports and uses documented demo credentials. Keep it on a trusted development machine. A healthy HTTP endpoint does not by itself prove a Kafka consumer is assigned partitions; creating topics first is required.

The smoke tests inject synthetic banking events. [The full CI workflow](../.github/workflows/ci.yml) is the reproducible sequence for prerequisites, Phase 1–4 smoke tests, UI proxies, and coverage gates. The [capability map](phase-journeys.md) locates individual tools and commands.

## 4. Verify the governance workflow end to end

For an isolated synthetic test stack, install Node 22 and Docker, then use the [governance E2E instructions](../scripts/governance-e2e/README.md). This exercises actual Kafka, alert/audit services, PostgreSQL, immudb, and the browser. It starts at the alert Kafka boundary; the full CI job separately checks upstream CDC/Flink behavior.

```bash
npm ci
npm ci --prefix apps/governance-console
npm ci --prefix apps/governance-live
npx playwright install chromium
npm run build --prefix apps/governance-live
(
  export COMPOSE_PROJECT_NAME=governance-e2e-local
  export ALERT_SERVICE_URL=http://127.0.0.1:18085
  export AUDIT_SERVICE_URL=http://127.0.0.1:18090
  export INTERNAL_API_TOKEN=governance-e2e-synthetic-internal-token
  export GOVERNANCE_PRINCIPAL=governance-e2e
  export GOVERNANCE_ORIGIN=http://127.0.0.1:3006
  scripts/governance-e2e/start-stack.sh
  node scripts/governance-e2e/review-workflow.mjs
)
```

Port `3006` must be free: stop an existing connected workspace before running this isolated test. Use a fresh test project or explicitly clean up a previous test project; retained fixture state is not reset automatically. The subshell keeps test settings separate from the full-stack shell.

See the E2E README for ports, artifacts, and cleanup of the `governance-e2e-local` project's resources. Do not remove an existing development stack while cleaning up a test.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Connected queue is empty | Confirm alerts exist in the alert service; use synthetic pipeline or E2E input |
| Connection error | Check the backend health and server-only service URLs; no demo fallback is expected |
| Review mutation is rejected | Check `GOVERNANCE_ORIGIN`, configured principal, and matching internal token settings |
| Audit evidence stays absent after startup | Check topic creation preceded consumers; inspect alert/audit service logs |
| Missing ledger record but index available | The UI distinguishes PostgreSQL index fallback; inspect immudb connectivity |
| Public Pages page differs from local source | Check the deployed commit in the Pages workflow, not only a local build |

[Support](../SUPPORT.md) explains what to include in a reproducible report. Never attach credentials, real financial records, or customer data.

[Back to the project overview](../README.md) · [Documentation index](README.md)
