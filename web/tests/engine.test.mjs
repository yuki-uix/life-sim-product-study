import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, SCENARIOS, ACTIONS, createGame, getSkillStage, getActionAvailability, applyAction, validateSave, getSummary } from '../dist/engine.js';

const clone = value => JSON.parse(JSON.stringify(value));
const play = (actions, scenario = 'roomy') => actions.reduce((state, action) => applyAction(state, action), createGame(scenario));
const hasCode = code => error => error.code === code;
const basic = skill => `${skill === 'shop' ? 'shop' : 'art'}_practice`;
const task = skill => skill === 'shop' ? 'shop_shift' : 'art_commission';
const milestone = skill => skill === 'shop' ? 'shop_table' : 'art_book';

function assertRecords(state) {
  assert.equal(validateSave(state).valid, true);
  assert.equal(new Set(state.events.map(event => event.id)).size, state.events.length);
  assert.deepEqual(state.events.map(event => event.sequence), state.events.map((_, index) => index + 1));
  const seen = new Set();
  for (const event of state.events) {
    assert.ok(event.sourceEventIds.every(id => seen.has(id)), 'sources refer only to facts already recorded');
    seen.add(event.id);
  }
}

test('fresh characters have disclosed starting funds, separate IDs and no invented accomplishments', () => {
  assert.equal(SCENARIOS.length, 2);
  assert.equal(ACTIONS.length, 6);
  const fresh = createGame();
  assert.equal(fresh.funds, 480);
  assert.equal(createGame('tight').funds, 180);
  assert.notEqual(fresh.lifeId, createGame().lifeId);
  assert.equal(fresh.round, 1);
  assert.deepEqual(fresh.skills, { shop: 0, art: 0 });
  assert.deepEqual(fresh.identities, []);
  assert.deepEqual(fresh.completedTasks, []);
  assert.deepEqual(fresh.opportunities, []);
  assert.equal(getSummary(fresh).totalEarned, 0);
  assert.equal(getSummary(fresh).totalLivingCosts, 0);
  assert.throws(() => createGame('missing'), hasCode('unknown_scenario'));
  assertRecords(fresh);
});

test('ability stages are named, while ability and identity remain separate facts', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(getSkillStage), ['生疏', '试着做', '上手', '渐熟', '熟练']);
  const practiced = play(Array(4).fill('shop_practice'));
  assert.equal(practiced.skills.shop, 4);
  assert.deepEqual(practiced.identities, []);
  assert.equal(getActionAvailability(practiced, 'shop_table').enabled, false);
  assert.match(getActionAvailability(practiced, 'shop_table').reason, /实际完成/);
});

for (const skill of ['shop', 'art']) {
  test(`${skill}: ability 2 causes one invitation; task cannot be used before training`, () => {
    const start = createGame();
    assert.equal(getActionAvailability(start, task(skill)).enabled, false);
    assert.throws(() => applyAction(start, task(skill)), hasCode('unavailable_action'));
    const first = applyAction(start, basic(skill));
    assert.equal(first.opportunities.length, 0);
    const second = applyAction(first, basic(skill));
    const invitation = second.opportunities.find(item => item.id === task(skill));
    assert.equal(second.skills[skill], 2);
    assert.equal(invitation.unlockedRound, 3);
    assert.equal(second.round, 3);
    assert.equal(getActionAvailability(second, task(skill)).enabled, true);
    const sources = invitation.sourceEventIds.map(id => second.events.find(event => event.id === id));
    assert.equal(sources.length, 2);
    assert.ok(sources.every(event => event.type === 'skill.gained' && event.facts.skill === skill));
    const used = applyAction(second, task(skill));
    assert.equal(used.skills[skill], 2, 'using a trained skill does not secretly add training');
    assert.deepEqual(used.completedTasks, [task(skill)]);
    assert.equal(used.events.filter(event => event.type === 'task.completed').length, 1);
    const repeated = applyAction(used, task(skill));
    assert.deepEqual(repeated.completedTasks, [task(skill)]);
    assert.equal(repeated.events.filter(event => event.type === 'task.completed').length, 1);
    assert.equal(repeated.opportunities.filter(item => item.id === task(skill)).length, 1);
    assertRecords(repeated);
  });

  test(`${skill}: mastery needs training and actual use; identity can be earned in week 6 and used twice`, () => {
    const path = [basic(skill), basic(skill), task(skill), basic(skill), basic(skill), milestone(skill)];
    let state = createGame();
    for (const [index, action] of path.entries()) {
      const previous = state;
      const before = clone(state);
      state = applyAction(state, action);
      assert.deepEqual(previous, before);
      assert.equal(state.round, index + 2);
      assertRecords(state);
      if (index < 4) assert.equal(state.opportunities.some(item => item.id === milestone(skill)), false);
    }
    assert.equal(state.status, 'playing');
    assert.equal(state.round, 7);
    assert.deepEqual(state.identities, [skill]);
    assert.equal(state.events.filter(event => event.type === 'identity.earned').length, 1);
    assert.equal(getActionAvailability(state, milestone(skill)).enabled, false);
    assert.throws(() => applyAction(state, milestone(skill)), hasCode('unavailable_action'));
    const skilledAction = getActionAvailability(state, task(skill));
    assert.equal(skilledAction.netChange, skill === 'shop' ? 280 : 180);
    assert.match(skilledAction.title, skill === 'shop' ? /负责周末书桌/ : /插画约稿/);
    state = applyAction(state, task(skill));
    state = applyAction(state, task(skill));
    assert.equal(state.status, 'ended');
    assert.equal(state.round, 9);
    assert.equal(state.events.filter(event => event.type === 'life.completed').length, 1);
    const usesAfterIdentity = state.events.filter(event => event.type === 'round.resolved' && event.round > 6);
    assert.equal(usesAfterIdentity.length, 2);
    assert.ok(usesAfterIdentity.every(event => event.facts.netChange === skilledAction.netChange));
    assert.equal(state.funds, skill === 'shop' ? 1680 : 400);
    assert.throws(() => applyAction(state, task(skill)), hasCode('game_ended'));
    assertRecords(state);
  });

  test(`${skill}: training first still triggers milestone after the prerequisite task is actually done`, () => {
    let state = play(Array(4).fill(basic(skill)));
    assert.equal(state.opportunities.some(item => item.id === milestone(skill)), false);
    state = applyAction(state, task(skill));
    const invitation = state.opportunities.find(item => item.id === milestone(skill));
    assert.equal(invitation.unlockedRound, 6);
    const sourceEvents = invitation.sourceEventIds.map(id => state.events.find(event => event.id === id));
    assert.equal(sourceEvents.filter(event => event.type === 'skill.gained').length, 4);
    assert.equal(sourceEvents.filter(event => event.type === 'task.completed' && event.action === task(skill)).length, 1);
    assert.equal(getActionAvailability(state, milestone(skill)).enabled, true);
    const identity = applyAction(state, milestone(skill));
    assert.equal(identity.identities.includes(skill), true);
    assertRecords(identity);
  });
}

test('six actions are necessary for one identity; eight actions cannot earn both identities', () => {
  // Each identity requires four training actions, one practical task and one milestone.
  for (const skill of ['shop', 'art']) {
    assert.equal(ACTIONS.find(action => action.id === milestone(skill)).requiredSkill, 4);
    assert.equal(ACTIONS.find(action => action.id === milestone(skill)).requiredTask, task(skill));
    assert.equal(ACTIONS.filter(action => action.skill === skill && action.skillGain > 0).length, 1);
  }
  const focused = play(['shop_practice', 'shop_practice', 'shop_shift', 'shop_practice', 'shop_practice', 'shop_table', 'art_practice', 'art_practice']);
  assert.deepEqual(focused.identities, ['shop']);
  assert.deepEqual(focused.skills, { shop: 4, art: 2 });
  assert.equal(focused.status, 'ended');
  assert.equal(focused.opportunities.some(item => item.id === 'art_commission'), true);
  assert.equal(focused.completedTasks.includes('art_commission'), false);
  const broad = play(['shop_practice', 'art_practice', 'shop_practice', 'art_practice', 'shop_shift', 'art_commission', 'shop_practice', 'art_practice']);
  assert.deepEqual(broad.identities, []);
  assert.deepEqual(broad.skills, { shop: 3, art: 3 });
  assert.deepEqual(broad.completedTasks, ['shop_shift', 'art_commission']);
});

test('a tight start can recover funds without losing an already learned skill or a persistent invitation', () => {
  let state = play(['art_practice'], 'tight');
  assert.equal(state.funds, 60);
  assert.equal(getActionAvailability(state, 'art_practice').enabled, false);
  assert.match(getActionAvailability(state, 'art_practice').reason, /还差 60 元/);
  assert.throws(() => applyAction(state, 'art_practice'), hasCode('insufficient_funds'));
  assert.equal(getActionAvailability(state, 'shop_practice').enabled, true);
  state = applyAction(state, 'shop_practice');
  state = applyAction(state, 'art_practice');
  assert.equal(state.funds, 60);
  assert.equal(state.skills.art, 2);
  state = applyAction(state, 'shop_practice');
  assert.equal(state.skills.art, 2);
  assert.equal(getActionAvailability(state, 'art_commission').enabled, true);
  state = applyAction(state, 'art_commission');
  assert.equal(state.funds, 300);
  assert.equal(state.completedTasks.includes('art_commission'), true);
  assertRecords(state);
});

test('skills cap at four, while repeated basic work remains a usable source of income', () => {
  const state = play(Array(8).fill('shop_practice'));
  assert.equal(state.skills.shop, 4);
  assert.equal(state.funds, 1440);
  assert.equal(state.events.filter(event => event.type === 'skill.gained').length, 4);
  assert.equal(state.events.filter(event => event.type === 'opportunity.unlocked').length, 1);
  assert.deepEqual(state.identities, []);
  assertRecords(state);
});

test('accounting in records and summary matches every income, material charge and weekly cost', () => {
  const state = play(['art_practice', 'shop_practice', 'art_practice', 'art_commission', 'shop_practice', 'shop_shift', 'art_practice', 'art_practice']);
  const summary = getSummary(state);
  assert.equal(summary.actions.length, 8);
  assert.equal(summary.totalEarned, 200 * 2 + 260 + 320);
  assert.equal(summary.totalMaterialsCosts, 40 * 4 + 60);
  assert.equal(summary.totalLivingCosts, 80 * 8);
  assert.equal(summary.funds, 480 + summary.totalEarned - summary.totalMaterialsCosts - summary.totalLivingCosts);
  assert.ok(!('score' in summary));
  assert.ok(!('rating' in summary));
  for (const event of summary.actions) {
    assert.equal(event.netChange, event.income - event.materialsCost - event.livingCost);
    assert.equal(event.fundsAfter, event.fundsBefore + event.netChange);
  }
  summary.skills.shop = 99;
  assert.notEqual(state.skills.shop, 99);
});

test('inputs remain immutable, including deeply frozen saves', () => {
  const state = play(['shop_practice']);
  const original = clone(state);
  const freeze = value => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  freeze(state);
  const next = applyAction(state, 'shop_practice');
  assert.deepEqual(state, original);
  next.events[0].facts.fundsAfter = -1;
  assert.equal(state.events[0].facts.fundsAfter, 600);
});

test('stale clicks, unknown actions, unavailable skills and ended games cannot resolve again', () => {
  const fresh = createGame();
  assert.throws(() => applyAction(fresh, 'shop_practice', 2), hasCode('stale_round'));
  assert.throws(() => applyAction(fresh, 'work'), hasCode('unknown_action'));
  assert.throws(() => applyAction(fresh, 'shop_shift'), hasCode('unavailable_action'));
  const next = applyAction(fresh, 'shop_practice', 1);
  assert.throws(() => applyAction(next, 'shop_practice', 1), hasCode('stale_round'));
  const ended = play(Array(8).fill('shop_practice'));
  assert.throws(() => applyAction(ended, 'shop_practice'), hasCode('game_ended'));
  assert.equal(getActionAvailability(ended, 'shop_practice').enabled, false);
});

test('text snapshots survive recovery and later choices, without rewriting historical copy', () => {
  const state = play(['shop_practice', 'shop_practice']);
  state.events[0].textSnapshot = '旧版事实文字：你第一次帮忙把书归回书架。';
  state.events.at(-1).textSnapshot = '旧版邀请文字：陈姐想请你独立照看书店。';
  const recovered = validateSave(JSON.stringify(state));
  assert.equal(recovered.valid, true);
  assert.equal(recovered.state.events[0].textSnapshot, state.events[0].textSnapshot);
  const next = applyAction(recovered.state, 'shop_shift');
  assert.equal(next.events[0].textSnapshot, state.events[0].textSnapshot);
  assert.equal(next.events[state.events.length - 1].textSnapshot, state.events.at(-1).textSnapshot);
  assert.equal(getSummary(next).actions[0].text, state.events[0].textSnapshot);
});

test('save replay accepts reordered JSON keys but rejects changed ability, money, causal links or task history', () => {
  const state = play(['shop_practice', 'shop_practice', 'shop_shift', 'shop_practice', 'shop_practice', 'shop_table']);
  assert.equal(validateSave(Object.fromEntries(Object.entries(state).reverse())).valid, true);
  const variants = [
    { ...clone(state), funds: 99999 },
    { ...clone(state), skills: { shop: 4, art: 4 } },
    { ...clone(state), identities: ['shop', 'art'] },
    { ...clone(state), completedTasks: [] },
    { ...clone(state), round: 3 },
    { ...clone(state), status: 'ended' },
    { ...clone(state), extra: true },
  ];
  const opportunityTamper = clone(state);
  opportunityTamper.opportunities[0].unlockedRound = 2;
  variants.push(opportunityTamper);
  const causalityTamper = clone(state);
  causalityTamper.opportunities[1].sourceEventIds = [];
  variants.push(causalityTamper);
  const actionTamper = clone(state);
  actionTamper.events[0].action = 'art_practice';
  variants.push(actionTamper);
  const duplicate = clone(state);
  duplicate.events.push(clone(duplicate.events[0]));
  variants.push(duplicate);
  const missing = clone(state);
  missing.events = missing.events.filter(event => event.type !== 'task.completed');
  variants.push(missing);
  const emptyText = clone(state);
  emptyText.events[0].textSnapshot = '';
  variants.push(emptyText);
  for (const variant of variants) {
    assert.equal(validateSave(variant).valid, false);
    assert.equal(getActionAvailability(variant, 'shop_practice').enabled, false);
    assert.throws(() => applyAction(variant, 'shop_practice'), hasCode('invalid_save'));
  }
});

test('old versions and malformed/non-JSON data are rejected without modifying input', () => {
  const old = { schemaVersion: 1, rulesVersion: '0.1.0', events: [] };
  const before = clone(old);
  const cycle = {};
  cycle.self = cycle;
  for (const value of [old, null, undefined, [], '{broken', 'null', 1, new Date(), cycle, { ...createGame(), funds: NaN }, { ...createGame(), funds: Infinity }]) {
    const checked = validateSave(value);
    assert.equal(checked.valid, false);
    assert.equal(checked.state, null);
    assert.ok(checked.error.length > 0);
  }
  assert.deepEqual(old, before);
  assert.equal(RULES.schemaVersion, 2);
  assert.equal(RULES.version, '0.2.0');
});
