import { error, upstream, validID } from '../../../../../lib/gateway';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return validID(id) ? upstream('alert', `/api/v1/alerts/${encodeURIComponent(id)}`) : error(400, 'BAD_REQUEST', 'Invalid issue ID.');
}
