# Financial Digital Twin · Governance workspace

A transfer Northstar counted on has yet to arrive. Treasury must decide when to release customer payments while the clearinghouse waits for cash from the same account. At the funding meeting, independent risk must decide whether the team can rely on its 30-day liquidity figure when the asset and outflow schedules may come from different dates.

The financial digital twin keeps the bank’s reported position and the reading that triggered an alert. The synthetic case lets Treasury replay a release instruction against each payment deadline. A risk reviewer can follow the alert back to its source assumptions and leave a handoff the next reviewer can explain.

**[Take the payments desk before the funding meeting](https://safetymp.github.io/Financial-Digital-Twin-Compliance/)** · **[Trace the payment and liquidity evidence](https://safetymp.github.io/Financial-Digital-Twin-Compliance/workspace/)** · [Run the connected workspace](docs/governance-integration.md) · [Documentation](docs/README.md) · [Roadmap](ROADMAP.md)

[![Governance integration](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/governance-integration.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/governance-integration.yml)
[![Pages demo](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/governance-pages.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/governance-pages.yml)
[![CI](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/ci.yml)
[![CodeQL](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/workflows/codeql.yml)
[![License](https://img.shields.io/github/license/SafetyMP/Financial-Digital-Twin-Compliance)](LICENSE)

## Who this is for

- **Treasury payments analyst.** Try releasing the dollar batch at 09:10 or holding until 10:00. Keep the expected receipt and credit line fixed to see which payments meet their cutoffs and who waits.
- **Independent liquidity-risk reviewer.** Compare the dates behind Northstar’s €92m of liquid assets and €100m of projected outflows. Decide what to document, ask Treasury to substantiate or escalate before the funding lead acts.
- **CFO evaluating a pilot.** Give Treasury and risk the same historical cases under the current handoff, an evidence checklist and a shared review file. Time both teams through corrections and check whether the next reviewer catches an unsupported estimate. The worksheet estimates staff capacity.

The repository combines a governance application with a runnable financial digital twin reference backend. It uses synthetic banking data for development and demonstrations. It is not a production banking system, a certified compliance engine, or a regulatory filing product.

## The connected review workflow

![Connected Financial Digital Twin governance workspace displaying synthetic integration-test reviews](docs/assets/governance-workspace.png)

Connected development workspace with synthetic integration-test data and real alert/audit services.

1. **Find an issue.** Search and filter the review queue by severity and review status.
2. **Understand the trigger.** See the observation, threshold, monitoring rule, and available context together.
3. **Follow the evidence.** Inspect linked evidence and, in connected mode, explicitly request an audit-chain check.
4. **Record a review.** Acknowledge or escalate with a note. A review does not resolve the underlying issue or approve a policy exception.
5. **Keep the context.** Revisit review history and export a review pack. Connected reviews persist across browser reloads and service restarts.

Ease of use is the redesign's priority. The interface and workflow are implemented and tested; customer usability outcomes have not yet been measured. [Design scope and validation](docs/governance-redesign.md).

## Choose your mode

| | Public demo | Connected development workspace |
| --- | --- | --- |
| Start | [Open in a browser](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) | [Setup guide](docs/governance-integration.md), port `3006` |
| Data | Northstar dollar settlement replay and euro 30-day liquidity case | Alerts from the existing backend services |
| Reviews | Selected challenge and pilot assumptions carried in the case link | Stored transactionally by the alert service in PostgreSQL |
| Evidence | Source schedules, illustrative posting trials and a browser checksum | Linked audit entries and an explicit audit-chain verification action |
| Identity | Browser-local demonstration | Server-configured development reviewer; not end-user authentication |
| Extra exploration | Outflow sensitivity, reviewer handoffs and first-year capacity | Selected-alert context; no live graph query or scenario lab |

The GitHub Pages demo has no backend connection. The connected workspace never replaces a failed backend with demo fixtures. Review history is application data in PostgreSQL, separate from the immudb alert evidence ledger. [Integration boundaries](docs/governance-integration.md).

## Follow Northstar’s decisions into the code

- **Treasury, USD payment timing.** The settlement model starts with the opening cash statement, posts each incoming transfer and tries the released orders against cash and available credit at eight timestamps. Inspect which order settles at each cutoff, then replay the same receipts with the other release instruction. [Payment replay](apps/governance-console/src/lib/intraday.ts) · [Cutoff tests](apps/governance-console/src/lib/intraday.test.ts)
- **Independent risk, EUR 30-day coverage.** The browser lets the reviewer challenge the outflow schedule behind the alert. The connected Flink job reads the ratio already supplied by the twin and checks it against the monitoring threshold. The reviewer still needs Treasury’s dated inputs to substantiate the figure. [Source schedules and review handoff](apps/governance-console/src/lib/liquidity-handoff.ts) · [Flink threshold check](jobs/compliance-cep/src/main/java/com/digitaltwin/jobs/cep/patterns/LcrChecker.java)
- **Engineering, evidence that survives the session.** The demo encodes selections in the inspector link and checks a fixture fingerprint. In the connected workspace the server calls the alert and audit services, and the alert service stores review notes in PostgreSQL. [Inspector link and receipt tests](apps/governance-console/src/lib/northstar-case.test.ts) · [Server gateway](apps/governance-live/src/lib/gateway.ts) · [Review store](services/alert-service/internal/store/reviews.go)

## Quick start

### Explore without installation

Open the [Northstar case](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) and follow your selection into its technical guide. The inspector carries the dollar payment and settlement time alongside the separate euro alert, source dates and fixture checksum. [Open the evidence inspector](https://safetymp.github.io/Financial-Digital-Twin-Compliance/workspace/)

### Run the demo locally

Use Node.js 22 for governance tests and builds. From the repository root:

```bash
npm ci --prefix apps/governance-console
npm run dev --prefix apps/governance-console
```

Use the local URL printed by Next.js. To test and export the static demo:

```bash
npm test --prefix apps/governance-console
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console
```

### Connect to the services

Follow the **[connected workspace guide](docs/governance-integration.md)** for prerequisites, service configuration, and the Compose overlay. It covers both an existing local service stack and the isolated end-to-end test stack.

For the complete mock-banking pipeline and engineering consoles, start with the [documentation index](docs/README.md), [architecture](docs/architecture.md), and [deployment guide](docs/deployment.md). Create Kafka topics **before** starting consumers, as the current [CI workflow](.github/workflows/ci.yml) does.

## Architecture

```mermaid
flowchart LR
    Demo[Public synthetic demo] --> Local[Browser-local reviews]
    Reviewer[Governance professional] --> Workspace[Connected governance workspace]
    Workspace --> Gateway[Same-origin server routes]
    Gateway --> Alerts[Alert service]
    Alerts --> Reviews[(PostgreSQL review history)]
    Gateway --> Audit[Audit service]
    Audit --> Ledger[(immudb evidence ledger)]
    Pipeline[Mock banking / CDC / Kafka / Flink] --> Alerts
```

The backend retains Debezium change data capture, Kafka event contracts, per-record Apache Flink streaming, Cedar authorization (`cedar-go`), GoRules Zen decisions, and immudb audit evidence. The Flink job uses `WatermarkStrategy.forBoundedOutOfOrderness` with one minute of event-time tolerance and does not depend on `flink-cep`. Graph and simulation capabilities remain available in the engineering consoles. The reporting service is a local-name XML fixture, not an XBRL or SDMX engine.

[Component architecture](docs/architecture.md) · [Event and data contracts](docs/data-flow.md) · [Engineering capability map](docs/phase-journeys.md) · [Architecture decisions](docs/adr/)

## Verification and scope

The [governance integration workflow](.github/workflows/governance-integration.yml) exercises real Kafka, PostgreSQL, immudb, alert/audit services, the Next.js gateway, and browser review behavior using synthetic events. It checks acknowledgement, escalation, notes, restart persistence, fresh-browser history, export, retry/conflict handling, origin rejection, and backend outages.

The separate [full CI workflow](.github/workflows/ci.yml) checks the upstream pipeline, service tests, policy and Kafka contracts, console builds, Phase 1–4 smoke tests, UI proxies, and coverage gates. [Schema compatibility](.github/workflows/schema-compat.yml), [CodeQL](.github/workflows/codeql.yml), [Scorecard](.github/workflows/scorecard.yml), [image publishing](.github/workflows/docker-publish.yml), and [Pages deployment](.github/workflows/governance-pages.yml) provide additional checks.

A green workflow verifies its stated test boundary. It does not establish production security, regulatory compliance, customer usability, or performance at institutional scale. The connected workspace currently uses a configured development principal; the existing hardening overlay is not integrated end-user authentication for it. [Security posture](SECURITY.md) · [Current limitations and priorities](ROADMAP.md).

## Repository map

| Path | Purpose |
| --- | --- |
| [`apps/governance-console/`](apps/governance-console/) | Static demo and shared governance interface |
| [`apps/governance-live/`](apps/governance-live/) | Connected workspace and server-side service gateway |
| [`services/alert-service/`](services/alert-service/) | Alerts, durable reviews, notes, and idempotent review writes |
| [`services/audit-service/`](services/audit-service/) | Audit evidence, immudb ledger, and chain verification |
| [`services/`](services/) | State, policy, graph, simulation, reporting, and edge services |
| [`jobs/compliance-cep/`](jobs/compliance-cep/) | Per-record Flink streaming job |
| [`apps/`](apps/) · [`packages/console-shell/`](packages/console-shell/) | Engineering consoles and shared components |
| [`policies/`](policies/) · [`contracts/kafka/`](contracts/kafka/) · [`schemas/avro/`](schemas/avro/) | Policy bundles and event contracts |
| [`scripts/governance-e2e/`](scripts/governance-e2e/) | Reproducible connected review workflow checks |
| [`docs/`](docs/) | Current guides, architecture, and historical implementation records |
| [`AGENTS.md`](AGENTS.md) | Coding-agent entry point and scoped instructions |

## Contribute and get help

Start with [CONTRIBUTING.md](CONTRIBUTING.md), the [roadmap](ROADMAP.md), and the [documentation index](docs/README.md). Useful contributions include usability findings from governance workflows, clearer evidence states, accessible interactions, and integration regressions with reproducible tests.

- [Report a bug or propose an improvement](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/issues/new/choose)
- [Support channels and expectations](SUPPORT.md)
- [Report a security issue privately](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md) and [releases](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/releases)

Maintained by [SafetyMP](https://github.com/SafetyMP). Project code is licensed under [Apache License 2.0](LICENSE); bundled IBM Plex Sans fonts retain their [SIL Open Font License](packages/console-shell/assets/fonts/LICENSE.txt).
