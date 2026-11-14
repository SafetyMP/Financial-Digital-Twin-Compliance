import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const token = 'governance-e2e-synthetic-internal-token';
const ids = ['f0000000-0000-4000-8000-000000000101', 'f0000000-0000-4000-8000-000000000102'];
const deadline = Date.now() + 180_000;
let evidence;
let lastFailure = 'not started';
while (Date.now() < deadline) {
  try {
    const alerts = await Promise.all(ids.map(async id => {
      const response = await fetch(`http://127.0.0.1:18085/api/v1/alerts/${id}`, { headers: { 'X-Internal-Token': token }, signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200);
      const alert = await response.json();
      assert.ok(alert.evidenceRef, `waiting for audit evidence for ${id}`);
      return alert;
    }));
    const entries = await Promise.all(alerts.map(async alert => {
      const response = await fetch(`http://127.0.0.1:18090/api/v1/audit/entries/${alert.evidenceRef}`, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200);
      const entry = await response.json();
      assert.equal(entry.subject.subjectId, alert.alertId);
      assert.ok(entry.payload && entry.payloadHash && entry.sequenceNumber, 'full immudb entry required, not index fallback');
      return entry;
    }));
    const verification = await fetch('http://127.0.0.1:18090/api/v1/audit/verify', { signal: AbortSignal.timeout(5000) });
    assert.equal(verification.status, 200);
    const chain = await verification.json();
    assert.equal(chain.valid, true);
    assert.ok(chain.checkedCount >= 2, 'chain must contain both actual records');
    evidence = { injectionBoundary: 'Synthetic ComplianceAlertRaised Kafka events; no CDC/Flink execution', alerts, entries, chain };
    break;
  } catch (error) { lastFailure = error.message; }
  await new Promise(resolve => setTimeout(resolve, 1500));
}
assert.ok(evidence, `Timed out awaiting real audit path: ${lastFailure}`);
await writeFile('scripts/governance-e2e/artifacts/service-evidence.json', JSON.stringify(evidence, null, 2));
console.log(`Real service evidence ready: ${evidence.entries.length} linked ledger entries; chain checked ${evidence.chain.checkedCount}.`);
