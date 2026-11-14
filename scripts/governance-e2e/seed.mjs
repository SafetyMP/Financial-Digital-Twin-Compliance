import { readFileSync } from 'node:fs';

// Preserve the published envelope contract while using unique, synthetic test identities.
const golden = JSON.parse(readFileSync('contracts/kafka/compliance.alerts/basel-alert-raised.envelope.json', 'utf8'));
for (let index = 1; index <= 2; index += 1) {
  const event = structuredClone(golden);
  event.eventId = `f0000000-0000-4000-8000-00000000000${index}`;
  event.correlationId = `f0000000-0000-4000-8000-00000000001${index}`;
  event.source = 'governance-e2e-synthetic-injection';
  event.timestamp = `2026-11-14T09:4${index}:00.000Z`;
  event.idempotencyKey = `governance-e2e-alert-${index}`;
  event.payload.alertId = `f0000000-0000-4000-8000-00000000010${index}`;
  event.payload.personaId = `f0000000-0000-4000-8000-00000000020${index}`;
  event.payload.detectedAt = event.timestamp;
  event.payload.summary = index === 1 ? 'Synthetic liquidity review case' : 'Synthetic escalation review case';
  event.payload.details = { lcr: index === 1 ? '0.92' : '0.97', metric: 'lcr', threshold: '1.0' };
  process.stdout.write(`${JSON.stringify(event)}\n`);
}
