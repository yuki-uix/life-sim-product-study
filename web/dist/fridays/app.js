import { createGame, choose, getChoices, getForecast, getOutcome, validateSave } from './engine.js?v=2';
import { getDay, getAction, getLogText, getEnding } from './story.js?v=2';
import { avatar, campusScene, memoryArt } from '../campus-art.js';

const SAVE_KEY = 'campus-fridays.save.v2';
const game = document.querySelector('#game');
const saveStatus = document.querySelector('#save-status');
const names = { you:'你', xiaoman:'小满', ahe:'阿禾', linye:'林野' };
const routes = {
  curator:{name:'自己策划一场',text:'决定主题和片单，再亲自选什么时候开场。'},
  open_room:{name:'把教室开放起来',text:'你负责现场，小满选片。决定接待更多人，还是坐下来陪朋友。'},
  cohost:{name:'和小满分工合办',text:'各做一半，试着把一场小放映合作完成。'},
  private:{name:'赴阿禾的私人邀约',text:'离开公共放映室，到宿舍陪她看一场电影。'},
  audience:{name:'今晚当个观众',text:'不用负责放映。挑个位子，决定怎么过这晚。'},
};
const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=createGame();
let busy=false;
let previousNotice='';
try {
  const raw=localStorage.getItem(SAVE_KEY);
  if(raw) { const restored=validateSave(JSON.parse(raw)); if(restored) state=restored; }
} catch { saveStatus.textContent='此浏览器暂时无法保存，仍可试玩'; }

function calendar() {
  return `<ol class="calendar" aria-label="连续八天的日历">${['五','六','日','一','二','三','四','五'].map((d,i)=>`<li class="${state.day===i?'today':i<state.day?'past':''}" ${state.day===i?'aria-current="date"':''}><span>周${d}</span><b>${i+11}</b><small>${i===state.day?'今天':i===7?'放映夜':i<state.day?'已过':'十月'}</small></li>`).join('')}</ol>`;
}

function growth(prefix='') {
  return `<section class="growth" aria-labelledby="${prefix}growth-title"><h2 id="${prefix}growth-title">慢慢学会的事</h2>${[['content','选片'],['hands','动手']].map(([id,label])=>{
    const value=state.skills[id];
    const next=id==='content'?(value<2?'到 2，可以亲手试排片单':'到 4，并试排过片单，可以独立策划'):(value<2?'到 2，可以借钥匙独自试放':'到 4，并独自试放过，可以负责开放教室');
    return `<div class="skill"><div><b>${label}</b><span>${value} / 4</span></div><progress max="4" value="${value}" aria-label="${label}熟悉程度，${value}/4"></progress><p>${next}</p></div>`;
  }).join('')}</section>`;
}

function forecasts(prefix='') {
  return `<section class="forecast" aria-labelledby="${prefix}forecast-title"><div class="section-label"><h2 id="${prefix}forecast-title">${state.day===7?'今晚，你可以试试':'下个周五，你可以试试'}</h2><span>${state.day<7?`还有 ${7-state.day} 天`:'就是今晚'}</span></div><p class="help">条件会提前写在这里。每天留给自己的课余，放进不同的事，就会走向不同的安排。</p>${getForecast(state).filter(f=>f.id!=='private'||state.visits.ahe>0).map(f=>`<div class="forecast-item ${f.available?'available':''}"><h3>${esc(routes[f.id].name)}<span>${f.available?'现在能做':''}</span></h3><p>${esc(routes[f.id].text)}</p><ul>${f.requirements.map(r=>`<li class="${r.met?'met':''}"><span aria-hidden="true">${r.met?'✓':'·'}</span> ${esc(r.label)} <small>${typeof r.current==='number'&&r.target>1?`${r.current} / ${r.target}`:r.met?'已有':'还没有'}</small></li>`).join('')}</ul></div>`).join('')}</section>`;
}

function familiarPeople() {
  const people=[['xiaoman','放映室里的同学'],['ahe',state.visits.ahe>=2?'约好周五一起看':state.visits.ahe?'一起吃过饭':'还没单独聊过'],['linye',state.visits.linye>=2?'约好周五会来':state.visits.linye?'知道他下课晚':'还没单独聊过']];
  return `<div class="people" aria-label="认识的同学">${people.map(([id,text])=>`<div>${avatar(id)}<span>${names[id]}<small>${text}</small></span></div>`).join('')}</div>`;
}

function actionButton(id) {
  const a=getAction(state,id);
  let effect=a.effect||'';
  if(state.phase==='schedule') {
    if(['watch','curate_daily','curate_strange'].includes(id)) effect=`选片 ${state.skills.content} → ${Math.min(4,state.skills.content+1)} / 4${id.startsWith('curate')?' · 留下一份真实片单':''}`;
    else if(['practice','open_trial'].includes(id)) effect=`动手 ${state.skills.hands} → ${Math.min(4,state.skills.hands+1)} / 4${id==='open_trial'?' · 留下一次独自试场的经验':''}`;
  }
  return `<button class="choice ${['curate_daily','curate_strange','open_trial'].includes(id)?'new-method':''}" type="button" data-choice="${id}" data-phase="${state.phase}" data-day="${state.day}" ${busy?'disabled':''}><span class="choice-copy"><strong>${esc(a.label)}</strong><small>${esc(a.detail)}</small>${effect?`<span class="effect">${esc(effect)}</span>`:''}</span><span class="arrow" aria-hidden="true">→</span></button>`;
}

function fridayPlans() {
  const available=getChoices(state);
  const forecast=getForecast(state);
  return `<div class="route-choices">${Object.entries(routes).map(([id,r])=>{
    const active=available.includes(id), f=forecast.find(x=>x.id===id);
    const missing=f?.requirements.filter(x=>!x.met).map(x=>x.label).join('、');
    return `<button class="choice route-choice" type="button" data-choice="${id}" data-phase="friday" data-day="7" ${!active||busy?'disabled':''}><span class="choice-copy"><strong>${r.name}<em>${active?'今晚可选':'还没准备到这里'}</em></strong><small>${r.text}</small>${missing?`<span class="effect">还需要：${esc(missing)}</span>`:''}</span><span class="arrow" aria-hidden="true">${active?'→':'—'}</span></button>`;
  }).join('')}</div>`;
}

function currentScene() {
  const day=getDay(state);
  const actions=getChoices(state);
  if(state.phase==='schedule') actions.sort((a,b)=>Number(['curate_daily','curate_strange','open_trial'].includes(b))-Number(['curate_daily','curate_strange','open_trial'].includes(a)));
  const location=state.phase==='schedule'?'gate':state.route==='private'?'dorm':'hall';
  return `<section class="today-panel" id="story" aria-labelledby="scene-title"><div class="day-heading"><div><p class="eyebrow">${esc(day.date)} · ${esc(day.weekday)} ${esc(day.time||'')}</p><h1 id="scene-title" tabindex="-1">${esc(day.title)}</h1></div><div class="small-scene" aria-hidden="true">${campusScene(location)}</div></div>
    <div class="prose">${day.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
    ${day.quote?`<blockquote>${avatar(day.speaker||'xiaoman')}<div><span>${names[day.speaker||'xiaoman']}</span><p>「${esc(day.quote)}」</p></div></blockquote>`:''}
    ${state.phase==='schedule'?`<div class="schedule-label"><h2>今天的这段课余，想怎么过？</h2><span>选好后过完今天，进入下一天</span></div>`:''}
    ${state.phase==='friday'?fridayPlans():`<div class="choices">${actions.map(actionButton).join('')}</div>`}
  </section>`;
}

function logs() {
  if(!state.history.length) return '';
  let replay=createGame();
  const items=state.history.map(event=>{
    const before=replay; replay=choose(replay,event.choiceId);
    const log=getLogText(before,event.choiceId,replay);
    return {day:before.day,...log};
  }).reverse();
  const row=l=>`<article><time>10 月 ${11+l.day} 日</time><div><h3>${esc(l.title)}</h3><p>${esc(l.text)}</p>${l.quote?`<p class="log-quote">${names[l.person]||''}：「${esc(l.quote)}」</p>`:''}</div></article>`;
  return `<section class="days-log" aria-labelledby="log-title"><h2 id="log-title">过了的日子 <span>最新在最上面</span></h2>${items.slice(0,3).map(row).join('')}${items.length>3?`<details><summary>前几天的事</summary>${items.slice(3).map(row).join('')}</details>`:''}</section>`;
}

function ending() {
  const facts=getOutcome(state), copy=getEnding(state,facts);
  const picture={playlist:'screen',room:'map',ticket:'ticket',dorm:'song'}[facts.artifact];
  return `<section class="ending today-panel" id="story"><p class="eyebrow">10 月 18 日 · 周五 20:45</p><h1 id="scene-title" tabindex="-1">${esc(copy.title)}</h1><div class="result-banner ${facts.finished?'':'unfinished'}">${esc(copy.resultLabel)}</div><div class="prose">${copy.paragraphs.map(x=>`<p>${esc(x)}</p>`).join('')}</div><section class="artifact">${memoryArt(picture)}<div><h2>${esc(copy.artifactTitle)}</h2><ul>${copy.artifactItems.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></section>${copy.missed?`<p class="missed">${esc(copy.missed)}</p>`:''}<p class="next-ability">${esc(copy.nextAbility)}</p><div class="ending-facts"><span>${facts.guests} 人在场</span><span>你实际看了 ${facts.watchedMinutes} 分钟</span><span>这次负责：${esc(facts.ownedTask)}</span></div><button class="replay-button" type="button" data-replay>换一份日程，重新过这一周 ↻</button><p class="help end-note">试玩到这里。回头看，每天少做或多做一件事，会留下什么不同。</p></section>`;
}

function render() {
  game.innerHTML=`${calendar()}<div class="notice" role="status">${esc(previousNotice)}</div><div class="layout"><div>${state.phase!=='ending'?`<details class="mobile-plans"><summary>周五能做什么？<span>选片 ${state.skills.content}/4 · 动手 ${state.skills.hands}/4 ▾</span></summary>${growth('mobile-')}${forecasts('mobile-')}</details>`:''}${state.phase==='ending'?ending():currentScene()}${logs()}</div><aside class="sidebar">${growth()}${forecasts()}${familiarPeople()}</aside></div>`;
}

function save() {
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));saveStatus.textContent='进度已保存在当前浏览器';}
  catch{saveStatus.textContent='当前浏览器暂时无法保存，仍可试玩';}
}

game.addEventListener('click',e=>{
  const b=e.target.closest('[data-choice]');
  if(b&&!busy&&!b.disabled&&b.dataset.phase===state.phase&&Number(b.dataset.day)===state.day){
    busy=true;const before=state;
    try{
      state=choose(state,b.dataset.choice); save();
      previousNotice=state.day>before.day?`10 月 ${11+before.day} 日的这段课余过完了。今天是 ${11+state.day} 日。`:'';
      render();document.querySelector('#scene-title').focus({preventScroll:true});
      game.scrollIntoView({block:'start',behavior:'instant'});
    }finally{setTimeout(()=>{busy=false;game.querySelectorAll('[data-choice]').forEach(x=>{if(getChoices(state).includes(x.dataset.choice))x.disabled=false;});},250);}
  }
  if(e.target.closest('[data-replay]'))document.querySelector('#restart-dialog').showModal();
});
const dialog=document.querySelector('#restart-dialog');
document.querySelector('#restart').addEventListener('click',()=>dialog.showModal());
dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-dialog="cancel"]'))dialog.close();
  if(e.target.closest('[data-dialog="confirm"]')){
    state=createGame();busy=false;previousNotice='';save();render();dialog.close();window.scrollTo({top:0,behavior:'instant'});document.querySelector('#scene-title').focus({preventScroll:true});
  }
});
render();
