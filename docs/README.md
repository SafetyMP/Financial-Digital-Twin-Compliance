# Documentation map

Start at the root [README](../README.md). That file is the status of record for what runs.

The running path is one mock payment through Debezium, a per-record Flink streaming job, Cedar (`cedar-go`), and immudb. The job directory is `jobs/compliance-cep`. It does not depend on `flink-cep`. `services/reporting-service` checks XML local names. It is not XBRL or SDMX and it is not on the payment path.

Phase specs, ADRs, and diagrams may still use the older names. Read them as design history after the README.

## Read these with the README

- [architecture.md](./architecture.md)
- [data-flow.md](./data-flow.md)
- [deployment.md](./deployment.md)
- [domain-model.md](./domain-model.md)
- [../ROADMAP.md](../ROADMAP.md)

## Repository layout

| Path | What it is |
| --- | --- |
| `services/` | Compose services, including Cedar, audit, and the reporting fixture |
| `jobs/compliance-cep/` | Per-record Flink streaming job |
| `apps/` | Consoles |
| `policies/` | Cedar and Zen policies |
| `infra/` | Local infra |
| `scripts/` | Smokes and verify |
| `docs/` | Design history and this map |
| `_archives/` | Not the running path |

Community files: root [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [SECURITY.md](../SECURITY.md).


## Canonical community files

`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` are at the repository root. This repository does not keep a second copy under `.github/`, because GitHub would show that copy instead of the root file.
