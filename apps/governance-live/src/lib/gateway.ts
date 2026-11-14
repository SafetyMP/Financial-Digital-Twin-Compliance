/** Server-only gateway. Never import this file into a client component. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
export const error = (status: number, code: string, message: string) => json({ code, error: message }, status);
export const validID = (id: string) => UUID.test(id);

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    // Standalone Next may use its internal bind address in request.url. A server-owned
    // canonical origin keeps browser checks correct without trusting forwarded headers.
    const configured = process.env.GOVERNANCE_ORIGIN;
    const expected = configured === undefined ? new URL(request.url).origin : configured;
    const canonical = new URL(expected);
    if (!['http:', 'https:'].includes(canonical.protocol) || canonical.username || canonical.password
        || canonical.search || canonical.hash || expected !== canonical.origin) return false;
    const supplied = new URL(origin);
    return origin === supplied.origin && supplied.origin === canonical.origin;
  } catch { return false; }
}

export function pagination(url: URL, defaultLimit = '26'): string | null {
  for (const key of url.searchParams.keys()) if (key !== 'limit' && key !== 'offset') return null;
  const limit = url.searchParams.get('limit') || defaultLimit;
  const offset = url.searchParams.get('offset') || '0';
  if (!/^\d+$/.test(limit) || !/^\d+$/.test(offset)) return null;
  const n = Number(limit), start = Number(offset);
  if (!Number.isSafeInteger(n) || n < 1 || n > 200 || !Number.isSafeInteger(start) || start < 0 || start > 1000000) return null;
  return `limit=${n}&offset=${start}`;
}

type Service = 'alert' | 'audit';
export async function upstream(service: Service, path: string, init: RequestInit = {}): Promise<Response> {
  const configured = service === 'alert' ? process.env.ALERT_SERVICE_URL : process.env.AUDIT_SERVICE_URL;
  const base = configured || (service === 'alert' ? 'http://127.0.0.1:8085' : 'http://127.0.0.1:8090');
  try {
    const origin = new URL(base);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash) {
      return error(503, 'CONFIGURATION', 'Backend service URL is not configured correctly.');
    }
    const target = `${base.replace(/\/$/, '')}${path}`;
    const serviceHeaders = new Headers(init.headers);
    serviceHeaders.set('Accept', 'application/json');
    if (service === 'alert' && process.env.INTERNAL_API_TOKEN) serviceHeaders.set('X-Internal-Token', process.env.INTERNAL_API_TOKEN);
    const response = await fetch(target, { ...init, headers: serviceHeaders, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    const text = await response.text();
    if (text.length > 5_000_000) return error(502, 'UPSTREAM_FORMAT', 'Backend response was too large.');
    let body: unknown;
    try { body = JSON.parse(text); } catch { return error(502, 'UPSTREAM_FORMAT', 'Backend returned an invalid response.'); }
    // Preserve a genuine chain failure result instead of converting it to success.
    if (service === 'audit' && path === '/api/v1/audit/verify' && response.status === 409) return json(body, 409);
    if (!response.ok) return error(response.status >= 400 && response.status < 500 ? response.status : 502,
      'UPSTREAM_ERROR', `${service === 'alert' ? 'Alert' : 'Audit'} service request failed (HTTP ${response.status}).`);
    return json(body, response.status);
  } catch (failure) {
    const timedOut = failure instanceof Error && (failure.name === 'TimeoutError' || failure.name === 'AbortError');
    return error(timedOut ? 504 : 502, timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      `${service === 'alert' ? 'Alert' : 'Audit'} service ${timedOut ? 'timed out' : 'is unavailable'}. No sample data has been substituted.`);
  }
}

export async function reviewRequest(request: Request): Promise<{ body: string; principal: string } | Response> {
  if (!sameOrigin(request)) return error(403, 'ORIGIN_REQUIRED', 'Review requests must come from this workspace.');
  const principal = process.env.GOVERNANCE_PRINCIPAL?.trim();
  if (!principal || principal.length > 200) return error(503, 'REVIEWER_NOT_CONFIGURED', 'A server-side development reviewer must be configured before recording reviews.');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return error(415, 'CONTENT_TYPE', 'Send a JSON review.');
  const text = await request.text();
  if (text.length > 16000) return error(413, 'BODY_TOO_LARGE', 'Review request is too large.');
  let value: Record<string, unknown>;
  try { value = JSON.parse(text); } catch { return error(400, 'BAD_REQUEST', 'Review request must be valid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['status', 'note', 'requestId'].includes(key))
      || !['Acknowledged', 'Escalated'].includes(value.status as string)
      || typeof value.note !== 'string' || [...value.note].length > 2000
      || typeof value.requestId !== 'string' || !validID(value.requestId)) {
    return error(400, 'BAD_REQUEST', 'Provide an acknowledgement or escalation, a note of at most 2000 characters, and a request ID.');
  }
  return { body: JSON.stringify(value), principal };
}
