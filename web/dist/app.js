import { createGame, applyChoice, getChoices, validateSave } from './engine.js?v=0.3.0';
import { CONFIG, PEOPLE, SKILLS, MEMORIES, getScene, getEnding, getPersonNote } from './content.js';
import { campusScene, avatar, memoryArt } from './campus-art.js';

const STORAGE_KEY = 'campus-slowly.save.v3';
const main = document.querySelector('#main');
const restartDialog = document.querySelector('#restart-dialog');
const memoryDialog = document.querySelector('#memory-dialog');
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let game;
let feedback = false;
let view = 'game';
let invalidSave = false;
let saveError = false;
let choiceLocked = false;
let toastTimer;

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ game, feedback })); saveError = false; }
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
        feedback = Boolean(saved.feedback && resolved().length);
        return;
      }
      invalidSave = true;
    }
  } catch { invalidSave = true; }
  game = createGame();
  if (invalidSave) view = 'menu';
  else persist();
}
function resolved() { return game.events.filter(event => event.type === 'choice.resolved'); }
function lastChoice() { return resolved().at(-1); }
function semesterName(semester) { return `${['大一', '大二', '大三', '大四', '大五'][Math.ceil(semester / 2) - 1] || `${Math.ceil(semester / 2)}年级`} · ${semester % 2 ? '秋' : '春'}`; }
function season(semester) { return semester % 2 ? 'autumn' : 'spring'; }
function paragraphs(scene) {
  return `<div class="scene-paragraphs">${(scene.paragraphs || []).map(p => `<p>${e(p)}</p>`).join('')}</div>${scene.dialogue ? `<div class="dialogue"><span class="speaker">${e(scene.speaker)}</span><p>${e(scene.dialogue)}</p></div>` : ''}`;
}
function toast(message) {
  const target = document.querySelector('#toast');
  clearTimeout(toastTimer); target.textContent = message; target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 3500);
}
function skillStage(id, value) { return SKILLS[id].stages[value] || SKILLS[id].stages.at(-1); }
function skills() {
  return `<div class="student-skills">${Object.keys(SKILLS).map(id => `<div class="skill-row"><div class="skill-label"><strong>${e(SKILLS[id].name)}</strong><span class="skill-stage">${e(skillStage(id, game.skills[id]))}</span></div><div class="skill-dots" aria-label="${e(SKILLS[id].name)} ${game.skills[id]}/${CONFIG.maxSkill}">${Array.from({ length: CONFIG.maxSkill }, (_, i) => `<i class="${i < game.skills[id] ? 'filled' : ''}"></i>`).join('')}</div></div>`).join('')}</div>`;
}
function student() {
  return `<section class="student-card"><div class="student-heading">${avatar('you')}<div><strong class="student-name">你</strong><span class="student-meta">南棠大学 · 大一新生</span></div></div>${skills()}<p class="student-footnote">慢慢学会一些事，也可以中途换个兴趣。</p></section>`;
}
function mobileStatus() {
  return `<div class="mobile-status" aria-label="本领">${Object.keys(SKILLS).map(id => `<span>${e(SKILLS[id].name)}<b>${e(skillStage(id, game.skills[id]))}</b></span>`).join('')}</div>`;
}
function friends() {
  return `<section class="campus-friends"><h2 class="panel-title">校园里，认得的人</h2>${game.peopleMet.map(id => `<button type="button" class="friend-row" data-person="${e(id)}">${avatar(id)}<span><strong class="friend-name">${e(PEOPLE[id].name)} <small>${e(PEOPLE[id].role)}</small></strong><span class="friend-note">${e(getPersonNote(game, id))}</span></span><span class="friend-arrow" aria-hidden="true">›</span></button>`).join('')}</section>`;
}
function memoryFor(record) { return MEMORIES[record.id] || { title: '这一刻', caption: '', art: 'leaf' }; }
function memoryEvent(record) { return game.events.find(event => event.id === record.sourceEventId); }
function shelf() {
  return `<section class="memory-shelf"><h2 class="panel-title">留下的小东西 <span>${game.memories.length}</span></h2>${game.memories.length ? `<div class="memory-mini-list">${game.memories.map(record => { const memory = memoryFor(record); return `<button type="button" class="memory-mini" data-memory="${e(record.id)}">${memoryArt(memory.art)}<span>${e(memory.title)}</span><small>${e(semesterName(record.semester))}</small></button>`; }).join('')}</div>` : '<p class="memory-empty">照片、票根、一张小纸条。<br>以后翻到它们，还能记起这一刻。</p>'}</section>`;
}
function sidebar() { return `<aside class="campus-sidebar">${student()}${friends()}${game.phase === 'ended' && !feedback ? '' : shelf()}</aside>`; }
function strip(semester, text) { return `<div class="semester-strip"><strong>${e(semesterName(semester))}</strong><span>${e(text)}</span><small>大一体验版</small></div>`; }
function storyCard(scene, semester, receipt = false) {
  return `<section class="${receipt ? 'receipt-card' : 'scene-card'}"><div class="scene-art">${campusScene(scene.location || 'gate', season(semester))}</div><div class="scene-kicker">${receipt ? '这一次，留下了什么' : game.phase === 'campus' ? '校园里有件事正在发生' : game.slot === 1 ? '新学期，慢慢开始' : '这个学期，还想做些什么'}</div><h1 class="${receipt ? 'receipt-title' : 'scene-title'}">${e(scene.title)}</h1>${paragraphs(scene)}`;
}
function choiceCards() {
  const done = new Set(resolved().filter(event => event.facts.semester === game.semester).map(event => event.facts.choiceId));
  const choices = getChoices(game).filter(choice => !done.has(choice.id) && (game.phase === 'campus' || choice.enabled));
  // New invitations appear beside everyday possibilities; they never replace every baseline option.
  choices.sort((a, b) => Number(Boolean(b.requiresSkill || b.requiresMemory || b.requiresPerson)) - Number(Boolean(a.requiresSkill || a.requiresMemory || a.requiresPerson)));
  return `<div class="choice-heading"><span>${game.phase === 'campus' ? '想怎样参与？' : '把这段空闲留给……'}</span><small>${game.phase === 'activity' ? '这学期的一个小片段' : '选一种自己的方式'}</small></div><div class="choices" role="group" aria-label="${game.phase === 'activity' ? '安排这段校园时光' : '选择参与方式'}">${choices.map((choice, index) => {
    const invitation = game.phase === 'activity' && Boolean(choice.requiresSkill || choice.requiresMemory || choice.requiresPerson);
    return `<button type="button" class="activity-card ${invitation ? 'is-invitation' : ''}" data-choice="${e(choice.id)}" ${choice.enabled ? '' : 'disabled'}><span class="choice-number">${index + 1}</span><span class="choice-content"><strong>${e(choice.title)}</strong>${invitation ? '<span class="choice-tag">一份新邀请</span>' : ''}<span class="choice-description">${e(choice.description)}</span>${!choice.enabled ? `<span class="choice-reason">${e(choice.reason)}</span>` : ''}</span><span class="choice-arrow" aria-hidden="true">${choice.enabled ? '▶' : '·'}</span></button>`;
  }).join('')}</div><p class="choice-hint">${game.phase === 'activity' ? '没选的事情，校园里也有人在做。以后还有新的相遇。' : '参与、帮忙，或和朋友一起当观众，都能留下自己的回忆。'}<span class="keyboard-hint"> 数字键也能选择。</span></p>`;
}
function playing() {
  const scene = getScene(game);
  return `${strip(game.semester, game.phase === 'activity' ? `还有 ${CONFIG.activitySlots - game.slot + 1} 段空闲` : '一场共同的校园活动')}${mobileStatus()}<div class="campus-layout"><div class="campus-main">${storyCard(scene, game.semester)}</section>${choiceCards()}</div>${sidebar()}</div>`;
}
function nextLabel() {
  if (game.phase === 'ended') return '翻开大一的纪念册';
  if (game.semester > lastChoice().facts.semester) return '春天来了，回学校看看';
  if (game.phase === 'campus') return '去看看校园里发生了什么';
  return '接着过这个学期';
}
function receipt() {
  const event = lastChoice();
  const facts = event.facts;
  const story = event.narrative;
  const record = game.memories.find(item => item.sourceEventId === event.id);
  const memory = record ? memoryFor(record) : null;
  const growth = Object.keys(SKILLS).filter(id => facts.skillsAfter[id] > facts.skillsBefore[id]);
  return `${strip(facts.semester, '刚刚过完的这一小段')}${mobileStatus()}<div class="campus-layout"><div class="campus-main">${storyCard(story, facts.semester, true)}${memory ? `<button type="button" class="receipt-memory" data-memory="${e(record.id)}">${memoryArt(memory.art)}<span><small>收进回忆里</small><strong>${e(memory.title)}</strong><span>${e(story.memoryCaption || memory.caption)}</span></span><b aria-hidden="true">↗</b></button>` : ''}${growth.length ? `<div class="receipt-growth">${growth.map(id => `<span>${e(SKILLS[id].name)}：${e(skillStage(id, facts.skillsBefore[id]))} → <strong>${e(skillStage(id, facts.skillsAfter[id]))}</strong></span>`).join('')}</div>` : ''}<button type="button" class="primary-button receipt-next" data-action="next">${e(nextLabel())} <span aria-hidden="true">→</span></button></section></div>${sidebar()}</div>`;
}
function yearTrack() {
  return `<div class="year-track" aria-label="四年校园生活，目前开放大一体验">${Array.from({ length: CONFIG.programYears }, (_, index) => `<span class="${index === 0 ? 'is-current' : ''}"><b>${['大一','大二','大三','大四','大五'][index] || `${index + 1}年级`}</b><small>${index === 0 ? '这一年，已经留下回忆' : '以后'}</small></span>`).join('')}</div>`;
}
function ending() {
  const scene = getEnding(game);
  return `<section class="ending-card"><p class="scene-kicker">大一 · 秋与春的纪念册</p><h1>${e(scene.title)}</h1>${paragraphs(scene)}${yearTrack()}<p class="ending-note">这次体验走到大一结束。四年的后续故事，留给以后的学期。</p></section><div class="campus-layout"><div class="campus-main"><div class="memory-grid">${game.memories.map(record => { const memory = memoryFor(record); const event = memoryEvent(record); return `<button type="button" class="memory-card" data-memory="${e(record.id)}"><span class="memory-picture">${memoryArt(memory.art)}</span><span class="memory-date">${e(semesterName(record.semester))}</span><strong class="memory-title">${e(memory.title)}</strong><span class="memory-caption">${e(event?.narrative.memoryCaption || memory.caption)}</span></button>`; }).join('')}</div><div class="ending-actions"><button type="button" class="primary-button" data-action="restart">换一种过法，再过大一</button><button type="button" class="text-button" data-action="journal">看看这一路怎么走过来</button></div></div>${sidebar()}</div>`;
}
function menu() {
  return `<section class="menu-card"><div class="scene-art">${campusScene('gate','autumn')}</div><p class="scene-kicker">南棠大学 · 一段虚构的校园生活</p><h1>大学慢慢来</h1><p>学点感兴趣的东西，认识几个人，<br>把陌生校园过成熟悉的地方。</p><p class="menu-note">这次可以体验大一两个学期。每个学期有两段自由安排和一场校园活动，之后翻开这一年的纪念册。</p>${invalidSave ? '<p class="save-notice">上次记录暂时无法读取。它仍留在本机；重新开始会替换这份大一记录。</p>' : ''}<div class="menu-actions">${!invalidSave ? '<button type="button" class="primary-button" data-action="resume">接着刚才的校园时光</button>' : ''}<button type="button" class="secondary-button" data-action="restart">从新生的第一个周末开始</button></div></section>`;
}
function render(focus = true) {
  main.innerHTML = view === 'menu' ? menu() : feedback ? receipt() : game.phase === 'ended' ? ending() : playing();
  document.querySelector('#save-status').textContent = saveError ? '这次未能保存' : '记在本机了';
  document.querySelector('#restart-button').hidden = view === 'menu';
  if (focus) { main.focus({ preventScroll:true }); window.scrollTo({ top:0, behavior:'instant' }); }
}
function takeChoice(id) {
  if (choiceLocked || view !== 'game' || feedback || game.phase === 'ended') return;
  const choice = getChoices(game).find(item => item.id === id);
  if (!choice?.enabled) { toast(choice?.reason || '这件事现在还不能选。'); return; }
  choiceLocked = true;
  try { game = applyChoice(game,id,game.turn); feedback = true; persist(); render(); }
  catch (error) { toast(error.message); }
  finally { choiceLocked = false; }
}
function openDetail(title,html) {
  document.querySelector('#memory-title').textContent = title;
  document.querySelector('#memory-content').innerHTML = html;
  memoryDialog.showModal();
}
function showMemory(id) {
  const record = game.memories.find(item => item.id === id);
  if (!record) return;
  const memory = memoryFor(record), event = memoryEvent(record);
  const people = (event.facts.with || []).filter(person => PEOPLE[person]).map(person => PEOPLE[person].name);
  openDetail(memory.title, `<div class="memory-detail-art">${memoryArt(memory.art)}</div><p class="memory-date">${e(semesterName(record.semester))} · ${e(memory.place)}${people.length ? ` · 和${e(people.join('、'))}` : ''}</p><div class="memory-detail-copy">${paragraphs(event.narrative)}</div>`);
}
function showPerson(id) {
  if (!game.peopleMet.includes(id) || !PEOPLE[id]) return;
  const moments = resolved().filter(event => event.facts.with?.includes(id));
  openDetail(`你和${PEOPLE[id].name}`, `<div class="person-detail-heading">${avatar(id)}<p>${e(getPersonNote(game,id))}</p></div>${moments.length ? moments.map(event => `<article class="journal-entry"><span class="memory-date">${e(semesterName(event.facts.semester))}</span><h3>${e(event.narrative.title)}</h3>${paragraphs(event.narrative)}</article>`).join('') : '<p>刚刚认识，还没有多少共同经历。以后会慢慢有的。</p>'}`);
}
function showJournal() {
  openDetail('这一年，是这样走过来的', resolved().map(event => `<article class="journal-entry"><span class="memory-date">${e(semesterName(event.facts.semester))}</span><h3>${e(event.narrative.title)}</h3>${paragraphs(event.narrative)}</article>`).join(''));
}
document.addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.choice) { takeChoice(button.dataset.choice); return; }
  if (button.dataset.memory) { showMemory(button.dataset.memory); return; }
  if (button.dataset.person) { showPerson(button.dataset.person); return; }
  switch (button.dataset.action) {
    case 'menu': view = 'menu'; render(); break;
    case 'resume': view = 'game'; render(); break;
    case 'restart': restartDialog.showModal(); break;
    case 'cancel-restart': restartDialog.close(); break;
    case 'confirm-restart': game = createGame(); feedback = false; view = 'game'; invalidSave = false; restartDialog.close(); persist(); render(); break;
    case 'next': feedback = false; persist(); render(); break;
    case 'close-memory': memoryDialog.close(); break;
    case 'journal': showJournal(); break;
  }
});
document.addEventListener('keydown',event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || view !== 'game' || feedback || game.phase === 'ended' || !/^[1-6]$/.test(event.key)) return;
  const button = main.querySelectorAll('[data-choice]')[Number(event.key)-1];
  if (button && !button.disabled) { event.preventDefault(); takeChoice(button.dataset.choice); }
});
load(); render(false);
