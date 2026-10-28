import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, begin, advance, choose, getChoices, getCurrentScene,
  getMemories, getNextAge, validateSave,
} from '../dist/life/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const PAPER_A = ['away', 'return_home', 'together', 'renovate', 'try_home'];
const PAPER_B = ['local', 'record_street', 'try_distance', 'part', 'small_group', 'go_sea'];

function play(ids) {
  let state = begin(createGame());
  for (const id of ids) {
    state = advance(state, 85);
    assert.ok(state.pending, `Expected a decision before ${id}`);
    assert.ok(getChoices(state).some(choice => choice.id === id), `${state.pending} does not offer ${id}`);
    state = choose(state, id);
  }
  state = advance(state, 85);
  assert.equal(state.status, 'ended', `The supplied route left ${state.pending} unanswered`);
  return state;
}

test('a life begins once, passes ordinary years, and waits at the exact age of a decision', () => {
  const unborn = createGame();
  assert.equal(getCurrentScene(unborn), null);
  assert.deepEqual(getMemories(unborn), []);
  assert.deepEqual(validateSave(copy(unborn)), unborn);
  let state = begin(unborn);
  assert.equal(unborn.status, 'unborn');
  assert.equal(state.age, 0);
  assert.equal(state.status, 'living');
  assert.equal(getCurrentScene(state).age, 0);
  assert.ok(getNextAge(state) > 0);
  assert.throws(() => begin(state), /already begun/);
  for (let year = 1; year <= 18; year++) {
    state = advance(state);
    assert.equal(state.age, year);
  }
  assert.equal(state.pending, 'college18');
  assert.equal(getCurrentScene(state).kind, 'decision');
  assert.equal(getNextAge(state), null);
  assert.deepEqual(advance(state, 85), state);
  const decided = choose(state, 'away');
  assert.equal(decided.age, 18);
  assert.equal(decided.pending, null);
  assert.equal(getCurrentScene(decided).kind, 'choice');
  assert.ok(getNextAge(decided) > 18);
});

test('the first paper route preserves private presence, three residences and negotiated later cohabitation', () => {
  const state = play(PAPER_A);
  const facts = state.facts;
  assert.equal(state.age, 85);
  assert.equal(state.choices.length, 5);
  assert.equal(facts.college, 'away');
  assert.equal(facts.city, '澄江');
  assert.deepEqual(new Set(facts.cities), new Set(['澄江', '岚城', '临港']));
  assert.equal(facts.closingPresence, true);
  assert.equal(facts.closingRecording, 'own');
  assert.equal(facts.filmStatus, 'draft');
  assert.equal(facts.kitchenRenovated, true);
  assert.equal(facts.northVisited, false);
  assert.equal(facts.homeChoice, 'try_home');
  assert.equal(facts.cohabit, true);
  assert.equal(facts.songCity, '澄江');
  assert.equal(getCurrentScene(state).kind, 'end');
});

test('the local paper route distinguishes raw recordings, a received video, a parted relationship and an unfinished work', () => {
  const state = play(PAPER_B);
  const facts = state.facts;
  assert.equal(state.choices.length, 6);
  assert.equal(facts.college, 'local');
  assert.equal(facts.city, '澄江');
  assert.deepEqual(facts.cities, ['澄江']);
  assert.equal(facts.closingPresence, false);
  assert.equal(facts.closingRecording, 'mother-video');
  assert.equal(facts.streetRecordCount, 13);
  assert.equal(facts.streetRecordOwner, 'joint');
  assert.equal(facts.xuStatus, 'parted');
  assert.equal(facts.classMode, 'monthly');
  assert.equal(facts.seaDays, 14);
  assert.equal(facts.soundWorkCompleted, false);
  assert.equal(facts.soundWorkSubmitted, false);
  assert.equal(facts.soundWorkExhibited, false);
  assert.equal(facts.missedExhibition, true);
  assert.equal(facts.archiveFormat, 'raw');
});

test('taking the other away options actually travels, submits a work and stays in the later city', () => {
  const state = play(['away', 'finish_film', 'together', 'north_trip', 'stay_city']);
  assert.equal(state.facts.closingPresence, false);
  assert.notEqual(state.facts.closingRecording, 'own');
  assert.equal(state.facts.filmStatus, 'screened');
  assert.equal(state.facts.northVisited, true);
  assert.ok(state.facts.visitedPlaces.length > 0);
  assert.equal(state.facts.cities.length, 3, 'a trip must not invent a fourth residence');
  assert.equal(state.facts.kitchenRenovated, false);
  assert.equal(state.facts.city, '临港');
  assert.equal(state.facts.songCity, '临港');
  assert.equal(state.facts.homeChoice, 'stay_city');
});

test('living separately is not overwritten into cohabitation by the late hometown scene', () => {
  const state = play(['away', 'return_home', 'separate', 'north_trip', 'try_home']);
  assert.equal(state.facts.cohabit, false);
  assert.equal(state.facts.city, '澄江');
  assert.equal(state.facts.songCity, '临港');
});

test('staying for university does not lock a person to the hometown or force the long-distance breakup', () => {
  const state = play(['local', 'with_parents', 'follow', 'expand', 'finish_work']);
  assert.equal(state.choices.some(choice => choice.eventId === 'xu_future42'), false);
  assert.equal(state.facts.movedForXu, true);
  assert.equal(state.facts.xuStatus, 'together');
  assert.equal(state.facts.city, '岚城');
  assert.deepEqual(new Set(state.facts.cities), new Set(['澄江', '岚城']));
  assert.equal(state.facts.closingPresence, true);
  assert.equal(state.facts.streetRecordOwner, 'zhouzhou');
  assert.notEqual(state.facts.streetRecordCount, 13);
  assert.equal(state.facts.seaDays, 3);
  assert.equal(state.facts.soundWorkCompleted, true);
  assert.equal(state.facts.soundWorkSubmitted, true);
  assert.equal(state.facts.soundWorkExhibited, false, 'submitting cannot silently become exhibition');
  assert.equal(state.facts.archiveFormat, 'finished');
});

test('reconsidering long distance at 42 can lead to a real trial move instead of the fixed paper breakup', () => {
  const state = play(['local', 'record_street', 'try_distance', 'trial_together', 'small_group', 'go_sea']);
  assert.equal(state.facts.xuStatus, 'together');
  assert.equal(state.facts.movedForXu, true);
  assert.equal(state.facts.city, '岚城');
  assert.ok(state.choices.some(choice => choice.eventId === 'xu_future42' && choice.choiceId === 'trial_together'));
});

test('a submission is remembered before a later screening has actually happened', () => {
  let state = choose(advance(begin(createGame()), 85), 'away');
  state = choose(advance(state, 85), 'finish_film');
  assert.equal(state.age, 29);
  assert.equal(state.facts.filmStatus, 'submitted');
  assert.equal(getMemories(state).some(memory => memory.id === 'film_reply'), false);
  state = advance(state);
  assert.equal(state.age, 30);
  assert.equal(state.facts.filmStatus, 'submitted');
  state = advance(state);
  assert.equal(state.age, 31);
  assert.equal(state.facts.filmStatus, 'screened');
  assert.ok(getMemories(state).some(memory => memory.id === 'film_reply'));
});

test('a later partner move and lifetime reflection are not awarded at the moment of deciding', () => {
  let state = begin(createGame());
  for (const id of PAPER_A.slice(0, 4)) state = choose(advance(state, 85), id);
  assert.equal(state.age, 55);
  const kitchen = getCurrentScene(state);
  assert.doesNotMatch(kitchen.memory || '', /这段人生后来|始终没|余生/);
  state = choose(advance(state, 85), 'try_home');
  assert.equal(state.age, 68);
  assert.equal(state.facts.city, '澄江');
  assert.equal(state.facts.songCity, '临港');
  assert.equal(getMemories(state).some(memory => memory.id === 'song_at_home'), false);
  state = advance(state, 2);
  assert.equal(state.age, 70);
  assert.equal(state.facts.songCity, '临港');
  state = advance(state);
  assert.equal(state.age, 71);
  assert.equal(state.facts.songCity, '澄江');
  assert.ok(getMemories(state).some(memory => memory.id === 'song_at_home'));
});

test('the engine and its display helpers never mutate the prior life or rewrite a past memory', () => {
  const before = advance(begin(createGame()), 85);
  const saved = copy(before);
  const choices = getChoices(before);
  assert.deepEqual(Object.keys(choices[0]).sort(), ['detail', 'id', 'label']);
  const next = choose(before, 'away');
  const initialLog = copy(next.log);
  const older = advance(next, 85);
  assert.deepEqual(before, saved);
  assert.deepEqual(next.log, initialLog);
  assert.deepEqual(older.log.slice(0, initialLog.length), initialLog);
  const memories = getMemories(older);
  for (const memory of memories) {
    const source = older.log.find(entry => entry.id === memory.sourceId);
    assert.ok(source && source.kind !== 'decision');
    assert.equal(memory.text, source.memory);
  }
  assert.equal(memories.some(memory => memory.id === older.pending), false);
  if (memories.length) memories[0].text = 'changed outside the engine';
  assert.notEqual(getMemories(older)[0]?.text, 'changed outside the engine');
  const scene = getCurrentScene(older);
  scene.title = 'changed outside the engine';
  assert.notEqual(getCurrentScene(older).title, scene.title);
});

test('every offered combination finishes with ordered facts and replayable actual memories', () => {
  const covered = new Set();
  let endings = 0;
  function visit(previous) {
    const state = advance(previous, 85);
    if (state.status === 'ended') {
      endings++;
      assert.equal(state.age, 85);
      assert.equal(state.pending, null);
      assert.deepEqual(validateSave(copy(state)), state);
      assert.deepEqual([...new Set(state.processed)], state.processed);
      const ages = state.log.map(entry => entry.age);
      assert.deepEqual(ages, [...ages].sort((a, b) => a - b));
      for (const memory of getMemories(state)) {
        assert.equal(state.log.find(entry => entry.id === memory.id)?.memory, memory.text);
      }
      return;
    }
    const choices = getChoices(state);
    assert.ok(state.pending && choices.length > 0);
    for (const choice of choices) {
      assert.ok(choice.label && typeof choice.detail === 'string');
      covered.add(`${state.pending}:${choice.id}`);
      visit(choose(state, choice.id));
    }
  }
  visit(begin(createGame()));
  assert.equal(endings, 40);
  assert.equal(covered.size, 20);
  assert.equal(new Set([...covered].map(key => key.split(':')[0])).size, 10);
});

test('saves restore a pending scene and reject invented facts, memories, dates or commands', () => {
  const pending = advance(begin(createGame()), 85);
  assert.deepEqual(validateSave(copy(pending)), pending);
  assert.deepEqual(validateSave(copy(begin(createGame()))).age, 0);
  for (const raw of [null, [], {}, 'save', { ...pending, version: 999 }, { ...pending, age: 19 }, { ...pending, pending: null }, { ...pending, extra: true }]) {
    assert.equal(validateSave(raw), null);
  }
  const inventedFacts = copy(pending);
  inventedFacts.facts.city = 'invented';
  assert.equal(validateSave(inventedFacts), null);
  const inventedMemory = copy(pending);
  inventedMemory.log[0].memory = 'an experience that did not happen';
  assert.equal(validateSave(inventedMemory), null);
  const unknown = copy(pending);
  unknown.commands.push({ type: 'choose', choiceId: 'not-a-choice' });
  assert.equal(validateSave(unknown), null);
  const extra = copy(pending);
  extra.commands[0].unexpected = true;
  assert.equal(validateSave(extra), null);
  const noOp = copy(pending);
  noOp.commands.push({ type: 'advance', years: 1 });
  assert.equal(validateSave(noOp), null, 'unrecorded no-op commands are not valid history');
  const excessive = copy(pending);
  excessive.commands = Array(251).fill({ type: 'begin' });
  assert.equal(validateSave(excessive), null);
});

test('invalid time and repeated decisions cannot pass time, duplicate outcomes or cross the end', () => {
  for (const value of [0, -1, 86, NaN, Infinity, 1.5, '1']) assert.throws(() => advance(begin(createGame()), value), RangeError);
  assert.throws(() => advance(createGame()), /Begin/);
  const before = advance(begin(createGame()), 85);
  const after = choose(before, 'away');
  assert.throws(() => choose(after, 'local'), /no decision/);
  assert.throws(() => choose(before, 'not-a-choice'), /Unavailable/);
  const end = play(PAPER_A);
  assert.deepEqual(advance(end, 85), end);
  assert.deepEqual(getChoices(end), []);
  assert.equal(getNextAge(end), null);
  assert.throws(() => choose(end, 'away'), /no decision/);
});
