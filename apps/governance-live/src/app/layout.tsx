import type { Metadata } from 'next';
import '../../../governance-console/src/app/globals.css';

export const metadata: Metadata = {
  title: 'Financial Digital Twin · Connected governance',
  description: 'Development governance workspace for reviewing financial alerts, linked audit evidence, and persisted review notes.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
