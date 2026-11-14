import type { Issue, Review } from './demo.ts';

export type ConnectedReview = Review & { reviewId: string; reviewedBy: string };
export type WorkspacePage = { issues: Issue[]; reviews: ConnectedReview[]; hasMore: boolean; nextOffset: number };
export type EvidenceResult = { available: boolean; ledgerRecord: boolean; entry: Record<string, unknown> | null; evidence: Issue['evidence']; message: string };
export type VerificationResult = { valid: boolean; checkedCount: number; brokenAt?: number; message: string; verifiedAt: string };
type Fetcher = typeof fetch;
type ObjectValue = Record<string, unknown>;
const pageSize = 25;
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, fallback = 'Not provided') => typeof value === 'string' && value.trim() ? value : fallback;
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const number = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const format = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/** Interpret only observed backend fields. No fixture values or regulatory limits are substituted. */
export function normalizeAlert(raw: unknown): Issue {
  if (!object(raw) || typeof raw.alertId !== 'string' || !raw.alertId || typeof raw.ruleCode !== 'string'
      || !raw.ruleCode || !timestamp(raw.detectedAt) || typeof raw.status !== 'string') {
    throw new Error('Alert service returned an invalid issue.');
  }
  const details = object(raw.details) ? raw.details : {};
  let category: Issue['category'] = 'Other';
  let observed = 'Not provided', threshold = 'Not provided';
  let title = text(raw.summary, 'Monitoring issue');
  if (raw.ruleCode === 'BASEL-M001') {
    category = 'Liquidity'; title = 'Liquidity coverage needs attention';
    const value = number(details.lcr), limit = number(details.threshold);
    if (value !== null) observed = `${format(value * 100)}%`;
    if (limit !== null) threshold = `${format(limit * 100)}% minimum`;
  } else if (raw.ruleCode === 'INT-M002') {
    category = 'Exposure'; title = 'Counterparty exposure above limit';
    const value = number(details.totalExposureEur), limit = number(details.thresholdEur);
    if (value !== null) observed = `€${format(value)}`;
    if (limit !== null) threshold = `€${format(limit)} maximum`;
  } else if (raw.ruleCode === 'INT-M001') {
    category = 'Payments'; title = 'Payment activity needs review';
    const value = number(details.count), limit = number(details.threshold);
    const window = text(details.window, 'reported window');
    if (value !== null) observed = `${format(value)} payments / ${window}`;
    if (limit !== null) threshold = `${format(limit)} payments / ${window} maximum`;
  }
  const entity = text(details.entityName, text(raw.personaId, 'Entity not provided'));
  return {
    id: raw.alertId, title, entity, entityType: text(raw.personaType),
    severity: raw.severity === 'Critical' || raw.severity === 'Warning' ? raw.severity : 'Unknown',
    rule: raw.ruleCode, category, observed, threshold,
    summary: text(raw.summary, 'No explanation was supplied by the alert service.'),
    impact: 'Review the reported inputs and supporting evidence with the responsible risk owner. Recording a review does not resolve the issue or approve a policy exception.',
    owner: text(details.reviewOwner, 'Unassigned in backend'), detectedAt: raw.detectedAt as string,
    backendStatus: raw.status,
    evidenceRef: typeof raw.evidenceRef === 'string' ? raw.evidenceRef : undefined,
    evidence: [],
  };
}

export function normalizeReview(raw: unknown, expectedIssue: string): ConnectedReview {
  if (!object(raw) || raw.issueId !== expectedIssue || typeof raw.reviewId !== 'string' || !raw.reviewId
      || (raw.status !== 'Acknowledged' && raw.status !== 'Escalated') || typeof raw.note !== 'string'
      || [...raw.note].length > 2000 || !timestamp(raw.at) || typeof raw.reviewedBy !== 'string' || !raw.reviewedBy) {
    throw new Error('Alert service returned an invalid review record.');
  }
  return { reviewId: raw.reviewId, issueId: expectedIssue, status: raw.status, note: raw.note, at: raw.at as string, reviewedBy: raw.reviewedBy };
}

async function request(path: string, init: RequestInit = {}, fetcher: Fetcher = fetch, acceptConflict = false): Promise<unknown> {
  let response: Response;
  try { response = await fetcher(path, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error('The connected workspace could not reach its server. No demo data has been substituted.'); }
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('The workspace server returned an invalid response.'); }
  if (acceptConflict && response.status === 409 && (!object(body) || body.valid !== false)) {
    throw new Error('Audit service returned a contradictory verification result.');
  }
  if (!response.ok && !(acceptConflict && response.status === 409)) {
    throw new Error(object(body) ? text(body.error, `Workspace request failed (HTTP ${response.status}).`) : `Workspace request failed (HTTP ${response.status}).`);
  }
  return body;
}

export async function fetchReviews(id: string, fetcher: Fetcher = fetch): Promise<ConnectedReview[]> {
  const history: ConnectedReview[] = [];
  for (let page = 0; page < 20; page++) {
    const raw = await request(`/api/governance/issues/${encodeURIComponent(id)}/reviews?limit=200&offset=${page * 200}`, {}, fetcher);
    if (!Array.isArray(raw)) throw new Error('Alert service returned an invalid review history.');
    history.push(...raw.map(value => normalizeReview(value, id)));
    if (raw.length < 200) return history.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
  throw new Error('Review history exceeds 4000 entries. The complete history could not be loaded; narrow the review outside this workspace.');
}

export async function fetchWorkspace(offset = 0, fetcher: Fetcher = fetch): Promise<WorkspacePage> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid queue offset.');
  const raw = await request(`/api/governance/issues?limit=${pageSize + 1}&offset=${offset}`, {}, fetcher);
  if (!Array.isArray(raw)) throw new Error('Alert service returned an invalid queue.');
  const page = raw.slice(0, pageSize);
  const issues = page.map(normalizeAlert);
  const reviews: ConnectedReview[] = [];
  const pending = issues.map((issue, index) => ({ issue, raw: page[index] as ObjectValue }))
    .filter(({ issue }) => issue.backendStatus === 'Acknowledged' || issue.backendStatus === 'Escalated');
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (cursor < pending.length) {
      const current = pending[cursor++];
      const history = await fetchReviews(current.issue.id, fetcher);
      if (history.length) reviews.push(...history);
      else if (current.raw.status === 'Acknowledged' && timestamp(current.raw.acknowledgedAt) && typeof current.raw.acknowledgedBy === 'string') {
        // Legacy acknowledge records predate review history, but their persisted actor/time remain authoritative.
        reviews.push({ reviewId: `legacy-${current.issue.id}`, issueId: current.issue.id, status: 'Acknowledged', note: '',
          at: current.raw.acknowledgedAt as string, reviewedBy: current.raw.acknowledgedBy });
      } else throw new Error(`Review history is missing for issue ${current.issue.id}. Refresh after checking the alert service.`);
    }
  }));
  return { issues, reviews: reviews.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), hasMore: raw.length > pageSize, nextOffset: offset + page.length };
}

export async function saveReview(id: string, status: Review['status'], note: string, requestId: string, fetcher: Fetcher = fetch) {
  const raw = await request(`/api/governance/issues/${encodeURIComponent(id)}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note, requestId }),
  }, fetcher);
  if (!object(raw) || typeof raw.replayed !== 'boolean') throw new Error('The server returned an invalid review receipt. Refresh before trying again.');
  const alert = normalizeAlert(raw.alert);
  if (alert.id !== id) throw new Error('The review receipt belongs to a different issue.');
  return { review: normalizeReview(raw.review, id), alert, replayed: raw.replayed };
}

export function normalizeEvidence(raw: unknown): EvidenceResult {
  if (!object(raw) || typeof raw.available !== 'boolean' || typeof raw.ledgerRecord !== 'boolean'
      || typeof raw.message !== 'string' || (raw.available && !object(raw.entry))) throw new Error('Audit service returned an invalid evidence response.');
  const entry = object(raw.entry) ? raw.entry : null;
  const evidence: Issue['evidence'] = [];
  if (entry) {
    evidence.push({ id: text(entry.entryId), title: raw.ledgerRecord ? 'Linked audit ledger record' : 'Audit index only',
      detail: raw.message, source: 'Audit service', time: text(entry.recordedAt) });
    if (raw.ledgerRecord) {
      evidence.push({ id: `${text(entry.entryId)}-payload`, title: 'Recorded observation', detail: JSON.stringify(entry.payload, null, 2), source: 'Ledger payload', time: text(entry.recordedAt) });
      evidence.push({ id: `${text(entry.entryId)}-hash`, title: 'Recorded hash', detail: `Payload hash: ${text(entry.payloadHash)}. Previous hash: ${text(entry.previousHash, '(genesis)')}. Retrieval is not chain verification.`, source: 'Audit service', time: text(entry.recordedAt) });
    }
  }
  return { available: raw.available, ledgerRecord: raw.ledgerRecord, entry, evidence, message: raw.message };
}

export async function fetchEvidence(id: string, fetcher: Fetcher = fetch): Promise<EvidenceResult> {
  return normalizeEvidence(await request(`/api/governance/issues/${encodeURIComponent(id)}/evidence`, {}, fetcher));
}

export async function verifyLedger(fetcher: Fetcher = fetch): Promise<VerificationResult> {
  const raw = await request('/api/governance/verify', { method: 'POST' }, fetcher, true);
  if (!object(raw) || typeof raw.valid !== 'boolean' || !Number.isSafeInteger(raw.checkedCount) || (raw.checkedCount as number) < 0
      || (raw.brokenAt !== undefined && !Number.isSafeInteger(raw.brokenAt))) throw new Error('Audit service returned an invalid verification result.');
  return { valid: raw.valid, checkedCount: raw.checkedCount as number,
    ...(typeof raw.brokenAt === 'number' ? { brokenAt: raw.brokenAt } : {}),
    message: text(raw.message, 'No verification explanation provided.'), verifiedAt: new Date().toISOString() };
}
