import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, validateSave } from '../dist/engine.js';
import { STORY_INTRO, getScene, getActionNarrative, getEndingNarrative } from '../dist/story.js';

const advance = (actions) => actions.reduce((state, action) => applyAction(state, action), createGame('roomy'));

test('opening supplies an actionable present without a biography or mandatory setup', () => {
  const opening = getScene(createGame('roomy'));
  assert.ok(opening.paragraphs.length <= 3);
  assert.match(opening.paragraphs.join(''), /书店今天缺人/);
  assert.match(opening.paragraphs.join(''), /空白小册/);
  assert.doesNotMatch(opening.paragraphs.join(''), /室友|搬家|林舟/);
  assert.deepEqual(opening.paragraphs, [...STORY_INTRO.paragraphs]);
});

test('the second scene remembers the object created by the actual first action', () => {
  const work = advance(['work']);
  const project = advance(['project']);
  assert.match(getScene(work).paragraphs.join(''), /街巷图/);
  assert.doesNotMatch(getScene(work).paragraphs.join(''), /今晚就能交稿/);
  assert.match(getScene(project).paragraphs.join(''), /招牌/);
  assert.match(getScene(project).paragraphs.join(''), /今晚就能交稿/);
  assert.match(work.events[0].textSnapshot, /街图|街巷图/);
  assert.match(project.events[0].textSnapshot, /招牌/);
});

test('working repeatedly also has a different remembered scene and ending', () => {
  const start = createGame('roomy');
  const once = advance(['work']);
  const twice = advance(['work', 'work']);
  const first = getActionNarrative(start, 'work');
  const second = getActionNarrative(once, 'work');
  const third = getActionNarrative(twice, 'work');
  assert.equal(new Set([first.heading, second.heading, third.heading]).size, 3);
  assert.match(getScene(twice).paragraphs.join(''), /订书单/);
  const end = getEndingNarrative(advance(['work', 'work', 'work']));
  assert.match(end.log, /陈姐/);
  assert.doesNotMatch(end.log, /失败|人生得分|小册已经完成/);
});

test('the third scene and ending respect the actual deadline outcome', () => {
  const onTime = advance(['project', 'project']);
  const late = advance(['work', 'project']);
  assert.match(getScene(onTime).paragraphs.join(''), /靠窗展架/);
  assert.match(getScene(late).paragraphs.join(''), /已经收稿/);
  const lateEnd = advance(['work', 'project', 'project']);
  assert.match(lateEnd.events.at(-1).textSnapshot, /收稿时它还没完成/);
  assert.doesNotMatch(lateEnd.events.at(-1).textSnapshot, /已经参加|小册放在.*展架/);
});

test('narratives are pure and the recorded paragraphs survive recovery', () => {
  const before = advance(['project']);
  const copy = JSON.stringify(before);
  getScene(before);
  getActionNarrative(before, 'work');
  getEndingNarrative(before);
  assert.equal(JSON.stringify(before), copy);
  const after = applyAction(before, 'work');
  const saved = JSON.stringify(after);
  const recovered = validateSave(saved);
  assert.equal(recovered.valid, true);
  assert.equal(recovered.state.events[0].textSnapshot, before.events[0].textSnapshot);
  assert.match(recovered.state.events[1].textSnapshot, /陈姐/);
});
