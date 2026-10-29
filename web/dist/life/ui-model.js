import { getLifeView } from './engine.js?v=4';

/** One visible clock state, derived without changing the saved life or manual intent. */
export function deriveClock({ status, pending = null, needsPlan = false, manualPaused = false, panel = null, restartOpen = false, hidden = false } = {}) {
  const stopped = (kind, label, action, actionLabel, actionDisabled = false) => ({
    kind, label, action, actionLabel, actionDisabled, canRun: false, nextDisabled: true,
  });
  if (panel) {
    const labels = { plan: '安排生活中', overview: '查看近况中', nearby: '查看近况中', status: '查看近况中', people: '查看近况中', records: '查看记录中', timeline: '查看记录中' };
    const label = labels[panel] || '查看中';
    return stopped('viewing', label + (status === 'ended' ? '，这一生已结束' : '，已暂停'), 'return-life', '返回生活');
  }
  if (restartOpen) return stopped('viewing', '正在确认重新开始，已暂停', 'none', '确认中', true);
  if (status === 'ended') return stopped('ended', '这一生已经结束', 'none', '已经结束', true);
  if (status !== 'living') return stopped('unborn', '这一生还未开始', 'none', '尚未开始', true);
  if (hidden) return stopped('hidden', '页面不在前台，已暂停', 'resume', '继续生活');
  if (pending) return stopped('decision', '有一件事，需要你决定', 'show-decision', '处理眼前决定');
  if (needsPlan) return stopped('needs-plan', '先选最近的生活安排', 'open-plan', '先安排生活');
  if (manualPaused) return { ...stopped('paused', '时间已暂停', 'resume', '继续生活'), nextDisabled: false };
  return { kind: 'running', label: '自动生活中', action: 'pause', actionLabel: '暂停', actionDisabled: false, canRun: true, nextDisabled: false };
}

const nonnegative = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const money = value => '约' + nonnegative(value).toLocaleString('zh-CN') + '元';

/** A reservation is shown as reserved, never deducted from the real game balance. */
export function reservationSummary(state, view = getLifeView(state)) {
  const empty = {
    active: false, hasReservation: false, activity: '', activityId: null,
    timeTotal: 0, promisedTime: 0, reservedTime: 0, remainingTime: 0,
    moneyBalance: 0, reservedMoney: 0, moneyUnreserved: 0, text: '', lines: [],
  };
  const young = state?.facts?.young;
  if (!young || !view?.active) return empty;
  const timeTotal = nonnegative(view.yearTime?.total);
  const promisedTime = nonnegative(view.yearTime?.promised);
  const freeTime = nonnegative(view.yearTime?.free);
  const arrangedNow = young.arranged?.age === state.age;
  const activity = arrangedNow ? view.arrangements?.find(option => option.selected && option.id === young.arranged.id) : null;
  const reservedTime = nonnegative(activity?.timeCost);
  const reservedMoney = nonnegative(activity?.moneyCost);
  const remainingTime = Math.max(0, freeTime - reservedTime);
  const moneyBalance = nonnegative(young.reserve) * 1000;
  const moneyUnreserved = Math.max(0, moneyBalance - reservedMoney);
  const lines = activity ? [
    `已预留${reservedTime}个空闲周末给「${activity.label}」；其余${remainingTime}个跟随最近重心。`,
    `${money(reservedMoney)}待支出；目前余额${money(moneyBalance)}，未预留部分${money(moneyUnreserved)}。`,
  ] : [
    `今年可安排${remainingTime}个完整的空闲周末。`,
    `可动用备用金${money(moneyBalance)}。`,
  ];
  if (promisedTime) lines.unshift(`今年共${timeTotal}个空闲周末，其中${promisedTime}个已留给之前答应的事。`);
  return {
    active: true, hasReservation: Boolean(activity), activity: activity?.label || '', activityId: activity?.id || null,
    timeTotal, promisedTime, reservedTime, remainingTime, moneyBalance, reservedMoney, moneyUnreserved,
    text: lines.join(' '), lines,
  };
}

/** Summarises recorded changes only; this function does not settle or predict a year. */
export function describeChanges(before, after) {
  if (!before || !after) return [];
  const previous = before.facts?.young, current = after.facts?.young;
  if (!previous || !current) return [];
  const previousView = getLifeView(before), currentView = getLifeView(after);
  const changes = [];
  if (previous.reserve !== current.reserve) changes.push(`备用金：${money(previous.reserve * 1000)} → ${money(current.reserve * 1000)}`);
  if (currentView.active) {
    const previousItems = new Map((previousView.items || []).map(item => [item.label, item.value]));
    for (const item of currentView.items || []) {
      if (item.label === '手头' || previousItems.get(item.label) === item.value) continue;
      changes.push(`${item.label}：${item.value}`);
    }
  }
  if (after.age > before.age && current.history?.length > previous.history?.length && previous.arranged) {
    const settled = current.history.find(row => row.age === previous.arranged.age && row.arrangement === previous.arranged.id);
    const arrangement = previousView.arrangements?.find(option => option.id === previous.arranged.id);
    if (settled && arrangement) changes.push(`本年预约已结算：${arrangement.label}。`);
  }
  return changes;
}
