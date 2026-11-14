import assert from "node:assert/strict";
import test from "node:test";
import { filterIssues, issues, scenarioImpact, summarize, validateReviews } from "./demo.ts";
import type { Review } from "./demo.ts";

const firstReview: Review = { issueId: "GOV-1042", status: "Acknowledged", note: "Asked Treasury to reconcile the fixture inputs.", at: "2026-11-14T10:00:00.000Z" };

test("fixtures preserve the three implemented monitoring rules and synthetic provenance", () => {
  assert.equal(issues.length, 6);
  assert.equal(new Set(issues.map((issue) => issue.id)).size, 6);
  assert.deepEqual(new Set(issues.map((issue) => issue.rule)), new Set(["INT-M001", "INT-M002", "BASEL-M001"]));
  for (const issue of issues) {
    assert.match(issue.detectedAt, /^2026-11-14T/);
    assert.equal(issue.evidence.length, 3);
    assert.equal(issue.evidence[0].source, "Synthetic banking fixture");
    assert.match(issue.evidence[2].detail, /No immudb record/);
    assert.equal(issue.severity, issue.category === "Payments" ? "Warning" : "Critical");
  }
});

test("search combines with severity and status, remains case insensitive, and prioritizes critical issues", () => {
  assert.equal(filterIssues(issues, "  NORTHSTAR ", "All", "All", []).length, 3);
  assert.equal(filterIssues(issues, "INT-M001", "Critical", "All", []).length, 0);
  assert.equal(filterIssues(issues, "nothing matches", "All", "All", []).length, 0);
  assert.equal(filterIssues(issues, "", "All", "Open", [firstReview]).length, 5);
  assert.deepEqual(filterIssues(issues, "", "Critical", "Acknowledged", [firstReview]).map((issue) => issue.id), ["GOV-1042"]);
  assert.deepEqual(filterIssues(issues, "", "All", "All", []).map((issue) => issue.severity), ["Critical", "Critical", "Critical", "Critical", "Warning", "Warning"]);
});

test("newest-first reviews retain one current entry per issue and consistent totals", () => {
  const escalated: Review = { ...firstReview, status: "Escalated", at: "2026-11-14T10:01:00.000Z" };
  const reviews = [escalated, firstReview];
  assert.deepEqual(validateReviews(reviews), [escalated]);
  assert.equal(filterIssues(issues, "", "All", "Acknowledged", reviews).length, 0);
  assert.equal(filterIssues(issues, "", "All", "Escalated", reviews).length, 1);
  assert.deepEqual(summarize(issues, reviews), { open: 5, critical: 3, reviewed: 1 });
  assert.deepEqual(summarize(issues, []), { open: 6, critical: 4, reviewed: 0 });
});

test("browser storage rejects unknown IDs, unsupported outcomes, malformed dates and notes", () => {
  assert.deepEqual(validateReviews(null), []);
  const invalid = [null, [], {}, { ...firstReview, issueId: "other" }, { ...firstReview, status: "Approved" },
    { ...firstReview, note: null }, { ...firstReview, note: "x".repeat(2001) }, { ...firstReview, at: "yesterday" },
    { ...firstReview, at: "2026-02-30T10:00:00.000Z" }];
  assert.deepEqual(validateReviews(invalid), []);
  assert.deepEqual(validateReviews([{ ...firstReview, injected: "ignored" }]), [firstReview]);
  assert.equal(validateReviews([{ ...firstReview, note: "x".repeat(2000) }]).length, 1);
});

test("optional notes and newest-first status survive browser persistence roundtrip", () => {
  const newest: Review = { ...firstReview, note: "", status: "Escalated", at: "2026-11-14T10:02:00.000Z" };
  const stored = JSON.parse(JSON.stringify([newest, firstReview]));
  const restored = validateReviews(stored);
  assert.deepEqual(restored, [newest]);
  assert.equal(filterIssues(issues, "", "All", "Escalated", restored)[0].id, newest.issueId);
  assert.equal(filterIssues(issues, "", "All", "Acknowledged", restored).length, 0);
  assert.deepEqual(summarize(issues, restored), { open: 5, critical: 3, reviewed: 1 });
  assert.deepEqual(validateReviews([{ ...newest, note: null }, firstReview]), [firstReview]);
});

test("sensitivity arithmetic is deterministic, bounded and uses the correct breach direction", () => {
  assert.equal(scenarioImpact("Liquidity", 0).projected, 92);
  assert.equal(scenarioImpact("Liquidity", -8).projected, 100);
  assert.equal(scenarioImpact("Liquidity", -8).breached, false);
  assert.equal(scenarioImpact("Liquidity", 25).projected, 73.6);
  assert.equal(scenarioImpact("Exposure", -50).projected, 6.2);
  assert.equal(scenarioImpact("Exposure", 0).breached, true);
  assert.equal(scenarioImpact("Payments", -50).projected, 34);
  assert.equal(scenarioImpact("Payments", -50).breached, false);
  assert.deepEqual(scenarioImpact("Liquidity", -999), scenarioImpact("Liquidity", -50));
  assert.deepEqual(scenarioImpact("Exposure", 999), scenarioImpact("Exposure", 50));
  assert.deepEqual(scenarioImpact("Payments", Number.NaN), scenarioImpact("Payments", 0));
  assert.equal(scenarioImpact("Liquidity", Number.POSITIVE_INFINITY).projected, 92);
});
