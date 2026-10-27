import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/calendar-engine.js';
import * as v5 from '../dist/calendar-engine-v5.js';
import * as v4 from '../dist/calendar-engine-v4.js';
import { PRACTICES, PROJECTS, STORIES } from '../dist/calendar-content.js';
const copy=value=>JSON.parse(JSON.stringify(value));
function ready(focus){return engine.advanceDays(engine.setFocus(engine.createGame(),focus),7);}
function prepared(projectId,approachId){
 const project=PROJECTS.find(item=>item.id===projectId);
 return engine.advanceDays(engine.startProject(ready(project.focusId),projectId,approachId),7);
}
function settle(state){return engine.choose(state,engine.getChoices(state).filter(item=>item.enabled).at(-1).id);}
function through(state,day){
 while(state.day<day&&state.phase!=='ended')state=state.pending?settle(state):engine.advanceDays(state,day-state.day);
 return state;
}
function finish(state){
 let guard=0;while(state.phase!=='ended'&&guard++<20)state=state.pending?settle(state):engine.advanceDays(state,91);
 assert.equal(state.phase,'ended');return state;
}
function oldFinish(state,api=v5){while(state.phase!=='ended')state=state.pending?api.choose(state,api.getChoices(state).filter(item=>item.enabled).at(-1).id):api.advanceDays(state,91);return state;}

test('a real approach is chosen before preparation; choosing never backfills prior practice',()=>{
 const before=ready('walk');
 assert.throws(()=>engine.startProject(before,'photo_set'),{code:'missing_approach'});
 assert.throws(()=>engine.setPractice(engine.createGame(),'record','observe'),{code:'practice_unavailable'});
 const state=engine.startProject(before,'photo_set','listen');
 assert.equal(state.day,7);assert.equal(state.project.progress,0);
 assert.deepEqual(state.skills,before.skills);assert.deepEqual(state.practiceDays,before.practiceDays);
 assert.equal(state.practicePlans.record.styleId,'listen');
 assert.equal(state.events.at(-1).practiceChange.styleId,'listen');
 assert.equal(engine.getGrowth(state)[0].practice.sourceEventId,state.events.at(-1).id);
 assert.equal(engine.getGrowth(state)[0].practice.capabilities.some(item=>item.unlocked),false);
 assert.equal(engine.validateSave(state).valid,true);
});

test('the same earlier project and equal walking time lead to different abilities and stories after one story choice',()=>{
 const preparedState=prepared('photo_set','observe');
 const base=engine.advanceDays(preparedState,91);
 assert.equal(base.pending.storyId,'lake_photo');assert.equal(base.day,35);
 const oldObject=copy(base.completedProjects[0]);
 const oldSnapshot=base.events.find(event=>event.id===oldObject.sourceEventId).text;
 let observer=engine.choose(base,'photo_same_place');
 let listener=engine.choose(base,'photo_walk');
 observer=engine.advanceDays(observer,20);listener=engine.advanceDays(listener,20);
 assert.deepEqual(observer.focusDays,listener.focusDays);assert.deepEqual(observer.skills,listener.skills);
 assert.deepEqual(observer.completedProjects,listener.completedProjects);
 assert.equal(observer.pending.storyId,'photo_wall');assert.equal(listener.pending.storyId,'photo_people');
 const a=engine.getGrowth(observer).find(item=>item.skillId==='record').practice;
 const b=engine.getGrowth(listener).find(item=>item.skillId==='record').practice;
 assert.equal(a.styleId,'observe');assert.equal(b.styleId,'listen');
 assert.notDeepEqual(a.capabilities.map(item=>item.title),b.capabilities.map(item=>item.title));
 assert.ok(a.sourceText.includes('再拍一次'));assert.ok(b.sourceText.includes('一起走走'));
 assert.notDeepEqual(engine.getChoices(observer).map(item=>item.id),engine.getChoices(listener).map(item=>item.id));
 assert.equal(listener.events.find(event=>event.id===oldObject.sourceEventId).text,oldSnapshot);
 assert.equal(listener.completedProjects[0].approachId,'observe','a new interest never rewrites an old set of landscape photographs');
 assert.equal(listener.practiceDays.record.listen,20);
 assert.equal(listener.practiceDays.record.observe,28);
});

test('equal club time branches through the earlier help-or-watch choice, beyond a cosmetic text variation',()=>{
 const base=engine.advanceDays(prepared('host_screen','curate'),91);
 assert.equal(base.pending.storyId,'club_screen');assert.equal(base.day,24);
 const curator=engine.advanceDays(engine.choose(base,'screen_watch'),29);
 const connector=engine.advanceDays(engine.choose(base,'screen_help'),29);
 assert.deepEqual(curator.focusDays,connector.focusDays);assert.deepEqual(curator.skills,connector.skills);
 assert.equal(curator.pending.storyId,'own_screen');assert.equal(connector.pending.storyId,'screen_circle');
 assert.equal(curator.practicePlans.organize.styleId,'curate');assert.equal(connector.practicePlans.organize.styleId,'connect');
 assert.notDeepEqual(engine.getChoices(curator).map(item=>item.id),engine.getChoices(connector).map(item=>item.id));
 const source=connector.events.find(item=>item.id===connector.practicePlans.organize.sourceEventId);
 assert.equal(source.choiceId,'screen_help');
 const result=engine.choose(connector,engine.getChoices(connector)[0].id).events.at(-1);
 assert.ok(result.sourceEventIds.includes(source.id));
});

test('changing a practice preserves the past and needs actual future practice to open its capability',()=>{
 let state=engine.setPractice(ready('walk'),'record','observe');state=engine.advanceDays(state,4);
 const history=copy(state.events),days=copy(state.practiceDays);
 state=engine.setPractice(state,'record','listen');
 assert.deepEqual(state.practiceDays,days);assert.deepEqual(state.events.slice(0,-1),history);
 assert.equal(engine.getGrowth(state)[0].practice.capabilities[0].unlocked,false);
 const noOp=engine.setPractice(state,'record','listen');assert.deepEqual(noOp,state);
 state=engine.advanceDays(state,3);assert.equal(engine.getGrowth(state)[0].practice.capabilities[0].unlocked,false);
 state=engine.advanceDays(state);assert.equal(engine.getGrowth(state)[0].practice.capabilities[0].unlocked,true);
 assert.equal(state.practiceDays.record.observe,4);assert.equal(state.practiceDays.record.listen,4);
 assert.equal(engine.getGrowth(state)[0].practiceOptions.find(item=>item.id==='observe').capabilities[0].unlocked,true);
});

test('a weekly record follows real daily practice and cites its actual source rather than the final-day selection',()=>{
 let state=engine.startProject(ready('walk'),'photo_set','observe');const originalSource=state.practicePlans.record.sourceEventId;
 state=engine.advanceDays(state,6);state=engine.setPractice(state,'record','listen');state=engine.advanceDays(state);
 const weekly=state.events.find(item=>item.day===14&&item.practice);
 assert.equal(weekly.practice.styleId,'observe');assert.equal(weekly.practice.days,6);
 assert.deepEqual(weekly.sourceEventIds,[originalSource]);
 assert.equal(state.practiceDays.record.listen,1);
});

test('changing practice pauses the original preparation and never fabricates a different completed object',()=>{
 let state=engine.advanceDays(engine.startProject(ready('walk'),'photo_set','observe'),3);
 state=engine.setPractice(state,'record','listen');state=engine.advanceDays(state,2);
 assert.equal(state.project.progress,3);assert.equal(state.project.approachId,'observe');
 assert.equal(engine.getProjects(state).find(item=>item.id==='photo_set').paused,true);
 state=engine.setPractice(state,'record','observe');state=engine.advanceDays(state,4);
 const completed=state.completedProjects[0],event=state.events.find(item=>item.id===completed.sourceEventId);
 assert.equal(completed.approachId,'observe');
 assert.equal(event.text,PROJECTS[0].approaches.find(item=>item.id==='observe').completeText);
 assert.equal(state.practiceDays.record.listen,2);assert.equal(state.practiceDays.record.observe,7);
 const frozen=event.text;state=engine.setPractice(state,'record','listen');state=engine.advanceDays(state,2);
 assert.equal(state.events.find(item=>item.id===event.id).text,frozen);
});

test('a family offers one actual opportunity and never gets grabbed by the earlier array entry for another style',()=>{
 let listener=engine.startProject(ready('walk'),'photo_set','listen');listener=through(listener,55);
 assert.equal(listener.pending.storyId,'photo_people');
 let state=engine.choose(listener,engine.getChoices(listener).at(-1).id);
 state=engine.setPractice(state,'record','observe');state=through(state,80);
 assert.equal(state.resolvedStories.includes('photo_wall'),false);
 assert.equal(state.pending?.storyId==='photo_wall',false);
 const ended=finish(state);
 const related=ended.resolvedStories.filter(id=>STORIES.find(item=>item.id===id)?.family==='photo_followup');
 assert.deepEqual(related,['photo_people']);assert.ok(ended.resolvedStories.length<=5);
});

test('high general familiarity cannot substitute for experience in a newly chosen specialist practice',()=>{
 let state=through(engine.setFocus(engine.createGame(),'walk'),40);
 if(state.pending)state=settle(state);
 state=engine.startProject(state,'photo_set','listen');state=engine.advanceDays(state,8);
 state=engine.advanceDays(engine.setFocus(state,'easy'),7);
 assert.equal(state.pending.storyId,'photo_people');
 assert.equal(state.skills.record,3);assert.equal(state.practiceDays.record.listen,8);
 const choices=engine.getChoices(state);assert.equal(choices[0].enabled,false);assert.equal(choices[1].enabled,true);
 assert.throws(()=>engine.choose(state,choices[0].id),{code:'missing_practice'});
});

test('fast forward stops at entry and genuine specialist growth, skipping empty familiarity levels',()=>{
 let state=engine.advanceToNextMoment(engine.setFocus(engine.createGame(),'walk'));
 assert.equal(state.day,7);state=engine.startProject(state,'photo_set','observe');
 state=engine.advanceToNextMoment(state);assert.equal(state.day,11);
 state=engine.advanceToNextMoment(state);assert.equal(state.day,14);
 state=engine.advanceToNextMoment(state);assert.equal(state.day,19,'18-day familiarity alone is no longer an interruption');
 assert.equal(state.practiceDays.record.observe,12);
});

test('idle calendar age and an unchosen practice never manufacture a specialist route',()=>{
 const before=engine.advanceDays(engine.setFocus(engine.createGame(),'walk'),20);
 assert.deepEqual(before.practiceDays.record,{observe:0,listen:0});
 assert.equal(engine.getGrowth(before)[0].practice,null);
 const ended=finish(before);assert.equal(ended.resolvedStories.some(id=>STORIES.find(item=>item.id===id)?.family),false);
 assert.ok(ended.events.filter(item=>item.kind==='daily'||item.kind==='calendar').length>ended.resolvedStories.length);
});

test('history and practice survive replay while altered points, sources and imported history are rejected',()=>{
 let state=engine.advanceDays(engine.startProject(ready('club'),'host_screen','connect'),4);
 const restored=engine.validateSave(JSON.stringify(state));assert.equal(restored.valid,true);
 assert.deepEqual(engine.advanceDays(restored.state,3),engine.advanceDays(state,3));
 for(const mutate of [
  s=>{s.practiceDays.organize.connect+=1;},s=>{s.practicePlans.organize.sourceEventId=s.events[0].id;},
  s=>{s.project.approachId='curate';},s=>{s.commands.at(-1).extra='unknown';},
 ]) {const bad=copy(state);mutate(bad);assert.equal(engine.validateSave(bad).valid,false);}
 const migrated=engine.migrateLegacySave(v5.advanceDays(v5.createGame(),10)).state;
 migrated.commands[0].snapshot.day=11;assert.equal(engine.validateSave(migrated).valid,false);
});

test('v0.5 initial, active, completed, pending and ended lives retain facts without inferring a past practice',()=>{
 const start=v5.createGame();
 let active=v5.advanceDays(v5.startProject(v5.advanceDays(v5.setFocus(start,'walk'),7),'photo_set'),3);
 active.events[1].text='以前亲手保存的原句。';active=v5.toggleFavorite(active,active.events[1].id);
 const completed=v5.advanceDays(active,4);
 let pending=v5.startProject(v5.advanceDays(v5.setFocus(v5.createGame(),'club'),7),'host_screen');
 while(pending.pending?.storyId!=='own_screen')pending=pending.pending?v5.choose(pending,v5.getChoices(pending).at(-1).id):v5.advanceDays(pending,91);
 const ended=oldFinish(v5.createGame());
 for(const old of[start,active,completed,pending,ended]) {
  const before=copy(old),result=engine.migrateLegacySave(JSON.stringify(old));assert.equal(result.valid,true);
  const state=result.state;
  for(const key of['runId','day','revision','phase','focus','focusDays','weekFocusDays','skills','peopleMet','flags','events','favorites','resolvedStories'])assert.deepEqual(state[key],old[key],key);
  assert.equal(state.pending?.storyId,old.pending?.storyId);assert.deepEqual(state.practicePlans,{record:null,organize:null});
  assert.equal(Object.values(state.practiceDays).flatMap(Object.values).every(n=>n===0),true);
  assert.equal(state.commands[0].type,'legacy.import');assert.deepEqual(old,before);assert.equal(engine.validateSave(state).valid,true);
 }
 const resumed=engine.migrateLegacySave(active).state;
 assert.equal(resumed.project.approachId,null);assert.equal(engine.advanceDays(resumed,4).completedProjects[0].approachId,null);
 const oldChoices=v5.getChoices(pending),migrated=engine.migrateLegacySave(pending).state;
 assert.deepEqual(engine.getChoices(migrated).map(item=>({id:item.id,enabled:item.enabled})),oldChoices.map(item=>({id:item.id,enabled:item.enabled})));
 assert.equal(engine.choose(migrated,oldChoices[0].id).resolvedStories.includes('own_screen'),true);
});

test('v0.4 records continue through verified old rules and may choose a new practice only from now on',()=>{
 let old=v4.advanceDays(v4.setFocus(v4.createGame(),'walk'),20);old=v4.toggleFavorite(old,old.events[0].id);
 let state=engine.migrateLegacySave(old).state;assert.deepEqual(state.events,old.events);assert.deepEqual(state.favorites,old.favorites);
 state=engine.setPractice(state,'record','listen');assert.equal(state.practiceDays.record.listen,0);
 state=engine.advanceDays(state,4);assert.equal(state.practiceDays.record.listen,4);assert.equal(state.day,24);
 const forged=copy(old);forged.skills.record=3;assert.equal(engine.migrateLegacySave(forged).valid,false);
});
