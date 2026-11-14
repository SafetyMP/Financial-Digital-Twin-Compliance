import { error, pagination, reviewRequest, upstream, validID } from '../../../../../../lib/gateway';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!validID(id)) return error(400, 'BAD_REQUEST', 'Invalid issue ID.');
  const query = pagination(new URL(request.url), '200');
  return query === null ? error(400, 'BAD_REQUEST', 'Use a valid review-history limit and offset.') : upstream('alert', `/api/v1/alerts/${encodeURIComponent(id)}/reviews?${query}`);
}
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!validID(id)) return error(400, 'BAD_REQUEST', 'Invalid issue ID.');
  const validated = await reviewRequest(request);
  if (validated instanceof Response) return validated;
  return upstream('alert', `/api/v1/alerts/${encodeURIComponent(id)}/reviews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Principal': validated.principal }, body: validated.body,
  });
}
