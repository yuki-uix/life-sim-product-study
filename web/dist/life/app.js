import { createGame, begin, advance, choose, getDecisionOptions, getCurrentScene, getMemories, getNextAge, validateSave, startYoungSample, setFocus, arrange, getLifeView } from './engine.js?v=4';
import { PROFILE, getPeople, getPortrait } from './content.js';
import { lifeScene, personArt } from './art.js';
import { drawCard, saveCard } from './card.js';
import { deriveClock, reservationSummary, describeChanges } from './ui-model.js?v=4';

const KEY='china-life.save.v2';
const game=document.querySelector('#game'), dialog=document.querySelector('#restart-dialog');
const inspector=document.querySelector('#inspect-dialog'), panelBody=document.querySelector('#inspect-body');
const saveStatus=document.querySelector('#save-status');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={you:'陈知夏',father:'父亲',mother:'母亲',zhouzhou:'周舟',songwen:'宋闻',xuyang:'许阳',xiaoyin:'小尹'};
let state=createGame(),manualPaused=false,speed=1,nextStepAt=0,selected=[],caption='',cardReady=false;
let drawing=0,cardInitialized=false,hasOldSave=false,activePanel=null,panelOpener=null;
let shellReady=false,feedKey='',newCount=0,feedback=null,lastPortraitAge=-1;
const panelViews={plan:{scroll:0,open:[]},status:{scroll:0,open:[]},records:{scroll:0,open:[]}};
try{
  hasOldSave=Boolean(localStorage.getItem('china-life.save.v1'));
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  const restored=raw&&validateSave(raw.state);
  if(restored){
    state=restored;speed=[1,2].includes(raw.ui?.speed)?raw.ui.speed:1;
    const valid=new Set(getMemories(state).map(m=>m.id));
    selected=[...new Set(Array.isArray(raw.ui?.selected)?raw.ui.selected:[])].filter(id=>typeof id==='string'&&valid.has(id)).slice(0,3);
    cardInitialized=Boolean(raw.ui?.cardInitialized);
    caption=typeof raw.ui?.caption==='string'?raw.ui.caption.slice(0,80):'';
    manualPaused=state.status==='living'&&!state.pending;
  }
}catch{saveStatus.textContent='此浏览器暂时无法保存，仍可试玩';}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({state,ui:{speed,selected,caption,cardInitialized}}));saveStatus.textContent='已保存在当前浏览器';}
  catch{saveStatus.textContent='此浏览器暂时无法保存，仍可试玩';}
}
function notify(text){const n=document.querySelector('#notice');n.textContent=text;n.hidden=false;setTimeout(()=>{n.hidden=true;},4200);}
function clock(){return deriveClock({status:state.status,pending:state.pending,needsPlan:getLifeView(state).needsPlan,manualPaused,panel:activePanel,restartOpen:dialog.open,hidden:document.hidden});}
const delay=()=>950/speed;
function hold(){
  const scene=getCurrentScene(state);
  const length=Array.from(`${scene?.title||''}${scene?.text||''}${scene?.quote||''}`).length;
  return Math.max(10000,Math.min(30000,length*180+2000));
}
const restartTimer=()=>{nextStepAt=Date.now()+hold();};
function resetViews(){for(const name of Object.keys(panelViews))panelViews[name]={scroll:0,open:[]};panelOpener=null;}
function textAt(selector,value){const e=game.querySelector(selector);if(e&&e.textContent!==String(value))e.textContent=value;}
function yearMap(){
  const marks=new Set(state.choices.map(c=>c.age));
  return `<div class="year-map" aria-label="已经走过的年份，每格一年">${Array.from({length:86},(_,age)=>`<i class="${age<=state.age?'lived':''} ${age===state.age?'now':''} ${marks.has(age)?'marked':''}" title="${age}岁 · ${2005+age}年"></i>`).join('')}</div><div class="map-labels"><span>2005 · 出生</span><span>每格一年</span><span>${2005+state.age} · ${state.age}岁</span></div>`;
}
function intro(){
  return `<section class="birth" id="current"><p class="eyebrow">中国 · 澄江 · 2005年出生</p><h1>这一生，你是陈知夏。</h1><div class="birth-art">${lifeScene(0)}</div><p class="birth-prose">父母经营一间家电维修铺。<br>你有一部想做的短片，也有想见的人。</p><p class="birth-question">手上想做的片子，身边想见的人。<br>这几年，你想怎样安排？</p><button class="primary-button begin-button" type="button" data-action="young-sample">从23岁，试试这几年的生活 <span aria-hidden="true">→</span></button><button class="birth-secondary" type="button" data-action="begin">也可以从出生开始，过完整一生</button><p class="sample-note">23岁入口沿用外省求学的固定前情，之后仍可继续到晚年。<br>人物与经历均为虚构。</p>${hasOldSave?'<a class="legacy-link" href="../life-v1/">继续上一版已保存的人生 ↗</a>':''}</section>`;
}

function shell(){
  return `<div class="game-shell"><section class="clock-bar" aria-label="当前人生与时间状态"><div class="hero-portrait" aria-hidden="true"></div><div class="age"><b id="age-number"></b><span>岁</span></div><div class="where"><strong id="year-number"></strong><span id="current-place"></span></div><span id="time-status" class="clock-state" role="status"></span></section><div class="play-stage"><div id="stage-context" class="stage-context" hidden></div><button type="button" id="new-story" class="new-story" data-action="latest" hidden>回到最新生活 ↑</button><section class="story-scroll" id="story-scroll" aria-label="眼前的生活与最近记录"><div class="scene-feed" id="scene-feed"></div></section></div><footer class="play-dock"><p class="current-plan" id="current-plan"></p><div class="action-feedback" id="action-feedback" role="status" hidden></div><div class="dock-main"><nav class="dock-nav" aria-label="生活与查看"><button type="button" data-panel="plan">安排生活</button><button type="button" data-panel="status">近况与人物</button><button type="button" data-panel="records">人生记录</button></nav><div class="dock-time" aria-label="唯一时间控制"><button type="button" id="pause" class="clock-action" data-action="clock"></button><label class="speed">速度 <select id="speed" aria-label="时间速度"><option value="1">1×</option><option value="2">2×</option></select></label><button type="button" id="next" class="advance-button" data-action="next"></button></div></div></footer></div>`;
}
function entryLabel(entry){
  const year=entry.id.match(/^young_year_(\d+)$/);
  if(year)return `${year[1]}→${entry.age}岁 · 刚过去的一年`;
  return `${entry.age}岁 · ${2005+entry.age}年${entry.kind==='decision'?' · 当前决定':entry.kind==='choice'?' · 你的决定':''}`;
}
function decisionContext(){
  const view=getLifeView(state);if(!view.active)return '';
  return `<div class="decision-context"><p>现在的处境</p><div>${view.items.map(item=>`<span><small>${esc(item.label)}</small>${esc(item.value)}</span>`).join('')}</div><button type="button" data-panel="status">查看近况细节</button></div>`;
}
function entryHTML(entry){
  const pending=entry.kind==='decision'&&entry.id===state.pending;
  const options=pending?getDecisionOptions(state):[];
  return `<div class="scene-heading"><p class="eyebrow">${esc(entryLabel(entry))}</p>${pending?'<span class="decision-badge">等你决定</span>':''}</div><h2 class="scene-title" tabindex="-1">${esc(entry.title)}</h2><p class="scene-text">${esc(entry.text)}</p>${entry.quote?`<blockquote>${personArt(entry.person,entry.age)}<div><span>${esc(names[entry.person]||'')}</span><p>「${esc(entry.quote)}」</p></div></blockquote>`:''}${pending?`${decisionContext()}<div class="decision-label">你会怎样决定？</div><div class="choices">${options.map(c=>`<button type="button" class="choice" data-choice="${esc(c.id)}" data-event="${esc(state.pending)}" ${c.available?'':'disabled'}><span><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small>${!c.available&&c.reason?`<em class="unavailable-reason">眼下排不开：${esc(c.reason)}</em>`:''}</span><b aria-hidden="true">${c.available?'→':'—'}</b></button>`).join('')}</div>`:''}`;
}
function scrollState(){
  const scroll=game.querySelector('#story-scroll');if(!scroll)return null;
  const top=scroll.getBoundingClientRect().top;
  const cards=[...scroll.querySelectorAll('[data-entry-id]')];
  const anchor=cards.find(e=>e.getBoundingClientRect().bottom>top+2);
  return {atTop:scroll.scrollTop<24,scrollTop:scroll.scrollTop,id:anchor?.dataset.entryId,offset:anchor?anchor.getBoundingClientRect().top-top:0};
}
function renderFeed(cause='update'){
  const feed=game.querySelector('#scene-feed'),scroll=game.querySelector('#story-scroll');if(!feed)return;
  const current=getCurrentScene(state);
  const entries=state.log.filter(e=>e.kind!=='decision'&&e.kind!=='end').slice().reverse();
  const view=getLifeView(state);
  if(!view.active&&typeof view.summary==='string'&&view.summary&&state.status==='living'&&state.age===31)entries.unshift({id:'young-phase-summary',age:31,title:'这几年的安排，留下了什么',text:view.summary});
  if(state.pending)entries.unshift(current);
  const key=state.status==='ended'?'ended':entries.map(e=>e.id).join('|');
  if(key===feedKey)return;
  const previous=scrollState(),known=new Map([...feed.querySelectorAll(':scope > [data-entry-id]')].map(e=>[e.dataset.entryId,e]));
  let inserted=0;
  const wanted=new Set(entries.map(e=>e.id));
  if(state.status==='ended')wanted.add('life-ending');
  for(const child of [...feed.children])if(!wanted.has(child.dataset.entryId))child.remove();
  const nodes=entries.map(entry=>{
    let node=known.get(entry.id);
    if(!node){node=document.createElement('article');node.className='scene-card';node.dataset.entryId=entry.id;node.innerHTML=entryHTML(entry);inserted++;}
    return node;
  });
  let newEnding=false;
  if(state.status==='ended'){
    if(!cardInitialized){chooseDefaults();cardInitialized=true;save();}
    let endingNode=known.get('life-ending');
    if(!endingNode){endingNode=document.createElement('article');endingNode.dataset.entryId='life-ending';endingNode.innerHTML=ending();inserted++;newEnding=true;}
    nodes.unshift(endingNode);
  }
  let cursor=feed.firstElementChild;
  for(const node of nodes){if(node!==cursor)feed.insertBefore(node,cursor);cursor=node.nextElementSibling;}
  feed.querySelectorAll('[id="current"],[id="scene-title"]').forEach(e=>e.removeAttribute('id'));
  feed.querySelectorAll('.current-scene').forEach(e=>e.classList.remove('current-scene'));
  const first=nodes[0];if(first){first.id='current';first.classList.add('current-scene');const title=first.querySelector('h1,h2.scene-title');if(title)title.id='scene-title';}
  if(newEnding)updateCard();
  feedKey=key;
  if(!previous||previous.atTop||cause==='choice'||cause==='entry'){
    scroll.scrollTop=0;newCount=0;
  }else{
    const anchor=[...feed.querySelectorAll('[data-entry-id]')].find(e=>e.dataset.entryId===previous.id);
    if(anchor)scroll.scrollTop+=anchor.getBoundingClientRect().top-scroll.getBoundingClientRect().top-previous.offset;
    else scroll.scrollTop=previous.scrollTop;
    newCount+=Math.max(1,inserted);
  }
  updateNewStory();
}
function updateNewStory(){
  const button=game.querySelector('#new-story');if(!button)return;
  button.hidden=newCount===0;
  button.textContent=state.status==='ended'?'这一生已结束，查看回顾 ↑':state.pending?'有一件事等你决定，回到现在 ↑':`${newCount}条新动态，回到最新生活 ↑`;
}
function latest(){
  const scroll=game.querySelector('#story-scroll');if(scroll)scroll.scrollTop=0;
  newCount=0;updateNewStory();
  game.querySelector('#scene-title')?.focus({preventScroll:true});
}
function updateChrome(){
  if(!shellReady)return;
  const view=getLifeView(state),c=clock(),r=reservationSummary(state,view);
  textAt('#age-number',state.age);textAt('#year-number',`${2005+state.age}年`);textAt('#current-place',`${state.facts.city} · 陈知夏`);textAt('#time-status',c.label);
  if(lastPortraitAge!==state.age){game.querySelector('.hero-portrait').innerHTML=personArt('you',state.age);lastPortraitAge=state.age;}
  const pause=game.querySelector('#pause');pause.textContent=c.actionLabel;pause.disabled=Boolean(c.actionDisabled);
  const next=game.querySelector('#next');next.textContent=state.pending?'等待这次决定':view.active?'过完今年 →':'往后过一段 →';next.disabled=Boolean(c.nextDisabled||state.status!=='living');
  const select=game.querySelector('#speed');if(select.value!==String(speed))select.value=String(speed);select.disabled=state.status==='ended';
  const chosen=view.focusOptions?.find(o=>o.selected),plan=game.querySelector('#current-plan');
  plan.textContent=view.active?`最近重心：${chosen?.label||'还未选择'}${r.hasReservation?` · 已约：${r.activity}`:' · 今年尚未额外预约'}`:state.status==='ended'?'这一生的经历已保存在当前浏览器。':state.pending?'先决定眼前的事情，之后会接着生活。':'日子继续经过，遇到重要的事会等你决定。';
  const receipt=game.querySelector('#action-feedback');
  plan.hidden=Boolean(feedback);receipt.hidden=!feedback;
  receipt.innerHTML=feedback?`<p>${esc(feedback.text)}</p>${feedback.lines?.length?`<p class="feedback-detail">${feedback.lines.map(esc).join(' · ')}</p>`:''}${feedback.target?`<button type="button" data-panel="${feedback.target}">查看${feedback.target==='status'?'近况':'安排'}</button>`:''}`:'';
  const context=game.querySelector('#stage-context');
  const contextText=view.needsPlan?'先选一个最近的过法，日子就会按这个安排继续。':view.notice||'';
  context.hidden=!contextText;context.innerHTML=contextText?`<p>${esc(contextText)}</p><button type="button" data-panel="plan" ${view.notice?`data-highlight="${view.arrangements?.some(o=>o.id==='work_together'&&o.available)?'work_together':'focus-connect'}"`:''}>${view.needsPlan?'安排生活':'看看怎么安排'}</button>`:'';
  document.title=state.status==='ended'?'陈知夏的这一生 · 人生回顾':`${state.age}岁${state.pending?' · 待你决定':''} · 这一生`;
  document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===activePanel)));
}
function render(cause='update'){
  document.body.classList.toggle('has-game',state.status!=='unborn');
  if(state.status==='unborn'){
    shellReady=false;feedKey='';lastPortraitAge=-1;game.className='unborn';game.innerHTML=intro();return;
  }
  if(!shellReady){game.className='has-life';game.innerHTML=shell();shellReady=true;feedKey='';lastPortraitAge=-1;
    game.querySelector('#story-scroll').addEventListener('scroll',()=>{if(game.querySelector('#story-scroll').scrollTop<24){newCount=0;updateNewStory();}});
  }
  renderFeed(cause);updateChrome();
}
function recordList(){
  return `<div class="record-list">${state.log.slice().reverse().map(e=>`<details class="log-entry" data-detail-id="${esc(e.id)}"><summary><time>${e.age}岁</time><span>${esc(e.title)}</span><small>${e.kind==='decision'?'当时的抉择':e.kind==='choice'?'你的选择':''}</small></summary><div class="log-body"><p>${esc(e.text)}</p>${e.quote?`<p>${esc(names[e.person]||'')}：「${esc(e.quote)}」</p>`:''}</div></details>`).join('')}</div>`;
}
function reservationCard(view){
  const r=reservationSummary(state,view);
  if(!r.active)return '';
  return `<section class="reservation-card"><h3>${r.hasReservation?'今年已预留':'今年可用的时间'}</h3><p>${r.hasReservation?esc(r.activity):'保留现在的过法也可以。'}</p>${r.lines?.length?`<div class="reservation-breakdown">${r.lines.map(line=>`<p>${esc(line)}</p>`).join('')}</div>`:''}</section>`;
}
function planPanel(){
  const view=getLifeView(state);
  if(!view.active)return `<section class="panel-section"><h3>这一阶段的安排</h3><p>${state.status==='ended'?'这一生已经结束，可以在生活主区回看并保存卡片。':'这段可调整的近期生活在23—30岁。其他阶段会按既有经历继续，重要选择会出现在生活主区。'}</p></section>`;
  const chosen=view.focusOptions.find(o=>o.selected),labels={make:'给作品留时间',connect:'多些来往',settle:'先安顿生活'};
  return `<section class="panel-section"><h3>最近的重心，会继续沿用</h3><p class="panel-help">保持当前过法也可以。改变后，日子经过时才会有实际投入。</p><div class="focus-options" role="group" aria-label="最近的生活重心">${view.focusOptions.map(o=>`<button type="button" data-focus="${esc(o.id)}" aria-pressed="${Boolean(o.selected)}" ${state.pending?'disabled':''}>${esc(labels[o.id]||o.label)}</button>`).join('')}</div><p class="focus-detail">${esc(chosen?.detail||'先选一个最近的过法。选定后会回到生活，自动模式会继续。')}</p></section>${reservationCard(view)}<section class="panel-section"><h3>今年额外安排一件事</h3><p class="panel-help">占用今年的时间和备用金，年底才记录实际完成的事。</p>${state.pending?'<p>先处理生活主区里等待的决定；这里仍可查看原来的安排。</p>':''}<div class="arrangement-options">${view.arrangements.map(o=>`<button type="button" class="arrangement ${o.selected?'selected':''}" id="arrangement-${esc(o.id)}" data-arrange="${esc(o.id)}" ${o.available&&!o.selected&&!state.pending?'':'disabled'}><strong>${esc(o.label)}</strong><span>${esc(o.detail)}</span><small>${esc(o.cost)}${o.reason?` · ${esc(o.reason)}`:''}</small></button>`).join('')}</div></section>`;
}
function statusPanel(){
  const view=getLifeView(state);
  return `${feedback?.allLines?.length?`<section class="panel-section"><h3>刚过去的一年有什么变化</h3>${feedback.allLines.map(line=>`<p>${esc(line)}</p>`).join('')}</section>`:''}${view.active?`<section class="panel-section"><h3>现在的生活 · ${state.age}岁</h3><p>${esc(view.headline)}</p><dl class="condition-grid">${view.items.map(i=>`<div><dt>${esc(i.label)}</dt><dd>${esc(i.value)}${i.detail?`<small>${esc(i.detail)}</small>`:''}</dd></div>`).join('')}</dl>${view.commitmentText?`<p class="ongoing-commitment">${esc(view.commitmentText)}</p>`:''}${reservationCard(view)}</section>`:''}<section class="panel-section"><h3>生活里的人</h3><div class="person-list">${getPeople(state.facts).map(p=>`<article>${personArt(p.id,state.age)}<div><h3>${esc(p.name)}<span>${esc(p.relation)}</span></h3><p>${esc(p.detail)}</p></div></article>`).join('')}</div></section><section class="panel-section"><h3>住过的地方</h3><p>${state.facts.cities.map(esc).join(' · ')}</p></section>`;
}
function recordsPanel(){
  return `<section class="panel-section"><h3>走过的年份</h3><details class="life-calendar" data-detail-id="calendar"><summary>展开人生时间线</summary>${yearMap()}</details></section><section class="panel-section"><h3>人生记录</h3><p class="panel-help">最新的在前。展开一条记录，不会另外改变时间状态。</p>${recordList()}</section><p class="panel-help"><a href="../life-v1/">上一版人生与存档 ↗</a></p>`;
}
function rememberPanel(){
  if(!activePanel)return;
  panelViews[activePanel]={scroll:panelBody.scrollTop,open:[...panelBody.querySelectorAll('details[open][data-detail-id]')].map(e=>e.dataset.detailId)};
}
function paintPanel(name,highlight){
  const prefs=panelViews[name];
  panelBody.innerHTML=name==='plan'?planPanel():name==='status'?statusPanel():recordsPanel();
  panelBody.querySelectorAll('details[data-detail-id]').forEach(d=>{d.open=prefs.open.includes(d.dataset.detailId);});
  panelBody.scrollTop=prefs.scroll;
  document.querySelector('#inspect-title').textContent={plan:'安排生活',status:'近况与人物',records:'人生记录'}[name];
  document.querySelector('#inspect-status').textContent=`${state.age}岁 · ${2005+state.age}年 · ${clock().label}`;
  document.querySelector('#inspect-return-note').textContent=state.status==='ended'?'返回人生回顾。':state.pending?'返回后，仍会等待这次决定。':getLifeView(state).needsPlan?'先选一个最近的生活重心。':manualPaused?'返回原位，保持手动暂停。':'返回原位，自动生活会继续。';
}
function openPanel(name,opener,highlight){
  if(!['plan','status','records'].includes(name)||state.status==='unborn')return;
  if(activePanel)rememberPanel();else panelOpener=opener;
  activePanel=name;paintPanel(name,highlight);
  if(!inspector.open)inspector.showModal();
  if(highlight){const target=highlight==='focus-connect'?panelBody.querySelector('[data-focus="connect"]'):document.getElementById('arrangement-'+highlight);target?.focus();target?.scrollIntoView({block:'nearest'});}
  updateChrome();
}
function closePanel(restoreFocus=true){
  if(!activePanel)return;
  rememberPanel();activePanel=null;
  if(inspector.open)inspector.close();
  restartTimer();updateChrome();
  if(restoreFocus&&panelOpener?.isConnected)panelOpener.focus({preventScroll:true});
}
function progress(years){
  const before=state;state=advance(state,years);save();
  if(state.log.length!==before.log.length){feedback={text:`${before.age}岁之后的日子已记下，现在${state.age}岁。`,lines:describeChanges(before,state).slice(0,1),allLines:describeChanges(before,state),target:'status'};}
  render('year');nextStepAt=Date.now()+(state.log.length!==before.log.length?hold():delay());
}
function start(sample){
  resetViews();state=sample?startYoungSample():begin(state);manualPaused=false;feedback=null;newCount=0;save();render('entry');restartTimer();
}
function runClockAction(){
  const c=clock();
  if(c.action==='return-life')closePanel();
  else if(c.action==='open-plan')openPanel('plan',game.querySelector('#pause'));
  else if(c.action==='show-decision')latest();
  else if(c.action==='resume'){manualPaused=false;restartTimer();updateChrome();}
  else if(c.action==='pause'){manualPaused=true;updateChrome();}
}
function chooseDefaults(){
  if(selected.length)return;
  const memories=getMemories(state), at=age=>memories.find(m=>m.age===age);
  selected=[at(18),at(29),memories.findLast(m=>m.age>=68&&m.age<=71)].filter(Boolean).map(m=>m.id);
  if(!selected.length)selected=memories.slice(-3).map(m=>m.id);
}
function ending(){
  const portrait=getPortrait(state.facts),memories=getMemories(state);
  return `<section class="ending" id="current"><p class="eyebrow">2090年 · 中国 · ${esc(state.facts.city)}</p><h1 id="scene-title" tabindex="-1">陈知夏的这一生</h1><p class="life-dates">2005—2090 · 85岁</p><p class="closing-scene">${esc(getCurrentScene(state).text)}</p><div class="portrait-prose">${portrait.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div><details class="life-facts" data-reader><summary>这一生，确实发生过的事 <span>展开</span></summary><dl>${portrait.facts.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>${portrait.unfulfilled.length?`<p class="unfulfilled-label">还有没完成的事</p><ul>${portrait.unfulfilled.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</details><section class="card-editor" aria-labelledby="card-title"><p class="eyebrow">留下这一生</p><h2 id="card-title">想把哪几段，放进卡片里？</h2><p class="editor-help">选1—3段实际经历。你也可以只回看，不生成卡片。</p><div class="card-layout"><div class="card-fields"><details class="memory-selector"><summary>更换卡片里的经历 <span id="picker-count">已选 ${selected.length} 段</span></summary><fieldset class="memory-picker"><legend class="sr-only">选择最多三段经历</legend>${memories.map(m=>`<label class="memory-option"><input type="checkbox" value="${esc(m.id)}" ${selected.includes(m.id)?'checked':''} data-memory><span><b>${m.age}岁</b>${esc(m.text.replace(new RegExp(`^${m.age}岁[，、：:\\s]*`),''))}</span></label>`).join('')}</fieldset></details><label class="caption-label" for="caption">想说的一句话 <span>可以留空</span></label><textarea id="caption" maxlength="80" rows="3" placeholder="你会怎样记住这一生？">${esc(caption)}</textarea><div class="caption-count"><span id="selected-count">已选 ${selected.length} / 3 段</span><span id="caption-count">${caption.length} / 80</span></div></div><div class="card-preview"><canvas id="share-canvas" width="960" height="1260" role="img" aria-label="陈知夏的人生卡片预览，使用已选中的真实经历"></canvas></div><div class="card-actions"><button type="button" class="primary-button save-card" data-action="save-card" id="save-card" disabled>保存卡片图片 ↓</button><p id="card-status" class="card-status" role="status">正在整理卡片…</p></div></div></section><button type="button" class="replay-button" data-action="restart">再过一次，试试另一种选择 ↻</button></section>`;
}

async function updateCard(){
  if(state.status!=='ended')return;
  const token=++drawing,canvas=game.querySelector('#share-canvas');if(!canvas)return;
  const memories=getMemories(state).filter(m=>selected.includes(m.id));
  cardReady=false;const button=game.querySelector('#save-card');button.disabled=true;
  game.querySelector('#selected-count').textContent=`已选 ${selected.length} / 3 段`;
  game.querySelector('#picker-count').textContent=`已选 ${selected.length} 段`;
  game.querySelector('#caption-count').textContent=`${caption.length} / 80`;
  try{
    const staged=document.createElement('canvas');await drawCard(staged,{profile:PROFILE,portrait:getPortrait(state.facts),memories,caption});
    if(token!==drawing||!canvas.isConnected)return;
    canvas.width=staged.width;canvas.height=staged.height;canvas.getContext('2d').drawImage(staged,0,0);
    cardReady=true;button.disabled=memories.length===0;
    game.querySelector('#card-status').textContent=memories.length?'卡片已更新。图片会保存在你的设备上。':'先选一段想留下的经历。';
  }catch(err){console.error(err);game.querySelector('#card-status').textContent='卡片暂时没能画好，请刷新后重试。';}
}
async function click(e){
  const panelButton=e.target.closest('[data-panel]');
  if(panelButton){openPanel(panelButton.dataset.panel,panelButton,panelButton.dataset.highlight);return;}
  if(e.target.closest('[data-close-panel]')){closePanel();return;}
  const focus=e.target.closest('[data-focus]');
  if(focus){
    try{const first=getLifeView(state).needsPlan;state=setFocus(state,focus.dataset.focus);if(first)manualPaused=false;save();feedback={text:`最近重心已改为：${getLifeView(state).focusOptions.find(o=>o.selected).label}。`,lines:['会继续沿用，日子经过时才结算投入。'],target:'plan'};closePanel(false);render();restartTimer();}
    catch(err){console.error(err);notify('现在暂时不能改安排，先处理眼前的决定。');}return;
  }
  const appointment=e.target.closest('[data-arrange]');
  if(appointment){
    try{state=arrange(state,appointment.dataset.arrange);save();const r=reservationSummary(state);feedback={text:`已约好：${r.activity}。`,lines:[`预留${r.reservedTime}个周末 · 其余${r.remainingTime}个随重心 · 约${r.reservedMoney.toLocaleString('zh-CN')}元待支出`],target:'plan'};closePanel(false);render();restartTimer();}
    catch(err){console.error(err);notify('今年暂时排不开，看看这里列出的条件。');}return;
  }
  const choice=e.target.closest('[data-choice]');
  if(choice&&choice.dataset.event===state.pending){
    try{state=choose(state,choice.dataset.choice);save();feedback={text:'这次决定已记下，之后会按当前模式继续生活。',lines:[],target:null};render('choice');restartTimer();}
    catch(err){console.error(err);notify('这段记录暂时没接上，请刷新回到刚才的决定。');}return;
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='begin')start(false);
  if(action==='young-sample')start(true);
  if(action==='clock')runClockAction();
  if(action==='latest')latest();
  if(action==='next'&&state.status==='living'&&!state.pending&&!getLifeView(state).needsPlan&&!activePanel){const next=getNextAge(state);if(next!==null)progress(Math.max(1,next-state.age));}
  if(action==='restart'){dialog.showModal();updateChrome();}
  if(action==='save-card'&&cardReady&&selected.length){const button=game.querySelector('#save-card');button.disabled=true;try{await saveCard(game.querySelector('#share-canvas'));game.querySelector('#card-status').textContent='图片已生成，浏览器会开始保存。';}catch(err){console.error(err);game.querySelector('#card-status').textContent='保存没有完成，请再试一次。';}finally{button.disabled=!cardReady||selected.length===0;}}
}
game.addEventListener('click',click);inspector.addEventListener('click',click);
game.addEventListener('change',e=>{
  if(e.target.id==='speed'){speed=Number(e.target.value);restartTimer();save();}
  if(e.target.matches('[data-memory]')){
    const input=e.target;
    if(input.checked){if(selected.length>=3){input.checked=false;notify('最多保留三段。可以先取消一段，再换成这一段。');return;}selected.push(input.value);}
    else selected=selected.filter(id=>id!==input.value);
    save();updateCard();
  }
});
game.addEventListener('input',e=>{if(e.target.id==='caption'){caption=e.target.value.slice(0,80);save();updateCard();}});
inspector.addEventListener('cancel',e=>{e.preventDefault();closePanel();});
inspector.addEventListener('close',()=>{if(activePanel){rememberPanel();activePanel=null;restartTimer();updateChrome();}});
document.querySelector('#restart').addEventListener('click',()=>{dialog.showModal();updateChrome();});
dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-dialog="cancel"]'))dialog.close();
  if(e.target.closest('[data-dialog="confirm"]')){resetViews();state=createGame();manualPaused=false;feedback=null;newCount=0;selected=[];caption='';cardReady=false;cardInitialized=false;drawing++;save();dialog.close();render('entry');window.scrollTo({top:0,behavior:'instant'});}
});
dialog.addEventListener('close',()=>{restartTimer();updateChrome();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.status==='living'){manualPaused=true;save();}updateChrome();});
setInterval(()=>{if(clock().canRun&&Date.now()>=nextStepAt)progress(1);},180);
render('entry');restartTimer();
