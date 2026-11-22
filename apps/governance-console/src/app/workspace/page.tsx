import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../../components/LiquidityCase.module.css';
import { DEMO_URL, REPOSITORY_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Technical reference | Financial Digital Twin',
  alternates: { canonical: DEMO_URL + 'workspace/' },
};

const source = REPOSITORY_URL + '/tree/main/';
export default function Page() {
  return <main className={styles.desk}>
    <header className={styles.bar}><strong>Financial Digital Twin</strong><Link href="/">Return to liquidity desk</Link></header>
    <section className={styles.technical}>
      <p className={styles.label}>Engineering reference</p><h1>How the twin works</h1>
      <p>The public desk replays a fictional USD account in the browser. The separate connected development stack follows a financial alert from ingestion through review.</p>
      <dl>
        <div><dt>Public replay</dt><dd><a href={REPOSITORY_URL + '/blob/main/apps/governance-console/src/lib/intraday.ts'}>TypeScript settlement model</a> steps through receipts, credit limits and payment cutoffs. One saved handoff lives in browser storage.</dd></div>
        <div><dt>Monitoring</dt><dd>Mock banking changes travel through Debezium, Kafka and a <a href={source + 'jobs/compliance-cep'}>per-record Flink job</a> to the policy and alert services.</dd></div>
        <div><dt>Review history</dt><dd><a href={source + 'apps/governance-live'}>Next.js server routes</a> call the alert service. PostgreSQL stores review actions with a configured development reviewer.</dd></div>
        <div><dt>Audit evidence</dt><dd>The <a href={source + 'services/audit-service'}>audit service</a> retrieves linked entries and separately verifies the immudb chain. Index fallback and review history have distinct provenance.</dd></div>
      </dl>
      <a href={REPOSITORY_URL + '/blob/main/docs/governance-integration.md'}>Run the connected workspace</a> · <a href={source + 'scripts/governance-e2e'}>Inspect its integration tests</a>
    </section>
  </main>;
}
