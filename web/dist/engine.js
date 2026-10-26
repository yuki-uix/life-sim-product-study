/**
 * Three weekends. All amounts are fictional prototype rules, not real statistics.
 * The reducer has no DOM, timers, network, or random gameplay outcomes.
 */
import { getActionNarrative, getEndingNarrative } from './story.js';

export const RULES = Object.freeze({
  schemaVersion: 1,
  version: '0.1.0',
  maxRounds: 3,
  livingCost: 80,
  workIncome: 200,
  projectCost: 60,
  projectCompletionSteps: 2,
  maxProjectSteps: 3,
  deadlineRound: 2,
});

export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: 'roomy',
    title: '有一点积蓄',
    funds: 480,
    description: '手头还留着 480 元。这三个周末，可以慢一点决定时间花在哪里。',
  }),
  Object.freeze({
    id: 'tight',
    title: '刚付过房租',
    funds: 180,
    description: '房租刚刚付清，手头还剩 180 元。每个周末的必要开销仍要留出来。',
  }),
]);

const ACTIONS = new Set(['work', 'project']);
let fallbackId = 0;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function scenarioById(id) {
  const scenario = SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw fail('unknown_scenario', '没有找到这个开局。');
  return scenario;
}

function newLifeId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `life_${uuid}` : `life_${Date.now().toString(36)}_${++fallbackId}`;
}

function initialState(scenarioId, lifeId) {
  const scenario = scenarioById(scenarioId);
  return {
    schemaVersion: RULES.schemaVersion,
    rulesVersion: RULES.version,
    lifeId,
    scenarioId,
    round: 1,
    funds: scenario.funds,
    projectSteps: 0,
    showcase: 'open',
    status: 'playing',
    events: [],
  };
}

export function createGame(scenarioId = 'roomy') {
  return initialState(scenarioId, newLifeId());
}

function availability(state, action) {
  if (!ACTIONS.has(action)) {
    return { enabled: false, reason: '没有这个时间安排。', netChange: 0 };
  }
  const netChange = action === 'work'
    ? RULES.workIncome - RULES.livingCost
    : -RULES.projectCost - RULES.livingCost;
  if (state.status !== 'playing' || state.round > RULES.maxRounds) {
    return { enabled: false, reason: '这三个周末已经结束了。', netChange };
  }
  if (action === 'project' && state.funds < -netChange) {
    const missing = -netChange - state.funds;
    return {
      enabled: false,
      reason: `还差 ${missing} 元支付本周必要开销与材料。可以先接一份额外工作。`,
      netChange,
    };
  }
  return { enabled: true, reason: '', netChange };
}

export function getActionAvailability(state, action) {
  const checked = validateSave(state);
  if (!checked.valid) {
    return { enabled: false, reason: checked.error, netChange: 0 };
  }
  return availability(checked.state, action);
}

function appendEvent(state, { type, round, action = null, facts = {}, textSnapshot, sourceEventIds = [] }) {
  const sequence = state.events.length + 1;
  const event = {
    id: `${state.lifeId}:event:${sequence}`,
    sequence,
    round,
    type,
    action,
    facts,
    textSnapshot,
    sourceEventIds,
  };
  state.events.push(event);
  return event;
}

/** Internal reducer. Callers supply a state already validated or reconstructed. */
function reduceAction(previous, action) {
  const allowed = availability(previous, action);
  if (!allowed.enabled) {
    throw fail(action === 'project' ? 'insufficient_funds' : 'unavailable_action', allowed.reason);
  }
  const state = JSON.parse(JSON.stringify(previous));
  const round = previous.round;
  const projectSteps = previous.projectSteps + (action === 'project' ? 1 : 0);
  state.funds = previous.funds + allowed.netChange;
  state.projectSteps = projectSteps;

  const projectDescription = [
    '',
    '你把巷口的线条和几行文字收进了小册。第一份素材留下来了。',
    '线条与文字排成了四页小册，《住在这里》有了完整的样子。',
    '你重新整理封面与装订，给《住在这里》留下一版更细致的手工版。',
  ];
  const actionStory = getActionNarrative(previous, action);
  const main = appendEvent(state, {
    type: 'round.resolved',
    round,
    action,
    facts: {
      fundsBefore: previous.funds,
      fundsAfter: state.funds,
      netChange: allowed.netChange,
      income: action === 'work' ? RULES.workIncome : 0,
      livingCost: RULES.livingCost,
      materialsCost: action === 'project' ? RULES.projectCost : 0,
      projectStepsBefore: previous.projectSteps,
      projectStepsAfter: projectSteps,
      spentWeekendOn: action === 'work' ? 'extra_work' : 'personal_project',
    },
    textSnapshot: (action === 'work'
      ? `第 ${round} 个周末，你接下额外工作，收到 200 元。扣除 80 元必要开销，手头多了 120 元。这个周末没有推进小册。`
      : `第 ${round} 个周末，你为小册留出时间，支付 60 元材料和 80 元必要开销。${projectDescription[projectSteps]}`) + ` ${actionStory.log}`,
  });

  if (action === 'project' && projectSteps === RULES.projectCompletionSteps) {
    appendEvent(state, {
      type: 'project.completed',
      round,
      facts: { title: '住在这里', projectSteps, edition: 'assembled' },
      textSnapshot: '《住在这里》完成了：四页线条与短句，记下你熟悉的街巷。',
      sourceEventIds: state.events.filter((item) => item.type === 'round.resolved' && item.action === 'project').map((item) => item.id),
    });
  }
  if (action === 'project' && projectSteps === RULES.maxProjectSteps) {
    appendEvent(state, {
      type: 'project.refined',
      round,
      facts: { title: '住在这里', projectSteps, edition: 'hand_finished' },
      textSnapshot: '你完成了手工精修版：新的封面、装订和一段留给这条街的后记。',
      sourceEventIds: [main.id, ...state.events.filter((item) => item.type === 'project.completed').map((item) => item.id)],
    });
  }
  if (round === RULES.deadlineRound) {
    const submitted = projectSteps >= RULES.projectCompletionSteps;
    state.showcase = submitted ? 'submitted' : 'missed';
    appendEvent(state, {
      type: submitted ? 'showcase.submitted' : 'showcase.missed',
      round,
      facts: {
        deadlineRound: RULES.deadlineRound,
        projectStepsAtDeadline: projectSteps,
        submitted,
      },
      textSnapshot: submitted
        ? '社区小刊征集截止时，你把完成的小册交了出去。它会与其他人的作品一起陈列。'
        : '社区小刊征集截止了。你当时还没有完成小册，这次没有参加；之后仍可以为自己完成它。',
      sourceEventIds: state.events.filter((item) => item.type === 'round.resolved' && item.action === 'project').map((item) => item.id),
    });
  }

  state.round = round + 1;
  if (round === RULES.maxRounds) {
    state.status = 'ended';
    appendEvent(state, {
      type: 'life.completed',
      round,
      facts: { funds: state.funds, projectSteps, showcase: state.showcase },
      textSnapshot: `三个周末走完了。${getEndingNarrative(state).log}`,
      sourceEventIds: state.events.filter((item) => item.type === 'round.resolved').map((item) => item.id),
    });
  }
  return state;
}

export function applyAction(state, action, expectedRound = state?.round) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  if (checked.state.status !== 'playing') {
    throw fail('game_ended', '这三个周末已经结束，不能重复结算。');
  }
  if (!Number.isInteger(expectedRound) || expectedRound !== checked.state.round) {
    throw fail('stale_round', '这一回合已经变化，请使用当前回合的选择。');
  }
  if (!ACTIONS.has(action)) throw fail('unknown_action', '没有这个时间安排。');
  return reduceAction(checked.state, action);
}

function isJsonValue(value, ancestors = new Set(), depth = 0) {
  if (depth > 20) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return false;
  ancestors.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}

function equalJson(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left).sort();
  const otherKeys = Object.keys(right).sort();
  if (keys.length !== otherKeys.length || keys.some((key, index) => key !== otherKeys[index])) return false;
  return keys.every((key) => equalJson(left[key], right[key]));
}

/**
 * Checks internal consistency, not identity or anti-cheat authenticity.
 * Derived values and event facts must match a replay of the recorded actions.
 * Valid text snapshots are retained, so wording edits do not rewrite past lives.
 */
export function validateSave(candidate) {
  const invalid = (error) => ({ valid: false, state: null, error });
  try {
    const value = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isJsonValue(value)) {
      return invalid('这份记录无法读取，可以重新开始一个周末片段。');
    }
    if (value.schemaVersion !== RULES.schemaVersion || value.rulesVersion !== RULES.version) {
      return invalid('这份记录属于不同的试玩版本，请重新开始。');
    }
    if (typeof value.lifeId !== 'string' || !/^[A-Za-z0-9:_-]{5,128}$/.test(value.lifeId)) {
      return invalid('这份记录的人生标识已损坏。');
    }
    if (!Array.isArray(value.events) || value.events.length > 16) {
      return invalid('这份记录的事件清单已损坏。');
    }
    let canonical = initialState(value.scenarioId, value.lifeId);
    const choices = value.events.filter((item) => item && item.type === 'round.resolved');
    if (choices.length > RULES.maxRounds) return invalid('这份记录包含重复的回合。');
    for (const event of choices) {
      if (event.round !== canonical.round || !ACTIONS.has(event.action)) {
        return invalid('这份记录的选择顺序已损坏。');
      }
      canonical = reduceAction(canonical, event.action);
    }
    if (value.events.length !== canonical.events.length) {
      return invalid('这份记录的事件清单不完整或存在重复。');
    }
    for (let index = 0; index < canonical.events.length; index += 1) {
      const snapshot = value.events[index]?.textSnapshot;
      if (typeof snapshot !== 'string' || !snapshot.trim() || snapshot.length > 2000) {
        return invalid('这份记录的事件文字已损坏。');
      }
      canonical.events[index].textSnapshot = snapshot;
    }
    if (!equalJson(value, canonical)) {
      return invalid('这份记录的资金、作品或事件不一致，请重新开始。');
    }
    return { valid: true, state: canonical, error: null };
  } catch {
    return invalid('这份记录无法读取，可以重新开始一个周末片段。');
  }
}

export function getSummary(state) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  const current = checked.state;
  const scenario = scenarioById(current.scenarioId);
  const actions = current.events.filter((item) => item.type === 'round.resolved').map((item) => ({
    id: item.id,
    round: item.round,
    action: item.action,
    ...item.facts,
    text: item.textSnapshot,
  }));
  const workRounds = actions.filter((item) => item.action === 'work').length;
  const projectRounds = actions.length - workRounds;
  const projectStatus = ['untouched', 'started', 'completed', 'refined'][current.projectSteps];
  const projectLabels = ['还没有动笔', '留下了第一份素材', '完成了自己的小册', '完成了手工精修版'];
  const showcaseLabels = {
    open: '社区小刊征集仍在开放',
    submitted: '赶上了社区小刊展示',
    missed: '没有参加这次社区展示',
  };
  const tradeoffs = [];
  if (workRounds > 0) tradeoffs.push(`${workRounds} 个周末用于额外工作，没有同时推进小册。`);
  if (projectRounds > 0) tradeoffs.push(`${projectRounds} 个周末留给小册，放弃了同期 ${projectRounds * RULES.workIncome} 元额外收入。`);
  if (current.showcase === 'missed') tradeoffs.push('征集截止时作品还没有完成；后来的完成不会改写那次截止。');
  return {
    funds: current.funds,
    initialFunds: scenario.funds,
    fundsChange: current.funds - scenario.funds,
    totalEarned: workRounds * RULES.workIncome,
    totalLivingCosts: actions.length * RULES.livingCost,
    totalProjectCosts: projectRounds * RULES.projectCost,
    workRounds,
    projectRounds,
    projectSteps: current.projectSteps,
    projectStatus,
    projectLabel: projectLabels[current.projectSteps],
    projectTitle: '住在这里',
    completed: current.projectSteps >= RULES.projectCompletionSteps,
    refined: current.projectSteps === RULES.maxProjectSteps,
    showcase: current.showcase,
    showcaseLabel: showcaseLabels[current.showcase],
    status: current.status,
    actions,
    tradeoffs,
    events: current.events,
  };
}
