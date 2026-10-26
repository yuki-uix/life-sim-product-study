import { ACTIONS, SCENARIOS, RULES, createGame, applyAction, getActionAvailability, getSkillStage, validateSave } from './engine.js';
import { getScene, getActionNarrative, getEndingNarrative } from './story.js';

const STORAGE_KEY = 'chengnan.growth.save.v2';
const main = document.querySelector('#main');
const restartDialog = document.querySelector('#restart-dialog');
const artifactDialog = document.querySelector('#artifact-dialog');
const skillNames = { shop: '书店事务', art: '街巷创作' };
const identityNames = { shop: '书店搭档', art: '街巷画手' };
const taskIds = { shop: 'shop_shift', art: 'art_commission' };
const milestoneIds = { shop: 'shop_table', art: 'art_book' };
const e = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => `¥${value.toLocaleString('zh-CN')}`;
const signedMoney = value => `${value >= 0 ? '+' : '−'}${money(Math.abs(value))}`;
let game;
let phase = 'playing';
let view = 'game';
let selectedScenario = 'roomy';
let saveError = false;
let invalidSave = false;
let actionLocked = false;
let toastTimer;
let pendingScenario;

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, phase })); saveError = false; }
  catch { saveError = true; }
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const checked = validateSave(saved.game);
      if (checked.valid) {
        game = checked.state;
        selectedScenario = game.scenarioId;
        phase = saved.phase === 'feedback' && actionsTaken().length ? 'feedback' : game.status === 'ended' ? 'ending' : 'playing';
        return;
      }
      invalidSave = true;
    }
  } catch { invalidSave = true; }
  game = createGame();
  if (invalidSave) view = 'menu';
  else persist();
}
function toast(message) {
  const target = document.querySelector('#toast');
  clearTimeout(toastTimer); target.textContent = message; target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 3500);
}
function actionsTaken() { return game.events.filter(event => event.type === 'round.resolved'); }
function titleOf(id) { return ACTIONS.find(action => action.id === id)?.title || id; }
function paragraphs(scene) { return `<div class="scene-copy">${scene.paragraphs.map(text => `<p>${e(text)}</p>`).join('')}</div>${scene.dialogue ? `<div class="dialogue-box"><span class="dialogue-speaker">${e(scene.speaker || '')}</span><p>${e(scene.dialogue)}</p></div>` : ''}`; }
function avatar() {
  const shop = game.identities.includes('shop'), art = game.identities.includes('art');
  return `<svg class="pixel-avatar" viewBox="0 0 32 32" role="img" aria-label="周宁的像素头像${shop ? '，系上了书店围裙' : art ? '，身边带着画笔' : ''}"><path fill="#33465b" d="M0 0h32v32H0z"/><path fill="#101722" d="M10 4h12v3h3v13H7V7h3z"/><path fill="#cdae8c" d="M10 10h12v11H10z"/><path fill="#101722" d="M10 10h7v3h-7zM12 15h2v2h-2zM19 15h2v2h-2z"/><path fill="#8bd0a5" d="M8 23h16v9H8zM11 21h10v3H11z"/>${shop ? '<path fill="#d6bc78" d="M12 23h8v9h-8zM11 22h2v4h-2zM19 22h2v4h-2z"/>' : ''}${art ? '<path fill="#d6bc78" d="M25 20h2v10h-2z"/><path fill="#e3e7dc" d="M25 18h2v3h-2z"/>' : ''}</svg>`;
}
function nextGrowth(skill) {
  const value = game.skills[skill];
  if (game.identities.includes(skill)) return skill === 'shop' ? '现在可以自己负责周末书桌。' : '现在可以接自己的插画约稿。';
  if (value < 2) return `再练 ${2 - value} 次 → ${skill === 'shop' ? '独立看店' : '招牌委托'}事件`;
  if (!game.completedTasks.includes(taskIds[skill])) return `已收到${skill === 'shop' ? '独立看店' : '招牌委托'}邀请，试着独立完成一次。`;
  if (value < 4) return `再练 ${4 - value} 次 → ${skill === 'shop' ? '主题书桌' : '街巷小册'}事件`;
  return `${skill === 'shop' ? '主题书桌' : '街巷小册'}的新事件已出现。`;
}
function skills() {
  return `<div class="skills-grid">${['shop', 'art'].map(skill => `<article class="skill-card"><div class="skill-head"><span class="skill-name">${skillNames[skill]}</span><span class="skill-stage">${getSkillStage(game.skills[skill])}</span></div><div class="skill-pips" aria-label="${skillNames[skill]} ${game.skills[skill]}/4">${[1, 2, 3, 4].map(level => `<i class="${level <= game.skills[skill] ? 'filled' : ''}"></i>`).join('')}<span class="skill-amount">${game.skills[skill]}/4</span></div><p class="skill-next">${e(nextGrowth(skill))}</p></article>`).join('')}</div>`;
}
function characterPanel(mobile = false) {
  return `<section class="${mobile ? 'growth-strip' : 'character-panel ledger'}" aria-label="角色与能力"><div class="character-strip">${avatar()}<div><strong class="character-name">周宁 <span class="muted">24 岁</span></strong><div class="character-identities">${game.identities.length ? game.identities.map(id => `<span class="identity-tag">${identityNames[id]}</span>`).join('') : '<span class="character-subtitle">还在摸索自己能做什么</span>'}</div></div><span class="character-funds">${money(game.funds)}</span></div>${skills()}</section>`;
}
function history() {
  return `<section class="history-panel"><details><summary>这段成长的记录 <span>${game.events.length} 条</span></summary><ol class="timeline">${game.events.map(event => `<li class="timeline-item"><span class="timeline-age">第 ${event.round} 周</span><p class="timeline-text">${e(event.textSnapshot)}</p></li>`).join('')}</ol></details></section>`;
}
const artifacts = {
  shop_shift: { title: '第一次独立值班', summary: '自己开门、找书、接待读者，收好一天的账。', detail: ['你不再需要每次先问书放在哪里。', '一位读者只记得封面颜色。你沿着书架找到了它，在交接本上留下第一条由你独立完成的记录。'] },
  art_commission: { title: '挂出去的招牌', summary: '早餐摊前，多了一块你画的“早点见”。', detail: ['纸上的线条，这次真的挂在了街上。', '你把蒸汽画成了“早”字上方的几笔。老板把招牌挂好，第二天有人循着它找到了摊位。'] },
  shop_table: { title: '周末主题书桌', summary: '选书、写推荐、摆出一张由你负责的桌子。', detail: ['这张桌子的题目是“住在附近的人”。', '《街角来信》——从一条熟悉的小巷开始。', '《旧物小记》——替还记得的人留下位置。', '《走慢一点》——读完再走也不迟。', '这些是本次试玩创作的虚构书目。陈姐把桌牌翻过来，写下“本周由周宁选书”。'] },
  art_book: { title: '《住在这里》', summary: '一本四页小册，从最初的练习长成了完整作品。', detail: ['第一页 · 早上\n早餐摊的蒸汽升起来，把招牌的边缘遮住了一点。', '第二页 · 经过\n旧影院的位置成了便利店。门口的台阶还在。', '第三页 · 亮灯\n回家的路拐两次弯，最后一盏灯总比你先亮。', '第四页 · 住在这里\n一开始只是练习画线。后来才发现，自己已经能把这些地方连在一起。最早那张歪歪的招牌，也夹在这一页。'] },
};
function artifactArt(id) {
  if (id === 'shop_shift') return '<svg viewBox="0 0 64 40" aria-hidden="true"><path fill="#d6bc78" d="M12 12h16v16H12zM28 18h24v6H28zM42 22h5v8h-5z"/><path fill="#172334" d="M17 17h6v6h-6z"/></svg>';
  if (id === 'art_commission') return '<svg viewBox="0 0 64 40" aria-hidden="true"><path fill="#d6bc78" d="M6 8h52v26H6z"/><path fill="#354d49" d="M10 12h44v18H10z"/><text x="13" y="25" fill="#e3e7dc" font-size="12">早点见</text></svg>';
  if (id === 'shop_table') return '<svg viewBox="0 0 64 40" aria-hidden="true"><path fill="#798d77" d="M6 23h52v5H6zM10 28h4v10h-4zM50 28h4v10h-4z"/><path fill="#d6bc78" d="M12 6h10v17H12zM27 10h10v13H27zM42 4h10v19H42z"/><path fill="#33465b" d="M15 9h4v2h-4zM30 13h4v2h-4zM45 7h4v2h-4z"/></svg>';
  return '<svg viewBox="0 0 64 40" aria-hidden="true"><path fill="#d6bc78" d="M17 3h32v34H17z"/><path fill="#8a7956" d="M17 3h4v34h-4z"/><path fill="#354d49" d="M25 14h18v3H25zM25 21h14v3H25zM25 28h10v2H25z"/></svg>';
}
function worldPanel() {
  const owned = Object.keys(artifacts).filter(id => game.completedTasks.includes(id));
  if (!owned.length) return '<section class="world-panel ledger"><span class="small-label">你与这条街</span><p class="balance-note">做成的事会留在这里。第一次独立完成任务时，回来看看。</p></section>';
  return `<section class="world-panel ledger"><span class="small-label">你已经做成的事</span><div class="artifact-grid">${owned.map(id => `<button type="button" class="artifact-card" data-artifact="${id}"><span class="artifact-art">${artifactArt(id)}</span><span>${e(artifacts[id].title)}</span><span class="artifact-description">${e(artifacts[id].summary)}</span></button>`).join('')}</div></section>`;
}
function choices(scene) {
  const available = ACTIONS.filter(action => action.kind === 'practice' ? game.skills[action.skill] < RULES.maxSkill : game.opportunities.some(item => item.id === action.id && item.unlockedRound <= game.round) && (action.kind === 'task' || !game.completedTasks.includes(action.id)));
  const rank = action => action.id === scene.opportunityId ? 0 : action.kind === 'milestone' ? 1 : action.kind === 'task' && (game.identities.includes(action.skill) || !game.completedTasks.includes(action.id)) ? 2 : action.kind === 'practice' ? 3 : 4;
  const ordered = [...available].sort((a, b) => rank(a) - rank(b));
  return `<p class="action-group-label">这一周，想做什么？ <span class="muted">每次用去一周</span></p><div class="choice-list" role="group" aria-label="安排这一周">${ordered.map((action, index) => {
    const allowed = getActionAvailability(game, action.id);
    const isNew = action.kind !== 'practice' && !game.completedTasks.includes(action.id);
    const description = action.kind === 'task' && game.identities.includes(action.skill) ? action.skill === 'shop' ? '选书、写荐书卡，独立照看自己负责的周末书桌。' : '商量构图并交付插画，让画面适合对方的实际用途。' : action.id === 'art_commission' && game.completedTasks.includes(action.id) ? '继续用学会的构图和线条，为早餐摊画新的价目牌。' : action.description;
    const gain = allowed.skillGain ? `${skillNames[action.skill]} +${allowed.skillGain}` : action.kind === 'milestone' ? `形成身份：${identityNames[action.skill]}` : action.kind === 'task' ? '使用已学会的本领' : '这项本领已熟练';
    const cost = `收入 ${money(allowed.income)}${allowed.materialsCost ? ` − 材料 ${money(allowed.materialsCost)}` : ''} − 日常 ${money(allowed.livingCost)}`;
    return `<button type="button" class="choice-card ${isNew ? 'is-new' : ''}" data-turn="${action.id}" ${allowed.enabled ? '' : 'disabled'}><span class="choice-index">${index + 1}</span><span class="choice-body"><h2>${e(allowed.title)} ${isNew ? '<span class="choice-badge">新事件</span>' : ''}</h2><span class="choice-meta"><strong>${e(gain)}</strong><span>${signedMoney(allowed.netChange)}</span></span><span class="choice-consequence">${e(allowed.enabled ? action.kind === 'practice' ? action.skill === 'shop' ? game.skills.shop < 2 ? '先学会认书、找书。上手后，才有人放心把店交给你。' : '继续练选书和陈列，为自己负责一张书桌做准备。' : game.skills.art < 2 ? '从线条练起。上手后，会有人来请你画一块招牌。' : '练构图与叙述，为做出自己的完整作品做准备。' : description : allowed.reason)}</span><span class="choice-cost">${e(cost)}</span></span><span class="choice-arrow" aria-hidden="true">▶</span></button>`;
  }).join('')}</div>`;
}
function gameTopline(round) { return `<div class="game-topline"><span class="chapter-label">城南 · 从生疏到熟练</span><span class="round-counter">第 ${round} / ${RULES.maxRounds} 周</span></div>`; }
function playing() {
  const scene = getScene(game);
  const cause = ACTIONS.find(action => action.id === scene.opportunityId);
  return `${characterPanel(true)}${gameTopline(game.round)}<div class="game-grid"><div class="play-column"><section class="scene-header ${scene.opportunityId ? 'opportunity-card' : ''}"><p class="eyebrow">${cause ? `新事件 / ${skillNames[cause.skill]}已${getSkillStage(cause.requiredSkill)}` : '街上的这一周'}</p><h1>${e(scene.title)}</h1>${paragraphs(scene)}</section>${choices(scene)}<p class="choice-footnote keyboard-hint">数字键 1–6 也能选择。成长、机会与做成的事会保留下来。</p></div><aside class="sidebar">${characterPanel()}${worldPanel()}${history()}</aside></div>`;
}
function previousState() {
  let previous = createGame(game.scenarioId);
  for (const event of actionsTaken().slice(0, -1)) previous = applyAction(previous, event.action);
  return previous;
}
function feedback() {
  const event = actionsTaken().at(-1);
  const previous = previousState();
  const story = getActionNarrative(previous, event.action);
  const unlocked = game.opportunities.filter(item => item.unlockedRound === event.round + 1);
  const identities = game.identities.filter(id => !previous.identities.includes(id));
  const facts = event.facts;
  return `${characterPanel(true)}${gameTopline(event.round)}<div class="game-grid"><div class="play-column"><section class="turn-feedback"><p class="eyebrow">这一周发生了什么</p><div class="feedback-body"><h1>${e(story.title)}</h1>${paragraphs(story)}${artifacts[event.action] && !previous.completedTasks.includes(event.action) ? `<button type="button" class="text-button" data-artifact="${event.action}">看看这次做成的东西 ↗</button>` : ''}${facts.skillGain ? `<div class="feedback-growth"><span>${skillNames[facts.skill]}</span><strong>${getSkillStage(facts.skillBefore)} → ${getSkillStage(facts.skillAfter)}</strong><span>${facts.skillBefore}/4 → ${facts.skillAfter}/4</span></div>` : ''}${identities.map(id => `<div class="growth-notice"><strong>你成为了${identityNames[id]}</strong><p>${id === 'shop' ? '围裙和选书桌留给了你。下一次，你可以自己负责。' : '从练习到完整作品。下一次，可以用自己的名字接约稿。'}</p></div>`).join('')}${unlocked.map(item => `<div class="growth-notice"><strong>新的事件：${e(titleOf(item.id))}</strong><p>${e(nextGrowth(ACTIONS.find(action => action.id === item.id).skill))} ${game.status === 'ended' ? '这次试玩在这里暂停，新机会已记入成长记录。' : '下一周，可以把本领用到新的事情上。'}</p></div>`).join('')}<div class="feedback-numbers"><span>生活余量</span><span>${money(facts.fundsBefore)} <i>→</i> <strong>${money(facts.fundsAfter)}</strong><small>${signedMoney(facts.netChange)}</small></span></div><p class="balance-note">${`收入 ${money(facts.income)} − 材料 ${money(facts.materialsCost)} − 日常 ${money(facts.livingCost)}`}</p><button type="button" class="primary-button" data-action="next">${game.status === 'ended' ? '看看我已经长成的样子' : `走进第 ${game.round} 周`} →</button></div></section></div><aside class="sidebar">${characterPanel()}${worldPanel()}${history()}</aside></div>`;
}
function ending() {
  const story = getEndingNarrative(game);
  return `<section class="ending-header"><p class="eyebrow">八周 / 成长留下了什么</p><h1>${e(story.title)}</h1>${paragraphs(story)}<p class="balance-note">这是试玩片段的终点，你的本领和经历不以一个总分评价。</p></section><div class="ending-grid"><div class="ending-main">${characterPanel(true)}<div class="outcome-list">${['shop','art'].map(skill => `<div class="outcome-row"><span class="small-label">${skillNames[skill]}</span><strong>生疏 → ${getSkillStage(game.skills[skill])}</strong><p>${game.identities.includes(skill) ? `已经以“${identityNames[skill]}”的身份做过自己的事。` : game.completedTasks.includes(taskIds[skill]) ? '已经独立完成过一次任务。' : game.skills[skill] >= 2 ? '有了本领，也收到了新的邀请。' : game.skills[skill] ? '已经迈出第一次练习。' : '这一次，没有把时间留给这条方向。'}</p></div>`).join('')}</div>${worldPanel()}${history()}<div class="ending-actions"><button type="button" class="primary-button" data-action="restart">再养一个不同的自己</button><button type="button" class="text-button" data-action="menu">换个起始处境</button></div></div><aside class="sidebar">${characterPanel()}<section class="ledger"><span class="small-label">留下的生活余量</span><strong class="balance">${money(game.funds)}</strong><p class="balance-note">时间让不同本领长出来，积蓄也是这段生活的一部分。</p></section></aside></div>`;
}
function menu() {
  return `<section class="intro-view"><div class="intro-copy"><p class="eyebrow">菜单 / 重新出发</p><h1>城南八周</h1><p class="lead">一开始只会帮忙。后来，试着把一件事独立做成。</p><div class="scenario-picker" role="radiogroup" aria-label="选择起始处境">${SCENARIOS.map(s => `<button type="button" class="scenario-option ${selectedScenario === s.id ? 'selected' : ''}" role="radio" aria-checked="${selectedScenario === s.id}" data-scenario="${s.id}"><span class="scenario-title">${e(s.title)}</span><span class="scenario-meta">${money(s.funds)}</span><span class="scenario-description">${e(s.description)}</span></button>`).join('')}</div>${invalidSave ? '<p class="notice">上次的记录暂时无法读取。它仍留在本机；开始新片段会替换这份记录。</p>' : ''}<div class="intro-start">${!invalidSave ? '<button class="primary-button" type="button" data-action="resume">继续刚才的生活</button>' : ''}<button class="button-secondary" type="button" data-action="new-scenario">用这个处境重新开始</button></div><p class="start-note">共八次行动。投入会长成本领，本领会带来新的事件。选择后可随时离开，进度会自动保存。</p></div></section>`;
}
function render(focus = true) {
  main.innerHTML = view === 'menu' ? menu() : phase === 'feedback' ? feedback() : phase === 'ending' ? ending() : playing();
  document.querySelector('#save-status').textContent = saveError ? '本次未能保存' : '进度已保存';
  document.querySelector('#restart-button').hidden = view === 'menu';
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}
function confirmRestart(scenarioId = game.scenarioId) { pendingScenario = scenarioId; restartDialog.showModal(); }
function takeAction(id) {
  if (actionLocked || view !== 'game' || phase !== 'playing') return;
  const allowed = getActionAvailability(game, id);
  if (!allowed.enabled) { toast(allowed.reason); return; }
  actionLocked = true;
  try {
    const story = getActionNarrative(game, id);
    game = applyAction(game, id, game.round);
    // Keep authored detail with the actual action, including after wording changes.
    game.events.filter(event => event.type === 'round.resolved').at(-1).textSnapshot += ` ${story.log || story.paragraphs.join(' ')}`;
    phase = 'feedback'; persist(); render();
  } catch (error) { toast(error.message); }
  finally { actionLocked = false; }
}
function showArtifact(id) {
  if (!game.completedTasks.includes(id) || !artifacts[id]) return;
  const artifact = artifacts[id];
  document.querySelector('#artifact-title').textContent = artifact.title;
  document.querySelector('#artifact-content').innerHTML = `<div class="artifact-art artifact-large">${artifactArt(id)}</div><div class="book-spreads">${artifact.detail.map((text, i) => `<article class="book-page"><span class="book-page-number">${id === 'art_book' ? `第 ${i + 1} 页` : '留在这条街上的事'}</span><p>${e(text).replace(/\n/g, '<br>')}</p></article>`).join('')}</div>`;
  artifactDialog.showModal();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.turn) { takeAction(button.dataset.turn); return; }
  if (button.dataset.artifact) { showArtifact(button.dataset.artifact); return; }
  if (button.dataset.scenario) { selectedScenario = button.dataset.scenario; render(false); return; }
  switch (button.dataset.action) {
    case 'home': case 'menu': view = 'menu'; selectedScenario = game.scenarioId; render(); break;
    case 'resume': view = 'game'; render(); break;
    case 'restart': confirmRestart(); break;
    case 'new-scenario': confirmRestart(selectedScenario); break;
    case 'cancel-restart': restartDialog.close(); break;
    case 'confirm-restart': game = createGame(pendingScenario); selectedScenario = game.scenarioId; invalidSave = false; phase = 'playing'; view = 'game'; restartDialog.close(); persist(); render(); break;
    case 'close-artifact': artifactDialog.close(); break;
    case 'next': phase = game.status === 'ended' ? 'ending' : 'playing'; persist(); render(); break;
  }
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]') || view !== 'game' || phase !== 'playing' || !/^[1-6]$/.test(event.key)) return;
  const button = main.querySelectorAll('[data-turn]')[Number(event.key) - 1];
  if (button && !button.disabled) { event.preventDefault(); takeAction(button.dataset.turn); }
});
load(); render(false);
