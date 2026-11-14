import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3006';
const backend = 'http://127.0.0.1:18085';
const headers = { 'X-Internal-Token': 'governance-e2e-synthetic-internal-token' };
const ids = ['f0000000-0000-4000-8000-000000000101', 'f0000000-0000-4000-8000-000000000102'];
const output = 'scripts/governance-e2e/artifacts';
const results = { commit: process.env.GITHUB_SHA || null, passed: [], boundary: 'Kafka alert input through real alert/audit services, PostgreSQL, immudb, Next gateway and browser; no CDC/Flink execution.' };
await mkdir(output, { recursive: true });

async function waitUntil(check, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw last || new Error('Condition timed out');
}
async function api(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, `${url}: ${response.status} ${await response.clone().text()}`);
  return response.json();
}
function compose(...args) {
  const result = spawnSync('docker', ['compose', '-p', process.env.COMPOSE_PROJECT_NAME || 'governance-e2e', '-f', 'docker-compose.governance-test.yml', ...args], { stdio: 'inherit', timeout: 120000 });
  assert.equal(result.status, 0, `compose ${args.join(' ')} failed`);
}
await waitUntil(async () => (await fetch(base, { signal: AbortSignal.timeout(3000) })).ok, 90000);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const browserErrors = [];
page.on('pageerror', error => browserErrors.push(error.message));
let serviceStopped = false;
try {
  // Cross-origin mutation must fail before reaching the protected backend.
  const foreignMutation = await fetch(`${base}/api/governance/issues/${ids[0]}/reviews`, {
    method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: randomUUID(), status: 'Acknowledged', note: 'must not persist' }),
  });
  assert.equal(foreignMutation.status, 403);
  assert.equal((await api(`${backend}/api/v1/alerts/${ids[0]}/reviews`, { headers })).length, 0);
  results.passed.push('Foreign-origin mutation rejected without a persisted review');

  await page.goto(base);
  await page.locator('.issue-row').filter({ hasText: ids[0] }).waitFor();
  assert.equal(await page.locator('.issue-row').count(), 2);
  assert.equal(await page.getByText('GOV-1042', { exact: true }).count(), 0);
  await page.locator('.issue-row').filter({ hasText: ids[0] }).click();
  await page.getByRole('button', { name: 'Review this issue', exact: true }).click();
  await page.getByText('Linked audit ledger record', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Verify audit chain', exact: true }).click();
  await page.getByTestId('ledger-verification').filter({ hasText: /Chain check passed/ }).waitFor();
  await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  const firstNote = 'Synthetic E2E: reconciled the liquidity inputs with Treasury.';
  await page.getByRole('textbox', { name: 'Review note (optional)' }).fill(firstNote);
  // Delay delivery of the REAL upstream response to check in-flight UI locking.
  // route.fetch executes the real write; this gate never invents a successful result.
  let releaseResponse;
  let signalUpstream;
  const responseGate = new Promise(resolve => { releaseResponse = resolve; });
  const upstreamReady = new Promise(resolve => { signalUpstream = resolve; });
  const reviewRoute = `${base}/api/governance/issues/${ids[0]}/reviews`;
  const delayReview = async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    signalUpstream();
    await responseGate;
    await route.fulfill({ response });
  };
  await page.route(reviewRoute, delayReview);
  await page.getByRole('button', { name: 'Acknowledge', exact: true }).click();
  let upstreamTimer;
  try {
    await Promise.race([upstreamReady, new Promise((_, reject) => { upstreamTimer = setTimeout(() => reject(new Error('Review upstream did not respond')), 15000); })]);
    assert.equal(await page.getByRole('textbox', { name: 'Search issues' }).isDisabled(), true);
    assert.equal(await page.getByLabel('Severity', { exact: true }).isDisabled(), true);
    assert.equal(await page.getByLabel('Review status', { exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Review history', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('textbox', { name: 'Review note (optional)' }).isDisabled(), true);
    await page.screenshot({ path: `${output}/review-in-flight.png`, fullPage: true });
    results.passed.push('Issue selection, filters, navigation and note are locked during an in-flight real review response');
  } finally {
    clearTimeout(upstreamTimer);
    releaseResponse();
  }
  await waitUntil(async () => await page.getByRole('textbox', { name: 'Search issues' }).isEnabled());
  await page.unroute(reviewRoute, delayReview);
  await waitUntil(async () => {
    const history = await api(`${backend}/api/v1/alerts/${ids[0]}/reviews`, { headers });
    return history.length === 1 && history[0].note === firstNote && history[0].reviewedBy === 'governance-e2e' && history[0].status === 'Acknowledged';
  });
  assert.equal((await api(`${backend}/api/v1/alerts/${ids[0]}`, { headers })).status, 'Acknowledged');
  results.passed.push('Browser inspection of actual linked ledger evidence and nonempty chain verification');
  results.passed.push('Browser acknowledgement saved with note and configured actor in real PostgreSQL');

  await page.reload();
  await page.locator('.issue-row').filter({ hasText: ids[1] }).waitFor();
  await page.locator('.issue-row').filter({ hasText: ids[1] }).click();
  await page.getByRole('button', { name: 'Review this issue', exact: true }).click();
  await page.getByText('Linked audit ledger record', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  const secondNote = 'Synthetic E2E: escalate the remaining liquidity shortfall for follow-up.';
  await page.getByRole('textbox', { name: 'Review note (optional)' }).fill(secondNote);
  await page.getByRole('button', { name: 'Escalate', exact: true }).click();
  await waitUntil(async () => {
    const history = await api(`${backend}/api/v1/alerts/${ids[1]}/reviews`, { headers });
    return history.length === 1 && history[0].status === 'Escalated' && history[0].note === secondNote;
  });
  assert.equal((await api(`${backend}/api/v1/alerts/${ids[1]}`, { headers })).status, 'Escalated');
  results.passed.push('Browser escalation persisted without resolving or approving the underlying issue');

  // A fresh browser context after service restart proves history is server-backed, not localStorage.
  compose('restart', 'alert-service');
  await waitUntil(async () => (await fetch(`${backend}/api/v1/health`, { signal: AbortSignal.timeout(2000) })).ok);
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const mobile = await fresh.newPage();
  mobile.setDefaultTimeout(15000);
  await mobile.goto(base);
  await mobile.locator('.issue-row').filter({ hasText: ids[0] }).waitFor();
  await mobile.getByRole('button', { name: 'Review history', exact: true }).click();
  await mobile.getByText(firstNote, { exact: true }).waitFor();
  await mobile.getByText(secondNote, { exact: true }).waitFor();
  await mobile.screenshot({ path: `${output}/mobile-review-history.png`, fullPage: true });
  const downloadPromise = mobile.waitForEvent('download');
  await mobile.getByRole('button', { name: 'Export review pack', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(`${output}/export.json`);
  const exported = JSON.parse(await readFile(`${output}/export.json`, 'utf8'));
  assert.equal(exported.demo, false);
  assert.equal(exported.reviews.length, 2);
  assert.ok(exported.reviews.some(review => review.note === firstNote));
  assert.ok(exported.reviews.every(review => review.reviewedBy === 'governance-e2e'));
  results.passed.push('Review history survives backend restart and fresh browser context; exported records match stored notes');
  await fresh.close();

  // Stable request IDs prevent duplicate writes after an ambiguous network response.
  const payload = { requestId: randomUUID(), status: 'Acknowledged', note: 'Synthetic E2E idempotency probe' };
  const mutation = { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  const first = await api(`${base}/api/governance/issues/${ids[0]}/reviews`, mutation);
  const duplicate = await api(`${base}/api/governance/issues/${ids[0]}/reviews`, mutation);
  assert.equal(first.review.reviewId, duplicate.review.reviewId);
  assert.equal(duplicate.replayed, true);
  assert.equal((await api(`${backend}/api/v1/alerts/${ids[0]}/reviews`, { headers })).length, 2);
  const changed = await fetch(`${base}/api/governance/issues/${ids[0]}/reviews`, { ...mutation, body: JSON.stringify({ ...payload, note: 'changed payload must conflict' }) });
  assert.equal(changed.status, 409);
  results.passed.push('Real persistence deduplicates retries and rejects reused IDs with changed content');

  await page.reload();
  await page.locator('.issue-row').filter({ hasText: ids[0] }).waitFor();
  await page.screenshot({ path: `${output}/connected-workspace.png`, fullPage: true });
  compose('stop', 'alert-service');
  serviceStopped = true;
  await page.reload();
  await page.getByTestId('connection-status').filter({ hasText: /unavailable|Unable|failed|error/i }).waitFor();
  assert.equal(await page.locator('.issue-row').count(), 0);
  assert.equal(await page.getByText('GOV-1042', { exact: true }).count(), 0);
  await page.screenshot({ path: `${output}/backend-unavailable.png`, fullPage: true });
  results.passed.push('Backend outage is visible and never falls back to synthetic demo issues');
  assert.deepEqual(browserErrors, []);
  results.passed.push('No uncaught browser JavaScript errors');
} catch (error) {
  results.failure = error.stack || error.message;
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  if (serviceStopped) compose('start', 'alert-service');
  await writeFile(`${output}/review-workflow.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
