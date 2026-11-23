'use client';

import { minutesLate, openingCash, orders, replay, times, type Frame, type Plan } from '../lib/intraday';
import type { Selection } from '../lib/northstar-case';
import { minutesBetween } from '../lib/posting-clock';
import styles from './IntradayReplay.module.css';

type Props = {
  selection: Selection;
  update: (change: Partial<Selection>) => void;
};

function money(amount: number) {
  return (amount < 0 ? '−' : '') + '$' + Math.abs(amount) + 'm';
}

function CashTrace({ frames, tick }: { frames: Frame[]; tick: number }) {
  const x = (i: number) => 8 + minutesBetween(times[0], times[i]) * 4;
  const y = (value: number) => 63 - value * 0.67;
  let path = 'M ' + x(0) + ' ' + y(openingCash);
  for (let i = 1; i <= tick; i++) path += ' H ' + x(i) + ' V ' + y(frames[i].cash);
  return <svg className={styles.trace} viewBox="0 0 320 96" aria-hidden="true" focusable="false">
    <line x1="8" y1={y(0)} x2="308" y2={y(0)} />
    <path d={path} />
    <circle cx={x(tick)} cy={y(frames[tick].cash)} r="3.5" />
  </svg>;
}

export default function IntradayReplay({ selection, update }: Props) {
  const { batch, receipt, line, tick } = selection;
  const frames = replay({ holdBatch: batch === 'reserve', delayed: receipt === 'late', line });
  const frame = frames[tick];
  const receiptTime = receipt === 'late' ? '10:05' : '09:20';
  const finished = tick === times.length - 1;
  const margin = orders[0];
  const beforeMargin = frames[margin.due - 1].headroom;

  return <div className={styles.desk}>
    <div className={styles.brief}>
      <strong>09:00 · USD settlement account</strong>
      <p>The desk opens with {money(openingCash)}. A $35m receipt expected at 09:20 {receipt === 'late' ? 'is delayed until 10:05' : 'arrives on schedule'}. Another $30m arrives at 10:15.</p>
    </div>
    <ol className={styles.deadlines} aria-label="Morning payment deadlines">
      {orders.map(order => <li key={order.id}>
        <time>{times[order.due]}</time><span>{order.name}</span><b>{money(order.amount)}</b>
      </li>)}
    </ol>

    <fieldset className={styles.decision}>
      <legend>When would you release the $30m customer batch?</legend>
      <div className={styles.choices}>
        <button type="button" aria-pressed={batch === 'release'} onClick={() => update({ batch: 'release' })}>Release at 09:10</button>
        <button type="button" aria-pressed={batch === 'reserve'} onClick={() => update({ batch: 'reserve' })}>Hold until 10:00</button>
      </div>
    </fieldset>
    <details className={styles.conditions}>
      <summary>Change receipt timing or available credit</summary>
      <div className={styles.parameters}>
        <label>$35m receipt<select value={receipt} onChange={event => update({ receipt: event.target.value === 'scheduled' ? 'scheduled' : 'late' })}>
          <option value="late">Delayed until 10:05</option><option value="scheduled">On time at 09:20</option>
        </select></label>
        <label>Secured credit line<select value={line} onChange={event => update({ line: Number(event.target.value) as Plan['line'] })}>
          <option value="0">Cash only</option><option value="20">$20m credit</option><option value="40">$40m credit</option>
        </select></label>
      </div>
      <p>The credit line ties up the same amount in collateral, even if the desk draws less.</p>
    </details>

    {batch && <div className={styles.results}>
      <div className={styles.totals} role="status">
        <h3>{frame.time} · {finished ? 'Closing position' : 'Posting window'}</h3>
        <p><strong>{frame.missed} of {orders.length} cutoffs missed</strong> · {money(frame.cash)} account balance · {money(frame.peakDraw)} peak credit drawn</p>
      </div>
      <table className={styles.register}>
        <caption>Settlement record through {frame.time}</caption>
        <thead><tr><th scope="col">Payment</th><th scope="col">Settled</th><th scope="col">Cutoff result</th></tr></thead>
        <tbody>{orders.map(order => {
          const at = frame.settledAt[order.id];
          const late = at === undefined ? tick >= order.due : at > order.due;
          let status = frame.released.includes(order.id) ? 'Waiting for funds' : 'Scheduled';
          if (at !== undefined) status = late ? minutesLate(at, order.due) + ' min late' : 'On time';
          else if (late) status = 'Cutoff missed';
          return <tr key={order.id}><th scope="row">{order.name}</th><td>{at === undefined ? 'Pending' : times[at]}</td><td className={late ? styles.late : undefined}>{status}</td></tr>;
        })}</tbody>
      </table>
      {tick >= margin.due && <p className={styles.takeaway}>
        At {times[margin.due]} the desk had {money(beforeMargin)} available for the {money(margin.amount)} margin call.
        {' '}{beforeMargin >= margin.amount ? 'The clearinghouse received its payment on time.' : 'The clearinghouse had to wait for funding.'}
        {finished && ' Try the other release time to compare.'}
      </p>}
      <div className={styles.clock}>
        <div><label htmlFor="settlement-window">Inspect a posting window <b>{frame.time}</b></label>
          <input id="settlement-window" type="range" min="0" max={times.length - 1} value={tick} aria-valuetext={frame.time} onChange={event => update({ tick: Number(event.target.value) })} />
          <div className={styles.ends}><span>09:00 opening</span><span>10:15 close</span></div>
        </div>
        <figure><figcaption>Account balance · USD</figcaption><CashTrace frames={frames} tick={tick} /><small>Dashed line marks zero.</small></figure>
      </div>
      <p className={styles.trade}>{frame.observations.join(' ') || 'No postings in this window.'}</p>
    </div>}
    <p className={styles.terms}>Replay assumptions · receipt at {receiptTime} · {line ? money(line) + ' secured line' : 'cash only'}. All cutoffs and payments are fictional.</p>
  </div>;
}
