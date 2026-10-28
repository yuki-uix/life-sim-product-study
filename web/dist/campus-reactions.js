/** Authored social responses, selected from facts that existed before a choice. */
import { socialHistory } from './campus-social.js?v=0.9.0';
export const CHARACTER_NOTES = Object.freeze({
  xiaoman: '小满手头忙时说话很快，分工前会先确认对方有没有接触过现场。',
  linye: '林野喜欢边走边拍，不太习惯对着镜头说话；留下哪些事，他想自己决定。',
  ahe: '阿禾常从吃饭、上课这些小事聊起，熟起来以后，没话说时也能各自待着。',
});

const PERSON_FOCUS = Object.freeze({ahe:'friends', xiaoman:'club', linye:'walk'});
const STORY_PERSON = Object.freeze({
  club_screen:'xiaoman', own_screen:'xiaoman', screen_circle:'xiaoman',
  lake_photo:'linye', photo_wall:'linye', photo_people:'linye', lights_out:'ahe',
});
const COOPERATION_CHOICES = Object.freeze({
  xiaoman: Object.freeze(['screen_help','own_screen_lead','own_screen_together','circle_hold_space','circle_with_xiaoman']),
  linye: Object.freeze(['photo_same_place','photo_walk','wall_arrange','wall_together','people_follow_story','people_together']),
  ahe: Object.freeze(['lights_talk']),
});
const LISTENING_CHOICES = Object.freeze(['photo_walk','people_follow_story','people_together']);
const STORY_CHOICES = Object.freeze({
  club_screen:['screen_help','screen_watch','screen_leave'],
  lake_photo:['photo_same_place','photo_walk','photo_leave'],
  lights_out:['lights_talk','lights_outside','lights_rest'],
  photo_wall:['wall_arrange','wall_together','wall_later'],
  own_screen:['own_screen_lead','own_screen_together','own_screen_later'],
  photo_people:['people_follow_story','people_together','people_later'],
  screen_circle:['circle_hold_space','circle_with_xiaoman','circle_leave'],
});

function storyEvents(state, personId) {
  return (state.events || []).filter(event => event.kind === 'story' && STORY_PERSON[event.storyId] === personId);
}
function hasChoice(state, choiceId) {
  return (state.events || []).some(event => event.kind === 'story' && event.choiceId === choiceId);
}
function hasListened(state) {
  return storyEvents(state,'linye').some(event => LISTENING_CHOICES.includes(event.choiceId))
    || socialHistory(state,'linye').length >= 2;
}
function hasCoordinationPractice(state) {
  return (state.practiceDays?.organize?.connect || 0) >= 12;
}
function feelsFamiliar(context) {
  return context.familiarityDays >= 14 || context.stage === 'familiar';
}

/** Familiarity describes repeated opportunities to meet, rather than a like/dislike score. */
export function getSocialContext(state = {}, personId) {
  const met = (state.peopleMet || []).includes(personId);
  const focusId = PERSON_FOCUS[personId];
  const visits = met ? socialHistory(state,personId) : [];
  const contactCount = visits.length;
  const activityCount = visits.filter(event => event.actionId === 'activity').length;
  const chatCount = contactCount - activityCount;
  const familiarityDays = met ? (state.focusDays?.[focusId] || 0) + contactCount : 0;
  const interactions = met ? storyEvents(state,personId) : [];
  const cooperationEvents = interactions.filter(event => (COOPERATION_CHOICES[personId] || []).includes(event.choiceId));
  // A missed early invitation is not permanent: later, actual coordination practice
  // can also establish that the player has tried handling a room full of people.
  const coordinationPractice = met && personId === 'xiaoman' && hasCoordinationPractice(state);
  const cooperation = cooperationEvents.length + (coordinationPractice ? 1 : 0) + Math.min(2,Math.floor(activityCount / 2));
  const sourceEventIds = met ? (state.events || []).filter(event =>
    (event.kind === 'meeting' && event.personId === personId)
    || (event.kind === 'social' && event.personId === personId)
    || (event.kind === 'daily' && event.focusId === focusId)
    || interactions.some(item => item.id === event.id)
    || (coordinationPractice && ((event.practice?.skillId === 'organize' && event.practice.styleId === 'connect')
      || (event.practiceChange?.skillId === 'organize' && event.practiceChange.styleId === 'connect')))).map(event => event.id) : [];
  let summary = '还没有认识。';
  if (met && personId === 'xiaoman') summary = cooperationEvents.length
    ? '一起接过现场的事，分工时有了可以参照的经历。'
    : coordinationPractice ? '后来在活动室实际练过照顾现场，分工不再只凭彼此熟不熟。'
    : familiarityDays >= 14 ? '活动室里常碰到，聊起来少了些客气；还没有一起处理过现场。' : '认得彼此，做事的习惯还在慢慢了解。';
  if (met && personId === 'linye') summary = hasListened(state)
    ? '有过边走边聊、由他决定留下什么的经历。'
    : cooperation ? '一起试过照片的事，已经知道一些彼此的做法。'
      : familiarityDays >= 14 ? '在校园里碰面多了，停下来打招呼渐渐自然。' : '见面会打招呼，还不太清楚彼此的习惯。';
  if (met && personId === 'ahe') summary = familiarityDays >= 14
    ? '课余常一起待着，聊几句和各忙各的都不太拘束。'
    : cooperation ? '有过坐下来听彼此说话的晚上，平时的日常仍各有安排。' : '住在同一间宿舍，各自的日常还在慢慢熟悉。';
  const stage = !met ? 'unmet' : contactCount >= 6 ? 'familiar'
    : contactCount >= 3 ? 'continuing' : contactCount > 0 ? 'visiting' : 'acquainted';
  if (met && contactCount > 0) {
    if (personId === 'ahe') summary = stage === 'familiar'
      ? chatCount && activityCount ? '一起吃过饭，也聊过各自的日常，见面时不必急着找话；各忙各的也能直说。'
        : activityCount ? '约着吃过几回饭，慢慢知道彼此的日常习惯，吃完各有安排也能直说。'
          : '常会专门坐下来聊聊，近况能接得上；没话时也不必急着找话。'
      : stage === 'continuing' ? '已经会专门找彼此，前一次说过的近况，下一回还能接着问。'
        : activityCount ? '在同住一间之外，也开始约着吃饭，慢慢知道彼此的日常习惯。' : '开始在课表之外专门聊聊，彼此的近况有了来往。';
    if (personId === 'xiaoman') summary = stage === 'familiar'
      ? chatCount && activityCount ? activityCount >= 2
          ? '聊过片子，也实际搭手试过几回设备，分头做事时渐渐知道怎样配合。'
          : '聊片子已经不太拘束，也一起试过设备；现场怎样搭手，还在慢慢摸索。'
        : activityCount ? '专门约着试过几回设备，分头做事时渐渐知道怎样配合。'
          : '已经常会专门聊片子，能接上彼此的想法；现场怎样搭手，还得一起试过才知道。'
      : stage === 'continuing' ? activityCount >= 2
        ? '见面能接上前一次的话，试设备时也有了实际搭手的经历。'
        : '已经会专门留空聊聊，能接上旧话；现场分工还要在实际搭手中摸清。'
        : activityCount ? '已经约着试过设备，彼此怎样搭手还在慢慢了解。' : '开始专门找她聊片子，课余的来往渐渐多了起来。';
    if (personId === 'linye') summary = stage === 'familiar'
      ? chatCount && activityCount ? '一起沿湖走过，也聊过日常，能听懂彼此想说什么；想留下哪些画面仍会互相确认。'
        : activityCount ? '约过几回沿湖走和拍照，慢慢听得懂彼此想拍什么；想留下哪些画面仍会互相确认。'
          : '前一次说过的近况，下回还能接着问；不想展开的话，也能直接说到这里。'
      : stage === 'continuing' ? activityCount && chatCount
        ? '从偶尔碰见变成会专门来往，前一次的近况和走过的地方，都能接着聊。'
        : activityCount ? '从偶尔碰见变成会专门约着沿湖走，前一次停下的地方，下次还能说起。'
          : '从偶尔碰见变成会专门聊聊，前一次提过的近况，下次还能接着问。'
        : activityCount ? '开始约着沿湖走和拍照，各自想拍什么、愿意留下什么，会先问一句。' : '开始有了主动找彼此的来往，愿意说多少，就先听到哪里。';
  }
  return {familiarityDays,cooperation,sourceEventIds,summary,contactCount,activityCount,stage};
}

const RESPONSE_PAIRS = Object.freeze({
  screen_watch: [
    '小满指了指第三排：“那边看得清，包放旁边就行。”说完，她又蹲下去找线头，没有再把布场的事递过来。',
    '小满从椅背上拿开自己的外套，给你留了个位子：“今天当观众啊。待会儿要是看困了，别坐第一排。”她笑了一下，又去调声音。',
  ],
  screen_leave: [
    '小满直起身点了点头：“好，路上见。”她把刚想递过来的线放回地上，转头叫了另一位同学。',
    '小满看了眼时间：“去吧，再晚食堂真要关了。”她抬了抬沾灰的手肘，算是挥手道别，接着去叫旁边的人搭把手。',
  ],
  photo_same_place: [
    '林野先把旧照片举到你看得见的高度，等你指出桥边的位置才往那边走：“这里？你再帮我看一下。”按快门前，他又确认了一遍。',
    '林野走到你旁边，把两张照片来回切给你看：“原来水退下去这么多。”他蹲低了一点，让开屏幕，等你指出刚才说的那块岸边。',
  ],
  photo_walk: [
    '林野停下拍照时回头看了你一眼：“我可能走得有点慢。”你没催，他才收起那句解释，继续沿着水边走；话题一时没接上，也没有硬找。',
    '林野拍了几张，索性把手机垂下来，讲起自己为什么总在这个点出来走。说到一半他笑了：“本来只说绕一圈，怎么又走远了。”',
  ],
  photo_leave: [
    '林野把指向树叶的手收回来：“哦，好，那我再走一段。”他往桥的另一头让了让，让你从近路过去。',
    '林野看了看快暗下来的路：“你先回，我还想等一下那边的灯。”他晃了晃手机，“下次上课见。”没有催你把这圈走完。',
  ],
  lights_talk: [
    '阿禾把椅子往边上挪了半掌，先问了一句：“我们说话会不会吵到你？”听你接了话，他才继续讲起刚才没说完的事。',
    '阿禾用脚把门边的袋子勾开，给你腾出地方：“你可算出来了，刚才说的那家食堂你也去过吧？”话绕到熟悉的地方，你们很快接上了。',
  ],
  lights_outside: [
    '阿禾抬起手机替你照了下门槛：“楼梯也黑，小心点。”他没有跟出来，门口的谈话在你身后又接了下去。',
    '阿禾看你往门口走，先把椅子收进去：“透气去啊？门给你留着。”等你回来，他抬头问楼下哪几栋还亮着灯，顺手又让出一块位置。',
  ],
  lights_rest: [
    '阿禾听见你的话，朝床铺那边应了声“好”。门口再有人抬高声音时，他往里看了一眼，把话音压低了些。',
    '阿禾朝你摆了摆手：“歇着，来电不喊你。”他把照明的手机转向走廊，经过你的床边时，也没再追着问你怎么不出来。',
  ],
  wall_arrange: [
    '林野没有马上替你动图，先指着空出来的位置问：“这里是想留着吗？”听完你的安排，他才扶住展板，按你标的位置递胶带。',
    '林野蹲在展板旁边，等你比好位置才递胶带：“这次你来定，我负责扶住。”有一张贴歪了，他没急着揭，先回头让你看。',
  ],
  wall_together: [
    '林野把自己的那一摞照片放到一边：“先看你想留哪些。”两个人各挪了一次，又把手缩回来，确认过彼此的意思才接着排。',
    '林野指了指挤在一起的两张：“我舍不得这张，但你看，是不是少一张更好？”他没有立刻拿走，等你也退后看了一遍，才把那张收起来。',
  ],
  wall_later: [
    '林野听完把展板尺寸那张纸折起来：“好，我去说一声这次先不用。”他没再替你翻相册，照片仍由你自己收着。',
    '林野停了一下，笑着把尺子塞回包里：“那今天省得和胶带较劲了。”他把展板的事收了口，问你要不要顺路去吃饭。',
  ],
  own_screen_lead: [
    '小满把钥匙放到你手里，又把开门时间和投影的输入源逐项确认了一遍：“我晚一点到，卡住了给我发消息。”说完，她等你复述清楚才去忙别的。',
    '小满把钥匙推到你面前，手已经伸向另一箱设备：“门口就交给你了，还是记得给迟到的人留条路。”这次她没有留下来逐个分活，先去处理别处的事。',
  ],
  own_screen_together: [
    '小满没把事情一口气分给你们。她先陪你走到投影旁，指了一遍容易弄错的开关：“这回一起过，看看哪儿会卡住。”轮到片单时，她把话让给你。',
    '小满听完你的安排，把椅子往两边各推了一排：“那还是分头来，我看设备，你带他们摆场。”她只在声音没出来时凑过来看了一眼，别的没有再接过去。',
  ],
  own_screen_later: [
    '小满收起教室借用表：“行，那我今天先不把这一格写上。”她确认你说的是这次暂缓，就去和别的同学商量空出来的时段。',
    '小满拿笔在空教室那格旁点了点：“还想再改改？那就先放着。”她没有催你把片单交出来，转而讲起刚才有人借错幕布的事。',
  ],
  people_follow_story: [
    '林野听你说剪好再确认，握着手机的手松了些：“发之前，能先放在我这里看一遍吗？”你留出了这一步，他才开始指出自己想拍的几个地方。',
    '林野把想保留的几段单独指给你看，又停在一处：“这一句只留给家里，别放到别处。”他愿意多讲一点，仍逐段决定哪些可以留下。',
  ],
  people_together: [
    '林野接过手机，先试着拍了一小段，又自己按了删除：“还是我拿着吧，我想好一句再录。”你站在一旁，他不必一边说一边猜你会不会继续拍。',
    '林野拍完一段就把屏幕转给你：“这里是不是太绕了？”说到自己不想留的部分，他自己停了录制，再把手机收低，接着和你聊。',
  ],
  people_later: [
    '林野把相机界面退掉：“也好，我还没想清楚怎么说。”你们先聊起家里那条消息，他说得断断续续，你没有替他把话拼成一个故事。',
    '林野像松了口气，把手机扣在膝上：“其实也不一定要拍，就是今天有点想家。”这回没有镜头等着，他慢慢说了下去，到了饭点又自己站起来招呼你。',
  ],
  circle_hold_space: [
    '小满收设备的动作停了一下，朝还坐着的人说：“你们先聊，我就在旁边。”她没有立刻走开，听你把话交给那个没开口的同学，才重新低头绕线。',
    '小满看见你把椅子拉近，便把最后一圈线绕好：“那我先把这个送回去。”走到门口，她又折回来关掉刺眼的顶灯，只留了靠窗那排灯。',
  ],
  circle_with_xiaoman: [
    '小满把设备放稳才搬来椅子，先低声问你：“你想从哪句接？”两个人确认过，她先开了个头，留一会儿再让你把话题接过去。',
    '小满在你旁边坐下，没有先商量谁主持。你照顾着这边还没说话的人，她便转向另一边；两边话撞上时，你们停下来互相让了一次。',
  ],
  circle_leave: [
    '小满抬头应了声：“好，今天辛苦了。”她把门口的包移开，给你让出路，又转回去听还没说完的那位同学。',
    '小满看见你揉眼睛，把正要递来的椅子又拉回来：“回吧，我也快没电了。”她笑了笑，自己在留下的人中间找了个位置，没有再叫住你。',
  ],
});

function reactionNote(personId, choiceId, context, state, familiar) {
  if (personId === 'xiaoman') {
    const handlingTask = ['screen_help','own_screen_lead','own_screen_together','circle_hold_space','circle_with_xiaoman'].includes(choiceId);
    if (storyEvents(state,'xiaoman').some(event => COOPERATION_CHOICES.xiaoman.includes(event.choiceId))) return handlingTask
      ? '她记得你们实际一起接过现场的事，这次分工有了依据。'
      : '一起做过现场的事，彼此开口少了些客气；今天想不想参与，仍可以直说。';
    if (socialHistory(state,'xiaoman').filter(event => event.actionId === 'activity').length >= 2) return handlingTask
      ? '之前约着实际试过几回设备，怎样搭手有了共同经历可参照。'
      : '之前专门约着试过设备，彼此的做法已经有了一些了解，今天也可以直接说自己的安排。';
    if (hasCoordinationPractice(state)) return handlingTask
      ? '后来在活动室实际练过照顾现场，这次分工不只凭彼此熟不熟。'
      : '后来在活动室碰过不少事，彼此已有些了解，不必每次都把话说得很客气。';
    if (choiceId === 'screen_help') return familiar && (state.skills?.organize || 0) >= 2
      ? '常在活动室碰到，也已看过和试过不少布场的事。'
      : '彼此还没一起布过场，她先把眼前的一小件事说清楚。';
    return familiar ? '活动室里碰面多了，回应少了些客气；一起做事的习惯还没摸清。' : '彼此已经认得，暂时还会先问清楚对方的意思。';
  }
  if (personId === 'linye') {
    if (hasListened(state)) return '他记得你以前愿意等他、听他讲，哪些可以留下仍由他确认。';
    if (context.cooperation > 0) return '你们一起试过照片的事；更私人的部分，还需要重新开口确认。';
    return familiar ? '在校园里碰到的次数多了，他开口时少了一点试探。' : '见面会打招呼，还在了解彼此愿意怎样相处。';
  }
  if (socialHistory(state,'ahe').length >= 3) return '专门找过彼此几回，平时说过的近况，现在也能接得上。';
  return familiar ? '课余常一起待着，小事能接上话，也更容易直接说自己想做什么。' : '虽然住在同一间宿舍，彼此课余的安排还不太熟悉。';
}

export function getReaction(state = {}, storyId, choiceId) {
  const personId = STORY_PERSON[storyId];
  if (!personId || !STORY_CHOICES[storyId]?.includes(choiceId)) return null;
  const context = getSocialContext(state,personId);
  if (!(state.peopleMet || []).includes(personId)) return null;
  const familiar = feelsFamiliar(context);
  // Cooperation is a separate fact: long presence alone does not prove a handover.
  const entrusted = context.cooperation > 0;
  const listened = personId === 'linye' && hasListened(state);
  let direct = familiar;
  if (storyId === 'photo_wall') direct = familiar && entrusted;
  if (['own_screen','screen_circle'].includes(storyId)) direct = familiar && context.cooperation >= 2;
  if (storyId === 'photo_people') direct = familiar && listened;
  let variant = direct ? 'familiar' : 'reserved';
  let text;
  if (choiceId === 'screen_help') {
    if (familiar && (state.skills?.organize || 0) >= 2) {
      variant = 'divide_work';
      text = '小满听见你留下，松开了手里的椅背：“那我去找幕布，门边这几排你先看着？”她指了指走道，等你点头，就转去忙另一边。';
    } else {
      variant = 'show_first';
      text = '小满先把两根线分开放到你面前：“这根接声音，另一根别动。我先试一遍。”她让出一点位置，等你看清插口，才把接下来的事交给你试。';
    }
  } else if (choiceId === 'own_screen_lead' && (state.pending?.legacy || state.pending?.legacyVersion === 6)) {
    // The frozen old choice only promised leading a layout, not taking a key.
    variant = direct ? 'legacy_divide_work' : 'legacy_check_together';
    text = direct
      ? '小满听完你分的几件事，把设备箱放到桌边：“那你先带他们摆，我去试投影。”她没有再把布置逐项接过去，等你们忙完才抬头看了一圈。'
      : '小满听完流程，指了指投影旁的开关：“这里容易弄错，我先在旁边，你带他们试试。”轮到你安排椅子，她就让出了说话的位置。';
  } else text = RESPONSE_PAIRS[choiceId]?.[direct ? 1 : 0];
  if (!text) return null;
  return {personId,variant,text,note:reactionNote(personId,choiceId,context,state,familiar),
    context:{familiarityDays:context.familiarityDays,cooperation:context.cooperation,sourceEventIds:[...context.sourceEventIds]}};
}

export function getSocialOpening(storyId, state = {}) {
  if (storyId === 'own_screen') {
    const context = getSocialContext(state,'xiaoman');
    if (context.cooperation > 0) return hasChoice(state,'screen_help')
      ? '说到开门接人，小满想起你们之前一起接过现场的事：“你要是想先带他们布置，我可以晚一点到。”她把钥匙放在桌边，等你决定怎么分工。'
      : socialHistory(state,'xiaoman').filter(event => event.actionId === 'activity').length >= 2
        ? '你们之前约着试过几回设备，小满提起一起接过的那几个接口：“这回你要不要试试先开门接人？”她把钥匙放在桌边，仍留着一起确认的余地。'
        : '这阵子你在活动室实际练过照顾现场，小满提起其中几次安排：“这回你要不要试试先开门接人？”她把钥匙放在桌边，仍留着一起确认设备的余地。';
    return '小满把设备清单展开在你们中间：“片单你来定，现场这次我陪你过一遍。”她还不清楚你处理开门、试音这些事的习惯，钥匙先留在她手里。';
  }
  if (storyId === 'photo_people') return hasListened(state)
    ? socialHistory(state,'linye').length >= 2
      ? '他想起你之前几回愿意听他慢慢说，索性把话放慢了些。想多讲一点，和想不想把它拍下来，仍是两件事。'
      : '他说到一半想起你们之前那次边走边聊，索性把话放慢了些。想多讲一点，和想不想把它拍下来，仍是两件事。'
    : '话说到这里，他先看了你一眼：“我还没想好哪些能拍。”手机仍握在他手里，先聊到哪儿，就先停在哪儿。';
  if (storyId === 'lights_out') {
    const familiar = feelsFamiliar(getSocialContext(state,'ahe'));
    return familiar ? '阿禾听见你这边的动静，把脚边的袋子往里勾了勾，空出一个能放椅子的位置；他没有催，继续和门口的人聊着。' : '阿禾往你这边看了一眼，像是想招呼你，又先把声音放低了些。平时虽同住一间，课余的时间还各有各的安排。';
  }
  return null;
}

/** Existing dated echoes only vary when their actual source choice is present. */
export function getReactionEcho(contentId, state = {}) {
  if (contentId === 'screen_next_time') {
    const source = storyEvents(state,'xiaoman').find(event => event.choiceId === 'screen_help');
    if (!source) return null;
    const familiar = feelsFamiliar(getSocialContext(state,'xiaoman'));
    if (familiar && source.reaction?.variant === 'divide_work') return '小满把下一场的开门时间单独发给你：“还记得上次那几根线吧？你要是来，咱们可以分头准备。”她先问你的安排，没有直接把名字填进值班表。';
    if (familiar) return '小满在群里发了下一场放映的时间，又单独问你上次认过的插口还记不记得：“想再试一次的话，这回我们早点到。”';
    return '小满发来下一场放映的时间，附了一张收线后的位置图：“上次那两根在这里。你要来，可以先跟我一起试声音。”';
  }
  if (contentId === 'photo_comparison') {
    const source = storyEvents(state,'linye').find(event => event.choiceId === 'photo_same_place');
    if (!source) return null;
    if (hasListened(state)) return '林野发来湖边前后两张照片，又补了一句当天走到那里时想起的事。你们聊了一会儿，他说那句话就先留在聊天里，照片仍只发了风景。';
    return feelsFamiliar(getSocialContext(state,'linye'))
      ? '林野发来同一角度的新照片：“你上次说的那块岸边，现在全是叶子。”他把两张拼在一起，又问你下次路过想不想再看一眼。'
      : '林野把湖边前后两张照片发给你，标出上次站的位置。你们确认树叶的变化，他没有把这次独自走过的事一口气都讲出来。';
  }
  if (contentId === 'dorm_hometown') {
    const source = storyEvents(state,'ahe').find(event => event.choiceId === 'lights_talk');
    if (!source) return null;
    return feelsFamiliar(getSocialContext(state,'ahe'))
      ? '晚饭时阿禾又接上停电那晚没讲完的话，说家里那家面馆每次都把葱切得很粗。他看看你碗里的葱，笑了半天，这回不必先解释话从哪儿来。'
      : '晚饭时阿禾问你还记不记得停电那晚聊到的家乡。你点头，他才继续讲那天没讲完的一截；吃完以后，你们又各自去忙手头的事。';
  }
  return null;
}
