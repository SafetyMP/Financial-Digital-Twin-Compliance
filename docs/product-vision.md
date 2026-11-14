# Product vision: Financial Digital Twin governance workspace

Financial Digital Twin helps governance professionals at financial institutions understand monitored issues, inspect supporting evidence, and record a review in one workspace. Ease of use is the primary product priority: a reviewer should not need to know the service topology to complete the task.

## The review journey

1. **Find what needs attention.** Search and filter the loaded issue queue by severity and review status.
2. **Understand the trigger.** Read the affected entity, reported observation, monitoring threshold, and explanation together.
3. **Follow the evidence.** Inspect linked records and distinguish a retrieved record from an explicit audit-chain check.
4. **Record a deliberate review.** Acknowledge an issue or escalate it for follow-up, with a note.
5. **Retain the context.** Return to history or export the loaded review records without losing the decision's context.

Acknowledgement records that a review happened. Escalation records a follow-up state. Neither action resolves the financial issue, approves an exception, changes a policy, or sends a notification.

## What exists today

| Experience | Audience and purpose | Data and persistence |
| --- | --- | --- |
| [Public interactive demo](https://safetymp.github.io/Financial-Digital-Twin-Compliance/) | Explore the review journey without setup | Synthetic fixtures; notes stay in the browser; no backend or live ledger |
| [Connected development workspace](governance-integration.md) | Exercise the same interface against the alert and audit services | Actual service records from a development stack; review history in PostgreSQL; linked audit entries in immudb |
| [Engineering reference stack](architecture.md) | Develop and verify ingestion, monitoring, policy, and audit capabilities | Mock banking sources, Debezium, Kafka, per-record Flink processing, Cedar/Zen, and backing stores |

The shared interface lives in `apps/governance-console/src/components/Workspace.tsx`. The static demo is `apps/governance-console`; the connected server is `apps/governance-live`. The established engineering consoles remain available for deeper diagnostics.

## Design commitments

- Keep issue, evidence, and review context together; use plain language before raw identifiers.
- Show missing values and unavailable services explicitly. Connected mode never substitutes synthetic demo records on failure.
- Make a pending save, successful review, failed request, and safe retry visible.
- Keep review history separate from audit-ledger evidence. PostgreSQL review rows are not cryptographic receipts.
- Treat narrow-screen use, keyboard navigation, and readable states as part of the workflow.
- Use synthetic data for demonstrations and reproducible verification.

## Evidence and limits

The redesign and connected workflow are merged into `main`. The [verified baseline at `4003b94`](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/commit/4003b94487ebc59bbd63fbdf93b316572e4b093d) passed the [governance browser workflow](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/runs/43646897572) and the [full CI Phase 1–4 smoke and coverage checks](https://github.com/SafetyMP/Financial-Digital-Twin-Compliance/actions/runs/43646873895) on 14 November 2026. These are implementation checks, not evidence of improved customer engagement or a usability study.

Connected access currently uses a configured development reviewer identity, not authenticated end-user identity. Multi-user production access, operational readiness, and usability validation need further work. The connected Twin explorer shows the selected alert's entity and signal; it does not query the graph service. Scenario lab is a synthetic demo feature. Regulatory reporting remains a local-name XML fixture, not certified filing capability.

## Direction

The [public roadmap](../ROADMAP.md) prioritizes measured review usability, stronger identity and access controls, evidence clarity, and reliable operation. Historical phase plans describe how the reference stack grew; they do not replace this product direction or establish delivery commitments.

Start with the [quickstart](quickstart.md), [documentation map](README.md), or [contributor guide](../CONTRIBUTING.md).
