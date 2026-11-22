'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { minutesLate, orders, replay, times, type Frame, type Plan } from '../lib/intraday';
import styles from './LiquidityCase.module.css';

const startingPlan: Plan = { delayed: false, holdBatch: false, line: 0 };
const key = 'northstar-settlement-brief-v1';
const money = (x: number) => (x < 0 ? '−' : '') + '$' + Math.abs(x) + 'm';
const monitoring = 'https://www.bis.org/committees/bcbs/basel-framework/standard/srp/50/inforce/2019-12-15/published/2019-12-15';

function timePosition(tick: number) {
  const time = times[tick];
  return (Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) - 540) / 75;
}

function PositionChart({ frames, tick }: { frames: Frame[]; tick: number }) {
  const x = (i: number) => 42 + timePosition(i) * 650;
  const y = (cash: number) => 24 + (90 - cash) * 1.12;
  const trace = frames.slice(0, tick + 1).reduce((d, f, i) =>
    i === 0 ? 'M ' + x(i) + ' ' + y(f.cash) : d + ' H ' + x(i) + ' V ' + y(f.cash), '');
  return <figure className={styles.chart}>
    <figcaption><strong>Settlement account</strong><span>USD millions · after each posting window</span></figcaption>
    <svg viewBox="0 0 728 213" role="img" aria-label={'Cash trace through ' + times[tick] + ', ending at ' + money(frames[tick].cash)}>
      {[-40, 0, 40, 80].map(v => <g key={v}><line className={v === 0 ? styles.zero : styles.grid} x1="42" x2="692" y1={y(v)} y2={y(v)} /><text x="30" y={y(v) + 4} textAnchor="end">{v}</text></g>)}
      <path className={styles.trace} d={trace} /><circle cx={x(tick)} cy={y(frames[tick].cash)} r="5" />
      {[0, 3, 5, 7].map(i => <text key={i} x={x(i)} y="203" textAnchor="middle">{times[i]}</text>)}
    </svg>
  </figure>;
}

export default function LiquidityCase() {
  const [plan, setPlan] = useState<Plan>(startingPlan);
  const [tick, setTick] = useState(0);
  const [saved, setSaved] = useState('');
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { setSaved(localStorage.getItem(key) || ''); } catch { setStorageError(true); }
  }, []);
  const frames = replay(plan);
  const frame = frames[tick];
  const final = tick === times.length - 1;
  function revise(next: Plan) { setPlan(next); setTick(0); }
  function save() {
    const timing = plan.delayed ? '10:05' : '09:20';
    const settlements = orders.map(o => o.name + ' ' + times[frame.settledAt[o.id]!]).join(', ');
    const brief = 'Receipt RC-35 posted at ' + timing + '. Customer batch released at ' +
      (plan.holdBatch ? '10:00' : '09:10') + '. ' + money(plan.line) + ' collateral pledged, ' +
      money(frame.peakDraw) + ' peak credit drawn. Late obligations: ' + frame.missed + ' of 3. ' + settlements + '.';
    setSaved(brief);
    try { localStorage.setItem(key, brief); } catch { setStorageError(true); }
  }
  return <main className={styles.desk}>
    <header className={styles.bar}><strong>Financial Digital Twin</strong><Link href="/workspace/">Technical reference ↗</Link></header>
    <div className={styles.inner}>
      <div className={styles.hero}><div><p className={styles.label}>Northstar Bank / Treasury operations</p>
        <h1>Intraday liquidity desk</h1><p>Three payment cutoffs. One incoming transfer. Work the settlement clock with Payments Operations, then give independent risk a record of where cash ran short.</p></div>
        <div className={styles.clock}><span>Settlement clock</span><b>{frame.time}</b><small>Synthetic morning · USD</small></div>
      </div>
      <div className={styles.console}>
        <aside className={styles.sidebar} aria-label="Morning instructions">
          <h2>Morning instructions</h2><p>Opening cash is $50m. A correspondent expects to send $35m at 09:20. A separate $30m receipt posts at 10:15.</p>
          <label>Correspondent receipt<select value={plan.delayed ? 'late' : 'expected'} onChange={e => revise({...plan, delayed: e.target.value === 'late'})}>
            <option value="expected">On schedule · 09:20</option><option value="late">Delayed · 10:05</option></select></label>
          <label>Customer batch release<select value={plan.holdBatch ? 'cutoff' : 'early'} onChange={e => revise({...plan, holdBatch: e.target.value === 'cutoff'})}>
            <option value="early">Early window · 09:10</option><option value="cutoff">At cutoff · 10:00</option></select></label>
          <label>Secured credit limit<select value={plan.line} onChange={e => revise({...plan, line: Number(e.target.value) as Plan['line']})}>
            <option value="0">$0m · cash only</option><option value="20">$20m collateral pledged</option><option value="40">$40m collateral pledged</option></select></label>
          <details><summary>Posting rules</summary><p>Changing an instruction rewinds the clock. Each window posts incoming cash first, then attempts margin, securities and the customer batch, in that order. Unfunded payments wait for a later window. Negative cash uses the line, secured dollar for dollar in this exercise.</p></details>
        </aside>
        <section className={styles.monitor} aria-label="Settlement monitor">
          <div className={styles.metrics} aria-live="polite" aria-atomic="true">
            <div><span>Account cash</span><b>{money(frame.cash)}</b></div><div><span>Settlement headroom¹</span><b>{money(frame.headroom)}</b></div><div><span>Cutoffs missed</span><b>{frame.missed} <small>/ 3</small></b></div>
          </div>
          <PositionChart frames={frames} tick={tick} />
          <p className={styles.footnote}>¹ Remaining spending capacity equals the signed cash position plus the secured credit limit.</p>
          <div className={styles.playback}><button type="button" onClick={() => setTick(tick - 1)} disabled={tick === 0}>← Back</button>
            {final ? <button type="button" onClick={() => setTick(0)}>Replay morning ↺</button> :
            <button type="button" onClick={() => setTick(tick + 1)}>Advance to {times[tick + 1]} →</button>}
          </div>
        </section>
      </div>
      <section className={styles.ledger} aria-labelledby="register-heading">
        <div><p className={styles.label}>Payments operations</p><h2 id="register-heading">Settlement register</h2></div>
        <div className={styles.orders}>{orders.map(o => {
          const at = frame.settledAt[o.id];
          const late = at === undefined ? tick >= o.due : at > o.due;
          let status = 'Scheduled';
          if (at !== undefined) status = 'Settled ' + times[at] + (late ? ' · ' + minutesLate(at, o.due) + ' min late' : ' · on time');
          else if (frame.released.includes(o.id)) status = late ? 'Cutoff missed · queued' : 'Awaiting funds';
          return <article key={o.id}><small>{o.source}</small><h3>{o.name}</h3><p>{money(o.amount)} <span>due {times[o.due]}</span></p><strong className={late ? styles.late : ''}>{status}</strong></article>;
        })}</div>
        <details className={styles.tape}><summary>Posting tape through {frame.time}</summary>
          <ol>{frames.slice(0,tick+1).map(f => <li key={f.time}><b>{f.time}</b><span>{f.observations.join(' ') || 'No new posting.'}</span><em>{money(f.cash)}</em></li>)}</ol>
        </details>
      </section>
      <section className={styles.brief}><div><p className={styles.label}>Independent risk</p><h2>Shift handoff</h2>
        <p>{final ? 'Keep this run as your comparison. Change the receipt timing or credit instruction and replay to challenge the original plan.' : 'Work through the final posting to capture peak credit use, actual settlement times and missed cutoffs.'}</p>
        <button type="button" disabled={!final} onClick={save}>{saved ? 'Replace saved handoff' : 'Save this handoff'}</button></div>
        <div className={styles.note} role="status"><strong>Saved comparison</strong><p>{saved || 'No completed run saved.'}</p>{storageError && <small>Browser storage is unavailable. This handoff lasts for this visit.</small>}</div>
      </section>
      <footer className={styles.footer}><p>All financial data is synthetic. The projection runs in this browser. Payment orders, cutoffs and collateral terms are fictional.</p>
        <p>Case basis · <a href={monitoring}>Basel intraday measures</a> · <a href="https://www.frbservices.org/financial-services/accounting/account-management-information/">Federal Reserve account monitoring</a></p></footer>
    </div>
  </main>;
}
