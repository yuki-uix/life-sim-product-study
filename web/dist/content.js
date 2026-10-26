/** Authored, fictional campus life. Pure content: no engine, DOM, network or randomness. */
export const CONFIG = Object.freeze({
  id: 'cn-campus-year-one', version: '0.3.0', schemaVersion: 3,
  programYears: 4, playableSemesters: 2, activitySlots: 2, maxSkill: 3,
  title: '大学慢慢来',
});

export const PEOPLE = Object.freeze({
  ahe: Object.freeze({ name: '阿禾', role: '你的室友' }),
  xiaoman: Object.freeze({ name: '小满', role: '社团里认识的同伴' }),
  linye: Object.freeze({ name: '林野', role: '同班同学' }),
});
export const SKILLS = Object.freeze({
  record: Object.freeze({ name: '记录', stages: ['还没试过', '开始留意', '能串成故事', '有自己的眼光'], description: '留意身边的细节，用照片、路线或文字把它们留下。' }),
  organize: Object.freeze({ name: '张罗', stages: ['还没试过', '敢搭把手', '能凑成一场', '有自己的办法'], description: '和人一起把一件小事安排起来，给大家留个舒服的位置。' }),
});

export const CHOICES = Object.freeze([
  { id: 'open_day', kind: 'activity', semester: 1, title: '跟室友去社团开放日', description: '不急着报名，先看看大家都在玩什么。', location: 'club', skillGains: { organize: 1 }, meet: ['xiaoman'], with: ['ahe', 'xiaoman'], memoryId: 'club_program', flags: { clubVisited: true } },
  { id: 'camera_walk', kind: 'activity', semester: 1, title: '借台相机，绕校园走走', description: '地图还没记熟，就先去看看湖边的晚霞。', location: 'lake', skillGains: { record: 1 }, meet: ['linye'], with: ['linye'], memoryId: 'first_sunset', flags: { foundLake: true } },
  { id: 'movie_night', kind: 'activity', semester: 1, title: '和阿禾张罗宿舍电影夜', description: '腾出一块墙面，把零食往桌子中间推一推。', location: 'dorm', skillGains: { organize: 1 }, meet: [], with: ['ahe'], memoryId: 'dorm_ticket', flags: { hostedMovie: true } },
  { id: 'rain_photos', kind: 'campus', semester: 1, title: '拍下大家从雨里跑来的样子', description: '站在门檐下，替这场有点狼狈的相聚留几张照片。', location: 'hall', requiresSkill: { id: 'record', min: 1 }, skillGains: { record: 1 }, meet: ['xiaoman'], with: ['ahe', 'xiaoman'], memoryId: 'rain_photos', flags: { autumnParticipation: 'photos' } },
  { id: 'rain_screening', kind: 'campus', semester: 1, title: '把椅子围起来，凑一场放映', description: '试着围个半圆，再给晚来的同学留一条小路。', location: 'hall', requiresSkill: { id: 'organize', min: 2 }, skillGains: { organize: 1 }, meet: ['xiaoman'], with: ['ahe', 'xiaoman'], memoryId: 'rain_screening', flags: { autumnParticipation: 'screening' } },
  { id: 'rain_audience', kind: 'campus', semester: 1, title: '抱着零食，和阿禾挤进去', description: '当个舒服的观众也很好，片尾再一起慢慢走回去。', location: 'hall', skillGains: {}, meet: ['linye'], with: ['ahe', 'linye'], memoryId: 'shared_blanket', flags: { autumnParticipation: 'audience' } },
  { id: 'spring_walk', kind: 'activity', semester: 2, title: '沿着湖边，记一条春天的小路', description: '带上纸和笔，看看冬天以后哪里悄悄变了。', location: 'lake', skillGains: { record: 1 }, meet: ['linye'], with: ['ahe', 'linye'], memoryId: 'spring_map', flags: { familiarWalk: true } },
  { id: 'spring_picnic', kind: 'activity', semester: 2, title: '带块野餐垫，去草地吃午饭', description: '约上同学，各带一样喜欢的吃的，铺开就算开始。', location: 'lake', skillGains: { organize: 1 }, meet: ['linye'], with: ['ahe', 'linye'], memoryId: 'picnic_note', flags: { hadPicnic: true } },
  { id: 'spring_playlist', kind: 'activity', semester: 2, title: '和阿禾做一张窗边歌单', description: '把听到就想起这个学期的歌，按自己的顺序排在一起。', location: 'dorm', skillGains: { record: 1 }, meet: [], with: ['ahe'], memoryId: 'night_playlist', flags: { madePlaylist: true } },
  { id: 'photo_invite', kind: 'activity', semester: 2, title: '应小满的约，选一组雨夜照片', description: '上学期拍下的那场雨，有人还想再看一遍。', location: 'club', requiresSkill: { id: 'record', min: 1 }, requiresMemory: 'rain_photos', requiresPerson: 'xiaoman', skillGains: { record: 1 }, meet: [], with: ['xiaoman'], memoryId: 'rain_album', flags: { albumMade: true } },
  { id: 'screen_invite', kind: 'activity', semester: 2, title: '应小满的约，挑下一场电影', description: '那次临时放映让人记住了，试着挑一部适合春天的。', location: 'club', requiresSkill: { id: 'organize', min: 1 }, requiresMemory: 'rain_screening', requiresPerson: 'xiaoman', skillGains: { organize: 1 }, meet: [], with: ['xiaoman'], memoryId: 'film_program', flags: { nextScreening: true } },
  { id: 'festival_route', kind: 'campus', semester: 2, title: '带大家走一条自己的校园路线', description: '把留意过的树影、窗台和转角，串成一段小散步。', location: 'gate', requiresSkill: { id: 'record', min: 2 }, skillGains: { record: 1 }, meet: ['linye'], with: ['ahe', 'linye'], memoryId: 'festival_map', flags: { springParticipation: 'route' } },
  { id: 'festival_screen', kind: 'campus', semester: 2, title: '认领窗边，办个小小放映角', description: '自己安排椅子和片单，让路过的人能随时坐下看一会儿。', location: 'hall', requiresSkill: { id: 'organize', min: 2 }, skillGains: { organize: 1 }, meet: ['xiaoman'], with: ['ahe', 'xiaoman'], memoryId: 'festival_screen', flags: { springParticipation: 'screening' } },
  { id: 'festival_audience', kind: 'campus', semester: 2, title: '和同伴闲逛，听一下午的歌', description: '不赶节目表，听到喜欢的就停下来，走累了就坐一会儿。', location: 'gate', skillGains: {}, meet: ['linye'], with: ['ahe', 'linye'], memoryId: 'festival_song', flags: { springParticipation: 'audience' } },
].map(choice => Object.freeze(choice)));

export const MEMORIES = Object.freeze({
  club_program: { title: '开放日的小节目单', caption: '没填报名表，倒是在节目单背面画了半天布场的草图。', place: '社团开放日', art: 'ticket' },
  first_sunset: { title: '第一张湖边晚霞', caption: '地平线有点歪，但看到这张照片就知道当时站在哪里。', place: '湖边', art: 'photo' },
  dorm_ticket: { title: '手画的电影票', caption: '座位栏写着“随便坐”，阿禾坚持在旁边画了一袋薯片。', place: '宿舍', art: 'screen' },
  rain_photos: { title: '雨里的三把伞', caption: '电影还没开始，大家跑进门的样子已经像一个片头。', place: '活动室门口', art: 'photo' },
  rain_screening: { title: '围成半圆的椅子', caption: '临时挪出的半圆里，给迟来的人留了一条小路。', place: '活动室', art: 'screen' },
  shared_blanket: { title: '挤在一起的观影座位', caption: '零食传了一圈，回来时多了几颗不认识牌子的糖。', place: '活动室后排', art: 'ticket' },
  spring_map: { title: '一条春天的小路', caption: '地图上多了“这里风大”和“这棵树下可以坐”的小字。', place: '湖边小路', art: 'map' },
  picnic_note: { title: '压在野餐垫下的便签', caption: '每个人带来的吃的，都在便签上多了一个有点傻的名字。', place: '湖边草地', art: 'leaf' },
  night_playlist: { title: '窗边的春天歌单', caption: '几首歌被排成一段从宿舍走到湖边的路。', place: '宿舍窗边', art: 'song' },
  rain_album: { title: '从雨夜里挑出的六张照片', caption: '小满挑了模糊的那张：“这张最像当时。”', place: '社团活动室', art: 'photo' },
  film_program: { title: '下一场放映的片单', caption: '除了片名，还写着“可以中途进来，也可以提早回去”。', place: '社团活动室', art: 'ticket' },
  festival_map: { title: '大家走过的校园路线', caption: '几处停下来看的地方，被同伴各添了一笔。', place: '春日校园节', art: 'map' },
  festival_screen: { title: '窗边放映角的小牌子', caption: '牌子上写着“坐一会儿吧”，没有写散场时间。', place: '春日校园节', art: 'screen' },
  festival_song: { title: '停下来听完的那首歌', caption: '没记住节目单，却记住了那天下午几个人坐的位置。', place: '春日校园节', art: 'song' },
});

const choiceById = new Map(CHOICES.map(choice => [choice.id, choice]));
const memoryIds = state => new Set((state?.memories || []).map(memory => typeof memory === 'string' ? memory : memory.id));
const has = (state, memoryId) => memoryIds(state).has(memoryId);
const knows = (state, personId) => (state?.peopleMet || []).includes(personId);
const scene = (title, paragraphs, location, speaker, dialogue) => ({
  title, paragraphs, location,
  ...(speaker ? { speaker } : {}), ...(dialogue ? { dialogue } : {}),
});

export function getScene(state) {
  if (state.phase === 'ended') return getEnding(state);
  if (state.phase === 'campus' && state.semester === 1) return scene('下雨了，电影还放吗？', [
    '晚饭后下起小雨。草坪放映挪到活动室，门口不断有人收起伞、甩着水跑进来。',
    '幕布还没挂好，阿禾先抱着零食占了个角落。你想怎样参与这场临时变了样的放映？',
  ], 'hall');
  if (state.phase === 'campus') return scene('春天，把校园借来玩一天。', [
    '春日校园节到了。路边有人唱歌，活动室敞着门，平时匆匆经过的地方都能停下来。',
    '这一次，你可以拿熟悉的校园做点自己的安排，也可以和同伴逛到哪里算哪里。',
  ], 'gate');
  if (state.semester === 1 && state.slot === 1) return scene('周五，门还敞着。', [
    '刚放好行李，阿禾就把宿舍门撑开：“楼下好像很热闹。”桌上的校园地图还没折平。',
    '这个学期，先从一件想做的小事开始吧。',
  ], 'dorm');
  if (state.semester === 1) {
    if (has(state, 'first_sunset')) return scene('照片还没来得及整理。', [
      '相机里那张歪歪的晚霞还在。阿禾凑过来看，说湖边比地图上画的好看。',
      '这个学期还有一段空闲。继续认识校园，或者和人待一会儿？',
    ], 'dorm');
    if (has(state, 'club_program')) return scene('节目单，塞进了书包。', [
      '开放日带回来的节目单有点皱，小满在背面留了活动室的位置。',
      '阿禾趴在床沿问：“下个周末呢？”你看了看还没走熟的校园。',
    ], 'dorm');
    return scene('那张电影票还贴在门后。', [
      '阿禾没舍得把手画的电影票扔掉，随手贴在门后。有人路过时，还停下来读了一遍。',
      '秋天还长，这个学期还能安排一件想做的事。',
    ], 'dorm');
  }
  if (state.slot === 1) {
    if (has(state, 'rain_photos')) return scene('小满发来一个旧片头。', [
      '新学期的风吹进宿舍。小满翻出你拍的雨夜照片：“看到这个，又想起那天大家往门里跑。”',
      '湖边开始冒新芽。熟悉的地方，这学期可以再换一种走法。',
    ], 'dorm', '小满', '有空一起挑几张吧？模糊的也先别删。');
    if (has(state, 'rain_screening')) return scene('那场雨，留下了下一次。', [
      '小满发来一张空活动室的照片：“天气暖了，要不要再放场电影？”',
      '你认出窗边的位置。湖边也开始冒新芽，这学期还可以有别的安排。',
    ], 'dorm');
    return scene('窗开了一条缝，春天进来了。', [
      '阿禾忽然念出雨天电影里的一句台词，两个人都笑了。上学期已经有了不用解释的笑点。',
      '新学期的周末还空着。找条小路走走，约人吃点东西，或者留一张新的歌单？',
    ], 'dorm');
  }
  const last = state.memories?.at(-1)?.id;
  if (last && MEMORIES[last]) return scene('这学期，已经有了一件小事。', [
    `你把“${MEMORIES[last].title}”收好。熟悉的日子里，又多了一样以后能认出来的东西。`,
    '春日校园节还没到，这段空闲想留给谁，或者留给什么？',
  ], 'dorm');
  return scene('周末还空着半页。', ['窗外有人抱着球经过。你翻了翻消息，给这学期再留一件小事。'], 'dorm');
}

export function getChoicePresentation(state, choiceId) {
  const choice = choiceById.get(choiceId);
  if (!choice) throw new TypeError('没有这个校园选择。');
  if (choiceId === 'spring_walk' && has(state, 'first_sunset')) return { title: '再去一次湖边，这次记下小路', description: '上次只记得晚霞的颜色，这次把怎么走也留在纸上。' };
  if (choiceId === 'spring_playlist' && has(state, 'dorm_ticket')) return { title: '和阿禾，把电影夜接成一张歌单', description: '从那晚的片尾曲开始，排进这学期想一起听的声音。' };
  if (choiceId === 'spring_picnic' && knows(state, 'linye')) return { title: '约阿禾和林野，去草地吃午饭', description: '各带一样喜欢的吃的，不用想节目，铺开垫子就算开始。' };
  if (choiceId === 'festival_audience' && has(state, 'night_playlist')) return { title: '和同伴闲逛，找找歌单里的旋律', description: '听到熟悉的就停下来，其他节目也可以慢慢发现。' };
  return { title: choice.title, description: choice.description };
}

export function getNarrative(previous, choiceId) {
  const choice = choiceById.get(choiceId);
  if (!choice) throw new TypeError('没有这个校园选择。');
  let result;
  switch (choiceId) {
    case 'open_day': result = scene('先把这一角摆起来。', [
      '一个摊位的纸牌被风吹倒了。你和阿禾帮忙压住桌布，顺手把几块牌子换了个容易看见的位置。',
      '叫小满的同学递来一张节目单。你们没急着报名，倒是聊了半天这张桌子还能怎么摆。',
    ], 'club', '小满', '下次路过，也可以进来坐坐。'); break;
    case 'camera_walk': result = scene('第一张，地平线有点歪。', [
      '你拿着借来的相机绕到湖边，总是赶不上光变颜色的那一秒。',
      knows(previous, 'linye') ? '林野指了指另一侧的树影。你等了一会儿，终于把湖面和晚霞一起留住。' : '湖边一个同学指了指另一侧的树影：“试试站这儿。”聊了才知道，是同班的林野。',
    ], 'lake'); break;
    case 'movie_night': result = scene('座位栏写着：随便坐。', [
      '你和阿禾试了两次，才把画面对在那块空墙上。你挪了椅子，让开门的人也有地方坐。',
      '阿禾在纸片上画电影票，你负责写“随便坐”。电影播到一半，两个人还在笑票上的那袋薯片。',
    ], 'dorm'); break;
    case 'rain_photos': result = scene('雨水也进了画面。', [
      '你站到门檐下，等伞收起、人挤进门的那一秒再按快门。模糊的几张，反而留着当时的热闹。',
      knows(previous, 'xiaoman') ? '小满凑过来看：“像电影还没开始，就先有了片头。”你把照片留下，没急着挑掉哪一张。' : '来帮忙的小满凑过来看：“我叫小满。这几张像电影的片头。”你们互留了消息。',
    ], 'hall'); break;
    case 'rain_screening': result = scene('半圆里，留一条小路。', [
      '你把椅子围成半圆，沿墙留出一条走道。晚到的人能悄悄坐下，不必从银幕前横穿过去。',
      knows(previous, 'xiaoman') ? '小满帮你试了一遍最后一排的位置。灯暗下来，你也在阿禾旁边坐好。' : '一个同学跑来搭手：“我叫小满，最后一排好像还能挪一点。”灯暗下来，你们终于一起坐好。',
    ], 'hall'); break;
    case 'rain_audience': result = scene('零食绕了一整圈。', [
      '阿禾往里挪了挪，把半张小毯子让给你。你们把零食递出去，等传回来时，里面多了几颗糖。',
      knows(previous, 'linye') ? '隔壁的林野小声猜错了剧情。散场后你们沿着湿湿的走廊往回走，还在争谁猜得更离谱。' : '隔壁的人小声猜错了剧情。散场才互相介绍：他叫林野，原来上课时就坐在隔壁一排。',
    ], 'hall'); break;
    case 'spring_walk': result = scene('这里风大，这里可以坐。', [
      has(previous, 'first_sunset') ? '你再走到那片晚霞的岸边。这次带了纸，把之前绕错的岔路画清楚。' : '你和阿禾绕到湖边，边走边在纸上记几个转角。不认路的地方，刚好可以慢一点。',
      knows(previous, 'linye') ? '遇到林野，你请他在图上补几笔。地图多了“这里风大”和“这棵树下可以坐”的小字。' : '路上碰到同班的林野。聊过几句，他在图上添了“这里风大”，三个人又绕了一小段。',
    ], 'lake'); break;
    case 'spring_picnic': result = scene('铺开，就算开始。', [
      '你和阿禾各带一点吃的，把垫子铺在树影底下。你把东西往中间挪，让谁都够得着。',
      knows(previous, 'linye') ? '林野带来的小点心被取了一个奇怪的名字。你们笑着写在便签上，拿水杯压住。' : '阿禾招呼路过的同班同学一起坐。林野拿出一袋点心，很快也加入了给食物起怪名字的讨论。',
    ], 'lake'); break;
    case 'spring_playlist': result = scene('从窗边，排到湖边。', [
      has(previous, 'dorm_ticket') ? '你从电影夜的片尾曲开始排歌。阿禾问：“后面是不是该接一首适合出门的？”' : '你和阿禾一人放一首最近喜欢的歌。顺序换来换去，慢慢像一段从宿舍走到湖边的路。',
      '你把几首歌的顺序抄在纸上，旁边写了听到它们会想起的地方。这学期的声音，也有了位置。',
    ], 'dorm'); break;
    case 'photo_invite': result = scene('六张就够，模糊的也算。', [
      '你带着上学期那组雨夜照片去找小满。你试着按跑进门、收伞、坐下的顺序排一遍。',
      '小满坚持留下其中一张模糊的：“这张最像当时。”你们最后选了六张，夹进同一页相册。',
    ], 'club'); break;
    case 'screen_invite': result = scene('不用坐满，也可以放。', [
      '小满拿出两部适合春天的电影，你选了节奏慢一点的。你们试着把开场时间往晚饭后挪了挪。',
      '你在片单下面添了一行：“可以中途进来，也可以提早回去。”想到上学期那条小路，忍不住笑了。',
    ], 'club'); break;
    case 'festival_route': result = scene('把自己的校园，带人走一遍。', [
      '你没照着最短的路走，而是把树影、窗台和一个好看的转角串在一起。阿禾和林野边走边补充。',
      '走到终点时，路线图上多了几笔不同的字。原本只属于你眼睛里的校园，这次成了大家走过的路。',
    ], 'gate'); break;
    case 'festival_screen': result = scene('坐一会儿吧。', [
      '你认领窗边的位置，把椅子摆成随时能加入的小半圆。片单上没写散场时间，只写了“坐一会儿吧”。',
      knows(previous, 'xiaoman') ? '小满帮忙调暗靠窗的灯。有人只看了五分钟，也有人一直坐到你们准备收椅子。' : '来搭手的同学说自己叫小满。你请他帮忙试光，阿禾已经在第一排坐好。',
    ], 'hall'); break;
    case 'festival_audience': result = scene('这一下午，没有赶路。', [
      has(previous, 'night_playlist') ? '路边传来一段有点熟悉的旋律。你和阿禾对看一眼，在那块草地上坐下，听完才起身。' : '你和阿禾没急着找下一场节目。听见路边有人唱歌，就在草地边坐下，听完一首才起身。',
      knows(previous, 'linye') ? '后来林野也坐过来。你们把一下午的节目听得断断续续，却把聊天聊得很完整。' : '同班的林野抱着饮料经过，阿禾招呼他坐下。聊着聊着，一首歌又接上了另一首。',
    ], 'gate'); break;
    default: throw new TypeError('没有这个校园选择。');
  }
  return { ...result, memoryCaption: MEMORIES[choice.memoryId].caption };
}

export function getPersonNote(state, personId) {
  if (!PEOPLE[personId]) throw new TypeError('没有这个同伴。');
  if (!knows(state, personId)) return '还没遇见';
  if (personId === 'ahe') {
    if (has(state, 'festival_song')) return '一起听了一下午歌的人';
    if (has(state, 'festival_screen')) return '坐在你放映角第一排的人';
    if (has(state, 'festival_map')) return '在你的校园路线上添过字';
    if (has(state, 'night_playlist')) return '一起排过一张窗边歌单';
    if (has(state, 'shared_blanket')) return '在雨天给你挪过半张毯子';
    if (has(state, 'dorm_ticket')) return '一起画过“随便坐”的电影票';
    return '宿舍里总能碰见的熟悉面孔';
  }
  if (personId === 'xiaoman') {
    if (has(state, 'festival_screen')) return '和你一起照看过窗边放映角';
    if (has(state, 'film_program')) return '一起挑过下一场电影';
    if (has(state, 'rain_album')) return '帮你留下了那张模糊的照片';
    if (has(state, 'rain_screening')) return '雨天里一起挪过椅子';
    if (has(state, 'rain_photos')) return '想再看一遍那天的雨夜照片';
    return '开放日里留过活动室位置的人';
  }
  if (has(state, 'festival_map')) return '和你走完了一条自己的校园路线';
  if (has(state, 'festival_song')) return '春日节里坐过来一起听歌';
  if (has(state, 'spring_map')) return '在地图上写过“这里风大”';
  if (has(state, 'picnic_note')) return '一起给野餐的点心取怪名字';
  if (has(state, 'shared_blanket')) return '一起猜错过电影剧情';
  return '指过湖边看晚霞位置的同学';
}

export function getEnding(state) {
  const first = state.memories?.[0]?.id;
  const ending = has(state, 'festival_map') ? '那张路线图上，多了几个人的字。你已经能带着同伴走一遍自己的校园。'
    : has(state, 'festival_screen') ? (has(state, 'rain_screening') ? '窗边的小牌子收进了书包。从雨天挪出的半圆，到春天的窗边，你慢慢有了自己的安排。' : '窗边的小牌子收进了书包。这一年，你慢慢学会给路过的人留一个舒服的位置。')
      : '你记得春日节那天下午坐在哪里，也记得身边是谁。这一年，有些日子已经不用翻日历就能认出来。';
  return scene('大一，开始像自己的大学了。', [
    first && MEMORIES[first] ? `从“${MEMORIES[first].title}”开始，这一年慢慢留下了几件属于你的事。` : '这一年，你给校园里的日子留了几个位置。',
    ending,
  ], 'gate');
}
