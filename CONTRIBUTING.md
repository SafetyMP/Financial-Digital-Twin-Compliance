# Contributing to Financial Digital Twin

Help make financial governance reviews easier to understand and complete. Contributions can improve the governance workspace, its alert/audit integrations, the underlying reference services, or the documentation that connects them.

Read the [Code of Conduct](CODE_OF_CONDUCT.md), [roadmap](ROADMAP.md), and [security policy](SECURITY.md). Use synthetic financial data and sanitized logs in every example, issue, and test.

## Choose a starting point

| Work | Start here |
| --- | --- |
| Understand the governance workflow | [Public demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) and [redesign guide](docs/governance-redesign.md) |
| Change the shared interface or demo | `apps/governance-console/` |
| Connect reviews and evidence | `apps/governance-live/` and [integration guide](docs/governance-integration.md) |
| Change a backend service | Its `services/<service>/AGENTS.md`, then [data flow](docs/data-flow.md) |
| Find an engineering capability or historical specification | [Documentation index](docs/README.md) and [phase journeys](docs/phase-journeys.md) |

Fork the repository, create a focused branch from `main`, and preserve dependency versions unless the task specifically requires an upgrade. Never commit `.env` files or credentials. Discuss substantial new behavior in an issue before submitting a large PR; an already agreed implementation does not need another approval loop.

## Governance development

Use Node.js 22 for the governance test commands. From the repository root:

```bash
npm ci --prefix apps/governance-console
npm ci --prefix apps/governance-live
npm test --prefix apps/governance-console
npm test --prefix apps/governance-live
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console
npm run build --prefix apps/governance-live
```

The static demo and connected application share the workspace component. A change must keep their data and persistence semantics distinct. Test empty, loading, failed, and partial-data states as well as the successful review path. Check keyboard access, narrow screens, clear labels, and recovery from a failed save when relevant.

The [connected setup guide](docs/governance-integration.md) documents service URLs, the development principal, origin checks, and the Compose overlay. The [end-to-end harness](scripts/governance-e2e/README.md) uses an isolated real-service stack and synthetic alerts. It covers browser review behavior and durable state; it does not replace upstream CDC/Flink smoke tests.

## Backend and full-stack development

Follow the [documentation index](docs/README.md) for the complete setup path. Create Kafka topics before starting application consumers:

```bash
# From the repository root; Docker Compose and its documented prerequisites are required.
export COMPOSE_PROJECT_NAME=digitaltwin
docker compose -f docker-compose.dev.yml up -d --wait kafka
./scripts/create-kafka-topics.sh
docker compose -f docker-compose.dev.yml up -d --wait
./scripts/seed.sh
```

Continue with the connector registration, service restarts, and smoke sequence in the current [CI workflow](.github/workflows/ci.yml) and setup documentation. Do not assume HTTP health proves Kafka consumption. Keep existing local data unless you deliberately choose a documented reset.

Use subshells for service tests so later repository commands still run from the root:

```bash
(cd services/alert-service && go test ./...)
(cd services/audit-service && go test ./...)
./scripts/check-kafka-contracts.sh
```

Flink is per-record streaming and does not use the `flink-cep` artifact. To run its unit tests without a host Maven installation:

```bash
docker run --rm -v "$PWD/jobs/compliance-cep:/app" -w /app maven:3.9-eclipse-temurin-17 mvn -q test
```

## Match verification to the change

| Area | Relevant checks |
| --- | --- |
| Governance interface / adapters / gateway | Governance unit tests, both production builds, browser checks, and connected end-to-end workflow when behavior changes |
| Alert reviews and persistence | Alert-service tests with PostgreSQL, governance end-to-end checks, and monitoring regression smoke |
| State / ingestion | State-service tests and `./scripts/smoke-test.sh` |
| Flink / monitoring | Maven tests, Kafka contracts, and `./scripts/smoke-test-phase2.sh` |
| Cedar / Zen policies | `./scripts/run-policy-ci.sh` and touched service tests |
| Audit / ledger | Audit-service tests and `./scripts/smoke-test-phase3.sh` |
| Graph / simulation | Touched package tests and `./scripts/smoke-test-phase4.sh` |
| Kafka payloads / Avro | Publisher and consumer fixtures, `./scripts/check-kafka-contracts.sh`, BACKWARD schema compatibility |
| Documentation / discovery metadata | Link/path and claim checks; production build when app metadata changes |

The [full CI](.github/workflows/ci.yml) also runs UI proxy smoke tests and coverage gates. Keep existing tests and assertions; do not change thresholds to hide a failure. Report which checks ran locally, which ran remotely, and what remains unverified. Build or test every touched code package before claiming it is complete.

## Preserve the product's meaning

- Keep synthetic demo state separate from connected service state. A backend outage must not become a successful demo response.
- Display missing evidence and unsuccessful verification honestly. Retrieving an entry is not the same action as verifying its chain.
- Preserve review history, actor attribution, and idempotent retries. Review decisions do not automatically resolve financial issues or approve exceptions.
- Follow existing event envelopes, tenant boundaries, and service-specific persistence contracts. State Service uses its transactional outbox; other services have their own contracts.
- Use parameterized SQL, validate external input, and keep tokens and trusted reviewer identity on the server.
- Preserve historical evidence and specifications. Mark superseded material and link current guidance instead of rewriting past results.

## Pull requests

Describe the user or engineering problem, the resulting behavior, and the evidence that supports it. Include a before/after example when useful and use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

- Keep each PR focused and explain any material scope change.
- Include relevant tests, exact CI links, and remaining limitations.
- Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for user-visible changes.
- Update affected docs and screenshots when the user workflow changes.
- Record significant design decisions in [docs/adr/](docs/adr/).
- Use clear commit messages; Conventional Commits prefixes are welcome but not required.

[Review checklists](docs/review/) retain component-specific requirements. Follow the [discoverability guide](docs/discoverability.md) when changing repository metadata, public descriptions, or search-facing assets. Automated contributors should start with [AGENTS.md](AGENTS.md) and then retrieve only the scoped instructions they need.

## Releases and support

Merging to `main` runs CI and the configured image-publishing workflow. Pages and governance integration workflows run when their paths change or when explicitly dispatched. The published GHCR image list is defined in [docker-publish.yml](.github/workflows/docker-publish.yml); governance-live currently builds from source using its Compose overlay.

Version tags create releases for their recorded scope. A tag does not imply production qualification. [Deployment guide](docs/deployment.md) · [Support](SUPPORT.md) · [Issues](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/issues).
