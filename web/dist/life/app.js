import { createGame, begin, advance, choose, getChoices, getCurrentScene, getMemories, getNextAge, validateSave } from './engine.js?v=1';
import { PROFILE, getPeople, getPortrait } from './content.js';
import { lifeScene, personArt } from './art.js';
import { drawCard, saveCard } from './card.js';

const KEY='china-life.save.v1';
const game=document.querySelector('#game'), dialog=document.querySelector('#restart-dialog');
const saveStatus=document.querySelector('#save-status');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={you:'陈知夏',father:'父亲',mother:'母亲',zhouzhou:'周舟',songwen:'宋闻',xuyang:'许阳',xiaoyin:'小尹'};
let state=createGame(),manualPaused=false,reading=false,speed=1,nextStepAt=0,selected=[],caption='',cardReady=false;
let drawing=0,cardInitialized=false;
try{
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
const delay=()=>950/speed;
const hold=()=>6500/speed;
const canRun=()=>state.status==='living'&&!state.pending&&!manualPaused&&!reading&&!dialog.open&&!document.hidden;
function timeLabel(){
  if(state.status==='ended')return '这一生已经结束';
  if(state.pending)return '有一件事，需要你决定';
  if(reading)return '读旧记录时，时光暂歇';
  return manualPaused?'时间已暂停':'日子在向前';
}
function yearMap(){
  const marks=new Set(state.choices.map(c=>c.age));
  return `<div class="year-map" aria-label="已经走过的年份，每格一年">${Array.from({length:86},(_,age)=>`<i data-year="${age}" class="${age<=state.age?'lived':''} ${age===state.age?'now':''} ${marks.has(age)?'marked':''}" title="${age}岁 · ${2005+age}年"></i>`).join('')}</div><div class="map-labels"><span>2005 · 出生</span><span>每格一年</span><span>${2005+state.age} · ${state.age}岁</span></div>`;
}
function timeBar(){
  return `<section class="life-time" aria-label="当前人生时间"><div class="age-heading"><div class="hero-portrait" aria-hidden="true">${personArt('you',state.age)}</div><div class="age"><b id="age-number">${state.age}</b><span>岁</span></div><div class="where"><strong id="year-number">${2005+state.age}年</strong><span>${esc(state.facts.city)} · 陈知夏</span></div><span id="time-status">${timeLabel()}</span></div>${yearMap()}<div class="time-controls"><button type="button" id="pause" class="quiet-button" data-action="pause" ${state.status==='ended'?'disabled':''}>${manualPaused?'▷ 继续':'Ⅱ 暂停'}</button><label class="speed">时光 <select aria-label="时间速度" id="speed" ${state.status==='ended'?'disabled':''}><option value="1" ${speed===1?'selected':''}>1×</option><option value="2" ${speed===2?'selected':''}>2×</option></select></label><button type="button" id="next" class="next-button" data-action="next" ${state.pending||state.status==='ended'?'disabled':''}>往后过一段 <span aria-hidden="true">→</span></button></div></section>`;
}
function peoplePanel(){
  const people=getPeople(state.facts);
  return `<aside class="people-panel"><details class="people-reader" data-reader><summary>生活里的人 <span>展开看看</span></summary><div class="person-list">${people.map(p=>`<article>${personArt(p.id,state.age)}<div><h3>${esc(p.name)}<span>${esc(p.relation)}</span></h3><p>${esc(p.detail)}</p></div></article>`).join('')}</div></details><div class="place-note"><span>住过的地方</span><p>${state.facts.cities.map(esc).join(' · ')}</p></div></aside>`;
}
function intro(){
  return `<section class="birth" id="current"><p class="eyebrow">2005年 · 中国 · 澄江</p><h1>这一生，你是陈知夏。</h1><div class="birth-art">${lifeScene(0)}</div><p class="birth-prose">父母经营一间家电维修铺。<br>柜台后面，放着你的婴儿床。</p><p class="birth-question">这个人，后来会过上怎样的生活？</p><button class="primary-button begin-button" type="button" data-action="begin">开始这一生 <span aria-hidden="true">→</span></button><p class="sample-note">本次为固定人物的完整人生试玩，未来经历均为虚构。</p></section>`;
}
function currentScene(){
  const scene=getCurrentScene(state);
  if(!scene)return '';
  const choices=getChoices(state);
  return `<section class="current-scene ${state.pending?'needs-choice':''}" id="current" aria-labelledby="scene-title"><div class="scene-heading"><p class="eyebrow">${scene.age}岁 · ${2005+scene.age}年 <span>${state.pending?'此刻的决定':scene.kind==='choice'?'你选择以后':'那一年'}</span></p><div class="scene-art">${lifeScene(scene.age,state.facts.city)}</div></div><h1 id="scene-title" tabindex="-1">${esc(scene.title)}</h1><p class="scene-text">${esc(scene.text)}</p>${scene.quote?`<blockquote>${personArt(scene.person,state.age)}<div><span>${esc(names[scene.person]||'')}</span><p>「${esc(scene.quote)}」</p></div></blockquote>`:''}${choices.length?`<div class="decision-label">你会怎样决定？</div><div class="choices">${choices.map(c=>`<button type="button" class="choice" data-choice="${esc(c.id)}" data-event="${esc(state.pending)}"><span><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small></span><b aria-hidden="true">→</b></button>`).join('')}</div>`:`<p class="scene-foot">${scene.kind==='choice'?'日子会接着往前。':'普通的日子，也在这一生里。'}</p>`}</section>`;
}
function archive(){
  const current=getCurrentScene(state)?.id;
  const entries=state.log.filter(e=>e.id!==current&&e.kind!=='end').slice().reverse();
  if(!entries.length)return '';
  const rows=items=>items.map(e=>`<details class="log-entry" data-reader><summary><time>${e.age}岁</time><span>${esc(e.title)}</span><small>${e.kind==='decision'?'当时的抉择':e.kind==='choice'?'你的选择':''}</small></summary><div class="log-body"><p>${esc(e.text)}</p>${e.quote?`<p class="log-quote">${esc(names[e.person]||'')}：「${esc(e.quote)}」</p>`:''}</div></details>`).join('');
  return `<section class="archive" aria-labelledby="archive-title"><div class="archive-heading"><h2 id="archive-title">过了的日子</h2><span>最新在最上面</span></div>${rows(entries.slice(0,5))}${entries.length>5?`<details class="older" data-reader><summary>更早的记录 <span>${entries.length-5} 条</span></summary>${rows(entries.slice(5))}</details>`:''}</section>`;
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
function render(){
  reading=false;
  if(state.status==='unborn'){game.className='unborn';game.innerHTML=intro();}
  else{
    game.className='has-life';
    if(state.status==='ended'&&!cardInitialized){chooseDefaults();cardInitialized=true;}
    game.innerHTML=`${timeBar()}${state.status==='ended'?`${ending()}${archive()}`:`<div class="living-layout"><div>${currentScene()}${archive()}</div>${peoplePanel()}</div>`}`;
  }
  for(const d of game.querySelectorAll('details[data-reader]'))d.addEventListener('toggle',()=>{
    reading=Boolean(game.querySelector('details[data-reader][open]'));
    nextStepAt=Date.now()+hold();updateTime();
  });
  if(state.status==='ended'){save();updateCard();}
  updateTime();
}
function updateTime(){
  const age=game.querySelector('#age-number');if(!age)return;
  game.querySelector('.hero-portrait').innerHTML=personArt('you',state.age);
  age.textContent=state.age;game.querySelector('#year-number').textContent=`${2005+state.age}年`;
  game.querySelector('#time-status').textContent=timeLabel();
  game.querySelector('#pause').textContent=state.status==='ended'?'已经结束':state.pending?'等你决定':manualPaused?'▷ 继续':'Ⅱ 暂停';
  game.querySelector('#pause').disabled=Boolean(state.pending||state.status==='ended');
  game.querySelector('#next').disabled=Boolean(state.pending||state.status==='ended');
  game.querySelector('.map-labels span:last-child').textContent=`${2005+state.age} · ${state.age}岁`;
  const marks=new Set(state.choices.map(c=>c.age));
  game.querySelectorAll('[data-year]').forEach(cell=>{const n=Number(cell.dataset.year);cell.className=`${n<=state.age?'lived':''} ${n===state.age?'now':''} ${marks.has(n)?'marked':''}`;});
  document.title=state.status==='ended'?'陈知夏的这一生 · 人生回顾':`${state.age}岁${state.pending?' · 待你决定':''} · 这一生`;
}
function progress(years,fromClick=false){
  const old=state;state=advance(state,years);save();
  const changed=old.log.length!==state.log.length;
  if(changed||old.pending!==state.pending||state.status!==old.status)render();else updateTime();
  nextStepAt=Date.now()+(changed?hold():delay());
  if(fromClick&&changed&&state.pending)document.querySelector('#scene-title')?.focus({preventScroll:true});
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
    const staged=document.createElement('canvas');
    await drawCard(staged,{profile:PROFILE,portrait:getPortrait(state.facts),memories,caption});
    if(token!==drawing||!canvas.isConnected)return;
    canvas.width=staged.width;canvas.height=staged.height;canvas.getContext('2d').drawImage(staged,0,0);
    cardReady=true;button.disabled=memories.length===0;
    game.querySelector('#card-status').textContent=memories.length?'卡片已更新。图片会保存在你的设备上。':'先选一段想留下的经历。';
  }catch(err){console.error(err);game.querySelector('#card-status').textContent='卡片暂时没能画好，请刷新后重试。';}
}

game.addEventListener('click',async e=>{
  const choice=e.target.closest('[data-choice]');
  if(choice&&choice.dataset.event===state.pending){
    try{state=choose(state,choice.dataset.choice);save();render();nextStepAt=Date.now()+hold();document.querySelector('#scene-title')?.focus({preventScroll:true});}
    catch(err){console.error(err);notify('这段记录暂时没接上，请刷新回到刚才的决定。');}
    return;
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='begin'){state=begin(state);manualPaused=false;save();render();nextStepAt=Date.now()+hold();game.scrollIntoView({block:'start',behavior:'instant'});}
  if(action==='pause'&&state.status==='living'){manualPaused=!manualPaused;nextStepAt=Date.now()+hold();updateTime();}
  if(action==='next'&&!state.pending&&state.status==='living'){
    const age=getNextAge(state);if(age!==null)progress(Math.max(1,age-state.age),true);
  }
  if(action==='restart')dialog.showModal();
  if(action==='save-card'&&cardReady&&selected.length){
    const button=game.querySelector('#save-card');button.disabled=true;
    try{await saveCard(game.querySelector('#share-canvas'));game.querySelector('#card-status').textContent='图片已生成，浏览器会开始保存。尚未发布到任何平台。';}
    catch(err){console.error(err);game.querySelector('#card-status').textContent='保存没有完成，请再试一次。';}
    finally{button.disabled=!cardReady||selected.length===0;}
  }
});
game.addEventListener('change',e=>{
  if(e.target.id==='speed'){speed=Number(e.target.value);nextStepAt=Date.now()+hold();save();}
  if(e.target.matches('[data-memory]')){
    const input=e.target;
    if(input.checked){if(selected.length>=3){input.checked=false;notify('最多保留三段。可以先取消一段，再换成这一段。');return;}selected.push(input.value);}
    else selected=selected.filter(id=>id!==input.value);
    save();updateCard();
  }
});
game.addEventListener('input',e=>{if(e.target.id==='caption'){caption=e.target.value.slice(0,80);save();updateCard();}});
document.querySelector('#restart').addEventListener('click',()=>dialog.showModal());
dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-dialog="cancel"]')){dialog.close();nextStepAt=Date.now()+hold();}
  if(e.target.closest('[data-dialog="confirm"]')){state=createGame();manualPaused=false;selected=[];caption='';cardReady=false;cardInitialized=false;save();dialog.close();render();window.scrollTo({top:0,behavior:'instant'});}
});
dialog.addEventListener('close',()=>{nextStepAt=Date.now()+hold();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.status==='living'){manualPaused=true;save();updateTime();}});
setInterval(()=>{if(canRun()&&Date.now()>=nextStepAt)progress(1);},180);
render();nextStepAt=Date.now()+hold();
