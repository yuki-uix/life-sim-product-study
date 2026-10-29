import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedDays } from '../dist/replica/clock.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);

test('active elapsed time becomes actual engine days regardless of frame splits', () => {
  const input = { status: 'living', carry: 0 };
  const whole = elapsedDays(input, 1000);
  let carry = 0, days = 0;
  for (let i = 0; i < 10; i++) {
    const step = elapsedDays({ ...input, carry }, 100);
    days += step.days; carry = step.carry;
  }
  assert.equal(days, whole.days);
  close(carry, whole.carry);
  assert.equal(days, 12);
});

test('waiting and hidden views produce no engine days and do not spend fractional carry', () => {
  for (const gate of [{ paused: true }, { hidden: true }, { modalOpen: true }, { pending: 'offer' }, { pending: 'offer', decisionMinimized: true }, { needsPlan: true }, { status: 'ended' }]) {
    assert.deepEqual(elapsedDays({ status: 'living', carry: .4, fastForward: true, ...gate }, 1000, 16), { days: 0, carry: .4 });
  }
});

test('fast-forward gives the engine days to settle and never bypasses its pending gate', () => {
  assert.equal(elapsedDays({ status: 'living', fastForward: true }, 1000).days, 360);
  assert.equal(elapsedDays({ status: 'living' }, 1000, 16).days, 192);
  assert.equal(elapsedDays({ status: 'living', pending: 'offer', fastForward: true }, 1000).days, 0);
  assert.equal(elapsedDays({ status: 'living' }, 60000).days, 12);
});
