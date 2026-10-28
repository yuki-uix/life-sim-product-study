import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getChoices, choose, getOutcome, validateSave } from '../dist/fridays/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const play = choices => choices.reduce((state, choice) => choose(state, choice), createGame());
const ready = (prep = ['preview', 'room'], first = ['picture', 'pause']) => play([...first, 'return', ...prep]);
const finish = ({ prep = ['preview', 'room'], first = ['picture', 'pause'], film = 'feature', seats = 'rows', door = 'recap' } = {}) => play([...first, 'return', ...prep, film, seats, door]);

test('the slice has exactly two preparations and ends after eight meaningful decisions', () => {
  const state = finish();
  assert.equal(state.stage, 'ending');
  assert.equal(state.history.length, 8);
  assert.deepEqual(state.prep, ['preview', 'room']);
  assert.deepEqual(getChoices(state), []);
  assert.throws(() => choose(state, 'return'), /Unavailable/);
  assert.equal(getOutcome(createGame()), null);
});

test('choices produce a new state and a chronological replayable record', () => {
  const before = createGame();
  const snapshot = copy(before);
  const after = choose(before, 'welcome');
  assert.deepEqual(before, snapshot);
  assert.equal(after.stage, 'first_door');
  assert.equal(after.first.help, 'welcome');
  assert.deepEqual(after.history, [{ stage: 'arrival', choiceId: 'welcome' }]);
  assert.notEqual(after.first, before.first);
});

test('practice unlocks a new way to handle the same situation without removing basic methods', () => {
  const plain = ready(['ahe', 'linye']);
  const practiced = ready(['preview', 'room']);
  assert.deepEqual(getChoices(choose(plain, 'feature')), ['rows', 'circle']);
  assert.deepEqual(getChoices(choose(practiced, 'feature')), ['rows', 'circle', 'arc']);
  const plainDoor = choose(choose(plain, 'feature'), 'rows');
  const practiceDoor = choose(choose(practiced, 'feature'), 'rows');
  assert.deepEqual(getChoices(plainDoor), ['pause', 'side', 'handoff', 'message']);
  assert.deepEqual(getChoices(practiceDoor), ['pause', 'side', 'recap']);
  assert.throws(() => choose(plainDoor, 'recap'));
  assert.throws(() => choose(choose(plain, 'feature'), 'arc'));
});

test('each preparation uses the actual free period and cannot be repeated or retroactively changed', () => {
  let state = play(['picture', 'quiet', 'return', 'preview']);
  assert.equal(state.stage, 'prep_two');
  assert.equal(getChoices(state).includes('preview'), false);
  assert.throws(() => choose(state, 'preview'));
  state = choose(state, 'linye');
  assert.equal(state.stage, 'film');
  assert.throws(() => choose(state, 'ahe'));
});

test('first Friday welcome makes Ahe help point out a seat so Xiaoman can stay seated next week', () => {
  const unknown = getOutcome(finish({ first: ['picture', 'quiet'], door: 'side' }));
  const recognized = getOutcome(finish({ first: ['welcome', 'quiet'], door: 'side' }));
  assert.equal(unknown.room.xiaoman, 'door');
  assert.equal(recognized.room.xiaoman, 'seated');
  assert.equal(unknown.room.you, 'door');
  assert.equal(unknown.room.linye, 'door', 'the 20:50 hallway conversation has both speakers in the hallway');
  assert.equal(recognized.room.you, 'seated');
  assert.notEqual(unknown.key, recognized.key);
});

test('last week’s first conversation changes whether the same informal room draws Linye into speaking', () => {
  const options = { film: 'shorts', seats: 'circle', door: 'side' };
  const listened = getOutcome(finish({ ...options, first: ['welcome', 'pause'] }));
  const watched = getOutcome(finish({ ...options, first: ['welcome', 'quiet'] }));
  assert.equal(listened.room.linye, 'talking');
  assert.equal(watched.room.linye, 'seated');
  assert.equal(listened.room.xiaoman, watched.room.xiaoman);
});

test('a familiar preference provides a quiet invitation, not a forced public speech', () => {
  const familiar = getOutcome(finish({ prep: ['ahe', 'room'], film: 'shorts', seats: 'arc', door: 'handoff' }));
  const unfamiliar = getOutcome(finish({ prep: ['preview', 'room'], film: 'shorts', seats: 'arc', door: 'recap' }));
  assert.equal(familiar.room.ahe, 'talking');
  assert.equal(unfamiliar.room.ahe, 'seated');
  assert.equal(familiar.room.xiaoman, 'seated');
  assert.match(familiar.paragraphs.join(''), /没让阿禾/);
});

test('different valid room arrangements serve viewing or conversation without a score', () => {
  const movie = getOutcome(finish());
  const conversation = getOutcome(finish({ film: 'shorts', seats: 'arc' }));
  assert.equal(movie.room.linye, 'seated');
  assert.equal(conversation.room.linye, 'talking');
  assert.notEqual(movie.title, conversation.title);
  assert.equal('score' in movie, false);
  assert.equal('score' in conversation, false);
  assert.ok(movie.next.length > 0 && conversation.next.length > 0);
});

test('every reachable film, seating and arrival combination yields coherent, finite outcomes', () => {
  let cases = 0;
  for (const help of ['picture', 'welcome']) for (const response of ['pause', 'quiet']) {
    for (const prepOne of ['preview', 'room', 'ahe', 'linye']) for (const prepTwo of ['preview', 'room', 'ahe', 'linye'].filter(id => id !== prepOne)) {
      for (const film of ['feature', 'shorts']) {
        const beforeSeats = choose(ready([prepOne, prepTwo], [help, response]), film);
        for (const seats of getChoices(beforeSeats)) {
          const beforeDoor = choose(beforeSeats, seats);
          for (const door of getChoices(beforeDoor)) {
            const state = choose(beforeDoor, door);
            const outcome = getOutcome(state);
            assert.ok(outcome.title && outcome.key);
            assert.ok(outcome.paragraphs.every(item => typeof item === 'string' && item.length > 0));
            assert.ok(outcome.paragraphs.length <= 4);
            assert.ok(outcome.next.length <= 2);
            assert.ok(['seated', 'talking', 'door'].includes(outcome.room.you));
            assert.ok(['seated', 'door'].includes(outcome.room.xiaoman));
            assert.ok(['seated', 'talking', 'left'].includes(outcome.room.ahe));
            assert.ok(['seated', 'talking', 'door'].includes(outcome.room.linye));
            assert.deepEqual(validateSave(state), state);
            cases++;
          }
        }
      }
    }
  }
  assert.equal(cases, 816);
});

test('saves resume from valid decisions and reject invented state, out-of-order choices and unsafe shapes', () => {
  const partial = ready();
  assert.deepEqual(validateSave(copy(partial)), partial);
  assert.deepEqual(validateSave(createGame()), createGame());
  for (const malformed of [null, [], {}, 'save', { ...partial, version: 99 }, { ...partial, extra: true }, { ...partial, stage: 'ending' }, { ...partial, prep: ['ahe', 'linye'] }, { ...partial, plan: { ...partial.plan, door: 'recap' } }]) {
    assert.equal(validateSave(malformed), null);
  }
  const reordered = copy(partial);
  [reordered.history[0], reordered.history[1]] = [reordered.history[1], reordered.history[0]];
  assert.equal(validateSave(reordered), null);
  const duplicate = copy(partial);
  duplicate.history[4].choiceId = duplicate.history[3].choiceId;
  assert.equal(validateSave(duplicate), null);
  const long = copy(partial);
  long.history = Array(100).fill({ stage: 'arrival', choiceId: 'picture' });
  assert.equal(validateSave(long), null);
  const extraEvent = copy(partial);
  extraEvent.history[0].unexpected = true;
  assert.equal(validateSave(extraEvent), null);
});
