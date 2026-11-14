import { error, sameOrigin, upstream } from '../../../../lib/gateway';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error(403, 'ORIGIN_REQUIRED', 'Verification must be requested from this workspace.');
  return upstream('audit', '/api/v1/audit/verify');
}
