/** Campus calendar and history-shaped practice. Pure rules, without a clock or DOM. */
import { CONFIG, PEOPLE, SKILLS, FOCUSES, CALENDAR_LOGS, STORIES, AFTER_LOGS, PROJECTS, CAPABILITIES, PRACTICES, weeklyText, practiceWeeklyText, dateInfo } from './calendar-content.js?v=0.9.0';
import { validateSave as validateV8, migrateLegacySave as migratePreV8 } from './calendar-engine-v8.js';
import { STORIES as V5_STORIES } from './calendar-content-v5.js';
import { STORIES as V6_STORIES } from './calendar-content-v6.js';
import { STORIES as V7_STORIES } from './calendar-content-v7.js';
import { STORIES as V8_STORIES } from './calendar-content-v8.js';
import { getSocialContext, getReaction, getReactionEcho } from './campus-reactions.js?v=0.9.0';
import { socialOptionsFor, buildSocialEvent } from './campus-social.js?v=0.9.0';
import { invitationCandidate, buildInvitationEncounter, buildInvitationDecline } from './campus-invitations.js?v=0.9.0';
export { CONFIG };
const FOCUS_IDS = FOCUSES.map(item => item.id);
const SKILL_IDS = Object.keys(SKILLS);
const STORY_BY_ID = new Map(STORIES.map(item => [item.id, item]));
const V5_STORY_BY_ID = new Map(V5_STORIES.map(item => [item.id, item]));
const V6_STORY_BY_ID = new Map(V6_STORIES.map(item => [item.id, item]));
const V7_STORY_BY_ID = new Map(V7_STORIES.map(item => [item.id, item]));
const V8_STORY_BY_ID = new Map(V8_STORIES.map(item => [item.id, item]));
const PROJECT_BY_ID = new Map(PROJECTS.map(item => [item.id, item]));
const LOCATIONS = new Set(['gate', 'dorm', 'lake', 'club', 'hall']);
const MAX_COMMANDS = 2048;
const clone = value => JSON.parse(JSON.stringify(value));
const focusFor = skillId => skillId === 'record' ? 'walk' : 'club';
const skillFor = focusId => focusId === 'walk' ? 'record' : focusId === 'club' ? 'organize' : null;
const practiceFor = (skillId, styleId) => PRACTICES[skillId]?.find(item => item.id === styleId);
let fallbackId = 0;
function fail(code, message) { const error = new Error(message); error.code = code; return error; }
function practiceState() {
  return { practicePlans: Object.fromEntries(SKILL_IDS.map(id => [id, null])),
    practiceDays: Object.fromEntries(SKILL_IDS.map(id => [id, Object.fromEntries(PRACTICES[id].map(style => [style.id, 0]))])),
    weekPracticeInputs: [] };
}
function appendEvent(state, data) {
  const event = { id: `${state.runId}:log:${state.events.length + 1}`, day: state.day, ...data };
  state.events.push(event); return event;
}
function initialState(runId) {
  const state = { schemaVersion: CONFIG.schemaVersion, rulesVersion: CONFIG.version, runId,
    day: 0, revision: 0, phase: 'living', focus: 'easy',
    focusDays: Object.fromEntries(FOCUS_IDS.map(id => [id, 0])),
    weekFocusDays: Object.fromEntries(FOCUS_IDS.map(id => [id, 0])),
    skills: Object.fromEntries(SKILL_IDS.map(id => [id, 0])), peopleMet: ['ahe'], flags: {},
    events: [], favorites: [], pending: null, resolvedStories: [], commands: [],
    project: null, completedProjects: [], socialDays: 0, weekSocialDays: 0, invitation: null, ...practiceState() };
  for (const entry of CALENDAR_LOGS.filter(item => item.day === 0)) appendEvent(state, {
    kind: entry.kind || 'calendar', title: '九月，开学了', text: entry.text, location: entry.location, contentId: entry.id });
  return state;
}
export function createGame() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${++fallbackId}`;
  return initialState(`campus_${uuid}`);
}
function recordCommand(state, command) {
  if (state.commands.length >= MAX_COMMANDS) throw fail('record_limit', '这份校园记录暂时装不下更多操作。');
  state.commands.push(command); state.revision += 1;
}
function assertRevision(state, expectedRevision) {
  if (!Number.isInteger(expectedRevision) || expectedRevision !== state.revision) throw fail('stale_revision', '眼前的生活已经变化，请使用当前选项。');
}
function skillLevel(days) { return days >= 35 ? 3 : days >= 18 ? 2 : days >= 7 ? 1 : 0; }
function practiceAllowed(state, requirement) {
  if (!requirement) return true;
  const { skillId, styleId, min, current } = requirement;
  return !!practiceFor(skillId, styleId) && state.practiceDays[skillId][styleId] >= min
    && (!current || state.practicePlans[skillId]?.styleId === styleId);
}
function familyResolved(state, story) {
  return !!story.family && state.resolvedStories.some(id => STORY_BY_ID.get(id)?.family === story.family);
}
function canOpenStory(state, story) {
  return !state.resolvedStories.includes(story.id) && !familyResolved(state, story)
    && state.day >= story.fromDay && state.day <= story.toDay
    && (!story.requiresFocus || state.focusDays[story.requiresFocus] >= story.minDays)
    && (!story.personId || state.peopleMet.includes(story.personId))
    && (!story.requiresProject || state.completedProjects.some(project => project.id === story.requiresProject))
    && (!story.requiresSkill || state.skills[story.requiresSkill.id] >= story.requiresSkill.min)
    && practiceAllowed(state, story.requiresPractice);
}
function sourcesForStory(state, story) {
  const ids = new Set();
  if (story.requiresFocus) for (const event of state.events) {
    if (event.focusId === story.requiresFocus || (event.kind === 'meeting' && event.personId === story.personId)) ids.add(event.id);
  }
  if (story.requiresProject) {
    const project = state.completedProjects.find(item => item.id === story.requiresProject);
    if (project) ids.add(project.sourceEventId);
  }
  if (story.requiresPractice) {
    const { skillId, styleId } = story.requiresPractice;
    const source = state.practicePlans[skillId];
    if (source?.styleId === styleId) ids.add(source.sourceEventId);
    for (const event of state.events) if (event.practice?.skillId === skillId && event.practice.styleId === styleId) ids.add(event.id);
  }
  return [...ids];
}
function openAvailableStory(state) {
  if (state.pending || state.phase === 'ended') return;
  const story = STORIES.find(item => canOpenStory(state, item));
  if (story) state.pending = { storyId: story.id };
}
function settleInvitation(state, allowOffer = false) {
  const invitation = state.invitation;
  if (invitation && (state.day > invitation.expiresDay || state.phase === 'ended')) {
    appendEvent(state,{kind:'invitation_reply',outcome:'expired',title:'这次邀约没有排上',
      text:`${PEOPLE[invitation.personId].name}之前提过的这次相处，后来没有定下来。你们各自照常过日常。`,
      location:invitation.location,personId:invitation.personId,actionId:invitation.actionId,
      sourceInvitationId:invitation.id,sourceEventIds:[invitation.id]});
    state.invitation = null;
  }
  if (!allowOffer || state.invitation || state.pending || state.phase === 'ended') return;
  const contexts = state.peopleMet.map(id=>({id,...getSocialContext(state,id)}));
  const candidate = invitationCandidate(state,contexts,CONFIG.totalDays);
  if (candidate) state.invitation = clone(appendEvent(state,{...candidate,kind:'invitation'}));
}
function invitationView(state) {
  const invitation = state.invitation;
  if (!invitation) return null;
  const option = socialOptionsFor(state,invitation.personId,CONFIG.totalDays).find(item=>item.actionId===invitation.actionId);
  const current = state.day <= invitation.expiresDay && state.phase !== 'ended';
  const reason = !current ? '这次邀约已经过去了。' : option?.reason || '';
  const nextAvailableDay = Number.isInteger(option?.nextAvailableDay) && option.nextAvailableDay <= invitation.expiresDay + 1
    ? option.nextAvailableDay : null;
  return {...clone(invitation),acceptEnabled:current&&!!option?.enabled,replyEnabled:current&&!state.pending,
    reason,whenDay:state.day+1,nextAvailableDay};
}
function reduceFocus(previous, focusId) {
  if (!FOCUS_IDS.includes(focusId)) throw fail('unknown_focus', '没有这项生活安排。');
  if (previous.phase === 'ended') throw fail('game_ended', '这段秋季生活已经结束。');
  if (previous.pending) throw fail('pending_story', '先回应眼前的事，再调整接下来的安排。');
  const state = clone(previous); if (focusId === state.focus) return state;
  state.focus = focusId; recordCommand(state, { type: 'focus', focusId }); return state;
}
function setPlan(state, skillId, styleId, sourceEventId) { state.practicePlans[skillId] = { styleId, sourceEventId }; }
function reducePractice(previous, skillId, styleId, expectedRevision = previous.revision) {
  assertRevision(previous, expectedRevision);
  const style = practiceFor(skillId, styleId);
  if (!style) throw fail('unknown_practice', '没有这种练习方式。');
  if (previous.phase === 'ended') throw fail('game_ended', '这段秋季生活已经结束。');
  if (previous.pending) throw fail('pending_story', '先回应眼前的事，再换一种练法。');
  if (previous.skills[skillId] < 1) throw fail('practice_unavailable', `先在日常里接触一下${SKILLS[skillId].name}，再决定想怎样试。`);
  const state = clone(previous); if (state.practicePlans[skillId]?.styleId === styleId) return state;
  const event = appendEvent(state, { kind: 'direction', title: style.action,
    text: `接下来${focusFor(skillId) === 'walk' ? '散步记录' : '去活动室'}时，你想试着${style.action}。`,
    location: focusFor(skillId) === 'walk' ? 'lake' : 'club', practiceChange: { skillId, styleId } });
  setPlan(state, skillId, styleId, event.id);
  recordCommand(state, { type: 'practice', skillId, styleId }); return state;
}
function projectOptions(state) {
  return PROJECTS.map(project => {
    const completed = state.completedProjects.find(item => item.id === project.id);
    const active = state.project?.id === project.id;
    const approachId = active ? state.project.approachId : completed?.approachId ?? null;
    const approach = project.approaches.find(item => item.id === approachId) || null;
    const differentPractice = active && approachId && state.practicePlans[project.requiresSkill.id]?.styleId !== approachId;
    const paused = !!active && (state.focus !== project.focusId || differentPractice);
    let reason = '';
    if (completed) reason = '这件准备已经做过了。';
    else if (active) reason = paused ? '这件准备的做法先留在这里，换回原来的日常和练法时再继续。' : '正在慢慢做。';
    else if (state.phase === 'ended') reason = '这段秋季生活已经结束。';
    else if (state.pending) reason = '先回应眼前的事。';
    else if (state.project) reason = '先做完或放下手头的这件事。';
    else if (state.skills[project.requiresSkill.id] < project.requiresSkill.min) reason = `先让${SKILLS[project.requiresSkill.id].name}达到“${SKILLS[project.requiresSkill.id].stages[project.requiresSkill.min]}”。`;
    else if (project.personId && !state.peopleMet.includes(project.personId)) reason = `还没有认识${PEOPLE[project.personId].name}。`;
    else if (state.day + project.duration > CONFIG.totalDays - 1) reason = '这个秋天剩下的时间不够慢慢准备了。';
    return { ...clone(project), approachId, approach: clone(approach), paused, reason, enabled: !reason,
      status: completed ? 'completed' : active ? 'active' : reason ? 'locked' : 'available',
      progress: completed ? project.duration : active ? state.project.progress : 0 };
  });
}
function reduceStartProject(previous, projectId, approachId, expectedRevision = previous.revision) {
  assertRevision(previous, expectedRevision);
  const project = PROJECT_BY_ID.get(projectId);
  if (!project) throw fail('unknown_project', '没有这件想试的事。');
  const option = projectOptions(previous).find(item => item.id === projectId);
  if (!option.enabled) throw fail('project_unavailable', option.reason);
  const approach = project.approaches.find(item => item.id === approachId);
  if (!approach) throw fail('missing_approach', '先决定这件事想怎样试。');
  const state = clone(previous);
  state.project = { id: projectId, progress: 0, startDay: state.day, approachId };
  state.focus = project.focusId;
  const skillId = project.requiresSkill.id;
  const event = appendEvent(state, { kind: 'direction', title: approach.title, text: approach.startText,
    location: project.location, projectId, practiceChange: { skillId, styleId: approachId } });
  setPlan(state, skillId, approachId, event.id);
  recordCommand(state, { type: 'project.start', projectId, approachId }); return state;
}
function reduceCancelProject(previous, expectedRevision = previous.revision) {
  assertRevision(previous, expectedRevision);
  if (previous.phase === 'ended') throw fail('game_ended', '这段秋季生活已经结束。');
  if (previous.pending) throw fail('pending_story', '先回应眼前的事，再调整手头的安排。');
  if (!previous.project) throw fail('no_active_project', '现在没有正在准备的事。');
  const state = clone(previous); state.project = null;
  recordCommand(state, { type: 'project.cancel' }); return state;
}
function progressProject(state) {
  if (!state.project) return;
  const project = PROJECT_BY_ID.get(state.project.id);
  if (state.focus !== project.focusId) return;
  if (state.project.approachId && state.practicePlans[project.requiresSkill.id]?.styleId !== state.project.approachId) return;
  state.project.progress += 1; if (state.project.progress < project.duration) return;
  const { startDay, approachId } = state.project;
  const approach = project.approaches.find(item => item.id === approachId);
  const sources = state.events.filter(event => event.day <= startDay && (event.focusId === project.focusId || event.personId === project.personId || event.projectId === project.id)).map(event => event.id);
  const event = appendEvent(state, { kind: 'project', title: project.title, text: approach?.completeText || project.completeText,
    location: project.location, projectId: project.id, approachId, focusId: project.focusId, sourceEventIds: sources });
  state.completedProjects.push({ id: project.id, day: state.day, sourceEventId: event.id, approachId }); state.project = null;
}
function weeklyRecord(state) {
  if (state.weekSocialDays >= 4) {
    const encounters = state.events.filter(event => event.kind === 'social' && event.day > state.day - 7 && event.day <= state.day);
    const names = [...new Set(encounters.map(event => PEOPLE[event.personId].name))];
    const chats = encounters.some(event => event.actionId === 'chat');
    const activities = encounters.some(event => event.actionId === 'activity');
    const detail = chats && activities ? '有时只是聊几句，有时约着一起做点小事。'
      : chats ? '话题从眼前的小事接起，没聊完的就留到下次。' : '几段课余约着一起过，事情做到了哪儿，就先停在哪儿。';
    appendEvent(state, {kind:'daily', contentId:'social_week', text:`这周有几次，和${names.join('、')}一起过了段课余。${detail}`,
      location:encounters.at(-1)?.location || 'dorm', sourceEventIds:encounters.map(event => event.id)});
    state.weekFocusDays = Object.fromEntries(FOCUS_IDS.map(id=>[id,0])); state.weekPracticeInputs=[]; state.weekSocialDays=0;
    return;
  }
  const weeklyFocus = [...FOCUS_IDS].sort((a,b) => state.weekFocusDays[b]-state.weekFocusDays[a] || (a===state.focus ? -1 : b===state.focus ? 1 : 0))[0];
  const skillId = skillFor(weeklyFocus);
  const inputs = state.weekPracticeInputs.filter(item => item.skillId === skillId);
  const totals = skillId ? PRACTICES[skillId].map(style => ({styleId:style.id,count:inputs.filter(item=>item.styleId===style.id).length})).sort((a,b)=>b.count-a.count) : [];
  const dominant = totals[0];
  const useStyle = dominant && dominant.count > (totals[1]?.count || 0) && dominant.count >= Math.ceil(state.weekFocusDays[weeklyFocus]/2);
  const styleInputs = useStyle ? inputs.filter(item => item.styleId === dominant.styleId) : [];
  appendEvent(state, { kind:'daily', text:useStyle ? practiceWeeklyText(skillId,dominant.styleId,Math.floor(state.day/7)-1) : weeklyText(weeklyFocus,Math.floor(state.day/7)-1),
    location:FOCUSES.find(item=>item.id===weeklyFocus).location, focusId:weeklyFocus,
    ...(useStyle ? {practice:{skillId,styleId:dominant.styleId,days:dominant.count},sourceEventIds:[...new Set(styleInputs.map(item=>item.sourceEventId))]} : {}) });
  state.weekFocusDays = Object.fromEntries(FOCUS_IDS.map(id=>[id,0])); state.weekPracticeInputs=[]; state.weekSocialDays=0;
}
function advanceOneDay(state, socialEvent = null) {
  state.day += 1;
  if (socialEvent) {
    state.socialDays += 1; state.weekSocialDays += 1;
    appendEvent(state, socialEvent);
  } else {
    state.focusDays[state.focus] += 1; state.weekFocusDays[state.focus] += 1;
    state.skills.record = skillLevel(state.focusDays.walk); state.skills.organize = skillLevel(state.focusDays.club);
    const skillId = skillFor(state.focus), plan = skillId && state.practicePlans[skillId];
    if (plan) {
      state.practiceDays[skillId][plan.styleId] += 1;
      state.weekPracticeInputs.push({skillId,styleId:plan.styleId,sourceEventId:plan.sourceEventId});
    }
  }
  for (const [focusId,personId,text] of [
    ['club','xiaoman','活动室去了几回，负责开门的小满已经认得你了。碰到时，你们会打个招呼。'],
    ['walk','linye','湖边又碰到同班的林野。你们走了一段路，下次上课知道可以坐在谁旁边。'],
  ]) if (state.focusDays[focusId]>=7 && !state.peopleMet.includes(personId)) {
    state.peopleMet.push(personId); appendEvent(state,{kind:'meeting',text,location:focusId==='club'?'club':'lake',personId,focusId});
  }
  for (const entry of CALENDAR_LOGS) if (entry.day === state.day) appendEvent(state,{kind:entry.kind||'calendar',text:entry.text,location:entry.location,contentId:entry.id});
  if (state.day % 7 === 0) weeklyRecord(state);
  for (const entry of AFTER_LOGS) if (entry.day === state.day && state.flags[entry.requiresFlag]) {
    const source = state.events.find(event=>event.kind==='story'&&event.flagsAdded?.[entry.requiresFlag]);
    appendEvent(state,{kind:'daily',text:getReactionEcho(entry.id,state)||entry.text,location:entry.location,contentId:entry.id,sourceEventIds:source?[source.id]:[]});
  }
  if (!socialEvent) progressProject(state);
  openAvailableStory(state);
  if (state.day >= CONFIG.totalDays-1 && !state.pending) state.phase='ended';
  settleInvitation(state,!socialEvent);
}
function reduceSocial(previous, personId, actionId, expectedRevision = previous.revision) {
  assertRevision(previous, expectedRevision);
  if (!PEOPLE[personId]) throw fail('unknown_person', '没有认识这位同学。');
  if (!previous.peopleMet.includes(personId)) throw fail('person_unmet', `还没有认识${PEOPLE[personId].name}。`);
  if (previous.phase === 'ended') throw fail('game_ended', '这段秋季生活已经结束。');
  if (previous.pending) throw fail('pending_story', '先回应眼前的事，再找人相处。');
  const option = socialOptionsFor(previous, personId, CONFIG.totalDays).find(item => item.actionId === actionId);
  if (!option) throw fail('unknown_social_action', '没有这种相处安排。');
  if (!option.enabled) throw fail('social_unavailable', option.reason || '这次课余暂时约不上。');
  const event = buildSocialEvent(previous, personId, actionId, getSocialContext(previous, personId));
  const state = clone(previous);
  if (state.invitation?.personId === personId) {
    const invitation = state.invitation;
    event.sourceInvitationId = invitation.id;
    event.invitationOutcome = invitation.actionId === actionId ? 'accepted-by-plan' : 'met-otherwise';
    event.sourceEventIds = [...new Set([...(event.sourceEventIds||[]),invitation.id])];
    state.invitation = null;
  }
  advanceOneDay(state, event);
  recordCommand(state, {type:'social', personId, actionId});
  return state;
}
function reduceInvitationReply(previous, invitationId, reply, expectedRevision = previous.revision) {
  assertRevision(previous,expectedRevision);
  if (previous.phase === 'ended') throw fail('game_ended','这段秋季生活已经结束。');
  if (previous.pending) throw fail('pending_story','先回应眼前的事，再回复这份邀约。');
  const invitation = previous.invitation;
  if (!invitation || invitation.id !== invitationId) throw fail('unknown_invitation','这份邀约已经不在眼前了。');
  if (previous.day > invitation.expiresDay) throw fail('invitation_expired','这次邀约已经过去了。');
  if (!['accept','decline'].includes(reply)) throw fail('unknown_invitation_reply','没有这种回应。');
  const context = getSocialContext(previous,invitation.personId);
  const state = clone(previous); state.invitation = null;
  if (reply === 'accept') {
    const view = invitationView(previous);
    if (!view.acceptEnabled) throw fail('social_unavailable',view.reason || '这段课余暂时约不上。');
    advanceOneDay(state,buildInvitationEncounter(previous,invitation,context));
  } else {
    appendEvent(state,buildInvitationDecline(previous,invitation,context));
  }
  recordCommand(state,{type:'invitation.reply',invitationId,reply});
  return state;
}
function reduceAdvance(previous,count) {
  if (!Number.isInteger(count)||count<1||count>CONFIG.totalDays) throw fail('invalid_time','时间只能按一到九十一天向前推进。');
  const state=clone(previous); if(state.pending||state.phase==='ended') return state;
  for(let i=0;i<count&&!state.pending&&state.phase==='living';i++) advanceOneDay(state);
  recordCommand(state,{type:'time',days:count});return state;
}
function practiceSignature(state) {
  return SKILL_IDS.flatMap(skillId=>PRACTICES[skillId].flatMap(style=>style.capabilities.map(capability=>state.practiceDays[skillId][style.id]>=capability.min))).join(':');
}
function reduceNextMoment(previous) {
  const state=clone(previous);if(state.pending||state.phase==='ended')return state;
  const beforeSkills={...state.skills},beforeProjects=state.completedProjects.length,beforePractice=practiceSignature(state),beforeInvitation=state.invitation?.id;
  for(let i=0;i<CONFIG.totalDays&&!state.pending&&state.phase==='living';i++) {
    advanceOneDay(state);
    if((state.invitation&&state.invitation.id!==beforeInvitation)||state.completedProjects.length!==beforeProjects||practiceSignature(state)!==beforePractice||SKILL_IDS.some(id=>beforeSkills[id]===0&&state.skills[id]>0))break;
  }
  recordCommand(state,{type:'moment'});return state;
}
function pendingStory(state) {
  const catalogue = state.pending.legacy ? V5_STORY_BY_ID : state.pending.legacyVersion === 6 ? V6_STORY_BY_ID : state.pending.legacyVersion === 7 ? V7_STORY_BY_ID : state.pending.legacyVersion === 8 ? V8_STORY_BY_ID : STORY_BY_ID;
  return catalogue.get(state.pending.storyId);
}
function choicesFor(state) {
  if(!state.pending)return[];
  const story=pendingStory(state);
  return story.choices.map(choice=>{
    let reason='',reasonCode='';
    if(choice.requiresSkill && state.skills[choice.requiresSkill.id]<choice.requiresSkill.min) {
      reason=`还需要${SKILLS[choice.requiresSkill.id].name}达到“${SKILLS[choice.requiresSkill.id].stages[choice.requiresSkill.min]}”。`;
      reasonCode='missing_skill';
    }
    else if(!practiceAllowed(state,choice.requiresPractice)) {
      const style=practiceFor(choice.requiresPractice.skillId,choice.requiresPractice.styleId);
      reason=`还需要在“${style.name}”这条练法里多些真实经验。`;
      reasonCode='missing_practice';
    }
    else if(choice.requiresCooperation && getSocialContext(state,choice.requiresCooperation.personId).cooperation<choice.requiresCooperation.min) {
      reason=`还没有和${PEOPLE[choice.requiresCooperation.personId].name}一起处理现场的经历；可以先搭档确认，或在日常里练习照顾现场。`;
      reasonCode='missing_cooperation';
    }
    const practiceChange=STORY_BY_ID.get(story.id)?.choices.find(item=>item.id===choice.id)?.practiceChange;
    const style=practiceChange&&practiceFor(practiceChange.skillId,practiceChange.styleId);
    return{id:choice.id,title:choice.title,description:choice.description,enabled:!reason,reason,...(reasonCode?{reasonCode}:{}),
      ...(practiceChange?{practiceChange:clone(practiceChange),practiceHint:`之后${focusFor(practiceChange.skillId)==='walk'?'散步记录':'去社团'}时，会试着${style.action}。`}:{})};
  });
}
function reduceChoice(previous,choiceId,expectedRevision=previous.revision) {
  assertRevision(previous,expectedRevision);
  if(previous.phase==='ended')throw fail('game_ended','这段秋季生活已经结束。');
  if(!previous.pending)throw fail('no_pending_story','此刻没有需要回应的事，生活可以继续向前。');
  const story=pendingStory(previous);
  const choice=story.choices.find(item=>item.id===choiceId);
  if(!choice)throw fail('unknown_choice','这不是眼前这件事的选项。');
  const allowed=choicesFor(previous).find(item=>item.id===choiceId);
  if(!allowed.enabled)throw fail(allowed.reasonCode,allowed.reason);
  const state=clone(previous),flagsAdded={};
  for(const[key,value]of Object.entries(choice.flags||{})){flagsAdded[key]=value;state.flags[key]=value;}
  const currentChoice=STORY_BY_ID.get(story.id)?.choices.find(item=>item.id===choiceId);
  const practiceChange=currentChoice?.practiceChange;
  // Resolve from the history before this choice; the response is a saved fact, not a fresh roll when read.
  const reaction=getReaction(previous,story.id,choiceId);
  const event=appendEvent(state,{kind:'story',title:story.title,text:choice.result,location:story.location,storyId:story.id,choiceId,choiceTitle:choice.title,flagsAdded,
    sourceEventIds:sourcesForStory(previous,STORY_BY_ID.get(story.id)||story),...(practiceChange?{practiceChange:clone(practiceChange)}:{}),
    ...(reaction?{reaction:clone(reaction)}:{})});
  if(practiceChange)setPlan(state,practiceChange.skillId,practiceChange.styleId,event.id);
  state.resolvedStories.push(story.id);state.pending=null;openAvailableStory(state);
  if(state.day>=CONFIG.totalDays-1&&!state.pending)state.phase='ended';
  settleInvitation(state);
  recordCommand(state,{type:'choice',choiceId});return state;
}
function checkedState(value){const checked=validateSave(value);if(!checked.valid)throw fail('invalid_save',checked.error);return checked.state;}
export function setFocus(state,id){return reduceFocus(checkedState(state),id);}
export function setPractice(state,skillId,styleId,revision=state?.revision){return reducePractice(checkedState(state),skillId,styleId,revision);}
export function advanceDays(state,count=1){return reduceAdvance(checkedState(state),count);}
export function advanceToNextMoment(state){return reduceNextMoment(checkedState(state));}
export function getChoices(state){return choicesFor(checkedState(state));}
export function getProjects(state){return projectOptions(checkedState(state));}
export function getSocialOptions(state,personId){return clone(socialOptionsFor(checkedState(state),personId,CONFIG.totalDays));}
export function socialize(state,personId,actionId,revision=state?.revision){return reduceSocial(checkedState(state),personId,actionId,revision);}
export function getInvitation(state){return invitationView(checkedState(state));}
export function replyToInvitation(state,invitationId,reply,revision=state?.revision){return reduceInvitationReply(checkedState(state),invitationId,reply,revision);}
export function getRelationships(candidate){
  const state=checkedState(candidate);
  return state.peopleMet.map(personId=>({id:personId,...clone(getSocialContext(state,personId))}));
}
export function startProject(state,id,approachId,revision=state?.revision){return reduceStartProject(checkedState(state),id,approachId,revision);}
export function cancelProject(state,revision=state?.revision){return reduceCancelProject(checkedState(state),revision);}
export function choose(state,id,revision=state?.revision){return reduceChoice(checkedState(state),id,revision);}
export function toggleFavorite(candidate,eventId){
  const state=clone(checkedState(candidate));if(!state.events.some(event=>event.id===eventId))throw fail('unknown_event','这段记录不存在。');
  state.favorites=state.favorites.includes(eventId)?state.favorites.filter(id=>id!==eventId):[...state.favorites,eventId];return state;
}
function sourceText(state,eventId){
  const event=state.events.find(item=>item.id===eventId);if(!event)return'';
  const choice=event.choiceId&&STORY_BY_ID.get(event.storyId)?.choices.find(item=>item.id===event.choiceId);
  return `${dateInfo(event.day).label}，${event.choiceTitle||choice?.title||event.title||event.text}`;
}
export function getGrowth(candidate){
  const state=checkedState(candidate);
  return SKILL_IDS.map(skillId=>{
    const level=state.skills[skillId],days=state.focusDays[focusFor(skillId)],nextAt=[7,18,35][level]??null;
    const options=PRACTICES[skillId].map(style=>({...clone(style),days:state.practiceDays[skillId][style.id],
      capabilities:style.capabilities.map(capability=>({...clone(capability),unlocked:state.practiceDays[skillId][style.id]>=capability.min}))}));
    const plan=state.practicePlans[skillId],style=plan&&options.find(item=>item.id===plan.styleId);
    return{skillId,name:SKILLS[skillId].name,level,stage:SKILLS[skillId].stages[level],days,nextAt,remaining:nextAt===null?0:nextAt-days,
      capabilities:(CAPABILITIES[skillId]||[]).map(item=>({...clone(item),unlocked:level>=item.level})),practiceOptions:options,
      practice:style?{...clone(style),styleId:style.id,sourceEventId:plan.sourceEventId,sourceText:sourceText(state,plan.sourceEventId)}:null};
  });
}
function isJsonValue(value,ancestors=new Set(),depth=0){
  if(depth>48)return false;if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);if(typeof value!=='object'||ancestors.has(value))return false;
  const prototype=Object.getPrototypeOf(value);if(!Array.isArray(value)&&prototype!==Object.prototype&&prototype!==null)return false;
  ancestors.add(value);const valid=Object.values(value).every(item=>isJsonValue(item,ancestors,depth+1));ancestors.delete(value);return valid;
}
function equalJson(a,b){
  if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a).sort(),other=Object.keys(b).sort();return keys.length===other.length&&keys.every((key,index)=>key===other[index]&&equalJson(a[key],b[key]));
}
function validSnapshot(event){return typeof event.text==='string'&&event.text.trim().length>0&&event.text.length<=2500&&(event.title===undefined||(typeof event.title==='string'&&event.title.trim().length>0&&event.title.length<=200));}
function importLegacy(snapshot){
  const verified=validateV8(snapshot);if(!verified.valid)throw fail('invalid_legacy',verified.error);
  const old=verified.state;
  return{...clone(old),schemaVersion:CONFIG.schemaVersion,rulesVersion:CONFIG.version,
    invitation:null,
    pending:old.pending?{...clone(old.pending),...(!old.pending.legacy&&!old.pending.legacyVersion?{legacyVersion:8}:{})}:null,
    commands:[{type:'legacy.import',snapshot:clone(old)}]};
}
/** Verify actual rules and choices by replay; this is not an anti-cheat identity boundary. */
export function validateSave(candidate){
  const invalid=error=>({valid:false,state:null,error});
  try{
    const value=typeof candidate==='string'?JSON.parse(candidate):candidate;
    if(!value||typeof value!=='object'||Array.isArray(value)||!isJsonValue(value))return invalid('这份秋季记录暂时无法读取。');
    if(value.schemaVersion!==CONFIG.schemaVersion||value.rulesVersion!==CONFIG.version)return invalid('这份记录属于另一个试玩版本，原记录不会被改写。');
    if(typeof value.runId!=='string'||!/^[A-Za-z0-9:_-]{8,128}$/.test(value.runId))return invalid('这份记录的角色标识已损坏。');
    if(!Array.isArray(value.commands)||value.commands.length>MAX_COMMANDS)return invalid('这份记录的操作顺序已损坏。');
    let canonical=initialState(value.runId);
    for(let index=0;index<value.commands.length;index++){
      const command=value.commands[index];if(!command||typeof command!=='object')return invalid('这份记录的操作无法读取。');
      if(command.type==='legacy.import'){
        if(index!==0)return invalid('旧记录只能在开始接续时导入。');canonical=importLegacy(command.snapshot);
        if(canonical.runId!==value.runId)return invalid('旧记录的角色标识不一致。');continue;
      }
      const revision=canonical.revision;
      if(command.type==='focus')canonical=reduceFocus(canonical,command.focusId);
      else if(command.type==='practice')canonical=reducePractice(canonical,command.skillId,command.styleId);
      else if(command.type==='time')canonical=reduceAdvance(canonical,command.days);
      else if(command.type==='choice')canonical=reduceChoice(canonical,command.choiceId);
      else if(command.type==='project.start')canonical=reduceStartProject(canonical,command.projectId,command.approachId);
      else if(command.type==='project.cancel')canonical=reduceCancelProject(canonical);
      else if(command.type==='moment')canonical=reduceNextMoment(canonical);
      else if(command.type==='social')canonical=reduceSocial(canonical,command.personId,command.actionId);
      else if(command.type==='invitation.reply')canonical=reduceInvitationReply(canonical,command.invitationId,command.reply);
      else return invalid('这份记录包含未知操作。');
      if(canonical.revision!==revision+1)return invalid('这份记录包含重复或过时操作。');
    }
    if(!Array.isArray(value.events)||value.events.length!==canonical.events.length)return invalid('这份记录的生活日志不一致。');
    for(let index=0;index<canonical.events.length;index++){
      const old=value.events[index];if(!old||!validSnapshot(old)||!LOCATIONS.has(old.location))return invalid('这份记录的文字已损坏。');
      canonical.events[index].text=old.text;if(old.title!==undefined)canonical.events[index].title=old.title;
    }
    if(!Array.isArray(value.favorites)||new Set(value.favorites).size!==value.favorites.length||value.favorites.some(id=>!canonical.events.some(event=>event.id===id)))return invalid('这份记录的精选条目已损坏。');
    canonical.favorites=[...value.favorites];
    if(!equalJson(value,canonical))return invalid('这份记录的日期、本领、练法或经历不一致。');
    return{valid:true,state:canonical,error:null};
  }catch{return invalid('这份秋季记录暂时无法读取，原记录不会被自动覆盖。');}
}
export function getSummary(candidate){
  const state=checkedState(candidate);return{daysElapsed:state.day,focusDays:{...state.focusDays},skills:{...state.skills},
    skillStages:Object.fromEntries(SKILL_IDS.map(id=>[id,SKILLS[id].stages[state.skills[id]]])),peopleMet:[...state.peopleMet],events:clone(state.events),
    favorites:state.favorites.map(id=>clone(state.events.find(event=>event.id===id))),storiesCompleted:state.resolvedStories.length,phase:state.phase,
    project:clone(state.project),completedProjects:clone(state.completedProjects),practiceDays:clone(state.practiceDays),practicePlans:clone(state.practicePlans),socialDays:state.socialDays,invitation:clone(state.invitation)};
}
export function migrateLegacySave(candidate){
  try{
    const value=typeof candidate==='string'?JSON.parse(candidate):candidate;
    const legacy=value?.schemaVersion===8?validateV8(value):migratePreV8(value);
    if(!legacy.valid)return{valid:false,state:null,error:legacy.error};
    return validateSave(importLegacy(legacy.state));
  }catch{return{valid:false,state:null,error:'这份旧记录暂时无法接续，原记录不会被覆盖。'};}
}
