import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, begin, advance, choose, getChoices, getDecisionOptions, getCurrentScene,
  getMemories, getNextAge, validateSave, startYoungSample, setFocus, arrange, getLifeView,
} from '../dist/life/engine.js';
import { getClosingPlan } from '../dist/life/living.js';

const copy = value => JSON.parse(JSON.stringify(value));
function prepare(plans, appointments = {}) {
  let state = startYoungSample();
  while (state.age < 29) {
    state = setFocus(state, plans[state.age] || 'settle');
    if (appointments[state.age]) state = arrange(state, appointments[state.age]);
    state = advance(state);
  }
  return state;
}
const sharedPlans = { 23: 'make', 24: 'settle', 25: 'connect', 26: 'make', 27: 'connect', 28: 'settle' };
const prepared = () => prepare(sharedPlans, { 25: 'work_together' });

test('the young entry records its fixed past and waits only for the first life plan', () => {
  const state = startYoungSample();
  assert.equal(state.age, 23);
  assert.equal(state.facts.college, 'away');
  assert.equal(state.facts.city, '临港');
  assert.equal(state.choices[0].choiceId, 'away');
  assert.equal(getLifeView(state).active, true);
  assert.equal(getLifeView(state).needsPlan, true);
  assert.equal(getNextAge(state), 24);
  assert.deepEqual(state.facts.young.history, []);
  assert.deepEqual(validateSave(copy(state)), state);
  assert.equal(getLifeView(choose(advance(begin(createGame()), 18), 'local')).active, false);
});

test('changing focus schedules a way of living, never time, practice or an immediate result', () => {
  const before = startYoungSample(), untouched = copy(before);
  let state = setFocus(before, 'make');
  for (const id of ['connect', 'settle', 'make']) state = setFocus(state, id);
  assert.deepEqual(before, untouched);
  assert.equal(state.age, 23);
  assert.deepEqual(state.log, before.log);
  assert.equal(state.facts.young.progress, 0);
  assert.equal(state.facts.young.skill, 0);
  assert.equal(state.facts.young.reserve, 3);
  assert.equal(getLifeView(state).needsPlan, false);
  assert.deepEqual(setFocus(state, 'make'), state, 'selecting the existing focus is a no-op');
  state = advance(state);
  assert.equal(state.facts.young.history[0].focus, 'make');
  assert.ok(state.facts.young.progress > 0);
});

test('one appointment reserves real time and money and resolves after the year passes', () => {
  const before = setFocus(startYoungSample(), 'make');
  const planned = arrange(before, 'edit_lab');
  assert.equal(planned.age, before.age);
  assert.deepEqual(planned.log, before.log);
  assert.equal(planned.facts.young.reserve, before.facts.young.reserve);
  assert.equal(planned.facts.young.skill, 0);
  assert.deepEqual(planned.facts.young.arranged, { id: 'edit_lab', age: 23 });
  assert.throws(() => arrange(planned, 'visit_home'));
  assert.throws(() => arrange(planned, 'edit_lab'));
  const ordinary = advance(before), withLesson = advance(planned);
  assert.equal(ordinary.facts.young.history[0].focusTime, 6);
  assert.equal(withLesson.facts.young.history[0].focusTime, 4);
  assert.equal(withLesson.facts.young.history[0].arrangementTime, 2);
  assert.ok(withLesson.facts.young.reserve < ordinary.facts.young.reserve);
  assert.ok(withLesson.facts.young.skill > ordinary.facts.young.skill);
  assert.equal(withLesson.facts.young.arranged, null);
  assert.match(getCurrentScene(withLesson).text, /剪辑练习/);
  assert.equal(getMemories(withLesson).some(row => row.id === 'young_year_23'), false);
});

test('the workplace and the friend have their own available time rather than waiting for a skill level', () => {
  let state = setFocus(startYoungSample(), 'connect');
  assert.equal(getLifeView(state).arrangements.find(row => row.id === 'work_together').available, false);
  state = advance(state);
  assert.equal(getLifeView(state).items.find(row => row.label === '自己的时间').value.startsWith('4个空闲周末'), true);
  state = advance(state);
  assert.equal(state.age, 25);
  assert.equal(getLifeView(state).arrangements.find(row => row.id === 'work_together').available, true);
  state = advance(state, 2);
  assert.equal(state.age, 27);
  const unavailable = getLifeView(state).arrangements.find(row => row.id === 'work_together');
  assert.equal(unavailable.available, false);
  assert.match(unavailable.reason, /文化馆/);
  assert.equal(state.facts.young.history.find(row => row.age === 24).availableTime, 4);
  assert.equal(state.facts.young.history.find(row => row.age === 25).availableTime, 6);
});

test('earlier practice changes the cost of the same closing-week problem', () => {
  const settled = prepare({});
  const made = prepare({ 23: 'make', 24: 'make', 25: 'settle', 26: 'settle', 27: 'settle', 28: 'settle' });
  assert.equal(settled.pending, 'away_closing29');
  assert.equal(made.pending, settled.pending);
  const a = getClosingPlan(settled.facts), b = getClosingPlan(made.facts);
  assert.ok(b.fullDays < a.fullDays);
  assert.equal(a.canShort, false);
  assert.equal(b.canShort, true);
  assert.match(getDecisionOptions(settled).find(row => row.id === 'short_cut_home').reason, /这周排不下/);
  assert.ok(getChoices(made).some(row => row.id === 'short_cut_home'));
  assert.equal(getDecisionOptions(settled).length, 4);
  assert.equal(getChoices(settled).length, 2);
  assert.throws(() => choose(settled, 'short_cut_home'), /Unavailable/);
});

test('making all the time has continuing costs instead of filling every resource for free', () => {
  const made = prepare({ 23: 'make', 24: 'make', 25: 'make', 26: 'make', 27: 'make', 28: 'make' });
  const rested = prepare({});
  assert.ok(made.facts.young.skill > rested.facts.young.skill);
  assert.ok(made.facts.young.reserve < rested.facts.young.reserve);
  assert.ok(made.facts.young.energy < rested.facts.young.energy);
  assert.ok(made.facts.young.connection < rested.facts.young.connection);
  assert.equal(getClosingPlan(made.facts).canShort, false, 'having practiced does not also create the necessary fare');
  assert.ok(made.facts.young.history.at(-1).effectiveTime < made.facts.young.history.at(-1).focusTime);
});

test('frequent contact cannot substitute for an actual shared piece of work', () => {
  const chatted = prepare({ 23: 'connect', 24: 'connect', 25: 'connect', 26: 'connect', 27: 'connect', 28: 'connect' });
  const shared = prepared();
  assert.ok(chatted.facts.young.connection >= 3);
  assert.equal(chatted.facts.young.cooperation, false);
  assert.equal(getClosingPlan(chatted.facts).canCoedit, false);
  assert.equal(shared.facts.young.cooperationAge, 25);
  assert.equal(shared.facts.young.history.find(row => row.age === 25).arrangement, 'work_together');
  assert.equal(getClosingPlan(shared.facts).canCoedit, true);
  assert.ok(getDecisionOptions(shared).find(row => row.id === 'co_edit_home').available);
});

test('a real shared history still needs present contact, with a warning before the closing week', () => {
  let state = startYoungSample();
  state = setFocus(state, 'settle');
  state = advance(state, 2);
  state = arrange(state, 'work_together');
  state = setFocus(state, 'make');
  state = advance(state, 3);
  assert.equal(state.age, 28);
  assert.equal(state.facts.young.cooperation, true);
  assert.ok(state.facts.young.connection < 2);
  assert.match(getLifeView(state).notice, /把分工对上/);
  const neglected = advance(state);
  assert.equal(getClosingPlan(neglected.facts).canCoedit, false);
  assert.match(getClosingPlan(neglected.facts).coeditReason, /最近总错过消息/);
  const contacted = advance(setFocus(state, 'connect'));
  assert.ok(contacted.facts.young.connection >= 2);
  assert.equal(getClosingPlan(contacted.facts).canCoedit, true);
});

test('the short version trades away content, records actual presence and never becomes a full joint film', () => {
  const before = prepared();
  const state = choose(before, 'short_cut_home');
  assert.equal(state.facts.closingPresence, true);
  assert.equal(state.facts.closingRecording, 'own');
  assert.equal(state.facts.filmStatus, 'submitted');
  assert.equal(state.facts.filmEdition, 'short');
  assert.equal(state.facts.filmCredit, 'solo');
  assert.equal(state.facts.young.reserve, before.facts.young.reserve - 2);
  assert.equal(state.facts.young.followupDue, false);
  assert.match(getCurrentScene(state).memory, /九十秒/);
  const later = advance(state, 2);
  assert.equal(later.facts.filmStatus, 'screened');
  assert.match(getCurrentScene(later).text, /九十秒/);
});

test('joint credit carries a real next-year obligation without changing an old snapshot', () => {
  const before = prepared();
  let shared = choose(before, 'co_edit_home');
  let independent = choose(before, 'finish_film');
  const remembered = copy(getCurrentScene(shared));
  assert.equal(shared.facts.filmCredit, 'joint');
  assert.equal(shared.facts.closingPresence, true);
  assert.equal(shared.facts.young.followupDue, true);
  shared = advance(shared);
  independent = advance(independent);
  assert.equal(shared.age, 30);
  assert.equal(shared.facts.young.followupDone, false);
  assert.match(getLifeView(shared).commitmentText, /2个/);
  assert.match(getLifeView(shared).items.find(row => row.label === '自己的时间').value, /^4个/);
  assert.match(getLifeView(independent).items.find(row => row.label === '自己的时间').value, /^6个/);
  shared = setFocus(shared, 'make');
  independent = setFocus(independent, 'make');
  shared = advance(shared);
  independent = advance(independent);
  assert.equal(shared.facts.young.followupDue, false);
  assert.equal(shared.facts.young.followupDone, true);
  assert.equal(shared.facts.young.history.find(row => row.age === 30).promisedTime, 2);
  assert.equal(shared.facts.young.history.find(row => row.age === 30).focusTime, 4);
  assert.equal(independent.facts.young.history.find(row => row.age === 30).focusTime, 6);
  assert.deepEqual(shared.log.find(row => row.id === 'away_closing29:choice'), remembered);
  assert.equal(getLifeView(shared).active, false);
  assert.match(getLifeView(shared).summary, /按约/);
});

test('a long advance settles the same ordinary years once and still stops at the decision', () => {
  const initial = setFocus(startYoungSample(), 'connect');
  const jumped = advance(initial, 85);
  let stepped = initial;
  while (!stepped.pending) stepped = advance(stepped);
  assert.equal(jumped.age, 29);
  assert.deepEqual(jumped.facts, stepped.facts);
  assert.deepEqual(jumped.log, stepped.log);
  assert.deepEqual(jumped.facts.young.history.map(row => row.age), [23, 24, 25, 26, 27, 28]);
  assert.deepEqual(advance(jumped), jumped);
});

test('the slow return still pays its fare from the next living budget when no reserve remains', () => {
  let state = arrange(setFocus(startYoungSample(), 'make'), 'edit_lab');
  state = advance(state, 85);
  assert.equal(state.facts.young.reserve, 0);
  state = choose(state, 'return_home');
  assert.equal(state.facts.young.fareDeferred, 1);
  assert.match(getLifeView(state).commitmentText, /1000元/);
  state = advance(state);
  assert.equal(state.facts.young.fareDeferred, 0);
  assert.equal(state.facts.young.history.at(-1).before.reserve, 0);
  assert.equal(state.facts.young.reserve, 0);
});

test('free-year actions reject stale, pending, unborn, ended or unknown arrangements', () => {
  assert.throws(() => setFocus(createGame(), 'make'));
  assert.throws(() => arrange(begin(createGame()), 'visit_home'));
  assert.throws(() => setFocus(startYoungSample(), 'unknown'));
  assert.throws(() => arrange(startYoungSample(), 'unknown'));
  assert.throws(() => arrange(prepared(), 'edit_lab'));
  assert.throws(() => setFocus(prepared(), 'connect'));
  const state = advance(choose(prepared(), 'finish_film'), 85);
  assert.throws(() => setFocus(state, 'make'));
  const poor = setFocus(startYoungSample(), 'make');
  const afterLesson = advance(arrange(poor, 'edit_lab'));
  assert.throws(() => arrange(afterLesson, 'visit_home'));
});

test('focus, reservations, costs, collaboration and annual prose all replay and reject forgery', () => {
  let state = startYoungSample();
  state = setFocus(state, 'make');
  state = arrange(state, 'edit_lab');
  assert.deepEqual(validateSave(copy(state)), state);
  state = advance(state);
  assert.deepEqual(validateSave(copy(state)), state);
  state = choose(prepared(), 'co_edit_home');
  state = advance(state, 2);
  assert.deepEqual(validateSave(copy(state)), state);
  for (const alter of [
    raw => raw.facts.young.reserve++,
    raw => raw.facts.young.skill++,
    raw => raw.facts.young.followupDone = false,
    raw => raw.facts.young.history[0].focusTime = 99,
    raw => raw.facts.filmCredit = 'solo',
    raw => raw.log.find(row => row.id === 'young_year_23').text = 'invented',
    raw => raw.commands.push({ type: 'focus', id: 'unknown' }),
    raw => raw.version = 1,
  ]) {
    const forged = copy(state);
    alter(forged);
    assert.equal(validateSave(forged), null);
  }
  const view = getLifeView(prepared());
  view.items[0].value = 'invented';
  assert.notEqual(getLifeView(prepared()).items[0].value, 'invented');
});

test('all offered closing choices continue through a whole coherent and replayable life', () => {
  let endings = 0;
  function visit(previous) {
    const state = advance(previous, 85);
    if (state.status === 'ended') {
      endings++;
      assert.equal(state.age, 85);
      assert.deepEqual(validateSave(copy(state)), state);
      assert.deepEqual(state.log.map(row => row.age), [...state.log.map(row => row.age)].sort((a, b) => a - b));
      return;
    }
    for (const option of getChoices(state)) visit(choose(state, option.id));
  }
  visit(prepared());
  assert.equal(endings, 32);
});
