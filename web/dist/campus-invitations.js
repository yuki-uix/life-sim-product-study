/** Quiet return visits, grounded in encounters that have already happened. */
import { socialHistory, socialOptionsFor, buildSocialEvent } from './campus-social.js?v=0.9.0';

const PEOPLE = Object.freeze({
  ahe: {name:'阿禾',location:'dorm',chatTitle:'阿禾想找你聊聊',activityTitle:'阿禾来约你一起吃饭'},
  xiaoman: {name:'小满',location:'club',chatTitle:'小满来找你聊电影',activityTitle:'小满来约你一起试设备'},
  linye: {name:'林野',location:'lake',chatTitle:'林野想问问你的近况',activityTitle:'林野来约你沿湖走走'},
});
const SHARED_STORIES = Object.freeze({
  ahe: ['lights_talk'],
  xiaoman: ['screen_help','screen_watch','own_screen_lead','own_screen_together','circle_hold_space','circle_with_xiaoman'],
  linye: ['photo_same_place','photo_walk','wall_arrange','wall_together','people_follow_story','people_together'],
});
const CHAT_STORIES = new Set(['screen_watch','lights_talk']);
const latestDay = events => events.length ? Math.max(...events.map(event => event.day)) : -Infinity;

function sharedHistory(state, personId) {
  return (state.events || []).filter(event =>
    (event.kind === 'social' && event.personId === personId)
    || (event.kind === 'story' && SHARED_STORIES[personId]?.includes(event.choiceId)));
}
function anchorAction(event) {
  return event.kind === 'social' ? event.actionId : CHAT_STORIES.has(event.choiceId) ? 'chat' : 'activity';
}
function sourceReference(personId, source) {
  if (source.kind === 'social') {
    if (personId === 'ahe') return source.actionId === 'chat' ? '上回坐下来聊过的近况' : '上回一起吃饭时的闲话';
    if (personId === 'xiaoman') return source.actionId === 'chat' ? '上回你们聊到的片子' : '上回一起试过的接口';
    return source.actionId === 'chat' ? '上回你们聊过的近况' : '上回沿湖停下来的地方';
  }
  if (personId === 'ahe') return '停电那晚没讲完的话';
  if (personId === 'xiaoman') return source.choiceId === 'screen_watch'
    ? '之前那场一起待过的放映' : source.storyId === 'screen_circle' ? '散场后坐着聊的那一回' : '之前一起接过的放映现场';
  return source.storyId === 'photo_people' ? '之前一起想过怎样留下校园的那一回' : '之前一起走过、看过照片的那段路';
}
function invitationText(personId, actionId, source, familiar) {
  const reference = sourceReference(personId,source);
  if (personId === 'ahe') return actionId === 'chat'
    ? `阿禾提起${reference}，问后来怎么样了。他这两天也碰上一件想说的小事，问你有空时要不要坐一会儿。`
    : familiar ? `阿禾接着${reference}发来一句：“这几天哪顿有空，一起去食堂？”他还想去试试另一个窗口，没有替你把时间定下来。`
      : `阿禾说起${reference}，问这几天有空时要不要一起吃顿饭。各自点想吃的，吃完有别的安排就再分开。`;
  if (personId === 'xiaoman') return actionId === 'chat'
    ? `小满想起${reference}。她新看了一段结尾，自己还没想清楚，想找个不赶开场的空当，听听你会怎样看。`
    : familiar ? `小满提起${reference}：“活动室这几天有空的时候，要不要一起再试一遍声音？”她想把自己总会漏掉的一步也重新过过，不急着办一场活动。`
      : `小满说起${reference}，问你有没有兴趣找段空闲一起认认设备接口。她会在旁边一起试，哪里没弄明白就停下来看看。`;
  return actionId === 'chat'
    ? `林野还记得${reference}，问你这两天过得怎么样。他也想说说自己最近常绕去的地方，有空时聊到哪儿就算哪儿。`
    : familiar ? `林野提到${reference}，说这几天又想沿湖走走：“你有空的话，要不要一起？”各自带着手机，想拍就停，没想拍也可以只走一段。`
      : `林野想起${reference}，问你有空时要不要一起沿湖走一段、看看这几天的光线。各自拍想拍的，镜头里涉及谁，就先问谁愿不愿意。`;
}

/** The calendar calls this only after an ordinary day, never immediately after a meeting. */
export function invitationCandidate(state = {}, contexts = [], totalDays = 91) {
  if (state.invitation || state.pending || state.phase !== 'living' || state.day >= totalDays - 2) return null;
  const events = state.events || [];
  const offers = events.filter(event => event.kind === 'invitation');
  if (state.day - latestDay(offers) < 7) return null;
  const resolutions = events.filter(event => event.kind === 'invitation_reply'
    || (event.kind === 'social' && event.sourceInvitationId));
  if (state.day - latestDay(resolutions) < 3) return null;

  const candidates = [];
  for (const context of contexts) {
    const personId = context.id;
    if (!PEOPLE[personId] || !(state.peopleMet || []).includes(personId)) continue;
    const visits = socialHistory(state,personId);
    const history = sharedHistory(state,personId);
    const sharedStories = history.filter(event => event.kind === 'story');
    if (visits.length < 3 && !((context.familiarityDays || 0) >= 14 && sharedStories.length)) continue;
    const source = history.at(-1);
    if (!source || state.day - source.day < 3) continue;
    const personOffers = offers.filter(event => event.personId === personId);
    const lastOffer = personOffers.at(-1);
    if (lastOffer && state.day - lastOffer.day < 10) continue;
    const activityAllowed = visits.some(event => event.actionId === 'activity')
      || sharedStories.length > 0 || context.stage === 'familiar';
    const preferred = lastOffer
      ? lastOffer.actionId === 'chat' && activityAllowed ? 'activity' : 'chat'
      : anchorAction(source) === 'activity' && activityAllowed ? 'activity' : 'chat';
    const options = socialOptionsFor(state,personId,totalDays);
    const actionId = [preferred,preferred === 'chat' ? 'activity' : 'chat'].find(id =>
      (id !== 'activity' || activityAllowed) && options.some(option => option.actionId === id && option.enabled));
    if (!actionId) continue;
    candidates.push({personId,context,source,sourceOrder:events.indexOf(source),actionId,lastInvitedDay:latestDay(personOffers),lastOffer});
  }
  // Oldest unreturned contact goes first; ties use actual history, never the roster order.
  candidates.sort((a,b) => a.lastInvitedDay - b.lastInvitedDay || a.source.day - b.source.day
    || a.sourceOrder - b.sourceOrder || a.personId.localeCompare(b.personId));
  const selected = candidates[0];
  if (!selected) return null;
  const {personId,context,source,actionId,lastOffer} = selected;
  const person = PEOPLE[personId];
  const familiar = (context.familiarityDays || 0) >= 14 || context.stage === 'familiar';
  return {kind:'invitation',personId,actionId,title:person[`${actionId}Title`],
    text:invitationText(personId,actionId,source,familiar),location:person.location,
    sourceEventIds:[source.id],variant:`${actionId}:${familiar ? 'familiar' : 'returning'}:${lastOffer ? 'again' : 'first'}`,
    expiresDay:Math.min(state.day + 10,totalDays - 2)};
}

const ACCEPTED_TEXT = Object.freeze({
  ahe: {
    chat:'阿禾来找你聊近况，你应下这段课余。两个人坐了一会儿，从他想说的小事聊起，又各自说了说这几天的去向。',
    activity:'阿禾来约你吃饭，你应下后和他去了食堂。各自挑想吃的，在空桌前坐下，边吃边接着前一次的话；收好餐盘，再各自去忙。',
  },
  xiaoman: {
    chat:'你应下小满的邀请，和她找了个空当聊电影。她先讲自己新看的一处，你也把想法说完；两个人没有急着把不同的理解凑成一个答案。',
    activity:'你应下小满的邀约，和她在空下来的活动室一起试设备。接口和声音挨个确认，没出声的地方重新过一遍，试完再一起收好。',
  },
  linye: {
    chat:'林野来问你的近况，你应下后和他待了一段课余。各自讲到想说的地方，话停下来时就看会儿路边，想接着讲再慢慢接上。',
    activity:'林野来约你沿湖走，你应下后和他走了一段。想拍照时各自停下，也互相看看画面；涉及人的照片仍先确认，最后各自留下愿意留的几张。',
  },
});

/** Acceptance is a real encounter; the invitation alone never counts as time together. */
export function buildInvitationEncounter(state, invitation, context = {}) {
  const {personId,actionId} = invitation;
  const base = buildSocialEvent(state,personId,actionId,context);
  if (!base || !PEOPLE[personId]) return null;
  const person = PEOPLE[personId];
  const sourceEventIds = [...new Set([...base.sourceEventIds,invitation.id])];
  const choiceTitle = `应下${person.name}的邀请，${actionId === 'chat' ? '聊一会儿' : personId === 'ahe' ? '一起吃饭' : personId === 'xiaoman' ? '一起试设备' : '沿湖走走'}。`;
  return {...base,title:`${person.name}来约的这段课余`,choiceTitle:choiceTitle.slice(0,-1),
    text:ACCEPTED_TEXT[personId][actionId],initiator:'npc',sourceInvitationId:invitation.id,sourceEventIds,
    reaction:{...base.reaction,variant:`npc:${base.reaction.variant}`,
      note:'这次由对方来找你，前一次的相处也有了后话。',
      context:{...base.reaction.context,sourceEventIds:[...new Set([...base.reaction.context.sourceEventIds,invitation.id])]}}};
}

export function buildInvitationDecline(state, invitation, context = {}) {
  const {personId,actionId} = invitation, person = PEOPLE[personId];
  if (!person) return null;
  const familiar = (context.familiarityDays || 0) >= 14 || context.stage === 'familiar';
  const replies = {
    ahe: familiar ? '阿禾应了声“行”，把手机揣回口袋：“那你忙你的，我也去把手边的事弄完。”他顺手把过道里的鞋踢回床下，给你让了条路。' : '阿禾点了点头：“好，那这次先各自忙。”他收起手机，转回桌前。',
    xiaoman: familiar ? '小满看了眼自己的安排：“行，那我另找个空当。你先忙。”她把笔夹回本子里，继续理手边那箱线。' : '小满回了声“好”，说这回先不定。她把自己的安排接着做下去，见面时仍照常打招呼。',
    linye: familiar ? '林野把手机收低：“好，你先按自己的安排来，我再看看想去哪儿。”他抬头看了眼路口，朝你挥了挥手。' : '林野说“好”，把这次邀约收了口。他站了一会儿，又低头看了看课表，往另一边走了。',
  };
  const sourceEventIds = [...new Set([invitation.id,...invitation.sourceEventIds])];
  return {kind:'invitation_reply',personId,actionId,sourceInvitationId:invitation.id,outcome:'declined',
    title:`这次先和${person.name}各自忙`,text:`你告诉${person.name}，这次先不安排在一起。`,location:person.location,sourceEventIds,
    reaction:{personId,variant:`decline:${familiar ? 'familiar' : 'returning'}`,text:replies[personId],
      note:'彼此都有自己的安排，这次就先不定。',
      context:{familiarityDays:context.familiarityDays || 0,cooperation:context.cooperation || 0,
        sourceEventIds:[...new Set([...(context.sourceEventIds || []),invitation.id])]}}};
}
