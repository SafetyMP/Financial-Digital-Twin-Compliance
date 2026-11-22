import type { Metadata } from 'next';
import Link from 'next/link';
import Workspace from '../../components/Workspace';
import styles from '../../components/LiquidityCase.module.css';
import { DEMO_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Review queue | Financial Digital Twin',
  alternates: { canonical: DEMO_URL + 'workspace/' },
};

export default function Page() {
  return <>
    <div className={styles.returnBar}><Link href="/">Return to the Northstar liquidity case</Link></div>
    <Workspace />
  </>;
}
