import type { Metadata } from 'next';
import CaseInspector from '../../components/CaseInspector';
import { DEMO_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'GOV-1042 evidence inspector | Financial Digital Twin',
  description: 'Replay the Northstar 30-day review against two source-packet posting trials.',
  alternates: { canonical: DEMO_URL + 'workspace/' },
};
export default function Page() { return <CaseInspector />; }
