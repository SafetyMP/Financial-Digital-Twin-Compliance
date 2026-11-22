'use client';
import { useState } from 'react';
import Link from 'next/link';
import { scenarioImpact } from '../lib/demo';
import { liquidityHandoff, schedules } from '../lib/liquidity-handoff';
import { posting, queryFor, receiptText, type Stage } from '../lib/northstar-case';
import receipts from '../lib/northstar-receipts.json';
import { REPOSITORY_URL } from '../lib/site';
import { useNorthstarCase } from './useNorthstarCase';
import styles from './CaseInspector.module.css';

const source = REPOSITORY_URL + '/blob/main/';
const trialSource = REPOSITORY_URL + '/blob/49f5ed37c974477cb1f81fffd87ee78d752b29ca/apps/governance-console/src/lib/';
const stages: { key: Stage; name: string }[] = [
  {key: 'snapshot', name: 'Source snapshot'}, {key: 'calculation', name: 'Coverage check'}, {key: 'receipt', name: 'Receipt check'},
];

export default function CaseInspector() {
  const { selection, update } = useNorthstarCase();
  const { stage, trial, checkpoint, period, outflows, action } = selection;
  const { recorded, available, comparable, age } = posting(selection);
  const result = scenarioImpact('Liquidity', outflows - 100);
  const handoff = action && liquidityHandoff(action, period, result.breached);
  const payload = receiptText(selection);
  const reference: Record<string,string> = receipts;
  const [checked, setChecked] = useState<{ key: string; message: string } | null>(null);
  const checkKey = queryFor(selection);
  const percent = Number(result.projected.toFixed(1)) + '%';
  async function verify() {
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const hex = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
      const message = hex === reference[payload] ? 'Match. This packet reproduces the published SHA-256 fingerprint.' : 'Mismatch. Hold the evidence for investigation.';
      setChecked({key:checkKey, message});
    } catch { setChecked({key:checkKey, message:'Digest unavailable. Open this inspector over HTTPS or localhost to check the fixture.'}); }
  }
  const returnHref = '/' + queryFor(selection) + '#handoff-title';
  return <main className={styles.panel}>
    <header className={styles.bar}><strong>Financial Digital Twin</strong><Link href={returnHref}>← Return to selected case</Link></header>
    <article className={styles.body}>
      <p className={styles.label}>Northstar Bank / GOV-1042</p><h1>Liquidity evidence inspector</h1>
      <p>Follow your €{outflows}m estimate through the funding review. The 30-day projection uses the selected Treasury records. The posting clock measures when a reviewer could inspect them.</p>
      <div className={styles.flow} aria-label="Evidence stages">{stages.map((v,i) =>
        <button key={v.key} type="button" aria-pressed={stage === v.key} onClick={() => update({stage:v.key})}><small>0{i+1}</small>{v.name}</button>)}</div>
      <div className={styles.trials}>
        <label>Evidence trial<select value={trial} onChange={e => { setChecked(null); update({trial: e.target.value === 'early' ? 'early' : 'late'}); }}>
          <option value="early">Trial A · packet posted 09:55</option><option value="late">Trial B · packet posted 10:05</option>
        </select></label>
        <label>Review checkpoint<select value={checkpoint} onChange={e => { setChecked(null); update({checkpoint: e.target.value === '10:10' ? '10:10' : '10:00'}); }}>
          <option>10:00</option><option>10:10</option></select></label>
      </div>
      <section className={styles.detail} aria-live="polite" aria-atomic="true">
        {stage === 'snapshot' && <>
          <h2>Which record had arrived?</h2>
          <dl><div><dt>09:42 · original alert</dt><dd>€92m assets / €100m 30-day outflows · 92%</dd></div>
          <div><dt>14 Nov · asset register</dt><dd>€92m in the selected case</dd></div>
          <div><dt>{checkpoint} · source snapshot</dt><dd>{available ? 'Packet accessible · €' + outflows + 'm schedule dated ' + schedules[period].date + '. Posted ' + age + ' minutes before this checkpoint.' : 'Only the case locator is available. The packet posts ' + Math.abs(age) + ' minutes after this checkpoint.'}</dd></div></dl>
          <p>These synthetic posting trials reconstruct when the selected packet becomes visible. <a href={source+'apps/governance-console/src/lib/demo.ts'}>Original alert fixture</a></p>
        </>}
        {stage === 'calculation' && <>
          <h2>Can risk reproduce the calculation?</h2>
          <dl><div><dt>Worksheet estimate</dt><dd>€92m / €{outflows}m = {percent} over 30 days</dd></div>
          <div><dt>Evidence at {checkpoint}</dt><dd>{!available ? 'Await the schedule. The worksheet inputs cannot yet be checked against the packet.' : comparable ? 'Matched 14 November records. The two inputs support a like-for-like calculation.' : 'The 13 November schedule predates the 14 November assets. Keep the result provisional.'}</dd></div>
          <div><dt>Selected review action</dt><dd>{handoff ? handoff.owner + ' · ' + handoff.task : 'No handoff selected in the business case.'}</dd></div></dl>
          <p>The fixture compares the unrounded ratio with 100%. Even with matching dates, Treasury owns the assumptions behind the estimate. <a href={source+'apps/governance-console/src/lib/demo.test.ts'}>Scenario model tests</a></p>
        </>}
        {stage === 'receipt' && <>
          <h2>Can the packet be checked?</h2>
          <p>{available ? 'The selected fixture is available. Recompute the fingerprint of these exact bytes in your browser.' : 'The case locator identifies GOV-1042, but the packet has not posted. A locator alone cannot reproduce the receipt.'}</p>
          {available && <details><summary>Receipt bytes and reference digest</summary><code>{payload}</code><code>{reference[payload]}</code><a href={trialSource+'northstar-receipts.json'}>Published fixture fingerprints</a></details>}
          <button className={styles.verify} disabled={!available} type="button" onClick={verify}>Verify fixture checksum</button>
          <p role="status">{checked?.key === checkKey && available ? checked.message + (comparable ? ' Both records carry 14 November.' : ' The source dates still differ.') : available ? 'Checksum awaiting verification.' : 'Verification unavailable at this checkpoint.'}</p>
          <p>The browser checks fixture integrity. Connected ledger-chain verification is a separate service operation. <a href={source+'services/audit-service/internal/chain/chain.go'}>Chain implementation</a> · <a href={source+'services/audit-service/internal/api/handlers.go'}>Evidence retrieval and verification</a></p>
        </>}
      </section>
      <div className={styles.bottom}><Link href={returnHref}>Return to the funding meeting</Link><a href={'./' + queryFor(selection)}>Permalink to this inspection</a></div>
      <details><summary>Connected components and reproduction</summary>
        <p>The <a href={REPOSITORY_URL+'/tree/main/jobs/compliance-cep'}>Flink job</a> processes Kafka records. In the connected workspace, the alert service stores review actions in PostgreSQL and the audit service requests ledger evidence. The browser issues no service requests.</p>
        <p>Run <code>npm test --prefix apps/governance-console</code> for the <a href={trialSource+'northstar-case.test.ts'}>case and receipt tests</a>. <a href={source+'docs/governance-integration.md'}>Connected integration and verification guide</a></p>
      </details>
    </article>
  </main>;
}
