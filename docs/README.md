# Financial Digital Twin documentation

Start with the governance review journey: **issue → context → evidence → recorded review**. The audience is governance professionals at financial institutions; the engineering reference stack supports that experience.

## Choose a path

| Goal | Start here |
| --- | --- |
| Try the experience without installing anything | [Public synthetic demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) |
| Understand the audience, scope, and direction | [Product vision](product-vision.md) and [public roadmap](../ROADMAP.md) |
| Run the demo or connected workspace | [Quickstart](quickstart.md) |
| Understand review persistence and service boundaries | [Connected integration](governance-integration.md) |
| Develop or diagnose the backend | [Architecture](architecture.md), [data flow](data-flow.md), [capability map](phase-journeys.md) |
| Contribute a change | [Contributing](../CONTRIBUTING.md) and [agent instructions](../AGENTS.md) |
| Publish or operate the project | [Deployment](deployment.md) and [GitHub setup](github-setup.md) |
| Understand the redesign rationale | [Redesign record](governance-redesign.md) |

## Three experiences, explicit boundaries

- **Public Pages demo:** a synthetic 30-day liquidity challenge, selectable evidence trials and case links that preserve the review assumptions. It does not connect to backend services or verify a live ledger.
- **Connected development workspace:** real alert and audit APIs, persisted PostgreSQL review history, and explicit audit-chain verification. Its configured reviewer principal is not end-user authentication.
- **Engineering reference:** mock banking data through Debezium, Kafka, per-record Flink processing, Cedar/Zen, and immudb, with separate graph and simulation tools. Reporting is a local-name XML fixture.

## Reference library

[Domain model](domain-model.md) · [Compliance mapping](compliance-mapping.md) · [Explainability](explainability.md) · [ADRs](adr/README.md) · [Runbooks](runbooks/)

Phase specifications, review checklists, earlier demos, handoffs, and the [engineering roadmap](roadmap.md) retain historical plans and evidence. Their phase labels and original targets are not current product promises. Consult the product vision, public roadmap, and linked verification runs for current scope. Do not edit retained test/evaluation evidence to make a claim appear current.

## Repository map

| Path | Role |
| --- | --- |
| `apps/governance-console` | Static demo and shared governance interface |
| `apps/governance-live` | Connected Next.js server and same-origin service gateway |
| `services/alert-service` | Alerts, acknowledgements/escalations, durable review history |
| `services/audit-service` | Linked audit records and chain verification |
| `apps/alert-console`, `apps/audit-explorer`, other consoles | Engineering tools retained alongside the governance workspace |
| `services/`, `jobs/`, `policies/`, `infra/` | Reference backend and infrastructure |
| `scripts/governance-e2e` | Isolated real-service browser verification |
| `contracts/kafka` | Published event contract fixtures |
| `docs/` | Current guides and explicitly identified design history |

Community policies are maintained once at the repository root: [Contributing](../CONTRIBUTING.md), [Support](../SUPPORT.md), [Security](../SECURITY.md), and [Code of Conduct](../CODE_OF_CONDUCT.md).
