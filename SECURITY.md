# Security policy

Financial Digital Twin provides a public synthetic demo and a connected development workspace. Neither is a production access-control or regulatory assurance product. This policy covers the governance apps and the supporting reference services.

## Reporting a vulnerability

**Do not open a public issue for a vulnerability.** Use [GitHub private vulnerability reporting](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/security/advisories/new). If that channel is unavailable, contact [SafetyMP](https://github.com/SafetyMP) privately before disclosing details.

Include the affected commit or release, component and mode, reproduction steps using synthetic data, impact, and any proposed remediation. Never include real customer records or live credentials. Maintainers coordinate disclosure when a fix is available; response is best effort rather than an SLA.

## Supported scope

| Area | Security posture |
| --- | --- |
| Current `main` | Active development and CI; report issues against an exact commit |
| Tagged releases | Report the tag and image digest; support follows the documented release scope |
| Public Pages demo | Static assets and synthetic fixtures; review notes are stored in browser storage |
| Connected governance workspace | Trusted development access with a server-configured reviewer principal |
| Production deployment | Requires separate identity, tenancy, network, secrets, and operational design and verification |

## Governance trust boundaries

- **Demo data stays local.** The public demo has no backend connection. Its notes and exports are browser-local demonstration data, not encrypted custody or durable institutional records. Use synthetic notes only.
- **Configured identity is not authentication.** The connected gateway supplies `GOVERNANCE_PRINCIPAL`. It does not establish which person is using the browser. Do not expose this development workspace publicly.
- **Mutations are constrained.** The gateway checks same-origin requests, validates review fields, supplies the trusted actor, and keeps backend URLs and optional `INTERNAL_API_TOKEN` server-side. These controls do not replace an authenticated access model.
- **Persistence is explicit.** Review notes and history live in PostgreSQL. Alert evidence is linked through the audit service to immudb. A review is not an immutable ledger receipt, issue resolution, or policy exception approval.
- **Failures remain visible.** Connected mode must not replace backend errors with synthetic fixtures or imply that unverified/index-only evidence is a verified ledger record.

Detailed behavior and configuration: [governance integration](docs/governance-integration.md).

## Reference stack posture

The Compose stack is for local development and CI:

- Development credentials exist for PostgreSQL, Kafka, Redis, immudb, Neo4j, and other components. Never reuse them in a deployed environment.
- Direct service ports are not protected by a production authentication layer or TLS. Keep them off untrusted networks.
- Kafka uses PLAINTEXT in the dev stack. Treat brokers, schema registry, databases, and administrative interfaces as a trusted infrastructure boundary.
- Cedar Service validates its configured HS256 bearer JWTs; that service's decision principal is distinct from the governance review principal. Existing optional internal-token protections apply only where configured.
- The OIDC/TLS hardening overlay is separate from the governance app's reviewer authentication. Its presence in the repository does not qualify the connected workspace for production.
- GHCR images and deployment examples are reference artifacts. The [deployment guide](docs/deployment.md) documents their scope and residual work.

## Secure development

- Keep secrets and real financial/PII data out of source, fixtures, logs, issues, and exports.
- Use `.env.example` for placeholders; never commit `.env`.
- Validate inputs and preserve tenant and actor boundaries at service interfaces.
- Keep Kafka event contracts and Avro BACKWARD compatibility checks intact.
- Review source and dependency changes, use the configured security checks, and verify findings on the actual commit being deployed.
- A successful CI or CodeQL run is not a statement that all security risks have been eliminated.

Non-security questions: [SUPPORT.md](SUPPORT.md).
