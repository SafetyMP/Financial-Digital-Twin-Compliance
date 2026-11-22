import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defaults, options, posting, queryFor, readSelection, receiptText } from './northstar-case.ts';

test('a full inspector link preserves business and technical selections; invalid inputs use defaults', () => {
  const selected = {...defaults, outflows:110, period:'matched', action:'escalate', reviews:70,
    minutes:16, sponsor:'linked', stage:'receipt', trial:'late', checkpoint:'10:10'} as const;
  assert.deepEqual(readSelection(queryFor(selected)), selected);
  assert.deepEqual(readSelection('?outflows=300&period=13&reviews=13&minutes=-2&action=notify&stage=payments&sponsor=Y&checkpoint=x&trial=x'), defaults);
  assert.deepEqual(readSelection(''), defaults);
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
