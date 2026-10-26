import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES,
  SCENARIOS,
  createGame,
  getActionAvailability,
  applyAction,
  validateSave,
  getSummary,
} from '../dist/engine.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const sequences = Array.from({ length: 8 }, (_, bits) => Array.from({ length: 3 }, (_, index) => (bits & (1 << index) ? 'project' : 'work')));
const play = (scenario, actions) => actions.reduce((state, action) => applyAction(state, action), createGame(scenario));
const hasCode = (code) => (error) => error.code === code;

test('both scenarios start with their disclosed funds and independent unique IDs', () => {
  assert.equal(SCENARIOS.length, 2);
  assert.equal(createGame('roomy').funds, 480);
  assert.equal(createGame('tight').funds, 180);
  assert.notEqual(createGame().lifeId, createGame().lifeId);
  assert.equal(createGame().round, 1);
  assert.equal(createGame().showcase, 'open');
  assert.throws(() => createGame('unknown'), hasCode('unknown_scenario'));
});

for (const scenario of SCENARIOS) {
  for (const actions of sequences) {
    test(`${scenario.id}: ${actions.join(' → ')} preserves accounting, deadline and records`, () => {
      let state = createGame(scenario.id);
      let expectedFunds = scenario.funds;
      let expectedProjects = 0;
      let rejected = false;
      for (const [index, action] of actions.entries()) {
        const previous = state;
        const before = clone(state);
        const availability = getActionAvailability(state, action);
        const netChange = action === 'work' ? 120 : -140;
        assert.equal(availability.netChange, netChange);
        if (expectedFunds + netChange < 0) {
          assert.equal(availability.enabled, false);
          assert.match(availability.reason, /还差/);
          assert.throws(() => applyAction(state, action), hasCode('insufficient_funds'));
          assert.deepEqual(state, before);
          assert.equal(getActionAvailability(state, 'work').enabled, true);
          rejected = true;
          break;
        }
        assert.equal(availability.enabled, true);
        state = applyAction(state, action, index + 1);
        assert.deepEqual(previous, before, 'the previous state remains intact');
        expectedFunds += netChange;
        expectedProjects += Number(action === 'project');
        assert.equal(state.funds, expectedFunds);
        assert.equal(state.projectSteps, expectedProjects);
        assert.equal(state.round, index + 2);
        assert.equal(state.events.filter((item) => item.type === 'round.resolved').length, index + 1);
        assert.equal(state.events.filter((item) => item.type.startsWith('showcase.')).length, index >= 1 ? 1 : 0);
        const recovered = validateSave(JSON.stringify(state));
        assert.equal(recovered.valid, true);
        assert.deepEqual(recovered.state, state);
      }
      if (rejected) {
        assert.equal(scenario.id, 'tight');
        assert.deepEqual(actions.slice(0, 2), ['project', 'project']);
        return;
      }
      assert.equal(state.status, 'ended');
      assert.equal(state.round, 4);
      assert.equal(state.funds, scenario.funds + actions.filter((item) => item === 'work').length * 200 - 3 * 80 - expectedProjects * 60);
      const submitted = actions[0] === 'project' && actions[1] === 'project';
      assert.equal(state.showcase, submitted ? 'submitted' : 'missed');
      assert.equal(state.events.filter((item) => item.type === 'project.completed').length, expectedProjects >= 2 ? 1 : 0);
      assert.equal(state.events.filter((item) => item.type === 'project.refined').length, expectedProjects === 3 ? 1 : 0);
      assert.equal(state.events.filter((item) => item.type === 'life.completed').length, 1);
      assert.equal(new Set(state.events.map((item) => item.id)).size, state.events.length);
      assert.deepEqual(state.events.map((item) => item.sequence), state.events.map((_, index) => index + 1));
      const seen = new Set();
      for (const event of state.events) {
        assert.ok(event.sourceEventIds.every((id) => seen.has(id)), 'references point only to already happened events');
        seen.add(event.id);
      }
      const summary = getSummary(state);
      assert.equal(summary.funds, expectedFunds);
      assert.equal(summary.actions.length, 3);
      assert.equal(summary.completed, expectedProjects >= 2);
      assert.equal(summary.refined, expectedProjects === 3);
      assert.equal(summary.totalLivingCosts, 240);
      assert.equal(summary.totalProjectCosts, expectedProjects * 60);
      assert.ok(!('score' in summary));
      assert.ok(!('rating' in summary));
    });
  }
}

test('matching funds and finished booklet do not retroactively grant a missed showcase', () => {
  const early = play('roomy', ['project', 'project', 'work']);
  const late = play('roomy', ['work', 'project', 'project']);
  assert.equal(early.funds, 320);
  assert.equal(late.funds, 320);
  assert.equal(early.projectSteps, 2);
  assert.equal(late.projectSteps, 2);
  assert.equal(early.showcase, 'submitted');
  assert.equal(late.showcase, 'missed');
  assert.equal(late.events.filter((item) => item.type === 'showcase.missed').length, 1);
  assert.equal(late.events.filter((item) => item.type === 'showcase.submitted').length, 0);
});

test('the hand-finished edition is reachable with the roomy opening', () => {
  const state = play('roomy', ['project', 'project', 'project']);
  assert.equal(state.funds, 60);
  assert.equal(state.projectSteps, 3);
  assert.equal(getSummary(state).projectStatus, 'refined');
  assert.equal(state.showcase, 'submitted');
});

test('a tight start can finish privately after first earning enough buffer', () => {
  const state = play('tight', ['work', 'project', 'project']);
  assert.equal(state.funds, 20);
  assert.equal(state.projectSteps, 2);
  assert.equal(state.showcase, 'missed');
});

test('updates do not mutate frozen input, including nested event facts', () => {
  const state = play('roomy', ['project']);
  const original = clone(state);
  const freeze = (value) => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  freeze(state);
  const next = applyAction(state, 'project');
  assert.deepEqual(state, original);
  assert.equal(next.projectSteps, 2);
  next.events[0].facts.fundsAfter = -100;
  assert.equal(state.events[0].facts.fundsAfter, 340);
});

test('stale clicks, unknown actions, ended games and insufficient money are rejected', () => {
  const start = createGame('roomy');
  assert.throws(() => applyAction(start, 'work', 2), hasCode('stale_round'));
  assert.throws(() => applyAction(start, 'invest'), hasCode('unknown_action'));
  const next = applyAction(start, 'work', 1);
  assert.throws(() => applyAction(next, 'work', 1), hasCode('stale_round'));
  const ended = play('roomy', ['work', 'work', 'work']);
  assert.throws(() => applyAction(ended, 'work'), hasCode('game_ended'));
  assert.equal(getActionAvailability(ended, 'project').enabled, false);
  const low = play('tight', ['project']);
  assert.equal(low.funds, 40);
  assert.throws(() => applyAction(low, 'project'), hasCode('insufficient_funds'));
  assert.equal(applyAction(low, 'work').funds, 160);
});

test('save validation accepts canonical JSON irrespective of object key order', () => {
  const state = play('roomy', ['project', 'work']);
  const reordered = Object.fromEntries(Object.entries(state).reverse());
  assert.equal(validateSave(reordered).valid, true);
  const result = validateSave(state);
  result.state.events[0].facts.fundsAfter = 999;
  assert.notEqual(state.events[0].facts.fundsAfter, 999, 'returned recovery is detached');
});

test('valid historical text snapshots survive recovery and subsequent choices', () => {
  const saved = play('roomy', ['project']);
  saved.events[0].textSnapshot = '旧版叙述：你留下第一份街巷素材。';
  const recovered = validateSave(saved);
  assert.equal(recovered.valid, true);
  assert.equal(recovered.state.events[0].textSnapshot, saved.events[0].textSnapshot);
  const next = applyAction(recovered.state, 'project');
  assert.equal(next.events[0].textSnapshot, saved.events[0].textSnapshot);
  assert.equal(getSummary(next).actions[0].text, saved.events[0].textSnapshot);
});

test('save validation rejects corrupt, outdated, inconsistent and non-JSON data', () => {
  const good = play('roomy', ['work', 'project', 'project']);
  const variants = [null, undefined, [], '{broken', 'null', 1, new Date(), { ...good, schemaVersion: 0 }, { ...good, rulesVersion: 'old' }];
  for (const [key, value] of Object.entries({ funds: -1, projectSteps: 3, round: 1, showcase: 'submitted', status: 'playing', extra: true })) {
    variants.push({ ...clone(good), [key]: value });
  }
  const tamperedText = clone(good);
  tamperedText.events[0].textSnapshot = '';
  variants.push(tamperedText);
  const tamperedAction = clone(good);
  tamperedAction.events[0].action = 'project';
  variants.push(tamperedAction);
  const duplicate = clone(good);
  duplicate.events.push(clone(duplicate.events[0]));
  variants.push(duplicate);
  const missingDeadline = clone(good);
  missingDeadline.events = missingDeadline.events.filter((item) => !item.type.startsWith('showcase.'));
  variants.push(missingDeadline);
  const cycle = {};
  cycle.self = cycle;
  variants.push(cycle, { ...good, funds: NaN }, { ...good, funds: Infinity });
  for (const value of variants) {
    const checked = validateSave(value);
    assert.equal(checked.valid, false);
    assert.equal(checked.state, null);
    assert.equal(typeof checked.error, 'string');
    assert.ok(checked.error.length > 0);
  }
  assert.throws(() => applyAction({ ...good, funds: 10000 }, 'work'), hasCode('invalid_save'));
  assert.equal(getActionAvailability({ ...good, funds: 10000 }, 'work').enabled, false);
});

test('an empty fresh save is valid and summaries do not fabricate work, loss or completion', () => {
  const fresh = createGame('tight');
  assert.equal(validateSave(fresh).valid, true);
  const summary = getSummary(fresh);
  assert.equal(summary.actions.length, 0);
  assert.equal(summary.totalEarned, 0);
  assert.equal(summary.totalLivingCosts, 0);
  assert.equal(summary.projectStatus, 'untouched');
  assert.deepEqual(summary.tradeoffs, []);
  assert.equal(summary.showcase, 'open');
});
