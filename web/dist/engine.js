/** Campus prototype rules. No DOM, timers, network or random gameplay outcomes. */
import { CONFIG, CHOICES, PEOPLE, SKILLS, MEMORIES, getNarrative, getChoicePresentation } from './content.js';

export { CONFIG };
const CHOICE_BY_ID = new Map(CHOICES.map(choice => [choice.id, choice]));
const SKILL_IDS = Object.keys(SKILLS);
const MAX_CHOICES = CONFIG.playableSemesters * (CONFIG.activitySlots + 1);
const LOCATIONS = new Set(['gate', 'dorm', 'lake', 'club', 'hall']);
let fallbackId = 0;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function initialState(runId) {
  return {
    schemaVersion: CONFIG.schemaVersion,
    rulesVersion: CONFIG.version,
    runId,
    programYears: CONFIG.programYears,
    semester: 1,
    phase: 'activity',
    slot: 1,
    turn: 1,
    skills: Object.fromEntries(SKILL_IDS.map(id => [id, 0])),
    peopleMet: ['ahe'],
    memories: [],
    flags: {},
    events: [],
  };
}

export function createGame() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++fallbackId}`;
  return initialState(`campus_${uuid}`);
}

function availability(state, choiceId) {
  const choice = CHOICE_BY_ID.get(choiceId);
  const result = { enabled: true, reason: '', code: '', choiceId };
  const blocked = (reason, code = 'unavailable_choice') => ({ ...result, enabled: false, reason, code });
  if (!choice) return blocked('没有这件事。', 'unknown_choice');
  if (state.phase === 'ended') return blocked('大一的这段体验已经结束，可以翻翻回忆或重新开始。', 'game_ended');
  if (choice.semester !== state.semester) return blocked('这件事属于另一个学期。', 'wrong_semester');
  if (choice.kind !== state.phase) return blocked(state.phase === 'campus' ? '眼前的校园活动开始了，先决定怎样参与。' : '先安排这学期的日常，校园活动还没有开始。', 'wrong_phase');
  if (choice.kind === 'activity' && state.events.some(event => event.type === 'choice.resolved' && event.facts.choiceId === choiceId && event.facts.semester === state.semester)) {
    return blocked('这学期已经做过这件事，留一段时间试试别的。', 'already_chosen');
  }
  const requirement = choice.requiresSkill;
  if (requirement && state.skills[requirement.id] < requirement.min) {
    return blocked(`还需要${SKILLS[requirement.id].name}达到“${SKILLS[requirement.id].stages[requirement.min]}”。可以选别的方式参与。`, 'missing_skill');
  }
  if (choice.requiresMemory && !state.memories.some(memory => memory.id === choice.requiresMemory)) {
    return blocked(`这次邀请来自“${MEMORIES[choice.requiresMemory].title}”那段经历；这一年你走了另一条路。`, 'missing_memory');
  }
  if (choice.requiresPerson && !state.peopleMet.includes(choice.requiresPerson)) {
    return blocked(`先认识${PEOPLE[choice.requiresPerson].name}，才会有这次一起去的约定。`, 'missing_person');
  }
  const newPeople = choice.meet || [];
  const withPeople = choice.with || [];
  if ([...newPeople, ...withPeople].some(id => !PEOPLE[id])) return blocked('这段共同经历的人物资料暂时不完整。', 'content_error');
  const unknownCompanion = withPeople.find(id => !state.peopleMet.includes(id) && !newPeople.includes(id));
  if (unknownCompanion) return blocked(`你还没有认识${PEOPLE[unknownCompanion].name}，暂时没有这次一起去的安排。`, 'missing_person');
  return result;
}

export function getChoiceAvailability(state, choiceId) {
  const checked = validateSave(state);
  return checked.valid ? availability(checked.state, choiceId) : { enabled: false, reason: checked.error, code: 'invalid_save', choiceId };
}

export function getChoices(state) {
  const checked = validateSave(state);
  if (!checked.valid || checked.state.phase === 'ended') return [];
  const current = checked.state;
  return CHOICES.filter(choice => choice.semester === current.semester && choice.kind === current.phase)
    .map(choice => ({ ...choice, ...getChoicePresentation(current, choice.id), ...availability(current, choice.id) }));
}

function validNarrative(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set(['title', 'paragraphs', 'location', 'speaker', 'dialogue', 'memoryCaption']);
  if (Object.keys(value).some(key => !allowed.has(key))) return false;
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 160) return false;
  if (!Array.isArray(value.paragraphs) || !value.paragraphs.length || value.paragraphs.length > 5) return false;
  if (value.paragraphs.some(text => typeof text !== 'string' || !text.trim() || text.length > 700)) return false;
  if (!LOCATIONS.has(value.location)) return false;
  if (value.speaker !== undefined && (typeof value.speaker !== 'string' || value.speaker.length > 80)) return false;
  if (value.dialogue !== undefined && (typeof value.dialogue !== 'string' || value.dialogue.length > 700)) return false;
  if (value.memoryCaption !== undefined && (typeof value.memoryCaption !== 'string' || value.memoryCaption.length > 700)) return false;
  return true;
}

function choiceSources(previous, choice) {
  const ids = new Set();
  for (const event of previous.events) {
    if (choice.requiresSkill && event.facts.skillGains[choice.requiresSkill.id] > 0) ids.add(event.id);
    if (choice.requiresPerson && event.facts.peopleMetAdded.includes(choice.requiresPerson)) ids.add(event.id);
    if ((choice.with || []).some(personId => event.facts.with.includes(personId))) ids.add(event.id);
  }
  if (choice.requiresMemory) ids.add(previous.memories.find(memory => memory.id === choice.requiresMemory).sourceEventId);
  return [...ids];
}

/** Internal reducer receives a canonical state, including retained prose snapshots. */
function reduceChoice(previous, choiceId) {
  const allowed = availability(previous, choiceId);
  if (!allowed.enabled) throw fail(allowed.code, allowed.reason);
  const choice = CHOICE_BY_ID.get(choiceId);
  const narrative = clone(getNarrative(clone(previous), choiceId));
  if (!validNarrative(narrative)) throw fail('content_error', '这段校园故事暂时无法读取。');
  if (!MEMORIES[choice.memoryId]) throw fail('content_error', '这段回忆的资料暂时不完整。');
  const state = clone(previous);
  const skillsBefore = { ...state.skills };
  const skillGains = {};
  for (const skillId of SKILL_IDS) {
    const gain = choice.skillGains?.[skillId] || 0;
    if (!Number.isInteger(gain) || gain < 0) throw fail('content_error', '这件事的成长资料暂时无法读取。');
    state.skills[skillId] = Math.min(CONFIG.maxSkill, state.skills[skillId] + gain);
    skillGains[skillId] = state.skills[skillId] - skillsBefore[skillId];
  }
  const peopleMetAdded = [...new Set(choice.meet || [])].filter(id => !state.peopleMet.includes(id));
  state.peopleMet.push(...peopleMetAdded);
  const flagsAdded = {};
  for (const [key, value] of Object.entries(choice.flags || {})) {
    if (typeof value !== 'boolean' && typeof value !== 'string') throw fail('content_error', '这件事的后续资料暂时无法读取。');
    if (state.flags[key] !== value) flagsAdded[key] = value;
    state.flags[key] = value;
  }
  const eventId = `${state.runId}:event:${state.events.length + 1}`;
  const event = {
    id: eventId,
    sequence: state.events.length + 1,
    type: 'choice.resolved',
    turn: previous.turn,
    semester: previous.semester,
    facts: {
      choiceId,
      kind: choice.kind,
      semester: previous.semester,
      slot: previous.slot,
      skillsBefore,
      skillsAfter: { ...state.skills },
      skillGains,
      peopleMetAdded,
      with: [...new Set(choice.with || [])],
      memoryId: choice.memoryId,
      flagsAdded,
    },
    narrative,
    textSnapshot: `${narrative.title}\n${narrative.paragraphs.join('\n')}${narrative.dialogue ? `\n${narrative.speaker || ''}：${narrative.dialogue}` : ''}`,
    sourceEventIds: choiceSources(previous, choice),
  };
  state.events.push(event);
  state.memories.push({ id: choice.memoryId, semester: previous.semester, sourceEventId: eventId });
  state.turn += 1;
  if (choice.kind === 'activity') {
    if (state.slot < CONFIG.activitySlots) state.slot += 1;
    else state.phase = 'campus';
  } else if (state.semester < CONFIG.playableSemesters) {
    state.semester += 1;
    state.slot = 1;
    state.phase = 'activity';
  } else {
    state.phase = 'ended';
  }
  return state;
}

export function applyChoice(state, choiceId, expectedTurn = state?.turn) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  if (checked.state.phase === 'ended') throw fail('game_ended', '大一的这段体验已经结束，可以翻翻回忆或重新开始。');
  if (!Number.isInteger(expectedTurn) || expectedTurn !== checked.state.turn) throw fail('stale_turn', '这段日常已经变化，请使用眼前的选择。');
  return reduceChoice(checked.state, choiceId);
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
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left).sort();
  const otherKeys = Object.keys(right).sort();
  return keys.length === otherKeys.length && keys.every((key, index) => key === otherKeys[index] && equalJson(left[key], right[key]));
}

/** Verifies recorded facts by replay. It is not identity or anti-cheat authentication. */
export function validateSave(candidate) {
  const invalid = error => ({ valid: false, state: null, error });
  try {
    const value = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isJsonValue(value)) return invalid('这份校园记录暂时无法读取。');
    if (value.schemaVersion !== CONFIG.schemaVersion || value.rulesVersion !== CONFIG.version) return invalid('这份记录属于另一个试玩版本，原记录不会被改写。');
    if (typeof value.runId !== 'string' || !/^[A-Za-z0-9:_-]{8,128}$/.test(value.runId)) return invalid('这份记录的角色标识已损坏。');
    if (!Array.isArray(value.events) || value.events.length > MAX_CHOICES) return invalid('这份记录包含重复或损坏的日常。');
    let canonical = initialState(value.runId);
    for (const event of value.events) {
      if (!event || event.type !== 'choice.resolved' || event.turn !== canonical.turn || !CHOICE_BY_ID.has(event.facts?.choiceId)) return invalid('这份记录的选择顺序已损坏。');
      canonical = reduceChoice(canonical, event.facts.choiceId);
    }
    for (let index = 0; index < canonical.events.length; index += 1) {
      const old = value.events[index];
      if (!validNarrative(old.narrative) || typeof old.textSnapshot !== 'string' || !old.textSnapshot.trim() || old.textSnapshot.length > 5000) return invalid('这份记录的回忆文字已损坏。');
      // A content wording edit must not rewrite a player's already lived moments.
      canonical.events[index].narrative = clone(old.narrative);
      canonical.events[index].textSnapshot = old.textSnapshot;
    }
    if (!equalJson(value, canonical)) return invalid('这份记录的本领、同伴或回忆不一致，请开始新的大一。');
    return { valid: true, state: canonical, error: null };
  } catch { return invalid('这份校园记录暂时无法读取，可以开始新的一年。'); }
}

export function getSummary(state) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  const current = checked.state;
  return {
    programYears: current.programYears,
    playableSemesters: CONFIG.playableSemesters,
    semestersCompleted: current.phase === 'ended' ? CONFIG.playableSemesters : current.semester - 1,
    choicesMade: current.events.length,
    skills: { ...current.skills },
    skillStages: Object.fromEntries(SKILL_IDS.map(id => [id, SKILLS[id].stages[current.skills[id]]])),
    peopleMet: [...current.peopleMet],
    memories: current.memories.map(memory => {
      const event = current.events.find(item => item.id === memory.sourceEventId);
      return { ...clone(MEMORIES[memory.id]), ...memory, caption: event.narrative.memoryCaption || MEMORIES[memory.id].caption, narrative: clone(event.narrative) };
    }),
    events: clone(current.events),
    phase: current.phase,
  };
}
