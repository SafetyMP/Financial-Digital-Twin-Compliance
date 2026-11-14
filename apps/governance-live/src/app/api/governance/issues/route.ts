import { error, pagination, upstream } from '../../../../lib/gateway';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = pagination(new URL(request.url));
  return query === null ? error(400, 'BAD_REQUEST', 'Use a valid limit (1–200) and offset.') : upstream('alert', `/api/v1/alerts?${query}`);
}
