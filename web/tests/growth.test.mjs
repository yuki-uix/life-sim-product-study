import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/calendar-engine.js';
import * as legacy from '../dist/calendar-engine-v4.js';
import { PROJECTS, STORIES } from '../dist/calendar-content.js';

const copy = value => JSON.parse(JSON.stringify(value));
const begin = (state, id) => engine.startProject(state,id,PROJECTS.find(item=>item.id===id).approaches[0].id);
function settle(state) {
  if (!state.pending) return state;
  return engine.choose(state, engine.getChoices(state).filter(choice => choice.enabled).at(-1).id);
}
function advanceThrough(state, target) {
  while (state.day < target && state.phase !== 'ended') {
    if (state.pending) state = settle(state);
    else state = engine.advanceDays(state, Math.min(91, target - state.day));
  }
  return state;
}
function finish(state) {
  let count = 0;
  while (state.phase !== 'ended' && count++ < 20) state = state.pending ? settle(state) : engine.advanceDays(state, 91);
  assert.equal(state.phase, 'ended');
  return state;
}
function projectReady(projectId) {
  const project = PROJECTS.find(item => item.id === projectId);
  return engine.advanceDays(engine.setFocus(engine.createGame(), project.focusId), 7);
}
function projectStory(projectId) {
  let state = begin(projectReady(projectId), projectId);
  state = engine.advanceDays(state, 7);
  const target = STORIES.find(story => story.requiresProject === projectId);
  while (state.phase !== 'ended' && state.pending?.storyId !== target.id) {
    if (projectId === 'host_screen' && state.pending?.storyId === 'club_screen') {
      state = engine.choose(state, 'screen_help');
      state = engine.setPractice(state, 'organize', 'curate');
    } else state = state.pending ? settle(state) : engine.advanceDays(state, 91);
  }
  assert.equal(state.pending?.storyId, target.id);
  return state;
}

test('new projects are locked by actual ability and meeting, not clicking or calendar age alone', () => {
  let state = engine.advanceDays(engine.createGame(), 20);
  assert.equal(engine.getProjects(state).every(project => project.status === 'locked'), true);
  assert.throws(() => begin(state, 'photo_set'), {code:'project_unavailable'});
  const initial = copy(state);
  for (let i = 0; i < 12; i++) state = engine.setFocus(state, i % 2 ? 'walk' : 'club');
  assert.deepEqual(state.skills, initial.skills);
  assert.deepEqual(state.completedProjects, []);
  assert.equal(state.day, 20);
});

test('starting a project chooses an ongoing practice, never instant progress, ability or result', () => {
  const before = projectReady('photo_set');
  const after = begin(before, 'photo_set');
  assert.equal(after.day, before.day);
  assert.equal(after.project.id, 'photo_set');
  assert.equal(after.project.progress, 0);
  assert.deepEqual(after.events.slice(0,-1), before.events);
  assert.equal(after.events.at(-1).kind, 'direction');
  assert.deepEqual(after.practiceDays,before.practiceDays);
  assert.deepEqual(after.skills, before.skills);
  assert.deepEqual(after.completedProjects, []);
  assert.deepEqual(engine.getProjects(after).map(project => project.status), ['active', 'locked']);
  assert.throws(() => begin(after, 'photo_set'), {code:'project_unavailable'});
  assert.equal(before.project, null);
});

test('an ongoing project only progresses under its real routine, pauses and resumes after switching', () => {
  let state = begin(projectReady('photo_set'), 'photo_set');
  state = engine.advanceDays(state, 3);
  assert.equal(state.project.progress, 3);
  state = engine.setFocus(state, 'friends');
  state = engine.advanceDays(state, 5);
  assert.equal(state.project.progress, 3);
  assert.equal(engine.getProjects(state).find(project => project.id === 'photo_set').paused, true);
  state = engine.setFocus(state, 'walk');
  state = engine.advanceDays(state, 4);
  assert.equal(state.project, null);
  assert.equal(state.completedProjects.length, 1);
  assert.equal(state.completedProjects[0].id, 'photo_set');
  const result = state.events.find(event => event.kind === 'project');
  assert.equal(result.day, 19);
  assert.ok(result.sourceEventIds.length);
  assert.equal(state.favorites.length, 0);
});

test('cancelling a preparation keeps time and skill, and restarting does not recover old progress', () => {
  let state = engine.advanceDays(begin(projectReady('host_screen'), 'host_screen'), 3);
  const before = copy(state);
  state = engine.cancelProject(state);
  assert.equal(state.project, null);
  assert.deepEqual(state.skills, before.skills);
  assert.equal(state.day, before.day);
  state = begin(state, 'host_screen');
  assert.equal(state.project.progress, 0);
  assert.throws(() => engine.cancelProject(state, state.revision - 1), {code:'stale_revision'});
});

test('a capability panel describes real cumulative thresholds and does not award anything', () => {
  const state = engine.advanceDays(engine.setFocus(engine.createGame(), 'walk'), 7);
  const before = copy(state);
  const record = engine.getGrowth(state).find(skill => skill.skillId === 'record');
  assert.equal(record.level, 1);
  assert.equal(record.days, 7);
  assert.equal(record.nextAt, 18);
  assert.equal(record.remaining, 11);
  assert.deepEqual(record.capabilities.map(item => item.unlocked), [true,false,false]);
  assert.ok(record.capabilities.every(item => item.title && item.description));
  assert.deepEqual(state, before);
});

test('fast forward stops at meaningful growth and preparation completion before later stories', () => {
  let state = engine.setFocus(engine.createGame(), 'walk');
  state = engine.advanceToNextMoment(state);
  assert.equal(state.day, 7);
  assert.equal(state.skills.record, 1);
  assert.equal(state.pending, null);
  state = begin(state, 'photo_set');
  state = engine.advanceToNextMoment(state);
  assert.equal(state.day, 11);
  assert.equal(state.practiceDays.record.observe,4);
  state = engine.advanceToNextMoment(state);
  assert.equal(state.day,14);
  assert.equal(state.completedProjects[0].id,'photo_set');
  state = engine.advanceToNextMoment(state);
  assert.equal(state.day,19);
  assert.equal(state.skills.record,2);
  state = engine.advanceToNextMoment(state);
  assert.equal(state.day,35);
  assert.equal(state.pending.storyId, 'lake_photo');
  assert.deepEqual(engine.advanceToNextMoment(state), state);
});

test('daily skill alone never fabricates the two player-initiated story opportunities', () => {
  for (const focus of ['walk', 'club']) {
    const state = finish(engine.setFocus(engine.createGame(), focus));
    assert.equal(state.resolvedStories.includes('photo_wall'), false);
    assert.equal(state.resolvedStories.includes('own_screen'), false);
    assert.deepEqual(state.completedProjects, []);
  }
});

test('both preparations lead to real later stories with skill and shared-experience gates', () => {
  for (const project of PROJECTS) {
    const state = projectStory(project.id);
    assert.equal(state.skills[project.requiresSkill.id], 3);
    const independent = engine.getChoices(state)[0];
    assert.equal(independent.enabled, true);
    const chosen = engine.choose(state, independent.id);
    const result = chosen.events.at(-1);
    assert.equal(result.kind, 'story');
    assert.ok(result.sourceEventIds.includes(chosen.completedProjects[0].sourceEventId));
    assert.equal(finish(chosen).phase, 'ended');
  }
});

test('an intermediate skill can cooperate but cannot use the expert choice', () => {
  const project = PROJECTS.find(item => item.id === 'photo_set');
  let state = begin(projectReady(project.id), project.id);
  state = engine.advanceDays(state, 11);
  assert.equal(state.skills.record, 2);
  state = engine.setFocus(state, 'easy');
  const target = STORIES.find(story => story.requiresProject === project.id);
  while (state.pending?.storyId !== target.id && state.phase !== 'ended') state = state.pending ? settle(state) : engine.advanceDays(state, 91);
  const choices = engine.getChoices(state);
  assert.equal(choices[0].enabled, false);
  assert.equal(choices[1].enabled, true);
  assert.equal(choices.at(-1).enabled, true);
  assert.throws(() => engine.choose(state, choices[0].id), {code:'missing_practice'});
  assert.equal(finish(engine.choose(state, choices.at(-1).id)).phase, 'ended');
});

test('preparation progress and completion replay strictly without duplicating facts', () => {
  const state = engine.advanceDays(begin(projectReady('photo_set'), 'photo_set'), 4);
  const restored = engine.validateSave(JSON.stringify(state));
  assert.equal(restored.valid, true);
  assert.deepEqual(engine.advanceDays(state, 3), engine.advanceDays(restored.state, 3));
  const completed = engine.advanceDays(restored.state, 3);
  const later = engine.advanceDays(completed, 1);
  assert.equal(later.events.filter(event => event.kind === 'project').length, 1);
  for (const mutate of [
    value => {value.project.progress += 1;},
    value => {value.completedProjects.push({id:'photo_set',day:value.day,sourceEventId:'fake'});},
    value => {value.commands.at(-1).days = 5;},
  ]) {
    const forged = copy(state); mutate(forged);
    assert.equal(engine.validateSave(forged).valid, false);
  }
});

test('verified v0.4 snapshots migrate with dates, skills, choices, text and favorites intact', () => {
  let mid = legacy.advanceDays(legacy.setFocus(legacy.createGame(),'club'), 10);
  mid.events[1].text = '旧版保存的原句。';
  mid = legacy.toggleFavorite(mid,mid.events[1].id);
  const pending = legacy.advanceDays(legacy.setFocus(legacy.createGame(),'club'),91);
  const answered = legacy.choose(pending,'screen_help');
  let ended = legacy.advanceDays(legacy.createGame(),91);
  ended = legacy.advanceDays(legacy.choose(ended,'lights_rest'),91);
  for (const old of [legacy.createGame(),mid,pending,answered,ended]) {
    const original = copy(old);
    const migrated = engine.migrateLegacySave(JSON.stringify(old));
    assert.equal(migrated.valid,true);
    assert.equal(migrated.state.schemaVersion,9);
    for (const key of ['runId','day','revision','phase','focus','focusDays','weekFocusDays','skills','peopleMet','flags','events','favorites','resolvedStories']) assert.deepEqual(migrated.state[key],old[key],key);
    assert.equal(migrated.state.pending?.storyId,old.pending?.storyId);
    assert.equal(migrated.state.commands[0].type,'legacy.import');
    assert.deepEqual(migrated.state.practicePlans,{record:null,organize:null});
    assert.deepEqual(migrated.state.completedProjects,[]);
    assert.equal(migrated.state.project,null);
    assert.deepEqual(old,original);
    assert.equal(engine.validateSave(migrated.state).valid,true);
  }
});

test('legacy migration rejects malformed or fabricated old facts without inventing a replacement', () => {
  const old = legacy.advanceDays(legacy.setFocus(legacy.createGame(),'walk'),10);
  old.skills.record = 3;
  assert.equal(engine.migrateLegacySave(old).valid,false);
  assert.equal(engine.migrateLegacySave('{broken').valid,false);
  assert.equal(engine.migrateLegacySave(engine.createGame()).valid,false);
});
