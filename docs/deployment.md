# Deployment and runtime boundaries

Financial Digital Twin has a public static demo and a separate connected development runtime. Choose the deployment surface explicitly.

| Surface | Entry point | What is deployed |
| --- | --- | --- |
| Public GitHub Pages | [Live demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) | Static synthetic workspace; browser-local notes; no backend services |
| Connected development | `docker-compose.dev.yml` + `docker-compose.governance.yml` | Governance server on loopback `127.0.0.1:3006`, using alert/audit APIs |
| Engineering reference | `docker-compose.dev.yml` or existing GHCR deploy scripts | Backend services and diagnostic consoles; documented demo credentials and direct service ports |
| Hardening overlay | `docker-compose.hardening.yml` | Experimental OIDC/TLS paths; not production governance authentication |

Use the [quickstart](quickstart.md) for Kafka-first initialization and [connected integration](governance-integration.md) for the server-only configuration. The overlay's `GOVERNANCE_PRINCIPAL` attributes development reviews; it is not a user login. `GOVERNANCE_ORIGIN` must match the browser origin. Internal API tokens belong only in server configuration.

The current GHCR publishing workflow covers the established reference-stack images. The connected governance runtime is built from source using its Dockerfile; it is not implicitly included in those existing image releases.

Before describing a deployment as verified, identify its exact source commit, passing checks, deployed runtime, and any browser/service verification. The public demo's availability does not establish that a connected backend is deployed. No production governance deployment is asserted by this repository.

The following overlay notes are retained for engineering use. Their demo credentials, direct ports, and self-signed local certificate commands are not a production setup.

## Historical hardening overlay notes (Phase 6)

### Profiles

| Compose files | Purpose |
|---------------|---------|
| `docker-compose.dev.yml` | Default local/CI — direct service ports, mock/open public edges |
| `+ docker-compose.hardening.yml` | Keycloak (`:8088`) + OIDC edge (`:8180`) for Phase 6 proofs |

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.hardening.yml up -d --build --wait oidc-edge
./scripts/smoke-test-phase6-oidc.sh
```

OIDC edge prefixes: `/state/`, `/alert/`, `/audit/`, `/graph/`, `/simulation/`, `/reporting/`.
Unauthenticated non-health calls return **401**. Tokens via Keycloak direct grant (`analyst` / `analyst`, client `digital-twin-api`).

Direct ports (e.g. `:8080`, `:8095`) remain available so Phase 1–4 / Phase 5 smokes do not require tokens.

### Secrets

- `.env.example` contains **non-production** placeholders only.
- Hardening profile uses documented Keycloak admin/dev client secrets — **not** production credentials.
- Residual: Hashicorp Vault (or equivalent) injection for staging/prod is deferred; list remains open.

### TLS edge

Self-signed cert under `infra/tls/` terminated by nginx (`tls-edge` on `:8443`). Private keys (`infra/tls/*.key`) are gitignored — generate locally if missing:

```bash
mkdir -p infra/tls
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout infra/tls/edge.key -out infra/tls/edge.crt \
  -subj "/CN=localhost"
```

```bash
curl -k https://localhost:8443/healthz
curl -k -H "Authorization: Bearer $TOKEN" https://localhost:8443/reporting/api/v1/taxonomies
```

### Residuals (honest)

- Full multi-tenant supervisory SaaS
- HA immudb / multi-AZ Kafka
- Full Kubernetes/Terraform reference pack
- Commercial EBA taxonomy parity
- 10K evt/s on default CI hosts (see load profile docs when authored)
