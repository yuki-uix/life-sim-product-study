import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_INTRO, getScene, getActionNarrative, getEndingNarrative } from '../dist/story.js';

function state(overrides = {}) {
  return { round: 2, funds: 480, skills: { shop: 0, art: 0 }, completedTasks: [], identities: [], opportunities: [], events: [], ...overrides };
}
const opportunity = (id, unlockedRound = 3) => ({ id, unlockedRound, sourceEventIds: ['event:1'] });
const text = value => [...value.paragraphs, value.dialogue || ''].join('');

test('opening is an immediate scene with two paragraphs and no forced biography', () => {
  const opening = getScene(state({ round: 1 }));
  assert.deepEqual(opening.paragraphs, [...STORY_INTRO.paragraphs]);
  assert.equal(opening.paragraphs.length, 2);
  assert.match(text(opening), /旧书|书架/);
  assert.match(text(opening), /招牌/);
  assert.doesNotMatch(text(opening), /岁|搬家|截稿|人生得分/);
});

test('invitations require a recorded opportunity, the ability and the right week', () => {
  const eligible = state({ round: 3, skills: { shop: 2, art: 0 }, opportunities: [opportunity('shop_shift')] });
  assert.equal(getScene(eligible).opportunityId, 'shop_shift');
  assert.match(text(getScene(eligible)), /能单独看/);
  assert.equal(getScene({ ...eligible, skills: { shop: 1, art: 0 } }).opportunityId, undefined);
  assert.equal(getScene({ ...eligible, opportunities: [] }).opportunityId, undefined);
  assert.equal(getScene({ ...eligible, round: 2 }).opportunityId, undefined);
});

test('a milestone needs both proficiency and actual task experience', () => {
  const ready = state({ round: 6, skills: { shop: 4, art: 0 }, completedTasks: ['shop_shift'], opportunities: [opportunity('shop_table', 6)] });
  assert.equal(getScene(ready).opportunityId, 'shop_table');
  assert.equal(getScene({ ...ready, completedTasks: [] }).opportunityId, undefined);
  assert.equal(getScene({ ...ready, identities: ['shop'] }).opportunityId, undefined);
  assert.equal(getScene({ ...ready, skills: { shop: 3, art: 0 } }).opportunityId, undefined);
});

test('pending invitations describe an opportunity, never an already completed outcome', () => {
  const art = state({ round: 3, skills: { shop: 0, art: 2 }, opportunities: [opportunity('art_commission')] });
  const artInvite = getScene(art);
  assert.equal(artInvite.opportunityId, 'art_commission');
  assert.match(text(artInvite), /能给我画/);
  assert.doesNotMatch(text(artInvite), /已经挂|已经装订/);
  const book = state({ round: 6, skills: { shop: 0, art: 4 }, completedTasks: ['art_commission'], opportunities: [opportunity('art_book', 6)] });
  assert.equal(getScene(book).opportunityId, 'art_book');
  assert.match(text(getScene(book)), /可以.*装订/);
  assert.doesNotMatch(text(getEndingNarrative(book)), /已经装订成册/);
});

test('completed invitations stop recurring and milestones have priority', () => {
  const both = state({ round: 6, skills: { shop: 4, art: 2 }, completedTasks: ['shop_shift'], opportunities: [opportunity('shop_table', 5), opportunity('art_commission', 6)] });
  assert.equal(getScene(both).opportunityId, 'shop_table');
  assert.equal(getScene({ ...both, completedTasks: ['shop_shift', 'shop_table'], identities: ['shop'] }).opportunityId, 'art_commission');
});

test('first use, repeat use and identity use describe different responsibilities', () => {
  for (const [action, identity] of [['shop_shift', 'shop'], ['art_commission', 'art']]) {
    const fresh = state({ skills: { shop: 2, art: 2 } });
    const repeat = { ...fresh, completedTasks: [action], events: [{ type: 'round.resolved', action }] };
    const proficient = { ...repeat, identities: [identity], skills: { shop: 4, art: 4 } };
    const scenes = [fresh, repeat, proficient].map(previous => getActionNarrative(previous, action));
    assert.equal(new Set(scenes.map(value => value.title)).size, 3);
    assert.equal(new Set(scenes.map(text)).size, 3);
  }
  assert.match(text(getActionNarrative(state({ identities: ['shop'] }), 'shop_shift')), /荐书卡|选法/);
  assert.match(text(getActionNarrative(state({ identities: ['art'] }), 'art_commission')), /构图|印刷/);
});

test('each path leaves distinct visible work instead of only praise or a salary', () => {
  assert.match(text(getActionNarrative(state(), 'shop_practice')), /索引卡/);
  assert.match(text(getActionNarrative(state(), 'art_practice')), /草稿/);
  assert.match(text(getActionNarrative(state(), 'shop_table')), /荐书卡|周末书桌/);
  assert.match(text(getActionNarrative(state(), 'art_book')), /住在这里|四页/);
  const shop = getEndingNarrative(state({ identities: ['shop'], skills: { shop: 4, art: 0 } }));
  const art = getEndingNarrative(state({ identities: ['art'], skills: { shop: 0, art: 4 } }));
  assert.match(text(shop), /书店搭档/);
  assert.match(text(art), /街巷画手/);
  assert.doesNotMatch(text(shop), /小册|画手/);
});

test('narratives do not invent debt or punish low funds and never mutate input', () => {
  const low = state({ funds: 0, skills: { shop: 1, art: 1 }, events: [{ type: 'round.resolved', action: 'art_practice' }] });
  const saved = JSON.stringify(low);
  const values = [getScene(low), getActionNarrative(low, 'shop_practice'), getEndingNarrative(low)];
  for (const value of values) assert.doesNotMatch(text(value), /负债|欠款|失败|人生得分/);
  assert.equal(JSON.stringify(low), saved);
  assert.throws(() => getActionNarrative(low, 'unknown'), TypeError);
});
