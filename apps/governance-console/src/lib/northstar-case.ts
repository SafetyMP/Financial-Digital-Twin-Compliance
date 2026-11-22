import { minutesBetween } from './posting-clock.ts';
import type { ReviewAction, SourcePeriod } from './liquidity-handoff.ts';
export const options = [
  { amount: 100, label: 'Original estimate' },
  { amount: 92, label: 'Lower outflows' },
  { amount: 110, label: 'Higher outflows' },
] as const;
export type Sponsor = 'retain' | 'checklist' | 'linked';
export type Stage = 'snapshot' | 'calculation' | 'receipt' | 'settlement';
export type Trial = 'early' | 'late';
export type Selection = {
  batch: 'release' | 'reserve' | null;
  receipt: 'late' | 'scheduled';
  line: 0 | 20 | 40;
  tick: number;
  orderId: 'margin' | 'securities' | 'batch';
  outflows: 100 | 92 | 110;
  period: SourcePeriod;
  action: ReviewAction | null;
  reviews: number;
  minutes: number;
  sponsor: Sponsor | null;
  stage: Stage;
  trial: Trial;
  checkpoint: '10:00' | '10:10';
};
export const defaults: Selection = {
  batch: null, receipt: 'late', line: 0, tick: 7, orderId: 'margin',
  outflows: 100, period: 'prior', action: null, reviews: 100, minutes: 12, sponsor: null,
  stage: 'snapshot', trial: 'early', checkpoint: '10:00',
};
function choice<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find(v => v === raw) ?? fallback;
}
function numberIn(raw: string | null, min: number, max: number, step: number, fallback: number) {
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const n = Number(raw);
  return n >= min && n <= max && (n - min) % step === 0 ? n : fallback;
}
export function readSelection(query: string): Selection {
  const q = new URLSearchParams(query);
  return {
    batch: q.get('batch') === 'release' ? 'release' : q.get('batch') === 'reserve' ? 'reserve' : null,
    receipt: choice(q.get('receipt'), ['late', 'scheduled'], defaults.receipt),
    line: q.get('line') === '40' ? 40 : q.get('line') === '20' ? 20 : 0,
    orderId: choice(q.get('orderId'), ['margin', 'securities', 'batch'], defaults.orderId),
    tick: numberIn(q.get('tick'), 0, 7, 1, defaults.tick),
    outflows: options.find(o => String(o.amount) === q.get('outflows'))?.amount ?? defaults.outflows,
    period: choice(q.get('period'), ['matched', 'prior'], defaults.period),
    action: ['request', 'document', 'escalate'].includes(q.get('action') ?? '') ? q.get('action') as ReviewAction : null,
    reviews: numberIn(q.get('reviews'), 10, 250, 10, defaults.reviews),
    minutes: numberIn(q.get('minutes'), 0, 30, 1, defaults.minutes),
    sponsor: ['retain','checklist','linked'].includes(q.get('sponsor') ?? '') ? q.get('sponsor') as Sponsor : null,
    stage: choice(q.get('stage'), ['snapshot','calculation','receipt','settlement'], defaults.stage),
    trial: choice(q.get('trial'), ['early','late'], defaults.trial),
    checkpoint: choice(q.get('checkpoint'), ['10:00','10:10'], defaults.checkpoint),
  };
}
export function queryFor(s: Selection) {
  const q = new URLSearchParams();
  for (const k of Object.keys(s) as (keyof Selection)[]) {
    if (s[k] !== null && s[k] !== defaults[k]) q.set(k, String(s[k]));
  }
  return q.size ? '?' + q.toString() : '';
}
export function posting(s: Selection) {
  const recorded = s.trial === 'late' ? '10:05' : '09:55';
  const age = minutesBetween(recorded, s.checkpoint);
  const available = age >= 0;
  return {recorded, age, available, comparable: available && s.period === 'matched'};
}
export function receiptText(s: Selection) {
  const day = s.period === 'matched' ? '14' : '13';
  return ['GOV-1042', 'EUR', 'asset=92m@14-Nov', 'outflows=' + s.outflows + 'm@' + day + '-Nov',
    'horizon=30d', 'posted=' + posting(s).recorded].join('|');
}
