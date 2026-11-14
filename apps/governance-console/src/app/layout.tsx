import type { Metadata } from 'next';
import { DEMO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, structuredData } from '../lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(DEMO_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: DEMO_URL,
    types: { 'text/plain': `${DEMO_URL}llms.txt` },
  },
  robots: { index: true, follow: true },
  icons: { icon: { url: `${DEMO_URL}favicon.svg`, type: 'image/svg+xml' } },
  openGraph: {
    type: 'website',
    url: DEMO_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
    images: [{ url: `${DEMO_URL}social-card.png`, width: 1200, height: 630, alt: 'Financial Digital Twin — Governance workspace. Understand issues, follow evidence, and record reviews. Synthetic demo.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${DEMO_URL}social-card.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="sitemap" type="application/xml" href={`${DEMO_URL}sitemap.xml`} /></head><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />{children}</body></html>;
}
