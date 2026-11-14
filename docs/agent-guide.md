# Detailed agent guide

The [root working contract](../AGENTS.md) is the default entry point. This document
keeps operational and historical verification detail available without making
agents load every phase plan before a governance task. It supplements, rather
than replaces, the nearest service/app `AGENTS.md`.

## Work by the current task

The product focus is the governance review workflow described in
[the vision](product-vision.md). The public synthetic demo, connected development
workspace, and engineering services have different evidence and access boundaries.
See [the integration guide](governance-integration.md) before changing reviews.

Use the applicable phase specification only for the component being maintained:

| Component | Scoped references |
| --- | --- |
| State/CDC/outbox | [Phase 1](phase1-implementation-spec.md), [state-service contract](../services/state-service/AGENTS.md) |
| Flink/alerts | [Phase 2](phase2-implementation-spec.md), [alert-service contract](../services/alert-service/AGENTS.md) |
| Cedar/Zen/audit | [Phase 3](phase3-implementation-spec.md), corresponding service contracts |
| Graph/simulation | [Phase 4](phase4-implementation-spec.md), graph/simulation contracts |
| Reporting fixture | [Phase 5](phase5-implementation-spec.md), [ADR-011](adr/011-phase5-reporting-foundation.md), [reporting contract](../services/reporting-service/AGENTS.md) |
| Hardening overlay | [Phase 6](phase6-implementation-spec.md), [ADR-012](adr/012-phase6-hardening-foundation.md), [OIDC contract](../services/oidc-edge/AGENTS.md) |
| Analytics prototypes | [Phase 7](phase7-implementation-spec.md), [ADR-013](adr/013-phase7-cutting-edge-foundation.md) |

A phase document is design/history, not permission to expand a task. An old CECT
handoff does not authorize new implementation, publication, schedules, benchmarks,
or activation. Preserve `.corp-harness/` approvals, digest-bound gates, and retained
evidence. Do not claim Phase 5–7 completion from Phase 1–4 CI. Reporting remains a
local-name fixture; on-demand prototype calls are not a scheduled continuous
service. Ecosystem/Frontier/C02 are archived from new work; inspect historical
receipts only with their owning runtime and explicit task scope.

## Verification map

The command table in [AGENTS.md](../AGENTS.md#verification-floor) covers the primary
checks. These details matter for backend and integration work:

- Unit tests cover every `services/state-service/internal/*` package and server
  migration wiring. Alert-service persistence tests require PostgreSQL through
  testcontainers or the explicitly configured test database.
- Cross-service payload changes use the existing golden fixtures under
  `contracts/kafka/`, with publisher and consumer tests. Keep schema compatibility
  BACKWARD; do not create competing fixture copies under individual services.
- `./scripts/check-coverage-gates.sh` enforces total floors: state 35%, alert 25%,
  audit/Cedar/decision 20%, graph 15%, and Flink job 15%. Preserve those gates and
  the owning package expectations.
- Shell changes need `bash -n` on touched scripts. Seed/smoke changes also need the
  relevant running-stack smoke; syntax checks alone do not verify the pipeline.
- `./scripts/check-cutting-edge-claims.sh` is a claim-lint gate, not proof of any
  product capability. `./scripts/harness/verify.sh` adds static/hermetic checks;
  it does not run the Docker smoke sequence.
- Code review blocks broken envelopes/idempotency, bypassed durability/outbox
  paths, missing schema compatibility, secrets, or unauthorized scope expansion.
  Style findings are secondary unless they hide a defect.
- Keep imports at the top of source files unless a documented circular dependency
  requires otherwise. Validate external input at both API and consumer boundaries.

### Stack order

Follow [the quick start](quickstart.md) for user-facing setup. The full CI order in
[ci.yml](../.github/workflows/ci.yml) is the executable reference:

1. Unit tests, policy checks, Kafka contracts, and mechanical checks.
2. Start Kafka and create topics **before** application consumers join groups:

   ```bash
   export COMPOSE_PROJECT_NAME=digitaltwin
   docker compose -f docker-compose.dev.yml up -d --wait kafka
   ./scripts/create-kafka-topics.sh
   ```

   The project name matches the topic script's default Kafka container name.

3. Start the full stack, seed databases, and restart the alert service after seed.
4. Register schemas and Debezium; restart state-service; wait for the outbox to
   drain; restart/wait for graph seeding; verify the state-to-twin pipeline.
5. Package the host Flink JAR and build the consoles.
6. Submit Flink with the intended offsets and a fresh consumer-group suffix when
   using `latest`; wait for RUNNING.
7. Run Phase 1–4 smoke, Phase 1 adversarial checks, UI proxy smoke, and coverage.

Do not treat an HTTP health check as proof that a Kafka consumer has partitions
or that audit evidence exists. The configured Kafka client can join a missing
topic without assignments and remain idle unless a rebalance occurs.

The [governance E2E workflow](../scripts/governance-e2e/README.md) is a separate,
isolated stack. It begins at synthetic Kafka alert input and verifies the actual
alert/audit services, PostgreSQL, immudb, server gateway, and browser review
workflow. It does not itself exercise upstream CDC, Flink, or Cedar. A passing
full CI run supplies separate pipeline evidence.

### Environment and long-running commands

Use the repository's pinned toolchains and lockfiles. Governance tests use Node
22; service Go requirements and Docker images vary by service. Do not upgrade
versions as a side effect of documentation or UI work.

Use subshells for service commands so subsequent paths stay relative to the root:

```bash
(cd services/state-service && go test ./...)
(cd services/alert-service && go test ./...)
(cd jobs/compliance-cep && mvn test)
```

When host Maven is unavailable, the repository's scripts support a Docker Maven
fallback. Do not call a missing-tool run a pass. Stack builds/pulls can take several
minutes: retain and poll the tool session, provide concise progress, and do not
kill or rerun a healthy job merely because it is slow.

Only clean up the isolated resources created for the task. `docker compose down
--volumes` removes data and is not a routine diagnostic action on an existing
user stack. Keep historical artifacts and failed-run evidence intact.

## Operational gotchas

### Ingestion and streaming

- **Debezium numerics/dates:** decode base64 numerics and epoch-day dates in
  `services/state-service/internal/consumer/debezium_numeric.go`; its tests cover
  those conversions. CDC decimals can arrive as strings. State enrichment
  normalizes them before `twin.state.updated`; Java `JsonParsers.parseDouble`
  remains defensive.
- **Redis host port:** Compose maps `6380:6379`; use the reference `.env.example`
  rather than assuming host port 6379.
- **Kafka topics first:** use `create-kafka-topics.sh`, including audit pending,
  recorded, and DLQ topics. Its later invocation during seed is idempotent, not a
  substitute for creating topics before consumers start.
- **Flink job serialization:** `JobConfig` must implement `Serializable`.
  `submit-flink-job.sh` handles JAR basenames and the Docker Maven fallback.
- **JAR staleness:** Compose's job-submitter image builds a JAR during stack
  bring-up. After Java changes, package again before submission; `mvn test` alone
  does not update a previously submitted JAR.
- **Committed offsets:** `OffsetsInitializer.latest()` does not override an
  existing group's committed offsets. Use the intended new
  `CEP_CONSUMER_GROUP_SUFFIX` for an authorized fresh run, or explicit `earliest`
  when investigating replay. Do not silently replay a retained environment.
- **Stale state-service images:** rebuild after Go consumer/enrichment changes.
  A running old image can leave twin liquidity or numeric values stale despite
  source-database updates.
- **Outbox drain:** the publisher batches rows and uses an explicit batch timeout
  (default `OUTBOX_BATCH_TIMEOUT=10ms`). Wait for draining after connector
  registration and state-service restart; a large backlog is not evidence that
  the current canary failed.

### Alert localization

- **INT-M001:** Redis `vel:{tenant}:{account}:1h` above 50 establishes the velocity
  path reached Redis. If alerts remain empty, inspect Flink → `compliance.alerts`
  → alert-service. The smoke script includes offsets/database diagnostics.
- **BASEL-M001:** check core `legal_entities.lcr` → twin liquidity state →
  `twin.state.updated` → Redis `lcr:*` → alert API. The fixture lowers the named
  synthetic institution to `0.90`; no hard-coded production threshold claim is
  implied.
- **INT-M002:** matching owner/counterparty instruments from
  `002_phase2_exposure.sql` must exceed the configured exposure limit. Inspect
  the twin's notional/owner/counterparty values before blaming Flink.
- **Poison-message behavior:** current alert-service retries non-poison handler
  failures and does not commit when DLQ publishing fails. It commits poison
  messages after successful DLQ delivery, or when DLQ is explicitly disabled.
  Preserve these semantics and scoped tests; an HTTP health response does not
  prove consumer progress. Older notes saying all handler errors commit are stale.
- **Review persistence:** acknowledgement now appends review history. Respect
  foreign keys and preserve past reviews; do not delete history to make smoke or
  UI state appear clean. An unchanged request ID retries the same review; changed
  content with that ID is a conflict. Replaying an earlier request must not revert
  a later status.

### Policy, audit, and consoles

- **Browser service calls:** use same-origin Next server routes. Do not send
  browser requests directly to Go service ports or expose server tokens in client
  components. Connected mutations use the external canonical development origin,
  not Docker's bind hostname or untrusted forwarded headers.
- **Fonts:** legacy consoles use bundled IBM Plex Sans assets in
  `packages/console-shell/assets/fonts`. Keep license/provenance and runtime
  license copies; do not reintroduce build-time Google font downloads.
- **Policy mounts:** if a bind mount appears empty, inspect it before restarting
  the scoped Cedar/Decision service; repository paths can contain spaces.
- **immudb health:** its image is distroless. Use `immuadmin status`, not a shell
  or `wget` health command inside that container.
- **immudb client:** use `client.NewClient()` plus `OpenSession`; the deprecated
  constructor already opens a connection and can cause duplicate-session errors.
  Current append writes entry/head atomically with `SetAll`; reads use
  `VerifiedGet`. Verify the actual code rather than old design prose.
- **Ledger/index lifecycle:** truncating the PostgreSQL audit index while retaining
  immudb can leave inconsistent sequence state. Startup reconciliation can reset
  an empty-index head. Preserve real evidence; do not use resets as a repair
  shortcut or confuse an index-only record with a ledger entry.
- **Decision Service:** `zen-go` requires CGO. Its Debian/bookworm build/runtime
  choices are intentional; Alpine/musl linking is not equivalent.
- **Cedar roles:** an explicit empty `roles` array means no roles; omission may
  invoke development defaults. Inspect the current authenticated API contract
  before changing principal handling.
- **Flink → Zen:** with `CEP_DECISION_SERVICE_URL`, monitoring calls Decision
  Service and retains inline fallback on HTTP failure. Package/resubmit changed
  Java code before verifying it.

## Collaboration and retained tooling

Assign independent tracks clear, disjoint files and acceptance checks. Keep
shared Compose changes and dependent integration debugging ordered. The coordinator
inspects each result, resolves conflicts, and owns merged integration verification.
A timed-out worker is not completed work; recover or reassign deliberately and
verify the result. Keep reviewers independent of their implementation.

Use native tools and the host's supported worktree mechanism. The repository also
retains optional shell helpers and historical handoffs:

- [worktree quick start](quickstart-agent-worktrees.md)
- [worktree handoff](handoff-worktree-agent.md)
- [parallel-parent handoff](handoff-parallel-parent.md)
- [dependency-wave handoff](handoff-dependency-waves.md)
- [verification handoff](handoff-verification-agent.md)
- [continuation template](handoff-continuation.md)

Their environment-specific commands are not a requirement to install another
agent harness. Do not run competing Compose/smoke/seed operations from worktrees
sharing ports. Existing worktree guards are intended to prevent false-green
verification. Preserve their behavior. Do not activate archived runtimes, expand
external contact, start schedules, or run benchmark campaigns from old allowances.

Record task findings in the appropriate project artifact when needed. A task
record is not permission to write personal memory, alter global plugin settings,
or change the user's tool configuration. Search current source before requesting
old chat transcripts; use live tool-session output instead of reading another
agent's terminal history.

## Phase completion and evaluation criteria

These are retained criteria for explicit phase-completion or evaluation tasks,
not a claim that every historical program is complete or a requirement to run a
behavioral campaign for ordinary governance documentation work.

- **Phase 1:** state-service tests, `smoke-test.sh`, the
  [Phase 1 exit criteria](phase1-implementation-spec.md#10-phase-1-exit-criteria-checklist),
  [review checklist](review/phase1-review-checklist.md), and a PR test plan.
- **Phase 2a:** two consecutive green CI runs with the phase's smoke checks,
  Kafka contracts, and API/WebSocket/acknowledgement/Redis assertions covered.
  Run state and alert tests plus Phase 1 and Phase 2 smoke before claiming it.
- **Phase 2b:** Phase 2a on `main`, the retained behavioral pass bar (at least five
  of six scenarios meeting 80% across their configured runs), and the
  [Phase 2 exit checklist](review/phase2-exit-checklist.md). Keep soak/p99 claims
  deferred unless actually measured. A single latency check is not a general
  service-level guarantee. Retain the independent verification session's
  `token-efficiency.sh --strict` result as part of that completion evidence;
  an empty behavior-results set does not meet the pass bar.
- **Phase 3/4:** preserve their service/policy/graph/simulation checks and the
  associated smoke scripts and [review records](review/). Governance browser
  verification is additional evidence, not a replacement.
- **Phase 5–7:** consult the scoped spec/ADR and owning corporate gates. No claim
  of completion, regulatory parity, or production hardening follows merely from
  files being present or an earlier handoff.

For an explicitly requested evaluation, use the existing commands rather than
loading scoring answers into the implementation context:

```bash
./scripts/run-live-evals.sh
./scripts/run-live-evals-phase2.sh
./scripts/run-eval-fixtures.sh
./scripts/token-efficiency.sh --strict
```

Keep evaluation sessions independent of implementation and review. Do not read
`evals/harness/`, `evals/fixtures/`, live-model manifests/answer material, or private
transcripts during a live behavioral task. Only inspect a user-specified scoring
artifact when explicitly asked. Preserve retained results and their baseline
commits. Historical efficiency criteria require zero harness rereads and at most
three duplicate reads where that instrumentation applies; do not invent a score
when the runtime cannot measure it. Product, behavior, and efficiency are distinct
claims. See [evaluation scope](eval-harness-scope.md) for that separation.
