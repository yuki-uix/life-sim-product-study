import { createGame, setFocus, advanceDays, getChoices, choose, toggleFavorite, validateSave, getSummary, getGrowth, getProjects, startProject, advanceToNextMoment, migrateLegacySave } from './calendar-engine.js?v=0.5.0';
import { CONFIG, FOCUSES, PEOPLE, SKILLS, STORIES, PROJECTS, dateInfo, getStoryPresentation } from './calendar-content.js?v=0.5.0';
import { campusScene, avatar } from './campus-art.js';

const STORAGE_KEY = 'campus-slowly.save.v5';
const LEGACY_KEY = 'campus-slowly.save.v4';
const main = document.querySelector('#main');
const restartDialog = document.querySelector('#restart-dialog');
const detailDialog = document.querySelector('#detail-dialog');
const DAY_MS = 1600;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const e = escapeHTML;
let game, running = false, speed = 1, started = false, invalidSave = false, saveError = false;
let accumulated = 0, lastTick = performance.now(), focusOpen = false, logFilter = 'all';
let unseen = 0, toastTimer, growthOpen = false;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = raw ? null : localStorage.getItem(LEGACY_KEY);
    if (raw || legacy) {
      const saved = JSON.parse(raw || legacy);
      const checked = raw ? validateSave(saved.game) : migrateLegacySave(saved.game);
      if (!checked.valid) { invalidSave = true; game = createGame(); return; }
      game = checked.state; started = Boolean(saved.started);
      if (legacy) persist();
      return;
    }
  } catch { invalidSave = true; }
  game = createGame();
}
function persist() {
  if (invalidSave) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({game, started})); saveError = false; }
  catch { saveError = true; }
}
function toast(text) {
  const target = document.querySelector('#toast');
  clearTimeout(toastTimer); target.textContent = text; target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 3200);
}
function focusItem() { return FOCUSES.find(item => item.id === game.focus); }
function pause() { running = false; accumulated = 0; }
function dateLabel(day) { return dateInfo(day).label; }
function calendar() {
  const date = dateInfo(game.day);
  const status = game.phase === 'ended' ? '这一段走到了十一月底' : game.pending ? '有件事，需要你决定' : running ? '日子在往前走' : started ? '时间已暂停' : '从开学的九月开始';
  return `<section class="calendar" aria-label="校园日历"><div class="calendar-heading"><div><p class="eyebrow">南棠大学 · 大一 · 秋季</p><h1><span>${e(date.monthLabel)}</span> <b>${date.day}</b><small>日</small></h1></div><div class="calendar-status"><span class="clock-dot ${running ? 'running' : ''}" aria-hidden="true"></span>${e(status)}<small>第 ${date.week} 周 / 九月至十一月试玩</small></div></div><div class="month-track" role="progressbar" aria-label="秋季时间进度" aria-valuemin="0" aria-valuemax="90" aria-valuenow="${game.day}" aria-valuetext="${e(date.label)}"><span style="width:${game.day / 90 * 100}%"></span><i></i><i></i></div><div class="month-labels"><span class="${date.month === 9 ? 'current' : ''}">九月 · 刚开学</span><span class="${date.month === 10 ? 'current' : ''}">十月 · 渐渐熟悉</span><span class="${date.month === 11 ? 'current' : ''}">十一月 · 天凉了</span></div><div class="time-controls"><button class="primary-button" type="button" data-action="play" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}>${running ? 'Ⅱ 暂停' : started ? '▷ 继续生活' : '▷ 开始这段生活'}</button><div class="speeds" aria-label="时间速度">${[1,2,4].map(value => `<button type="button" data-speed="${value}" aria-pressed="${speed === value}" ${game.phase === 'ended' ? 'disabled' : ''}>${value}×</button>`).join('')}</div><button class="text-button fast-forward" type="button" data-action="forward" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}>到下一次变化 ››</button></div></section>`;
}
function focusPanel() {
  const focus = focusItem();
  return `<section class="focus-panel"><details id="focus-settings" ${focusOpen ? 'open' : ''}><summary><span class="eyebrow">最近，课余常做什么</span><strong>${e(focus.title)}</strong><span class="change-label">${game.pending ? '先处理眼前的事' : '调整 ▾'}</span></summary><div class="focus-options" role="group" aria-label="近期生活重心">${FOCUSES.map(item => `<button type="button" data-focus="${item.id}" class="focus-option" aria-pressed="${game.focus === item.id}" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}><span>${e(item.title)}</span><small>${e(item.description)}</small></button>`).join('')}</div></details><p class="focus-note">${e(focus.description)}<br>这个安排会持续，可以随时换。</p></section>`;
}
function growthPanel() {
  const growth = getGrowth(game), projects = getProjects(game);
  const active = game.project ? projects.find(item => item.id === game.project.id) : null;
  return `<section class="growth-panel" aria-label="角色成长"><details id="growth-details" ${growthOpen ? 'open' : ''}><summary><span class="growth-heading">慢慢学会的事 <small>能做什么 ▾</small></span><div class="growth-overview">${growth.map(item => `<div class="growth-overview-item"><span>${e(item.name)} <b>${e(item.stage)}</b></span><progress max="${item.nextAt || 35}" value="${item.days}" aria-label="${e(item.name)}：${item.days}天，${item.nextAt ? `距下一阶段${item.remaining}天` : '已达到当前最高阶段'}"></progress><small>${item.nextAt ? `再${item.skillId === 'record' ? '散步记录' : '参加社团'} ${item.remaining} 天` : '已经有自己的办法'}</small></div>`).join('')}</div></summary><div class="capability-list">${growth.map(item => `<div class="capability-track"><h3>${e(item.name)} · ${e(item.stage)}</h3>${item.capabilities.map(capability => `<p class="capability ${capability.unlocked ? 'unlocked' : ''}"><span>${capability.unlocked ? '✓' : '·'}</span><span><strong>${e(capability.title)}</strong><small>${e(capability.description)}</small></span></p>`).join('')}</div>`).join('')}</div></details>${active ? `<div class="project-active"><p class="eyebrow">${active.paused ? '这件事先留着' : '正在慢慢准备'}</p><h3>${e(active.title)}</h3><progress max="${active.duration}" value="${active.progress}" aria-label="准备进度 ${active.progress}/${active.duration}"></progress><p>${active.progress} / ${active.duration} 天 · ${active.paused ? '换了生活重心，准备暂时停着。' : `在${e(FOCUSES.find(focus => focus.id === active.focusId).title)}的日子里，顺着往下做。`}</p>${active.paused && !game.pending && game.phase !== 'ended' ? `<button type="button" class="text-button" data-resume-project="${active.id}">接着准备这件事 ›</button>` : ''}</div>` : ''}<div class="project-options">${projects.map(project => project.status === 'available' ? `<article class="project-option"><h3>${e(project.title)}</h3><p>${e(project.description)}</p><small>需要接下来 ${project.duration} 天的${project.focusId === 'walk' ? '散步记录' : '社团时间'}</small><button type="button" class="secondary-button" data-project="${project.id}" ${!project.enabled || invalidSave ? 'disabled' : ''}>试着做这件事 ›</button>${!project.enabled ? `<small>${e(project.reason)}</small>` : ''}</article>` : project.status === 'locked' ? `<p class="project-locked"><strong>${e(project.title)}</strong><br>${e(project.reason)}</p>` : project.status === 'completed' ? `<p class="project-done">已准备过：${e(project.title)}。${game.phase === 'ended' ? '这段经历留在秋天里。' : '带着准备和本领，看看接下来会遇见什么。'}</p>` : '').join('')}</div></section>`;
}
function peoplePanel() {
  return `<section class="people-panel"><h2>渐渐认得的人</h2><div class="people-list">${game.peopleMet.map(id => `<button type="button" data-person="${id}" class="person-button">${avatar(id)}<span>${e(PEOPLE[id].name)}<small>${e(PEOPLE[id].role)}</small></span></button>`).join('')}</div><button type="button" class="text-button growth-link" data-action="growth">看看最近的自己 ›</button></section>`;
}
function storyPanel() {
  if (!game.pending) return '';
  const story = STORIES.find(item => item.id === game.pending.storyId);
  const presentation = getStoryPresentation(story.id, game);
  return `<section class="story-panel" aria-labelledby="story-title"><p class="eyebrow">${e(dateLabel(game.day))} · ${e(story.personId ? PEOPLE[story.personId].name : '校园里')} · 时间暂停中</p><h2 id="story-title" tabindex="-1">${e(presentation.title)}</h2><div class="story-text">${presentation.paragraphs.map(text => `<p>${e(text)}</p>`).join('')}</div><div class="story-choices">${getChoices(game).map((choice,index) => `<button type="button" data-choice="${choice.id}" class="story-choice" ${!choice.enabled ? 'disabled' : ''}><span class="choice-number">${index+1}</span><span><strong>${e(choice.title)}</strong><small>${e(choice.description)}</small>${!choice.enabled ? `<small class="choice-reason">${e(choice.reason)}</small>` : ''}</span><span aria-hidden="true">›</span></button>`).join('')}</div></section>`;
}
function entryHTML(event) {
  const starred = game.favorites.includes(event.id);
  return `<article class="log-entry ${event.kind === 'story' ? 'story-entry' : ''}" data-event="${e(event.id)}"><div class="log-date"><time>${e(dateLabel(event.day))}</time><span>${event.kind === 'story' ? '那天的事' : event.kind === 'meeting' ? '认识了一个人' : event.kind === 'project' ? '慢慢做的一件事' : ''}</span></div><div class="log-copy">${event.title ? `<h3>${e(event.title)}</h3>` : ''}<p>${e(event.text)}</p></div><button type="button" class="star-button" data-star="${e(event.id)}" aria-label="${starred ? '取消收藏' : '收藏'}${e(dateLabel(event.day))}的这条记录" aria-pressed="${starred}" title="${starred ? '取消收藏' : '放进收藏'}">${starred ? '★' : '☆'}</button></article>`;
}
function diary() {
  const entries = (logFilter === 'favorites' ? game.events.filter(event => game.favorites.includes(event.id)) : game.events).slice().reverse();
  return `<section class="diary" aria-label="生活记录"><div class="diary-heading"><h2>日子，就这样过着</h2><div class="diary-tabs"><button type="button" data-filter="all" aria-pressed="${logFilter === 'all'}">日常</button><button type="button" data-filter="favorites" aria-pressed="${logFilter === 'favorites'}">收藏 ${game.favorites.length || ''}</button></div></div><div id="log-scroll" class="log-scroll" tabindex="0" aria-label="生活记录，最新在最上面">${entries.length ? entries.map(entryHTML).join('') : '<p class="empty-note">想留下哪一天，可以点那条记录旁的 ☆。</p>'}</div>${unseen ? `<button type="button" class="new-records" data-action="latest">${unseen} 条新记录 · 回到最近 ↑</button>` : ''}</section>`;
}
function endingPanel() {
  if (game.phase !== 'ended') return '';
  return `<section class="ending-panel"><p class="eyebrow">十一月底</p><h2>转眼，入学已经三个月了。</h2><p>天冷下来，回宿舍的路也熟了。后面的日子还长，这段试玩先停在这里。</p><div class="ending-actions"><button type="button" class="secondary-button" data-action="growth">看看这三个月</button><button type="button" class="text-button" data-action="restart">换一种过法 ↗</button></div></section>`;
}
function render({newStory = false, latest = false} = {}) {
  const oldLog = document.querySelector('#log-scroll');
  const nearTop = !oldLog || oldLog.scrollTop < 35;
  const oldRect = oldLog?.getBoundingClientRect();
  const anchorRow = oldLog && [...oldLog.querySelectorAll('[data-event]')].find(row => row.getBoundingClientRect().bottom > oldRect.top + 5);
  const anchor = anchorRow ? {id:anchorRow.dataset.event, offset:anchorRow.getBoundingClientRect().top - oldRect.top} : null;
  const previousScroll = oldLog?.scrollTop || 0;
  const focused = document.activeElement;
  let focusKey;
  const focusAnchor = focused?.id === 'log-scroll' ? 'log-scroll' : focused?.matches?.('#focus-settings > summary') ? 'focus-summary' : focused?.matches?.('#growth-details > summary') ? 'growth-summary' : null;
  if (main.contains(focused)) for (const key of ['action','focus','choice','speed','filter','star','person','project','resumeProject']) if (focused.dataset?.[key]) {focusKey = [key,focused.dataset[key]]; break;}
  const growthDetails = document.querySelector('#growth-details');
  if (growthDetails) growthOpen = growthDetails.open;
  const details = document.querySelector('#focus-settings');
  if (details) focusOpen = details.open;
  main.innerHTML = `${invalidSave ? '<div class="save-warning">这份记录暂时无法读取，原记录已保留。<button type="button" data-action="restart" class="text-button">重新开始这一段</button></div>' : ''}${calendar()}<div class="campus-layout"><aside class="campus-sidebar">${focusPanel()}${growthPanel()}<div class="quiet-scene" aria-hidden="true">${campusScene(focusItem().location, 'autumn')}</div>${peoplePanel()}</aside><div class="life-column">${!started ? '<p class="opening-note">开学了。课表之外的时间，先按自己喜欢的方式过。</p>' : ''}${storyPanel()}${endingPanel()}${diary()}</div></div>`;
  const log = document.querySelector('#log-scroll');
  if (latest || nearTop) {log.scrollTop = 0; unseen = 0; document.querySelector('.new-records')?.remove();}
  else {
    const row = anchor && [...log.querySelectorAll('[data-event]')].find(item => item.dataset.event === anchor.id);
    if (row) log.scrollTop += row.getBoundingClientRect().top - log.getBoundingClientRect().top - anchor.offset;
    else log.scrollTop = previousScroll;
  }
  if (focusKey) {
    const candidate = [...main.querySelectorAll('button')].find(button => button.dataset[focusKey[0]] === focusKey[1]);
    if (candidate && !candidate.disabled) candidate.focus({preventScroll:true});
  }
  if (focusAnchor === 'log-scroll') log.focus({preventScroll:true});
  if (focusAnchor === 'focus-summary') document.querySelector('#focus-settings > summary')?.focus({preventScroll:true});
  if (focusAnchor === 'growth-summary') document.querySelector('#growth-details > summary')?.focus({preventScroll:true});
  if (newStory) {document.querySelector('#story-title')?.focus({preventScroll:true}); document.querySelector('.story-panel')?.scrollIntoView({block:'start',behavior:'smooth'});}
  document.querySelector('#save-status').textContent = saveError ? '暂未保存' : invalidSave ? '记录异常' : '已存到本机';
}
function update(next, {latest = false} = {}) {
  const oldLength = game.events.length;
  const growthChanged = Object.keys(SKILLS).some(id => next.skills[id] > game.skills[id]);
  const prepared = next.completedProjects.length > game.completedProjects.length;
  const newStory = !game.pending && next.pending;
  const scroll = document.querySelector('#log-scroll');
  const readingEarlier = scroll && scroll.scrollTop >= 35;
  game = next;
  if (readingEarlier) unseen += Math.max(0,game.events.length-oldLength);
  persist(); render({newStory:Boolean(newStory), latest});
  if ((growthChanged || prepared) && !next.pending && next.phase !== 'ended' && !readingEarlier) document.querySelector('.growth-panel')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function advance(count) {
  const next = advanceDays(game,count);
  const newAbility = Object.keys(SKILLS).some(id => next.skills[id] > game.skills[id]);
  const projectDone = next.completedProjects.length > game.completedProjects.length;
  if (next.pending || next.phase === 'ended' || newAbility || projectDone) pause();
  update(next);
  if ((newAbility || projectDone) && !next.pending) toast(newAbility ? '有了新的做法，看看现在能试什么。' : '准备先做到这里，接下来可以继续生活。');
}
function openDetail(title, content) {
  pause(); render();
  document.querySelector('#detail-title').textContent = title;
  document.querySelector('#detail-content').innerHTML = content;
  detailDialog.showModal();
}
function showGrowth() {
  const summary = getSummary(game);
  openDetail('这阵子的你', `<div class="growth-person">${avatar('you')}<span>你 · 大一${game.phase === 'ended' ? '的秋天' : '新生'}</span></div><p>日常里慢慢练过的东西，会变成新的做法。</p><div class="growth-skills">${Object.entries(SKILLS).map(([id,skill]) => `<div><span>${e(skill.name)}</span><strong>${e(skill.stages[game.skills[id]])}</strong></div>`).join('')}</div><h3>课余的时间</h3><div class="habit-summary">${FOCUSES.filter(focus => game.focusDays[focus.id] > 0).map(focus => `<p><span>${e(focus.title)}</span><span>${game.focusDays[focus.id]} 天</span></p>`).join('') || '<p>刚刚开始，还没有固定的安排。</p>'}</div><p class="detail-footnote">${summary.peopleMet.length} 位认得的人 · ${game.favorites.length} 条自己选的收藏</p>`);
}
function showPerson(id) {
  if (!game.peopleMet.includes(id)) return;
  const meeting = game.events.find(event => event.kind === 'meeting' && event.text.includes(PEOPLE[id].name));
  const note = id === 'ahe' ? '从入学起就住在同一间宿舍。饭点偶尔一起走，平时也各忙各的。' : meeting?.text || '这阵子在校园里渐渐熟悉起来。';
  openDetail(PEOPLE[id].name, `<div class="growth-person">${avatar(id)}<span>${e(PEOPLE[id].role)}</span></div><p>${e(note)}</p>`);
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  try {
    if (button.dataset.focus) {update(setFocus(game,button.dataset.focus)); focusOpen = false; document.querySelector('#focus-settings').open = false; return;}
    if (button.dataset.speed) {speed = Number(button.dataset.speed); accumulated = 0; render(); return;}
    if (button.dataset.choice) {pause(); logFilter = 'all'; unseen = 0; update(choose(game,button.dataset.choice,game.revision),{latest:true}); if(!game.pending) document.querySelector('.diary')?.scrollIntoView({block:'start',behavior:'smooth'}); return;}
    if (button.dataset.star) {update(toggleFavorite(game,button.dataset.star)); return;}
    if (button.dataset.person) {showPerson(button.dataset.person); return;}
    if (button.dataset.project) {pause(); started = true; update(startProject(game,button.dataset.project,game.revision)); toast('接下来的日常里，慢慢准备这件事。'); return;}
    if (button.dataset.resumeProject) {const project = PROJECTS.find(item => item.id === button.dataset.resumeProject); update(setFocus(game,project.focusId)); return;}
    if (button.dataset.filter) {logFilter = button.dataset.filter; render({latest:true}); return;}
    switch(button.dataset.action) {
      case 'play': started = true; running = !running; accumulated = 0; lastTick = performance.now(); persist(); render(); break;
      case 'forward': {
        started = true; pause();
        // Preserve the chance to act when a skill or preparation changes.
        const next = advanceToNextMoment(game); logFilter = 'all'; unseen = 0; update(next,{latest:true}); break;
      }
      case 'latest': logFilter = 'all'; unseen = 0; render({latest:true}); break;
      case 'growth': showGrowth(); break;
      case 'restart': pause(); render(); restartDialog.showModal(); break;
      case 'cancel-restart': restartDialog.close(); break;
      case 'confirm-restart': pause(); game = createGame(); started = false; invalidSave = false; focusOpen = false; growthOpen = false; logFilter = 'all'; unseen = 0; restartDialog.close(); persist(); render({latest:true}); break;
      case 'close-detail': detailDialog.close(); break;
    }
  } catch(error) {pause(); render(); toast(error.message || '这一步暂时没有完成，请再试一次。');}
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.code === 'Space' && event.target === document.body) {event.preventDefault(); document.querySelector('[data-action="play"]:not(:disabled)')?.click();}
  if (game.pending && /^[1-3]$/.test(event.key)) {const button = main.querySelectorAll('[data-choice]')[Number(event.key)-1]; if(button && !button.disabled){event.preventDefault();button.click();}}
});
document.addEventListener('visibilitychange', () => {if(document.hidden && running){pause();render();}});
setInterval(() => {
  const now = performance.now(), elapsed = Math.min(500,now-lastTick); lastTick = now;
  if (!running || game.pending || game.phase === 'ended' || document.hidden || document.querySelector('dialog[open]')) return;
  accumulated += elapsed * speed;
  if (accumulated >= DAY_MS) {accumulated -= DAY_MS; try {advance(1);} catch(error){pause();render();toast(error.message);}}
},100);
load(); render({latest:true});
