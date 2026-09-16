---
name: supervisory-twin
description: "Change supervisory twin composition (Debezium CDC, Flink CEP, Cedar/Zen, XBRL/SDMX, immudb). Use when editing services/*, jobs/compliance-cep, or policies/. Do not flatten nested AGENTS.md or claim commercial Basel parity."
---

# Supervisory twin

Runnable financial-compliance digital-twin reference. Not a certified Basel engine.

## Do

- Read `services/*/AGENTS.md` before editing that service.
- Keep Cedar and Zen as the policy engines.
- Run `./scripts/harness/verify.sh` before claiming done.

## Do not

- Flatten nested agent contracts.
- Bump Go, Java, or Next unless the task is that upgrade.
- Claim production hardening or commercial XBRL/SDMX parity.

