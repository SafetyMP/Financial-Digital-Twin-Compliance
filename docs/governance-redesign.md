# Governance workspace redesign

## Problem and audience

The primary audience is financial-institution governance professionals. The user
identified ease of use as the largest gap. The redesign keeps the original problem:
understanding a monitored financial event, the policy that flagged it, and its
supporting evidence. It makes that investigation accessible without requiring the
reviewer to understand the service topology.

The original [README](../README.md#who-this-is-for) describes an engineering
reference for tracing mock payments through monitoring, policy, and audit. Source
inspection identified these friction points; these are observations about the
implementation, not measured causes of low customer engagement:

- The [alert queue](../apps/alert-console/src/app/page.tsx) loads only open alerts,
  offers no search or severity filters, foregrounds persona identifiers, and gives
  no visible acknowledgement failure. Acknowledged items disappear on the next
  open-only refresh.
- [Alert details](../apps/alert-console/src/app/alerts/[alertId]/page.tsx) expose raw
  JSON and open evidence in a separate console. The investigation loses its shared
  context across application boundaries.
- The [shared shell](../packages/console-shell/src/AppShell.tsx) foregrounds
  development phases and separate consoles instead of the review task.
- The [audit list](../apps/audit-explorer/src/app/page.tsx) displays an unconditional
  integrity badge. The redesigned demo must never present sample evidence as a
  completed verification of a live ledger.

## Design hypothesis and scope

A unified **queue → explanation → evidence → recorded review** journey should make
it easier to identify an issue, understand its cause, and record a deliberate
review. Plain-language labels, visible review states, and retained context are the
intervention. Customer testing is needed to establish whether they improve task
completion or engagement.

The new application lives in `apps/governance-console`. It retains the repository's
Next.js and React stack and exports static assets for GitHub Pages. This is a
synthetic, browser-local demonstration of the proposed experience. It does not
connect to banks, run the streaming pipeline, authorize a payment, certify
compliance, verify an immudb ledger, or submit a regulatory report. Review state in
the demo does not change a policy decision or resolve the underlying risk.

The existing service stack, consoles, policies, runtime versions, and archives are
retained. Their running path remains CDC → Kafka → per-record Flink streaming →
Cedar (`cedar-go`) → immudb. The demo is not evidence that those services have been
integrated into the new interface. That integration requires its own contract and
end-to-end verification.

## Acceptance checks

Checked items below were exercised locally on 14 November 2026; live deployment is recorded separately.

- [x] A visitor can select an issue, explain its trigger, inspect its linked
  evidence, and record a review within one workspace.
- [x] Search and severity/status filters work together, and empty results offer a
  clear way back to the queue.
- [x] Issue details show the affected entity, observed value, threshold, and
  explanation before raw identifiers or technical payloads.
- [x] Review actions have an explicit local outcome, remain discoverable, and can
  be reset. Reviewed/acknowledged does not mean resolved, approved, or compliant.
- [x] Sample data and browser-local actions are clearly identified. Unavailable
  evidence and verification are never represented as successful.
- [x] Interactive controls work with a keyboard, visible focus, descriptive names,
  and narrow-screen layouts.
- [x] Package tests and static export build pass with the Pages base path.
- [ ] The deployed repository-subpath page and its assets load without localhost
  links, server-only API calls, or browser errors.
- [x] Independent review findings are resolved or documented before delivery.

## Local commands

Use Node 22 and run these commands from the repository root:

```bash
cd apps/governance-console
npm ci
npm test
npm run dev
```

Open the local URL printed by Next.js. Stop that server before starting another on
the same port. To build the GitHub Pages artifact from the app directory:

```bash
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build
```

The export is `apps/governance-console/out`. To preview that export at the same
subpath used by Pages, run the following from the app directory in a separate
terminal. The temporary directory only contains a link to the build output:

```bash
governance_preview_root="$(mktemp -d)"
ln -s "$PWD/out" "$governance_preview_root/Financial-Digital-Twin-Compliance"
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$governance_preview_root"
```

Open `http://127.0.0.1:4173/Financial-Digital-Twin-Compliance/`. Stop the server with
Ctrl-C when finished. No Compose services are needed for this static demo.

## GitHub Pages delivery

The [governance Pages workflow](../.github/workflows/governance-pages.yml) tests and
builds changes to this app on pull requests. Pushes to `codex/governance-redesign`
and `main`, plus manual workflow dispatch, can deploy the static artifact after a
successful build. Pull requests cannot deploy through this workflow. Build jobs
have read-only repository access; only the deployment job receives Pages and OIDC
write permissions.

Set the repository's Pages publishing source to **GitHub Actions**. Its
`github-pages` environment must allow the intended deployment branch; preserve
any required reviewer rules. The configured base path is
`/Financial-Digital-Twin-Compliance`, so a repository rename or custom-domain move
requires revisiting that setting. GitHub documents the artifact, environment, and
deployment permissions in [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

A successful local export, a successful workflow, and a live-browser check are
separate evidence. Record the deployed commit and workflow result when publishing;
do not infer deployment merely from the existence of this workflow.

## Customer validation

Use fictional scenarios with representative governance professionals. Give the
same tasks and data to participants trying the old and new experiences, and
counterbalance the order to reduce practice effects:

1. Find the highest-priority open issue for a named institution.
2. Explain what triggered it, using the observed value and threshold.
3. Identify the supporting evidence and describe what it does and does not prove.
4. Record a review and find its resulting state.
5. Recover from a filter with no matching results and return to the issue.

Observe completion without coaching, wrong decisions, unnecessary navigation,
requests for help, and time to completion. Ask participants to explain the meaning
of reviewed, resolved, and verified; confusion between them is a design failure.
Collect a brief ease-of-use rating and an explanation after each task. Preserve
failures and differing opinions when revising the design. This demo does not
include customer analytics, and no improvement in engagement is claimed without
observed customer evidence.

## Verification record — 14 November 2026

- Six model tests passed: fixture provenance, combined filtering and priority, review totals, untrusted storage rejection, optional-note persistence and deduplication, and scenario arithmetic.
- Production static export and TypeScript validation passed using the repository subpath. The pinned Next.js 15.5.24 / React 19.2.7 versions are unchanged. Node 22 runs native TypeScript model tests.
- Browser checks at desktop (1440 px) and mobile (390 px): search and severity/status filtering, empty result recovery, explanation/evidence/review navigation, empty-note acknowledgement, keyboard escalation with a note, reload persistence, JSON export contents, reset/reload, twin selection continuity, and keyboard scenario sensitivity. Browser error/warning log was empty.
- Independent source review caught and resolved CI Node incompatibility, unsupported static start command, filter/detail mismatch, cross-view selection mismatch, and low-contrast explanation/metadata. Rechecked core text contrast measured 6.31:1 for explanations and 5.35:1 for selected queue metadata. This is targeted accessibility verification, not a full WCAG audit.
- No live backend integration or customer usability study was run. Existing service consoles are retained; their historical issues have not been fixed by the new frontend.
