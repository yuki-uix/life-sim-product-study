import { SCENARIOS, RULES, createGame, getActionAvailability, applyAction, validateSave } from './engine.js';
import { getScene, getActionNarrative } from './story.js';

const STORAGE_KEY = 'three-weekends.save.v1';
const main = document.querySelector('#main');
const saveStatus = document.querySelector('#save-status');
const restartDialog = document.querySelector('#restart-dialog');
const bookDialog = document.querySelector('#book-dialog');
const money = value => `¥${value.toLocaleString('zh-CN')}`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let game = null;
let phase = 'playing';
let view = 'intro';
let selectedScenario = 'roomy';
let saveError = false;
let invalidSave = false;
let actionLocked = false;
let toastTimer;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { game = createGame('roomy'); phase = 'playing'; view = 'game'; persist(); return; }
    const saved = JSON.parse(raw);
    const validation = validateSave(saved.game);
    if (!validation.valid) { invalidSave = true; return; }
    game = validation.state;
    selectedScenario = game.scenarioId;
    phase = saved.phase === 'feedback' && game.events.some(event => event.action) ? 'feedback' : game.status === 'ended' ? 'ending' : 'playing';
    view = 'game';
  } catch { invalidSave = true; }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, phase }));
    saveError = false;
  } catch { saveError = true; }
}

function toast(message) {
  const target = document.querySelector('#toast');
  clearTimeout(toastTimer);
  target.textContent = message;
  target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 3500);
}

function scenario() { return SCENARIOS.find(item => item.id === (game?.scenarioId || selectedScenario)); }
function actionEvents() { return game?.events.filter(event => event.type === 'round.resolved') || []; }

function pixelAvatar() {
  return `<svg class="pixel-avatar" viewBox="0 0 32 32" shape-rendering="crispEdges" role="img" aria-label="周宁的像素头像"><path fill="#33465b" d="M2 2h28v28H2z"/><path fill="#111923" d="M10 5h12v3h3v12H7V8h3z"/><path fill="#cdae8c" d="M10 10h12v11H10z"/><path fill="#111923" d="M10 10h7v3h-7zM12 15h2v2h-2zM19 15h2v2h-2z"/><path fill="#8bd0a5" d="M8 23h16v7H8zM11 21h10v3H11z"/><path fill="#cebb9a" d="M14 20h4v4h-4z"/><path fill="#566b83" d="M7 25h3v5H7zM22 25h3v5h-3z"/></svg>`;
}

function cover(progress = 0) {
  return `<div class="mini-zine ${progress ? 'has-content' : 'is-draft'} ${progress === 3 ? 'is-refined' : ''}" aria-label="${progress ? '住在这里，小册预览' : '住在这里，小册构想'}"><div class="zine-cover"><span class="zine-number">物品 / 城南小册</span><svg viewBox="0 0 64 48" shape-rendering="crispEdges" aria-hidden="true"><path fill="#203347" d="M8 4h42v38H8z"/><path fill="#d2bd8d" d="M12 6h40v36H12z"/><path fill="#8a7956" d="M12 6h4v36h-4z"/><path fill="#243c32" d="M23 19h4v-4h4v-4h4v4h4v4h4v4H23zM27 23h12v12H27z"/><path fill="#d2bd8d" d="M31 27h4v8h-4z"/><path fill="#798d77" d="M20 37h26v2H20z"/></svg><div class="zine-title">住在这里<span>${progress >= 2 ? '四页手作小册' : progress === 1 ? '素材整理中' : '尚未开始'}</span></div><span class="zine-byline">${progress === 3 ? '精修版 / 含后记' : progress >= 2 ? '已成册' : progress === 1 ? '已收集素材' : '未制作'}</span></div></div>`;
}

function projectStatus() { return ['还在构想里', '收集了第一张素材', '小册已经成册', '多留了一页给细节'][game?.projectSteps || 0]; }

function intro() {
  const canResume = Boolean(game);
  return `<section class="intro-view" aria-labelledby="intro-title"><div class="intro-grid"><div class="intro-copy"><p class="eyebrow">菜单 / 开局</p><h1 id="intro-title">三个周末</h1><div class="character-card">${pixelAvatar()}<div><strong>周宁</strong><span>24 岁 / 城南 / 普通上班族</span></div></div><p class="lead">从这里换个开局，或接着刚才的周末。</p><div class="notice"><div><strong>街区消息</strong><span>社区小刊展在第 2 个周末结束时收稿。小册需要投入两个周末才能成册。</span></div></div><p class="small-label scenario-heading">选择这次的开局</p><div class="scenario-picker" role="radiogroup" aria-label="选择起始处境">${SCENARIOS.map(item => `<button type="button" class="scenario-option ${selectedScenario === item.id ? 'selected' : ''}" role="radio" aria-checked="${selectedScenario === item.id}" data-scenario="${item.id}"><span class="scenario-title">${escapeHTML(item.title)}</span><span class="scenario-meta">资金 ${money(item.funds)}</span><span class="scenario-description">${item.id === 'roomy' ? '手头还有一点余量。' : '房租付清了，余量不多。'}</span></button>`).join('')}</div><div class="intro-start"><button type="button" class="primary-button" data-action="${canResume ? 'resume' : 'start'}">${canResume ? game.status === 'ended' ? '查看上次记录' : '继续游戏' : '开始游戏'}</button>${canResume ? '<button type="button" class="text-button" data-action="start-new">用所选开局重玩</button>' : ''}</div><p class="start-note">共 3 回合。每回合安排一个周末。进度自动保存在本机。</p>${invalidSave ? '<p class="notice" role="status">上次记录暂时无法读取，可以开始新游戏。</p>' : ''}</div></div></section>`;
}

function progress() {
  const current = phase === 'feedback' ? actionEvents().at(-1).round : Math.min(game.round, 3);
  return `<div class="round-progress" aria-label="第${current}个周末，共三个">${[1, 2, 3].map(round => `<span class="step ${round < current || game.status === 'ended' ? 'done' : round === current ? 'current' : ''}" ${round === current ? 'aria-current="step"' : ''}><b>${String(round).padStart(2, '0')}</b><small>周末</small></span>`).join('')}</div>`;
}

function notice() {
  if (game.showcase === 'submitted') return '<div class="notice submitted"><span aria-hidden="true">✓</span><div><strong>小册已经投上了社区小展。</strong><span>这个机会已经留在你的记录里。</span></div></div>';
  if (game.showcase === 'missed') return '<div class="notice closed"><span aria-hidden="true">◷</span><div><strong>这次小展已经截稿。</strong><span>你仍然可以做完小册，留给自己。</span></div></div>';
  const needed = Math.max(0, 2 - game.projectSteps);
  return `<div class="notice"><span aria-hidden="true">◷</span><div><strong>社区小刊展 · 第 2 个周末结束时截稿</strong><span>${needed === 1 ? getActionAvailability(game, 'project').enabled ? '小册再推进一步，就能赶上这次展示。' : '小册还差一步成册，但手头暂不足以支付本周开销和材料。' : '小册需要投入两个周末才能成册。'}</span></div></div>`;
}

function timeline(expanded = false) {
  return `<div class="history-panel"><details ${expanded ? 'open' : ''}><summary>这段生活的记录 <span>${game.events.length} 条</span></summary><ol class="timeline">${game.events.map(event => `<li class="timeline-item"><span class="timeline-age">${event.round ? `周末 ${event.round}` : '开场'}</span><p class="timeline-text">${escapeHTML(event.textSnapshot || '')}</p></li>`).join('')}</ol></details></div>`;
}

function sidebar() {
  return `<aside class="sidebar" aria-label="生活余量与小册"><section class="ledger"><p class="small-label">角色状态 / 可用资金</p><p class="balance">${money(game.funds)}</p><p class="balance-note">${escapeHTML(scenario().title)}</p><div class="ledger-row"><span>每周末固定开销</span><strong>¥80</strong></div><div class="ledger-row"><span>${phase === 'feedback' ? '下次可安排的时间' : '本周可安排的时间'}</span><strong>${game.status === 'ended' ? '已安排完' : '1 个周末'}</strong></div><p class="ledger-footnote">每次选择已包含当周固定开销。</p></section><section class="project-panel"><div class="project-panel-title"><p class="small-label">行囊 / 个人项目</p><span class="pill">${game.projectSteps}/3</span></div><h2>《住在这里》</h2><p class="project-status">${projectStatus()}</p>${cover(game.projectSteps)}<div class="project-stage-list">${['收集素材', '装订成册', '精修后记'].map((label, i) => `<span class="${game.projectSteps > i ? 'is-complete' : ''}"><i>${game.projectSteps > i ? '✓' : i + 1}</i>${label}</span>`).join('')}</div>${game.projectSteps ? '<button type="button" class="text-button project-preview" data-action="view-book">翻开这份小册 ↗</button>' : '<p class="muted project-draft-note">第一次投入后，会留下第一张素材。</p>'}</section>${timeline()}</aside>`;
}

function choices() {
  const projectAvailability = getActionAvailability(game, 'project');
  const projectTitles = ['坐下画第一页', '把四页订成小册', '给小册补后记'];
  const workTitle = ['去书店帮忙', '再去书店帮忙', '去书店收尾'][Math.min(actionEvents().filter(event => event.action === 'work').length, 2)];
  let consequence = game.projectSteps === 0 ? game.round >= 2 ? '先留下素材，小册可以之后继续完成。' : '推进到素材阶段；还需要一个周末才能成册。' : game.projectSteps === 1 ? game.round <= 2 ? '完成后可以赶上这次小展。' : '小册会完成，留在你自己手里。' : '留下精修版和一段新的后记。';
  return `<p class="panel-caption">行动 / 选择一项</p><div class="choice-list" aria-label="安排这个周末"><button type="button" class="choice-card" data-choice="work"><span class="choice-index">[1]</span><span class="choice-body"><h2>${workTitle}</h2><span class="choice-meta"><strong>余量 +¥120</strong><span>收入 ¥200 − 固定开销 ¥80</span></span><span class="choice-consequence">小册这个周末不会推进。</span></span><span class="choice-arrow" aria-hidden="true">▶</span></button><button type="button" class="choice-card" data-choice="project" ${projectAvailability.enabled ? '' : 'disabled'} aria-describedby="project-consequence"><span class="choice-index">[2]</span><span class="choice-body"><h2>${projectTitles[Math.min(game.projectSteps, 2)]}</h2><span class="choice-meta"><strong>余量 −¥140</strong><span>材料 ¥60 ＋ 固定开销 ¥80</span></span><span class="choice-consequence" id="project-consequence">${projectAvailability.enabled ? consequence : `手头还差 ${money(Math.max(0, 140 - game.funds))}，才能支付本周开销和材料。`}</span></span><span class="choice-arrow" aria-hidden="true">▶</span></button></div>`;
}

function storyMarkup(story) {
  return story.paragraphs.map(text => `<p>${escapeHTML(text)}</p>`).join('') + (story.quote ? `<div class="dialogue-box"><span class="dialogue-speaker">${escapeHTML(story.quoteSpeaker)}</span><p>「${escapeHTML(story.quote)}」</p></div>` : '');
}

function feedback() {
  const last = actionEvents().at(-1);
  const previous = { ...game, round: last.round, funds: last.facts.fundsBefore, projectSteps: last.facts.projectStepsBefore, events: game.events.filter(event => event.sequence < last.sequence) };
  const story = getActionNarrative(previous, last.action);
  const currentStory = last.textSnapshot.includes(story.log);
  return `<div class="turn-feedback" role="status"><p class="eyebrow">回合 ${String(last.round).padStart(2, '0')} / 发生的事</p><div class="feedback-body"><h1>${currentStory ? escapeHTML(story.heading) : '这次安排已记录。'}</h1><div class="scene-copy">${currentStory ? storyMarkup(story) : `<p>${escapeHTML(last.textSnapshot)}</p>`}</div><div class="feedback-numbers"><span>资金结算</span><span>${money(last.facts.fundsBefore)} <i>→</i> <strong>${money(game.funds)}</strong></span></div>${last.action === 'project' ? '<button type="button" class="text-button" data-action="view-book">查看刚留下的内容 ▶</button>' : ''}${notice()}<button type="button" class="primary-button" data-action="next">${game.status === 'ended' ? '看看这三个周末' : `进入第 ${game.round} 个周末`} <span aria-hidden="true">▶</span></button></div></div>`;
}

function playing() {
  const scene = getScene(game);
  return `<section class="game-view"><div class="game-topline"><span class="chapter-label">周宁 · 24 岁 · 城南<span class="mobile-funds">手头 ${money(game.funds)}</span></span>${progress()}</div><div class="game-grid"><div class="play-column">${phase === 'feedback' ? feedback() : `<div class="scene-header"><p class="eyebrow">场景 / 回合 ${String(game.round).padStart(2, '0')}</p><h1>${escapeHTML(scene.heading)}</h1><div class="scene-copy">${storyMarkup(scene)}</div></div>${game.round === 1 ? notice() : ''}${choices()}<p class="decision-footnote">这次安排会用去一个周末。<span class="keyboard-hint"> 按 1 / 2 选择</span></p>`}</div>${sidebar()}</div></section>`;
}

function ending() {
  const countWork = actionEvents().filter(event => event.action === 'work').length;
  const closing = game.events.find(event => event.type === 'life.completed')?.textSnapshot.replace('三个周末走完了。', '') || '';
  const endingTitle = '三个周末结束了';
  const projectResult = ['小册还在构想里', '第一张素材留了下来', '《住在这里》已经成册', '《住在这里》完成了精修'][game.projectSteps];
  const missed = game.showcase === 'missed' ? '这次没有参加社区小刊展，截稿后没有补投。' : '小册在收稿前完成，已经参加了社区小刊展。';
  return `<section class="ending-view" aria-labelledby="ending-title"><div class="ending-header"><p class="eyebrow">三个周末 / 本局记录</p><h1 id="ending-title">${endingTitle}</h1><p class="lead">这是这一局实际留下的东西。</p></div><div class="ending-grid"><div class="ending-main"><div class="ending-story"><p>${escapeHTML(closing)}</p></div><div class="outcome-list"><div class="outcome-row"><span class="small-label">留下的余量</span><strong>${money(game.funds)}</strong><p>起初 ${money(scenario().funds)}。接了 ${countWork} 次额外工作，${3 - countWork} 个周末给了小册。</p></div><div class="outcome-row"><span class="small-label">做出来的东西</span><strong>${projectResult}</strong><p>${game.projectSteps ? '每一页都来自这次真正投入的时间。' : '你把这些周末交给了别的安排，没有补写一份未做过的作品。'}</p></div><div class="outcome-row"><span class="small-label">这次的机会</span><strong>${game.showcase === 'submitted' ? '赶上了小展' : '错过了本次收稿'}</strong><p>${missed}</p></div></div>${timeline(true)}</div><aside class="ending-aside"><p class="small-label">${game.projectSteps ? '这一次留下的作品' : '还可以继续的想法'}</p>${cover(game.projectSteps)}${game.projectSteps ? '<button type="button" class="button-secondary" data-action="view-book">翻开小册 ↗</button>' : '<p class="muted">它可以留给另一个周末。</p>'}</aside></div><div class="ending-actions"><button type="button" class="primary-button" data-action="alternate">换个开局重新玩</button><button type="button" class="text-button" data-action="replay">重玩当前开局</button></div></section>`;
}

function render({ focus = true } = {}) {
  document.querySelector('#restart-button').hidden = !game || view === 'intro';
  saveStatus.textContent = saveError ? '本次无法保存' : game ? '记录已留在本机' : '';
  main.innerHTML = view === 'intro' ? intro() : game?.status === 'ended' && phase !== 'feedback' ? ending() : playing();
  document.body.dataset.view = view === 'intro' ? 'intro' : game?.status === 'ended' && phase !== 'feedback' ? 'ending' : 'game';
  if (focus) { window.scrollTo({ top: 0, behavior: 'auto' }); main.focus({ preventScroll: true }); }
  actionLocked = false;
}

function startNew() {
  game = createGame(selectedScenario);
  phase = 'playing'; view = 'game'; invalidSave = false;
  persist(); render();
}

function requestNew() {
  if (game?.status === 'playing') restartDialog.showModal();
  else startNew();
}

function showBook() {
  if (!game?.projectSteps) return;
  const steps = game.projectSteps;
  const street = `<svg viewBox="0 0 240 125" class="book-street" aria-hidden="true"><path d="M12 112h216M28 112V44l33-20 34 20v68M29 44h64M103 112V22h46v90M163 112V56l30-23 29 23v56M42 112V81h20v31M42 58h11v12H42M69 58h11v12H69M114 35h11v15h-11M130 35h9v15h-9M114 61h11v15h-11M130 61h9v15h-9M177 70h30v15h-30" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M19 46l43-24 39 24M158 58l35-28 35 28" fill="none" stroke="#c46545" stroke-width="3"/><circle cx="201" cy="17" r="10" fill="#d9b46e" opacity=".6"/></svg>`;
  const materialPage = `<article class="book-page"><span class="book-page-number">${steps >= 2 ? '02 / 街角' : '素材 / 街角'}</span>${street}<h3>七点半的街角</h3><p>早餐摊的蒸汽升起来时，整条街都像刚醒。你把这一刻留在纸上，旁边写着：住在这里，原来有这么多熟悉的声音。</p></article>`;
  const completedPages = `<article class="book-page"><span class="book-page-number">01 / 封面</span>${cover(steps)}</article>${materialPage}<article class="book-page"><span class="book-page-number">03 / 回家</span><div class="book-page-illustration" aria-hidden="true">窗 · 灯 · 路</div><h3>沿着回家的路</h3><p>便利店门口的凳子，修车铺迟迟不关的灯。你用几行文字，把这些每天经过的地方连了起来。</p><p>有时候，走得慢一点，就会多看见一扇亮着的窗。</p></article><article class="book-page ${steps === 3 ? 'handwritten-page' : ''}"><span class="book-page-number">04 / ${steps === 3 ? '手写后记' : '封底'}</span><h3>${steps === 3 ? '再慢一点，也很好。' : '给三个周末，留一页空白。'}</h3><p>${steps === 3 ? '起初只是想做点自己的东西。后来才发现，熟悉的路、每天擦肩的人，都值得被好好看见。' : '把日常装订起来，送给正在经过这条街的人，也留给未来的自己。'}</p>${steps === 3 ? '<p>你重新调了封面的留白，缝好装订线，给末页画上一枚小印记。</p><span class="book-stamp">住在<br>这里</span>' : ''}<span class="book-colophon">《住在这里》 · 周宁 / 城南</span></article>`;
  document.querySelector('#book-content').innerHTML = `<p class="book-edition">${steps === 1 ? '第一份素材 · 尚未成册' : steps === 3 ? '手作精修版 · 四页与后记' : '周末小册 · 四页成册'}</p><div class="book-spreads">${steps >= 2 ? completedPages : materialPage}</div>`;
  bookDialog.showModal();
}

document.addEventListener('click', event => {
  const choice = event.target.closest('[data-choice]');
  if (choice) {
    if (choice.disabled || actionLocked || phase !== 'playing' || game?.status !== 'playing') return;
    actionLocked = true;
    const expectedRound = game.round;
    try { game = applyAction(game, choice.dataset.choice, expectedRound); phase = 'feedback'; persist(); render(); }
    catch { actionLocked = false; toast('这次安排没有生效，请重新选择。'); }
    return;
  }
  const option = event.target.closest('[data-scenario]');
  if (option) { selectedScenario = option.dataset.scenario; render({ focus: false }); document.querySelector(`[data-scenario="${selectedScenario}"]`)?.focus(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'home') { view = 'intro'; render(); }
  else if (action === 'start' || action === 'start-new') requestNew();
  else if (action === 'resume') { view = 'game'; render(); }
  else if (action === 'restart') { selectedScenario = game.scenarioId; restartDialog.showModal(); }
  else if (action === 'cancel-restart') restartDialog.close();
  else if (action === 'confirm-restart') { restartDialog.close(); startNew(); }
  else if (action === 'next') { phase = game.status === 'ended' ? 'ending' : 'playing'; persist(); render(); }
  else if (action === 'view-book') showBook();
  else if (action === 'close-book') bookDialog.close();
  else if (action === 'alternate') { selectedScenario = game.scenarioId === 'roomy' ? 'tight' : 'roomy'; startNew(); }
  else if (action === 'replay') { selectedScenario = game.scenarioId; startNew(); }
});

document.addEventListener('keydown', event => {
  if (['1', '2'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat && !document.querySelector('dialog[open]') && view === 'game' && phase === 'playing' && game?.status === 'playing') {
    const target = document.querySelector(`[data-choice="${event.key === '1' ? 'work' : 'project'}"]`);
    if (target && !target.disabled) { event.preventDefault(); target.click(); }
    return;
  }

  const selected = event.target.closest('[data-scenario]');
  if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault(); selectedScenario = selectedScenario === 'roomy' ? 'tight' : 'roomy'; render({ focus: false }); document.querySelector(`[data-scenario="${selectedScenario}"]`)?.focus();
  }
});

for (const dialog of [restartDialog, bookDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

load();
render({ focus: false });
