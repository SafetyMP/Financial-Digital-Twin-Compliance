# GitHub Copilot instructions

This repository runs one mock payment through Debezium, a per-record Flink streaming job (`jobs/compliance-cep`, no `flink-cep` artifact), Cedar (`cedar-go`), and an immudb audit entry (`Set` / `Get`). Flink CEP, XBRL, and SDMX are not on that path.

## Verify

```bash
./scripts/harness/verify.sh
```

`./scripts/verify.sh` wraps the same script. Phase 1–4 smoke needs Docker Compose.

## Boundaries

- Do not claim commercial Basel/XBRL parity or production hardening.
- Do not replace Cedar or GoRules Zen.
- Do not flatten `services/*/AGENTS.md`.
- Do not bump Go, Java, or Next in drive-by docs work.

Read [AGENTS.md](../AGENTS.md) before editing. Security reports:
[SECURITY.md](../SECURITY.md) (`## Reporting a Vulnerability`).
