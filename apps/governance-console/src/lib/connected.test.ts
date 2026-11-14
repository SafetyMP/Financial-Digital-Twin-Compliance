import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAlert, normalizeReview, normalizeEvidence, fetchWorkspace, fetchReviews, saveReview, verifyLedger } from './connected.ts';
const id = '79ca894e-6347-474b-b602-e864c510c8e2';
const alert = { alertId: id, ruleCode: 'BASEL-M001', status: 'Open', severity: 'Critical', personaId: 'institution-1', personaType: 'Institution', summary: 'LCR below configured minimum', details: { lcr: '0.95', threshold: '1.0' }, detectedAt: '2026-06-14T01:34:56.093806460Z' };
const fetcher = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

test('maps actual backend ratios and thresholds without substituting demo values', () => {
  assert.equal(normalizeAlert(alert).observed, '95%');
  assert.equal(normalizeAlert(alert).threshold, '100% minimum');
  assert.equal(normalizeAlert({ ...alert, details: {} }).threshold, 'Not provided');
  const unknown = normalizeAlert({ ...alert, ruleCode: 'NEW-RULE', severity: 'Info' });
  assert.equal(unknown.category, 'Other'); assert.equal(unknown.severity, 'Unknown');
  assert.equal(unknown.entity, 'institution-1'); assert.deepEqual(unknown.evidence, []);
  assert.throws(() => normalizeAlert({ ...alert, detectedAt: 'bad' }));
});

test('backend review parser preserves actor and rejects another issue and invalid date', () => {
  const record = { reviewId: 'receipt-1', issueId: id, status: 'Escalated', note: '', at: alert.detectedAt, reviewedBy: 'governance-reviewer' };
  assert.equal(normalizeReview(record, id).reviewedBy, 'governance-reviewer');
  assert.throws(() => normalizeReview(record, 'another-id'));
  assert.throws(() => normalizeReview({ ...record, at: 'bad' }, id));
});

test('pagination detects another page and open issues cause no unnecessary history calls', async () => {
  let calls = 0;
  const raw = Array.from({ length: 26 }, (_, i) => ({ ...alert, alertId: `${id}-${i}` }));
  const result = await fetchWorkspace(25, (async (url) => { calls++; assert.equal(url, '/api/governance/issues?limit=26&offset=25'); return new Response(JSON.stringify(raw)); }) as typeof fetch);
  assert.equal(calls, 1); assert.equal(result.issues.length, 25); assert.equal(result.hasMore, true); assert.equal(result.nextOffset, 50);
});

test('unavailable service never falls back to synthetic issues', async () => {
  await assert.rejects(fetchWorkspace(0, fetcher({ error: 'Alert service is unavailable' }, 502)), /unavailable/);
  await assert.rejects(fetchWorkspace(0, fetcher({})), /invalid queue/);
});

test('review write retains idempotency key, server actor and authoritative alert', async () => {
  const review = { reviewId: 'r1', issueId: id, status: 'Acknowledged', note: '', at: alert.detectedAt, reviewedBy: 'server-reviewer' };
  const result = await saveReview(id, 'Acknowledged', '', id, (async (_url, init) => {
    assert.deepEqual(JSON.parse(init!.body as string), { status: 'Acknowledged', note: '', requestId: id });
    return new Response(JSON.stringify({ review, alert: { ...alert, status: 'Acknowledged' }, replayed: false }));
  }) as typeof fetch);
  assert.equal(result.review.reviewedBy, 'server-reviewer'); assert.equal(result.alert.backendStatus, 'Acknowledged');
});

test('index fallback stays distinct from ledger content and verification', () => {
  const index = normalizeEvidence({ available: true, ledgerRecord: false, entry: { entryId: 'e1', payloadHash: 'abc', recordedAt: alert.detectedAt }, message: 'Only the index is available.' });
  assert.equal(index.ledgerRecord, false); assert.equal(index.evidence.length, 1);
  const missing = normalizeEvidence({ available: false, ledgerRecord: false, entry: null, message: 'No audit reference yet.' });
  assert.deepEqual(missing.evidence, []);
});

test('verification preserves empty-chain and genuine failed-chain results', async () => {
  assert.equal((await verifyLedger(fetcher({ valid: true, checkedCount: 0, message: 'empty chain' }))).checkedCount, 0);
  const broken = await verifyLedger(fetcher({ valid: false, checkedCount: 2, brokenAt: 3, message: 'hash mismatch' }, 409));
  assert.equal(broken.valid, false); assert.equal(broken.brokenAt, 3);
});


test('malformed or contradictory verification cannot be reported as successful', async () => {
  await assert.rejects(verifyLedger(fetcher({ valid: true })), /invalid verification/);
  await assert.rejects(verifyLedger(fetcher({ valid: true, checkedCount: 1 }, 409)), /contradictory/);
  await assert.rejects(verifyLedger(fetcher({ valid: true, checkedCount: -1 })), /invalid verification/);
});


test('history traverses pages and sorts fractional timestamps by actual time', async () => {
  const record = { reviewId: 'r', issueId: id, status: 'Acknowledged', note: '', reviewedBy: 'server-reviewer', at: '2026-11-14T09:00:00Z' };
  let calls = 0;
  const history = await fetchReviews(id, (async (url) => {
    calls++;
    if (calls === 1) { assert.match(String(url), /limit=200&offset=0/); return new Response(JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ ...record, reviewId: `r-${i}` })))); }
    assert.match(String(url), /limit=200&offset=200/);
    return new Response(JSON.stringify([{ ...record, reviewId: 'newest', at: '2026-11-14T09:00:00.001Z' }]));
  }) as typeof fetch);
  assert.equal(calls, 2); assert.equal(history.length, 201); assert.equal(history[0].reviewId, 'newest');
});
