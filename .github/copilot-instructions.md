# GitHub Copilot instructions

This repository is a **supervisory financial-compliance digital twin**:
Debezium CDC + Flink CEP + Cedar/Zen + XBRL/SDMX + immudb.

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
[SECURITY.md](SECURITY.md) (`## Reporting a Vulnerability`).
