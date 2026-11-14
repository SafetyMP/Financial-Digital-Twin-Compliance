# GitHub repository presentation and maintenance

The canonical repository is [SafetyMP/Financial-Digital-Twin-Compliance](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance). Its public identity is **Financial Digital Twin — Governance Workspace**. Keep the repository name and existing URLs stable while aligning metadata and documentation with the [product vision](product-vision.md).

## Repository metadata

Use the repository About panel for a concise, factual description and the public demo URL. Topics should describe the implemented purpose and supporting technology, not roadmap-only capabilities.

| Field | Canonical content |
| --- | --- |
| Description | Open-source governance workspace for financial institutions: review monitored issues, inspect audit evidence, and record decisions. Includes a synthetic demo and connected development stack. |
| Website | `https://safetymp.github.io/Financial-Digital-Twin-Compliance/` |
| Topics | `financial-governance`, `digital-twin`, `regtech`, `compliance`, `risk-management`, `audit-trail`, `policy-as-code`, `event-driven`, `kafka`, `flink`, `cedar`, `immudb`, `nextjs`, `postgresql` |
| Social preview | Use the current governance workspace visual, with meaningful alternate text in repository documentation. Do not use a legacy multi-console screenshot as the primary product image. |

GitHub topics use lowercase letters, numbers, and hyphens, at most 50 characters per topic and 20 topics per repository. See [GitHub's topic guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics). Metadata is configured on GitHub; editing this file alone does not apply it.

## Front door and contribution paths

- [README](../README.md): audience, review workflow, demo, setup, boundaries, and source map.
- [Documentation index](README.md): route readers to current guides before phase history.
- [Contributing](../CONTRIBUTING.md), [Support](../SUPPORT.md), [Security](../SECURITY.md), and [Code of Conduct](../CODE_OF_CONDUCT.md): canonical root community files.
- [Issue templates](../.github/ISSUE_TEMPLATE/) and [PR template](../.github/PULL_REQUEST_TEMPLATE.md): identify demo versus connected mode, expected outcome, reproduction, and verification.
- [AGENTS.md](../AGENTS.md) and [.github/copilot-instructions.md](../.github/copilot-instructions.md): concise source and test routing for coding agents. Scoped service contracts still apply.

Use natural task language such as financial governance, compliance review, audit evidence, and review history. Accurate descriptions, accessible content, stable links, and useful documentation support discovery; they do not guarantee a search position or agent recommendation.

## GitHub Pages

[governance-pages.yml](../.github/workflows/governance-pages.yml) tests and exports `apps/governance-console` with `/Financial-Digital-Twin-Compliance` as its base path, then publishes the static artifact through the `github-pages` environment. Pages hosts the synthetic demo only. Backend credentials and configured development identities must not appear in its public bundle.

Use the deployed commit and terminal workflow result to confirm publication. A passing local build is not deployment evidence. Changing the repository name or domain requires coordinating canonical URLs, the Next.js base path, metadata, and Pages settings.

## Checks and branch policy

Preserve existing repository rules and inspect actual check names before changing requirements. Recommended maintenance practices are focused pull requests, review appropriate to the change, required relevant checks, and protection against accidental force-pushes/deletions. A documentation task is not authorization to weaken checks or change access policy.

| Workflow | Scope |
| --- | --- |
| [CI](../.github/workflows/ci.yml) | Service tests, policy and Kafka contracts, engineering console builds, Phase 1–4 smoke, UI proxies, coverage |
| [Governance integration](../.github/workflows/governance-integration.yml) | Real-service browser review workflow and both governance frontend builds |
| [Governance Pages](../.github/workflows/governance-pages.yml) | Static demo build and deployment |
| [Schema compatibility](../.github/workflows/schema-compat.yml) | Published Avro schema compatibility |
| [CodeQL](../.github/workflows/codeql.yml) | Configured source-code security analysis |
| [Scorecard](../.github/workflows/scorecard.yml) | Repository security-practice analysis |
| [Docker Publish](../.github/workflows/docker-publish.yml) | Existing reference-stack images in GHCR |

A green workflow is evidence for its checks at its commit, not a blanket security or compliance certification. Report failures and skipped checks accurately. Phase 5–7 scripts and historical evaluation material do not expand the standard CI claim.

## Releases and operations

Keep [CHANGELOG.md](../CHANGELOG.md) current. Use existing semver release automation when a release is explicitly intended; do not create a historical tag again. GHCR's existing `digital-twin-compliance` image namespace remains valid even though the GitHub repository's canonical name includes `Financial-`.

[Deployment notes](deployment.md) distinguish public Pages, trusted connected development, engineering images, and experimental hardening overlays. Staging credentials, environment protection, repository visibility, and package access require their own authorized configuration; a recommendation in documentation does not establish that they are applied.
