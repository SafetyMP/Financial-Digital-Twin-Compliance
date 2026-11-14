import type { MetadataRoute } from 'next';
import { DEMO_URL } from '../lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: DEMO_URL }];
}
