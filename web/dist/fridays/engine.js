/** A tiny, deterministic scene engine. The player owns decisions, never a score. */
export const SAVE_VERSION = 1;

const STAGES = ['arrival', 'first_door', 'first_close', 'prep_one', 'prep_two', 'film', 'seats', 'door', 'ending'];
const PREPARATIONS = ['preview', 'room', 'ahe', 'linye'];
const clone = value => JSON.parse(JSON.stringify(value));

export function createGame() {
  return {
    version: SAVE_VERSION,
    stage: 'arrival',
    first: { help: null, response: null },
    prep: [],
    plan: { film: null, seats: null, door: null },
    history: [],
  };
}

export function getChoices(state) {
  switch (state?.stage) {
    case 'arrival': return ['picture', 'welcome'];
    case 'first_door': return ['pause', 'quiet'];
    case 'first_close': return ['return'];
    case 'prep_one':
    case 'prep_two': return PREPARATIONS.filter(id => !state.prep.includes(id));
    case 'film': return ['feature', 'shorts'];
    case 'seats': return ['rows', 'circle', ...(state.prep.includes('room') ? ['arc'] : [])];
    case 'door': return [
      'pause', 'side',
      ...(state.prep.includes('preview') ? ['recap'] : []),
      ...(state.prep.includes('ahe') ? ['handoff'] : []),
      ...(state.prep.includes('linye') ? ['message'] : []),
    ];
    default: return [];
  }
}

export function choose(state, choiceId) {
  if (!getChoices(state).includes(choiceId)) throw new Error(`Unavailable choice: ${String(choiceId)}`);
  const next = clone(state);
  const stage = state.stage;
  if (stage === 'arrival') next.first.help = choiceId;
  if (stage === 'first_door') next.first.response = choiceId;
  if (stage === 'prep_one' || stage === 'prep_two') next.prep.push(choiceId);
  if (stage === 'film') next.plan.film = choiceId;
  if (stage === 'seats') next.plan.seats = choiceId;
  if (stage === 'door') next.plan.door = choiceId;
  next.history.push({ stage, choiceId });
  next.stage = STAGES[STAGES.indexOf(stage) + 1];
  return next;
}

/** A snapshot at 20:50: no score, just a different evening people shared. */
export function getOutcome(state) {
  if (state?.stage !== 'ending') return null;
  const { film, seats, door } = state.plan;
  const short = film === 'shorts';
  const open = seats !== 'rows';
  const familiarGreeting = state.first.help === 'welcome';
  const familiarVoice = state.first.response === 'pause';
  const doorway = door === 'side' && !familiarGreeting;
  const room = {
    you: doorway ? 'door' : short && open ? 'talking' : 'seated',
    xiaoman: doorway ? 'door' : 'seated',
    ahe: !doorway && short && open && state.prep.includes('ahe') ? 'talking' : 'seated',
    linye: doorway ? 'door' : short && open && (familiarVoice || door !== 'side') ? 'talking' : 'seated',
  };
  const title = doorway ? '散场以后，走廊里还没聊完'
    : short ? room.linye === 'talking' ? '下一场的片单，不只在你手机里' : '后排还亮着一小块光'
      : '这次，小满看到了片尾';
  const paragraphs = [];

  const layoutText = seats === 'rows'
    ? '大家还朝着银幕坐着，不开口也自在。'
    : seats === 'circle'
      ? '看电影时转过的椅子，片尾后又转回彼此的方向。'
      : '你这周试过的弧形座位留着一道过道，想说话的人稍稍转过身。';
  paragraphs.push((short
    ? '两部短片放完了，话题从银幕上的便利店绕到了校门口的夜宵摊。'
    : '最后一班电车从银幕上开走。没有人急着开顶灯，阿禾抱着外套，等片尾音乐播完。') + layoutText);

  const methodText = {
    pause: short
      ? '你刚才停下那轮讨论，给林野留了一个介绍自己的空当。原来那段话没再接回去，他倒是记住了大家的名字。'
      : '电影等了三分钟，林野听明白后和大家一起往下看。阿禾请你别讲后面：她还想留一点自己看懂的余地。',
    side: (familiarGreeting ? '阿禾记得上周你给她留座，指了指身旁的空椅子，小满便放心坐着。' : '你去门边接林野，小满习惯性地跟了出来；你们还没自然地把这件事交接过去。')
      + (short ? '林野错过了第一部，第二部开始前，你陪他聊了几句。' : '电影一直放着。林野暂时没懂那封信的来历，决定明天自己补开头。'),
    recap: short
      ? '你把短片留下的问题写在纸上递到门边。林野有自己的想法，却没看过大家争论的那个镜头；错过的内容，仍然要以后再补。'
      : '你写清前情，把纸条送到门边。林野能接着看了，你自己却错过了桥头的一小段，散场后还得问阿禾。纸条也替代不了他错过的镜头。',
    handoff: '阿禾愿意帮忙留座，不必当众讲话。'
      + (short ? '她领林野进来，回来时你们刚好聊过她想接的那句话。' : '她领林野进来，回来时已经错过桥头的一小段，散场后请你补了一句。'),
    message: '你把这周聊好的空位和当前进度发给林野。他自己轻轻进来，不必被所有人看着，也少了一个正式认识大家的机会。',
  };
  paragraphs.push(methodText[door]);

  if (room.linye === 'talking') {
    paragraphs.push(familiarVoice
      ? '林野记得上周你停下来听他说话。这次他自己接了一句，临走前还往群里发了部短片：“下次能不能看看这个？”'
      : '林野参与了接下来的那轮讨论。没有补完前一部，也可以一起看第二部；他临走前问，下周还开不开门。');
  } else if (!doorway) {
    paragraphs.push('林野没有在大家面前说话，收椅子时才问起那个镜头。片名已经记进手机里，安静看完也算是他喜欢的一个晚上。');
  }

  let closing = doorway
    ? '后来小满回去看完了电影。散场时，你们三个又在走廊聊起来，约好了下次早点一起布置，暂时还没人想走。'
    : '小满没再来来回回守着门。现在她端着热水坐在原来的椅子上，问你：“下周我也提前给你挑一部？”';
  if (room.ahe === 'talking') closing += '你没让阿禾“给大家说两句”，只在旁边问她那个镜头，她便靠过来小声接上了。';
  paragraphs.push(closing);

  const learned = [state.first.help === 'picture'
    ? '上周调过的画面，这次你知道从哪里开始。'
    : '阿禾记得上周你给她留过位置，也留意谁还站在门边。'];
  const knowledge = {
    preview: '提前看过候选片，能写前情，却替代不了错过的镜头。',
    room: seats === 'arc'
      ? '这周在空教室试出的弧形座位，今晚真的摆出来了。'
      : `试过弧形摆法以后，今晚你还是选了${seats === 'rows' ? '面向银幕的几排' : '围坐的圈'}。知道另一种摆法，也可以暂时不用。`,
    ahe: '阿禾愿意私下帮忙，不喜欢突然被叫到所有人面前。',
    linye: '林野的工作室到七点半才下课；晚来并不是不想来。',
  };
  learned.push(...state.prep.map(id => knowledge[id]));
  const next = [short
    ? '阿禾发来一部长片：“下次能不能留一个安静看完的晚上？”'
    : '林野发来一个短片链接：“下次要不要看点短的，剩下时间聊聊？”'];
  next.push(seats === 'rows'
    ? '小满说椅子还可以换个摆法，问你有没有想试的。'
    : '下一次，你想继续坐在这个圈里，还是回到银幕前？');
  return {
    key: [film, seats, door, state.first.help, state.first.response, room.ahe, room.linye, room.xiaoman].join('-'),
    title, paragraphs, room, learned, next,
  };
}

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/** Only an exact, replayable history is accepted; saves cannot invent knowledge or skip scenes. */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== SAVE_VERSION || !Array.isArray(raw.history)) return null;
  if (raw.history.length > STAGES.length - 1) return null;
  let replay = createGame();
  try {
    for (const event of raw.history) {
      if (!event || typeof event !== 'object' || Array.isArray(event) || Object.keys(event).length !== 2) return null;
      if (event.stage !== replay.stage || typeof event.choiceId !== 'string') return null;
      replay = choose(replay, event.choiceId);
    }
    if (Object.keys(raw).length !== Object.keys(replay).length) return null;
    if (raw.stage !== replay.stage || !same(raw.first, replay.first) || !same(raw.prep, replay.prep) || !same(raw.plan, replay.plan) || !same(raw.history, replay.history)) return null;
    return replay;
  } catch {
    return null;
  }
}
