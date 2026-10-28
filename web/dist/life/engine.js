/** Recorded years and consequences; presentation owns the visible clock. */
import { INITIAL_FACTS, TIMELINE } from './content.js';
import { settleYoungYear, getYoungView, setYoungFocus, planYoungArrangement } from './living.js';

export const SAVE_VERSION = 2;
export const END_AGE = 85;
const clone = value => JSON.parse(JSON.stringify(value));
const events = [...TIMELINE].sort((left, right) => left.age - right.age);
const byId = new Map(events.map(event => [event.id, event]));

if (byId.size !== events.length || events.some(event => typeof event.id !== 'string' || !event.id || !Number.isInteger(event.age) || event.age < 0 || event.age > END_AGE || !['life', 'decision', 'end'].includes(event.kind))) {
  throw new Error('The life timeline contains an invalid or repeated event.');
}

export function createGame() {
  return {
    version: SAVE_VERSION, status: 'unborn', age: 0, facts: clone(INITIAL_FACTS),
    processed: [], pending: null, log: [], choices: [], commands: [],
  };
}

function snapshot(id, age, kind, value) {
  if (!value || typeof value.title !== 'string' || typeof value.text !== 'string') throw new Error('Missing authored scene: ' + id);
  const entry = { id, age, kind, title: value.title, text: value.text };
  for (const key of ['person', 'quote', 'memory']) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== 'string') throw new Error('Invalid ' + key + ' in scene: ' + id);
      entry[key] = value[key];
    }
  }
  return entry;
}

function processAtAge(next, age, processed) {
  for (const event of events) {
    if (processed.has(event.id)) continue;
    if (event.age > age) break;
    next.processed.push(event.id);
    processed.add(event.id);
    if (event.when && !event.when(next.facts)) continue;
    next.age = event.age;
    if (event.effect) event.effect(next.facts);
    next.log.push(snapshot(event.id, event.age, event.kind, event.present(next.facts)));
    if (event.kind === 'decision') {
      next.pending = event.id;
      return next;
    }
    if (event.kind === 'end') {
      next.status = 'ended';
      next.pending = null;
      return next;
    }
  }
  return next;
}

/** Every intervening year settles once, even when callers request a long jump. */
function processUntil(next, targetAge) {
  const processed = new Set(next.processed);
  processAtAge(next, next.age, processed);
  while (next.age < targetAge && next.status === 'living' && !next.pending) {
    const spentAge = next.age;
    const ordinary = settleYoungYear(next.facts, spentAge);
    next.age = spentAge + 1;
    if (ordinary) next.log.push(snapshot('young_year_' + spentAge, next.age, 'life', ordinary));
    processAtAge(next, next.age, processed);
  }
  return next;
}

export function begin(state) {
  if (state?.status !== 'unborn') throw new Error('This life has already begun.');
  const next = clone(state);
  next.status = 'living';
  next.commands.push({ type: 'begin' });
  return processUntil(next, 0);
}

export function advance(state, years = 1) {
  if (!Number.isInteger(years) || years < 1 || years > END_AGE) throw new RangeError('Advance by an integer from 1 to 85 years.');
  if (state?.status === 'unborn') throw new Error('Begin this life before advancing.');
  if (state?.status !== 'living' || state.pending) return clone(state);
  const next = clone(state);
  next.commands.push({ type: 'advance', years });
  return processUntil(next, Math.min(END_AGE, next.age + years));
}

function optionStatus(option, facts) {
  const available = typeof option.available === 'function' ? option.available(facts) : option.available !== false;
  const reason = typeof option.unavailableReason === 'function' ? option.unavailableReason(facts) : option.unavailableReason || '';
  return { available: Boolean(available), reason: available ? '' : reason };
}

export function getDecisionOptions(state) {
  if (state?.status !== 'living' || !state.pending) return [];
  const event = byId.get(state.pending);
  if (!event || event.kind !== 'decision') return [];
  return event.choices(state.facts).map(option => ({
    id: option.id, label: option.label, detail: option.detail, ...optionStatus(option, state.facts),
  }));
}

export function getChoices(state) {
  return getDecisionOptions(state).filter(option => option.available).map(({ id, label, detail }) => ({ id, label, detail }));
}

export function choose(state, choiceId) {
  const event = byId.get(state?.pending);
  if (state?.status !== 'living' || !event || event.kind !== 'decision') throw new Error('There is no decision to answer.');
  const selection = event.choices(state.facts).find(choice => choice.id === choiceId);
  if (!selection || !optionStatus(selection, state.facts).available) throw new Error('Unavailable choice: ' + String(choiceId));
  const next = clone(state);
  if (selection.effect) selection.effect(next.facts);
  next.log.push(snapshot(event.id + ':choice', event.age, 'choice', selection.result(next.facts)));
  next.choices.push({ eventId: event.id, choiceId, age: event.age });
  next.commands.push({ type: 'choose', choiceId });
  next.pending = null;
  return next;
}

function requireYoungLife(state) {
  if (!getYoungView(state).active || state.pending) throw new Error('There is no free young-life year to arrange.');
}

export function getLifeView(state) {
  return clone(getYoungView(state));
}

export function setFocus(state, id) {
  requireYoungLife(state);
  const next = clone(state);
  setYoungFocus(next.facts, id);
  if (state.facts.young.focus === id) return next;
  next.commands.push({ type: 'focus', id });
  return next;
}

export function arrange(state, id) {
  requireYoungLife(state);
  const next = clone(state);
  planYoungArrangement(next, id);
  next.commands.push({ type: 'arrange', id });
  return next;
}

export function startYoungSample() {
  let state = advance(begin(createGame()), 18);
  state = choose(state, 'away');
  return advance(state, 5);
}

export function getCurrentScene(state) {
  if (!state?.log?.length) return null;
  const entry = state.pending
    ? state.log.findLast(item => item.id === state.pending)
    : state.log.findLast(item => item.kind !== 'decision');
  return entry ? clone(entry) : null;
}

export function getMemories(state) {
  return (state?.log || []).filter(entry => entry.kind !== 'decision' && typeof entry.memory === 'string' && entry.memory.trim())
    .map(entry => ({ id: entry.id, age: entry.age, text: entry.memory, title: entry.title, sourceId: entry.id }));
}

export function getNextAge(state) {
  if (state?.status !== 'living' || state.pending) return null;
  if (getYoungView(state).active) return state.age + 1;
  const processed = new Set(state.processed);
  const event = events.find(item => !processed.has(item.id) && item.age >= state.age && (!item.when || item.when(state.facts)));
  return event ? event.age : null;
}

function same(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && same(left[key], right[key]));
}

/** Replay checks the exact years, arrangements, costs and text that were recorded. */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== SAVE_VERSION || !Array.isArray(raw.commands) || raw.commands.length > 1000) return null;
  if (!Array.isArray(raw.log) || raw.log.length > events.length * 2 + 16 || !Array.isArray(raw.processed) || raw.processed.length > events.length || !Array.isArray(raw.choices) || raw.choices.length > events.filter(event => event.kind === 'decision').length) return null;
  let replay = createGame();
  try {
    for (const command of raw.commands) {
      if (!command || typeof command !== 'object' || Array.isArray(command)) return null;
      if (command.type === 'begin' && Object.keys(command).length === 1) replay = begin(replay);
      else if (command.type === 'advance' && Object.keys(command).length === 2 && Number.isInteger(command.years)) replay = advance(replay, command.years);
      else if (command.type === 'choose' && Object.keys(command).length === 2 && typeof command.choiceId === 'string') replay = choose(replay, command.choiceId);
      else if (command.type === 'focus' && Object.keys(command).length === 2 && typeof command.id === 'string') replay = setFocus(replay, command.id);
      else if (command.type === 'arrange' && Object.keys(command).length === 2 && typeof command.id === 'string') replay = arrange(replay, command.id);
      else return null;
    }
    return same(raw, replay) ? replay : null;
  } catch {
    return null;
  }
}
