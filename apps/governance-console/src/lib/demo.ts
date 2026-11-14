/** Synthetic fixtures for the browser demo. No services or financial accounts are connected. */
export type Category = "Liquidity" | "Exposure" | "Payments";
export type Issue = {
  id: string;
  title: string;
  entity: string;
  entityType: string;
  severity: "Critical" | "Warning";
  rule: string;
  category: Category;
  observed: string;
  threshold: string;
  summary: string;
  impact: string;
  owner: string;
  detectedAt: string;
  evidence: { id: string; title: string; detail: string; time: string; source: string }[];
};

function evidence(id: string, time: string, observation: string, rule: string): Issue["evidence"] {
  return [
    { id: `${id}-source`, title: "Source observation", detail: observation, time, source: "Synthetic banking fixture" },
    { id: `${id}-rule`, title: "Monitoring rule matched", detail: `${rule} matches this fixture against the repository's demo threshold. This is an illustrative result, not a live policy evaluation.`, time, source: "Demo rule fixture" },
    { id: `${id}-context`, title: "Review context assembled", detail: "Observation and rule context are linked for review. No immudb record or cryptographic verification is claimed by this browser demo.", time, source: "Browser demo" },
  ];
}

export const issues: Issue[] = [
  {
    id: "GOV-1042", title: "Liquidity buffer below minimum", entity: "Northstar Bank", entityType: "Institution",
    severity: "Critical", rule: "BASEL-M001", category: "Liquidity", observed: "92%", threshold: "100% minimum",
    summary: "Northstar's illustrative liquidity coverage ratio is 8 percentage points below the monitoring threshold.",
    impact: "The fixture indicates a liquidity shortfall. Ask Treasury to validate the inputs and document a response; acknowledging the issue does not resolve the shortfall.",
    owner: "Treasury governance", detectedAt: "2026-11-14T09:42:00.000Z",
    evidence: evidence("GOV-1042", "2026-11-14T09:42:00.000Z", "Synthetic liquid assets of €92M / synthetic net cash outflows of €100M = 92% liquidity coverage.", "BASEL-M001"),
  },
  {
    id: "GOV-1041", title: "Counterparty exposure above limit", entity: "Northstar Bank → Alder Capital", entityType: "Counterparty relationship",
    severity: "Critical", rule: "INT-M002", category: "Exposure", observed: "€12.4M", threshold: "€10M maximum",
    summary: "Two synthetic instruments create €12.4M of exposure to Alder Capital, €2.4M above the demo limit.",
    impact: "Review the concentration with the counterparty risk owner. This notional comparison does not account for collateral, netting, or credit quality.",
    owner: "Counterparty risk", detectedAt: "2026-11-14T09:38:00.000Z",
    evidence: evidence("GOV-1041", "2026-11-14T09:38:00.000Z", "Synthetic instrument notionals of €7.2M + €5.2M = €12.4M to the same counterparty.", "INT-M002"),
  },
  {
    id: "GOV-1040", title: "Payment activity needs review", entity: "Northstar · Operations account", entityType: "Account",
    severity: "Warning", rule: "INT-M001", category: "Payments", observed: "68 payments / hour", threshold: "50 payments / hour maximum",
    summary: "This synthetic account recorded 68 payments in the demo's one-hour observation period, exceeding the threshold by 18.",
    impact: "Confirm whether the activity has an expected business explanation. A high payment count alone is not evidence of fraud or misconduct.",
    owner: "Payments oversight", detectedAt: "2026-11-14T09:31:00.000Z",
    evidence: evidence("GOV-1040", "2026-11-14T09:31:00.000Z", "68 synthetic payments for one account in the illustrative observation period 08:31–09:31 UTC.", "INT-M001"),
  },
  {
    id: "GOV-1039", title: "Liquidity coverage needs attention", entity: "Meridian Commercial Bank", entityType: "Institution",
    severity: "Critical", rule: "BASEL-M001", category: "Liquidity", observed: "97%", threshold: "100% minimum",
    summary: "Meridian's illustrative liquidity coverage ratio is 3 percentage points below the monitoring threshold.",
    impact: "Request an input reconciliation and a documented Treasury assessment. The demo cannot determine whether an actual regulatory obligation applies.",
    owner: "Treasury governance", detectedAt: "2026-11-14T09:24:00.000Z",
    evidence: evidence("GOV-1039", "2026-11-14T09:24:00.000Z", "Synthetic liquid assets of €48.5M / synthetic net cash outflows of €50M = 97% liquidity coverage.", "BASEL-M001"),
  },
  {
    id: "GOV-1038", title: "Concentration threshold exceeded", entity: "Meridian Bank → Birch Holdings", entityType: "Counterparty relationship",
    severity: "Critical", rule: "INT-M002", category: "Exposure", observed: "€10.8M", threshold: "€10M maximum",
    summary: "Combined synthetic instrument notionals to Birch Holdings exceed the demo limit by €0.8M.",
    impact: "Confirm the exposure aggregation and identify the responsible risk owner. No trade restrictions or policy exceptions are applied by this demo.",
    owner: "Counterparty risk", detectedAt: "2026-11-14T09:17:00.000Z",
    evidence: evidence("GOV-1038", "2026-11-14T09:17:00.000Z", "Synthetic instrument notionals of €6M + €4.8M = €10.8M to the same counterparty.", "INT-M002"),
  },
  {
    id: "GOV-1037", title: "Payment volume above baseline limit", entity: "Meridian · Settlement account", entityType: "Account",
    severity: "Warning", rule: "INT-M001", category: "Payments", observed: "54 payments / hour", threshold: "50 payments / hour maximum",
    summary: "The synthetic settlement account has 54 payments in the demo's one-hour observation period, four above the threshold.",
    impact: "Check the scheduled settlement activity before deciding whether to escalate. Recording a review does not approve or reject any payment.",
    owner: "Payments oversight", detectedAt: "2026-11-14T09:09:00.000Z",
    evidence: evidence("GOV-1037", "2026-11-14T09:09:00.000Z", "54 synthetic payments for one account in the illustrative observation period 08:09–09:09 UTC.", "INT-M001"),
  },
];

export type Review = { issueId: string; status: "Acknowledged" | "Escalated"; note: string; at: string };
export type StatusFilter = "All" | "Open" | Review["status"];
export type SeverityFilter = "All" | Issue["severity"];

/** Reviews are newest first; validation retains the first valid entry for each issue. */
function reviewMap(reviews: Review[]) {
  return new Map(validateReviews(reviews).map((review) => [review.issueId, review]));
}

export function filterIssues(items: Issue[], query: string, severity: SeverityFilter, status: StatusFilter, reviews: Review[]): Issue[] {
  const latest = reviewMap(reviews);
  const search = query.trim().toLocaleLowerCase("en");
  return items.filter((issue) => {
    const currentStatus = latest.get(issue.id)?.status ?? "Open";
    return (severity === "All" || issue.severity === severity)
      && (status === "All" || currentStatus === status)
      && [issue.id, issue.title, issue.entity, issue.rule, issue.category, issue.owner].some((value) => value.toLocaleLowerCase("en").includes(search));
  }).sort((a, b) => Number(b.severity === "Critical") - Number(a.severity === "Critical") || b.detectedAt.localeCompare(a.detectedAt));
}

/** Critical counts open critical issues; reviewed includes acknowledgements and escalations, not resolutions. */
export function summarize(items: Issue[], reviews: Review[]) {
  const latest = reviewMap(reviews);
  return items.reduce((summary, issue) => {
    if (latest.has(issue.id)) summary.reviewed += 1;
    else { summary.open += 1; if (issue.severity === "Critical") summary.critical += 1; }
    return summary;
  }, { open: 0, critical: 0, reviewed: 0 });
}

/** Validate untrusted browser storage; retain one current review per issue, newest first. */
export function validateReviews(value: unknown): Review[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set(issues.map((issue) => issue.id));
  const seen = new Set<string>();
  return value.flatMap((entry: unknown): Review[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.issueId !== "string" || !ids.has(item.issueId)
      || (item.status !== "Acknowledged" && item.status !== "Escalated")
      || typeof item.note !== "string" || item.note.length > 2000
      || typeof item.at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.at)) return [];
    const timestamp = Date.parse(item.at);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== item.at) return [];
    if (seen.has(item.issueId)) return [];
    seen.add(item.issueId);
    return [{ issueId: item.issueId, status: item.status, note: item.note, at: item.at }];
  });
}

/**
 * Illustrative sensitivity, not a forecast or policy engine. Relative adjustment is
 * bounded to -50..50 percent. Liquidity holds assets at 92 and changes outflows of
 * 100; exposure scales 12.4 million EUR; payments scales 68 and rounds to integers.
 * Comparison uses unrounded numeric results. Repo demo thresholds are strict.
 */
export function scenarioImpact(category: Category, adjustment: number) {
  const change = Number.isFinite(adjustment) ? Math.max(-50, Math.min(50, adjustment)) : 0;
  const factor = 1 + change / 100;
  if (category === "Liquidity") {
    const projected = 92 / factor;
    return { base: 92, projected, limit: 100, unit: "%", breached: projected < 100,
      explanation: `Liquid assets stay at €92M; net outflows change from €100M by ${change}%. Coverage = 92 ÷ (100 × ${factor.toFixed(2)}) × 100. Illustrative only; no forecast or regulatory assessment.` };
  }
  if (category === "Exposure") {
    const projected = 12.4 * factor;
    return { base: 12.4, projected, limit: 10, unit: "€M", breached: projected > 10,
      explanation: `Counterparty notional = €12.4M × ${factor.toFixed(2)}, with collateral and netting held out of the model. The demo threshold is €10M. Illustrative only; no trades or limits change.` };
  }
  const projected = Math.round(68 * factor);
  return { base: 68, projected, limit: 50, unit: "payments / hour", breached: projected > 50,
    explanation: `Payment count = round(68 × ${factor.toFixed(2)}) in the same illustrative one-hour period. The demo threshold is 50. This sensitivity does not predict suspicious activity.` };
}
