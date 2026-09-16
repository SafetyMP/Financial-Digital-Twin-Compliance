---
name: code-review
description: "Review supervisory-twin PRs for nested service contracts, Cedar/Zen, and honest claim language. Use on pull requests that touch services/*, jobs/compliance-cep, policies/, or apps/*. Flag flattened AGENTS.md files and Basel/XBRL parity claims."
---

# Copilot code review — Financial-Digital-Twin-Compliance

Use this skill when reviewing a pull request in this repository.

This is a **supervisory twin composition** (CDC + Flink CEP + Cedar/Zen + XBRL/SDMX + immudb).

- Keep `services/*/AGENTS.md`.
- Do not claim commercial Basel/XBRL parity.
- Do not replace Cedar or GoRules Zen.
- Verify with `./scripts/harness/verify.sh`.


## Always flag

- Secrets, `.env` values, private keys, or real personal data in the diff
- Weakened or skipped verify / lint / typecheck / adversarial gates
- Invented success (prose claiming a gate passed with no command output)
- Fail-open authorization, skipped human approval, or agents recording `--actor user`

## Never request

- Drive-by major upgrades, formatter churn, or unrelated refactors
- Softening honesty disclaimers or certification claims
