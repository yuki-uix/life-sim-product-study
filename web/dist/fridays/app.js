import { createGame, choose, getChoices, getOutcome, validateSave } from './engine.js';
import { getScene, getFeedback, getNotes } from './story.js';
import { roomArt, layoutThumb } from './art.js';
import { avatar } from '../campus-art.js';

const SAVE_KEY = 'campus-fridays.save.v1';
const names = { you: '你', xiaoman: '小满', ahe: '阿禾', linye: '林野' };
const game = document.querySelector('#game');
const saveStatus = document.querySelector('#save-status');
let state = createGame();
let lastFeedback = null;
let notesOpen = false;
let busy = false;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function recoverFeedback(current) {
  if (!current.history.length) return null;
  let previous = createGame();
  for (const entry of current.history.slice(0,-1)) previous = choose(previous, entry.choiceId);
  return getFeedback(previous, current.history.at(-1).choiceId, current);
}

try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const recovered = validateSave(JSON.parse(raw));
    if (recovered) { state = recovered; lastFeedback = recoverFeedback(state); }
  }
} catch { saveStatus.textContent = '当前浏览器暂时无法保存，仍可完整试玩'; }

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saveStatus.textContent = '进度已保存在当前浏览器';
  } catch { saveStatus.textContent = '当前浏览器暂时无法保存，仍可完整试玩'; }
}

function phase() {
  if (['arrival','first_door','first_close'].includes(state.stage)) return 0;
  if (state.stage.startsWith('prep')) return 1;
  return 2;
}

function timeline() {
  const labels = ['10.11 初次走进', '一周之间', '10.18 又是周五'];
  return `<ol class="timeline" aria-label="这两个周五的时间线">${labels.map((label,index)=>`<li class="${index===phase()?'current':index<phase()?'passed':''}" ${index===phase()?'aria-current="step"':''}><span aria-hidden="true">${index<phase()?'·':index+1}</span>${label}</li>`).join('')}</ol>`;
}

function people(outcome) {
  const positions = outcome?.room;
  const statusNames = {seated:'坐下看电影',door:'留在门边',talking:'留下来聊天',left:'先回宿舍'};
  return `<div class="cast" aria-label="这一晚的人">${['you','xiaoman','ahe','linye'].map(id=>`<div class="cast-person">${avatar(id)}<span>${names[id]}${positions?.[id]?`<small>${statusNames[positions[id]]}</small>`:''}</span></div>`).join('')}</div>`;
}

function plan() {
  if (!state.plan.film) return '';
  const film = state.plan.film === 'feature' ? '一部完整的长片' : '两部短片，留时间聊天';
  const seats = {rows:'座位朝向银幕',circle:'围坐一圈',arc:'弧形座位 · 侧边留路'}[state.plan.seats];
  return `<dl class="plan"><div><dt>今晚看</dt><dd>${film}</dd></div>${seats?`<div><dt>怎么坐</dt><dd>${seats}</dd></div>`:''}</dl>`;
}

function notes() {
  const items = getNotes(state);
  if (!items.length) return '';
  return `<details class="notebook" ${notesOpen?'open':''}><summary>口袋里的小本子 <span aria-hidden="true">＋</span></summary><div>${items.map(item=>`<section><h3>${esc(item.label)}</h3><p>${esc(item.text)}</p></section>`).join('')}</div></details>`;
}

function reaction() {
  if (!lastFeedback) return '';
  const f = lastFeedback;
  return `<aside class="reaction" aria-label="刚才发生的事"><p class="reaction-label">${esc(f.title || '刚才')}</p><p>${esc(f.text)}</p>${f.quote?`<p class="reaction-quote">${f.person?`${names[f.person]}：`:''}「${esc(f.quote)}」</p>`:''}</aside>`;
}

function ending(outcome) {
  return `<section class="story ending" id="story" aria-labelledby="scene-title">
    ${reaction()}<p class="eyebrow">10 月 18 日 · 周五 20:50</p><h1 id="scene-title" tabindex="-1">${esc(outcome.title)}</h1>
    <div class="prose">${outcome.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
    <details class="then-now"><summary>回头看看，这一周有什么不同 <span aria-hidden="true">＋</span></summary><div><p class="eyebrow">上周，这间教室还很陌生</p><p>${state.first.help==='picture'?'调焦旋钮转了半圈，你才找到清楚的画面。':'你站在门边，名字还要让小满再说一遍。'}</p><p class="eyebrow">这周，你已经会了</p>${outcome.learned.map(p=>`<p>${esc(p)}</p>`).join('')}</div></details>
    <div class="next-time"><p class="eyebrow">收拾椅子时，话还没说完</p>${outcome.next.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
    <p class="slice-end">试玩到这里。校园里，其实也只是过去了一周。</p>
    <button class="ending-replay" type="button" data-replay>换一种过法，再来两个周五 <span aria-hidden="true">↻</span></button>
  </section>`;
}

function render() {
  const done = state.stage === 'ending';
  const outcome = done ? getOutcome(state) : null;
  const scene = done ? null : getScene(state);
  const date = done ? '10 月 18 日' : scene.date;
  const time = done ? '20:50' : scene.time;
  game.innerHTML = `${timeline()}<div class="play-space"><section class="room-column" aria-label="眼前的教室">
    <div class="room-heading"><span>${state.stage.startsWith('prep')?'两段课余':'旧教学楼 · 203'}</span><span>${esc(date)} / ${esc(time)}</span></div>
    <div class="room-frame">${roomArt(state,outcome)}</div>
    ${people(outcome)}${plan()}${notes()}
  </section>${done ? ending(outcome) : `<section class="story" id="story" aria-labelledby="scene-title">
    ${reaction()}<p class="eyebrow">${esc(scene.date)} ${esc(scene.time)} · ${esc(scene.eyebrow || '')}</p>
    <h1 id="scene-title" tabindex="-1">${esc(scene.title)}</h1><div class="prose">${scene.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
    ${scene.quote?`<blockquote class="dialogue">${avatar(scene.speaker || 'xiaoman')}<div><span>${names[scene.speaker || 'xiaoman']}</span><p>「${esc(scene.quote)}」</p></div></blockquote>`:''}
    ${state.stage.startsWith('prep')?`<p class="prep-counter">这周留给自己的课余 · 第 ${state.prep.length+1} 段 / 共 2 段</p>`:''}
    <div class="choices" aria-label="你想怎么做">${getChoices(state).map(id=>{
      const c=scene.choices[id];
      return `<button class="choice ${['rows','circle','arc'].includes(id)?'seat-choice':''}" type="button" data-choice="${id}" data-stage="${state.stage}" ${busy?'disabled':''}>${['rows','circle','arc'].includes(id)?layoutThumb(id):''}<span><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small></span><span class="choice-arrow" aria-hidden="true">→</span></button>`;
    }).join('')}</div>
  </section>`}</div>`;
  game.querySelector('.notebook')?.addEventListener('toggle', e => { notesOpen=e.currentTarget.open; });
}

game.addEventListener('click', e => {
  const button = e.target.closest('[data-choice]');
  if (button && !busy && button.dataset.stage === state.stage) {
    busy = true;
    const previous = state;
    try {
      state=choose(state,button.dataset.choice);
      lastFeedback=getFeedback(previous,button.dataset.choice,state);
      save(); render();
      document.querySelector('#scene-title').focus({preventScroll:true});
      if (matchMedia('(max-width: 760px)').matches) {
        (previous.stage==='seats'?game:document.querySelector('#story')).scrollIntoView({block:'start',behavior:'instant'});
      }
    } finally { setTimeout(()=>{busy=false;game.querySelectorAll('[data-choice]').forEach(button=>{button.disabled=false;});},300); }
  }
  if (e.target.closest('[data-replay]')) document.querySelector('#restart-dialog').showModal();
});

const dialog=document.querySelector('#restart-dialog');
document.querySelector('#restart').addEventListener('click',()=>dialog.showModal());
dialog.addEventListener('click', e=>{
  if(e.target.closest('[data-dialog="cancel"]')) dialog.close();
  if(e.target.closest('[data-dialog="confirm"]')) {
    state=createGame(); lastFeedback=null; notesOpen=false; busy=false;
    save(); render(); dialog.close();
    document.querySelector('#scene-title').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  }
});

render();
