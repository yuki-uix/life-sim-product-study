/** Calendar simulation. Pure rules: no DOM, clock, network, or random outcomes. */
import { CONFIG, PEOPLE, SKILLS, FOCUSES, CALENDAR_LOGS, STORIES, AFTER_LOGS, weeklyText } from './calendar-content-v4.js';

export { CONFIG };
const FOCUS_IDS = FOCUSES.map(focus => focus.id);
const STORY_BY_ID = new Map(STORIES.map(story => [story.id, story]));
const SKILL_IDS = Object.keys(SKILLS);
const LOCATIONS = new Set(['gate', 'dorm', 'lake', 'club', 'hall']);
const MAX_COMMANDS = 2048;
let fallbackId = 0;
const clone = value => JSON.parse(JSON.stringify(value));

function fail(code, message) { const error = new Error(message); error.code = code; return error; }
function appendEvent(state, data) {
  const event = { id: `${state.runId}:log:${state.events.length + 1}`, day: state.day, ...data };
  state.events.push(event);
  return event;
}
function initialState(runId) {
  const state = {
    schemaVersion: CONFIG.schemaVersion, rulesVersion: CONFIG.version, runId,
    day: 0, revision: 0, phase: 'living', focus: 'easy',
    focusDays: Object.fromEntries(FOCUS_IDS.map(id => [id, 0])),
    weekFocusDays: Object.fromEntries(FOCUS_IDS.map(id => [id, 0])),
    skills: Object.fromEntries(SKILL_IDS.map(id => [id, 0])),
    peopleMet: ['ahe'], flags: {}, events: [], favorites: [], pending: null,
    resolvedStories: [], commands: [],
  };
  for (const entry of CALENDAR_LOGS.filter(item => item.day === 0)) {
    appendEvent(state, { kind: entry.kind || 'calendar', title: '九月，开学了', text: entry.text, location: entry.location, contentId: entry.id });
  }
  return state;
}
export function createGame() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++fallbackId}`;
  return initialState(`campus_${uuid}`);
}
function recordCommand(state, command) {
  if (state.commands.length >= MAX_COMMANDS) throw fail('record_limit', '这份校园记录暂时装不下更多操作，请先保留当前记录。');
  state.commands.push(command);
  state.revision += 1;
}
function skillLevel(days) { return days >= 35 ? 3 : days >= 18 ? 2 : days >= 7 ? 1 : 0; }
function sourcesForStory(state, story) {
  const ids = new Set();
  if (story.requiresFocus) {
    for (const event of state.events) if (event.focusId === story.requiresFocus || (event.kind === 'meeting' && event.personId === story.personId)) ids.add(event.id);
  }
  return [...ids];
}
function canOpenStory(state, story) {
  return !state.resolvedStories.includes(story.id)
    && state.day >= story.fromDay && state.day <= story.toDay
    && (!story.requiresFocus || state.focusDays[story.requiresFocus] >= story.minDays)
    && (!story.personId || state.peopleMet.includes(story.personId));
}
function openAvailableStory(state) {
  if (state.pending || state.phase === 'ended') return;
  const story = STORIES.find(item => canOpenStory(state, item));
  if (story) state.pending = { storyId: story.id };
}
function reduceFocus(previous, focusId) {
  if (!FOCUS_IDS.includes(focusId)) throw fail('unknown_focus', '没有这项生活安排。');
  if (previous.phase === 'ended') throw fail('game_ended', '十一月已经过去，可以翻翻这段生活或重新开始。');
  if (previous.pending) throw fail('pending_story', '先回应眼前的事，再调整接下来的安排。');
  const state = clone(previous);
  if (focusId === state.focus) return state;
  state.focus = focusId;
  recordCommand(state, { type: 'focus', focusId });
  return state;
}
function advanceOneDay(state) {
  state.day += 1;
  state.focusDays[state.focus] += 1;
  state.weekFocusDays[state.focus] += 1;
  state.skills.record = skillLevel(state.focusDays.walk);
  state.skills.organize = skillLevel(state.focusDays.club);
  for (const [focusId, personId, text] of [
    ['club', 'xiaoman', '活动室去了几回，负责开门的小满已经认得你了。碰到时，你们会打个招呼。'],
    ['walk', 'linye', '湖边又碰到同班的林野。你们走了一段路，下次上课知道可以坐在谁旁边。'],
  ]) {
    if (state.focusDays[focusId] >= 7 && !state.peopleMet.includes(personId)) {
      state.peopleMet.push(personId);
      appendEvent(state, { kind: 'meeting', text, location: focusId === 'club' ? 'club' : 'lake', personId, focusId });
    }
  }
  for (const entry of CALENDAR_LOGS) {
    if (entry.day === state.day) appendEvent(state, { kind: entry.kind || 'calendar', text: entry.text, location: entry.location, contentId: entry.id });
  }
  if (state.day % 7 === 0) {
    const weeklyFocus = [...FOCUS_IDS].sort((a, b) => state.weekFocusDays[b] - state.weekFocusDays[a] || (a === state.focus ? -1 : b === state.focus ? 1 : 0))[0];
    appendEvent(state, { kind: 'daily', text: weeklyText(weeklyFocus, Math.floor(state.day / 7) - 1), location: FOCUSES.find(item => item.id === weeklyFocus).location, focusId: weeklyFocus });
    state.weekFocusDays = Object.fromEntries(FOCUS_IDS.map(id => [id, 0]));
  }
  for (const entry of AFTER_LOGS) {
    if (entry.day === state.day && state.flags[entry.requiresFlag]) {
      const source = state.events.find(event => event.kind === 'story' && event.flagsAdded?.[entry.requiresFlag]);
      appendEvent(state, { kind: 'daily', text: entry.text, location: entry.location, contentId: entry.id, sourceEventIds: source ? [source.id] : [] });
    }
  }
  openAvailableStory(state);
  if (state.day >= CONFIG.totalDays - 1 && !state.pending) state.phase = 'ended';
}
function reduceAdvance(previous, count) {
  if (!Number.isInteger(count) || count < 1 || count > CONFIG.totalDays) throw fail('invalid_time', '时间只能按一到九十一天向前推进。');
  const state = clone(previous);
  if (state.pending || state.phase === 'ended') return state;
  for (let i = 0; i < count && !state.pending && state.phase === 'living'; i += 1) advanceOneDay(state);
  recordCommand(state, { type: 'time', days: count });
  return state;
}
function choicesFor(state) {
  if (!state.pending) return [];
  const story = STORY_BY_ID.get(state.pending.storyId);
  return story.choices.map(choice => {
    const requirement = choice.requiresSkill;
    const enabled = !requirement || state.skills[requirement.id] >= requirement.min;
    return {
      id: choice.id, title: choice.title, description: choice.description,
      enabled, reason: enabled ? '' : `还需要${SKILLS[requirement.id].name}达到“${SKILLS[requirement.id].stages[requirement.min]}”。`,
    };
  });
}
function reduceChoice(previous, choiceId, expectedRevision = previous.revision) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== previous.revision) throw fail('stale_revision', '眼前的生活已经变化，请使用当前选项。');
  if (previous.phase === 'ended') throw fail('game_ended', '这段秋季生活已经结束。');
  if (!previous.pending) throw fail('no_pending_story', '此刻没有需要回应的事，生活可以继续向前。');
  const story = STORY_BY_ID.get(previous.pending.storyId);
  const choice = story.choices.find(item => item.id === choiceId);
  if (!choice) throw fail('unknown_choice', '这不是眼前这件事的选项。');
  const allowed = choicesFor(previous).find(item => item.id === choiceId);
  if (!allowed.enabled) throw fail('missing_skill', allowed.reason);
  const state = clone(previous);
  const flagsAdded = {};
  for (const [key, value] of Object.entries(choice.flags || {})) {
    flagsAdded[key] = value;
    state.flags[key] = value;
  }
  appendEvent(state, {
    kind: 'story', title: story.title, text: choice.result, location: story.location,
    storyId: story.id, choiceId, flagsAdded, sourceEventIds: sourcesForStory(previous, story),
  });
  state.resolvedStories.push(story.id);
  state.pending = null;
  openAvailableStory(state);
  if (state.day >= CONFIG.totalDays - 1 && !state.pending) state.phase = 'ended';
  recordCommand(state, { type: 'choice', choiceId });
  return state;
}
function checkedState(candidate) {
  const checked = validateSave(candidate);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  return checked.state;
}
export function setFocus(state, focusId) { return reduceFocus(checkedState(state), focusId); }
export function advanceDays(state, count = 1) { return reduceAdvance(checkedState(state), count); }
export function getChoices(state) { return choicesFor(checkedState(state)); }
export function choose(state, choiceId, expectedRevision = state?.revision) { return reduceChoice(checkedState(state), choiceId, expectedRevision); }
export function toggleFavorite(candidate, eventId) {
  const state = clone(checkedState(candidate));
  if (!state.events.some(event => event.id === eventId)) throw fail('unknown_event', '这段记录不存在。');
  state.favorites = state.favorites.includes(eventId) ? state.favorites.filter(id => id !== eventId) : [...state.favorites, eventId];
  return state;
}
function isJsonValue(value, ancestors = new Set(), depth = 0) {
  if (depth > 20) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return false;
  ancestors.add(value);
  const valid = Object.values(value).every(item => isJsonValue(item, ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}
function equalJson(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left).sort();
  const other = Object.keys(right).sort();
  return keys.length === other.length && keys.every((key, index) => key === other[index] && equalJson(left[key], right[key]));
}
function validSnapshot(event) {
  return typeof event.text === 'string' && event.text.trim().length > 0 && event.text.length <= 2500
    && (event.title === undefined || (typeof event.title === 'string' && event.title.trim().length > 0 && event.title.length <= 200));
}
/** Replays calendar commands to reject inconsistent time, skills, people, flags and event facts. Not an anti-cheat identity boundary. */
export function validateSave(candidate) {
  const invalid = error => ({ valid: false, state: null, error });
  try {
    const value = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isJsonValue(value)) return invalid('这份秋季记录暂时无法读取。');
    if (value.schemaVersion !== CONFIG.schemaVersion || value.rulesVersion !== CONFIG.version) return invalid('这份记录属于另一个试玩版本，原记录不会被改写。');
    if (typeof value.runId !== 'string' || !/^[A-Za-z0-9:_-]{8,128}$/.test(value.runId)) return invalid('这份记录的角色标识已损坏。');
    if (!Array.isArray(value.commands) || value.commands.length > MAX_COMMANDS) return invalid('这份记录的操作顺序已损坏。');
    let canonical = initialState(value.runId);
    for (const command of value.commands) {
      if (!command || typeof command !== 'object') return invalid('这份记录的操作无法读取。');
      const revision = canonical.revision;
      if (command.type === 'focus') canonical = reduceFocus(canonical, command.focusId);
      else if (command.type === 'time') canonical = reduceAdvance(canonical, command.days);
      else if (command.type === 'choice') canonical = reduceChoice(canonical, command.choiceId);
      else return invalid('这份记录包含未知操作。');
      if (canonical.revision !== revision + 1) return invalid('这份记录包含重复或过时操作。');
    }
    if (!Array.isArray(value.events) || value.events.length !== canonical.events.length) return invalid('这份记录的生活日志不一致。');
    for (let index = 0; index < canonical.events.length; index += 1) {
      const old = value.events[index];
      if (!old || !validSnapshot(old) || !LOCATIONS.has(old.location)) return invalid('这份记录的文字已损坏。');
      // Retain already lived prose when a later content edit only changes wording.
      canonical.events[index].text = old.text;
      if (old.title !== undefined) canonical.events[index].title = old.title;
    }
    if (!Array.isArray(value.favorites) || new Set(value.favorites).size !== value.favorites.length || value.favorites.some(id => !canonical.events.some(event => event.id === id))) return invalid('这份记录的精选条目已损坏。');
    canonical.favorites = [...value.favorites];
    if (!equalJson(value, canonical)) return invalid('这份记录的日期、本领、同伴或剧情不一致。');
    return { valid: true, state: canonical, error: null };
  } catch { return invalid('这份秋季记录暂时无法读取，原记录不会被自动覆盖。'); }
}
export function getSummary(candidate) {
  const state = checkedState(candidate);
  return {
    daysElapsed: state.day, focusDays: { ...state.focusDays }, skills: { ...state.skills },
    skillStages: Object.fromEntries(SKILL_IDS.map(id => [id, SKILLS[id].stages[state.skills[id]]])),
    peopleMet: [...state.peopleMet], events: clone(state.events),
    favorites: state.favorites.map(id => clone(state.events.find(event => event.id === id))),
    storiesCompleted: state.resolvedStories.length, phase: state.phase,
  };
}
