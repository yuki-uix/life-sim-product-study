import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/calendar-engine.js';
import * as v8 from '../dist/calendar-engine-v8.js';

const copy = value => JSON.parse(JSON.stringify(value));
const contacts = (state, personId) => state.events.filter(event => event.kind === 'social' && (!personId || event.personId === personId));
const offers = state => state.events.filter(event => event.kind === 'invitation');
const relationship = (state, personId) => engine.getRelationships(state).find(item => item.id === personId);
function settle(state, api = engine) {
  return api.choose(state,api.getChoices(state).filter(item=>item.enabled).at(-1).id);
}
function through(state,target,api = engine) {
  for (let guard=0;state.day<target&&state.phase!=='ended'&&guard<200;guard++) {
    state = state.pending ? settle(state,api) : api.advanceDays(state,1);
  }
  assert.equal(state.day,target);
  return state;
}
function meet(state,personId,actionId,api = engine) {
  for (let guard=0;guard<91&&state.phase!=='ended';guard++) {
    if(state.pending){state=settle(state,api);continue;}
    if(api.getSocialOptions(state,personId).find(item=>item.actionId===actionId)?.enabled) return api.socialize(state,personId,actionId);
    state=api.advanceDays(state,1);
  }
  assert.fail(`No open time for ${personId}/${actionId}`);
}
function ready(personId='ahe',actionId='chat',count=3,api=engine) {
  let state=api.createGame();
  if(personId!=='ahe')state=api.advanceDays(api.setFocus(state,personId==='xiaoman'?'club':'walk'),7);
  state=api.setFocus(state,'easy');
  for(let i=0;i<count;i++)state=meet(state,personId,actionId,api);
  return state;
}
function untilInvitation(state) {
  for(let guard=0;guard<91&&!state.invitation&&state.phase!=='ended';guard++)state=state.pending?settle(state):engine.advanceDays(state,1);
  assert.ok(state.invitation,'a real familiar history eventually receives an invitation');
  return state;
}
function replyable(state) {
  for(let guard=0;guard<12&&state.invitation;guard++) {
    if(state.pending){state=settle(state);continue;}
    if(engine.getInvitation(state).acceptEnabled)return state;
    state=engine.advanceDays(state,1);
  }
  assert.fail('invitation did not have another available free period');
}
function finish(state,api=engine) {
  for(let guard=0;state.phase!=='ended'&&guard<150;guard++)state=state.pending?settle(state,api):api.advanceDays(state,1);
  assert.equal(state.phase,'ended');return state;
}

test('reciprocal contact needs actual history and arises later without interrupting ordinary time',()=>{
  const quiet=through(engine.createGame(),50);
  assert.equal(offers(quiet).length,0);
  const afterVisits=ready();
  assert.equal(afterVisits.invitation,null,'an action does not cause an instant return gift');
  const last=contacts(afterVisits,'ahe').at(-1),state=untilInvitation(afterVisits);
  assert.ok(state.day-last.day>=3);
  assert.equal(state.pending,null);
  assert.equal(state.invitation.personId,'ahe');
  assert.equal(state.invitation.actionId,'chat');
  assert.ok(state.invitation.sourceEventIds.some(id=>contacts(afterVisits,'ahe').some(event=>event.id===id)));
  assert.equal(contacts(state).length,contacts(afterVisits).length,'a message is not a completed encounter');
  const next=engine.advanceDays(state,1);
  assert.equal(next.day,state.day+1);assert.equal(next.invitation.id,state.invitation.id);
});

test('the kind of return invitation follows actual shared activity rather than only calendar age',()=>{
  const talking=untilInvitation(ready('ahe','chat'));
  const doing=untilInvitation(ready('ahe','activity'));
  assert.equal(talking.invitation.actionId,'chat');
  assert.equal(doing.invitation.actionId,'activity');
  const sourceIds=doing.invitation.sourceEventIds;
  assert.ok(sourceIds.some(id=>doing.events.find(event=>event.id===id)?.actionId==='activity'));
  assert.notEqual(talking.invitation.text,doing.invitation.text);
});

test('a next-moment advance stops at a new invitation while direct calendar advance stays nonblocking',()=>{
  const initial=ready();
  const state=engine.advanceToNextMoment(initial);
  assert.ok(state.invitation);assert.equal(state.pending,null);
  const later=engine.advanceDays(initial,state.day-initial.day+1);
  assert.equal(later.day,state.day+1);assert.equal(later.invitation.id,state.invitation.id);
});

test('accepting an invitation records the other person as initiator and costs one real free period',()=>{
  let state=engine.advanceDays(engine.setFocus(engine.createGame(),'walk'),7);
  state=engine.startProject(state,'photo_set','observe');state=engine.setFocus(state,'easy');
  for(let i=0;i<3;i++)state=meet(state,'ahe','chat');
  state=replyable(untilInvitation(state));state=engine.setFocus(state,'walk');
  const before=copy(state),invitation=engine.getInvitation(state);
  const after=engine.replyToInvitation(state,invitation.id,'accept');
  const encounter=contacts(after).at(-1);
  assert.equal(after.day,before.day+1);assert.equal(after.socialDays,before.socialDays+1);
  assert.equal(after.focus,before.focus);assert.deepEqual(after.focusDays,before.focusDays);
  assert.deepEqual(after.practiceDays,before.practiceDays);assert.deepEqual(after.project,before.project);
  assert.equal(after.invitation,null);
  assert.equal(encounter.initiator,'npc');assert.equal(encounter.sourceInvitationId,invitation.id);
  assert.ok(encounter.sourceEventIds.includes(invitation.id));
  assert.equal(encounter.personId,invitation.personId);assert.equal(encounter.actionId,invitation.actionId);
  assert.equal(after.commands.length,before.commands.length+1);assert.equal(after.revision,before.revision+1);
  assert.equal(relationship(after,'ahe').contactCount,relationship(before,'ahe').contactCount+1);
  assert.deepEqual(state,before);
});

test('declining is zero-time, preserves the relationship and leaves one clear reply without generating another invitation',()=>{
  const state=untilInvitation(ready()),before=copy(state),relation=relationship(state,'ahe');
  const result=engine.replyToInvitation(state,state.invitation.id,'decline');
  assert.equal(result.day,state.day);assert.equal(result.socialDays,state.socialDays);
  assert.equal(result.invitation,null);assert.deepEqual(relationship(result,'ahe'),relation);
  const reply=result.events.at(-1);
  assert.equal(reply.kind,'invitation_reply');assert.equal(reply.outcome,'declined');
  assert.equal(reply.sourceInvitationId,state.invitation.id);assert.ok(reply.reaction.text);
  assert.deepEqual(state,before);
  assert.equal(engine.advanceDays(result,1).invitation,null);
});

test('reading and deferring an invitation do not create a contact or mutate its persisted facts',()=>{
  const state=untilInvitation(ready()),before=copy(state);
  const view=engine.getInvitation(state);
  assert.ok(view.title&&view.text);assert.equal(view.expiresDay-state.day,10);
  assert.deepEqual(state,before);
  const restored=engine.validateSave(JSON.stringify(state));assert.equal(restored.valid,true);
  assert.deepEqual(engine.getInvitation(restored.state),view);
  assert.equal(contacts(restored.state).length,contacts(before).length);
});

test('availability is rechecked for the current next day before accepting a previously open invitation',()=>{
  let state=untilInvitation(ready());
  assert.equal(engine.getInvitation(state).acceptEnabled,true);
  const id=state.invitation.id;
  for(let guard=0;guard<10&&engine.getInvitation(state)?.acceptEnabled;guard++)state=engine.advanceDays(state,1);
  const view=engine.getInvitation(state);assert.ok(view);assert.equal(view.id,id);
  assert.equal(view.acceptEnabled,false);assert.ok(view.reason);assert.ok(view.nextAvailableDay>state.day+1);
  const before=copy(state);
  assert.throws(()=>engine.replyToInvitation(state,id,'accept'),{code:'social_unavailable'});
  assert.deepEqual(state,before);
});

test('an expired invitation archives once without relationship loss, a contact, or a same-day replacement',()=>{
  const initial=untilInvitation(ready()),id=initial.invitation.id;
  const relation=relationship(initial,'ahe'),count=contacts(initial).length;
  const expired=through(initial,initial.invitation.expiresDay+1);
  assert.equal(expired.invitation,null);assert.equal(contacts(expired).length,count);
  assert.deepEqual(relationship(expired,'ahe'),relation);
  const archived=expired.events.filter(event=>event.sourceInvitationId===id&&event.outcome==='expired');
  assert.equal(archived.length,1);
  const later=engine.advanceDays(expired,1);
  assert.equal(later.events.filter(event=>event.sourceInvitationId===id&&event.outcome==='expired').length,1);
});

test('ordinary social plans resolve an outstanding offer for that person instead of leaving a stale invitation',()=>{
  const initial=replyable(untilInvitation(ready()));
  const same=engine.socialize(initial,'ahe',initial.invitation.actionId);
  assert.equal(same.invitation,null);
  assert.equal(contacts(same).at(-1).sourceInvitationId,initial.invitation.id);
  assert.equal(contacts(same).at(-1).invitationOutcome,'accepted-by-plan');
  assert.equal(contacts(same).at(-1).initiator,'player');
  let different=initial;
  const other=initial.invitation.actionId==='chat'?'activity':'chat';
  for(let guard=0;guard<10&&!engine.getSocialOptions(different,'ahe').find(item=>item.actionId===other)?.enabled;guard++)different=engine.advanceDays(different,1);
  assert.ok(different.invitation);
  const id=different.invitation.id;
  different=engine.socialize(different,'ahe',other);
  assert.equal(different.invitation,null);
  assert.equal(contacts(different).at(-1).sourceInvitationId,id);
  assert.equal(contacts(different).at(-1).invitationOutcome,'met-otherwise');
});

test('three familiar people take turns returning with sparse invitations and real open schedules',()=>{
  let state=engine.advanceDays(engine.setFocus(engine.createGame(),'club'),7);
  state=engine.advanceDays(engine.setFocus(state,'walk'),7);state=engine.setFocus(state,'easy');
  for(const personId of ['ahe','xiaoman','linye'])for(let i=0;i<3;i++)state=meet(state,personId,'chat');
  if(state.invitation)state=engine.replyToInvitation(state,state.invitation.id,'decline');
  const delivered=[];
  for(let guard=0;state.day<85&&delivered.length<6&&guard<100;guard++) {
    state=state.pending?settle(state):engine.advanceDays(state,1);
    if(state.invitation) {
      const view=engine.getInvitation(state);
      assert.equal(view.acceptEnabled,true);
      delivered.push(copy(state.invitation));
      state=engine.replyToInvitation(state,state.invitation.id,'decline');
    }
  }
  assert.ok(delivered.length>=3);
  assert.equal(new Set(delivered.slice(0,3).map(item=>item.personId)).size,3);
  for(let i=1;i<delivered.length;i++)assert.ok(delivered[i].day-delivered[i-1].day>=7);
  for(const personId of ['ahe','xiaoman','linye']) {
    const list=delivered.filter(item=>item.personId===personId);
    for(let i=1;i<list.length;i++)assert.ok(list[i].day-list[i-1].day>=10);
  }
});

test('story decisions take priority and neither stale nor repeated replies can create extra encounters',()=>{
  let state=through(engine.createGame(),46);
  for(let i=0;i<3;i++)state=meet(state,'ahe','chat');
  state=untilInvitation(state);assert.ok(state.day<60);
  state=through(state,59);const id=state.invitation.id;
  state=engine.advanceDays(state,1);
  assert.equal(state.pending.storyId,'lights_out');assert.equal(state.invitation.id,id);
  assert.equal(engine.getInvitation(state).acceptEnabled,false);
  assert.throws(()=>engine.replyToInvitation(state,id,'accept'),{code:'pending_story'});
  assert.throws(()=>engine.replyToInvitation(state,id,'decline'),{code:'pending_story'});
  state=engine.choose(state,'lights_rest');state=replyable(state);
  const before=copy(state),revision=state.revision;
  assert.throws(()=>engine.replyToInvitation(state,id,'accept',revision-1),{code:'stale_revision'});
  assert.throws(()=>engine.replyToInvitation(state,'unknown','accept'),{code:'unknown_invitation'});
  assert.throws(()=>engine.replyToInvitation(state,id,'invented'),{code:'unknown_invitation_reply'});
  const after=engine.replyToInvitation(state,id,'accept',revision);
  assert.throws(()=>engine.replyToInvitation(after,id,'accept',revision),{code:'stale_revision'});
  assert.throws(()=>engine.replyToInvitation(after,id,'accept'),{code:'unknown_invitation'});
  assert.deepEqual(state,before);
});

test('invitations and replies replay strictly, including initiator, exact sources and deadline',()=>{
  const state=untilInvitation(ready());
  assert.equal(engine.validateSave(state).valid,true);
  for(const mutate of [
    s=>{s.invitation.expiresDay+=1;},s=>{s.invitation.actionId='activity';},
    s=>{s.events.find(event=>event.kind==='invitation').sourceEventIds=[s.events[0].id];},
    s=>{s.invitation.text='unlived offer';},
  ]) {const bad=copy(state);mutate(bad);assert.equal(engine.validateSave(bad).valid,false);}
  const accepted=engine.replyToInvitation(replyable(state),state.invitation.id,'accept');
  const restored=engine.validateSave(JSON.stringify(accepted));assert.equal(restored.valid,true);assert.deepEqual(restored.state,accepted);
  for(const mutate of [
    s=>{s.events.findLast(event=>event.kind==='social').initiator='player';},
    s=>{s.events.findLast(event=>event.kind==='social').sourceInvitationId=s.events[0].id;},
    s=>{s.commands.at(-1).reply='decline';},
  ]) {const bad=copy(accepted);mutate(bad);assert.equal(engine.validateSave(bad).valid,false);}
});

test('v0.8 imports preserve active social lives, responses, pending choices and endings without inventing old invitations',()=>{
  const initial=v8.createGame();
  let social=ready('ahe','chat',3,v8);social=v8.toggleFavorite(social,contacts(social).at(-1).id);
  let project=v8.advanceDays(v8.setFocus(v8.createGame(),'walk'),7);
  project=v8.advanceDays(v8.startProject(project,'photo_set','listen'),3);
  const pending=v8.advanceDays(v8.createGame(),60),ended=finish(v8.createGame(),v8);
  for(const old of [initial,social,project,pending,ended]) {
    const before=copy(old),result=engine.migrateLegacySave(JSON.stringify(old));
    assert.equal(result.valid,true);
    const current=result.state;
    for(const key of ['day','revision','phase','focus','focusDays','skills','peopleMet','flags','events','favorites','resolvedStories','practiceDays','practicePlans','weekPracticeInputs','project','completedProjects','socialDays','weekSocialDays'])assert.deepEqual(current[key],old[key],key);
    assert.equal(current.schemaVersion,9);assert.equal(current.invitation,null);assert.equal(offers(current).length,0);
    if(old.pending){assert.equal(current.pending.legacyVersion,8);assert.deepEqual(engine.getChoices(current),v8.getChoices(old));}
    assert.equal(engine.validateSave(current).valid,true);assert.deepEqual(old,before);
  }
  const resumed=engine.migrateLegacySave(social).state;
  assert.ok(untilInvitation(resumed).invitation);
  const invalid=copy(social);invalid.events.at(-1).reaction.variant='fake';
  assert.equal(engine.migrateLegacySave(invalid).valid,false);
});

test('an existing familiar shared story can prompt a return visit without requiring new player-initiated clicks',()=>{
  let state=engine.advanceDays(engine.setFocus(engine.createGame(),'walk'),91);
  assert.equal(state.pending.storyId,'lake_photo');
  state=engine.choose(state,'photo_same_place');
  const shared=state.events.at(-1);
  assert.equal(contacts(state).length,0);assert.equal(state.invitation,null);
  state=untilInvitation(state);
  assert.equal(state.invitation.personId,'linye');
  assert.ok(state.day-shared.day>=3);
  assert.ok(state.invitation.sourceEventIds.includes(shared.id));
  assert.equal(contacts(state).length,0);
});

test('the final valid free period can answer an invitation and the ending archives unanswered ones once',()=>{
  let state=through(engine.createGame(),76);
  for(let i=0;i<3;i++)state=meet(state,'ahe','chat');
  state=untilInvitation(state);
  assert.ok(state.day<89);assert.equal(state.invitation.expiresDay,89);
  const initial=copy(state),id=state.invitation.id;
  state=through(state,89);
  assert.equal(state.invitation.id,id);assert.equal(engine.getInvitation(state).acceptEnabled,true);
  const count=contacts(state).length;
  const accepted=engine.replyToInvitation(state,id,'accept');
  assert.equal(accepted.day,90);assert.equal(accepted.phase,'ended');assert.equal(accepted.invitation,null);
  assert.equal(contacts(accepted).length,count+1);
  assert.throws(()=>engine.replyToInvitation(accepted,id,'decline'),{code:'game_ended'});
  const unanswered=through(initial,90);
  assert.equal(unanswered.phase,'ended');assert.equal(unanswered.invitation,null);
  assert.equal(unanswered.events.filter(event=>event.sourceInvitationId===id&&event.outcome==='expired').length,1);
  assert.equal(engine.validateSave(unanswered).valid,true);
});
