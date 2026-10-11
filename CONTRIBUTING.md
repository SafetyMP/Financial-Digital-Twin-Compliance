# Contributing

Thank you for contributing to the Digital Twin Compliance Platform — an open-source reference stack maintained by [SafetyMP](https://github.com/SafetyMP) under the [Apache License 2.0](LICENSE).

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) and [ROADMAP.md](ROADMAP.md) before participating.

## Getting started

1. Fork the repository and clone your fork.
2. Copy `.env.example` to `.env` (never commit `.env`).
3. Follow the [running path](README.md) (one mock payment through Debezium, the Flink streaming job, a Cedar decision, and an immudb audit entry). The [quick start](README.md#quick-start) is that same Compose stack.
4. Create a feature branch from `main` (e.g. `feat/...`, `fix/...`, `docs/...`).

## Development workflow

From the repository root:

```bash
docker compose -f docker-compose.dev.yml up -d --wait
./scripts/seed.sh
./scripts/register-schemas.sh
./scripts/register-debezium-connector.sh
docker compose -f docker-compose.dev.yml restart state-service
docker compose -f docker-compose.dev.yml up -d --wait state-service

cd services/state-service && go test ./...
./scripts/smoke-test.sh

# Monitoring
./scripts/submit-flink-job.sh
cd services/alert-service && go test ./...
./scripts/smoke-test-phase2.sh

# Policy & audit
./scripts/run-policy-ci.sh
cd services/cedar-service && go test ./...
cd services/decision-service && go test ./...
cd services/audit-service && go test ./...
./scripts/smoke-test-phase3.sh
```

Flink streaming-job unit tests (per-record; no `flink-cep` artifact; no local Maven required):

```bash
docker run --rm -v "$PWD/jobs/compliance-cep:/app" -w /app maven:3.9-eclipse-temurin-17 mvn -q test
```

## Pull requests

1. Open an issue or comment on an existing one for large changes (see [ROADMAP.md](ROADMAP.md)).
2. Keep PRs focused — one purpose per PR.
3. Ensure CI passes (unit tests, policy CI, smoke tests, schema compatibility).
4. Fill in the PR template test plan.
5. Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for user-visible changes.
6. If you change alert-console or audit-explorer UI materially, regenerate README screenshots per [docs/demo-phase3.md § Screenshots for maintainers](docs/demo-phase3.md#screenshots-for-maintainers).

### Review checklists (by area touched)

| Area | Checklist |
|------|-----------|
| State Service / ingestion | [phase1-review-checklist.md](docs/review/phase1-review-checklist.md) |
| Flink / alerts / console | [phase2-exit-checklist.md](docs/review/phase2-exit-checklist.md) |
| Policies / audit / explorer | [phase3-exit-checklist.md](docs/review/phase3-exit-checklist.md) |

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) when practical:

- `feat:` new capability
- `fix:` bug fix
- `docs:` documentation only
- `test:` tests only
- `ci:` CI/workflow changes
- `refactor:` behavior-preserving refactor

## Contribution areas

| Component | Path | Typical tests |
|-----------|------|---------------|
| State Service | `services/state-service/` | `go test ./...`, `./scripts/smoke-test.sh` |
| Alert Service | `services/alert-service/` | `go test ./...`, `./scripts/smoke-test-phase2.sh` |
| Flink streaming job | `jobs/compliance-cep/` | `mvn test`, `./scripts/check-honest-flink-path.sh`, Phase 2 smoke |
| Alert Console | `apps/alert-console/` | `npm run build`, Phase 2 smoke |
| Cedar / Zen | `services/cedar-service/`, `services/decision-service/`, `policies/` | `./scripts/run-policy-ci.sh` |
| Audit ledger | `services/audit-service/`, `apps/audit-explorer/` | `./scripts/smoke-test-phase3.sh` |
| Kafka contracts | `schemas/avro/`, `contracts/kafka/` | `./scripts/check-kafka-contracts.sh` |

## Outside the running path

The path that runs is one mock core-banking payment through Debezium, the Flink streaming job (`WatermarkStrategy.noWatermarks()`, no `flink-cep` artifact), a Cedar decision (`cedar-go`), and an immudb audit entry (`Set` / `Get`, not `VerifiedGet`). These directories exist. They are not that path:

| Directory | What it is |
|-----------|------------|
| `services/graph-service`, `apps/graph-explorer` | Neo4j exposure graph. Implemented, and outside the payment-audit path. |
| `services/simulation-service`, `apps/simulation-console` | Python stress simulation. Implemented, and outside the payment-audit path. |
| `services/reporting-service`, `apps/report-console` | Local-name XML fixture (`lxml` local names). Not an XBRL or SDMX engine, and not the running path. |
| `services/oidc-edge` | Hardening overlay that checks bearer tokens. The running path uses mock principals. |

Do not describe these trees as unbuilt. Do not treat `services/reporting-service` as taxonomy validation.

Details: [ROADMAP.md](ROADMAP.md) and [docs/roadmap.md](docs/roadmap.md).

## Coding guidelines

- Match event envelope and idempotency patterns in [docs/data-flow.md](docs/data-flow.md).
- Include `tenant_id` on all entity tables (default single-tenant UUID per [ADR-007](docs/adr/007-phase1-foundation-decisions.md)).
- Publish to Kafka **only** via the transactional outbox in State Service (`services/state-service/internal/outbox/`).
- Use parameterized SQL (no string concatenation for queries).
- Never commit secrets, credentials, or `.env` files.
- Avro schema changes must remain **BACKWARD** compatible; update baseline only with intent.

Service-specific contracts:

- State Service: [services/state-service/AGENTS.md](services/state-service/AGENTS.md)
- Alert Service: [services/alert-service/AGENTS.md](services/alert-service/AGENTS.md)
- Cedar Service: [services/cedar-service/AGENTS.md](services/cedar-service/AGENTS.md)
- Decision Service: [services/decision-service/AGENTS.md](services/decision-service/AGENTS.md)
- Audit Service: [services/audit-service/AGENTS.md](services/audit-service/AGENTS.md)

## Architecture decisions

Significant design changes should be documented as ADRs under [docs/adr/](docs/adr/) before or alongside implementation.

## Deployment & releases

- Images are published to GHCR on merge to `main` ([docker-publish.yml](.github/workflows/docker-publish.yml)): `state-service`, `alert-service`, `alert-console`, `compliance-cep`.
- Semver tags (`v*.*.*`) cut a GitHub Release — update [CHANGELOG.md](CHANGELOG.md) first.
- Staging deploy is manual via the **Deploy Staging** workflow; see [docs/deployment.md](docs/deployment.md).

## Automated agents

If you are a Cursor/Codex agent contributor, also read [AGENTS.md](AGENTS.md) for smoke order, scope boundaries, and eval gates. Human contributors can ignore this unless touching agent harness scripts.

## Questions

- [GitHub Issues](https://github.com/SafetyMP/Digital-Twin-Compliance/issues) — bugs and features
- [SUPPORT.md](SUPPORT.md) — response expectations
