import assert from 'node:assert/strict';
import test from 'node:test';
import { minutesLate, orders, replay } from './intraday.ts';

test('timing and prioritisation change who settles late even when closing cash agrees', () => {
  const early = replay({ delayed: true, holdBatch: false, line: 0 });
  const held = replay({ delayed: true, holdBatch: true, line: 0 });
  assert.equal(early[3].missed, 1);
  assert.deepEqual(early[7].settledAt, { batch: 1, margin: 6, securities: 7 });
  assert.deepEqual(held[7].settledAt, { margin: 3, securities: 6, batch: 7 });
  assert.equal(minutesLate(6, 3), 35);
  assert.equal(minutesLate(6, 4), 20);
  assert.equal(early[7].cash, held[7].cash);
});

test('secured credit preserves cutoffs at the cost of tying up collateral and drawing the line', () => {
  const funded = replay({ delayed: true, holdBatch: true, line: 40 });
  const timely = replay({ delayed: false, holdBatch: false, line: 20 });
  assert.equal(funded[4].cash, -15);
  assert.equal(funded[5].missed, 1);
  assert.equal(funded[6].settledAt.batch, 6);
  assert.equal(timely[7].missed, 0);
  assert.equal(timely[7].peakDraw, 10);
});

test('opening, pending state, liquidity ceiling and final reconciliation hold in every plan', () => {
  for (const line of [0, 20, 40] as const) for (const delayed of [true, false]) for (const holdBatch of [true, false]) {
    const frames = replay({line, delayed, holdBatch});
    assert.deepEqual(frames[0].settledAt, {});
    assert.deepEqual(frames[0].released, []);
    for (const frame of frames) {
      assert.ok(frame.headroom >= 0);
      assert.ok(frame.peakDraw <= line);
      assert.equal(frame.headroom, frame.cash + line);
    }
    assert.equal(Object.keys(frames[7].settledAt).length, orders.length);
    assert.equal(frames[7].cash, 20);
  }
});
