# Handoff — Phase 5 (Reporting)

## Done when

- ADR-011 on disk and indexed
- Generators emit local-name XML for `FINREP_F01`, `ANACREDIT_T2`, and `DORA_ICT`
- Acceptance IDs `AC-A-P5-001` … `AC-A-P5-005` have executable evidence

`./scripts/smoke-test-phase5.sh` requires `objectLock == true` on submit. `docker-compose.dev.yml` starts MinIO as one drive, so that script cannot exit 0 on the current Compose file. See [demo-phase5.md](demo-phase5.md).

## Start with

1. [AGENTS.md](../AGENTS.md)
2. [ADR-011](adr/011-phase5-reporting-foundation.md)
3. [phase5-implementation-spec.md](phase5-implementation-spec.md)

## Do not

- Weaken Phase 1–4 smokes
- Claim commercial XBRL suite parity
- Write `program.json` into this site
