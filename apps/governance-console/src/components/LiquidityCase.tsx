'use client';

import Link from 'next/link';
import { useState } from 'react';
import { issues, scenarioImpact } from '../lib/demo';
import styles from './LiquidityCase.module.css';

const issue = issues.find((item) => item.id === 'GOV-1042')!;
const euros = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const options = [
  { amount: 100, label: 'Original estimate', note: 'Reconcile the asset and outflow records with Treasury. Record who will explain the €8m gap.' },
  { amount: 92, label: 'Lower outflows', note: 'The estimate reaches the monitoring line exactly. Keep the original alert and ask for the evidence behind the revised outflow estimate.' },
  { amount: 110, label: 'Higher outflows', note: 'The gap widens to €18m. Ask Treasury to reconcile the larger outflow assumption and document the funding assessment.' },
];

export default function LiquidityCase() {
  const [choice, setChoice] = useState(0);
  const [reviews, setReviews] = useState(100);
  const [minutes, setMinutes] = useState(12);
  const { amount, note } = options[choice];
  const result = scenarioImpact('Liquidity', amount - 100);
  const yearCost = 12000;
  const hourlyCost = 60;
  const annualReviews = reviews * 12;
  const capacity = annualReviews * minutes / 60 * hourlyCost;
  const breakEven = yearCost / (annualReviews * hourlyCost) * 60;

  return <main className={styles.case}>
    <header className={styles.mast}>
      <strong>Financial Digital Twin</strong><Link href="/workspace/">Review workspace</Link>
    </header>
    <section className={styles.lead} aria-labelledby="case-title">
      <div>
        <p className={styles.eyebrow}>Treasury case file · {issue.id}</p>
        <h1 id="case-title">What is behind Northstar’s liquidity alert?</h1>
        <p>Northstar’s Treasury analyst reports €92m of liquid assets against €100m of expected net cash outflows over 30 days. You review liquidity risk independently. Which assumption would you challenge before the morning funding meeting?</p>
        <p className={styles.provenance}>All financial data is synthetic. The browser uses the repository’s Northstar fixture.</p>
      </div>
      <aside className={styles.record} aria-label="Original observation">
        <div className={styles.recordLabel}>Northstar Bank · Original observation</div>
        <strong>{issue.observed}</strong><span>liquidity coverage</span>
        <div className={styles.meter}><span style={{ width: issue.observed }} /></div>
        <div className={styles.recordFoot}><span>€92m available</span><span>€100m required by model</span></div>
      </aside>
    </section>
    <section className={styles.section} aria-labelledby="scenario-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Review the signal</p>
        <h2 id="scenario-title">Change the outflow estimate.</h2>
        <p>Treasury owns the estimate and explains the funding response. Your job is to trace the figures to their source and record any unresolved challenge. Hold assets at €92m and test three outflow estimates.</p>
      </div>
      <div className={styles.scenario}>
        <fieldset><legend>30-day net cash outflows</legend><div className={styles.choices}>
          {options.map((option, index) => <label key={option.amount} className={index === choice ? styles.chosen : ''}>
            <input type="radio" name="outflows" checked={choice === index} onChange={() => setChoice(index)} />
            <span><strong>€{option.amount}m</strong><small>{option.label}</small></span>
          </label>)}
        </div></fieldset>
        <div className={styles.result} aria-live="polite" aria-atomic="true">
          <strong>{Number(result.projected.toFixed(1))}%</strong>
          <div><b>{result.breached ? 'Below the monitoring line' : 'At the monitoring line'}</b><p>{note}</p></div>
        </div>
        <p>Open the original case to inspect its source observation, rule match and review history. Scenario changes stay in this worksheet.</p>
        <Link className={styles.action} href="/workspace/">Inspect {issue.id} in the review queue</Link>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="pilot-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Investment decision</p><h2 id="pilot-title">Can a shared review file earn its keep?</h2>
        <p>Northstar’s CFO sponsors this pilot. She can keep the current handoff, fund an evidence checklist, or test the linked workspace alongside the existing process. Treasury and independent liquidity risk will both use the chosen workflow.</p>
        <p>Estimate time freed across both teams after allowing for corrections. The worksheet values hours they could reassign. Cash savings would require an actual change in spending.</p>
      </div>
      <div className={styles.calculator}>
        <h3>First-year capacity estimate</h3>
        <p>Illustrative assumptions include €60 per reviewer hour and €12,000 for first-year setup, training and operations.</p>
        <div className={styles.range}>
          <label htmlFor="reviews">Eligible reviews per month <b>{reviews}</b></label>
          <input id="reviews" type="range" min="10" max="250" step="10" value={reviews} onChange={(event) => setReviews(Number(event.target.value))} />
        </div>
        <div className={styles.range}>
          <label htmlFor="minutes">Minutes saved per review <b>{minutes}</b></label>
          <input id="minutes" type="range" min="0" max="30" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
        </div>
        <div className={styles.economics} aria-live="polite" aria-atomic="true">
          <div><strong>{euros.format(capacity - yearCost)}</strong><span>Annual capacity value less first-year cost</span></div>
          <div><strong>{breakEven.toLocaleString('en-IE', { maximumFractionDigits: 1 })} min</strong><span>Time needed per review to break even</span></div>
        </div>
        <p>Monthly reviews × 12 × hours saved per review × hourly cost gives the annual capacity value.</p>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="evidence-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Pilot evidence</p><h2 id="evidence-title">What would justify a rollout?</h2></div>
      <div className={styles.method}>
        <p>Pair a Treasury analyst with an independent liquidity-risk reviewer. Try matched historical cases with the current workflow, the checklist and the linked workspace. Rotate the order and time both people through handoff, including corrections.</p>
        <p>Treasury must show the source and period for both figures. Independent risk must be able to reproduce the ratio and flag an unsupported assumption. The CFO should fund rollout only if the workspace beats the cheaper viable option on measured capacity net of cost and reviewers can still find every unsupported assumption in the test cases.</p>
        <details><summary>Research behind this case</summary>
          <p>Basel’s liquidity guidance assigns senior management oversight and calls for independent challenge of business-line assumptions. The OCC describes how liquidity responsibilities may sit with a CFO or asset/liability committee. Northstar’s CFO is the fictional project sponsor. <a href="https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/lqy/10">Basel liquidity governance guidance</a> · <a href="https://www.occ.gov/publications-and-resources/publications/comptrollers-handbook/files/liquidity/pub-ch-liquidity.pdf">OCC liquidity handbook</a></p>
          <p>The Basel Committee describes liquidity coverage over a 30-day stress period and the use of the buffer during stress. The simplified fixture prompts a review. A regulatory conclusion requires institution-specific data and assessment. <a href="https://www.bis.org/publications/201301-standards-basel-iii-liquidity-coverage-ratio-and-liquidity-risk-monitoring-tools">Basel Committee liquidity coverage standard</a></p>
          <p>The Committee’s 2026 outreach identifies data lineage and timely ad hoc risk reporting as operational challenges. That motivates testing evidence retrieval time. All worksheet costs and productivity inputs are illustrative. <a href="https://www.bis.org/publications/implementation-principles-effective-risk-data-aggregation-and-risk-reporting-bcbs-239-principles">BCBS 239 implementation newsletter</a></p>
        </details>
      </div>
    </section>
  </main>;
}
