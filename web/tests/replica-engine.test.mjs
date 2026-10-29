import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/replica/engine.js';
import * as old from '../dist/life/engine.js';

const sample = (focus = 'make', seed = 1) => engine.setFocus(engine.startYoungSample(seed), focus);
const copy = value => JSON.parse(JSON.stringify(value));
const isCore = state => state.pending?.startsWith('core_');
function toAge(state, age) {
  for (let count = 0; count < 100 && state.status === 'living' && state.age < age; count++) {
    if (state.pending) state = engine.choose(state, isCore(state) ? 'decline' : engine.getDecisionOptions(state).find(o => o.available).id);
    else state = engine.advanceDays(state, Math.min(360 * (age - state.age) - state.day, 30600));
  }
  return state;
}
function findOffer(state, id, untilAge = 29) {
  for (let count = 0; count < 100 && state.age < untilAge; count++) {
    if (state.pending === id) return state;
    if (state.pending) state = engine.choose(state, isCore(state) ? 'decline' : engine.getDecisionOptions(state).find(o => o.available).id);
    else state = engine.advanceDays(state, 30);
  }
  assert.fail('Offer not found: ' + id);
}
function fractionalFareChoice() {
  let state = engine.advanceDays(sample('make'), 120);
  state = engine.choose(state, 'decline');
  state = engine.advanceDays(state, 2010);
  assert.equal(state.age, 28);
  assert.equal(state.day, 330);
  assert.equal(state.facts.young.reserve, 0);
  state = engine.setFocus(state, 'settle');
  state = engine.advanceDays(state, 30);
  assert.equal(state.pending, 'away_closing29');
  assert.equal(state.facts.young.reserve, .25);
  return state;
}

test('time is accrued to the focus that was actually active; changing it grants nothing and never rewrites earlier days', () => {
  let state = sample('make');
  state = engine.advanceDays(state, 89);
  const before = copy(state), changed = engine.setFocus(state, 'settle');
  assert.deepEqual(changed.facts.young, { ...before.facts.young, focus: 'settle' });
  assert.deepEqual(changed.core, before.core);
  state = engine.advanceDays(changed, 1);
  assert.deepEqual(state.core.yearLedger, { make: 89, connect: 0, settle: 1, total: 90 });
  assert.deepEqual(before.core.totalLedger, { make: 89, connect: 0, settle: 0, total: 89 });
  assert.ok(state.facts.young.progress > 1);
});

test('splitting the same elapsed time into browser ticks produces the exact same state and random draw', () => {
  const initial = sample('make');
  let split = initial;
  for (let i = 0; i < 150; i++) split = engine.advanceDays(split, 1);
  assert.deepEqual(split, engine.advanceDays(initial, 150));
  assert.equal(split.pending, 'core_craft');
  assert.equal(split.day, 120);
  assert.deepEqual(engine.validateSave(split), split);
});

test('a last-day switch cannot turn an almost entirely practiced year into a year of resting', () => {
  let state = sample('make');
  state = engine.advanceDays(state, 120);
  state = engine.choose(state, 'decline');
  state = engine.advanceDays(state, 239);
  assert.equal(state.day, 359);
  const changed = engine.setFocus(state, 'settle');
  state = engine.advanceDays(changed, 1);
  assert.equal(state.age, 24);
  assert.deepEqual(state.core.history[0].ledger, { make: 359, connect: 0, settle: 1, total: 360 });
  assert.match(state.log.find(e => e.id === 'core_year_23').text, /12个月给作品留时间/);
  assert.ok(state.facts.young.skill > 2.9);
});

test('equal age and the same seed produce different opportunities through actual practice and contact', () => {
  const making = engine.advanceDays(sample('make'), 120);
  const contact = engine.advanceDays(sample('connect'), 120);
  const resting = engine.advanceDays(sample('settle'), 120);
  assert.equal(making.pending, 'core_craft');
  assert.equal(contact.pending, 'core_zhou');
  assert.equal(resting.pending, null);
  assert.equal(making.age, contact.age);
  assert.equal(making.day, contact.day);
  assert.equal(resting.core.totalLedger.make, 0);
  assert.equal(resting.core.totalLedger.connect, 0);
});

test('eligibility raises a probability instead of forcing an offer at its first threshold', () => {
  const first = engine.advanceDays(sample('make', 1), 120);
  const another = engine.advanceDays(sample('make', 1000), 120);
  assert.equal(first.pending, 'core_craft');
  assert.equal(another.pending, null);
  assert.equal(another.core.totalLedger.make, 120);
  assert.ok(another.facts.young.skill >= 1);
});

test('selecting a method is an intention; only future matching practice completes it and opens its own later opportunity', () => {
  const offered = engine.advanceDays(sample('make'), 120);
  const structure = engine.choose(offered, 'structure');
  const sound = engine.choose(offered, 'sound');
  assert.equal(structure.core.styleCompleted, null);
  assert.deepEqual(structure.facts.young, offered.facts.young);
  let pausedPractice = engine.setFocus(structure, 'settle');
  pausedPractice = engine.advanceDays(pausedPractice, 59);
  assert.equal(pausedPractice.core.styleDays, 0);
  assert.equal(pausedPractice.core.styleCompleted, null);
  const finishedStructure = engine.advanceDays(structure, 60);
  const finishedSound = engine.advanceDays(sound, 60);
  assert.equal(finishedStructure.core.styleCompleted.style, 'structure');
  assert.equal(finishedSound.core.styleCompleted.style, 'sound');
  assert.equal(finishedStructure.facts.young.skill, finishedSound.facts.young.skill);
  const laterStructure = findOffer(finishedStructure, 'core_structure_followup');
  const laterSound = findOffer(finishedSound, 'core_sound_followup');
  assert.match(engine.getDecisionOptions(laterStructure)[0].label, /结构/);
  assert.match(engine.getDecisionOptions(laterSound)[0].label, /声音/);
  assert.equal(laterStructure.core.offers.followup, true);
  assert.equal(laterSound.core.offers.followup, true);
});

test('general familiarity is not shared work; accepting a cooperation still needs future project days', () => {
  const offered = engine.advanceDays(sample('connect'), 120);
  const helped = engine.choose(offered, 'help');
  assert.equal(helped.facts.young.cooperation, false);
  let accepted = engine.choose(offered, 'together');
  assert.equal(accepted.facts.young.cooperation, false);
  accepted = engine.advanceDays(accepted, 89);
  assert.equal(accepted.core.collaboration.days, 89);
  assert.equal(accepted.facts.young.cooperation, false);
  accepted = engine.advanceDays(accepted, 1);
  assert.equal(accepted.facts.young.cooperation, true);
  assert.equal(accepted.core.collaboration, null);
  assert.ok(accepted.log.some(e => e.id === 'core_cooperation_completed'));
  assert.deepEqual(engine.validateSave(accepted), accepted);
});

test('an unanswered or minimized opportunity cannot spend time, and the global invitation cooldown is real', () => {
  const offered = engine.advanceDays(sample('connect'), 120);
  assert.deepEqual(engine.advanceDays(offered, 360), offered);
  let state = engine.choose(offered, 'decline');
  state = engine.setFocus(state, 'make');
  state = engine.advanceDays(state, 179);
  assert.equal(state.pending, null);
  assert.equal(state.core.lastOfferMonth, offered.core.lastOfferMonth);
  assert.equal(state.core.offers.zhou, true);
});

test('accepted practice and cooperation never consume the same day twice', () => {
  let state = engine.advanceDays(sample('make'), 120);
  state = engine.choose(state, 'structure');
  state = engine.setFocus(state, 'connect');
  state = findOffer(state, 'core_zhou');
  state = engine.choose(state, 'together');
  state = engine.setFocus(state, 'make');
  const priorStyleDays = state.core.styleDays, priorProgress = state.facts.young.progress;
  state = engine.advanceDays(state, 30);
  assert.equal(state.core.collaboration.days, 30);
  assert.equal(state.core.styleDays, priorStyleDays);
  assert.equal(state.facts.young.progress, priorProgress);
});

test('restoring a live opportunity preserves its draw and rejects altered growth, text, seed, day and ledger', () => {
  const state = engine.advanceDays(sample('make'), 150);
  assert.deepEqual(engine.validateSave(copy(state)), state);
  for (const mutate of [s => s.rng++, s => s.day++, s => s.seed++, s => s.facts.young.skill++, s => s.core.totalLedger.make++, s => s.log.at(-1).text += '伪造']) {
    const forged = copy(state); mutate(forged); assert.equal(engine.validateSave(forged), null);
  }
  assert.deepEqual(engine.getDecisionOptions(engine.validateSave(state)), engine.getDecisionOptions(state));
});

test('v2 migration keeps actual old facts but never invents historical focus shares or repeats old annual rewards', () => {
  let legacy = old.setFocus(old.startYoungSample(), 'make');
  legacy = old.advance(legacy, 1);
  const migrated = engine.migrateV2(legacy);
  assert.deepEqual(migrated.facts, legacy.facts);
  assert.deepEqual(migrated.log, legacy.log);
  assert.equal(migrated.core.totalLedger.total, 0);
  assert.equal(migrated.core.yearLedger.total, 0);
  assert.equal(migrated.core.migrationAt.age, 24);
  const later = engine.advanceDays(migrated, 1);
  assert.equal(later.core.totalLedger.make, 1);
  assert.ok(later.facts.young.skill > legacy.facts.young.skill);
  assert.deepEqual(engine.validateSave(later), later);
  const bad = copy(legacy); bad.facts.young.skill++;
  assert.equal(engine.migrateV2(bad), null);
});

test('an old reservation remains an intention until actual future time completes it', () => {
  const legacy = old.arrange(old.setFocus(old.startYoungSample(), 'make'), 'edit_lab');
  let state = engine.migrateV2(legacy);
  state = engine.advanceDays(state, 59);
  assert.ok(state.facts.young.arranged);
  assert.equal(state.log.some(e => e.id === 'core_legacy_arrangement'), false);
  state = engine.advanceDays(state, 1);
  assert.equal(state.facts.young.arranged, null);
  assert.ok(state.log.some(e => e.id === 'core_legacy_arrangement'));
  assert.equal(state.core.styleDays, 0);
});

test('migration retains a verified old shared work without inventing its exact day or any new focus ledger', () => {
  let legacy = old.setFocus(old.startYoungSample(), 'connect');
  legacy = old.advance(legacy, 2);
  legacy = old.arrange(legacy, 'work_together');
  legacy = old.advance(legacy, 1);
  assert.equal(legacy.facts.young.cooperation, true);
  const state = engine.migrateV2(legacy);
  assert.equal(state.core.totalLedger.total, 0);
  assert.equal(state.core.routeFacts[0].id, 'legacy_cooperation');
  assert.equal(state.core.cooperationCompleted.age, 25);
  assert.equal(state.core.cooperationCompleted.day, null);
  assert.deepEqual(state.log, legacy.log);
  assert.deepEqual(engine.validateSave(state), state);
});

test('all offered closing decisions still continue through a replayable complete life', () => {
  const ready = toAge(sample('settle'), 29);
  assert.equal(ready.pending, 'away_closing29');
  for (const option of engine.getDecisionOptions(ready).filter(o => o.available)) {
    let state = engine.choose(ready, option.id);
    state = toAge(state, 85);
    assert.equal(state.status, 'ended');
    assert.equal(state.age, 85);
    assert.ok(state.log.some(e => e.kind === 'end'));
    assert.deepEqual(engine.validateSave(state), state);
  }
});

test('a real earlier cooperation changes the closing methods, while the later promise consumes future time exactly once', () => {
  let state = engine.advanceDays(sample('connect'), 120);
  state = engine.choose(state, 'together');
  state = engine.advanceDays(state, 90);
  state = engine.setFocus(state, 'make');
  state = toAge(state, 26);
  state = engine.setFocus(state, 'settle');
  state = toAge(state, 28);
  state = engine.setFocus(state, 'make');
  state = engine.advanceDays(state, 30);
  state = engine.setFocus(state, 'connect');
  state = toAge(state, 29);
  assert.equal(state.pending, 'away_closing29');
  assert.equal(engine.getDecisionOptions(state).find(o => o.id === 'co_edit_home').available, true);
  assert.equal(engine.getDecisionOptions(state).filter(o => o.available).length, 4);
  state = engine.choose(state, 'co_edit_home');
  assert.equal(state.facts.young.followupDone, false);
  state = engine.advanceDays(state, 360);
  assert.equal(state.age, 30);
  const ownProgress = state.facts.young.progress;
  state = engine.advanceDays(state, 119);
  assert.equal(state.facts.young.followupDone, false);
  assert.equal(state.core.yearLedger.total, 0);
  assert.equal(state.facts.young.progress, ownProgress);
  state = engine.advanceDays(state, 1);
  assert.equal(state.facts.young.followupDone, true);
  assert.equal(state.core.promiseDays, 120);
  assert.equal(state.core.yearLedger.total, 0);
  assert.equal(engine.getLifeView(state).committedDays, 120);
  state = engine.advanceDays(state, 1);
  assert.equal(state.core.yearLedger.connect, 1);
  assert.equal(state.log.filter(e => e.id === 'core_joint_promise').length, 1);
  assert.deepEqual(engine.validateSave(state), state);
});

test('a fractional slow-train payment charges exactly 1000 yuan without a negative balance or next-day debt loss', () => {
  const before = fractionalFareChoice();
  let state = engine.choose(before, 'return_home');
  assert.equal(state.facts.young.reserve, 0);
  assert.equal(state.facts.young.fareDeferred, .75);
  assert.equal(before.facts.young.reserve - state.facts.young.reserve + state.facts.young.fareDeferred - before.facts.young.fareDeferred, 1);
  assert.match(state.log.at(-1).text, /750元票款/);
  assert.doesNotMatch(state.log.at(-1).text, /1000元票款/);
  assert.match(engine.getLifeView(state).commitmentText, /750元/);
  state = engine.advanceDays(state, 1);
  assert.ok(state.facts.young.reserve > 0);
  assert.equal(state.facts.young.fareDeferred, .75);
  assert.deepEqual(engine.validateSave(state), state);
  state = engine.advanceDays(state, 359);
  assert.equal(state.age, 30);
  assert.equal(state.facts.young.reserve, 2.25);
  assert.equal(state.facts.young.fareDeferred, 0);
  assert.match(state.log.find(e => e.id === 'core_year_29').text, /补回了约750元/);
  assert.deepEqual(engine.validateSave(state), state);
});

test('annual repayment uses only the money actually available and carries a partial or unpaid remainder forward', () => {
  let state = engine.choose(fractionalFareChoice(), 'return_home');
  state = engine.setFocus(state, 'make');
  state = engine.advanceDays(state, 330);
  assert.equal(state.facts.young.reserve, 0);
  assert.equal(state.facts.young.fareDeferred, .75);
  state = engine.setFocus(state, 'settle');
  state = engine.advanceDays(state, 30);
  assert.equal(state.age, 30);
  assert.equal(state.facts.young.reserve, 0);
  assert.equal(state.facts.young.fareDeferred, .5);
  assert.match(state.log.find(e => e.id === 'core_year_29').text, /补回了约250元/);
  assert.match(state.log.find(e => e.id === 'core_year_29').text, /还有约500元/);
  assert.equal(.25 + .25 + state.facts.young.fareDeferred, 1);
  state = engine.setFocus(state, 'make');
  state = engine.advanceDays(state, 360);
  assert.equal(state.age, 31);
  assert.equal(state.facts.young.reserve, 0);
  assert.equal(state.facts.young.fareDeferred, .5);
  assert.match(state.log.find(e => e.id === 'core_year_30').text, /还有约500元/);
  assert.deepEqual(engine.validateSave(state), state);
});

test('invalid actions never fabricate focus time or a fixed-age cooperation', () => {
  const initial = engine.startYoungSample();
  assert.deepEqual(engine.advanceDays(initial, 360), initial);
  for (const days of [0, -1, .5, Infinity, 30601]) assert.throws(() => engine.advanceDays(initial, days));
  assert.throws(() => engine.setFocus(initial, 'unknown'));
  assert.throws(() => engine.arrange(initial, 'work_together'));
  const waiting = engine.advanceDays(sample('make'), 120);
  assert.throws(() => engine.setFocus(waiting, 'settle'));
  assert.throws(() => engine.choose(waiting, 'invented'));
});
