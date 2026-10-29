const FOCUS = [
  { id: 'make', label: '给作品留时间', detail: '多做、多试；手头和休息会紧一些。' },
  { id: 'connect', label: '多和身边的人来往', detail: '把周末留给见面和共同的事；片子慢一点。' },
  { id: 'settle', label: '先把日子安顿好', detail: '休息、存些备用钱；这阵子少赶作品。' },
];
const ARRANGEMENTS = [
  { id: 'edit_lab', label: '约一次剪辑练习', detail: '带着现有素材，认真试一轮声音和节奏。', time: 2, money: 2 },
  { id: 'work_together', label: '约周舟一起剪一段', detail: '一起处理她带来的录音，商量怎样分工。', time: 3, money: 1 },
  { id: 'visit_home', label: '抽空回一趟澄江', detail: '在铺子里吃顿饭，也和周舟碰个面。', time: 3, money: 2 },
];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const money = n => '约' + (n * 1000).toLocaleString('zh-CN') + '元';
const active = state => state?.status === 'living' && state.facts?.college === 'away' && state.facts.young && state.age >= 23 && state.age <= 30;

export function makeYoungLife() {
  return {
    focus: null, progress: 0, skill: 0, reserve: 3, energy: 5, connection: 1,
    cooperation: false, arranged: null, history: [], closingChoice: null,
    followupDue: false, followupDone: false, fareDeferred: 0,
    lastVisitAge: null, cooperationAge: null,
  };
}

export function getYoungTime(facts, age) {
  const y = facts.young;
  const busy = age === 24 || age === 27;
  const promised = age === 30 && y?.followupDue ? 2 : 0;
  return { total: busy ? 4 : 6, promised, free: (busy ? 4 : 6) - promised, busy };
}

function arrangementAvailability(state, action) {
  const y = state.facts.young;
  if (!active(state)) return '这一段生活已经过去。';
  if (state.pending) return '先处理眼前这件事。';
  if (y.arranged) return y.arranged.id === action.id ? '今年已经约好了。' : '今年已留出一件事的时间，先把约好的做完。';
  if (action.id === 'work_together') {
    if (y.cooperation) return '你们已经共同做过一段，分工的约定还在。';
    if (![25, 26].includes(state.age)) return state.age < 25 ? '周舟这阵子还抽不出整段时间，之后再问问。' : '周舟正在忙文化馆的项目，这阵子接不下新的合作。';
  }
  if (getYoungTime(state.facts, state.age).free < action.time) return '今年能留出来的时间已经不够。';
  if (y.reserve < action.money) return '手头还需要' + money(action.money - y.reserve) + '备用金。';
  return '';
}

export function setYoungFocus(facts, focus) {
  if (!FOCUS.some(option => option.id === focus)) throw new Error('Unknown life focus: ' + String(focus));
  facts.young.focus = focus;
}

export function planYoungArrangement(state, id) {
  const action = ARRANGEMENTS.find(option => option.id === id);
  if (!action) throw new Error('Unknown arrangement: ' + String(id));
  const reason = arrangementAvailability(state, action);
  if (reason) throw new Error(reason);
  state.facts.young.arranged = { id, age: state.age };
}

/** Settles one actually elapsed year. The returned scene records that year's life. */
export function settleYoungYear(facts, age) {
  const y = facts.young;
  if (!y || facts.college !== 'away' || age < 23 || age > 30) return null;
  if (y.history.some(row => row.age === age)) throw new Error('A young-life year was settled twice.');
  const time = getYoungTime(facts, age);
  const action = y.arranged && y.arranged.age === age ? ARRANGEMENTS.find(a => a.id === y.arranged.id) : null;
  const before = { progress: y.progress, skill: y.skill, reserve: y.reserve, energy: y.energy };
  const spare = time.free - (action?.time || 0);
  const effort = y.energy < 2 ? Math.floor(spare / 2) : spare;
  let text = '';
  y.reserve = clamp(y.reserve + 1 - (action?.money || 0) - y.fareDeferred, 0, 8);
  y.fareDeferred = 0;
  if (y.focus === 'make') {
    if (facts.filmStatus === 'draft') y.progress = clamp(y.progress + effort, 0, 18);
    y.skill = clamp(y.skill + Math.floor(effort / 2), 0, 12);
    y.reserve = clamp(y.reserve - (effort >= 4 ? 2 : 1), 0, 8);
    y.energy = clamp(y.energy - (effort >= 4 ? 2 : 1), 0, 6);
    y.connection = clamp(y.connection - 1, 0, 6);
    text = facts.filmStatus === 'draft'
      ? effort >= 4 ? '你把几个空下来的周末留给片子。镜头接得顺一些，吃饭和回消息的时间也越挤越晚。' : '下班后还开过几次剪辑软件。能用的时间不多，你先把一小段声音接顺，没有急着交出去。'
      : '你又打开剪辑软件，整理留下的素材，试着把几处声音接得自然一点。片子已经交出，日常练习还在继续。';
  } else if (y.focus === 'connect') {
    y.connection = clamp(y.connection + (spare >= 3 ? 2 : 1), 0, 6);
    y.energy = clamp(y.energy + 1, 0, 6);
    if (spare >= 3 && facts.filmStatus === 'draft') y.progress = clamp(y.progress + 1, 0, 18);
    text = facts.filmStatus === 'draft'
      ? '你把几个周末空出来，认真听完周舟的语音，也约人吃了饭。片子只动了一点，见面却不用总说下次。'
      : '片子交出去以后，你把几个周末留给来往，认真听完周舟的语音，也约人吃了饭。见面不用总说下次。';
  } else if (y.focus === 'settle') {
    y.reserve = clamp(y.reserve + Math.floor(spare / 2), 0, 8);
    y.energy = clamp(y.energy + Math.ceil(spare / 3), 0, 6);
    text = '你没有接太多额外的事，收拾住处、好好睡觉。备用的钱多留了一点，电脑里的片子暂时没怎么动。';
  } else {
    text = '工作、买菜和洗衣照常。空下来的日子没有另作安排，片子仍留在上次打开的位置。';
  }
  if (action?.id === 'edit_lab') {
    if (facts.filmStatus === 'draft') y.progress = clamp(y.progress + 2, 0, 18);
    y.skill = clamp(y.skill + 2, 0, 12);
    text += ' 约好的剪辑练习做完了：你重排了一段镜头，听出了原先没注意到的接缝。';
  } else if (action?.id === 'work_together') {
    y.progress = clamp(y.progress + 3, 0, 18);
    y.skill = clamp(y.skill + 1, 0, 12);
    y.connection = clamp(y.connection + 2, 0, 6);
    y.cooperation = true;
    y.cooperationAge = age;
    text += ' 你和周舟一起剪完她带来的那段录音。她负责声音，你接画面；真有需要时，可以再商量这个分工。';
  } else if (action?.id === 'visit_home') {
    y.lastVisitAge = age;
    y.connection = clamp(y.connection + 1, 0, 6);
    y.energy = clamp(y.energy + 1, 0, 6);
    text += ' 你回澄江吃了顿晚饭，看父亲修一台收音机。为这趟来回，原想留给片子的几个晚上没有再补上。';
  }
  if (time.busy) text = '这一年的展览排得密，能留给自己的时间比平常少。' + text;
  if (time.promised) {
    y.followupDue = false;
    y.followupDone = true;
    text += ' 你按约帮周舟整理文化馆的录音，用掉今年两个完整的空闲周末。她接走备份，你也把这项共同承担的事做完了。';
  }
  y.history.push({
    age, focus: y.focus, arrangement: action?.id || null,
    availableTime: time.total, promisedTime: time.promised, arrangementTime: action?.time || 0,
    focusTime: spare, effectiveTime: effort, before,
    after: { progress: y.progress, skill: y.skill, reserve: y.reserve, energy: y.energy },
  });
  y.arranged = null;
  return {
    title: time.promised ? '约好的录音也占了时间' : action?.id === 'work_together' ? '真正一起做过一段' : time.busy ? '留给自己的时间少了一些' : '这一年怎么过',
    text,
  };
}

export function getClosingPlan(facts) {
  const y = facts.young || makeYoungLife();
  const preparedDays = 7 - Math.floor(y.progress / 6) - Math.floor(y.skill / 5);
  const fullDays = Math.min(7, Math.max(4, preparedDays) + (y.energy < 2 ? 1 : 0));
  const shortDays = Math.max(2, fullDays - 3);
  const coeditDays = Math.max(2, fullDays - 2);
  const travelDays = 4, travelCost = 2, daysAvailable = 7;
  let shortReason = '', coeditReason = '';
  if (shortDays + travelDays > daysAvailable) shortReason = '精简版还需' + shortDays + '天，往返和搬店另需4天，这周排不下。';
  else if (y.reserve < travelCost) shortReason = '周内往返需要快车票，现有备用金还差' + money(travelCost - y.reserve) + '。';
  if (!y.cooperation) coeditReason = '你们还没有实际一起剪过东西，临时托付整段分工并不合适。';
  else if (y.connection < 2) coeditReason = '你们最近总错过消息，还没把这次的分工对上，临时托付来不及了。';
  else if (coeditDays + travelDays > daysAvailable) coeditReason = '周舟只能接声音部分，你自己的收尾和回乡仍需' + (coeditDays + travelDays) + '天。';
  else if (y.reserve < travelCost) coeditReason = '要在这一周回来，需要再留' + money(travelCost - y.reserve) + '快车票钱。';
  return {
    fullDays, remainingDays: fullDays, shortDays, coeditDays, daysAvailable, travelDays, travelCost,
    fullCostDetail: '完整版要补拍两个夜晚，另留两天核对声音与输出；其余是尚未整理完的部分。',
    shortTotalDays: shortDays + travelDays, coeditTotalDays: coeditDays + travelDays,
    canShort: !shortReason, shortReason, canCoedit: !coeditReason, coeditReason,
  };
}

export function applyClosingChoice(facts, id) {
  const y = facts.young;
  const plan = getClosingPlan(facts);
  if (!['return_home', 'finish_film', 'short_cut_home', 'co_edit_home'].includes(id)) throw new Error('Unknown closing choice.');
  if (id === 'short_cut_home' && !plan.canShort) throw new Error(plan.shortReason);
  if (id === 'co_edit_home' && !plan.canCoedit) throw new Error(plan.coeditReason);
  facts.closingPresence = id !== 'finish_film';
  facts.closingRecording = facts.closingPresence ? 'own' : 'mother-video';
  facts.filmStatus = id === 'return_home' ? 'draft' : 'submitted';
  facts.filmEdition = id === 'short_cut_home' ? 'short' : 'full';
  facts.filmCredit = id === 'co_edit_home' ? 'joint' : 'solo';
  if (!y) return;
  y.closingChoice = id;
  if (id === 'return_home') {
    if (y.reserve > 0) y.reserve--;
    else y.fareDeferred = 1;
    y.energy = clamp(y.energy - 1, 0, 6);
  } else if (id === 'short_cut_home' || id === 'co_edit_home') {
    y.reserve -= plan.travelCost;
    y.energy = clamp(y.energy - 2, 0, 6);
  } else {
    y.energy = clamp(y.energy - Math.ceil(plan.fullDays / 3), 0, 6);
  }
  if (id === 'co_edit_home') y.followupDue = true;
}

function filmValue(facts) {
  const y = facts.young;
  if (facts.filmStatus === 'submitted' || facts.filmStatus === 'screened') return (facts.filmCredit === 'joint' ? '联名完整版' : facts.filmEdition === 'short' ? '精简版' : '个人完整版') + ' · 已提交';
  return y.progress >= 12 ? '有了能从头看到尾的粗剪' : y.progress >= 6 ? '有几段接得起来了' : y.progress ? '正在把零散镜头接起来' : '素材还散在文件夹里';
}

export function getYoungView(state) {
  const y = state?.facts?.young;
  const isActive = Boolean(active(state));
  if (!y) return { active: false, needsPlan: false, summary: '' };
  const time = getYoungTime(state.facts, state.age);
  const completed = state.age >= 31;
  const summary = completed ? y.followupDone ? '30岁，你按约帮周舟整理了文化馆的录音；共同署名之后，也真实分担了后续的时间。' : y.closingChoice === 'short_cut_home' ? '当年交出了删减后的版本，也赶回旧铺。被删掉的几段素材仍在备份里。' : y.closingChoice === 'finish_film' ? '那一周留给了片子。父母关门时，你收到的是母亲传来的视频。' : '你把旧铺的最后几天留给家人，个人短片没有参加当届征集。' : '';
  const effort = '今年能留出' + time.total + '个完整的空闲周末' + (time.promised ? '，其中2个已经答应留给周舟' : '') + '。这里只算能专心安排一件事的整段时间，平时休息不从这里扣。';
  const planned = y.arranged ? ARRANGEMENTS.find(a => a.id === y.arranged.id) : null;
  const commitmentText = y.followupDue ? '已答应：30岁留出2个完整的空闲周末，帮周舟整理文化馆的录音。' : y.followupDone ? '30岁答应的录音整理已经完成。' : y.fareDeferred ? '慢车票先从以后的生活费里挪，下次结算先补回约1000元。' : '';
  const canMeetZhou = isActive && [25, 26].includes(state.age) && !y.cooperation;
  return {
    active: isActive, needsPlan: isActive && y.focus === null, focus: y.focus,
    yearTime: { total: time.total, promised: time.promised, free: time.free },
    yearLabel: state.age + '岁 · ' + (2005 + state.age) + '年',
    headline: state.age === 28 ? '父母收到了搬店通知，周舟也在忙老街采录。' : canMeetZhou ? '周舟今年要剪一段采访，问要不要一起弄。她今年排得出时间。' : time.busy ? '展览排得密，今年少一些自己的时间。' : state.age === 30 && y.followupDue ? '共同署名以后，今年也要给答应的事留时间。' : '工作照常，也给自己的生活留一点位置。',
    items: [
      { label: '手上的片子', value: filmValue(state.facts), detail: y.skill >= 6 ? '现在能独自处理大部分剪辑收尾。' : y.skill >= 2 ? '处理接缝比刚开始顺手一些。' : '边做边摸索，还需要反复试。' },
      { label: '手头', value: money(y.reserve) + '可动用', detail: '这是扣除日常固定开销后留的备用金；临时快车往返约2000元。' },
      { label: '自己的时间', value: time.free + '个空闲周末 · ' + (y.energy <= 1 ? '需要缓一缓' : y.energy <= 3 ? '有些累' : '精力尚可'), detail: effort },
      { label: '和周舟', value: y.cooperation ? y.connection >= 2 ? '做过合作，最近也有来往' : '做过合作，最近没对上话' : y.connection >= 3 ? '最近常来往' : y.connection ? '偶尔联系' : '语音经常没来得及回', detail: y.cooperation ? y.connection >= 2 ? '有了声音与画面的分工，最近也能把事情对上。' : '以前共同剪过一段，但最近总错过消息。要再合作，得专门留时间把话说清。' : y.lastVisitAge !== null ? y.lastVisitAge + '岁回过澄江，一起吃过饭。' : '共同做事的经验，需要真的安排时间。' },
    ],
    focusOptions: FOCUS.map(option => ({ ...option, selected: option.id === y.focus })),
    arrangements: ARRANGEMENTS.map(action => {
      const reason = arrangementAvailability(state, action);
      return { id: action.id, label: action.label, detail: action.detail, timeCost: action.time, moneyCost: action.money * 1000, cost: '占今年' + action.time + '个完整空闲周末、' + money(action.money) + '备用金，减少留给日常重心的时间。', available: !reason, reason, selected: planned?.id === action.id };
    }),
    plannedText: planned ? '今年已约好：' + planned.label + '。费用和实际经历会在这一年过去后记下。' : '可以照着现在的安排过，也可以另约一件具体的事。',
    commitmentText, notice: isActive ? (canMeetZhou ? '周舟问起合作的事，可以在主动安排里约她。' : state.age === 28 && y.cooperation && y.connection < 2 ? '最近总错过周舟的消息。如果还想一起做事，得先抽空把分工对上。' : '') : '', summary,
  };
}
