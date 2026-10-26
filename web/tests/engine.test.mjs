import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, CHOICES, PEOPLE, MEMORIES, SKILLS } from '../dist/content.js';
import { createGame, applyChoice, getChoiceAvailability, getChoices, validateSave, getSummary } from '../dist/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const expectedChoices = CONFIG.playableSemesters * (CONFIG.activitySlots + 1);
const initialActivities = () => CHOICES.filter(choice => choice.semester === 1 && choice.kind === 'activity' && !choice.requiresSkill && !choice.requiresMemory && !choice.requiresPerson);
const errorCode = code => error => error.code === code;
let reachable;
function reachableStates() {
  if (reachable) return reachable;
  reachable = [];
  const visit = state => {
    reachable.push(state);
    for (const choice of getChoices(state).filter(choice => choice.enabled)) visit(applyChoice(state, choice.id));
  };
  visit(createGame());
  return reachable;
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}

test('a fresh campus year has four-year context but only first-year content, and no invented experiences', () => {
  const first = createGame(), second = createGame();
  assert.notEqual(first.runId, second.runId);
  assert.equal(first.programYears, 4);
  assert.equal(first.phase, 'activity');
  assert.equal(first.semester, 1);
  assert.equal(first.slot, 1);
  assert.equal(first.turn, 1);
  assert.deepEqual(first.skills, { record: 0, organize: 0 });
  assert.deepEqual(first.peopleMet, ['ahe']);
  assert.deepEqual(first.memories, []);
  assert.deepEqual(first.events, []);
  assert.equal(first.funds, undefined);
  assert.equal(first.energy, undefined);
  assert.equal(validateSave(first).valid, true);
});

test('content references existing memories, skills and people; every campus node has a basic method', () => {
  assert.equal(new Set(CHOICES.map(choice => choice.id)).size, CHOICES.length);
  assert.equal(new Set(CHOICES.map(choice => choice.memoryId)).size, CHOICES.length);
  for (const choice of CHOICES) {
    assert.ok(MEMORIES[choice.memoryId], choice.id);
    for (const id of [...choice.meet || [], ...choice.with || []]) assert.ok(PEOPLE[id], `${choice.id}: ${id}`);
    if (choice.requiresPerson) assert.ok(PEOPLE[choice.requiresPerson]);
    if (choice.requiresMemory) assert.ok(MEMORIES[choice.requiresMemory]);
    if (choice.requiresSkill) assert.ok(SKILLS[choice.requiresSkill.id]);
  }
  for (let semester = 1; semester <= CONFIG.playableSemesters; semester++) {
    assert.ok(CHOICES.some(choice => choice.semester === semester && choice.kind === 'campus' && !choice.requiresSkill && !choice.requiresMemory && !choice.requiresPerson));
  }
});

test('a choice records its real skill change, company and memory with a stable causal source', () => {
  const choice = initialActivities()[0];
  const before = createGame();
  const after = applyChoice(before, choice.id);
  const event = after.events[0];
  assert.equal(event.type, 'choice.resolved');
  assert.equal(event.facts.choiceId, choice.id);
  assert.equal(event.turn, 1);
  assert.equal(event.semester, 1);
  assert.deepEqual(event.facts.skillsBefore, before.skills);
  assert.deepEqual(event.facts.skillsAfter, after.skills);
  assert.deepEqual(event.facts.with, [...new Set(choice.with || [])]);
  assert.deepEqual(after.memories, [{ id: choice.memoryId, semester: 1, sourceEventId: event.id }]);
  assert.deepEqual(after.peopleMet, ['ahe', ...event.facts.peopleMetAdded]);
  assert.ok(event.narrative.title);
  assert.ok(event.narrative.paragraphs.length);
  assert.ok(event.textSnapshot.includes(event.narrative.title));
  assert.equal(before.events.length, 0);
});

test('two different everyday arrangements lead to a campus event, then spring starts afresh', () => {
  let state = createGame();
  const [first, second] = initialActivities();
  state = applyChoice(state, first.id);
  assert.equal(state.slot, 2);
  assert.equal(state.phase, 'activity');
  state = applyChoice(state, second.id);
  assert.equal(state.phase, 'campus');
  assert.equal(state.semester, 1);
  const basic = getChoices(state).find(choice => choice.enabled && !choice.requiresSkill && !choice.requiresMemory && !choice.requiresPerson);
  state = applyChoice(state, basic.id);
  assert.equal(state.semester, 2);
  assert.equal(state.phase, 'activity');
  assert.equal(state.slot, 1);
  assert.equal(state.turn, 4);
  assert.equal(state.memories.length, 3);
});

test('an activity cannot be repeated within the semester or an event taken before its time', () => {
  const choice = initialActivities()[0];
  const start = createGame();
  const after = applyChoice(start, choice.id);
  assert.equal(getChoiceAvailability(after, choice.id).code, 'already_chosen');
  assert.throws(() => applyChoice(after, choice.id), errorCode('already_chosen'));
  const campus = CHOICES.find(item => item.semester === 1 && item.kind === 'campus');
  assert.throws(() => applyChoice(start, campus.id), errorCode('wrong_phase'));
  const spring = CHOICES.find(item => item.semester === 2);
  assert.throws(() => applyChoice(start, spring.id), errorCode('wrong_semester'));
});

test('all reachable routes have choices, preserve factual company, and end after six meaningful decisions', () => {
  const states = reachableStates();
  const ends = states.filter(state => state.phase === 'ended');
  assert.ok(ends.length > 20, 'the two semesters admit genuinely different histories');
  for (const state of states) {
    assert.equal(validateSave(state).valid, true);
    assert.ok(state.semester >= 1 && state.semester <= CONFIG.playableSemesters);
    assert.equal(state.turn, state.events.length + 1);
    assert.equal(state.memories.length, state.events.length);
    assert.equal(new Set(state.memories.map(memory => memory.id)).size, state.memories.length);
    for (const skill of Object.values(state.skills)) assert.ok(skill >= 0 && skill <= CONFIG.maxSkill);
    for (let index = 0; index < state.events.length; index++) {
      const event = state.events[index];
      const priorIds = new Set(state.events.slice(0, index).map(item => item.id));
      for (const source of event.sourceEventIds) assert.ok(priorIds.has(source));
      assert.ok(state.memories.some(memory => memory.sourceEventId === event.id && memory.id === event.facts.memoryId));
      const knownBefore = new Set(['ahe', ...state.events.slice(0, index).flatMap(item => item.facts.peopleMetAdded)]);
      for (const person of event.facts.with) assert.ok(knownBefore.has(person) || event.facts.peopleMetAdded.includes(person), 'shared stories only involve someone actually met');
    }
    if (state.phase === 'ended') {
      assert.equal(state.events.length, expectedChoices);
      assert.equal(state.turn, expectedChoices + 1);
      assert.deepEqual(getChoices(state), []);
    } else {
      assert.ok(getChoices(state).some(choice => choice.enabled), `no dead end at ${state.semester}/${state.phase}/${state.slot}`);
    }
  }
});

test('learned abilities open different ways to participate in the same shared campus event', () => {
  for (const choice of CHOICES.filter(item => item.kind === 'campus' && item.requiresSkill)) {
    const { id, min } = choice.requiresSkill;
    const node = state => state.semester === choice.semester && state.phase === 'campus';
    const capable = reachableStates().find(state => node(state) && state.skills[id] >= min && getChoiceAvailability(state, choice.id).enabled);
    const unfamiliar = reachableStates().find(state => node(state) && state.skills[id] < min);
    assert.ok(capable, `${choice.id} is really reachable`);
    assert.ok(unfamiliar, `${choice.id} is not handed to everyone`);
    assert.equal(getChoiceAvailability(unfamiliar, choice.id).code, 'missing_skill');
    const after = applyChoice(capable, choice.id);
    const event = after.events.at(-1);
    assert.ok(event.sourceEventIds.some(sourceId => capable.events.find(item => item.id === sourceId)?.facts.skillGains[id] > 0));
    assert.ok(after.memories.some(memory => memory.id === choice.memoryId));
    assert.throws(() => applyChoice(unfamiliar, choice.id), errorCode('missing_skill'));
  }
});

test('a later invitation needs its actual earlier memory, not just a matching skill score', () => {
  for (const choice of CHOICES.filter(item => item.requiresMemory)) {
    const correctPhase = state => state.semester === choice.semester && state.phase === choice.kind;
    const invited = reachableStates().find(state => correctPhase(state) && getChoiceAvailability(state, choice.id).enabled);
    assert.ok(invited, `${choice.id} can occur`);
    const absent = reachableStates().find(state => correctPhase(state) && getChoiceAvailability(state, choice.id).code === 'missing_memory');
    assert.ok(absent, `${choice.id} does not invent the earlier experience`);
    const previousMemory = invited.memories.find(memory => memory.id === choice.requiresMemory);
    const next = applyChoice(invited, choice.id);
    assert.ok(next.events.at(-1).sourceEventIds.includes(previousMemory.sourceEventId));
    assert.throws(() => applyChoice(absent, choice.id), errorCode('missing_memory'));
  }
});

test('unknown choices, stale clicks and repeated final events cannot settle twice', () => {
  const start = createGame();
  const choice = initialActivities()[0];
  const after = applyChoice(start, choice.id);
  assert.throws(() => applyChoice(after, initialActivities()[1].id, start.turn), errorCode('stale_turn'));
  for (const stale of [0, '2', NaN]) {
    assert.throws(() => applyChoice(after, initialActivities()[1].id, stale), errorCode('stale_turn'));
  }
  assert.throws(() => applyChoice(start, 'missing-choice'), errorCode('unknown_choice'));
  const ended = reachableStates().find(state => state.phase === 'ended');
  assert.throws(() => applyChoice(ended, ended.events.at(-1).facts.choiceId), errorCode('game_ended'));
  assert.equal(getChoiceAvailability(ended, choice.id).code, 'game_ended');
});

test('frozen inputs and inspection APIs remain immutable', () => {
  const start = deepFreeze(createGame());
  const before = JSON.stringify(start);
  const choice = getChoices(start).find(item => item.enabled);
  getChoiceAvailability(start, choice.id);
  validateSave(start);
  getSummary(start);
  const after = applyChoice(start, choice.id);
  assert.equal(JSON.stringify(start), before);
  assert.notEqual(after, start);
  assert.notEqual(after.skills, start.skills);
});

test('saved prose and the memory caption survive recovery and subsequent choices', () => {
  const state = applyChoice(createGame(), initialActivities()[0].id);
  state.events[0].narrative.title = '这一天，留在自己的记忆里。';
  state.events[0].narrative.paragraphs = ['保留已经发生时的文字。'];
  state.events[0].narrative.memoryCaption = '这是上一个文案版本留下的小纸条。';
  state.events[0].textSnapshot = '原来那天的记录，不随后续编辑重写。';
  const checked = validateSave(JSON.stringify(state));
  assert.equal(checked.valid, true);
  const nextChoice = getChoices(checked.state).find(choice => choice.enabled);
  const next = applyChoice(checked.state, nextChoice.id);
  assert.deepEqual(next.events[0], state.events[0]);
  assert.equal(getSummary(next).memories[0].caption, state.events[0].narrative.memoryCaption);
});

test('save replay rejects changed abilities, companions, chronology and source links', () => {
  const state = reachableStates().find(item => item.events.length === 4);
  const alterations = [
    value => { value.skills.record += 1; },
    value => { value.turn += 1; },
    value => { value.semester = 1; },
    value => { value.programYears = 5; },
    value => { value.peopleMet.push('invented_friend'); },
    value => { value.memories[0].sourceEventId = 'invented-event'; },
    value => { value.events[0].facts.skillsAfter.record += 1; },
    value => { value.events[0].facts.with.push('linye'); },
    value => { value.events.at(-1).sourceEventIds.push('invented-source'); },
    value => { value.flags.invented = true; },
    value => { value.events.push(copy(value.events.at(-1))); },
    value => { value.memories.pop(); },
  ];
  for (const alter of alterations) {
    const broken = copy(state); alter(broken);
    const input = JSON.stringify(broken);
    assert.equal(validateSave(broken).valid, false);
    assert.equal(JSON.stringify(broken), input);
  }
});

test('valid key reordering is accepted while malformed prose and non-JSON state are rejected', () => {
  const state = applyChoice(createGame(), initialActivities()[0].id);
  const reordered = Object.fromEntries(Object.entries(state).reverse());
  assert.equal(validateSave(reordered).valid, true);
  for (const snapshot of [null, { ...state.events[0].narrative, paragraphs: [] }, { ...state.events[0].narrative, paragraphs: ['x'.repeat(701)] }, { ...state.events[0].narrative, location: 'made-up' }]) {
    const broken = copy(state); broken.events[0].narrative = snapshot;
    assert.equal(validateSave(broken).valid, false);
  }
  const old = { ...state, schemaVersion: 2, rulesVersion: '0.2.0' };
  const oldCopy = copy(old);
  assert.equal(validateSave(old).valid, false);
  assert.deepEqual(old, oldCopy);
  const cyclic = {}; cyclic.self = cyclic;
  for (const broken of [undefined, null, [], '{}', '{oops', cyclic, { ...state, turn: NaN }, new Date(), Object.create(state)]) {
    assert.equal(validateSave(broken).valid, false);
  }
});
