import {createGame,begin,startYoungSample,advanceDays,choose,setFocus,validateSave,migrateV2,getDecisionOptions,getCurrentScene,getLifeView,getMemories} from './engine.js?v=3';
import {PROFILE,getPortrait} from '../life/content.js';
import {lifeScene,personArt} from '../life/art.js';
import {drawCard,saveCard} from '../life/card.js';
import {getReplicaView,logDisplayEntries} from './model.js?v=3';
import {elapsedDays} from './clock.js?v=3';

const app=document.querySelector('#app'),toolbar=document.querySelector('#toolbar');
const decision=document.querySelector('#decision'),restart=document.querySelector('#restart');
const sampleMode=new URLSearchParams(location.search).get('sample')==='1';
const KEY=sampleMode?'china-life.replica.sample.save.v3':'china-life.replica.save.v3';
const UI_KEY=sampleMode?'china-life.replica.sample.ui.v1':'china-life.replica.ui.v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={father:'父亲',mother:'母亲',zhouzhou:'周舟',songwen:'宋闻',xuyang:'许阳',xiaoyin:'小尹'};
let state=createGame(),paused=false,speed=1,carry=0,fastForward=false,minimized=false,migrated=false,canSave=true;
let favorites=[],selected=[],caption='',showEarlier=false,ready=false,drawing=0,shellReady=false,logKey='',lastTick=performance.now(),lastSave=0;
try{
  const raw=localStorage.getItem(KEY);
  let restored=raw?validateSave(JSON.parse(raw)):null;
  if(raw&&!restored)canSave=false;
  if(!raw&&!sampleMode){
    const previous=JSON.parse(localStorage.getItem('china-life.replica.save.v2')||'null');
    if(previous){restored=migrateV2(previous);migrated=Boolean(restored);}
  }
  if(restored)state=restored;
  else if(!raw&&sampleMode)state=startYoungSample(freshSeed());
  const ui=JSON.parse(localStorage.getItem(UI_KEY)||'null')||{};
  speed=[1,2,4,8,16].includes(ui.speed)?ui.speed:1;
  carry=restored&&!migrated&&Number.isFinite(ui.carry)?Math.max(0,Math.min(.999999,ui.carry)):0;
  const ids=new Set(state.log.map(e=>e.id));
  favorites=Array.isArray(ui.favorites)?[...new Set(ui.favorites)].filter(id=>ids.has(id)):[];
  selected=Array.isArray(ui.selected)?[...new Set(ui.selected)].filter(id=>ids.has(id)).slice(0,3):[];
  caption=typeof ui.caption==='string'?ui.caption.slice(0,80):'';
  paused=state.status==='living'&&!state.pending&&!(sampleMode&&!raw);
}catch{canSave=false;}
function persist(){if(!canSave)return;try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(UI_KEY,JSON.stringify({speed,carry,favorites,selected,caption}));}catch{toast('此浏览器暂时无法保存进度。');}}
let toastTimer;
function toast(text){const node=document.querySelector('#toast');node.textContent=text;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,2500);}
function yearText(){return `${PROFILE.birthYear+state.age}年 · ${Math.floor((state.day||0)/30)+1}月 · ${PROFILE.name}`;}
function clockLabel(){return state.status==='ended'?'这一生已结束':state.pending?'等待抉择':getLifeView(state).needsPlan?'先选今年的重心':restart.open?'查看中 · 已暂停':paused?'已暂停':fastForward?'正在快进':'生活正在继续';}
function toolbarHTML(){const fraction=(state.day||0)/360;return `<a class="brand" href="${sampleMode?"?sample=1":"./"}">这一生<span>日常与成长</span></a><div class="age"><b id="age">${state.age}</b><span>岁</span></div><div class="year-caption"><span id="year-caption">${yearText()}</span><small id="clock-state">${clockLabel()}</small></div><div class="time-controls"><button id="pause" data-action="pause" ${state.status==='ended'?'disabled':''}>${paused?'▶ 继续':'Ⅱ 暂停'}</button><div class="speeds" aria-label="生活速度">${[1,2,4,8,16].map(n=>`<button data-speed="${n}" aria-pressed="${speed===n}">${n}×</button>`).join('')}</div><button id="fast-forward" data-action="fast" aria-pressed="${fastForward}">快进到抉择 »</button><details class="more-menu"><summary aria-label="更多">⋯</summary><div>${sampleMode?'<a href="./">回到保留的原来人生</a>':''}<button data-action="open-profile">身份与近况</button><button data-action="restart">重新开始</button><a href="../life/previous.html">上一版对照 ↗</a><a href="https://1in8b.life/zh-hans/" target="_blank" rel="noopener">原作 ↗</a></div></details></div><div class="year-progress" role="progressbar" aria-label="本年经过的时间" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fraction*100)}"><i style="width:${fraction*100}%"></i></div>`;}
function intro(){return `<section class="intro"><p class="intro-kicker">1in8b 核心循环 · 中国样本</p><h1>这一生。</h1><p>日常会一点点改变你，也改变你会遇到的事。<br>把时间留给作品、来往或生活，看看接下来会怎样。</p><div class="intro-art">${lifeScene(0)}</div><div class="panel identity"><div class="id-head">出生登记 · CHN <span>2005</span></div><div class="id-main"><div class="avatar">${personArt('you',0)}</div><div><h2>陈知夏</h2><p>中国 · 澄江 · 女</p><p>父母经营一间家电维修铺。</p></div></div></div><div class="intro-actions"><button class="primary" data-action="sample">从23岁，开始这几年的生活 →</button><button class="quiet" data-action="begin">也可以从出生开始</button></div><p class="page-note">中国虚构人生。23—30岁可持续投入、形成经历，再接着走到晚年。<br><a href="https://1in8b.life/zh-hans/" target="_blank" rel="noopener">1in8b 原作</a> · <a href="../life/previous.html">上一版试玩</a></p></section>`;}
function identityHTML(view){return `<details class="panel identity mobile-disclosure" id="profile" open><summary>身份与近况 <span>${esc(view.identity.name)}</span></summary><div class="panel-content"><div class="id-head">身份纪录 · CHN <span>2005</span></div><div class="id-main"><div class="avatar">${personArt('you',state.age)}</div><div><h2>${esc(view.identity.name)}</h2><dl class="id-grid">${view.identity.items.map(i=>`<dt>${esc(i.label)}</dt><dd>${esc(i.value)}</dd>`).join('')}</dl></div></div><div class="id-footer">${view.identity.footer}</div></div></details>`;}
function statusHTML(view){
  return `<details class="panel mobile-disclosure" open><summary>现在的生活 <span>${state.age}岁</span></summary><div class="panel-content">${view.statusItems.length?`<div class="stat-list">${view.statusItems.map(item=>`<div class="stat-row" data-stat="${esc(item.id)}"><label>${esc(item.label)}</label><span class="stat-track"><i style="width:${Math.max(0,Math.min(100,item.raw/item.max*100))}%"></i></span><strong>${esc(item.value)}</strong></div>`).join('')}</div><p class="stat-detail" data-state-headline>${esc(view.headline)}</p>`:`<p>${esc(view.stage)}</p><p class="stat-note">${state.age<23?'成长中的重要经历会写进人生记录。':'走过的事，留在记录里。'}</p>`}${view.money?`<div class="money"><small>${view.money.label}</small><strong data-money>${view.money.value}</strong><p>${esc(view.money.detail)}</p></div>`:''}</div></details>`;
}
function peopleHTML(view){return `<details class="panel mobile-disclosure" open><summary>家人与生活</summary><div class="panel-content people-list">${view.people.map(p=>`<article>${personArt(p.id,state.age)}<div class="person-copy"><h3>${esc(p.name)} <small>${esc(p.relation)}</small></h3><p>${esc(p.detail)}</p></div></article>`).join('')||'<p>家人的故事会随成长慢慢出现。</p>'}</div></details>`;}
function mapHTML(){const marks=new Set(state.choices.map(c=>c.age));return `<details class="panel mobile-disclosure" open><summary>人生地图 <span>一格 = 一年</span></summary><div class="panel-content"><div class="year-map">${Array.from({length:86},(_,age)=>`<i class="${age<=state.age?'lived':''} ${age===state.age?'now':''} ${marks.has(age)?'marked':''}" title="${age}岁 · ${2005+age}年">${marks.has(age)?'·':''}</i>`).join('')}</div><p class="stat-note">${state.age}岁 · 标点记录做过决定的年份。</p></div></details>`;}
function ledgerHTML(view){
  return `<div class="effort-ledger"><div class="ledger-title"><h3>今年，日常怎样过</h3><small>已过的日子会留下来</small></div><div class="ledger-rows">${view.ledgerRows.map(row=>`<div><span>${esc(row.label)}</span><strong data-ledger="${esc(row.id)}">${esc(row.value)}</strong></div>`).join('')}</div><p class="ledger-commitment" data-committed ${view.committedDays?'':'hidden'}>${view.committedDays?`另有${(view.committedDays/30).toFixed(1)}个月，已用在答应周舟的事上。`:''}</p><details class="effort-history"><summary>这几年累计的投入</summary><div class="ledger-rows">${view.totalLedgerRows.map(row=>`<div><span>${esc(row.label)}</span><strong data-total-ledger="${esc(row.id)}">${esc(row.value)}</strong></div>`).join('')}</div>${state.core?.migrationAt?'<p class="stat-note">保留旧版经历，投入账本从接上进度的这一天开始。</p>':''}</details></div>`;
}
function projectHTML(view){
  const project=view.activeProject;
  const done=project?.doneDays??project?.progressDays??0,total=project?.totalDays??project?.requiredDays??1;
  return `<div class="ongoing-practice" ${view.projectSummary||view.routeFacts.length?'':'hidden'}><p class="practice-caption">${project?"正在做的事":"留下的经历"}</p><p data-project-summary>${esc(view.projectSummary)}</p><div class="practice-track" data-project-track ${project?'':'hidden'}><i style="width:${Math.min(100,done/total*100)}%"></i></div><ul class="route-facts" data-route-facts>${view.routeFacts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>`;
}
function focusHTML(view){
  if(!view.active)return `<div class="panel-heading"><h2>今年的生活</h2></div><p class="focus-context">${esc(view.stage)}</p><p class="focus-detail">${state.status==='ended'?'这一生已经走到最后。':'日子会继续经过，重要的抉择出现时会等你。'}</p>${!sampleMode&&state.age>=23?`<div class="new-loop-entry"><p>新加入的日常循环在23—30岁展开。你现在${state.age}岁的这局会继续保留。</p><a class="primary" href="?sample=1">从23岁体验新日常 →</a><small>单独保存试玩进度，随时可以回到这一局。</small></div>`:''}`;
  return `<div class="panel-heading"><h2>最近的重心</h2><small>可以一直保持，也可以调整</small></div><p class="focus-context">${esc(view.stage)}</p><div class="focus-options" aria-label="持续的生活重心">${view.focusOptions.map(f=>`<button class="focus-chip" data-focus="${esc(f.id)}" aria-pressed="${f.selected}" ${state.pending?'disabled':''}><b>${esc(f.label)}</b><small>${esc({make:'练习和准备 · 也会累',connect:'来往与共同的事',settle:'休息和备用钱'}[f.id])}</small></button>`).join('')}</div>${view.needsPlan?'<p class="focus-detail">先选一个重心，生活就会继续。</p>':''}${ledgerHTML(view)}${projectHTML(view)}${view.commitmentText?`<p class="focus-detail">${esc(view.commitmentText)}</p>`:''}`;
}
function shell(){app.innerHTML=`<div class="layout"><aside class="left-column" id="left"></aside><div class="main-column"><figure class="panel scene-panel"><div id="scene"></div><figcaption class="scene-caption" id="scene-caption"></figcaption></figure><section class="panel focus-panel" id="focus"></section><div class="pending-banner" id="pending-banner" hidden><span>有一件事等你决定，时间已暂停。</span><button data-action="reopen">展开抉择 ↑</button></div><section class="panel life-feed"><div class="panel-heading"><h2>人生记录</h2><small>最新的在前 · ☆ 留下这一段</small></div><div id="feed"></div><button class="older-records" id="older" data-action="older" hidden>查看更早的记录</button></section><section class="panel ending" id="ending" hidden></section><p class="page-note">${sampleMode?'<a href="./">回到保留的原来人生 →</a><br>':''}中国固定样本 · 虚构人物与经历<br><a href="https://1in8b.life/zh-hans/" target="_blank" rel="noopener">参考原作 1in8b</a> · <a href="../life/previous.html">上一版对照</a></p></div><aside class="right-column" id="right"></aside></div>`;shellReady=true;logKey='';if(matchMedia('(max-width:800px)').matches){app.querySelectorAll('.mobile-disclosure').forEach(d=>d.open=false);}}
function updateFeed(){const entries=logDisplayEntries(state),visible=showEarlier?entries:entries.slice(0,8),key=visible.map(e=>e.id).join('|');if(key!==logKey){const feed=document.querySelector('#feed');const known=new Map([...feed.children].map(e=>[e.dataset.id,e]));const wanted=new Set(visible.map(e=>e.id));for(const e of [...feed.children])if(!wanted.has(e.dataset.id))e.remove();let cursor=feed.firstElementChild;for(const e of visible){let node=known.get(e.id);if(!node){node=document.createElement('article');node.className='log-row';node.dataset.id=e.id;node.innerHTML=`<time class="log-age">${e.age}岁${Number.isInteger(e.day)?`<small>${Math.min(12,Math.floor(e.day/30)+1)}月</small>`:""}</time><div class="log-copy"><p class="log-title">${e.kind==='choice'?'▸ ':''}${esc(e.title)}</p><p class="log-body">${esc(e.text)}</p>${e.quote?`<p class="log-quote">${esc(names[e.person]||'')}：「${esc(e.quote)}」</p>`:''}</div>${!e.displayOnly?`<button class="star" data-star="${esc(e.id)}" aria-label="收藏：${esc(e.title)}" aria-pressed="${favorites.includes(e.id)}">${favorites.includes(e.id)?'★':'☆'}</button>`:''}`;}if(node!==cursor)feed.insertBefore(node,cursor);cursor=node.nextElementSibling;}logKey=key;}const older=document.querySelector('#older');older.hidden=entries.length<=8||showEarlier;}
function paint(){document.body.dataset.phase=state.status==='unborn'?'intro':state.status;toolbar.hidden=state.status==='unborn';if(state.status==='unborn'){shellReady=false;app.innerHTML=intro();return;}if(!shellReady)shell();const view=getReplicaView(state),openLeft=[...app.querySelectorAll('#left details')].map(d=>d.open),openRight=[...app.querySelectorAll('#right details')].map(d=>d.open);toolbar.innerHTML=toolbarHTML();document.querySelector('#left').innerHTML=identityHTML(view)+statusHTML(view);document.querySelector('#right').innerHTML=peopleHTML(view)+mapHTML();if(matchMedia('(max-width:800px)').matches){app.querySelectorAll('#left details').forEach((d,i)=>d.open=openLeft[i]??false);app.querySelectorAll('#right details').forEach((d,i)=>d.open=openRight[i]??false);}document.querySelector('#scene').innerHTML=lifeScene(state.age,state.facts.city).replace('<svg ','<svg preserveAspectRatio="xMidYMax slice" ');document.querySelector('#scene-caption').textContent=view.stage;document.querySelector('#focus').innerHTML=focusHTML(view);updateFeed();document.querySelector('#pending-banner').hidden=!state.pending||!minimized;if(state.pending&&!minimized)openDecision();if(state.status==='ended')showEnding();document.title=`${state.age}岁 · 这一生 · 日常与成长`;}
function updateTime(){
  if(state.status==='unborn')return;
  document.querySelector('#clock-state').textContent=clockLabel();
  document.querySelector('#age').textContent=state.age;
  document.querySelector('#year-caption').textContent=yearText();
  const button=document.querySelector('#pause');button.textContent=paused?'▶ 继续':'Ⅱ 暂停';button.disabled=state.status==='ended'||Boolean(state.pending)||getLifeView(state).needsPlan;
  document.querySelector('#fast-forward').setAttribute('aria-pressed',String(fastForward));
  document.querySelector('#fast-forward').disabled=state.status==='ended'||Boolean(state.pending)||getLifeView(state).needsPlan;
  const progress=document.querySelector('.year-progress');progress.setAttribute('aria-valuenow',Math.floor((state.day||0)/3.6));progress.querySelector('i').style.width=`${(state.day||0)/3.6}%`;
}
function updateLiveState(){
  updateTime();
  if(!shellReady||state.status!=='living')return;
  const view=getReplicaView(state);
  for(const item of view.statusItems){const row=app.querySelector(`[data-stat="${item.id}"]`);if(row){row.querySelector('strong').textContent=item.value;row.querySelector('i').style.width=`${Math.max(0,Math.min(100,item.raw/item.max*100))}%`;}}
  const money=app.querySelector('[data-money]');if(money&&view.money)money.textContent=view.money.value;
  const headline=app.querySelector('[data-state-headline]');if(headline)headline.textContent=view.headline;
  for(const row of view.ledgerRows){const node=app.querySelector(`[data-ledger="${row.id}"]`);if(node)node.textContent=row.value;}
  for(const row of view.totalLedgerRows){const node=app.querySelector(`[data-total-ledger="${row.id}"]`);if(node)node.textContent=row.value;}
  const committed=app.querySelector('[data-committed]');if(committed){committed.hidden=!view.committedDays;committed.textContent=view.committedDays?`另有${(view.committedDays/30).toFixed(1)}个月，已用在答应周舟的事上。`:'';}
  const summary=app.querySelector('[data-project-summary]');if(summary)summary.textContent=view.projectSummary;
  const track=app.querySelector('[data-project-track]');if(track){const project=view.activeProject;track.hidden=!project;if(project){const done=project.doneDays??project.progressDays??0,total=project.totalDays??project.requiredDays??1;track.querySelector('i').style.width=`${Math.min(100,done/total*100)}%`;}}
}
function openDecision(){if(!state.pending)return;const scene=getCurrentScene(state),opportunity=state.pending.startsWith('core_');decision.innerHTML=`<div class="modal-top"><span>${opportunity?"有人来问你":"人生抉择"}</span><span>${state.age}岁 · ${2005+state.age}年${Math.floor(state.day/30)+1}月</span><button data-action="minimize">先收起来 ▾</button></div><div class="modal-content"><h2 id="decision-title">${esc(scene.title)}</h2><p>${esc(scene.text)}</p>${scene.quote?`<blockquote>${esc(names[scene.person]||'')}：「${esc(scene.quote)}」</blockquote>`:''}<div class="choices">${getDecisionOptions(state).map((c,i)=>`<button class="choice" data-choice="${esc(c.id)}" ${c.available?'':'disabled'}><span class="choice-number">${i+1}</span><span><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small>${!c.available?`<em>${esc(c.reason)}</em>`:''}</span></button>`).join('')}</div></div>`;minimized=false;if(!decision.open)decision.showModal();updateTime();}
function shareMemories(){return state.log.filter(e=>e.kind!=='decision'&&e.kind!=='end').map(e=>({id:e.id,age:e.age,title:e.title,text:e.memory||e.text}));}
function showEnding(){const node=document.querySelector('#ending');if(!node.hidden)return;const portrait=getPortrait(state.facts),memories=shareMemories();if(!selected.length)selected=(favorites.length?favorites:getMemories(state).slice(-3).map(m=>m.id)).slice(-3);node.hidden=false;node.innerHTML=`<p class="intro-kicker">2005—2090 · 85岁</p><h1>陈知夏的这一生</h1><p class="closing-scene">${esc(getCurrentScene(state).text)}</p>${portrait.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<details><summary>这一生，确实发生过的事</summary><dl>${portrait.facts.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>${portrait.unfulfilled.length?`<p>还有没完成的事</p><ul>${portrait.unfulfilled.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</details><section class="card-editor"><h2>留下这一生</h2><p>选1—3段经历，生成一张卡片。</p><details><summary>更换卡片里的经历</summary><fieldset class="memory-picker">${memories.map(m=>`<label><input type="checkbox" value="${esc(m.id)}" data-memory ${selected.includes(m.id)?'checked':''}><span>${m.age}岁 · ${esc(m.text)}</span></label>`).join('')}</fieldset></details><label class="caption-label" for="caption">想说的一句话</label><textarea id="caption" maxlength="80" rows="3">${esc(caption)}</textarea><canvas id="share-canvas" width="960" height="1260" role="img" aria-label="本局人生分享卡"></canvas><button class="primary" id="save-card" data-action="save-card" disabled>保存卡片图片 ↓</button><p id="card-status" role="status">正在整理卡片…</p></section><button class="quiet" data-action="restart">再过一次</button>`;persist();updateCard();node.scrollIntoView({block:'start'});}
async function updateCard(){const canvas=document.querySelector('#share-canvas');if(!canvas)return;ready=false;const token=++drawing;document.querySelector('#save-card').disabled=true;try{const stage=document.createElement('canvas');await drawCard(stage,{profile:PROFILE,portrait:getPortrait(state.facts),memories:shareMemories().filter(m=>selected.includes(m.id)),caption});if(token!==drawing||!canvas.isConnected)return;canvas.width=stage.width;canvas.height=stage.height;canvas.getContext('2d').drawImage(stage,0,0);ready=true;document.querySelector('#save-card').disabled=!selected.length;document.querySelector('#card-status').textContent='卡片已更新，保存在你的设备上。';}catch(err){console.error(err);document.querySelector('#card-status').textContent='卡片暂时没有画好，请重试。';}}
function freshSeed(){return crypto.getRandomValues(new Uint32Array(1))[0]||1;}
function start(sample){state=sample?startYoungSample(freshSeed()):begin(createGame(freshSeed()));paused=false;carry=0;fastForward=false;minimized=false;favorites=[];selected=[];caption='';showEarlier=false;shellReady=false;canSave=true;persist();paint();updateTime();window.scrollTo(0,0);lastTick=performance.now();}

function tickTime(){
  const now=performance.now(),elapsed=now-lastTick;lastTick=now;
  const result=elapsedDays({carry,status:state.status,pending:state.pending,needsPlan:getLifeView(state).needsPlan,paused,hidden:document.hidden,modalOpen:restart.open,fastForward},elapsed,speed);
  carry=result.carry;
  if(result.days){
    const before=state;
    state=advanceDays(state,result.days);
    const changed=state.age!==before.age||state.pending!==before.pending||state.log.length!==before.log.length;
    if(state.pending||getLifeView(state).needsPlan||state.status!=='living'){carry=0;fastForward=false;}
    if(state.pending&&!before.pending)minimized=false;
    if(changed){persist();paint();}
  }
  updateLiveState();
  if(now-lastSave>5000){lastSave=now;persist();}
}
async function click(event){const node=event.target.closest('button,[data-action]');if(!node)return;const action=node.dataset.action;try{
 tickTime();
 if(node.dataset.focus){const first=getLifeView(state).needsPlan;state=setFocus(state,node.dataset.focus);if(first)paused=false;persist();paint();updateTime();return;}
 if(node.dataset.speed){speed=Number(node.dataset.speed);fastForward=false;persist();toolbar.innerHTML=toolbarHTML();updateTime();return;}
 if(node.dataset.choice){state=choose(state,node.dataset.choice);decision.close();minimized=false;persist();paint();updateTime();return;}
  if(node.dataset.star){const id=node.dataset.star;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];node.setAttribute('aria-pressed',String(favorites.includes(id)));node.textContent=favorites.includes(id)?'★':'☆';persist();return;}
 if(action==='begin')start(false);
 if(action==='sample')start(true);
 if(action==='pause'){paused=!paused;fastForward=false;persist();updateTime();}
 if(action==='fast'){fastForward=!fastForward;paused=false;updateTime();}
 if(action==='minimize'){minimized=true;decision.close();document.querySelector('#pending-banner').hidden=false;updateTime();}
 if(action==='reopen')openDecision();
 if(action==='older'){showEarlier=true;updateFeed();}
 if(action==='open-profile'){const profile=document.querySelector('#profile');profile.open=true;profile.scrollIntoView({block:'start'});toolbar.querySelector('.more-menu').open=false;}
 if(action==='restart'){restart.showModal();updateTime();}
 if(action==='cancel-restart'){restart.close();updateTime();}
 if(action==='confirm-restart'){restart.close();state=createGame(freshSeed());carry=0;paused=false;minimized=false;favorites=[];selected=[];caption='';persist();paint();window.scrollTo(0,0);}
 if(action==='save-card'&&ready&&selected.length){await saveCard(document.querySelector('#share-canvas'));toast('图片已生成，浏览器会开始保存。');}
 }catch(err){console.error(err);toast('眼下暂时不能这样安排，请先处理等待的决定。');}}
document.addEventListener('click',click);
decision.addEventListener('cancel',event=>{event.preventDefault();minimized=true;decision.close();document.querySelector('#pending-banner').hidden=false;updateTime();});
restart.addEventListener('close',updateTime);
document.addEventListener('change',event=>{if(!event.target.matches('[data-memory]'))return;const input=event.target;if(input.checked){if(selected.length>=3){input.checked=false;toast('最多留下三段，先取消一段就可以换。');return;}selected.push(input.value);}else selected=selected.filter(id=>id!==input.value);persist();updateCard();});
document.addEventListener('input',event=>{if(event.target.id==='caption'){caption=event.target.value.slice(0,80);persist();updateCard();}});
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();persist();updateTime();});
window.addEventListener('pagehide',persist);
setInterval(tickTime,100);
paint();updateTime();

if(migrated){persist();toast('已接上原来的进度。投入账本从这一天开始记录。');}
if(!canSave)toast('进度暂时未能读取，原来的记录仍保留。');
