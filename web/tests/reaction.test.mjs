import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/calendar-engine.js';
import * as v6 from '../dist/calendar-engine-v6.js';
import * as v5 from '../dist/calendar-engine-v5.js';
import * as v4 from '../dist/calendar-engine-v4.js';

const copy = value => JSON.parse(JSON.stringify(value));
const relation = (state, personId) => engine.getRelationships(state).find(item => item.id === personId);
function finish(state, api = engine) {
  for (let guard = 0; state.phase !== 'ended' && guard < 20; guard++) {
    state = state.pending ? api.choose(state, api.getChoices(state).filter(item => item.enabled).at(-1).id) : api.advanceDays(state, 91);
  }
  assert.equal(state.phase, 'ended');
  return state;
}
function clubInvitation(days) {
  let state = engine.createGame();
  if (days < 24) state = engine.advanceDays(state, 24 - days);
  return engine.advanceDays(engine.setFocus(state, 'club'), days);
}
function laterScreen(firstChoice, api = engine) {
  let state = api.advanceDays(api.setFocus(api.createGame(), 'club'), 7);
  state = api.startProject(state, 'host_screen', 'curate');
  state = api.advanceDays(state, 91);
  assert.equal(state.pending.storyId, 'club_screen');
  state = api.choose(state, firstChoice);
  state = api.setPractice(state, 'organize', 'curate');
  state = api.advanceDays(state, 91);
  assert.equal(state.pending.storyId, 'own_screen');
  return state;
}
function photoFollowup(styleId, choiceId) {
  let state = engine.advanceDays(engine.setFocus(engine.createGame(), 'walk'), 7);
  state = engine.startProject(state, 'photo_set', styleId);
  state = engine.advanceDays(state, 91);
  state = engine.choose(state, choiceId);
  return engine.advanceDays(state, 91);
}

test('every authored interpersonal choice leaves one response tied to that person and the prior history', () => {
  let circle = engine.advanceDays(engine.setFocus(engine.createGame(), 'club'), 7);
  circle = engine.startProject(circle, 'host_screen', 'connect');
  circle = engine.advanceDays(circle, 91);
  circle = engine.advanceDays(engine.choose(circle, 'screen_help'), 91);
  const scenes = [
    clubInvitation(24),
    engine.advanceDays(engine.setFocus(engine.createGame(), 'walk'), 91),
    engine.advanceDays(engine.createGame(), 91),
    photoFollowup('observe', 'photo_same_place'),
    photoFollowup('listen', 'photo_walk'),
    laterScreen('screen_help'),
    circle,
  ];
  const storyIds = new Set(); let choicesSeen = 0;
  for (const before of scenes) {
    storyIds.add(before.pending.storyId);
    for (const choice of engine.getChoices(before).filter(item => item.enabled)) {
      const after = engine.choose(before, choice.id), event = after.events.at(-1);
      assert.ok(event.reaction?.text.trim(), choice.id);
      assert.ok(event.reaction.variant, choice.id);
      assert.equal(event.reaction.context.sourceEventIds.every(id => before.events.some(item => item.id === id)), true);
      assert.equal(event.reaction.context.sourceEventIds.includes(event.id), false);
      assert.equal(after.events.length, before.events.length + 1);
      assert.equal(engine.validateSave(after).valid, true);
      choicesSeen++;
    }
  }
  assert.equal(storyIds.size, 7); assert.equal(choicesSeen, 21);
});

test('the same choice receives a different response after different real daily contact', () => {
  const less = clubInvitation(10), more = clubInvitation(24);
  assert.equal(less.day, more.day);
  assert.equal(less.pending.storyId, 'club_screen');
  const a = engine.choose(less, 'screen_help'), b = engine.choose(more, 'screen_help');
  const ra = a.events.at(-1).reaction, rb = b.events.at(-1).reaction;
  assert.equal(ra.personId, 'xiaoman'); assert.equal(rb.personId, 'xiaoman');
  assert.equal(ra.context.familiarityDays, 10); assert.equal(rb.context.familiarityDays, 24);
  assert.notEqual(ra.variant, rb.variant); assert.notEqual(ra.text, rb.text);
  assert.equal(ra.context.cooperation, 0); assert.equal(rb.context.cooperation, 0);
  assert.equal(relation(a, 'xiaoman').cooperation, 1, 'this interaction matters only after its response was selected');
  assert.deepEqual(a.events.slice(0, -1), less.events);
});

test('the roommate reacts to shared daily life rather than calendar age alone', () => {
  const quiet = engine.advanceDays(engine.createGame(), 60);
  const together = engine.advanceDays(engine.setFocus(engine.createGame(), 'friends'), 60);
  assert.equal(quiet.day, together.day);
  const a = engine.choose(quiet, 'lights_talk').events.at(-1).reaction;
  const b = engine.choose(together, 'lights_talk').events.at(-1).reaction;
  assert.equal(a.personId, 'ahe'); assert.equal(b.personId, 'ahe');
  assert.equal(a.context.familiarityDays, 0); assert.equal(b.context.familiarityDays, 60);
  assert.notEqual(a.variant, b.variant); assert.notEqual(a.text, b.text);
});

test('equal skill and club time do not replace actual cooperation when handing over the room key', () => {
  const helped = laterScreen('screen_help'), watched = laterScreen('screen_watch');
  assert.equal(helped.day, watched.day);
  assert.deepEqual(helped.focusDays, watched.focusDays);
  assert.deepEqual(helped.skills, watched.skills);
  assert.deepEqual(helped.practiceDays, watched.practiceDays);
  assert.equal(relation(helped, 'xiaoman').familiarityDays, relation(watched, 'xiaoman').familiarityDays);
  assert.equal(relation(helped, 'xiaoman').cooperation, 1);
  assert.equal(relation(watched, 'xiaoman').cooperation, 0);
  const eligible = engine.getChoices(helped).find(item => item.id === 'own_screen_lead');
  const ineligible = engine.getChoices(watched).find(item => item.id === 'own_screen_lead');
  assert.equal(eligible.enabled, true); assert.equal(ineligible.enabled, false);
  assert.equal(ineligible.reasonCode, 'missing_cooperation');
  assert.throws(() => engine.choose(watched, ineligible.id), {code:'missing_cooperation'});
  assert.equal(engine.getChoices(watched).find(item => item.id === 'own_screen_together').enabled, true);
  const result = engine.choose(helped, eligible.id);
  assert.equal(result.events.at(-1).reaction.context.cooperation, 1);
  assert.equal(finish(result).phase, 'ended');
});

test('a later history of caring for the room opens a new cooperation path after initially only watching', () => {
  function practiced(days) {
    let state = engine.advanceDays(engine.setFocus(engine.createGame(), 'club'), 7);
    state = engine.startProject(state, 'host_screen', 'curate');
    state = engine.advanceDays(state, 91);
    state = engine.choose(state, 'screen_watch');
    state = engine.setPractice(state, 'organize', 'connect');
    state = engine.advanceDays(state, days);
    state = engine.setPractice(state, 'organize', 'curate');
    state = engine.advanceDays(state, 91);
    assert.equal(state.pending.storyId, 'own_screen');
    return state;
  }
  const learning = practiced(11), experienced = practiced(12);
  assert.equal(learning.day, experienced.day);
  assert.equal(learning.flags.screenHelped, undefined);
  assert.equal(experienced.flags.screenHelped, undefined);
  assert.equal(relation(learning, 'xiaoman').cooperation, 0);
  assert.equal(relation(experienced, 'xiaoman').cooperation, 1);
  assert.equal(engine.getChoices(learning).find(item => item.id === 'own_screen_lead').enabled, false);
  assert.equal(engine.getChoices(experienced).find(item => item.id === 'own_screen_lead').enabled, true);
});

test('both responses of later scenes remain reachable through real histories despite their high skill requirements', () => {
  function clubFollowup(firstChoice, styleId, extraConnectDays = 0) {
    let state = engine.advanceDays(engine.setFocus(engine.createGame(), 'club'), 7);
    state = engine.startProject(state, 'host_screen', 'curate');
    state = engine.advanceDays(state, 91);
    state = engine.choose(state, firstChoice);
    if (extraConnectDays) {
      state = engine.setPractice(state, 'organize', 'connect');
      state = engine.advanceDays(state, extraConnectDays);
    }
    state = engine.setPractice(state, 'organize', styleId);
    return engine.advanceDays(state, 91);
  }
  const cases = [
    {storyId:'photo_wall',personId:'linye',choiceId:'wall_arrange',cooperation:[0,1],
      states:[photoFollowup('observe','photo_leave'),photoFollowup('observe','photo_same_place')]},
    {storyId:'own_screen',personId:'xiaoman',choiceId:'own_screen_lead',cooperation:[1,2],
      states:[laterScreen('screen_help'),clubFollowup('screen_help','curate',12)]},
    {storyId:'screen_circle',personId:'xiaoman',choiceId:'circle_hold_space',cooperation:[1,2],
      states:[clubFollowup('screen_watch','connect'),clubFollowup('screen_help','connect')]},
  ];
  for (const item of cases) {
    const [less, more] = item.states;
    assert.equal(less.pending.storyId,item.storyId);
    assert.equal(more.pending.storyId,item.storyId);
    assert.equal(less.day,more.day);
    assert.deepEqual(less.focusDays,more.focusDays);
    assert.deepEqual(less.skills,more.skills);
    const responses = item.states.map((state,index) => {
      const context = relation(state,item.personId);
      assert.ok(context.familiarityDays >= 18, 'both histories already meet the skill-driven familiarity floor');
      assert.equal(context.cooperation,item.cooperation[index]);
      assert.equal(engine.getChoices(state).find(choice => choice.id === item.choiceId).enabled,true);
      return engine.choose(state,item.choiceId).events.at(-1).reaction;
    });
    assert.notEqual(responses[0].variant,responses[1].variant,item.storyId);
    assert.notEqual(responses[0].text,responses[1].text,item.storyId);
  }
});

test('declining receives a contextual reply without losing cooperation or inventing participation', () => {
  for (const days of [10, 24]) {
    const before = clubInvitation(days);
    const after = engine.choose(before, 'screen_leave');
    assert.equal(after.events.at(-1).reaction.personId, 'xiaoman');
    assert.equal(relation(after, 'xiaoman').cooperation, relation(before, 'xiaoman').cooperation);
    assert.equal(after.flags.screenHelped, undefined);
    assert.equal(after.completedProjects.length, 0);
    assert.equal(after.day, before.day);
  }
  const a = engine.choose(clubInvitation(10), 'screen_leave').events.at(-1).reaction;
  const b = engine.choose(clubInvitation(24), 'screen_leave').events.at(-1).reaction;
  assert.notEqual(a.variant, b.variant); assert.notEqual(a.text, b.text);
});

test('reactions replay unchanged and cannot be replaced with a forged variant or relationship context', () => {
  const state = engine.choose(clubInvitation(24), 'screen_help');
  const saved = engine.validateSave(JSON.stringify(state));
  assert.equal(saved.valid, true); assert.deepEqual(saved.state, state);
  assert.deepEqual(engine.advanceDays(saved.state, 3), engine.advanceDays(state, 3));
  for (const mutate of [
    value => { value.events.at(-1).reaction.variant = 'invented-friendship'; },
    value => { value.events.at(-1).reaction.context.cooperation = 99; },
    value => { value.events.at(-1).reaction.context.sourceEventIds.push(value.events[0].id); },
    value => { value.events.at(-1).reaction.text = 'A different response was never lived.'; },
  ]) {
    const forged = copy(state); mutate(forged);
    assert.equal(engine.validateSave(forged).valid, false);
  }
});

test('v0.6 migration preserves active, completed, pending and ended lives without inventing past reactions', () => {
  const initial = v6.createGame();
  const ready = v6.advanceDays(v6.setFocus(initial, 'walk'), 7);
  let active = v6.advanceDays(v6.startProject(ready, 'photo_set', 'listen'), 3);
  active.events[1].text = '旧版原样保存的这一句。';
  active = v6.toggleFavorite(active, active.events[1].id);
  const completed = v6.advanceDays(active, 4);
  const pending = laterScreen('screen_watch', v6);
  const ended = finish(v6.createGame(), v6);
  for (const old of [initial, active, completed, pending, ended]) {
    const original = copy(old), result = engine.migrateLegacySave(JSON.stringify(old));
    assert.equal(result.valid, true);
    const state = result.state;
    for (const key of ['runId','day','revision','phase','focus','focusDays','weekFocusDays','skills','peopleMet','flags','events','favorites','resolvedStories','practiceDays','practicePlans','weekPracticeInputs','project','completedProjects']) {
      assert.deepEqual(state[key], old[key], key);
    }
    assert.equal(state.schemaVersion, 9);
    assert.equal(state.pending?.storyId, old.pending?.storyId);
    if (old.pending) assert.equal(state.pending.legacyVersion, 6);
    assert.equal(state.events.some(event => event.reaction), false);
    assert.equal(engine.validateSave(state).valid, true);
    assert.deepEqual(old, original);
  }
  const resumed = engine.migrateLegacySave(active).state;
  assert.equal(engine.advanceDays(resumed, 4).completedProjects[0].approachId, 'listen');
  const imported = engine.migrateLegacySave(pending).state;
  assert.equal(engine.getChoices(imported)[0].enabled, v6.getChoices(pending)[0].enabled, 'an already-open old scene retains its options');
  const chosen = engine.choose(imported, 'own_screen_lead');
  assert.ok(chosen.events.at(-1).reaction);
  assert.equal(engine.validateSave(chosen).valid, true);
});

test('v0.4 and v0.5 imports still validate after an additional migration layer', () => {
  for (const api of [v4, v5]) {
    let old = api.advanceDays(api.setFocus(api.createGame(), 'club'), 91);
    old = api.choose(old, 'screen_help');
    const state = engine.migrateLegacySave(old).state;
    assert.ok(state); assert.deepEqual(state.events, old.events);
    assert.equal(engine.validateSave(state).valid, true);
    const next = engine.advanceDays(state, 2);
    assert.equal(next.day, old.day + 2); assert.equal(engine.validateSave(next).valid, true);
  }
  const forged = v6.advanceDays(v6.createGame(), 10); forged.day = 11;
  assert.equal(engine.migrateLegacySave(forged).valid, false);
});
