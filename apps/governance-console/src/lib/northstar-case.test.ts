import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { replay, orders } from './intraday.ts';
import { defaults, options, posting, queryFor, readSelection, receiptText } from './northstar-case.ts';

test('a full inspector link preserves business and technical selections; invalid inputs use defaults', () => {
  const selected = {...defaults, outflows:110, period:'matched', action:'escalate', reviews:70,
    minutes:16, sponsor:'linked', batch:'reserve', receipt:'scheduled', line:40, tick:0, orderId:'batch', stage:'settlement', trial:'late', checkpoint:'10:10'} as const;
  assert.deepEqual(readSelection(queryFor(selected)), selected);
  assert.deepEqual(readSelection('?outflows=300&period=13&reviews=13&minutes=-2&action=notify&stage=payments&sponsor=Y&checkpoint=x&trial=x&batch=hold&receipt=9&line=80&tick=8&orderId=missing'), defaults);
  assert.deepEqual(readSelection(''), defaults);
});
test('a shared desk inspection restores the instruction and its actual settlement frame', () => {
  const chosen = {...defaults, stage: 'settlement', batch: 'reserve', receipt: 'late', line: 40, tick: 6} as const;
  for (const order of orders) {
    const link = queryFor({...chosen, orderId: order.id});
    const reopened = readSelection(link);
    const frame = replay({ holdBatch: reopened.batch === 'reserve', delayed: reopened.receipt === 'late', line: reopened.line })[reopened.tick];
    assert.equal(reopened.orderId, order.id);
    assert.equal(frame.time, '10:05');
    assert.equal(frame.settledAt[reopened.orderId], {margin: 3, securities: 4, batch: 6}[order.id]);
  }
});
test('a late packet cannot substantiate a 10:00 review and becomes inspectable at 10:10', () => {
  const late = {...defaults, trial:'late', period:'matched'} as const;
  assert.deepEqual(posting(late), {recorded:'10:05',age:-5,available:false,comparable:false});
  assert.deepEqual(posting({...late,checkpoint:'10:10'}), {recorded:'10:05',age:5,available:true,comparable:true});
  assert.equal(posting({...defaults,period:'prior'}).comparable,false);
  assert.equal(posting({...defaults,period:'matched'}).comparable,true);
});
test('every published synthetic receipt reproduces its SHA-256 and changes with its selected amount, date and posting', () => {
  const fixture = JSON.parse(readFileSync(new URL('./northstar-receipts.json', import.meta.url), 'utf8'));
  const observed = new Set();
  for (const {amount} of options) for (const period of ['matched','prior'] as const) for (const trial of ['early','late'] as const) {
    const packet = receiptText({...defaults,outflows:amount,period,trial});
    observed.add(packet);
    assert.equal(createHash('sha256').update(packet).digest('hex'),fixture[packet]);
  }
  assert.equal(observed.size, 12);
  assert.deepEqual([...observed].sort(), Object.keys(fixture).sort());
});
