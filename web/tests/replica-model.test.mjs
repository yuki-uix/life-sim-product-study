import test from 'node:test';
import assert from 'node:assert/strict';
import { getReplicaView, logDisplayEntries } from '../dist/replica/model.js';
import { createGame, begin, advance, choose, startYoungSample, setFocus, arrange, validateSave } from '../dist/life/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));

test('the replica shows actual young-life scales and reserve without changing the save', () => {
  const state = arrange(setFocus(startYoungSample(), 'make'), 'edit_lab');
  const before = copy(state);
  const view = getReplicaView(state);
  assert.equal(view.identity.name, '陈知夏');
  assert.equal(view.identity.city, '临港');
  assert.equal(view.stage, '展览视频 · 临港');
  assert.deepEqual(view.statusItems.map(row => [row.id, row.raw, row.max]), [
    ['progress', 0, 18], ['skill', 0, 12], ['energy', 5, 6], ['connection', 1, 6],
  ]);
  assert.equal(view.money.raw, 3000, 'an appointment has not spent the money yet');
  assert.equal(view.arrangements.find(row => row.id === 'edit_lab').selected, true);
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
  state = choose(advance(state, 6), 'return_home');
  state = advance(state, 11);
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
  state = choose(advance(state, 6), 'finish_film');
  state = advance(state, 2);
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
