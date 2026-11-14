# Agent guide: Financial Digital Twin

Financial Digital Twin is a governance workspace for professionals at financial
institutions. The main workflow is **prioritize an issue → understand its context →
inspect evidence → record a review → revisit the history**. Keep ease of use,
plain language, accessible interactions, and accurate evidence labels central.

Read [README.md](README.md) for the public entry point and
[product vision](docs/product-vision.md) for scope. This file is the short working
contract; use [the detailed agent guide](docs/agent-guide.md) only for the area at
hand. Nested `AGENTS.md` files remain in force; do not flatten or delete them.

## Product and evidence boundaries

- `apps/governance-console` is the public GitHub Pages **synthetic demo**. Reviews
  stay in that browser. It does not call live services or verify a ledger.
- `apps/governance-live` is the **connected development workspace** on port 3006.
  Its server routes call the existing alert and audit services. The configured
  reviewer identity is not production end-user authentication.
- Connected review history is PostgreSQL application data. Linked alert evidence
  may come from immudb; a PostgreSQL index fallback is not a ledger record.
  Retrieval is not chain verification. Acknowledgement or escalation does not
  resolve the underlying issue, approve an exception, or notify a team.
- The connected twin view shows the selected alert's entity and signal. The
  scenario lab is demo-only; neither implies live graph simulation.
- The engineering reference path remains mock banking → Debezium → Kafka →
  per-record Flink streaming → alert/policy services → immudb. Cedar uses
  `cedar-go`; the Flink job has no `flink-cep` dependency. Reporting is a local-name
  fixture, not a certified Basel engine or an XBRL/SDMX product.

## Read next, according to the change

| Area | Instructions and context |
| --- | --- |
| Demo or shared workspace UI | [demo contract](apps/governance-console/AGENTS.md), [redesign](docs/governance-redesign.md) |
| Connected routes, review integration | [connected contract](apps/governance-live/AGENTS.md), [integration](docs/governance-integration.md) |
| Backend service | `services/<service>/AGENTS.md`, then the relevant implementation spec |
| Kafka payload, CDC, idempotency, outbox | [data flow](docs/data-flow.md), [Kafka contracts](contracts/kafka/README.md) |
| Setup and operation | [quick start](docs/quickstart.md), [deployment](docs/deployment.md), [operational gotchas](docs/agent-guide.md#operational-gotchas) |
| Phase-specific maintenance, evals, worktrees | [detailed agent guide](docs/agent-guide.md) and the relevant linked handoff |

Search before reading large files. Avoid repeatedly loading unchanged guidance.
Do not read private chat transcripts, tool-session logs, or evaluation answer keys
as implementation context. Use current source, task evidence, and scoped docs.

## Always / Ask first / Never

**Always**

- Preserve user edits, the established stacks, pinned dependencies, service
  contracts, tenant boundaries, and the working Phase 1–4 pipeline.
- Validate external inputs. Use established envelope, idempotency, outbox and
  audit patterns. Cross-service payload changes need a golden fixture, publisher
  and consumer tests, and `./scripts/check-kafka-contracts.sh`.
- Keep `tenant_id` on entity tables; the reference default is
  `00000000-0000-0000-0000-000000000001`. Entity hierarchy depth is at most three.
- Define acceptance checks before substantial edits and obtain independent
  review. Report local tests, remote CI, deployment, and live verification
  separately, with exact commit/run evidence and any unverified scope.

**Ask first**, unless the current task already explicitly authorizes the action:

- Replacing Cedar or GoRules Zen; changing public exposure of Compose services;
  deploying the development stack as a production service.
- Expanding product scope into multi-tenant supervisory SaaS, industrial OT/ICS,
  or claims of commercial Basel/XBRL suite parity. Claims require evidence even
  when publication is authorized.

**Never**

- Use customer data, PII, or secrets in fixtures, demos, logs, or commits.
- Auto-approve policy exceptions, disguise a backend failure with demo data, or
  weaken tests, coverage, schema-compatibility, smoke, or claim-lint gates.
- Bump Go, Java, or Next outside a dedicated dependency change.
- Treat archived plans, historical phase handoffs, retained evidence, or an old
  successful run as current execution authority. Ecosystem, Frontier, and C02
  remain archived from new work; do not reactivate them without explicit user
  authorization. Verify historical receipts with their owning runtime.
- Edit retained `.cursor/plans/` task plans or evaluation answer fixtures as part
  of ordinary implementation. Do not write personal/global memory without user
  authorization.

## Verification floor

Run from the repository root. Use Node 22 for governance tests. Install locked
packages with `npm ci --prefix <app>` when needed; preserve pinned versions.

| Change | Required checks |
| --- | --- |
| Demo or shared governance UI/model | `npm test --prefix apps/governance-console`; `NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console` |
| Shared UI used by connected mode, or connected gateway | Demo checks above, then `npm test --prefix apps/governance-live`; `npm run build --prefix apps/governance-live` |
| Go service | Touched package tests/build at minimum; full service tests and relevant smoke for logic changes; obey its scoped contract |
| Flink Java | `(cd jobs/compliance-cep && mvn test)`; package the JAR again before submitting changed code |
| Kafka contract | `./scripts/check-kafka-contracts.sh` plus producer/consumer tests |
| Shell, workflow, or documentation | Syntax/configuration and link checks appropriate to edits; preserve executable assertions |
| Governance integration | [real-service browser workflow](scripts/governance-e2e/README.md) / `governance-integration.yml` |
| Full stack | Phase 1–4 and UI proxy smoke plus coverage gates in `.github/workflows/ci.yml` |

Any code edit, including comments in `.go`, `.java`, `.ts`, or `.tsx`, requires at
least a build/compile or the touched package's tests. `./scripts/harness/verify.sh`
(or its wrapper `./scripts/verify.sh`) is the repository's static/hermetic gate;
it does not replace Docker smoke. Run it or the relevant touched-package checks
before claiming done. Do not claim a phase complete without its
[retained exit criteria](docs/agent-guide.md#phase-completion-and-evaluation-criteria).

## Collaboration and preservation

Use bounded ownership for independent work; keep shared-state mutations ordered.
Do not run competing Compose stacks on the same ports or mutate retained evidence
while investigating. Reuse suitable checkouts; use the host's supported worktree
mechanism when isolation is needed. Inspect worker results and run integration
checks before claiming completion. A worker must not independently review its own
implementation. Historical tooling and corporate site-contract gates remain in
`.corp-harness/` and their owning references, not a new orchestration requirement.

## Agent learning

### Capture checklist

Record durable project gotchas in [the detailed guide](docs/agent-guide.md) or the
owning service contract, with current source/test evidence. Keep temporary task
state in a scoped handoff; avoid duplicating specs. Personal memory, global rules,
and tool configuration require user authorization. Retained learning checks remain
available through `./scripts/check-agent-learning.sh` for relevant maintenance.
