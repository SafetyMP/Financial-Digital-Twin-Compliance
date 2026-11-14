import type { Metadata } from 'next';
import '../../../governance-console/src/app/globals.css';

export const metadata: Metadata = {
  title: 'Financial Digital Twin · Connected governance',
  description: 'Review backend alerts, inspect their audit evidence, and record durable governance decisions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
