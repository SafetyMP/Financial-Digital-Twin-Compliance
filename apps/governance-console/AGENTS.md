# Governance demo and shared workspace

Read the [root contract](../../AGENTS.md). This app is a static Next.js export for
GitHub Pages and owns the shared UI imported by `../governance-live`.

- Keep the public mode visibly synthetic. Fixture reviews and notes stay in the
  browser; no live policy evaluation, audit ledger verification, notification, or
  financial action is implied.
- Preserve the issue → context → evidence → review → history path. Use accessible
  labels, keyboard-operable controls, readable empty/error states, and mobile
  layouts. Do not hide important review context behind technical implementation
  details.
- `src/components/Workspace.tsx` serves both modes. Shared changes must preserve
  connected loading, errors, pagination, selected-issue state, in-flight locking,
  and evidence provenance. A backend error must never select demo fixtures.
- `src/lib/demo.ts` owns synthetic data/model behavior. `src/lib/connected.ts`
  adapts actual backend records without inventing missing institutions, owners,
  measurements, thresholds, or history. Review is not issue resolution.
- Static output must work below `/Financial-Digital-Twin-Compliance`. Keep links,
  assets, canonical metadata, and discovery files consistent with that base path.
  Do not add server-only routes, secrets, or required network calls to the demo.
- Preserve pinned dependencies and use existing code-native visual assets.

From the repository root, use Node 22:

```bash
npm test --prefix apps/governance-console
NEXT_PUBLIC_BASE_PATH=/Financial-Digital-Twin-Compliance npm run build --prefix apps/governance-console
npm test --prefix apps/governance-live
npm run build --prefix apps/governance-live
```

The last two checks are required for shared code changes. For interaction/layout
changes, exercise the relevant behavior in a browser; a successful build alone is
not visual verification. Pages deployment and a live check are separate evidence.
