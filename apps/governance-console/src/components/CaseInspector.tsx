'use client';

import Link from 'next/link';
import { useState } from 'react';
import { scenarioImpact } from '../lib/demo';
import { minutesLate, orders, replay, times } from '../lib/intraday';
import { liquidityHandoff, schedules } from '../lib/liquidity-handoff';
import { posting, queryFor, receiptText, type Stage } from '../lib/northstar-case';
import receipts from '../lib/northstar-receipts.json';
import { REPOSITORY_URL } from '../lib/site';
import { useNorthstarCase } from './useNorthstarCase';
import styles from './CaseInspector.module.css';

const source = REPOSITORY_URL + '/blob/main/';
const modelSource = source + 'apps/governance-console/src/lib/';
const checkerSource = source + 'jobs/compliance-cep/src/main/java/com/digitaltwin/jobs/cep/patterns/LcrChecker.java';
const stages: { key: Stage; name: string }[] = [
  { key: 'snapshot', name: 'Source snapshot' },
  { key: 'calculation', name: 'Coverage check' },
  { key: 'receipt', name: 'Receipt check' },
  { key: 'review', name: 'Review record' },
  { key: 'settlement', name: 'Settlement replay' },
];

export default function CaseInspector() {
  const { selection, update } = useNorthstarCase();
  const { stage, trial, checkpoint, period, outflows, action, batch, receipt, line, tick } = selection;
  const { recorded, available, comparable } = posting(selection);
  const result = scenarioImpact('Liquidity', outflows - 100);
  const percent = Number(result.projected.toFixed(1)) + '%';
  const handoff = action && liquidityHandoff(action, period, result.breached);
  const payload = receiptText(selection);
  const reference: Record<string, string> = receipts;
  const [checked, setChecked] = useState<{ key: string; message: string } | null>(null);
  const checkKey = queryFor(selection);
  const order = orders.find(item => item.id === selection.orderId)!;
  const frame = batch && replay({ holdBatch: batch === 'reserve', delayed: receipt === 'late', line })[tick];
  const settled = frame?.settledAt[order.id];
  const caseHref = '/' + checkKey;
  const returnHref = caseHref + (stage === 'settlement' ? '#desk-title' : '#handoff-title');

  async function verify() {
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const hex = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
      const message = hex === reference[payload]
        ? 'Match. These bytes reproduce the published fixture fingerprint.'
        : 'Mismatch. Hold this packet for investigation.';
      setChecked({ key: checkKey, message });
    } catch {
      setChecked({ key: checkKey, message: 'Checksum unavailable. Open the guide over HTTPS or localhost and try again.' });
    }
  }

  return <main className={styles.panel}>
    <header className={styles.bar}><strong>Financial Digital Twin</strong><Link href={returnHref}>← Return to selected case</Link></header>
    <article className={styles.body}>
      <p className={styles.label}>Northstar Bank · Technical guide</p>
      <h1>Liquidity evidence inspector</h1>
      <p className={styles.intro}>Follow the twin from Northstar’s reported position to the rule, the audit entry and the reviewer’s note. Inspect a step below, or trace an individual dollar payment in the separate settlement replay. All records here are synthetic.</p>

      <div className={styles.flow} role="group" aria-label="Choose an inspection">
        {stages.map(item => <button key={item.key} type="button" aria-pressed={stage === item.key} onClick={() => update({ stage: item.key })}>{item.name}</button>)}
      </div>
      <section className={styles.detail} aria-labelledby="inspection-title">
        {stage !== 'settlement' && <div className={styles.trials}>
          <label>Packet posted<select value={trial} onChange={e => { setChecked(null); update({ trial: e.target.value === 'early' ? 'early' : 'late' }); }}>
            <option value="early">09:55 · trial A</option><option value="late">10:05 · trial B</option>
          </select></label>
          <label>Review checkpoint<select value={checkpoint} onChange={e => { setChecked(null); update({ checkpoint: e.target.value === '10:10' ? '10:10' : '10:00' }); }}>
            <option>10:00</option><option>10:10</option></select></label>
        </div>}

        {stage === 'snapshot' && <>
          <h2 id="inspection-title">What could risk see at {checkpoint}?</h2>
          <ol className={styles.timeline} aria-live="polite">
            <li><time>09:42</time><div><strong>Original alert</strong><p>GOV-1042 reported 92% coverage, using €92m of liquid assets and €100m of projected outflows.</p></div></li>
            <li><time>{checkpoint}</time><div><strong>{available ? 'Source packet available' : 'Waiting for the source packet'}</strong>
              <p>{available ? `Posted at ${recorded}. The selected worksheet pairs the 14 November asset register with a €${outflows}m outflow schedule dated ${schedules[period].date}.` : `The alert identifies the case. The supporting packet arrives at ${recorded}, after this review.`}</p></div></li>
          </ol>
          <p className={styles.implementation}>The State Service groups the reported ratio, liquid assets, projected outflows and currency in one institution snapshot. It queues a versioned update for monitoring. The dates above come from Treasury’s case documents. <a href={source + 'services/state-service/internal/consumer/enrichment.go'}>Liquidity fields</a> · <a href={source + 'services/state-service/internal/store/store.go'}>Versioned update</a></p>
        </>}

        {stage === 'calculation' && <>
          <h2 id="inspection-title">Which records support the selected estimate?</h2>
          <dl className={styles.record} aria-live="polite">
            <div><dt>Selected worksheet</dt><dd>€92m ÷ €{outflows}m = <strong>{percent}</strong> over 30 days</dd></div>
            <div><dt>Support at {checkpoint}</dt><dd>{!available ? 'Await the packet before relying on the worksheet.' : comparable ? 'Both inputs are dated 14 November. Treasury can now explain the assumptions behind the estimate.' : 'The outflow schedule is a day older than the asset register. The coverage figure remains provisional.'}</dd></div>
            <div><dt>Case handoff</dt><dd>{handoff ? handoff.owner + ' · ' + handoff.task : 'Choose a follow-up at the funding meeting.'}</dd></div>
          </dl>
          <p className={styles.implementation}>The connected Flink job reads the ratio already supplied in the twin update’s <code>liquidity.lcr</code> field. Its default threshold flags values below 1.0. An independent reviewer checks whether the underlying records support that signal. <a href={checkerSource}>Flink threshold check</a></p>
        </>}

        {stage === 'receipt' && <>
          <h2 id="inspection-title">Does the packet match its published copy?</h2>
          <p>{available ? 'Calculate the SHA-256 fingerprint of the selected packet and compare it with the reference stored in the repository.' : `The source packet arrives at ${recorded}. Choose a later checkpoint to inspect its bytes.`}</p>
          <button type="button" className={styles.verify} disabled={!available} onClick={verify}>Verify fixture checksum</button>
          <p className={styles.feedback} role="status">{checked?.key === checkKey && available
            ? checked.message + (comparable ? ' Both source dates match.' : ' The source dates still differ.')
            : available ? 'Ready to check.' : 'Verification unavailable at this checkpoint.'}</p>
          {available && <details className={styles.bytes}><summary>Receipt bytes and reference digest</summary><code>{payload}</code><code>{reference[payload]}</code><a href={modelSource + 'northstar-receipts.json'}>Published fixture fingerprints</a></details>}
          <p className={styles.implementation}>In the connected system, <code>evidenceRef</code> links the alert to its ledger entry with the rule, summary and ID of the event that raised the alert. A separate chain check verifies ledger history. Treasury supplies the forecast documents used to challenge the figures. <a href={source + 'services/alert-service/internal/audit/publisher.go'}>Audit payload</a> · <a href={source + 'services/alert-service/internal/audit/recorded.go'}>Evidence link</a> · <a href={source + 'services/audit-service/internal/chain/chain.go'}>Chain check</a></p>
        </>}

        {stage === 'review' && <>
          <h2 id="inspection-title">What can the next reviewer pick up?</h2>
          <dl className={styles.record}>
            <div><dt>Original alert</dt><dd>GOV-1042 · 92% reported against a 100% monitoring line</dd></div>
            <div><dt>Working estimate</dt><dd>{percent} using €{outflows}m outflows as of {schedules[period].date} and €92m assets as of 14 November</dd></div>
            <div><dt>Evidence at {checkpoint}</dt><dd>{!available
              ? `The packet posts at ${recorded}. At this checkpoint risk can cite the alert only. The worksheet handoff below assumes the records have arrived.`
              : comparable ? 'The packet is available and both source dates match.' : 'The packet is available. Its outflow schedule predates the asset register.'}</dd></div>
            <div><dt>Worksheet handoff</dt><dd>{handoff ? <><strong>{handoff.owner}</strong> · {handoff.task}</> : <Link href={returnHref}>Choose a follow-up at the funding meeting</Link>}</dd></div>
          </dl>
          <p className={styles.implementation}>In the connected workspace a reviewer acknowledges or escalates an alert with a note. The Alert Service saves the reviewer, time, status and note in PostgreSQL and updates the alert in the same transaction. The next reviewer can reopen that history. The named follow-up above is part of the case exercise. <a href={source + 'services/alert-service/internal/store/reviews.go'}>Review transaction and history</a></p>
        </>}

        {stage === 'settlement' && <>
          <h2 id="inspection-title">How does the desk model a cutoff?</h2>
          <p>At each clock tick the replay posts receipts, releases instructions and checks whether cash plus the chosen credit line covers each payment. It retains the settlement time so risk can reconstruct a missed cutoff.</p>
          {frame ? <>
            <label className={styles.order}>Trace an instruction<select value={order.id} onChange={event => update({ orderId: event.target.value as typeof order.id })}>
              {orders.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select></label>
            <dl className={styles.record} aria-live="polite">
              <div><dt>Your desk plan</dt><dd>{batch === 'reserve' ? 'Hold batch until due' : 'Release batch early'} · {receipt === 'late' ? '10:05' : '09:20'} receipt · ${line}m line</dd></div>
              <div><dt>{order.source}</dt><dd>${order.amount}m due at {times[order.due]}</dd></div>
              <div><dt>State at {frame.time}</dt><dd>{settled !== undefined
                ? `Settled at ${times[settled]} · ${settled > order.due ? minutesLate(settled, order.due) + ' minutes late' : 'on time'}.`
                : !frame.released.includes(order.id) ? 'Instruction awaiting release.' : tick >= order.due ? 'Cutoff missed. Instruction still waiting for funds.' : 'Instruction released and waiting for funds.'}</dd></div>
            </dl>
          </> : <p className={styles.feedback}>Choose a batch instruction at the treasury desk to inspect its settlement record here.</p>}
          <p className={styles.implementation}>This browser model follows individual USD payments across eight timestamps. The 30-day EUR coverage calculation uses a separate dataset. <a href={modelSource + 'intraday.ts'}>Replay algorithm</a> · <a href={modelSource + 'intraday.test.ts'}>Cutoff tests</a></p>
        </>}
      </section>
      <div className={styles.bottom}><Link href={returnHref}>{stage === 'settlement' ? 'Return to the treasury desk' : 'Return to the funding meeting'}</Link><a href={'./' + checkKey}>Permalink to this inspection</a></div>
      <details className={styles.reference}><summary>Reproduce the checks</summary>
        <p>Run <code>npm test --prefix apps/governance-console</code> for the browser model and published receipts. <a href={modelSource + 'northstar-case.test.ts'}>Packet and checkpoint tests</a> · <a href={source + 'docs/governance-integration.md'}>Connected verification guide</a></p>
      </details>
    </article>
  </main>;
}
