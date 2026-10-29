import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceClock } from '../dist/replica/clock.js';

const running = { fraction: 0, age: 23, status: 'living' };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12);

test('the replica clock advances only presentation progress and leaves its input intact', () => {
  const input = { ...running, fraction: 0.25 };
  const before = structuredClone(input);
  const result = advanceClock(input, 600);
  close(result.fraction, 0.27);
  assert.equal(result.complete, false);
  assert.deepEqual(input, before);
  assert.deepEqual(Object.keys(result).sort(), ['complete', 'fraction']);
});

test('all life, pause and modal gates stop presentation time, including a minimized pending decision', () => {
  for (const gate of [
    { paused: true }, { hidden: true }, { modalOpen: true },
    { pending: 'away_closing29' },
    { pending: 'away_closing29', decisionMinimized: true },
    { needsPlan: true }, { status: 'unborn' }, { status: 'ended' },
    { status: undefined },
  ]) {
    const input = { ...running, fraction: 0.4, fastForward: true, ...gate };
    assert.deepEqual(advanceClock(input, 1000, 16), { fraction: 0.4, complete: false });
  }
  assert.ok(advanceClock({ ...running, decisionMinimized: true }, 1000).fraction > 0,
    'a stale presentation flag alone does not invent an unanswered decision');
});

test('the five supported speeds scale the same yearly duration', () => {
  for (const speed of [1, 2, 4, 8, 16]) {
    close(advanceClock(running, 500, speed).fraction, 500 * speed / 30000);
  }
  for (const speed of [0, -1, 3, 32, NaN, '2']) {
    assert.deepEqual(advanceClock(running, 500, speed), advanceClock(running, 500, 1));
  }
});

test('elapsed time is capped to one second so background gaps cannot skip years', () => {
  assert.deepEqual(advanceClock(running, 60000), advanceClock(running, 1000));
  assert.deepEqual(advanceClock(running, Infinity), advanceClock(running, 1000));
  for (const elapsed of [-1000, -Infinity, NaN, undefined]) {
    assert.deepEqual(advanceClock(running, elapsed), { fraction: 0, complete: false });
  }
});

test('the completion signal occurs on crossing only and cannot settle a year twice', () => {
  const crossed = advanceClock({ ...running, fraction: 0.99 }, 1000);
  assert.deepEqual(crossed, { fraction: 1, complete: true });
  assert.deepEqual(advanceClock({ ...running, fraction: crossed.fraction }, 1000),
    { fraction: 1, complete: false });
  assert.deepEqual(advanceClock({ ...running, fraction: 0 }, 0),
    { fraction: 0, complete: false });
});

test('fast-forward still exposes one annual completion for the caller to settle', () => {
  for (const speed of [1, 2, 4, 8, 16]) {
    assert.deepEqual(advanceClock({ ...running, fastForward: true }, 500, speed),
      { fraction: 0.5, complete: false });
    assert.deepEqual(advanceClock({ ...running, fastForward: true }, 5000, speed),
      { fraction: 1, complete: true });
  }
  assert.deepEqual(advanceClock({ ...running, fastForward: true, pending: 'decision' }, 1000),
    { fraction: 0, complete: false });
});

test('fraction and yearly duration remain bounded for malformed presentation inputs', () => {
  assert.deepEqual(advanceClock({ ...running, fraction: -5 }, 0),
    { fraction: 0, complete: false });
  assert.deepEqual(advanceClock({ ...running, fraction: 12 }, 1000),
    { fraction: 1, complete: false });
  for (const fraction of [NaN, Infinity, undefined]) {
    close(advanceClock({ ...running, fraction }, 300).fraction, 0.01);
  }
  for (const duration of [0, -100, NaN, Infinity]) {
    assert.deepEqual(advanceClock(running, 300, 1, duration), advanceClock(running, 300));
  }
  assert.deepEqual(advanceClock(running, 1000, 1, 500),
    { fraction: 1, complete: true });
});
