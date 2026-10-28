/** Deterministic calendar and recorded consequences; presentation owns the clock. */
import { INITIAL_FACTS, TIMELINE } from './content.js';

export const SAVE_VERSION = 1;
export const END_AGE = 85;
const clone = value => JSON.parse(JSON.stringify(value));
const events = [...TIMELINE].sort((left, right) => left.age - right.age);
const byId = new Map(events.map(event => [event.id, event]));

if (byId.size !== events.length || events.some(event => typeof event.id !== 'string' || !event.id || !Number.isInteger(event.age) || event.age < 0 || event.age > END_AGE || !['life', 'decision', 'end'].includes(event.kind))) {
  throw new Error('The life timeline contains an invalid or repeated event.');
}

export function createGame() {
  return {
    version: SAVE_VERSION,
    status: 'unborn',
    age: 0,
    facts: clone(INITIAL_FACTS),
    processed: [],
    pending: null,
    log: [],
    choices: [],
    commands: [],
  };
}

function snapshot(id, age, kind, value) {
  if (!value || typeof value.title !== 'string' || typeof value.text !== 'string') {
    throw new Error(`Missing authored scene: ${id}`);
  }
  const entry = { id, age, kind, title: value.title, text: value.text };
  for (const key of ['person', 'quote', 'memory']) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== 'string') throw new Error(`Invalid ${key} in scene: ${id}`);
      entry[key] = value[key];
    }
  }
  return entry;
}

/** Process every due event in order, stopping at an actual unanswered decision. */
function processUntil(next, targetAge) {
  const processed = new Set(next.processed);
  for (const event of events) {
    if (processed.has(event.id)) continue;
    if (event.age > targetAge) break;
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
  next.age = targetAge;
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

export function getChoices(state) {
  if (state?.status !== 'living' || !state.pending) return [];
  const event = byId.get(state.pending);
  if (!event || event.kind !== 'decision') return [];
  return event.choices(state.facts).map(({ id, label, detail }) => ({ id, label, detail }));
}

export function choose(state, choiceId) {
  const event = byId.get(state?.pending);
  if (state?.status !== 'living' || !event || event.kind !== 'decision') throw new Error('There is no decision to answer.');
  const selection = event.choices(state.facts).find(choice => choice.id === choiceId);
  if (!selection) throw new Error(`Unavailable choice: ${String(choiceId)}`);
  const next = clone(state);
  if (selection.effect) selection.effect(next.facts);
  next.log.push(snapshot(`${event.id}:choice`, event.age, 'choice', selection.result(next.facts)));
  next.choices.push({ eventId: event.id, choiceId, age: event.age });
  next.commands.push({ type: 'choose', choiceId });
  next.pending = null;
  return next;
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

/** Replaying bounded commands validates every saved fact, snapshot and pending choice. */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== SAVE_VERSION || !Array.isArray(raw.commands) || raw.commands.length > 250) return null;
  if (!Array.isArray(raw.log) || raw.log.length > events.length * 2 || !Array.isArray(raw.processed) || raw.processed.length > events.length || !Array.isArray(raw.choices) || raw.choices.length > events.filter(event => event.kind === 'decision').length) return null;
  let replay = createGame();
  try {
    for (const command of raw.commands) {
      if (!command || typeof command !== 'object' || Array.isArray(command)) return null;
      if (command.type === 'begin' && Object.keys(command).length === 1) replay = begin(replay);
      else if (command.type === 'advance' && Object.keys(command).length === 2 && Object.hasOwn(command, 'years')) replay = advance(replay, command.years);
      else if (command.type === 'choose' && Object.keys(command).length === 2 && typeof command.choiceId === 'string') replay = choose(replay, command.choiceId);
      else return null;
    }
    return same(raw, replay) ? replay : null;
  } catch {
    return null;
  }
}
