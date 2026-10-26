import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setFocus, advanceDays, getChoices, choose, toggleFavorite, validateSave, getSummary } from '../dist/calendar-engine.js';
import { CONFIG, FOCUSES, CALENDAR_LOGS, STORIES, AFTER_LOGS, dateInfo } from '../dist/calendar-content.js';

const copy = value => JSON.parse(JSON.stringify(value));
function finish(game, select = () => null) {
  let state = game;
  while (state.phase !== 'ended') {
    if (state.pending) {
      const choices = getChoices(state).filter(choice => choice.enabled);
      state = choose(state, select(state, choices) || choices.at(-1).id);
    } else state = advanceDays(state, CONFIG.totalDays);
  }
  return state;
}
function atStory(focus, id) {
  let state = setFocus(createGame(), focus);
  while (state.phase !== 'ended' && state.pending?.storyId !== id) {
    if (state.pending) state = choose(state, getChoices(state).filter(item => item.enabled).at(-1).id);
    else state = advanceDays(state);
  }
  assert.equal(state.pending?.storyId, id);
  return state;
}

test('calendar advances without any choice, while changing a focus neither passes time nor awards a result', () => {
  const initial = createGame();
  let state = initial;
  for (let i = 0; i < 30; i += 1) state = setFocus(state, FOCUSES[i % FOCUSES.length].id);
  assert.equal(state.day, 0);
  assert.deepEqual(state.focusDays, initial.focusDays);
  assert.deepEqual(state.skills, initial.skills);
  assert.deepEqual(state.events, initial.events);
  assert.deepEqual(state.favorites, []);
  const advanced = advanceDays(state, 10);
  assert.equal(advanced.day, 10);
  assert.equal(advanced.resolvedStories.length, 0);
  assert.equal(Object.values(advanced.focusDays).reduce((sum, n) => sum + n, 0), 10);
  assert.equal(initial.day, 0, 'reducers preserve their input');
});

test('daily life produces sparse records, not daily rewards or mandatory memories', () => {
  const state = advanceDays(createGame(), 20);
  assert.equal(state.day, 20);
  assert.ok(state.events.length < state.day / 2);
  assert.ok(state.events.some(event => event.kind === 'daily'));
  assert.equal(state.events.some(event => event.kind === 'story'), false);
  assert.equal('memories' in state, false);
  assert.deepEqual(state.favorites, []);
});

test('weekly prose reflects the majority of actual days, not a focus changed on the final day', () => {
  let state = advanceDays(createGame(), 6);
  state = setFocus(state, 'club');
  state = advanceDays(state, 1);
  const weekly = state.events.find(event => event.day === 7 && event.kind === 'daily');
  assert.equal(weekly.focusId, 'easy');
  assert.deepEqual(state.focusDays, { easy: 6, club: 1, walk: 0, friends: 0 });
});

test('abilities come from time spent, and meeting a companion happens only once', () => {
  let state = setFocus(createGame(), 'walk');
  state = advanceDays(state, 6);
  assert.equal(state.skills.record, 0);
  assert.equal(state.peopleMet.includes('linye'), false);
  state = advanceDays(state);
  assert.equal(state.skills.record, 1);
  assert.equal(state.peopleMet.includes('linye'), true);
  state = advanceDays(state, 11);
  assert.equal(state.skills.record, 2);
  assert.equal(state.events.filter(event => event.kind === 'meeting' && event.personId === 'linye').length, 1);
  assert.equal(state.peopleMet.includes('xiaoman'), false);
});

test('fast advance stops exactly at a conditional invitation and time cannot pass until answered', () => {
  const state = advanceDays(setFocus(createGame(), 'club'), CONFIG.totalDays);
  assert.equal(state.day, 24);
  assert.equal(state.pending.storyId, 'club_screen');
  assert.deepEqual(advanceDays(state, CONFIG.totalDays), state);
  assert.throws(() => setFocus(state, 'walk'), { code: 'pending_story' });
  const revision = state.revision;
  const result = choose(state, 'screen_leave', revision);
  assert.equal(result.day, state.day);
  assert.equal(result.pending, null);
  assert.equal(result.flags.screenHelped, undefined);
  assert.equal(result.events.at(-1).kind, 'story');
  assert.throws(() => choose(result, 'screen_help', revision), { code: 'stale_revision' });
  assert.throws(() => choose(result, 'screen_help'), { code: 'no_pending_story' });
});

test('a quiet life passes the conditional windows and still reaches the end', () => {
  let state = advanceDays(createGame(), CONFIG.totalDays);
  assert.equal(state.day, 60);
  assert.equal(state.pending.storyId, 'lights_out');
  assert.deepEqual(state.skills, { record: 0, organize: 0 });
  state = choose(state, 'lights_rest');
  state = advanceDays(state, CONFIG.totalDays);
  assert.equal(state.phase, 'ended');
  assert.equal(state.day, 90);
  assert.deepEqual(state.resolvedStories, ['lights_out']);
  assert.equal(state.events.some(event => event.contentId === 'screen_next_time'), false);
  assert.deepEqual(advanceDays(state, 1), state);
  assert.throws(() => setFocus(state, 'walk'), { code: 'game_ended' });
});

test('different sustained habits produce different opportunities and available participation methods', () => {
  const club = atStory('club', 'club_screen');
  assert.equal(getChoices(club).find(choice => choice.id === 'screen_help').enabled, true);
  assert.equal(club.skills.organize >= 1, true);
  assert.equal(club.skills.record, 0);
  const walk = atStory('walk', 'lake_photo');
  assert.equal(getChoices(walk).find(choice => choice.id === 'photo_same_place').enabled, true);
  assert.equal(walk.skills.record >= 1, true);
  assert.equal(walk.resolvedStories.includes('club_screen'), false);
  assert.ok(walk.events.some(event => event.kind === 'meeting' && event.personId === 'linye'));
});

test('later echoes refer to actual choices, and declining an invitation does not fabricate participation', () => {
  const before = atStory('club', 'club_screen');
  const helped = advanceDays(choose(before, 'screen_help'), 21);
  const left = advanceDays(choose(before, 'screen_leave'), 21);
  const echo = helped.events.find(event => event.contentId === 'screen_next_time');
  assert.ok(echo);
  assert.equal(left.events.some(event => event.contentId === 'screen_next_time'), false);
  const source = helped.events.find(event => event.id === echo.sourceEventIds[0]);
  assert.equal(source.choiceId, 'screen_help');
  assert.equal(source.flagsAdded.screenHelped, true);
});

test('save restoration retains text snapshots, and a restored day is not settled a second time', () => {
  let state = advanceDays(setFocus(createGame(), 'walk'), 17);
  state.events[1].text = '过去保存下来的那句话。';
  const check = validateSave(JSON.stringify(state));
  assert.equal(check.valid, true);
  assert.equal(check.state.events[1].text, state.events[1].text);
  const a = advanceDays(state, 3);
  const b = advanceDays(check.state, 3);
  assert.deepEqual(a, b);
  assert.equal(new Set(b.events.map(event => event.id)).size, b.events.length);
});

test('save validation rejects forged dates, abilities, companions, stories and event facts', () => {
  const state = advanceDays(setFocus(createGame(), 'walk'), 10);
  for (const mutate of [
    value => { value.day += 1; },
    value => { value.skills.record = 3; },
    value => { value.focusDays.walk = 99; },
    value => { value.peopleMet.push('xiaoman'); },
    value => { value.flags.screenHelped = true; },
    value => { value.pending = { storyId: 'club_screen' }; },
    value => { value.events[0].day = 88; },
    value => { value.commands[0].unexpected = true; },
    value => { value.events.push(copy(value.events[0])); },
  ]) {
    const forged = copy(state);
    mutate(forged);
    assert.equal(validateSave(forged).valid, false);
  }
  assert.equal(validateSave('{broken').valid, false);
  assert.equal(validateSave({ schemaVersion: 3 }).valid, false);
});

test('favorites are selected from actual records and do not change life progression', () => {
  const state = advanceDays(createGame(), 7);
  const favorite = toggleFavorite(state, state.events.at(-1).id);
  assert.deepEqual(favorite.skills, state.skills);
  assert.equal(favorite.day, state.day);
  assert.equal(favorite.revision, state.revision);
  assert.equal(getSummary(favorite).favorites.length, 1);
  assert.deepEqual(toggleFavorite(favorite, state.events.at(-1).id), state);
  assert.throws(() => toggleFavorite(state, 'not-lived'), { code: 'unknown_event' });
});

test('calendar boundaries and malformed time inputs are explicit', () => {
  assert.equal(dateInfo(0).label, '9月1日');
  assert.equal(dateInfo(29).label, '9月30日');
  assert.equal(dateInfo(30).label, '10月1日');
  assert.equal(dateInfo(60).label, '10月31日');
  assert.equal(dateInfo(61).label, '11月1日');
  assert.equal(dateInfo(90).label, '11月30日');
  for (const count of [-1, 0, 0.5, Infinity, NaN, 92, '1']) assert.throws(() => advanceDays(createGame(), count), { code: 'invalid_time' });
  assert.throws(() => setFocus(createGame(), 'unknown'), { code: 'unknown_focus' });
  const ended = finish(createGame());
  assert.equal(ended.day, CONFIG.totalDays - 1);
  assert.equal(ended.focusDays.easy, 90);
});

test('all three story routes and authored echoes can occur in one coherent autumn', () => {
  let state = atStory('club', 'club_screen');
  state = choose(state, 'screen_help');
  state = setFocus(state, 'walk');
  state = advanceDays(state, CONFIG.totalDays);
  assert.equal(state.pending.storyId, 'lake_photo');
  state = choose(state, 'photo_same_place');
  state = advanceDays(state, CONFIG.totalDays);
  assert.equal(state.pending.storyId, 'lights_out');
  state = choose(state, 'lights_talk');
  state = advanceDays(state, CONFIG.totalDays);
  assert.equal(state.phase, 'ended');
  assert.deepEqual(state.resolvedStories, STORIES.map(story => story.id));
  assert.equal(AFTER_LOGS.every(log => state.events.some(event => event.contentId === log.id)), true);
  assert.equal(CALENDAR_LOGS.every(log => state.events.some(event => event.contentId === log.id)), true);
  assert.equal(validateSave(state).valid, true);
});

test('every combination of story choices finishes without a forced reward or dead end', () => {
  let routes = 0;
  for (const first of STORIES[0].choices) {
    for (const second of STORIES[1].choices) {
      for (const third of STORIES[2].choices) {
        let state = choose(atStory('club', 'club_screen'), first.id);
        state = advanceDays(setFocus(state, 'walk'), CONFIG.totalDays);
        state = choose(state, second.id);
        state = advanceDays(state, CONFIG.totalDays);
        state = choose(state, third.id);
        state = advanceDays(state, CONFIG.totalDays);
        assert.equal(state.phase, 'ended');
        assert.deepEqual(state.favorites, []);
        assert.equal(validateSave(state).valid, true);
        routes += 1;
      }
    }
  }
  assert.equal(routes, 27);
});
