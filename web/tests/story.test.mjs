import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, CHOICES, MEMORIES, PEOPLE, SKILLS, getScene, getNarrative, getEnding, getChoicePresentation, getPersonNote } from '../dist/content.js';

const state = (overrides = {}) => ({ semester: 1, phase: 'activity', slot: 1, skills: { record: 0, organize: 0 }, peopleMet: ['ahe'], memories: [], flags: {}, events: [], ...overrides });
const memory = id => ({ id, semester: 1, sourceEventId: `event:${id}` });
const text = value => [...value.paragraphs, value.dialogue || ''].join('');
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}

test('first-year content has a four-year horizon and complete, distinct factual keepsakes', () => {
  assert.equal(CONFIG.programYears, 4);
  assert.equal(CONFIG.playableSemesters, 2);
  assert.equal(CONFIG.activitySlots, 2);
  assert.deepEqual(Object.keys(SKILLS).sort(), ['organize', 'record']);
  assert.equal(Object.keys(PEOPLE).length, 3);
  assert.equal(new Set(CHOICES.map(choice => choice.memoryId)).size, CHOICES.length);
  for (const choice of CHOICES) {
    assert.ok([1, 2].includes(choice.semester));
    const keepsake = MEMORIES[choice.memoryId];
    assert.ok(keepsake?.title && keepsake?.caption && keepsake?.place && keepsake?.art, choice.id);
    if (choice.requiresMemory) assert.ok(CHOICES.some(earlier => earlier.memoryId === choice.requiresMemory && earlier.semester < choice.semester));
  }
});

test('opening starts with an immediate, low-pressure situation instead of a biography', () => {
  const opening = getScene(state());
  assert.equal(opening.paragraphs.length, 2);
  assert.equal(opening.location, 'dorm');
  assert.match(text(opening), /阿禾/);
  assert.doesNotMatch(text(opening), /出生|家境|求职|考核|先选择职业|学满/);
});

test('shared campus scenes happen regardless of training, without announcing the player already solved them', () => {
  for (const semester of [1, 2]) {
    const common = state({ semester, phase: 'campus' });
    const trained = { ...common, skills: { record: 3, organize: 3 } };
    assert.deepEqual(getScene(common), getScene(trained));
    assert.doesNotMatch(text(getScene(common)), /你已经办好|你已经拍下|获得.*称号|全场.*喝彩/);
  }
});

test('the new semester remembers the actual autumn participation instead of inventing another route', () => {
  const photos = getScene(state({ semester: 2, memories: [memory('rain_photos')], peopleMet: ['ahe','xiaoman'] }));
  const screening = getScene(state({ semester: 2, memories: [memory('rain_screening')], peopleMet: ['ahe','xiaoman'] }));
  const audience = getScene(state({ semester: 2, memories: [memory('shared_blanket')], peopleMet: ['ahe','linye'] }));
  assert.equal(new Set([photos, screening, audience].map(text)).size, 3);
  assert.match(text(photos), /你拍的雨夜照片/);
  assert.match(text(screening), /再放场电影/);
  assert.match(text(audience), /台词|笑点/);
  assert.doesNotMatch(text(audience), /你拍的|你.*放场电影|小满发来/);
});

test('later labels and companion notes only refer to experiences that have happened', () => {
  const fresh = state({ semester: 2 });
  const familiar = state({ semester: 2, memories: [memory('first_sunset'), memory('dorm_ticket')], peopleMet: ['ahe','linye'] });
  assert.notEqual(getChoicePresentation(fresh, 'spring_walk').title, getChoicePresentation(familiar, 'spring_walk').title);
  assert.notEqual(getChoicePresentation(fresh, 'spring_playlist').title, getChoicePresentation(familiar, 'spring_playlist').title);
  assert.equal(getPersonNote(fresh, 'linye'), '还没遇见');
  assert.match(getPersonNote(familiar, 'linye'), /晚霞/);
  assert.doesNotMatch(getPersonNote(familiar, 'ahe'), /毯子|放映角|歌单/);
  assert.throws(() => getChoicePresentation(fresh, 'unknown'), TypeError);
  assert.throws(() => getPersonNote(fresh, 'unknown'), TypeError);
});

test('a person encountered during a choice is introduced rather than presented as an old friend', () => {
  const fresh = state({ phase: 'campus' });
  const known = { ...fresh, peopleMet: ['ahe','xiaoman','linye'] };
  for (const id of ['rain_photos', 'rain_screening', 'rain_audience', 'spring_picnic', 'spring_walk', 'festival_screen', 'festival_audience']) {
    assert.notEqual(text(getNarrative(fresh, id)), text(getNarrative(known, id)), id);
  }
  assert.match(text(getNarrative(fresh, 'rain_audience')), /互相介绍|他叫林野/);
  assert.doesNotMatch(text(getNarrative(known, 'rain_audience')), /互相介绍|他叫林野/);
});

test('all outcomes stay concise, preserve a real keepsake, and accept quiet participation without a failure judgement', () => {
  for (const choice of CHOICES) {
    const result = getNarrative(state(), choice.id);
    assert.ok(result.location);
    assert.equal(result.paragraphs.length, 2, choice.id);
    assert.equal(result.memoryCaption, MEMORIES[choice.memoryId].caption);
    assert.ok(result.paragraphs.every(paragraph => paragraph.length <= 65), choice.id);
    assert.doesNotMatch(text(result), /求职|升职|负债|扣款|人生得分|未通过|全场.*喝彩/);
  }
  for (const id of ['rain_audience', 'festival_audience']) {
    const choice = CHOICES.find(item => item.id === id);
    assert.deepEqual(choice.skillGains, {});
    assert.ok(choice.with.length);
    assert.doesNotMatch(text(getNarrative(state(), id)), /错失|遗憾|失败|只能|没有贡献/);
  }
});

test('ending describes the first year using owned memories, without claiming graduation or every possible hobby', () => {
  const audience = getEnding(state({ phase: 'ended', semester: 2, memories: [memory('dorm_ticket'), memory('festival_song')] }));
  const guide = getEnding(state({ phase: 'ended', semester: 2, memories: [memory('first_sunset'), memory('festival_map')] }));
  assert.notEqual(text(audience), text(guide));
  assert.match(audience.title, /大一/);
  assert.match(text(audience), /手画的电影票/);
  assert.doesNotMatch(text(audience), /路线图|四年.*结束|毕业|工作|更成功/);
  assert.match(text(guide), /路线图/);
});

test('content queries do not mutate their input or rely on browser or randomness', () => {
  const input = deepFreeze(state({ semester: 2, memories: [memory('rain_photos')], peopleMet: ['ahe','xiaoman'] }));
  const before = JSON.stringify(input);
  getScene(input); getNarrative(input, 'photo_invite'); getEnding(input); getChoicePresentation(input, 'spring_walk'); getPersonNote(input, 'xiaoman');
  assert.equal(JSON.stringify(input), before);
  assert.throws(() => getNarrative(input, 'unknown'), TypeError);
});
