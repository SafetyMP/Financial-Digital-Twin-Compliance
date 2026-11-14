# Governance workflow and engineering capability map

The product entry point is the **governance workspace**. Phase numbers identify the reference stack's engineering history; they are not product tiers or the navigation a governance reviewer needs to learn.

## Current review workflow

| Task | Public demo | Connected development workspace |
| --- | --- | --- |
| Prioritize issues | Search/filter six synthetic fixtures | Search/filter loaded alerts; load additional pages |
| Understand a trigger | Illustrative entity, observation, and threshold | Reported backend values; missing values remain explicit |
| Inspect evidence | Clearly labeled sample context | Linked audit entry or explicitly identified index fallback |
| Check integrity | No live ledger check | Explicit audit-service chain check with checked-entry count |
| Record review | Browser-local acknowledgement/escalation and notes | Transactional status update and PostgreSQL review history |
| Return to history/export | Records in the same browser | Persisted service records; export scoped to loaded issues |
| Explore scenarios | Synthetic sensitivity calculation | Not available; no simulation-service integration implied |

[Try the demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) · [Quickstart](quickstart.md) · [Integration contract](governance-integration.md)

## Engineering capabilities retained

| Phase | Capability | Tool | Verification boundary |
| --- | --- | --- | --- |
| 1 | Ingestion and twin state | State API `:8080` | `scripts/smoke-test.sh` |
| 2 | Monitoring and alerts | Alert Console `:3000` | Per-record Flink monitoring; `scripts/smoke-test-phase2.sh` |
| 3 | Policy and audit | Audit Explorer `:3002` | Cedar/Zen evaluation, linked audit entries, chain check; `scripts/smoke-test-phase3.sh` |
| 4 | Graph and simulation | Graph Explorer `:3003`, Simulation Console `:3004` | Reference exposure/stress workflow; `scripts/smoke-test-phase4.sh` |
| 5 | Reporting fixture | Report Console `:3005` | Local-name XML; not XBRL/SDMX filing. Default one-drive MinIO cannot satisfy the submit smoke's Object Lock requirement |
| 6 | Hardening experiments | OIDC/TLS edge `:8180` / `:8443` | Separate overlay; does not authenticate users in the governance workspace |
| 7 | Additional analytical experiments | Individual APIs | Local phase scripts; not included in the standard Phase 1–4 CI claim |

The five engineering consoles share `packages/console-shell`. They are retained diagnostic tools alongside the new unified interface. The connected governance workspace runs at `:3006` and has its own shared interface with the Pages demo.

The [full CI baseline](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/runs/43646873895) passed Phase 1–4 smoke tests on `4003b94`. The [governance integration baseline](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/runs/43646897572) independently passed the browser review workflow from Kafka alert input through persisted history. Neither result establishes a customer usability outcome or production readiness.

Historical CECT references name a delivery program, not a product tier. [Public roadmap](../ROADMAP.md) governs current priorities; [engineering phase history](roadmap.md) preserves earlier plans and targets.
