import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, choose, getChoices, getForecast, getOutcome, validateSave } from '../dist/fridays/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const play = choices => choices.reduce((state, id) => choose(state, id), createGame());
const calendar = (intro, activities) => play([intro, ...activities]);
const curation = () => calendar('watch', ['watch', 'curate_daily', 'watch', 'ahe', 'linye', 'rest']);
const roomPlan = (friends = ['linye', 'linye', 'rest']) => calendar('help', ['practice', 'open_trial', 'practice', ...friends]);
const collaboration = () => calendar('watch', ['watch', 'practice', 'practice', 'ahe', 'linye', 'rest']);
const finish = (state, route, decisions) => decisions.reduce((current, id) => choose(current, id), choose(state, route));

test('one free block advances exactly one consecutive date, with the same day available until chosen', () => {
  const start = createGame(), snapshot = copy(start);
  const saturday = choose(start, 'help');
  assert.deepEqual(start, snapshot);
  assert.equal(saturday.phase, 'schedule'); assert.equal(saturday.day, 1);
  assert.deepEqual(saturday.skills, { content: 0, hands: 1 });
  let state = saturday;
  for (let day = 1; day <= 6; day++) {
    assert.equal(state.day, day); assert.equal(state.phase, 'schedule');
    const before = copy(state); state = choose(state, 'rest');
    assert.deepEqual(before.skills, state.skills);
  }
  assert.equal(state.phase, 'friday'); assert.equal(state.day, 7);
  assert.deepEqual(getChoices(state), ['audience']);
});

test('repeated daily practice reaches a new kind of activity at level two, and a real work must be made', () => {
  let state = choose(createGame(), 'watch');
  assert.equal(getChoices(state).includes('curate_daily'), false);
  state = choose(state, 'watch');
  assert.equal(getChoices(state).includes('curate_daily'), true);
  const made = choose(state, 'curate_strange');
  assert.equal(made.works.theme, 'strange'); assert.equal(made.skills.content, 3);
  const trainedOnly = calendar('watch', ['watch', 'watch', 'watch', 'rest', 'rest', 'rest']);
  assert.equal(trainedOnly.skills.content, 4);
  assert.equal(getChoices(trainedOnly).includes('curator'), false, 'a high number alone cannot substitute a playlist');
  assert.equal(getChoices(curation()).includes('curator'), true);
  let hands = choose(createGame(), 'help');
  assert.equal(getChoices(hands).includes('open_trial'), false);
  hands = choose(hands, 'practice');
  assert.equal(getChoices(hands).includes('open_trial'), true);
  hands = choose(hands, 'open_trial');
  assert.equal(hands.works.roomTested, true); assert.equal(hands.skills.hands, 3);
});

test('six afternoons impose an actual planning limit: both level-four specialisms cannot fit', () => {
  const curator = curation(), room = roomPlan(), balanced = collaboration();
  assert.equal(getChoices(curator).includes('curator'), true);
  assert.equal(getChoices(curator).includes('open_room'), false);
  assert.equal(getChoices(room).includes('open_room'), true);
  assert.equal(getChoices(room).includes('curator'), false);
  assert.equal(getChoices(balanced).includes('cohost'), true);
  assert.ok(balanced.skills.content + balanced.skills.hands <= 7);
  // Even assigning every available point to skills gives at most seven, below 4+4.
  const allSkillPoints = calendar('watch', ['watch', 'curate_daily', 'watch', 'practice', 'practice', 'open_trial']);
  assert.equal(allSkillPoints.skills.content + allSkillPoints.skills.hands, 7);
  assert.equal(getChoices(allSkillPoints).includes('curator') && getChoices(allSkillPoints).includes('open_room'), false);
});

test('forecasts expose the exact unmet requirement before the final route choice', () => {
  const state = choose(createGame(), 'watch');
  const forecasts = getForecast(state);
  assert.deepEqual(forecasts.map(item => item.id), ['curator', 'open_room', 'cohost', 'private']);
  assert.equal(forecasts[0].available, false);
  assert.deepEqual(forecasts[0].requirements[0], { label: '选片熟练', current: 1, target: 4, met: false });
  assert.equal(forecasts[0].requirements[1].current, 0);
  assert.equal(getForecast(curation()).find(item => item.id === 'curator').available, true);
});

test('the same finished playlist can miss its goal when a long movie starts after the late class', () => {
  const state = curation();
  const early = getOutcome(finish(state, 'curator', ['feature', 'early']));
  const late = getOutcome(finish(state, 'curator', ['feature', 'late']));
  const shortLate = getOutcome(finish(state, 'curator', ['two_shorts', 'late']));
  assert.equal(early.finished, true); assert.equal(early.watchedMinutes, 82);
  assert.equal(late.finished, false); assert.equal(late.watchedMinutes, 65);
  assert.equal(shortLate.finished, true); assert.equal(shortLate.watchedMinutes, 32);
  assert.equal(late.artifact, 'playlist'); assert.equal(late.guests, 4);
  assert.deepEqual(late.sharedWith, ['xiaoman', 'ahe', 'linye']);
  assert.ok(early.conditions.some(text => text.includes('30分钟以后的内容')));
  assert.ok(late.conditions.some(text => text.includes('一起从开头看')));
});

test('repeated contact changes what a friend actively does, rather than only unlocking a different line', () => {
  const known = roomPlan(['linye', 'rest', 'rest']);
  const close = roomPlan();
  const small = getOutcome(finish(known, 'open_room', ['quiet_corner', 'sit_with_friends']));
  const helped = getOutcome(finish(close, 'open_room', ['quiet_corner', 'sit_with_friends']));
  const busy = getOutcome(finish(known, 'open_room', ['chat_corner', 'welcome_all']));
  assert.equal(small.guests, 3); assert.equal(helped.guests, 6);
  assert.equal(helped.finished, true); assert.equal(helped.watchedMinutes, 32);
  assert.equal(helped.room.linye, 'door'); assert.equal(helped.room.you, 'seated');
  assert.equal(busy.guests, 6); assert.equal(busy.finished, false); assert.equal(busy.watchedMinutes, 14);
  assert.equal(busy.room.you, 'door');
});

test('cooperation owns one task, and choosing a bigger evening sacrifices actual viewing time', () => {
  const state = collaboration();
  const large = getOutcome(finish(state, 'cohost', ['make_playlist', 'big_room']));
  const small = getOutcome(finish(state, 'cohost', ['run_projector', 'small_room']));
  assert.equal(large.ownedTask, '选片与小满合作'); assert.equal(large.artifact, 'playlist');
  assert.equal(small.ownedTask, '现场与小满合作'); assert.equal(small.artifact, 'room');
  assert.equal(large.guests, 6); assert.equal(large.watchedMinutes, 14); assert.equal(large.finished, false);
  assert.equal(small.guests, 3); assert.equal(small.watchedMinutes, 32); assert.equal(small.finished, true);
});

test('friends can suggest a different location and social ending without hosting any public event', () => {
  const state = calendar('watch', ['ahe', 'ahe', 'rest', 'rest', 'rest', 'rest']);
  assert.equal(getChoices(state).includes('private'), true);
  const result = getOutcome(finish(state, 'private', ['private_feature']));
  assert.equal(result.artifact, 'dorm'); assert.equal(result.guests, 2); assert.equal(result.ownedTask, '朋友相处');
  assert.equal(result.watchedMinutes, 82); assert.equal(result.finished, true);
  assert.deepEqual(result.sharedWith, ['ahe']); assert.equal(result.room.xiaoman, 'left');
});

test('no preparation still leaves a complete audience evening with a real choice between film and supper', () => {
  const state = calendar('watch', Array(6).fill('rest'));
  const movie = getOutcome(finish(state, 'audience', ['sit_front', 'stay_credits']));
  const supper = getOutcome(finish(state, 'audience', ['sit_back', 'leave_with_ahe']));
  assert.equal(movie.artifact, 'ticket'); assert.equal(movie.finished, true); assert.equal(movie.watchedMinutes, 82);
  assert.equal(supper.finished, false); assert.equal(supper.watchedMinutes, 60);
  assert.deepEqual(movie.sharedWith, ['xiaoman']); assert.deepEqual(supper.sharedWith, ['ahe']);
  assert.equal(supper.room.ahe, 'talking'); assert.equal(supper.room.you, 'talking');
});

test('choices remain finite and immutable, and terminal state cannot be advanced', () => {
  const state = curation(), snapshot = copy(state);
  const next = choose(state, 'curator');
  assert.deepEqual(state, snapshot); assert.equal(next.phase, 'scene'); assert.deepEqual(next.finale, []);
  assert.deepEqual(getChoices(next), ['feature', 'two_shorts']);
  assert.throws(() => choose(next, 'open_room'));
  const ended = choose(choose(next, 'feature'), 'early');
  assert.equal(ended.phase, 'ending'); assert.deepEqual(getChoices(ended), []);
  assert.throws(() => choose(ended, 'watch')); assert.equal(getOutcome(state), null);
  const repeated = calendar('watch', Array(6).fill('watch'));
  assert.equal(repeated.skills.content, 4);
});

test('strict replay resumes partial plans but rejects forged experience, skipped dates and old saves', () => {
  const state = curation(), ended = finish(state, 'curator', ['feature', 'late']);
  for (const valid of [createGame(), choose(createGame(), 'help'), state, choose(state, 'curator'), ended]) assert.deepEqual(validateSave(copy(valid)), valid);
  for (const bad of [null, [], {}, { ...state, version: 1 }, { ...state, extra: true }, { ...state, day: 6 }, { ...state, route: 'private' }, { ...state, skills: { content: 4, hands: 4 } }, { ...state, works: { theme: 'strange', roomTested: true } }]) assert.equal(validateSave(bad), null);
  const skipped = copy(state); skipped.history[2].day++;
  assert.equal(validateSave(skipped), null);
  const forged = copy(state); forged.history[1].choiceId = 'curate_daily';
  assert.equal(validateSave(forged), null);
  const long = copy(state); long.history = Array(11).fill(long.history[0]);
  assert.equal(validateSave(long), null);
  const extra = copy(state); extra.history[0].extra = true;
  assert.equal(validateSave(extra), null);
});
