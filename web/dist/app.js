import { createGame, setFocus, advanceDays, getChoices, choose, toggleFavorite, validateSave, getSummary, getGrowth, getProjects, startProject, advanceToNextMoment, migrateLegacySave, setPractice, cancelProject, getRelationships, getSocialOptions, socialize, getInvitation, replyToInvitation } from './calendar-engine.js?v=0.9.0';
import { CONFIG, FOCUSES, PEOPLE, SKILLS, STORIES, PROJECTS, dateInfo, getStoryPresentation } from './calendar-content.js?v=0.9.0';
import { campusScene, avatar } from './campus-art.js';
import { getStoryPresentation as getLegacyStoryPresentation } from './calendar-content-v5.js';
import { getStoryPresentation as getV6StoryPresentation } from './calendar-content-v6.js';
import { getStoryPresentation as getV7StoryPresentation } from './calendar-content-v7.js';
import { getStoryPresentation as getV8StoryPresentation } from './calendar-content-v8.js';
import { CHARACTER_NOTES } from './campus-reactions.js?v=0.9.0';

const STORAGE_KEY = 'campus-slowly.save.v9';
const LEGACY_KEYS = ['campus-slowly.save.v8','campus-slowly.save.v7','campus-slowly.save.v6','campus-slowly.save.v5','campus-slowly.save.v4'];
const main = document.querySelector('#main');
const restartDialog = document.querySelector('#restart-dialog');
const detailDialog = document.querySelector('#detail-dialog');
const DAY_MS = 1600;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const e = escapeHTML;
let game, running = false, speed = 1, started = false, invalidSave = false, saveError = false;
let accumulated = 0, lastTick = performance.now(), focusOpen = false, logFilter = 'all';
let unseen = 0, toastTimer, growthOpen = false, reactionEventId = null, deferredInvitationId = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = raw ? null : LEGACY_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    if (raw || legacy) {
      const saved = JSON.parse(raw || legacy);
      const checked = raw ? validateSave(saved.game) : migrateLegacySave(saved.game);
      if (!checked.valid) { invalidSave = true; game = createGame(); return; }
      game = checked.state; started = Boolean(saved.started);
      deferredInvitationId = typeof saved.deferredInvitationId === 'string' && saved.deferredInvitationId === game.invitation?.id ? saved.deferredInvitationId : null;
      if (legacy) persist();
      return;
    }
  } catch { invalidSave = true; }
  game = createGame();
}
function persist() {
  if (invalidSave) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({game, started, deferredInvitationId})); saveError = false; }
  catch { saveError = true; }
}
function toast(text) {
  const target = document.querySelector('#toast');
  clearTimeout(toastTimer); target.textContent = text; target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 3200);
}
function focusItem() { return FOCUSES.find(item => item.id === game.focus); }
function resetClock() { accumulated = 0; lastTick = performance.now(); }
function pause() { running = false; resetClock(); }
function continueLife(state = game) {
  started = true;
  running = !state.pending && state.phase !== 'ended' && !invalidSave && !document.hidden;
  resetClock();
}
function finishChoice(next, {latest = true} = {}) {
  const oldIds = new Set(game.events.map(event => event.id));
  reactionEventId = next.events.findLast(event => !oldIds.has(event.id) && event.reaction)?.id || null;
  if (detailDialog.open) detailDialog.close();
  continueLife(next);
  update(next, {latest});
  if (reactionEventId) {
    document.querySelector('#reaction-title')?.focus({preventScroll:true});
    document.querySelector('.reaction-panel')?.scrollIntoView({block:'start',behavior:'smooth'});
  }
}
function dateLabel(day) { return dateInfo(day).label; }
function calendar(invitation) {
  const date = dateInfo(game.day);
  const status = game.phase === 'ended' ? '这一段走到了十一月底' : game.pending ? '有件事，需要你决定' : running ? '日子在往前走' : started ? '时间已暂停' : '从开学的九月开始';
  const mailButton = invitation ? `<button type="button" class="text-button invitation-button" data-action="view-invitation">${e(PEOPLE[invitation.personId].name)}来找你了 · 看看 ›</button>` : '';
  return `<section class="calendar" aria-label="校园日历"><div class="calendar-heading"><div><p class="eyebrow">南棠大学 · 大一 · 秋季</p><h1><span>${e(date.monthLabel)}</span> <b>${date.day}</b><small>日</small></h1></div><div class="calendar-status"><span class="clock-dot ${running ? 'running' : ''}" aria-hidden="true"></span>${e(status)}<small>第 ${date.week} 周 / 九月至十一月试玩</small></div></div><div class="month-track" role="progressbar" aria-label="秋季时间进度" aria-valuemin="0" aria-valuemax="90" aria-valuenow="${game.day}" aria-valuetext="${e(date.label)}"><span style="width:${game.day / 90 * 100}%"></span><i></i><i></i></div><div class="month-labels"><span class="${date.month === 9 ? 'current' : ''}">九月 · 刚开学</span><span class="${date.month === 10 ? 'current' : ''}">十月 · 渐渐熟悉</span><span class="${date.month === 11 ? 'current' : ''}">十一月 · 天凉了</span></div><div class="time-controls"><button class="primary-button" type="button" data-action="play" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}>${running ? 'Ⅱ 暂停' : started ? '▷ 继续生活' : '▷ 开始这段生活'}</button><div class="speeds" aria-label="时间速度">${[1,2,4].map(value => `<button type="button" data-speed="${value}" aria-pressed="${speed === value}" ${game.phase === 'ended' ? 'disabled' : ''}>${value}×</button>`).join('')}</div><button class="text-button fast-forward" type="button" data-action="forward" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}>到下一次变化 ››</button>${mailButton}</div></section>`;
}
function focusPanel() {
  const focus = focusItem();
  return `<section class="focus-panel"><details id="focus-settings" ${focusOpen ? 'open' : ''}><summary><span class="eyebrow">最近，课余常做什么</span><strong>${e(focus.title)}</strong><span class="change-label">${game.pending ? '先处理眼前的事' : '调整 ▾'}</span></summary><div class="focus-options" role="group" aria-label="近期生活重心">${FOCUSES.map(item => `<button type="button" data-focus="${item.id}" class="focus-option" aria-pressed="${game.focus === item.id}" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}><span>${e(item.title)}</span><small>${e(item.description)}</small></button>`).join('')}</div></details><p class="focus-note">${e(focus.description)}<br>这个安排会持续，可以随时换。</p></section>`;
}
function growthSignature(state) {
  return JSON.stringify(getGrowth(state).map(item => ({ready:item.level >= 1, abilities:(item.practiceOptions || []).flatMap(style => style.capabilities.filter(capability => capability.unlocked).map(capability => `${style.id}:${capability.min}`))})));
}
function learnedText(item) {
  if (!item.practice) return item.level ? '下次想怎样试，可以自己决定。' : '先去接触，还没有固定的练法。';
  const learned = item.practice.capabilities.filter(capability => capability.unlocked);
  return learned.length ? learned.map(capability => capability.title).join(' · ') : `接下来试着${item.practice.action}。`;
}
function growthPanel() {
  const growth = getGrowth(game), projects = getProjects(game);
  const active = game.project ? projects.find(item => item.id === game.project.id) : null;
  return `<section class="growth-panel" aria-label="角色成长"><details id="growth-details" ${growthOpen ? 'open' : ''}><summary><span class="growth-heading">经历，慢慢变成做法 <small>展开看看 ▾</small></span><div class="growth-overview">${growth.map(item => `<div class="growth-overview-item"><span>${e(item.name)} <b>${e(item.practice?.name || item.stage)}</b></span><small>${e(learnedText(item))}</small></div>`).join('')}</div></summary><div class="capability-list">${growth.map(item => `<div class="capability-track"><h3>${e(item.name)} · ${e(item.stage)}</h3>${item.practice ? `<p class="practice-cause">${e(item.practice.sourceText || '从之前的一次选择开始，最近常这样试。')}${item.practice.sourceEventId ? `<button type="button" class="text-button" data-origin="${e(item.practice.sourceEventId)}">翻回那一天 ›</button>` : ''}</p>` : ''}${(item.practiceOptions || []).filter(style => style.days > 0).map(style => `<div class="practiced-style"><strong>${e(style.name)}${item.practice?.styleId === style.id ? ' · 最近常练' : ' · 也曾试过'}</strong>${style.capabilities.map(capability => `<p class="capability ${capability.unlocked ? 'unlocked' : ''}"><span>${capability.unlocked ? '✓' : '·'}</span><span><strong>${e(capability.title)}</strong><small>${e(capability.description)}</small></span></p>`).join('')}</div>`).join('') || '<p class="practice-cause">本领的方向，要在实际尝试里慢慢长出来。</p>'}${item.level >= 1 && !game.pending && game.phase !== 'ended' ? `<button type="button" class="text-button" data-practice-skill="${item.skillId}">下次想怎么试 ›</button>` : ''}</div>`).join('')}</div></details>${active ? `<div class="project-active"><p class="eyebrow">${active.paused ? '这件准备先留着' : '正在慢慢试'}</p><h3>${e(active.title)}</h3>${active.approach ? `<p class="project-approach">当时选的是：${e(active.approach.title)}</p>` : ''}<progress max="${active.duration}" value="${active.progress}" aria-label="准备进度 ${active.progress}/${active.duration}"></progress><p>${active.paused ? '最近在练别的，这件事的进度仍留着。' : active.progress < 3 ? '刚刚动手，还在找合适的办法。' : active.progress < 6 ? '有些地方渐渐顺手，也还有东西想调整。' : '正在把手边的东西理一理。'}</p>${active.paused && !game.pending && game.phase !== 'ended' ? `<button type="button" class="text-button" data-resume-project="${active.id}">按原来的方法接着准备 ›</button>` : ''}${!game.pending && game.phase !== 'ended' ? '<button type="button" class="text-button cancel-project" data-action="cancel-project">先放下这件准备</button>' : ''}</div>` : ''}<div class="project-options">${projects.map(project => project.status === 'available' ? `<article class="project-option"><h3>${e(project.title)}</h3><p>${e(project.description)}</p><button type="button" class="secondary-button" data-plan-project="${project.id}" ${!project.enabled || invalidSave ? 'disabled' : ''}>想从哪里做起 ›</button>${!project.enabled ? `<small>${e(project.reason)}</small>` : ''}</article>` : project.status === 'locked' ? `<p class="project-locked"><strong>${e(project.title)}</strong><br>${e(project.reason)}</p>` : project.status === 'completed' ? `<p class="project-done">做过：${e(project.title)}${project.approach ? ` · ${e(project.approach.title)}` : ''}。</p>` : '').join('')}</div></section>`;
}
function planProject(id) {
  const project = getProjects(game).find(item => item.id === id);
  if (!project?.enabled) return;
  openDetail(`${project.title}，先从哪里做起？`, `<p>${e(project.description)}</p><div class="planning-options">${project.approaches.map(approach => `<button type="button" class="story-choice" data-project="${project.id}" data-approach="${approach.id}"><span>›</span><span><strong>${e(approach.title)}</strong><small>${e(approach.description)}</small></span></button>`).join('')}</div><p class="detail-footnote">这是接下来想试的做法，以后也可以换。</p>`);
}
function planPractice(skillId) {
  const item = getGrowth(game).find(entry => entry.skillId === skillId);
  if (!item || item.level < 1) return;
  openDetail(item.skillId === 'record' ? '下次散步，想怎样试？' : '下次去社团，想怎样试？', `<p>同样的日常，可以把注意力放在不同的地方。</p><div class="planning-options">${item.practiceOptions.map(style => `<button type="button" class="story-choice" data-practice="${style.id}" data-skill="${item.skillId}" ${item.practice?.styleId === style.id ? 'disabled' : ''}><span>${item.practice?.styleId === style.id ? '✓' : '›'}</span><span><strong>${e(style.action)}</strong><small>${e(style.description)}</small></span></button>`).join('')}</div><p class="detail-footnote">以前练过的仍然保留，新的做法会从接下来的日常开始。</p>`);
}
function showOrigin(eventId) {
  const event = game.events.find(item => item.id === eventId);
  if (!event) return;
  openDetail(event.title || '那天换了一种做法', `<p class="eyebrow">${e(dateLabel(event.day))}</p><p>${e(event.text)}</p>`);
}
function chooseFirstWeek() {
  const options = [
    {id:'club',title:'去活动室看看',description:'看看别人怎样排练和布场，碰到能搭手的就试一试。'},
    {id:'walk',title:'沿湖走走，随手拍几张',description:'先熟悉校园，看看哪些地方会让自己停下来。'},
    {id:'friends',title:'和室友一起吃饭、聊聊',description:'课后多和阿禾待在一起，也可以各自忙自己的事。'},
    {id:'easy',title:'暂时不安排，随心过',description:'照常上课、吃饭，空下来再看想做什么。'},
  ];
  openDetail('开学这周，课余想怎么过？', `<p>先试一种日常，之后随时可以调整。</p><div class="planning-options">${options.map(option => `<button type="button" class="story-choice" data-start-focus="${option.id}"><span>›</span><span><strong>${e(option.title)}</strong><small>${e(option.description)}</small></span></button>`).join('')}</div>`);
}
function syncClockOffset() {
  const height = document.querySelector('.calendar')?.getBoundingClientRect().height;
  if (height) main.style.setProperty('--clock-offset', `${Math.ceil(height) + 16}px`);
}
function viewInvitation() {
  const invitation = getInvitation(game);
  if (!invitation) return;
  deferredInvitationId = null;
  persist(); render();
  openDetail(invitation.title, invitationDetails(invitation));
}
function invitationStatus(offer) {
  const reply = game.events.find(event => event.sourceInvitationId === offer.id);
  if (reply?.kind === 'social') return reply.invitationOutcome === 'met-otherwise' ? '后来另约了一件事' : '后来一起排上了这段课余';
  if (reply?.outcome === 'declined') return '这回先各自忙';
  if (reply?.outcome === 'expired') return '这次没排上，各自照常过日常';
  return game.invitation?.id === offer.id ? '有空可以回这份邀请' : '这次来找过你';
}
function invitationPanel(invitation) {
  if (!invitation) return '';
  const name = PEOPLE[invitation.personId].name;
  const deferred = deferredInvitationId === invitation.id;
  if (deferred) return `<section class="invitation-panel invitation-folded" aria-label="${e(name)}的邀请"><span>${avatar(invitation.personId)}<b>${e(name)}来找你了</b></span><button type="button" class="text-button" data-action="view-invitation">空下来再看看 ›</button></section>`;
  const preview = invitation.text.length > 70 ? `${invitation.text.slice(0,70)}…` : invitation.text;
  return `<section class="invitation-panel" aria-label="${e(name)}的邀请"><p class="eyebrow">${e(dateLabel(invitation.day))} · 对方来找你</p><div class="invitation-person">${avatar(invitation.personId)}<span>${e(name)}</span></div><h2>${e(invitation.title)}</h2><p class="invitation-copy">${e(preview)}</p><div class="invitation-actions"><button type="button" class="secondary-button" data-action="view-invitation">读读这份邀请 ›</button><button type="button" class="text-button" data-defer-invitation="${e(invitation.id)}">晚点再看</button></div></section>`;
}
function invitationDetails(invitation) {
  const name = PEOPLE[invitation.personId].name;
  const source = game.events.slice().reverse().find(event => invitation.sourceEventIds?.includes(event.id));
  const nextDate = !invitation.acceptEnabled && Number.isInteger(invitation.nextAvailableDay) ? `下次可约：${dateLabel(invitation.nextAvailableDay)}。` : '';
  return `<div class="invitation-person">${avatar(invitation.personId)}<span>${e(dateLabel(invitation.day))} · ${e(name)}来找你</span></div><p class="invitation-copy">${e(invitation.text)}</p><p class="invitation-window">这几天有空再回，${e(dateLabel(invitation.expiresDay))}之前都可以商量。</p>${source ? `<button type="button" class="text-button invitation-origin" data-origin="${e(source.id)}">翻回那次相处 ›</button>` : ''}<div class="invitation-actions"><button type="button" class="secondary-button" data-invitation-id="${e(invitation.id)}" data-invitation-reply="accept" data-invitation-revision="${game.revision}" ${!invitation.acceptEnabled || invalidSave ? 'disabled aria-describedby="invitation-reason"' : ''}>用${e(dateLabel(invitation.whenDay))}这段课余一起 ›</button><button type="button" class="text-button" data-invitation-id="${e(invitation.id)}" data-invitation-reply="decline" data-invitation-revision="${game.revision}" ${game.pending || game.phase === 'ended' || invalidSave ? 'disabled' : ''}>这回先各自忙</button><button type="button" class="text-button" data-defer-invitation="${e(invitation.id)}">晚点再看</button></div>${!invitation.acceptEnabled ? `<p class="social-reason" id="invitation-reason">${e(invitation.reason)} ${e(nextDate)}</p>` : '<p class="invitation-cost">一起度过一天课余，原来的日常安排之后照常继续。</p>'}`;
}
function invitationHistory(personId) {
  const offers = game.events.filter(event => event.kind === 'invitation' && event.personId === personId).slice(-3).reverse();
  if (!offers.length) return '';
  return `<section class="person-visits"><h3>对方也来找过你</h3>${offers.map(offer => `<article class="person-visit"><p class="eyebrow">${e(dateLabel(offer.day))} · ${e(invitationStatus(offer))}</p><strong>${e(offer.title)}</strong><p>${e(offer.text)}</p>${game.invitation?.id === offer.id ? '<button type="button" class="text-button" data-action="view-invitation">看看这份邀请 ›</button>' : ''}</article>`).join('')}</section>`;
}
function peoplePanel(invitation) {
  return `<section class="people-panel"><h2>想找谁？</h2><p class="people-hint">点头像，聊聊或约一段课余。</p><div class="people-list">${game.peopleMet.map(id => {
    const options = getSocialOptions(game,id);
    const available = options.some(option => option.enabled);
    const nextDays = options.map(option => option.nextAvailableDay).filter(Number.isInteger);
    const nextDay = nextDays.length ? Math.min(...nextDays) : null;
    const hint = invitation?.personId === id ? '对方来找你了 ›' : game.phase === 'ended' ? '回看相处' : game.pending ? '先处理眼前的事' : available ? '聊聊 / 约一下 ›' : nextDay !== null ? `${dateLabel(nextDay)}可约` : '这阵子先各自忙';
    return `<button type="button" data-person="${id}" class="person-button" aria-label="找${e(PEOPLE[id].name)}聊天或约活动">${avatar(id)}<span>${e(PEOPLE[id].name)}<small>${e(PEOPLE[id].role)}</small><small class="person-invite-hint">${e(hint)}</small></span></button>`;
  }).join('')}</div><button type="button" class="text-button growth-link" data-action="growth">看看最近的自己 ›</button></section>`;
}
function storyPanel() {
  if (!game.pending) return '';
  const story = STORIES.find(item => item.id === game.pending.storyId);
  const presentation = game.pending.legacy ? getLegacyStoryPresentation(story.id, game) : game.pending.legacyVersion === 6 ? getV6StoryPresentation(story.id, game) : game.pending.legacyVersion === 7 ? getV7StoryPresentation(story.id, game) : game.pending.legacyVersion === 8 ? getV8StoryPresentation(story.id, game) : getStoryPresentation(story.id, game);
  return `<section class="story-panel" aria-labelledby="story-title"><p class="eyebrow">${e(dateLabel(game.day))} · ${e(story.personId ? PEOPLE[story.personId].name : '校园里')} · 时间暂停中</p><h2 id="story-title" tabindex="-1">${e(presentation.title)}</h2><div class="story-text">${presentation.paragraphs.map(text => `<p>${e(text)}</p>`).join('')}</div><div class="story-choices">${getChoices(game).map((choice,index) => `<button type="button" data-choice="${choice.id}" class="story-choice" ${!choice.enabled ? 'disabled' : ''}><span class="choice-number">${index+1}</span><span><strong>${e(choice.title)}</strong><small>${e(choice.description)}</small>${choice.practiceHint ? `<small class="practice-hint">${e(choice.practiceHint)}</small>` : ''}${!choice.enabled ? `<small class="choice-reason">${e(choice.reason)}</small>` : ''}</span><span aria-hidden="true">›</span></button>`).join('')}</div></section>`;
}
function reactionPanel() {
  const event = game.events.find(item => item.id === reactionEventId);
  if (!event?.reaction) return '';
  const reaction = event.reaction, person = PEOPLE[reaction.personId];
  const choice = STORIES.find(story => story.id === event.storyId)?.choices.find(item => item.id === event.choiceId);
  const choiceTitle = event.choiceTitle || choice?.title;
  return `<section class="reaction-panel" aria-labelledby="reaction-title"><p class="eyebrow">${e(dateLabel(event.day))} · 那天的回应</p><h2 id="reaction-title" tabindex="-1">${avatar(reaction.personId)}${e(person.name)}</h2>${choiceTitle ? `<p class="reaction-choice">你选择了「${e(choiceTitle)}」。</p>` : ''}<p class="reaction-dialogue">${e(reaction.text)}</p>${reaction.note ? `<p class="reaction-note">${e(reaction.note)}</p>` : ''}<button type="button" class="text-button" data-action="close-reaction">收起这段对话</button></section>`;
}
function reactionHTML(reaction) {
  if (!reaction) return '';
  return `<div class="log-reaction" aria-label="${e(PEOPLE[reaction.personId].name)}的回应"><strong>${e(PEOPLE[reaction.personId].name)}</strong><p>${e(reaction.text)}</p></div>`;
}
function entryType(event) {
  if (event.kind === 'story') return '那天的事';
  if (event.kind === 'social') return event.initiator === 'npc' ? '对方约你一起' : '主动相处';
  return {invitation:'对方来找你',invitation_reply:'邀请的后话',meeting:'认识了一个人',project:'慢慢做的一件事',direction:'换了一种做法'}[event.kind] || '';
}
function entryHTML(event) {
  const starred = game.favorites.includes(event.id);
  return `<article class="log-entry ${event.kind === 'story' || event.kind === 'social' ? 'story-entry' : ''}" data-event="${e(event.id)}"><div class="log-date"><time>${e(dateLabel(event.day))}</time><span>${e(entryType(event))}</span></div><div class="log-copy">${event.title ? `<h3>${e(event.title)}</h3>` : ''}<p>${e(event.text)}</p>${reactionHTML(event.reaction)}${event.kind === 'invitation' ? `<p class="invitation-log-status">${e(invitationStatus(event))}</p>` : ''}</div><button type="button" class="star-button" data-star="${e(event.id)}" aria-label="${starred ? '取消收藏' : '收藏'}${e(dateLabel(event.day))}的这条记录" aria-pressed="${starred}" title="${starred ? '取消收藏' : '放进收藏'}">${starred ? '★' : '☆'}</button></article>`;
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
  const invitation = getInvitation(game);
  const oldLog = document.querySelector('#log-scroll');
  const nearTop = !oldLog || oldLog.scrollTop < 35;
  const oldRect = oldLog?.getBoundingClientRect();
  const anchorRow = oldLog && [...oldLog.querySelectorAll('[data-event]')].find(row => row.getBoundingClientRect().bottom > oldRect.top + 5);
  const anchor = anchorRow ? {id:anchorRow.dataset.event, offset:anchorRow.getBoundingClientRect().top - oldRect.top} : null;
  const previousScroll = oldLog?.scrollTop || 0;
  const focused = document.activeElement;
  let focusKey;
  const focusAnchor = focused?.id === 'log-scroll' ? 'log-scroll' : focused?.matches?.('#focus-settings > summary') ? 'focus-summary' : focused?.matches?.('#growth-details > summary') ? 'growth-summary' : null;
  if (main.contains(focused)) for (const key of ['invitationReply','deferInvitation','action','focus','choice','speed','filter','star','person','project','resumeProject','planProject','practiceSkill','origin']) if (focused.dataset?.[key]) {focusKey = [key,focused.dataset[key]]; break;}
  const growthDetails = document.querySelector('#growth-details');
  if (growthDetails) growthOpen = growthDetails.open;
  const details = document.querySelector('#focus-settings');
  if (details) focusOpen = details.open;
  main.innerHTML = `${invalidSave ? '<div class="save-warning">这份记录暂时无法读取，原记录已保留。<button type="button" data-action="restart" class="text-button">重新开始这一段</button></div>' : ''}${calendar(invitation)}<div class="campus-layout"><aside class="campus-sidebar">${focusPanel()}${growthPanel()}<div class="quiet-scene" aria-hidden="true">${campusScene(focusItem().location, 'autumn')}</div>${peoplePanel(invitation)}</aside><div class="life-column">${!started ? '<p class="opening-note">开学了。课表之外的时间，先按自己喜欢的方式过。</p>' : ''}${invitationPanel(invitation)}${reactionPanel()}${storyPanel()}${endingPanel()}${diary()}</div></div>`;
  syncClockOffset();
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
  const newStory = !game.pending && next.pending;
  const newInvitation = next.invitation && next.invitation.id !== game.invitation?.id ? next.invitation : null;
  const scroll = document.querySelector('#log-scroll');
  const readingEarlier = scroll && scroll.scrollTop >= 35;
  game = next;
  if (readingEarlier) unseen += Math.max(0,game.events.length-oldLength);
  persist(); render({newStory:Boolean(newStory), latest});
  if (newInvitation && !readingEarlier) toast(`${PEOPLE[newInvitation.personId].name}来找你了，邀请在日历旁，有空可以看看。`);
}
function advance(count) {
  const next = advanceDays(game,count);
  const newAbility = growthSignature(next) !== growthSignature(game);
  const projectDone = next.completedProjects.length > game.completedProjects.length;
  const newInvitation = next.invitation && next.invitation.id !== game.invitation?.id;
  if (next.pending || next.phase === 'ended') pause();
  update(next);
  if ((newAbility || projectDone) && !next.pending && !newInvitation) toast(projectDone ? '手边的准备做完了，记在了今天。' : '有了新的做法，有空可以看看最近的自己。');
}
function openDetail(title, content) {
  // The open dialog freezes the timer without changing the player's run/pause intent.
  resetClock();
  document.querySelector('#detail-title').textContent = title;
  document.querySelector('#detail-content').innerHTML = content;
  detailDialog.showModal();
}
function showGrowth() {
  const growth = getGrowth(game);
  openDetail('这阵子的你', `<div class="growth-person">${avatar('you')}<span>你 · 大一${game.phase === 'ended' ? '的秋天' : '新生'}</span></div>${growth.map(item => `<section class="growth-detail-track"><h3>${e(item.name)} · ${e(item.practice?.name || item.stage)}</h3><p>${e(learnedText(item))}</p>${item.practice?.sourceText ? `<p class="practice-cause">${e(item.practice.sourceText)}</p>` : ''}${item.practiceOptions.filter(style => style.days > 0).map(style => `<h4>${e(style.name)}</h4>${style.capabilities.filter(capability => capability.unlocked).map(capability => `<p class="detail-ability">✓ ${e(capability.title)}<small>${e(capability.description)}</small></p>`).join('') || '<p>还在实际尝试中。</p>'}`).join('')}</section>`).join('')}<p class="detail-footnote">这些做法来自真正经历过的日常，已经练过的不会因为换个方向就消失。</p>`);
}
function showPerson(id) {
  if (!game.peopleMet.includes(id)) return;
  const meeting = game.events.find(event => event.kind === 'meeting' && event.text.includes(PEOPLE[id].name));
  const note = id === 'ahe' ? '从入学起就住在同一间宿舍。饭点偶尔一起走，平时也各忙各的。' : meeting?.text || '这阵子在校园里渐渐熟悉起来。';
  const relationship = getRelationships(game).find(person => person.id === id);
  const options = getSocialOptions(game,id);
  const whenDay = options[0]?.whenDay;
  const available = options.some(option => option.enabled) && !invalidSave;
  const nextDays = options.map(option => option.nextAvailableDay).filter(Number.isInteger);
  const nextDay = nextDays.length ? Math.min(...nextDays) : null;
  const arrangement = invalidSave ? '先处理这份记录的问题，再安排下一段课余。'
    : game.pending ? '眼前还有一件事等你回应，处理后再来安排相处。'
    : !available && game.phase !== 'ended' && whenDay < CONFIG.totalDays
      ? `${dateLabel(whenDay)}，${options[0]?.reason || '对方这段课余暂时没有空。'}${nextDay !== null ? ` 下次可约：${dateLabel(nextDay)}。` : ''}`
    : Number.isInteger(whenDay) && whenDay < CONFIG.totalDays
    ? `下一段课余是${dateLabel(whenDay)}。会度过一天，这天留给你们相处；平时的「${focusItem().title}」之后照常继续。`
    : '这个秋天的试玩已经走到最后一天，之前的相处仍留在这里。';
  const stage = {acquainted:'还在慢慢熟悉',visiting:'有了课表外的往来',continuing:'能接上上次的话',familiar:'渐渐熟悉彼此的日常'}[relationship?.stage];
  const interactions = game.events.filter(event => event.reaction?.personId === id).slice(-3).reverse();
  openDetail(PEOPLE[id].name, `<div class="growth-person">${avatar(id)}<span>${e(PEOPLE[id].role)}${stage ? `<small class="person-stage">${e(stage)}</small>` : ''}</span></div><section class="social-plans" aria-label="主动找${e(PEOPLE[id].name)}相处"><h3>聊聊，或者约点什么</h3><p class="social-time ${!available ? 'social-unavailable' : ''}">${e(arrangement)}</p><div class="social-options">${options.map(option => {
    const reasonId = `social-${id}-${option.actionId}-reason`;
    const nextDate = !option.enabled && Number.isInteger(option.nextAvailableDay) ? `下次可约：${dateLabel(option.nextAvailableDay)}。` : '';
    return `<div class="social-option"><button type="button" class="social-choice" data-social-person="${id}" data-social-action="${e(option.actionId)}" data-social-revision="${game.revision}" ${!option.enabled || invalidSave ? `disabled aria-describedby="${reasonId}"` : ''}><strong>${e(option.title)}</strong><small>${e(option.description)}</small><span>${option.enabled && !invalidSave ? '用这段课余，找对方一起 ›' : '这次先不安排'}</span></button>${!option.enabled || invalidSave ? `<p id="${reasonId}" class="social-reason">${e(invalidSave ? '先处理这份记录的问题。' : option.reason)}${nextDate ? ` ${e(nextDate)}` : ''}</p>` : ''}</div>`;
  }).join('')}</div></section>${relationship ? `<p class="person-note">${e(relationship.summary)}</p>` : ''}${invitationHistory(id)}<details class="person-about"><summary>关于${e(PEOPLE[id].name)}</summary><p>${e(note)}</p><p>${e(CHARACTER_NOTES[id] || '')}</p></details>${interactions.length ? `<h3>最近的相处</h3>${interactions.map(event => `<article class="person-memory"><p class="eyebrow">${e(dateLabel(event.day))} · ${e(event.title)}</p><p class="person-memory-action">${e(event.text)}</p>${reactionHTML(event.reaction)}</article>`).join('')}` : '<p class="detail-footnote">以后一起聊过、做过的事，会留在这里。</p>'}`);
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  try {
    if (button.dataset.startFocus) {finishChoice(setFocus(game,button.dataset.startFocus)); return;}
    if (button.dataset.focus) {update(setFocus(game,button.dataset.focus)); focusOpen = false; document.querySelector('#focus-settings').open = false; return;}
    if (button.dataset.speed) {speed = Number(button.dataset.speed); accumulated = 0; render(); return;}
    if (button.dataset.choice) {logFilter = 'all'; unseen = 0; finishChoice(choose(game,button.dataset.choice,game.revision)); if(!game.pending && !reactionEventId) document.querySelector('.diary')?.scrollIntoView({block:'start',behavior:'smooth'}); return;}
    if (button.dataset.star) {update(toggleFavorite(game,button.dataset.star)); return;}
    if (button.dataset.invitationReply && button.dataset.invitationId) {logFilter = 'all'; unseen = 0; const next = replyToInvitation(game,button.dataset.invitationId,button.dataset.invitationReply,Number(button.dataset.invitationRevision)); deferredInvitationId = null; finishChoice(next); return;}
    if (button.dataset.deferInvitation && button.dataset.deferInvitation === game.invitation?.id) {deferredInvitationId = button.dataset.deferInvitation; if (detailDialog.open) detailDialog.close(); persist(); render(); return;}
    if (button.dataset.socialAction && button.dataset.socialPerson) {logFilter = 'all'; unseen = 0; finishChoice(socialize(game,button.dataset.socialPerson,button.dataset.socialAction,Number(button.dataset.socialRevision))); return;}
    if (button.dataset.person) {showPerson(button.dataset.person); return;}
    if (button.dataset.planProject) {planProject(button.dataset.planProject); return;}
    if (button.dataset.project && button.dataset.approach) {finishChoice(startProject(game,button.dataset.project,button.dataset.approach,game.revision)); return;}
    if (button.dataset.practiceSkill) {planPractice(button.dataset.practiceSkill); return;}
    if (button.dataset.practice && button.dataset.skill) {finishChoice(setPractice(game,button.dataset.skill,button.dataset.practice,game.revision)); return;}
    if (button.dataset.origin) {showOrigin(button.dataset.origin); return;}
    if (button.dataset.resumeProject) {const project = getProjects(game).find(item => item.id === button.dataset.resumeProject); let next = setFocus(game,project.focusId); if(project.approachId) next = setPractice(next,project.requiresSkill.id,project.approachId,next.revision); finishChoice(next); return;}
    if (button.dataset.filter) {logFilter = button.dataset.filter; render({latest:true}); return;}
    switch(button.dataset.action) {
      case 'play': if(!started && game.focus === 'easy'){chooseFirstWeek();break;} if(running) pause(); else continueLife(); persist(); render(); break;
      case 'forward': {
        started = true; pause();
        // Preserve the chance to act when a skill or preparation changes.
        const next = advanceToNextMoment(game); logFilter = 'all'; unseen = 0; update(next,{latest:true}); break;
      }
      case 'view-invitation': viewInvitation(); break;
      case 'latest': logFilter = 'all'; unseen = 0; render({latest:true}); break;
      case 'close-reaction': reactionEventId = null; render(); document.querySelector('.diary')?.scrollIntoView({block:'start',behavior:'smooth'}); break;
      case 'growth': showGrowth(); break;
      case 'cancel-project': openDetail('先放下这次准备？','<p>已经练过的本领仍然保留。以后想重新做这件事，要从头准备。</p><button type="button" class="secondary-button" data-action="confirm-cancel-project">先放下，试试别的</button>'); break;
      case 'confirm-cancel-project': {finishChoice(cancelProject(game,game.revision)); break;}
      case 'restart': resetClock(); restartDialog.showModal(); break;
      case 'cancel-restart': restartDialog.close(); break;
      case 'confirm-restart': pause(); game = createGame(); started = false; invalidSave = false; focusOpen = false; growthOpen = false; reactionEventId = null; deferredInvitationId = null; logFilter = 'all'; unseen = 0; restartDialog.close(); persist(); render({latest:true}); break;
      case 'close-detail': detailDialog.close(); break;
    }
  } catch(error) {pause(); render(); toast(error.message || '这一步暂时没有完成，请再试一次。');}
});
// Closing either dialog (including Escape) gives the player a fresh day interval.
for (const dialog of [detailDialog, restartDialog]) dialog.addEventListener('close', resetClock);
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
window.addEventListener('resize', syncClockOffset);
load(); render({latest:true});
