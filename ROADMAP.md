# Financial Digital Twin roadmap

The product direction is a governance workspace for financial institutions: make it easier to understand monitoring issues, inspect evidence, and record review decisions with their context. The [README](README.md) is the product entry point; [docs/README.md](docs/README.md) routes to current guides and historical engineering records.

This roadmap describes priorities, not delivery dates or commitments. Proposals need implementation and verification before they become capabilities.

## Available now

| Capability | Current scope | Evidence / starting point |
| --- | --- | --- |
| Governance review workspace | One issue queue, summary/evidence/review panels, search and filters, review history, exports | [Redesign guide](docs/governance-redesign.md) |
| Public browser demo | Synthetic fixtures, browser-local notes, twin view, and scenario sensitivity lab | [GitHub Pages demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) |
| Connected development workspace | Actual alert/audit APIs, PostgreSQL review history, idempotent acknowledgement/escalation, explicit chain checks | [Integration guide](docs/governance-integration.md) |
| Reproducible review verification | Real-service browser tests, restart persistence, mobile history, retries, origin checks, outage handling | [Governance workflow](.github/workflows/governance-integration.yml) |
| Backend reference pipeline | Mock banking CDC, Kafka, per-record Flink streaming, Cedar/Zen, alert and audit services | [Architecture](docs/architecture.md), [full CI](.github/workflows/ci.yml) |
| Engineering tools | Alert, audit, graph, and simulation consoles; graph/simulation APIs | [Capability map](docs/phase-journeys.md) |

The governance redesign and backend integration are on `main`. Historical release tags describe their own snapshots and do not automatically include later `main` features. [Changelog](CHANGELOG.md).

## Next priorities

| Priority | Intended outcome | Evidence needed before completion |
| --- | --- | --- |
| Validate ease of use with governance professionals | People can identify an issue, explain its evidence, and record the intended review with little assistance | Observed task completion, friction findings, and documented changes; no usability study is claimed today |
| Establish real reviewer identity and authorization | Review attribution and access reflect an authenticated person and their institution | Defined access model, threat review, tested gateway/service enforcement, session handling, and auditability |
| Improve review ownership and follow-up | Clear responsibility, review lifecycle, and handover without confusing review with resolution | Agreed user workflow, backend model, history preservation, and end-to-end tests |
| Strengthen evidence explanations | Reviewers understand source, freshness, missing information, index fallback, and verification results | Source-linked explanations and usability/accessibility checks against real service states |
| Expand realistic institutional scenarios | Useful examples beyond the current fixture portfolio | Synthetic datasets, expected outcomes, and reproducible integration checks |
| Make setup and deployment easier | Contributors can reproduce the connected workflow reliably | Tested setup paths, clear prerequisites, secure defaults, and maintained deployment documentation |

## Boundaries and open engineering work

- **Connected identity:** `GOVERNANCE_PRINCIPAL` is a development configuration, not authenticated end-user identity. The existing OIDC/TLS overlay is a separate engineering capability.
- **Review versus resolution:** acknowledgement and escalation append review history. They do not resolve an issue, approve a policy exception, or notify a team.
- **Evidence custody:** review history lives in PostgreSQL; linked alert evidence uses the audit service and immudb. Review notes are not immutable ledger receipts.
- **Graph and scenarios:** connected twin exploration shows selected-alert context. Live graph integration and connected scenarios are not implemented in the governance workspace.
- **Reporting:** the reporting service validates XML local names in fixtures. It is not an XBRL/SDMX engine or regulator-ready filing workflow. Its single-drive MinIO setup does not satisfy the existing object-lock submission smoke requirement.
- **Extended capabilities:** Phase 5–7 specifications, overlays, and scripts remain available as engineering records. They are not a claim that the governance product has completed those journeys or that every extended smoke passes in default CI.
- **Operations:** production tenancy, secrets management, high availability, institutional-scale performance, and production release qualification remain separate work.

Technical history and implementation context: [engineering roadmap](docs/roadmap.md), [phase journeys](docs/phase-journeys.md), [ADRs](docs/adr/), and [deployment guide](docs/deployment.md). The historical CECT program name is not a product tier.

## Propose work

Use a [feature request](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/issues/new/choose) to describe the governance task, the current friction, the expected improvement, and how it could be verified. Include the mode—public demo, connected workspace, or backend reference—and use synthetic examples only.

Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md). Release tags and GHCR images follow the [deployment guide](docs/deployment.md); there is no fixed release calendar or support SLA.
