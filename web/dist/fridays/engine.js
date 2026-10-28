/** Calendar, practice and finite evening plans for the two-Friday slice. */
export const SAVE_VERSION = 2;
const clone = value => JSON.parse(JSON.stringify(value));
const PREPARATIONS = ['watch', 'practice', 'ahe', 'linye', 'rest'];
const ROUTES = ['curator', 'open_room', 'cohost', 'private', 'audience'];
const EVENINGS = {
  curator: [['feature', 'two_shorts'], ['early', 'late']],
  open_room: [['quiet_corner', 'chat_corner'], ['welcome_all', 'sit_with_friends']],
  cohost: [['make_playlist', 'run_projector'], ['big_room', 'small_room']],
  private: [['private_feature', 'private_shorts']],
  audience: [['sit_front', 'sit_back'], ['stay_credits', 'leave_with_ahe']],
};

export function createGame() {
  return {
    version: SAVE_VERSION, phase: 'intro', day: 0,
    skills: { content: 0, hands: 0 }, visits: { ahe: 0, linye: 0 },
    works: { theme: null, roomTested: false }, route: null, finale: [], history: [],
  };
}

export function getForecast(state) {
  const requirement = (label, current, target) => ({ label, current, target, met: current >= target });
  const route = (id, requirements) => ({ id, available: requirements.every(item => item.met), requirements });
  return [
    route('curator', [requirement('选片熟练', state.skills.content, 4), requirement('做过一份片单', state.works.theme ? 1 : 0, 1)]),
    route('open_room', [requirement('动手熟练', state.skills.hands, 4), requirement('试开过一次活动室', state.works.roomTested ? 1 : 0, 1)]),
    route('cohost', [requirement('选片熟练', state.skills.content, 2), requirement('动手熟练', state.skills.hands, 2)]),
    route('private', [requirement('和阿禾相处', state.visits.ahe, 2)]),
  ];
}

export function getChoices(state) {
  if (state?.phase === 'intro' && state.day === 0) return ['watch', 'help'];
  if (state?.phase === 'schedule' && state.day >= 1 && state.day <= 6) return [
    ...PREPARATIONS,
    ...(state.skills.content >= 2 ? ['curate_daily', 'curate_strange'] : []),
    ...(state.skills.hands >= 2 ? ['open_trial'] : []),
  ];
  if (state?.phase === 'friday' && state.day === 7) return [...getForecast(state).filter(item => item.available).map(item => item.id), 'audience'];
  if (state?.phase === 'scene' && state.day === 7) return [...(EVENINGS[state.route]?.[state.finale.length] || [])];
  return [];
}

export function choose(state, choiceId) {
  if (!getChoices(state).includes(choiceId)) throw new Error(`Unavailable choice: ${String(choiceId)}`);
  const next = clone(state);
  const add = key => { next.skills[key] = Math.min(4, next.skills[key] + 1); };
  next.history.push({ phase: state.phase, day: state.day, choiceId });
  if (state.phase === 'intro') {
    add(choiceId === 'watch' ? 'content' : 'hands');
    next.day = 1; next.phase = 'schedule';
  } else if (state.phase === 'schedule') {
    if (choiceId === 'watch') add('content');
    if (choiceId === 'practice') add('hands');
    if (choiceId === 'ahe' || choiceId === 'linye') next.visits[choiceId] = Math.min(2, next.visits[choiceId] + 1);
    if (choiceId === 'curate_daily' || choiceId === 'curate_strange') {
      add('content'); next.works.theme = choiceId === 'curate_daily' ? 'daily' : 'strange';
    }
    if (choiceId === 'open_trial') { add('hands'); next.works.roomTested = true; }
    next.day++;
    if (next.day === 7) next.phase = 'friday';
  } else if (state.phase === 'friday') {
    next.route = choiceId; next.finale = []; next.phase = 'scene';
  } else if (state.phase === 'scene') {
    next.finale.push(choiceId);
    if (next.finale.length === EVENINGS[next.route].length) next.phase = 'ending';
  }
  return next;
}

/** Facts describe the player's experience; "finished" means the player watched the whole program. */
export function getOutcome(state) {
  if (state?.phase !== 'ending') return null;
  const route = state.route;
  const [first, second] = state.finale;
  const room = { you: 'seated', xiaoman: 'left', ahe: 'left', linye: 'left' };
  let artifact = 'ticket', film = 'shorts', finished = true, guests = 3, watchedMinutes = 32, ownedTask = '观众';
  let sharedWith = [];
  const conditions = [];
  const share = id => { if (!sharedWith.includes(id)) sharedWith.push(id); };

  if (route === 'curator') {
    artifact = 'playlist'; ownedTask = '选片'; film = first === 'feature' ? 'feature' : 'shorts';
    const duration = film === 'feature' ? 82 : 32;
    const remaining = second === 'early' ? 95 : 65;
    watchedMinutes = Math.min(duration, remaining); finished = watchedMinutes === duration;
    room.xiaoman = 'seated'; share('xiaoman'); guests = 2;
    conditions.push(state.works.theme === 'daily' ? '你亲手完成了日常主题片单。' : '你亲手完成了奇妙主题片单。');
    conditions.push(second === 'early' ? '19:10开场，20:45关门，最多可放95分钟。' : '19:40开场，20:45关门，最多可放65分钟。');
    if (!finished) conditions.push('82分钟长片只放到第65分钟，关门前没有放完。');
    else conditions.push(`${duration}分钟节目完整放完，你也从头看到了尾。`);
    if (state.visits.ahe >= 1) { guests++; room.ahe = 'seated'; share('ahe'); conditions.push('阿禾收到你的邀请，19:10就来了。'); }
    if (state.visits.linye >= 1) {
      guests++; room.linye = 'seated'; share('linye');
      conditions.push(second === 'early' ? '林野19:40下课后来到，只看到了开场30分钟以后的内容。' : '按你们事先说好的时间，林野19:40到场，一起从开头看。');
    }
  } else if (route === 'open_room') {
    artifact = 'room'; ownedTask = '现场';
    const helped = state.visits.linye >= 2;
    const welcoming = second === 'welcome_all';
    guests = welcoming || helped ? 6 : 3;
    watchedMinutes = welcoming ? 14 : 32;
    finished = !welcoming;
    room.you = welcoming ? 'door' : first === 'chat_corner' ? 'talking' : 'seated';
    room.xiaoman = 'seated'; room.ahe = first === 'chat_corner' ? 'talking' : 'seated';
    share('xiaoman'); share('ahe');
    conditions.push(first === 'quiet_corner' ? '你布置了安静观看区，座位朝向银幕。' : '你布置了交流区，两部短片中间留给大家聊天。');
    if (welcoming) conditions.push('活动室向来往同学开放，共6人参加；你在门边照顾进出，只坐下看完了14分钟的第一部。');
    else if (helped) conditions.push('林野主动接过门口接待，6人参加；你能和朋友完整看完32分钟短片。');
    else conditions.push('只约你、小满和阿禾3人，你能坐下完整看完32分钟短片。');
    if (helped) {
      room.linye = 'door'; share('linye'); conditions.push('这周两次相处后，林野记得你的试场，主动来帮忙接待。');
    } else if (welcoming && state.visits.linye >= 1) {
      room.linye = first === 'chat_corner' ? 'talking' : 'seated'; share('linye'); conditions.push('林野来参加，但没有替你承担门口工作。');
    }
  } else if (route === 'cohost') {
    const selecting = first === 'make_playlist';
    artifact = selecting ? 'playlist' : 'room'; ownedTask = selecting ? '选片与小满合作' : '现场与小满合作';
    const big = second === 'big_room'; guests = big ? 6 : 3;
    watchedMinutes = big ? 14 : 32; finished = !big;
    room.you = big ? selecting ? 'talking' : 'door' : 'seated';
    room.xiaoman = big && selecting ? 'door' : 'seated'; room.ahe = 'seated';
    share('xiaoman'); share('ahe');
    conditions.push(selecting ? '你负责片单，小满负责设备与现场。' : '你负责设备与现场，小满负责片单。');
    conditions.push(big ? '6人的大场需要你继续介绍和照顾进度；节目放完32分钟，你自己只完整看了第一部14分钟。' : '3人的小场只约你、小满和阿禾，分工准备以后，你完整看了32分钟短片。');
    if (big && state.visits.linye >= 1) { room.linye = 'seated'; share('linye'); conditions.push('林野也来了，在小满预留的位置参加。'); }
  } else if (route === 'private') {
    artifact = 'dorm'; ownedTask = '朋友相处'; guests = 2;
    film = first === 'private_feature' ? 'feature' : 'shorts'; watchedMinutes = film === 'feature' ? 82 : 32;
    room.ahe = film === 'shorts' ? 'talking' : 'seated'; room.you = film === 'shorts' ? 'talking' : 'seated'; share('ahe');
    conditions.push('这周和阿禾相处两次以后，她主动约你在宿舍一起看片。');
    conditions.push(`只有你和阿禾2人，没有活动室接待任务；${watchedMinutes}分钟${film === 'feature' ? '长片' : '短片'}完整看完。`);
  } else if (route === 'audience') {
    artifact = 'ticket'; ownedTask = '观众'; film = 'feature'; guests = 3;
    room.xiaoman = 'seated'; room.ahe = 'seated';
    if (first === 'sit_front') { share('xiaoman'); conditions.push('你坐到前排，和小满一起留意银幕上的细节。'); }
    else { share('ahe'); conditions.push('你坐在后排阿禾旁边，一起小声交流。'); }
    if (second === 'stay_credits') {
      watchedMinutes = 82; finished = true; conditions.push('你留到片尾，完整看了82分钟电影。');
    } else {
      watchedMinutes = 60; finished = false; room.you = 'talking'; room.ahe = 'talking'; share('ahe');
      conditions.push('你和阿禾提前去吃夜宵，只看了60分钟电影，错过最后22分钟。');
    }
  }
  return { route, artifact, film, finished, guests, watchedMinutes, sharedWith, ownedTask, room, conditions };
}

function same(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left), rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(key => Object.hasOwn(right, key) && same(left[key], right[key]));
}

/** Every saved field must be reachable by replaying an exact, bounded calendar history. */
export function validateSave(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== SAVE_VERSION || !Array.isArray(raw.history) || raw.history.length > 10) return null;
  let replay = createGame();
  try {
    for (const entry of raw.history) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length !== 3) return null;
      if (entry.phase !== replay.phase || entry.day !== replay.day || typeof entry.choiceId !== 'string') return null;
      replay = choose(replay, entry.choiceId);
    }
    return same(raw, replay) ? replay : null;
  } catch { return null; }
}
