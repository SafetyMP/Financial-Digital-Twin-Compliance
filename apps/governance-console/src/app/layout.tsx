import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Financial Digital Twin · Governance workspace',
  description: 'Explore a synthetic financial governance review: understand an issue, inspect its evidence, and record a review.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
