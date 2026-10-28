/** Small, authored encounters. The engine owns their calendar cost and replay. */
const PEOPLE = Object.freeze({
  ahe: {name:'阿禾',location:'dorm',chat:'找阿禾聊聊近况',activity:'约阿禾一起吃饭',
    chatDescription:'课后坐一会儿，听听彼此这两天在忙什么。',
    activityDescription:'一起去食堂，吃完再各自忙自己的事。',
    chatBusy:{3:'阿禾这段课余要去做小组讨论，没法坐下来聊。'},
    activityBusy:{2:'阿禾已经和同组的人约了饭，要边吃边讨论作业。',3:'阿禾的小组讨论会拖到饭点，这次先不一起吃。',6:'阿禾约了球友，打完会和他们一起吃。'}},
  xiaoman: {name:'小满',location:'club',chat:'找小满聊聊电影',activity:'约小满一起试设备',
    chatDescription:'找个她不赶着开场的空当，聊聊最近看的片子。',
    activityDescription:'把放映的声音和接口一起试一遍，熟悉彼此怎样搭手。',
    chatBusy:{4:'小满要盯完整段排练，顾不上坐下来聊电影。'},
    activityBusy:{2:'活动室借给了排练，这段课余不能试放映设备。',4:'小满要跟排练，没空一起试设备。',6:'这段时间设备要借出去，小满也在帮忙搬。'}},
  linye: {name:'林野',location:'lake',chat:'找林野聊聊这两天',activity:'约林野沿湖拍照',
    chatDescription:'不用先找一件大事，从课间和校园里的近况聊起。',
    activityDescription:'沿湖走一段，各拍几张；拍什么、留下什么再一起确认。',
    chatBusy:{3:'林野正在赶一份要交的作业，想先把这一段做完。'},
    activityBusy:{0:'林野要去做课程调研，这次没空沿湖走。',3:'林野要赶作业，来不及绕湖。',5:'林野约好了去校外办事，这段课余不在学校。'}},
});

export function socialHistory(state = {}, personId) {
  return (state.events || []).filter(event => event.kind === 'social' && event.personId === personId);
}

function availabilityReason(state, personId, actionId, day) {
  const history = socialHistory(state,personId);
  const latest = history.at(-1);
  const sameAction = history.filter(event => event.actionId === actionId).at(-1);
  if (latest && day - latest.day < 2) return `刚和${PEOPLE[personId].name}待过一段课余，先各自过过日常，隔些时候再找。`;
  if (sameAction && day - sameAction.day < (actionId === 'activity' ? 4 : 2)) {
    return actionId === 'activity' ? '这件小事刚一起做过，过几天再约会更合适。' : '上次刚聊过，隔些时候有了新近况再说。';
  }
  return PEOPLE[personId][`${actionId}Busy`][day % 7] || '';
}

/** Only the next free-time period is booked; later dates are information, not promises. */
export function socialOptionsFor(state = {}, personId, totalDays = 91) {
  const person = PEOPLE[personId];
  if (!person) return [];
  const whenDay = state.day + 1;
  let blocked = '';
  if (!(state.peopleMet || []).includes(personId)) blocked = `还没有认识${person.name}。`;
  else if (state.phase === 'ended' || whenDay >= totalDays) blocked = '这段秋季试玩已经结束，留不到下一段课余了。';
  else if (state.pending) blocked = '先回应眼前的事，再安排下一段课余。';
  return ['chat','activity'].map(actionId => {
    const reason = blocked || availabilityReason(state,personId,actionId,whenDay);
    let nextAvailableDay = reason ? null : whenDay;
    if (reason && !blocked) {
      for (let day = whenDay + 1; day < totalDays; day++) {
        if (!availabilityReason(state,personId,actionId,day)) {nextAvailableDay = day; break;}
      }
    }
    return {actionId,title:person[actionId],description:person[`${actionId}Description`],
      enabled:!reason,reason,whenDay,nextAvailableDay};
  });
}

const ENCOUNTERS = Object.freeze({
  ahe: {
    chat: [
      {text:'你问阿禾这两天在忙什么。两个人坐在床沿，聊了一会儿总走错的教学楼；临走前，他才想起自己的水壶还放在走廊。',
        reply:'阿禾先指了指课表：“我这节老记错地方，你也会吗？”说到走错的那一次，他自己先笑了。你听完，他又问你平时从哪条路过去。'},
      {text:'你又找阿禾坐了一会儿。谁都没有准备话题，先说起这两天课后的去向，聊到一半，各自翻了翻课表。',
        reply:'阿禾把手机放低：“这两天怎么样？”你说到一半停下来找词，他没有抢着接，只挪开旁边的书，给你留了块能坐稳的地方。'},
      {text:'你和阿禾在宿舍里闲聊。近况里有新鲜事，也有没什么可讲的部分；说完一阵，你们各自低头做了会儿手里的事。',
        reply:'阿禾没有急着找下一个话题。你问到这两天，他先讲了件很小的事，讲完看看你：“听起来是不是挺没意思的？”你们笑了一阵，安静下来也没觉得要赶紧收场。'},
    ],
    activity: [
      {text:'你约阿禾一起去食堂。两个人在不同窗口排队，端着盘子找了张空桌，边吃边聊哪条队看着短、等起来却慢。',
        reply:'阿禾先问你想吃哪个窗口，没替你点。他端着盘子绕了一圈，找到位置才抬手招呼：“这里还空着，我把包挪开。”'},
      {text:'你和阿禾又约了顿饭。到了食堂各自点想吃的，坐下时饭菜已经凉了一点；你们说起这几天碰到的小事，吃完一起收了餐盘。',
        reply:'阿禾看见你过来，把对面的椅子拉开：“我先坐了，没给你乱点。”说到一件好笑的事，他差点忘了盘子里还有最后一口，停下来让你先把话说完。'},
      {text:'你和阿禾去食堂吃了顿普通的饭。有一会儿谁都在认真吃东西，后来又接着聊；收好餐盘，你们在路口分开，各自回去。',
        reply:'阿禾端着盘子往熟悉的角落走，回头确认你跟没跟上：“今天坐这边？”饭快吃完时他问你接下来去哪儿，听见你另有安排，点点头就把自己的餐盘也端起来。'},
    ],
  },
  xiaoman: {
    chat: [
      {text:'你找了个空当，和小满聊起最近看的电影。她说自己有时忙着准备放映，反而会错过片子中间的一小段；你们各讲了一处还记得的画面。',
        reply:'小满起初还在收东西，听你说到一个镜头才停下：“你怎么会记住这里？”她把手里的线放到一边，等你说完，没有急着给那一段下结论。'},
      {text:'你又来找小满聊片子。这回没有挑电影清单，话题从一个看不明白的地方开始，绕到各自更容易记住怎样的画面。',
        reply:'小满说到一半笑了：“我也不一定看懂。”她没有把话题变成出题考你，反而先讲了自己没想清楚的一处，等你也把那一段说完。'},
      {text:'你和小满坐下来聊了一会儿电影。你们对一处安排看法不同，讲了几句仍没说服彼此，最后一起去把门口那摞椅子让开。',
        reply:'小满把你的说法又念了一遍：“原来你是这样看的。”她还保留自己的想法，却没再急着争出谁说得对；收场前，又问了一句你没来得及讲完的地方。'},
    ],
    activity: [
      {text:'你约小满在空下来的活动室试设备。她说明了接口，你跟着接线、试音，把没出声的那一步重新走了一遍；结束后，一起把线收回原处。',
        reply:'小满没有把整箱东西都递给你，先让出一个能看清插口的位置：“这根接这里，你来试一下。”没出声时，她也没马上接过去，而是陪你一起找漏掉的开关。'},
      {text:'你又和小满试了一遍设备。这回先各接一部分，开机后互相确认声音；有根线插错了，你们拔出来重接，试好才把东西收起来。',
        reply:'小满指着设备箱问：“这次你先接声音，我去拿幕布？”她等你点头才走开；回来时先听你讲哪一步卡过，再把自己那边的情况说清楚。'},
      {text:'你和小满在活动室分头试设备。接口和收纳的位置都渐渐认得，你们各自做完一边，再一起过了声音和画面。',
        reply:'小满把设备箱推近一点，没有逐根再讲一遍：“还是分两边？”你确认过声音，她也招手让你来看画面；临走时，两个人一起检查了电源，才把门带上。'},
    ],
  },
  linye: {
    chat: [
      {text:'你在课后找林野聊了会儿这两天的近况。他说起校园里几处自己会绕过去的地方，你没有替他找一个特别的理由，只听他慢慢讲。',
        reply:'林野先说“也没什么”，过了一会儿又补了一件小事。你没有催着换话题，他才接着讲下去；话停下来时，你们看了会儿路边经过的人。'},
      {text:'你又和林野聊了一阵。话题没有都围着照片转，你们各说起这几天遇到的一件事；他讲到不太想展开的地方，你就陪他换了个话头。',
        reply:'林野说话没有上次那么急着收尾。有一截他停下来，说先不讲了，你应了一声，他反倒又问起你这两天的事，等你按自己的速度说完。'},
      {text:'你和林野在下课后待了一会儿。有些近况三两句就能讲完，有些说到一半才想起前因；你们没有拿出手机记录，话就留在这段课余里。',
        reply:'林野听完你的近况，先问你想不想接着说。轮到他时，也不再为每次停顿解释；有句话他说只聊到这里，你们便一起看向路上的树，过一会儿再聊别的。'},
    ],
    activity: [
      {text:'你约林野沿湖走一段、各拍几张。他说想看看水边树叶的颜色，你们在两处停下来，互相看了看画面；拍到对方前，都先问了一句。',
        reply:'林野先问你想从哪边走。到了水边，他把屏幕转过来：“我想留这棵树，你呢？”你们各自决定拍什么，镜头扫到人时，他先把手机放低了。'},
      {text:'你和林野又沿湖走了一回。这次边走边说想留下什么，你们各试了几个角度，挑出想自己留着的几张，没急着发给别人看。',
        reply:'林野站在你旁边看了一会儿：“这回你先挑地方，我跟着走。”他拍到一半问你要不要看，见你点头才递过屏幕；涉及人的那张，仍先确认对方愿不愿意留下。'},
      {text:'你和林野沿湖拍了几张照片，也有一段只是走着。你们能听懂彼此说的是哪种画面，意见不同时就各试一次，最后各自收好手机。',
        reply:'林野拍完没有立刻往下一个地方赶，停下来听你说刚才为什么按快门。有张照片他不想留，你们就把它删掉；相处熟了，谁都不用勉强把不愿意的画面交出去。'},
    ],
  },
});

function previousReference(personId, actionId, previous) {
  if (!previous) return '';
  if (personId === 'ahe') return previous.actionId === 'chat'
    ? '阿禾还记得上回你们聊过的近况，这次先问了一句后来怎么样。'
    : '阿禾提起上回一起去食堂的事，又问这两天有没有碰见想吃的饭菜。';
  if (personId === 'xiaoman') return previous.actionId === 'chat'
    ? '小满接上你们上回聊过的片子，又问你后来有没有想起别的地方。'
    : actionId === 'activity' ? '说到接线时，小满指了指你们上回一起试过的接口，这回不必从头认。' : '小满提到上回一起试设备时绕过的那一步，你们顺着聊起放映时总会漏看的画面。';
  return previous.actionId === 'chat'
    ? '林野先问起你们上回聊天时说到的近况；你愿意说多少，他就听到哪里。'
    : '林野提起你们上回沿湖走过的那一段，等你也想起那处停下来的地方，才接着往下说。';
}

/** Returns content only; committing the encounter and advancing a day belong to the engine. */
export function buildSocialEvent(previous, personId, actionId, context = {}) {
  const person = PEOPLE[personId];
  const scenes = ENCOUNTERS[personId]?.[actionId];
  if (!person || !scenes) return null;
  const history = socialHistory(previous,personId);
  const sameAction = history.filter(event => event.actionId === actionId);
  const tier = Math.min(sameAction.length,2);
  const scene = scenes[tier];
  const prior = history.at(-1);
  const reference = previousReference(personId,actionId,prior);
  const warmOpening = history.length === 0 && (context.familiarityDays || 0) >= 14
    ? `${person.name}见到你先打了招呼，这回是在日常碰面之外，专门留一段时间待着。` : '';
  const sourceEventIds = [...new Set([...(context.sourceEventIds || []),...(prior ? [prior.id] : [])])];
  return {kind:'social',title:person[actionId],choiceTitle:person[actionId],text:scene.text,
    personId,actionId,initiator:'player',location:person.location,sourceEventIds,
    reaction:{personId,variant:`${actionId}:${tier}:${history.length === 0 && (context.familiarityDays || 0) >= 14 ? 'known' : 'visits'}`,
      text:[warmOpening,reference,scene.reply].filter(Boolean).join(''),
      note:history.length ? '上回聊过、做过的事，这次又接了下去。' : '课表之外，开始有了主动找彼此的来往。',
      context:{familiarityDays:context.familiarityDays || 0,cooperation:context.cooperation || 0,sourceEventIds}}};
}
