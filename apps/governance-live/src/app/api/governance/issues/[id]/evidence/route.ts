import { error, json, upstream, validID } from '../../../../../../lib/gateway';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validID(id)) return error(400, 'BAD_REQUEST', 'Invalid issue ID.');
  const response = await upstream('alert', `/api/v1/alerts/${encodeURIComponent(id)}`);
  if (!response.ok) return response;
  const alert = await response.json();
  if (!alert || alert.alertId !== id) return error(502, 'UPSTREAM_FORMAT', 'Alert service returned a different issue.');
  if (!alert.evidenceRef) return json({ available: false, ledgerRecord: false, entry: null, message: 'No audit reference is attached to this alert yet.' });
  if (typeof alert.evidenceRef !== 'string' || !validID(alert.evidenceRef)) return error(502, 'UPSTREAM_FORMAT', 'Alert service returned an invalid audit reference.');
  const audit = await upstream('audit', `/api/v1/audit/entries/${encodeURIComponent(alert.evidenceRef)}`);
  if (!audit.ok) return audit;
  const entry = await audit.json();
  if (!entry || entry.entryId !== alert.evidenceRef) return error(502, 'UPSTREAM_FORMAT', 'Audit service returned a different evidence record.');
  // Existing audit-service falls back to the PostgreSQL index if ledger retrieval fails.
  const ledgerRecord = Object.prototype.hasOwnProperty.call(entry, 'payload') && !!entry.subject && !!entry.actor;
  return json({ available: true, ledgerRecord, entry, message: ledgerRecord
    ? 'Ledger record retrieved from the audit service. Run chain verification to check integrity; retrieval alone is not verification.'
    : 'Only the audit index was returned. Ledger content is unavailable; integrity has not been verified.' });
}
