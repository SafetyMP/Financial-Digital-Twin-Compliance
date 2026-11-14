import test from 'node:test';
import assert from 'node:assert/strict';
import { pagination, reviewRequest, sameOrigin, upstream, validID } from './gateway.ts';
const id = '79ca894e-6347-474b-b602-e864c510c8e2';
const request = (body: unknown, origin = 'http://localhost:3006') => new Request('http://localhost:3006/api/governance/issues/' + id + '/reviews', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
});

test('same-origin protection rejects foreign, missing and malformed origins', () => {
  assert.equal(sameOrigin(request({})), true);
  assert.equal(sameOrigin(request({}, 'https://attacker.example')), false);
  assert.equal(sameOrigin(request({}, 'http://localhost:3006/path')), false);
  assert.equal(sameOrigin(new Request('http://localhost:3006')), false);
});

test('only bounded pagination and UUID route identifiers are accepted', () => {
  assert.equal(pagination(new URL('http://localhost/?limit=26&offset=25')), 'limit=26&offset=25');
  for (const query of ['limit=201', 'limit=-1', 'offset=NaN', 'url=http://elsewhere', 'offset=1000001']) assert.equal(pagination(new URL(`http://localhost/?${query}`)), null);
  assert.equal(validID(id), true); assert.equal(validID('../health'), false); assert.equal(validID(''), false);
});

test('review request uses configured server actor, never accepts an actor from browser', async () => {
  const prior = process.env.GOVERNANCE_PRINCIPAL;
  process.env.GOVERNANCE_PRINCIPAL = 'test-governance-reviewer';
  try {
    const result = await reviewRequest(request({ status: 'Escalated', note: '', requestId: id }));
    assert.ok(!(result instanceof Response)); assert.equal(result.principal, 'test-governance-reviewer');
    assert.deepEqual(JSON.parse(result.body), { status: 'Escalated', note: '', requestId: id });
    const spoof = await reviewRequest(request({ status: 'Acknowledged', note: '', requestId: id, reviewedBy: 'spoofed' }));
    assert.ok(spoof instanceof Response); assert.equal(spoof.status, 400);
    const foreign = await reviewRequest(request({ status: 'Acknowledged', note: '', requestId: id }, 'https://attacker.example'));
    assert.ok(foreign instanceof Response); assert.equal(foreign.status, 403);
    delete process.env.GOVERNANCE_PRINCIPAL;
    const missing = await reviewRequest(request({ status: 'Acknowledged', note: '', requestId: id }));
    assert.ok(missing instanceof Response); assert.equal(missing.status, 503);
  } finally { if (prior === undefined) delete process.env.GOVERNANCE_PRINCIPAL; else process.env.GOVERNANCE_PRINCIPAL = prior; }
});

test('gateway forwards credentials only to alert backend and does not cache or follow redirects', async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.INTERNAL_API_TOKEN;
  process.env.INTERNAL_API_TOKEN = 'test-only-placeholder';
  try {
    globalThis.fetch = (async (_url, init) => {
      assert.equal(new Headers(init?.headers).get('X-Internal-Token'), 'test-only-placeholder');
      assert.equal(init?.cache, 'no-store'); assert.equal(init?.redirect, 'error');
      return new Response('[]');
    }) as typeof fetch;
    const response = await upstream('alert', '/api/v1/alerts');
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    globalThis.fetch = (async (_url, init) => {
      assert.equal(new Headers(init?.headers).has('X-Internal-Token'), false);
      return new Response(JSON.stringify({ valid: false, checkedCount: 0, brokenAt: 1 }), { status: 409 });
    }) as typeof fetch;
    assert.equal((await upstream('audit', '/api/v1/audit/verify')).status, 409);
  } finally { globalThis.fetch = originalFetch; if (originalToken === undefined) delete process.env.INTERNAL_API_TOKEN; else process.env.INTERNAL_API_TOKEN = originalToken; }
});

test('upstream errors are bounded and do not expose backend details', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'sensitive database detail' }), { status: 500 })) as typeof fetch;
    const response = await upstream('alert', '/api/v1/alerts');
    assert.equal(response.status, 502); assert.ok(!(await response.text()).includes('sensitive'));
    globalThis.fetch = (async () => { throw new Error('socket connection failed'); }) as typeof fetch;
    const unavailable = await upstream('alert', '/api/v1/alerts');
    assert.equal(unavailable.status, 502); assert.match(await unavailable.text(), /No sample data/);
    globalThis.fetch = (async () => new Response('invalid json')) as typeof fetch;
    assert.equal((await upstream('audit', '/api/v1/audit/entries')).status, 502);
  } finally { globalThis.fetch = originalFetch; }
});


test('upstream timeout reports a gateway timeout without a success payload', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new DOMException('test timeout', 'TimeoutError'); }) as typeof fetch;
    const response = await upstream('audit', '/api/v1/audit/verify');
    assert.equal(response.status, 504);
    const body = await response.json();
    assert.equal(body.code, 'UPSTREAM_TIMEOUT'); assert.equal(body.valid, undefined);
  } finally { globalThis.fetch = originalFetch; }
});


test('canonical workspace origin supports standalone bind addresses and ignores forwarded hosts', () => {
  const prior = process.env.GOVERNANCE_ORIGIN;
  process.env.GOVERNANCE_ORIGIN = 'http://127.0.0.1:3006';
  try {
    const internal = (origin: string) => new Request('http://0.0.0.0:3006/api/governance/verify', {
      method: 'POST', headers: { Origin: origin, 'X-Forwarded-Host': 'attacker.example', 'X-Forwarded-Proto': 'https' },
    });
    assert.equal(sameOrigin(internal('http://127.0.0.1:3006')), true);
    assert.equal(sameOrigin(internal('https://attacker.example')), false);
    assert.equal(sameOrigin(internal('http://0.0.0.0:3006')), false);
    for (const invalid of ['', 'ftp://127.0.0.1:3006', 'http://user:secret@127.0.0.1:3006',
      'http://127.0.0.1:3006/path', 'http://127.0.0.1:3006?query', 'http://127.0.0.1:3006#fragment', 'http://127.0.0.1:3006/']) {
      process.env.GOVERNANCE_ORIGIN = invalid;
      assert.equal(sameOrigin(internal('http://127.0.0.1:3006')), false);
    }
  } finally { if (prior === undefined) delete process.env.GOVERNANCE_ORIGIN; else process.env.GOVERNANCE_ORIGIN = prior; }
});
