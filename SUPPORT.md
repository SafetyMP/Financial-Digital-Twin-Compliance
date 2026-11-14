# Support

Financial Digital Twin is an open-source governance workspace and reference backend maintained by [SafetyMP](https://github.com/SafetyMP). Support is best effort; there is no SLA or guaranteed roadmap date.

## Where to go

| Need | Channel |
| --- | --- |
| Try the review workflow | [Public synthetic demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) |
| Run connected reviews | [Connected workspace guide](docs/governance-integration.md) |
| Report a bug or usability problem | [GitHub Issues](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/issues/new/choose) |
| Propose an improvement | [Roadmap](ROADMAP.md), then a feature request |
| Report a vulnerability | [Security policy](SECURITY.md); do not post it publicly |
| Contribute a fix | [Contributing guide](CONTRIBUTING.md) |

## Help us reproduce the problem

State whether you used the Pages demo, connected workspace, an engineering console, or backend CI. Include the commit or release, browser/runtime version, steps, expected result, and actual result. For review problems, describe the issue/evidence state before and after the action. For CI failures, include the run URL and failing step.

Use synthetic examples. Remove credentials, tokens, customer data, and identifying financial information from screenshots, exports, and logs. Do not upload real banking records to a public issue or the demo.

## Scope and versions

| Version / mode | Support scope |
| --- | --- |
| `main` | Active development; check the exact commit's CI results |
| GitHub Pages demo | Synthetic browser-local exploration; local notes are not backed up by this project |
| Connected workspace | Trusted development environment with configured reviewer identity; setup and reproducible integration issues |
| Release tags / GHCR images | Their documented snapshot and published-image scope; older tags may lack the governance redesign |

The dev stack is not supported as an unchanged production deployment. Institutional onboarding, production authentication and authorization, operational support, custom consulting, and regulatory assurance are not provided through this repository.

[Documentation index](docs/README.md) · [Security posture](SECURITY.md) · [Changelog](CHANGELOG.md).
