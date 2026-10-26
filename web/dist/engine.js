/** Fictional prototype rules. No DOM, network, timers or random gameplay outcomes. */
export const RULES = Object.freeze({
  schemaVersion: 2,
  version: '0.2.0',
  maxRounds: 8,
  livingCost: 80,
  maxSkill: 4,
  taskSkill: 2,
  milestoneSkill: 4,
});

export const SCENARIOS = Object.freeze([
  Object.freeze({ id: 'roomy', title: '有一点积蓄', funds: 480, description: '手头还留着 480 元，可以试着把一件事做熟。' }),
  Object.freeze({ id: 'tight', title: '刚付过房租', funds: 180, description: '房租付清了，手头还剩 180 元。安排练习时，也要留意日常开销。' }),
]);

export const ACTIONS = Object.freeze([
  { id: 'shop_practice', skill: 'shop', kind: 'practice', title: '跟陈姐整理书架', description: '从认书架、找书到安排陈列，把书店里的事慢慢做熟。', income: 200, materialsCost: 0, skillGain: 1, requiredSkill: 0 },
  { id: 'art_practice', skill: 'art', kind: 'practice', title: '练习街巷速写', description: '带上纸笔出门，练习把看到的街景画清楚。', income: 0, materialsCost: 40, skillGain: 1, requiredSkill: 0 },
  { id: 'shop_shift', skill: 'shop', kind: 'task', title: '独立看店', description: '用已经学会的本领，独立接待来书店的人。', income: 320, materialsCost: 0, skillGain: 0, requiredSkill: 2 },
  { id: 'art_commission', skill: 'art', kind: 'task', title: '画街角招牌', description: '把速写本上的练习用到一块真正的店铺招牌上。', income: 260, materialsCost: 60, skillGain: 0, requiredSkill: 2 },
  { id: 'shop_table', skill: 'shop', kind: 'milestone', title: '策划周末书桌', description: '选书、布置、接待，由你负责一张自己的主题书桌。', income: 0, materialsCost: 0, skillGain: 0, requiredSkill: 4, requiredTask: 'shop_shift', identity: 'shop' },
  { id: 'art_book', skill: 'art', kind: 'milestone', title: '制作街巷小册', description: '把练习和招牌中的经验整理成一册自己的街巷作品。', income: 0, materialsCost: 0, skillGain: 0, requiredSkill: 4, requiredTask: 'art_commission', identity: 'art' },
].map(Object.freeze));

const ACTION_BY_ID = new Map(ACTIONS.map(action => [action.id, action]));
const SKILL_NAMES = Object.freeze({ shop: '书店事务', art: '街巷创作' });
const IDENTITY_NAMES = Object.freeze({ shop: '书店搭档', art: '街巷画手' });
let fallbackId = 0;

export function getSkillStage(value) {
  return ['生疏', '试着做', '上手', '渐熟', '熟练'][value] ?? '生疏';
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function scenarioById(id) {
  const scenario = SCENARIOS.find(item => item.id === id);
  if (!scenario) throw fail('unknown_scenario', '没有找到这个开局。');
  return scenario;
}

function initialState(scenarioId, lifeId) {
  return {
    schemaVersion: RULES.schemaVersion,
    rulesVersion: RULES.version,
    lifeId,
    scenarioId,
    round: 1,
    funds: scenarioById(scenarioId).funds,
    skills: { shop: 0, art: 0 },
    completedTasks: [],
    identities: [],
    opportunities: [],
    status: 'playing',
    events: [],
  };
}

export function createGame(scenarioId = 'roomy') {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++fallbackId}`;
  return initialState(scenarioId, `life_${uuid}`);
}

function availability(state, actionId) {
  const action = ACTION_BY_ID.get(actionId);
  if (!action) return { enabled: false, reason: '没有这个行动。', code: 'unknown_action', netChange: 0, skillGain: 0 };
  const hasIdentity = state.identities.includes(action.skill);
  const income = action.income + (hasIdentity && actionId === 'shop_shift' ? 40 : hasIdentity && actionId === 'art_commission' ? 60 : 0);
  const netChange = income - action.materialsCost - RULES.livingCost;
  const result = {
    enabled: true,
    reason: '',
    code: '',
    skill: action.skill,
    skillGain: Math.min(action.skillGain, RULES.maxSkill - state.skills[action.skill]),
    income,
    livingCost: RULES.livingCost,
    materialsCost: action.materialsCost,
    netChange,
    title: hasIdentity && actionId === 'shop_shift' ? '负责周末书桌' : hasIdentity && actionId === 'art_commission' ? '接一份插画约稿' : action.title,
  };
  const blocked = (reason, code = 'unavailable_action') => ({ ...result, enabled: false, reason, code });
  if (state.status !== 'playing' || state.round > RULES.maxRounds) return blocked('这八周已经结束了。', 'game_ended');
  if (action.kind === 'milestone' && state.identities.includes(action.identity)) return blocked('这件事已经完成，身份和成果都已留在记录里。');
  if (state.skills[action.skill] < action.requiredSkill) return blocked(`${SKILL_NAMES[action.skill]}达到${getSkillStage(action.requiredSkill)}（${action.requiredSkill}/4）后，会出现这件事。`);
  if (action.requiredTask && !state.completedTasks.includes(action.requiredTask)) return blocked(`还需要实际完成一次“${ACTION_BY_ID.get(action.requiredTask).title}”。`);
  if (action.kind !== 'practice') {
    const opportunity = state.opportunities.find(item => item.id === actionId);
    if (!opportunity || opportunity.unlockedRound > state.round) return blocked('这次邀请尚未到来。');
  }
  if (state.funds + netChange < 0) return blocked(`还差 ${-(state.funds + netChange)} 元支付本周开销，可以先去书店帮忙。`, 'insufficient_funds');
  return result;
}

export function getActionAvailability(state, actionId) {
  const checked = validateSave(state);
  if (!checked.valid) return { enabled: false, reason: checked.error, code: 'invalid_save', netChange: 0, skillGain: 0 };
  return availability(checked.state, actionId);
}

export function getAvailableActions(state) {
  return ACTIONS.map(action => ({ ...action, ...getActionAvailability(state, action.id) }));
}

function appendEvent(state, { type, round, action = null, facts = {}, textSnapshot, sourceEventIds = [] }) {
  const sequence = state.events.length + 1;
  const event = { id: `${state.lifeId}:event:${sequence}`, sequence, round, type, action, facts, textSnapshot, sourceEventIds };
  state.events.push(event);
  return event;
}

function unlockOpportunities(state, round) {
  for (const action of ACTIONS.filter(item => item.kind !== 'practice')) {
    if (state.opportunities.some(item => item.id === action.id)) continue;
    if (state.skills[action.skill] < action.requiredSkill) continue;
    if (action.requiredTask && !state.completedTasks.includes(action.requiredTask)) continue;
    const sourceEventIds = state.events.filter(item =>
      (item.type === 'skill.gained' && item.facts.skill === action.skill)
      || (item.type === 'task.completed' && item.action === action.requiredTask)
    ).map(item => item.id);
    const opportunity = { id: action.id, unlockedRound: round + 1, sourceEventIds };
    state.opportunities.push(opportunity);
    appendEvent(state, {
      type: 'opportunity.unlocked', round, action: action.id,
      facts: { opportunityId: action.id, skill: action.skill, requiredSkill: action.requiredSkill, requiredTask: action.requiredTask ?? null, unlockedRound: round + 1 },
      textSnapshot: `${SKILL_NAMES[action.skill]}已${getSkillStage(action.requiredSkill)}${action.requiredTask ? '，也实际做过一次任务' : ''}。“${action.title}”的机会将在下一周到来。`,
      sourceEventIds,
    });
  }
}

/** Call only with a canonical or validated state. */
function reduceAction(previous, actionId) {
  const allowed = availability(previous, actionId);
  if (!allowed.enabled) throw fail(allowed.code, allowed.reason);
  const action = ACTION_BY_ID.get(actionId);
  const state = JSON.parse(JSON.stringify(previous));
  const round = state.round;
  const beforeSkill = previous.skills[action.skill];
  state.funds += allowed.netChange;
  state.skills[action.skill] += allowed.skillGain;
  const main = appendEvent(state, {
    type: 'round.resolved', round, action: actionId,
    facts: {
      title: allowed.title, skill: action.skill, kind: action.kind,
      fundsBefore: previous.funds, fundsAfter: state.funds,
      income: allowed.income, livingCost: allowed.livingCost, materialsCost: allowed.materialsCost, netChange: allowed.netChange,
      skillBefore: beforeSkill, skillAfter: state.skills[action.skill], skillGain: allowed.skillGain,
    },
    textSnapshot: `第 ${round} 周，你${allowed.title}。收入 ${allowed.income} 元，材料 ${allowed.materialsCost} 元，日常开销 ${allowed.livingCost} 元，余量 ${state.funds} 元。${allowed.skillGain ? `${SKILL_NAMES[action.skill]}从 ${beforeSkill}/4 练到 ${state.skills[action.skill]}/4。` : ''}`,
  });
  if (allowed.skillGain) {
    appendEvent(state, {
      type: 'skill.gained', round, action: actionId,
      facts: { skill: action.skill, before: beforeSkill, after: state.skills[action.skill], gain: allowed.skillGain },
      textSnapshot: `${SKILL_NAMES[action.skill]}：${getSkillStage(beforeSkill)} → ${getSkillStage(state.skills[action.skill])}（${state.skills[action.skill]}/4）。`,
      sourceEventIds: [main.id],
    });
  }
  if (action.kind === 'task' && !state.completedTasks.includes(actionId)) {
    state.completedTasks.push(actionId);
    appendEvent(state, {
      type: 'task.completed', round, action: actionId,
      facts: { taskId: actionId, skill: action.skill },
      textSnapshot: actionId === 'shop_shift' ? '第一次独立值班完成了：你自己接待读者、找书，收好一天的账。' : '你完成了第一块街角招牌。它挂在早餐摊前，成了有人每天会看到的画。',
      sourceEventIds: [main.id, state.events.find(item => item.type === 'opportunity.unlocked' && item.action === actionId).id],
    });
  }
  if (action.kind === 'milestone') {
    state.identities.push(action.identity);
    state.completedTasks.push(actionId);
    appendEvent(state, {
      type: 'identity.earned', round, action: actionId,
      facts: { identity: action.identity, title: IDENTITY_NAMES[action.identity], artifact: actionId === 'shop_table' ? '周末主题书桌' : '住在这里：街巷小册' },
      textSnapshot: actionId === 'shop_table' ? '你独立策划的周末书桌开放了。陈姐把你介绍为“书店搭档”；以后你可以自己负责这张书桌。' : '《住在这里》成册了。早餐摊老板把你介绍为“街巷画手”；以后你可以接自己的插画约稿。',
      sourceEventIds: [main.id, state.events.find(item => item.type === 'opportunity.unlocked' && item.action === actionId).id],
    });
  }
  unlockOpportunities(state, round);
  state.round = round + 1;
  if (round === RULES.maxRounds) {
    state.status = 'ended';
    appendEvent(state, {
      type: 'life.completed', round,
      facts: { funds: state.funds, skills: { ...state.skills }, identities: [...state.identities], completedTasks: [...state.completedTasks] },
      textSnapshot: `八周到这里暂告一段落。书店事务${getSkillStage(state.skills.shop)}，街巷创作${getSkillStage(state.skills.art)}。${state.identities.length ? `你留下了${state.identities.map(id => IDENTITY_NAMES[id]).join('、')}的经历。` : '已经学会和实际做过的事，都留在这段生活里。'}`,
      sourceEventIds: state.events.filter(item => item.type === 'round.resolved').map(item => item.id),
    });
  }
  return state;
}

export function applyAction(state, actionId, expectedRound = state?.round) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  if (checked.state.status !== 'playing') throw fail('game_ended', '这八周已经结束，不能重复结算。');
  if (!Number.isInteger(expectedRound) || expectedRound !== checked.state.round) throw fail('stale_round', '这一周已经变化，请使用当前周的选择。');
  if (!ACTION_BY_ID.has(actionId)) throw fail('unknown_action', '没有这个行动。');
  return reduceAction(checked.state, actionId);
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

/** Checks internal consistency, not identity or anti-cheat authenticity. */
export function validateSave(candidate) {
  const invalid = error => ({ valid: false, state: null, error });
  try {
    const value = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isJsonValue(value)) return invalid('这份记录无法读取，可以重新开始。');
    if (value.schemaVersion !== RULES.schemaVersion || value.rulesVersion !== RULES.version) return invalid('这份记录属于不同的试玩版本，旧记录不会被改写，请开始新的八周。');
    if (typeof value.lifeId !== 'string' || !/^[A-Za-z0-9:_-]{5,128}$/.test(value.lifeId)) return invalid('这份记录的角色标识已损坏。');
    if (!Array.isArray(value.events) || value.events.length > 40) return invalid('这份记录的事件清单已损坏。');
    let canonical = initialState(value.scenarioId, value.lifeId);
    const choices = value.events.filter(item => item && item.type === 'round.resolved');
    if (choices.length > RULES.maxRounds) return invalid('这份记录包含重复的周次。');
    for (const event of choices) {
      if (event.round !== canonical.round || !ACTION_BY_ID.has(event.action)) return invalid('这份记录的选择顺序已损坏。');
      canonical = reduceAction(canonical, event.action);
    }
    if (value.events.length !== canonical.events.length) return invalid('这份记录的事件清单不完整或存在重复。');
    for (let index = 0; index < canonical.events.length; index += 1) {
      const snapshot = value.events[index]?.textSnapshot;
      if (typeof snapshot !== 'string' || !snapshot.trim() || snapshot.length > 2000) return invalid('这份记录的事件文字已损坏。');
      canonical.events[index].textSnapshot = snapshot;
    }
    if (!equalJson(value, canonical)) return invalid('这份记录的资金、能力或经历不一致，请重新开始。');
    return { valid: true, state: canonical, error: null };
  } catch { return invalid('这份记录无法读取，可以重新开始。'); }
}

export function getSummary(state) {
  const checked = validateSave(state);
  if (!checked.valid) throw fail('invalid_save', checked.error);
  const current = checked.state;
  const actions = current.events.filter(item => item.type === 'round.resolved').map(item => ({ id: item.id, round: item.round, action: item.action, ...item.facts, text: item.textSnapshot }));
  return {
    funds: current.funds,
    initialFunds: scenarioById(current.scenarioId).funds,
    fundsChange: current.funds - scenarioById(current.scenarioId).funds,
    skills: { ...current.skills },
    skillStages: { shop: getSkillStage(current.skills.shop), art: getSkillStage(current.skills.art) },
    completedTasks: [...current.completedTasks],
    identities: [...current.identities],
    identityTitles: current.identities.map(id => IDENTITY_NAMES[id]),
    opportunities: current.opportunities,
    totalEarned: actions.reduce((sum, action) => sum + action.income, 0),
    totalLivingCosts: actions.length * RULES.livingCost,
    totalMaterialsCosts: actions.reduce((sum, action) => sum + action.materialsCost, 0),
    actions,
    events: current.events,
    status: current.status,
  };
}
