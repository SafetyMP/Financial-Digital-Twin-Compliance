import assert from 'node:assert/strict';
import test from 'node:test';
import { liquidityHandoff, schedules } from './liquidity-handoff.ts';

test('an as-of mismatch keeps each review action provisional on both sides of the monitoring decision', () => {
  for (const belowLine of [false, true]) {
    const request = liquidityHandoff('request', 'prior', belowLine);
    assert.equal(request.owner, 'Treasury analyst');
    assert.match(request.task, /prior-day/);
    assert.equal(liquidityHandoff('document', 'prior', belowLine).task, 'Record an unresolved date exception');
    assert.equal(liquidityHandoff('escalate', 'prior', belowLine).task, 'Review the evidence exception');
  }
});

test('matched records support distinct owner tasks at and below the monitoring line', () => {
  for (const belowLine of [false, true]) {
    assert.equal(liquidityHandoff('request', 'matched', belowLine).task, 'Substantiate the outflow estimate');
  }
  assert.equal(liquidityHandoff('document', 'matched', false).owner, 'Independent liquidity risk');
  assert.equal(liquidityHandoff('document', 'matched', true).task, 'Add a response to the documented shortfall');
  assert.equal(liquidityHandoff('escalate', 'matched', false).owner, 'Liquidity risk lead');
  assert.equal(liquidityHandoff('escalate', 'matched', true).task, 'Assess the supported shortfall');
});

test('schedule choices show dates and reserve the comparison for review feedback', () => {
  assert.equal(schedules.prior.date, '13 November');
  assert.equal(schedules.matched.date, '14 November');
  assert.match(schedules.prior.feedback, /predates the 14 November asset balance by one day/);
  assert.match(schedules.matched.feedback, /Both records are as of 14 November/);
});
