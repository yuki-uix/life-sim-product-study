import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveClock, reservationSummary, describeChanges } from '../dist/life/ui-model.js';
import { createGame, begin, advance, choose, startYoungSample, setFocus, arrange, getLifeView, validateSave } from '../dist/life/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));

test('the visible running and manual-pause actions agree with the actual clock gate', () => {
  const running = deriveClock({ status: 'living' });
  assert.equal(running.kind, 'running');
  assert.equal(running.action, 'pause');
  assert.equal(running.canRun, true);
  assert.equal(running.nextDisabled, false);
  const paused = deriveClock({ status: 'living', manualPaused: true });
  assert.equal(paused.kind, 'paused');
  assert.equal(paused.action, 'resume');
  assert.equal(paused.canRun, false);
  assert.equal(paused.nextDisabled, false, 'manual pause still permits a deliberate one-year advance');
});

test('an open record view never pretends that toggling manual pause removes the reading pause', () => {
  for (const manualPaused of [false, true]) {
    const input = { status: 'living', panel: 'records', manualPaused };
    const saved = copy(input);
    const clock = deriveClock(input);
    assert.equal(clock.kind, 'viewing');
    assert.match(clock.label, /查看记录.*已暂停/);
    assert.equal(clock.action, 'return-life');
    assert.equal(clock.actionLabel, '返回生活');
    assert.equal(clock.canRun, false);
    assert.equal(clock.nextDisabled, true);
    assert.deepEqual(input, saved, 'deriving the visible state does not erase manual intent');
    const closed = deriveClock({ ...input, panel: null });
    assert.equal(closed.kind, manualPaused ? 'paused' : 'running');
    assert.equal(closed.canRun, !manualPaused);
  }
});

test('returning from a view restores an unanswered decision or first-plan gate rather than starting time', () => {
  const viewingDecision = deriveClock({ status: 'living', pending: 'away_closing29', panel: 'overview' });
  assert.equal(viewingDecision.action, 'return-life');
  const decision = deriveClock({ status: 'living', pending: 'away_closing29' });
  assert.equal(decision.kind, 'decision');
  assert.equal(decision.action, 'show-decision');
  assert.equal(decision.canRun, false);
  assert.equal(decision.nextDisabled, true);
  const plan = deriveClock({ status: 'living', needsPlan: true });
  assert.equal(plan.kind, 'needs-plan');
  assert.equal(plan.action, 'open-plan');
  assert.equal(plan.canRun, false);
  assert.equal(deriveClock({ status: 'living', needsPlan: true, panel: 'plan' }).kind, 'viewing');
});

test('background, restart, unborn and ended states cannot quietly run', () => {
  for (const input of [
    { status: 'living', hidden: true },
    { status: 'living', restartOpen: true },
    { status: 'unborn' },
    { status: 'ended' },
    {},
  ]) {
    const clock = deriveClock(input);
    assert.equal(clock.canRun, false);
    assert.equal(clock.nextDisabled, true);
  }
  assert.equal(deriveClock({ status: 'ended', panel: 'records' }).action, 'return-life');
  assert.match(deriveClock({ status: 'ended', panel: 'records' }).label, /已结束/);
  assert.equal(deriveClock({ status: 'living', restartOpen: true }).actionDisabled, true);
});

test('a current appointment exposes its actual reserved time and money without spending them early', () => {
  const before = setFocus(startYoungSample(), 'make');
  const planned = arrange(before, 'edit_lab');
  const saved = copy(planned);
  const summary = reservationSummary(planned);
  assert.equal(summary.hasReservation, true);
  assert.equal(summary.activityId, 'edit_lab');
  assert.equal(summary.timeTotal, 6);
  assert.equal(summary.reservedTime, 2);
  assert.equal(summary.remainingTime, 4);
  assert.equal(summary.moneyBalance, 3000);
  assert.equal(summary.reservedMoney, 2000);
  assert.equal(summary.moneyUnreserved, 1000);
  assert.match(summary.text, /待支出/);
  assert.equal(planned.facts.young.reserve, 3);
  assert.deepEqual(planned, saved);
  const settled = advance(planned);
  const history = settled.facts.young.history.at(-1);
  assert.equal(summary.remainingTime, history.focusTime, 'the display uses the same reservation as annual settlement');
  assert.equal(summary.reservedTime, history.arrangementTime);
  assert.equal(reservationSummary(settled).hasReservation, false);
});

test('previous promises and this-year reservations are shown separately and deducted only once', () => {
  const plans = { 23: 'make', 24: 'settle', 25: 'connect', 26: 'make', 27: 'connect', 28: 'settle' };
  let state = startYoungSample();
  while (state.age < 29) {
    state = setFocus(state, plans[state.age]);
    if (state.age === 25) state = arrange(state, 'work_together');
    state = advance(state);
  }
  state = choose(state, 'co_edit_home');
  state = advance(state);
  assert.equal(state.age, 30);
  state = arrange(state, 'visit_home');
  const summary = reservationSummary(state);
  assert.equal(summary.timeTotal, 6);
  assert.equal(summary.promisedTime, 2);
  assert.equal(summary.reservedTime, 3);
  assert.equal(summary.remainingTime, 1);
  const next = advance(state);
  assert.equal(next.facts.young.history.at(-1).focusTime, 1);
  assert.equal(next.facts.young.history.at(-1).promisedTime, 2);
});

test('inactive stages do not display a fictional young-life budget', () => {
  const empty = reservationSummary(createGame());
  assert.equal(empty.active, false);
  assert.equal(empty.text, '');
  assert.deepEqual(empty.lines, []);
  const local = choose(advance(begin(createGame()), 18), 'local');
  assert.equal(reservationSummary(local).active, false);
});

test('display changes distinguish a reservation from actual annual consequences', () => {
  const before = startYoungSample();
  const focused = setFocus(before, 'make');
  const planned = arrange(focused, 'edit_lab');
  assert.deepEqual(describeChanges(before, focused), []);
  assert.deepEqual(describeChanges(focused, planned), []);
  const after = advance(planned);
  const saved = copy(after);
  const lines = describeChanges(planned, after);
  assert.ok(lines.some(line => /备用金/.test(line)));
  assert.ok(lines.some(line => /本年预约已结算.*剪辑练习/.test(line)));
  assert.equal(lines.some(line => /获奖|展出|放映|完成短片/.test(line)), false);
  assert.deepEqual(after, saved);
});

test('read-only view metadata and presentation helpers leave v2 saves replayable', () => {
  const state = arrange(setFocus(startYoungSample(), 'connect'), 'visit_home');
  const saved = copy(state);
  const view = getLifeView(state);
  for (const option of view.arrangements) {
    assert.equal(typeof option.timeCost, 'number');
    assert.equal(typeof option.moneyCost, 'number');
  }
  reservationSummary(state, view);
  describeChanges(state, advance(state));
  deriveClock({ status: state.status, panel: 'plan', needsPlan: view.needsPlan });
  assert.deepEqual(state, saved);
  assert.deepEqual(validateSave(saved), state);
});
