# Connected governance workspace

Read the [root contract](../../AGENTS.md) and
[integration guide](../../docs/governance-integration.md). This development Next.js
server uses the shared UI in `../governance-console`; it is not hosted by Pages.

- Keep alert/audit URLs and `INTERNAL_API_TOKEN` server-only. Routes use fixed
  configured upstreams, bounded timeouts, sanitized failures, and no-store
  responses. Do not accept arbitrary URLs or follow upstream redirects.
- Supply reviewer identity only from `GOVERNANCE_PRINCIPAL` on the server. Reject
  browser-supplied actor fields and require the configured canonical
  `GOVERNANCE_ORIGIN` for mutations; do not trust forwarded headers as authority.
  These development controls are not an end-user authentication system.
- Validate alert/request UUIDs and review fields. Preserve idempotent retries,
  conflicts on changed reuse, persisted history, and the distinction between
  review recording and issue resolution. Backend persistence changes also require
  the [alert-service contract](../../services/alert-service/AGENTS.md).
- Never use browser-local review history or substitute synthetic data when a
  backend request fails. Export only the actual loaded scope, including pagination
  limits and configured actor attribution.
- Distinguish immudb ledger entries from the audit API's PostgreSQL fallback.
  Verification is explicit, nonempty, and tied to the current issue/request; do not
  retain stale success after navigation. Reviews themselves are PostgreSQL data.
- Keep port 3006 loopback-bound for development. Public hosting/authentication
  changes need explicit scope; preserve Pages as the independent synthetic demo.

From the repository root, use Node 22:

```bash
npm test --prefix apps/governance-live
npm run build --prefix apps/governance-live
```

Shared UI changes also require demo tests and its export build. Service-backed
review changes require [the real-service browser workflow](../../scripts/governance-e2e/README.md).
It covers Kafka alert input through PostgreSQL/immudb and the browser; full CDC,
Flink, and policy smoke remain separate checks in the main CI workflow.
