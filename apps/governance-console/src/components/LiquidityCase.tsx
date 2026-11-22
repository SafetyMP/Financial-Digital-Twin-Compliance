'use client';

import Link from 'next/link';
import { issues, scenarioImpact } from '../lib/demo';
import { liquidityHandoff, schedules } from '../lib/liquidity-handoff';
import { options, queryFor, type Sponsor } from '../lib/northstar-case';
import { useNorthstarCase } from './useNorthstarCase';
import IntradayReplay from './IntradayReplay';
import styles from './LiquidityCase.module.css';

const issue = issues.find((item) => item.id === 'GOV-1042')!;
const euros = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export default function LiquidityCase() {
  const { selection, update } = useNorthstarCase();
  const { outflows: amount, period, action, reviews, minutes, sponsor } = selection;
  const inspector = '/workspace/' + queryFor(selection);
  const outflowGap = amount - 92;
  const result = scenarioImpact('Liquidity', amount - 100);
  const handoff = action && liquidityHandoff(action, period, result.breached);
  const yearCost = 12000;
  const hourlyCost = 60;
  const annualReviews = reviews * 12;
  const capacity = annualReviews * minutes / 60 * hourlyCost;
  const breakEven = yearCost / (annualReviews * hourlyCost) * 60;
  const chartMax = Math.max(yearCost, capacity);

  const deskInspector = '/workspace/' + queryFor({...selection, stage: 'settlement'});
  const riskInspector = '/workspace/' + queryFor({...selection, stage: 'snapshot'});

  return <main className={styles.case}>
    <header className={styles.mast}>
      <strong>Financial Digital Twin</strong><Link href={inspector}>Technical guide</Link>
    </header>
    <section className={styles.lead} aria-labelledby="case-title">
      <div>
        <p className={styles.eyebrow}>Northstar Bank · Treasury briefing</p>
        <h1 id="case-title">Before the funding meeting</h1>
        <p>Northstar moves money for customers and settles trades for investors. Each morning, Treasury sets cash aside for payments due that day. Independent risk looks further ahead, asking whether the bank could cover a month of withdrawals under stress.</p>
        <p>Today, the payments desk is relying on a transfer that has yet to arrive. The meeting pack also quotes a liquidity figure without saying whether its inputs describe the same day. A late payment leaves someone waiting for cash. An unexplained alert leaves the funding lead deciding whether to raise money on a figure the team still needs to check.</p>
        <p className={styles.provenance}>All financial data is synthetic. You can replay every choice.</p>
      </div>
      <figure className={styles.brief}>
        <figcaption>How the financial digital twin helps</figcaption>
        <p className={styles.definition}>The twin keeps the latest version of the liquidity figures Northstar reports. Each alert preserves the reading that triggered it.</p>
        <dl>
          <div><dt>Capture the position <small>Treasury</small></dt><dd>Keep the reported assets, outflows and coverage ratio together as the bank’s figures change.</dd></div>
          <div><dt>Flag the observation <small>Monitoring</small></dt><dd>When the reported ratio falls below the rule’s threshold, an alert identifies the bank, the reading and the rule.</dd></div>
          <div><dt>Carry the review forward <small>Independent risk</small></dt><dd>Open the alert’s audit record, challenge the figures against Treasury’s sources and leave a note the next reviewer can revisit.</dd></div>
        </dl>
      </figure>
    </section>
    <section className={styles.section} aria-labelledby="desk-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Payments desk · US dollars</p>
        <h2 id="desk-title">Who gets paid on time?</h2>
        <p>The customer payment file is ready early. A clearinghouse will soon collect cash to cover Northstar’s open trades. Both need dollars from the same account. Rehearse a release instruction in the browser model. It records when each payment settles so you can explain the outcome to the funding lead.</p>
      </div>
      <div className={styles.desk}>
        <IntradayReplay selection={selection} update={update} />
        {selection.batch && <p><Link className={styles.textLink} href={deskInspector}>Trace this payment plan in the technical guide</Link></p>}
      </div>
    </section>
    <section className={styles.section} aria-labelledby="scenario-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Independent risk · Euros</p>
        <h2 id="scenario-title">What is behind Northstar’s liquidity alert?</h2>
        <p>The funding meeting has a second question. The bank monitors the liquid assets it can draw on during 30 days of stress. Treasury reported €92m against €100m of expected net cash outflows. That triggered alert {issue.id}.</p>
        <p>The twin retains the reported reading. You can change the outflow assumption on the worksheet and see how much of the concern depends on that estimate.</p>
      </div>
      <div className={styles.scenario}>
        <fieldset><legend>Which outflow estimate will you test?</legend><div className={styles.choices}>
          {options.map((option) => <label key={option.amount} className={option.amount === amount ? styles.chosen : ''}>
            <input type="radio" name="outflows" checked={option.amount === amount} onChange={() => update({outflows: option.amount, action: null})} />
            <span><strong>€{option.amount}m</strong><small>{option.label}</small></span>
          </label>)}
        </div></fieldset>
        <figure className={styles.coverage}>
          <figcaption>Assets available vs. projected outflows</figcaption>
          <div className={styles.barLabel}><span>Liquid assets</span><b>€92m</b></div>
          <div className={styles.track} aria-hidden="true"><span style={{width: (92/110 * 100) + '%'}} /></div>
          <div className={styles.barLabel}><span>30-day outflows</span><b>€{amount}m</b></div>
          <div className={styles.track} aria-hidden="true"><span className={styles.valueBar} style={{width: (amount/110 * 100) + '%'}} /></div>
        </figure>
        <p className={styles.original}><strong>Original alert · {issue.id}</strong><span>{issue.observed} reported · {issue.threshold}</span></p>
        <div className={styles.result} aria-live="polite" aria-atomic="true">
          <strong>{Number(result.projected.toFixed(1))}%</strong>
          <p><b>Your worksheet coverage</b><br/>{outflowGap === 0 ? 'Assets just cover the estimate at the 100% monitoring line.' : `The estimate exceeds assets by €${outflowGap}m, putting coverage below the 100% monitoring line.`}</p>
        </div>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="handoff-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Funding meeting · {issue.id}</p>
        <h2 id="handoff-title">What can you put on the record?</h2>
        <p>The audit entry tells risk which observation raised the alert. Treasury supplies a dated asset register and a separate outflow schedule to substantiate it. Your note gives the funding lead a reason to act or a question to send back.</p>
        <p>Compare the two source dates. Choose what you would pass to the next person, then try the other schedule to see how the handoff changes.</p>
      </div>
      <div className={styles.handoff}>
        <dl className={styles.sourceCard}><dt>Treasury asset register</dt>
          <dd>€92m liquid assets <span>As of 14 November</span></dd>
        </dl>
        <label htmlFor="schedule-date">Outflow schedule for your €{amount}m estimate</label>
        <select id="schedule-date" value={period} onChange={event => {
          update({period: event.target.value === 'matched' ? 'matched' : 'prior', action: null});
        }}>
          <option value="prior">As of {schedules.prior.date}</option>
          <option value="matched">As of {schedules.matched.date}</option>
        </select>
        <fieldset><legend>What is your next step?</legend>
          <div className={styles.actions}>
            <button type="button" aria-pressed={action === 'request'} onClick={() => update({action: 'request'})}>Request source evidence</button>
            <button type="button" aria-pressed={action === 'document'} onClick={() => update({action: 'document'})}>Document review</button>
            <button type="button" aria-pressed={action === 'escalate'} onClick={() => update({action: 'escalate'})}>Escalate for assessment</button>
          </div>
        </fieldset>
        {handoff && <div className={styles.queue} role="status"><small>Next owner · {handoff.owner}</small><h3>{handoff.task}</h3><p>{schedules[period].feedback} {handoff.next}</p>
          <Link className={styles.textLink} href={'/workspace/' + queryFor({...selection, stage: 'review'})}>Inspect this review record</Link>
        </div>}
        <p className={styles.inspectLink}><Link className={styles.textLink} href={riskInspector}>Inspect the source packet for this handoff</Link></p>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="pilot-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Investment decision</p><h2 id="pilot-title">Is the shared file worth funding?</h2>
        <p>Northstar’s CFO sponsors this pilot. She can keep the current handoff, fund an evidence checklist, or test the linked workspace alongside the existing process. Treasury and independent liquidity risk will both use the chosen workflow.</p>
        <p>Estimate time freed across both teams after allowing for corrections. The worksheet values hours they could reassign. Cash savings would require an actual change in spending.</p>
      </div>
      <div>
      <details className={styles.calculator}><summary>Estimate the value of reviewer time</summary>
        <p>Illustrative assumptions include €60 per reviewer hour and €12,000 for first-year setup, training and operations.</p>
        <div className={styles.range}>
          <label htmlFor="reviews">Eligible reviews per month <b>{reviews}</b></label>
          <input id="reviews" type="range" min="10" max="250" step="10" value={reviews} onChange={(event) => update({reviews: Number(event.target.value), sponsor: null})} />
        </div>
        <div className={styles.range}>
          <label htmlFor="minutes">Minutes saved per review <b>{minutes}</b></label>
          <input id="minutes" type="range" min="0" max="30" value={minutes} onChange={(event) => update({minutes: Number(event.target.value), sponsor: null})} />
        </div>
        <figure className={styles.chart}>
          <figcaption>First-year cost compared with time freed</figcaption>
          <div className={styles.barLabel}><span>Pilot cost</span><b>{euros.format(yearCost)}</b></div>
          <div className={styles.track} aria-hidden="true"><span style={{ width: (yearCost / chartMax * 100) + '%' }} /></div>
          <div className={styles.barLabel}><span>Estimated value of time</span><b>{euros.format(capacity)}</b></div>
          <div className={styles.track} aria-hidden="true"><span className={styles.valueBar} style={{ width: (capacity / chartMax * 100) + '%' }} /></div>
        </figure>
        <div className={styles.economics} aria-live="polite" aria-atomic="true">
          <div><strong>{euros.format(capacity - yearCost)}</strong><span>Annual capacity value less first-year cost</span></div>
          <div><strong>{breakEven.toLocaleString('en-IE', { maximumFractionDigits: 1 })} min</strong><span>Time needed per review to break even</span></div>
        </div>
        <p>Monthly reviews × 12 × hours saved per review × hourly cost gives the annual capacity value.</p>
      </details>
      <div className={styles.method}>
        <p>For the pilot, give Treasury and independent risk comparable historical cases. Time both people through corrections and handoff. For each approach, check whether the next reviewer can find the original alert, catch an unsupported estimate and explain the follow-up without asking Treasury to reconstruct the meeting.</p>
        <label className={styles.sponsor}>CFO’s next step
          <select value={sponsor || ''} onChange={e => update({sponsor: (e.target.value as Sponsor) || null})}>
            <option value="">Select an alternative</option><option value="retain">Retain the current handoff</option>
            <option value="checklist">Trial an evidence checklist</option><option value="linked">Pilot the linked file</option>
          </select>
        </label>
        {sponsor && <p role="status">{sponsor === 'retain' ? 'Time the current handoff, including corrections. These reviews provide the baseline for both proposed changes.' :
          sponsor === 'checklist' ? 'Have both teams complete the checklist. Compare time spent finding dates and unsupported assumptions with the existing workflow.' :
          'At these assumptions the annual capacity value less first-year cost is ' + euros.format(capacity - yearCost) + '. Compare the pilot with the checklist and check that reviewers catch every unsupported assumption before a funding decision.'}</p>}
      </div>
      </div>
    </section>
    <section className={styles.technical} aria-labelledby="technical-title">
      <div><p className={styles.eyebrow}>Technical guide</p>
        <h2 id="technical-title">Follow the records behind your choices.</h2>
        <p>Step through your payment plan, the coverage check and the packet available at the meeting. Inspect the code behind each step.</p>
        <Link className={styles.action} href={inspector}>Open the technical guide</Link>
      </div>
      <div className={styles.method}>
        <details><summary>Research behind this case</summary>
          <p>The Basel Committee distinguishes the timing of payments within a day from a bank’s ability to withstand 30 days of stress. The dollar replay uses fictional cutoffs and a separate account from the euro coverage exercise. <a href="https://www.bis.org/publ/bcbs248.htm">Intraday liquidity monitoring tools</a></p>
          <p>Basel’s liquidity guidance assigns senior management oversight and calls for independent challenge of business-line assumptions. The OCC describes how liquidity responsibilities may sit with a CFO or asset/liability committee. Northstar’s CFO is the fictional project sponsor. <a href="https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/lqy/10">Basel liquidity governance guidance</a> · <a href="https://www.occ.gov/publications-and-resources/publications/comptrollers-handbook/files/liquidity/pub-ch-liquidity.pdf">OCC liquidity handbook</a></p>
          <p>The Basel Committee describes liquidity coverage over a 30-day stress period and the use of the buffer during stress. The simplified fixture prompts a review. A regulatory conclusion requires institution-specific data and assessment. <a href="https://www.bis.org/publications/201301-standards-basel-iii-liquidity-coverage-ratio-and-liquidity-risk-monitoring-tools">Basel Committee liquidity coverage standard</a></p>
          <p>The Committee’s 2026 outreach identifies data lineage and timely ad hoc risk reporting as operational challenges. That motivates testing evidence retrieval time. All worksheet costs and productivity inputs are illustrative. <a href="https://www.bis.org/publications/implementation-principles-effective-risk-data-aggregation-and-risk-reporting-bcbs-239-principles">BCBS 239 implementation newsletter</a></p>
        </details>
      </div>
    </section>
  </main>;
}
