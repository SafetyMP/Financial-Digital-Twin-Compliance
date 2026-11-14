# Repository instructions

Read [AGENTS.md](../AGENTS.md), then the nearest scoped `AGENTS.md` for the files
being changed. Use [docs/agent-guide.md](../docs/agent-guide.md) for detailed
verification and operational references; do not load the whole history by default.

Financial Digital Twin is a governance workspace for financial institutions:
prioritize issues, inspect context and evidence, and record review decisions.
Favor plain language, accessible UI, and a short path through the review workflow.

`apps/governance-console` is a synthetic GitHub Pages demo with browser-local
reviews. `apps/governance-live` connects to alert/audit services through server
routes and uses a configured development reviewer, not production authentication.
Review history is PostgreSQL data, distinct from immudb alert evidence. Preserve
explicit chain verification and visible backend errors; never substitute demo
fixtures in connected mode or imply that a review resolves a financial issue.

Keep the existing Go/Java/Next stacks, pinned dependencies, tenant boundaries,
Kafka contracts, and smoke/coverage gates. Do not replace Cedar or GoRules Zen,
expose development services, commit secrets or customer data, or claim regulatory
certification. Any code edit needs a build or relevant package tests; logic changes
also need the relevant integration checks. Report verification with its scope and
commit. Historical plans and archived runtimes are not execution authority.
