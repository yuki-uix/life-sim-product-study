import test from 'node:test';
import assert from 'node:assert/strict';
import { getReplicaView, logDisplayEntries } from '../dist/replica/model.js';
import { createGame, begin, advance, advanceDays, choose, startYoungSample, setFocus, getLifeView, validateSave } from '../dist/replica/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));

// Reach authored scenes through real days; optional invitations are declined,
// never skipped by changing the saved age or manufacturing completion flags.
function reachAge(input, age, storyChoices = {}) {
  let state = input;
  for (let step = 0; step < 1000 && state.age < age; step++) {
    if (state.pending) {
      const choice = state.pending.startsWith('core_') ? 'decline' : storyChoices[state.pending];
      assert.ok(choice, 'A real story choice is required: ' + state.pending);
      state = choose(state, choice);
      continue;
    }
    if (getLifeView(state).needsPlan) state = setFocus(state, 'settle');
    const next = advanceDays(state, (age - state.age) * 360 - (state.day || 0));
    assert.ok(next.age > state.age || next.day > state.day || next.pending, 'The fixture must make real progress.');
    state = next;
  }
  assert.equal(state.age, age);
  return state;
}

test('the replica shows actual young-life scales and reserve without changing the save', () => {
  const state = setFocus(startYoungSample(), 'make');
  const before = copy(state);
  const view = getReplicaView(state);
  assert.equal(view.identity.name, '陈知夏');
  assert.equal(view.identity.city, '临港');
  assert.equal(view.stage, '展览视频 · 临港');
  assert.deepEqual(view.statusItems.map(row => [row.id, row.raw, row.max]), [
    ['progress', 0, 18], ['skill', 0, 12], ['energy', 5, 6], ['connection', 1, 6],
  ]);
  assert.equal(view.money.raw, 3000, 'selecting a routine has not spent money or days');
  assert.deepEqual(view.arrangements, [], 'the old fixed-age tasks are not presented as core opportunities');
  assert.ok(view.statusItems.every(row => /\d+\.\d \/ \d+/.test(row.value)));
  assert.deepEqual(view.ledgerRows.map(row => [row.id, row.days, row.months, row.value]), [
    ['make', 0, 0, '0.0个月'], ['connect', 0, 0, '0.0个月'], ['settle', 0, 0, '0.0个月'],
  ]);
  assert.deepEqual(state, before);
  assert.deepEqual(validateSave(before), state);
});

test('inactive stages do not invent numeric statuses, a degree or a later occupation', () => {
  for (const state of [createGame(), begin(createGame()), choose(advance(begin(createGame()), 18), 'local')]) {
    const view = getReplicaView(state);
    assert.deepEqual(view.statusItems, []);
    assert.equal(view.money, null);
    assert.equal(view.yearTime, null);
    assert.equal(view.identity.items.some(row => row.label === '工作经历'), false);
    assert.equal(view.identity.items.some(row => /本科|专科|学士/.test(row.value)), false);
  }
});

test('people only appear after their actual meeting and preserve later relationship facts', () => {
  let state = begin(createGame());
  assert.deepEqual(getReplicaView(state).people.map(p => p.id), ['father', 'mother']);
  state = advance(state, 10);
  assert.ok(getReplicaView(state).people.some(p => p.id === 'zhouzhou'));
  assert.equal(getReplicaView(state).people.some(p => p.id === 'songwen'), false);
  state = choose(advance(state, 8), 'away');
  state = setFocus(advance(state, 5), 'settle');
  state = choose(reachAge(state, 29), 'return_home');
  state = reachAge(state, 40);
  state = choose(state, 'separate');
  const song = getReplicaView(state).people.find(p => p.id === 'songwen');
  assert.match(song.relation, /各住各的/);
  assert.equal(state.facts.cohabit, false);
});

test('compact log display preserves all authored text and quotes while the pending scene stays separate', () => {
  const state = advance(begin(createGame()), 18);
  const entries = logDisplayEntries(state);
  assert.equal(entries.some(row => row.kind === 'decision' || row.kind === 'end'), false);
  assert.deepEqual(entries, state.log.filter(row => row.kind !== 'decision' && row.kind !== 'end').slice().reverse());
  assert.ok(entries.find(row => row.id === 'child_recording').quote);
  assert.equal(getReplicaView(state).currentScene.id, state.pending);
  assert.equal(entries[0].age, 16);
});

test('the age31 summary is display-only and returned models cannot rewrite saved facts or prose', () => {
  let state = setFocus(startYoungSample(), 'make');
  state = choose(reachAge(state, 29), 'finish_film');
  state = reachAge(state, 31);
  const before = copy(state);
  const entries = logDisplayEntries(state);
  assert.equal(entries[0].id, 'young-phase-summary');
  assert.equal(entries[0].displayOnly, true);
  assert.match(entries[0].text, /那一周留给了片子/);
  assert.equal(state.log.some(row => row.id === 'young-phase-summary'), false);
  entries[1].text = 'changed only in the view';
  const view = getReplicaView(state);
  view.people[0].detail = 'changed only in the view';
  view.currentScene.text = 'changed only in the view';
  assert.deepEqual(state, before);
  assert.deepEqual(validateSave(state), before);
});

test('the visible investment ledger uses elapsed days rather than the last selected routine', () => {
  let state = setFocus(startYoungSample(), 'make');
  state = advanceDays(state, 45);
  assert.equal(state.pending, null);
  state = setFocus(state, 'settle');
  state = advanceDays(state, 30);
  const before = copy(state);
  const view = getReplicaView(state);
  const make = view.ledgerRows.find(row => row.id === 'make');
  const settle = view.ledgerRows.find(row => row.id === 'settle');
  assert.deepEqual([make.days, make.months, make.value], [45, 1.5, '1.5个月']);
  assert.deepEqual([settle.days, settle.months, settle.value], [30, 1, '1.0个月']);
  assert.equal(view.totalLedgerRows.find(row => row.id === 'make').days, 45);
  assert.equal(view.routeFacts.length, 0, 'practice time alone does not fabricate a completed specialism');
  assert.deepEqual(view.lastChangeSummaries, getLifeView(state).lastChanges);
  view.ledgerRows[0].days = 999;
  view.totalLedgerRows[0].value = 'made up';
  assert.deepEqual(state, before);
});
