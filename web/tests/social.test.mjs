import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/calendar-engine.js';
import * as v7 from '../dist/calendar-engine-v7.js';

const copy = value => JSON.parse(JSON.stringify(value));
const socialEvents = state => state.events.filter(event => event.kind === 'social');
const relation = (state, id) => engine.getRelationships(state).find(item => item.id === id);
function settle(state, api = engine) {
  return api.choose(state, api.getChoices(state).filter(item => item.enabled).at(-1).id);
}
function through(state, target, api = engine) {
  for (let guard = 0; state.day < target && state.phase !== 'ended' && guard < 150; guard++) {
    state = state.pending ? settle(state, api) : api.advanceDays(state, Math.min(91, target - state.day));
  }
  assert.equal(state.day, target);
  return state;
}
function finish(state, api = engine) {
  for (let guard = 0; state.phase !== 'ended' && guard < 20; guard++) {
    state = state.pending ? settle(state, api) : api.advanceDays(state, 91);
  }
  assert.equal(state.phase, 'ended');
  return state;
}
function metPeople() {
  let state = engine.advanceDays(engine.setFocus(engine.createGame(), 'club'), 7);
  state = engine.advanceDays(engine.setFocus(state, 'walk'), 7);
  return engine.setFocus(state, 'easy');
}
function available(state, personId, actionId) {
  for (let guard = 0; guard < 91 && state.phase !== 'ended'; guard++) {
    if (state.pending) {state = settle(state); continue;}
    const option = engine.getSocialOptions(state, personId).find(item => item.actionId === actionId);
    if (option?.enabled) return state;
    state = engine.advanceDays(state, 1);
  }
  assert.fail(`No available ${personId}/${actionId} before the end`);
}
function meet(state, personId, actionId) {
  state = available(state, personId, actionId);
  return engine.socialize(state, personId, actionId);
}
function existingScreen() {
  let state = engine.advanceDays(engine.setFocus(engine.createGame(), 'club'), 7);
  state = engine.startProject(state, 'host_screen', 'curate');
  state = engine.advanceDays(state, 91);
  assert.equal(state.pending.storyId, 'club_screen');
  state = engine.choose(state, 'screen_watch');
  return engine.setFocus(state, 'easy');
}

test('proactive contact is available outside a story and uses one real day without changing the ongoing routine', () => {
  const before = available(engine.createGame(), 'ahe', 'chat');
  assert.equal(before.pending, null);
  const original = copy(before);
  const after = engine.socialize(before, 'ahe', 'chat');
  assert.equal(after.day, before.day + 1);
  assert.equal(after.focus, before.focus);
  assert.deepEqual(after.focusDays, before.focusDays);
  assert.deepEqual(after.skills, before.skills);
  assert.equal(after.socialDays, before.socialDays + 1);
  const event = socialEvents(after).at(-1);
  assert.equal(event.personId, 'ahe'); assert.equal(event.actionId, 'chat');
  assert.equal(event.day, after.day); assert.equal(event.reaction.personId, 'ahe');
  assert.equal(relation(after, 'ahe').familiarityDays, relation(before, 'ahe').familiarityDays + 1);
  assert.equal(Object.values(after.focusDays).reduce((a, b) => a + b, 0) + after.socialDays, after.day);
  assert.deepEqual(before, original);
});

test('meeting a friend replaces that day of practice and preparation rather than awarding both', () => {
  const before = engine.startProject(available(metPeople(), 'ahe', 'activity'), 'photo_set', 'observe');
  const after = engine.socialize(before, 'ahe', 'activity');
  assert.equal(after.day, before.day + 1); assert.equal(after.focus, 'walk');
  assert.deepEqual(after.project, before.project);
  assert.deepEqual(after.practiceDays, before.practiceDays);
  assert.deepEqual(after.weekPracticeInputs, before.weekPracticeInputs);
  assert.deepEqual(after.focusDays, before.focusDays);
  const next = engine.advanceDays(after, 1);
  assert.equal(next.project.progress, before.project.progress + 1);
  assert.equal(next.practiceDays.record.observe, before.practiceDays.record.observe + 1);
});

test('busy schedules are visible before committing and a rejected unavailable action consumes nothing', () => {
  let state = metPeople(), found;
  for (let guard = 0; !found && guard < 7; guard++) {
    for (const personId of state.peopleMet) {
      const option = engine.getSocialOptions(state, personId).find(item => !item.enabled && item.nextAvailableDay !== null);
      if (option) {found = {personId, option}; break;}
    }
    if (!found) state = engine.advanceDays(state, 1);
  }
  assert.ok(found); assert.ok(found.option.reason);
  assert.ok(found.option.nextAvailableDay > found.option.whenDay);
  const original = copy(state);
  assert.throws(() => engine.socialize(state, found.personId, found.option.actionId), {code:'social_unavailable'});
  assert.deepEqual(state, original);
  const later = available(state, found.personId, found.option.actionId);
  assert.equal(later.day + 1, found.option.nextAvailableDay);
});

test('the same person needs time between meetings, and activities cannot be repeated every day', () => {
  let state = meet(metPeople(), 'xiaoman', 'activity');
  const day = state.day, original = copy(state);
  const immediate = engine.getSocialOptions(state, 'xiaoman');
  assert.equal(immediate.every(item => !item.enabled), true);
  assert.throws(() => engine.socialize(state, 'xiaoman', 'chat'), {code:'social_unavailable'});
  assert.throws(() => engine.socialize(state, 'xiaoman', 'activity'), {code:'social_unavailable'});
  assert.deepEqual(state, original);
  state = through(state, day + 2);
  const activity = engine.getSocialOptions(state, 'xiaoman').find(item => item.actionId === 'activity');
  assert.equal(activity.enabled, false);
  assert.ok(activity.nextAvailableDay >= day + 4);
  state = available(state, 'xiaoman', 'activity');
  assert.ok(state.day + 1 >= day + 4);
  state = engine.socialize(state, 'xiaoman', 'activity');
  assert.equal(socialEvents(state).filter(event => event.personId === 'xiaoman').length, 2);
});

test('unknown, unmet, stale, pending and ended interactions never become lived encounters', () => {
  const start = engine.createGame(), original = copy(start);
  assert.throws(() => engine.socialize(start, 'nobody', 'chat'), {code:'unknown_person'});
  assert.throws(() => engine.socialize(start, 'linye', 'chat'), {code:'person_unmet'});
  assert.throws(() => engine.socialize(start, 'ahe', 'invented'), {code:'unknown_social_action'});
  const ready = available(start, 'ahe', 'chat');
  assert.throws(() => engine.socialize(ready, 'ahe', 'chat', ready.revision - 1), {code:'stale_revision'});
  const pending = engine.advanceDays(start, 60);
  assert.equal(engine.getSocialOptions(pending, 'ahe').every(item => !item.enabled), true);
  assert.throws(() => engine.socialize(pending, 'ahe', 'chat'), {code:'pending_story'});
  const ended = finish(start);
  assert.equal(engine.getSocialOptions(ended, 'ahe').every(item => !item.enabled), true);
  assert.throws(() => engine.socialize(ended, 'ahe', 'chat'), {code:'game_ended'});
  assert.deepEqual(start, original);
});

test('repeated contact changes the conversation and recalls a real earlier meeting', () => {
  let state = meet(engine.createGame(), 'ahe', 'chat');
  const first = socialEvents(state).at(-1);
  state = meet(state, 'ahe', 'chat');
  const second = socialEvents(state).at(-1);
  state = meet(state, 'ahe', 'chat');
  const third = socialEvents(state).at(-1);
  assert.notEqual(first.reaction.variant, third.reaction.variant);
  assert.notEqual(first.reaction.text, second.reaction.text);
  assert.notEqual(second.reaction.text, third.reaction.text);
  assert.ok(second.sourceEventIds.includes(first.id));
  assert.ok(third.sourceEventIds.includes(second.id));
  assert.equal(relation(state, 'ahe').cooperation, 0, 'chatting is not a completed shared activity');
});

test('the first invitation at the same date acknowledges different real histories of familiarity', () => {
  const known = engine.advanceDays(engine.setFocus(engine.createGame(), 'walk'), 14);
  let lessKnown = engine.advanceDays(engine.setFocus(engine.createGame(), 'walk'), 7);
  lessKnown = engine.advanceDays(engine.setFocus(lessKnown, 'easy'), 7);
  assert.equal(known.day, lessKnown.day);
  assert.deepEqual(known.skills, lessKnown.skills);
  assert.equal(socialEvents(known).length, 0); assert.equal(socialEvents(lessKnown).length, 0);
  assert.equal(engine.getSocialOptions(known, 'linye').find(item => item.actionId === 'chat').enabled, true);
  assert.equal(engine.getSocialOptions(lessKnown, 'linye').find(item => item.actionId === 'chat').enabled, true);
  const a = engine.socialize(known, 'linye', 'chat'), b = engine.socialize(lessKnown, 'linye', 'chat');
  const ra = socialEvents(a).at(-1).reaction, rb = socialEvents(b).at(-1).reaction;
  assert.equal(a.day, b.day); assert.notEqual(ra.variant, rb.variant); assert.notEqual(ra.text, rb.text);
  assert.equal(ra.context.familiarityDays, 14); assert.equal(rb.context.familiarityDays, 7);
});

test('six player-initiated chats become familiar at the common scene without pretending they were shared activities', () => {
  let talking = engine.createGame();
  for (let i = 0; i < 6; i++) talking = meet(talking, 'ahe', 'chat');
  assert.equal(talking.focus, 'easy'); assert.equal(talking.focusDays.friends, 0);
  assert.equal(relation(talking, 'ahe').contactCount, 6);
  assert.equal(relation(talking, 'ahe').activityCount, 0);
  assert.equal(relation(talking, 'ahe').familiarityDays, 6);
  assert.equal(relation(talking, 'ahe').stage, 'familiar');
  assert.equal(relation(talking, 'ahe').cooperation, 0);
  const warm = through(talking, 60), quiet = engine.advanceDays(engine.createGame(), 60);
  assert.equal(warm.pending.storyId, 'lights_out'); assert.equal(quiet.pending.storyId, 'lights_out');
  assert.deepEqual(warm.skills, quiet.skills);
  assert.equal(warm.focusDays.friends, quiet.focusDays.friends);
  const a = engine.choose(warm, 'lights_talk').events.at(-1).reaction;
  const b = engine.choose(quiet, 'lights_talk').events.at(-1).reaction;
  assert.equal(a.variant, 'familiar'); assert.equal(b.variant, 'reserved');
  assert.notEqual(a.text, b.text);
  assert.equal(a.context.familiarityDays, 6); assert.equal(a.context.cooperation, 0);
});

test('chat builds familiarity while actual repeated activities form separate cooperation evidence', () => {
  let state = metPeople();
  const beforeOther = relation(state, 'linye').familiarityDays;
  for (let i = 0; i < 3; i++) state = meet(state, 'xiaoman', 'chat');
  assert.equal(relation(state, 'xiaoman').cooperation, 0);
  assert.ok(relation(state, 'xiaoman').familiarityDays > 7);
  assert.equal(relation(state, 'linye').familiarityDays, beforeOther);
  state = meet(state, 'xiaoman', 'activity');
  assert.equal(relation(state, 'xiaoman').cooperation, 0);
  state = meet(state, 'xiaoman', 'activity');
  assert.equal(relation(state, 'xiaoman').cooperation, 1);
  state = meet(state, 'xiaoman', 'activity');
  state = meet(state, 'xiaoman', 'activity');
  assert.equal(relation(state, 'xiaoman').cooperation, 2);
  state = meet(state, 'xiaoman', 'activity');
  assert.equal(relation(state, 'xiaoman').cooperation, 2, 'one activity does not become unlimited trust');
});

test('player-initiated cooperation can change a later room handover without needing an earlier story choice', () => {
  const initial = existingScreen();
  let visiting = meet(initial, 'xiaoman', 'activity');
  visiting = meet(visiting, 'xiaoman', 'activity');
  const target = 53;
  assert.ok(visiting.day < target);
  const proactive = through(visiting, target), quiet = through(initial, target);
  assert.equal(proactive.pending.storyId, 'own_screen');
  assert.equal(quiet.pending.storyId, 'own_screen');
  assert.deepEqual(proactive.skills, quiet.skills);
  assert.deepEqual(proactive.practiceDays, quiet.practiceDays);
  assert.equal(proactive.flags.screenHelped, undefined);
  assert.equal(quiet.flags.screenHelped, undefined);
  assert.equal(engine.getChoices(proactive).find(item => item.id === 'own_screen_lead').enabled, true);
  assert.equal(engine.getChoices(quiet).find(item => item.id === 'own_screen_lead').enabled, false);
  let talking = initial;
  for (let i = 0; i < 6; i++) talking = meet(talking, 'xiaoman', 'chat');
  const chatOnly = through(talking, target);
  assert.equal(relation(chatOnly, 'xiaoman').stage, 'familiar');
  assert.equal(relation(chatOnly, 'xiaoman').cooperation, 0);
  assert.deepEqual(chatOnly.skills, quiet.skills); assert.deepEqual(chatOnly.practiceDays, quiet.practiceDays);
  assert.equal(engine.getChoices(chatOnly).find(item => item.id === 'own_screen_lead').enabled, false, 'being familiar does not replace shared equipment work');
  const chosen = engine.choose(proactive, 'own_screen_lead');
  assert.equal(chosen.events.at(-1).reaction.context.cooperation, 1);
});

test('a social-heavy week records actual people and sources rather than an unperformed automatic routine', () => {
  let state = metPeople();
  for (let day = 15; day <= 21; day++) {
    const next = state.peopleMet.flatMap(personId => engine.getSocialOptions(state, personId).filter(item => item.enabled).map(option => ({personId, option}))).find(item => item.option.actionId === 'chat');
    state = next ? engine.socialize(state, next.personId, next.option.actionId) : engine.advanceDays(state, 1);
  }
  const encounters = socialEvents(state).filter(event => event.day >= 15 && event.day <= 21);
  assert.ok(encounters.length >= 4);
  const weekly = state.events.find(event => event.day === 21 && event.contentId === 'social_week');
  assert.ok(weekly); assert.equal(weekly.focusId, undefined); assert.equal(weekly.practice, undefined);
  assert.deepEqual(weekly.sourceEventIds, encounters.map(event => event.id));
  assert.equal(state.weekSocialDays, 0);
  assert.equal(Object.values(state.weekFocusDays).every(value => value === 0), true);
});

test('the date boundary keeps the active response while opening a same-day story and never advances beyond the ending', () => {
  let before = through(metPeople(), 59);
  const availableAction = before.peopleMet.flatMap(personId => engine.getSocialOptions(before, personId).filter(item => item.enabled).map(option => ({personId, option})))[0];
  assert.ok(availableAction);
  let state = engine.socialize(before, availableAction.personId, availableAction.option.actionId);
  assert.equal(state.day, 60); assert.equal(state.pending.storyId, 'lights_out');
  const encounter = socialEvents(state).at(-1);
  assert.equal(encounter.day, 60); assert.ok(encounter.reaction.text);
  assert.equal(engine.validateSave(state).valid, true);
  state = settle(state); state = through(state, 89);
  const last = state.peopleMet.flatMap(personId => engine.getSocialOptions(state, personId).filter(item => item.enabled).map(option => ({personId, option})))[0];
  assert.ok(last);
  state = engine.socialize(state, last.personId, last.option.actionId);
  assert.equal(state.day, 90); assert.equal(state.phase, 'ended');
  assert.equal(engine.getSocialOptions(state, last.personId).every(item => !item.enabled), true);
});

test('social facts, costs, responses and sources replay unchanged and forged encounters are rejected', () => {
  let state = meet(metPeople(), 'linye', 'activity');
  state = meet(state, 'linye', 'chat');
  state = engine.toggleFavorite(state, socialEvents(state).at(-1).id);
  const restored = engine.validateSave(JSON.stringify(state));
  assert.equal(restored.valid, true); assert.deepEqual(restored.state, state);
  assert.deepEqual(engine.advanceDays(restored.state, 1), engine.advanceDays(state, 1));
  for (const mutate of [
    value => {value.socialDays += 1;}, value => {value.weekSocialDays += 1;},
    value => {value.commands.at(-1).actionId = 'activity';},
    value => {value.events.findLast(event => event.kind === 'social').actionId = 'activity';},
    value => {value.events.findLast(event => event.kind === 'social').reaction.text = '从未发生过的另一段回应';},
    value => {value.events.findLast(event => event.kind === 'social').sourceEventIds = [value.events[0].id];},
  ]) {const forged = copy(state); mutate(forged); assert.equal(engine.validateSave(forged).valid, false);}
});

test('v0.7 migration keeps previous reactions, active work and pending choices without inventing past visits', () => {
  const fresh = v7.createGame();
  let active = v7.advanceDays(v7.setFocus(fresh, 'walk'), 7);
  active = v7.advanceDays(v7.startProject(active, 'photo_set', 'listen'), 3);
  let reacted = v7.advanceDays(v7.setFocus(v7.createGame(), 'club'), 91);
  reacted = v7.choose(reacted, 'screen_help');
  reacted = v7.toggleFavorite(reacted, reacted.events.at(-1).id);
  const pending = v7.advanceDays(v7.createGame(), 60), ended = finish(v7.createGame(), v7);
  for (const old of [fresh, active, reacted, pending, ended]) {
    const original = copy(old), result = engine.migrateLegacySave(JSON.stringify(old));
    assert.equal(result.valid, true);
    const state = result.state;
    for (const key of ['runId','day','revision','phase','focus','focusDays','weekFocusDays','skills','peopleMet','flags','events','favorites','resolvedStories','practiceDays','practicePlans','weekPracticeInputs','project','completedProjects']) assert.deepEqual(state[key], old[key], key);
    assert.equal(state.schemaVersion, 8); assert.equal(state.socialDays, 0); assert.equal(state.weekSocialDays, 0);
    assert.equal(socialEvents(state).length, 0);
    if (old.pending) {
      assert.equal(state.pending.legacyVersion, 7);
      assert.deepEqual(engine.getChoices(state).map(item => ({id:item.id,enabled:item.enabled})), v7.getChoices(old).map(item => ({id:item.id,enabled:item.enabled})));
    }
    assert.equal(engine.validateSave(state).valid, true); assert.deepEqual(old, original);
  }
  const migrated = engine.migrateLegacySave(active).state;
  assert.equal(engine.advanceDays(migrated, 4).completedProjects[0].approachId, 'listen');
  const bad = copy(reacted); bad.events.at(-1).reaction.variant = 'fake';
  assert.equal(engine.migrateLegacySave(bad).valid, false);
});
