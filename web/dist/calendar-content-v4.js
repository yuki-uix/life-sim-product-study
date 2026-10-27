/** Fictional campus content. No engine, DOM, network or random generation. */
export const CONFIG = Object.freeze({
  version: '0.4.0',
  schemaVersion: 4,
  totalDays: 91,
  title: '大学慢慢来',
  programYears: 4,
});

export const PEOPLE = Object.freeze({
  ahe: Object.freeze({ name: '阿禾', role: '你的室友' }),
  xiaoman: Object.freeze({ name: '小满', role: '社团里认识的同伴' }),
  linye: Object.freeze({ name: '林野', role: '同班同学' }),
});

export const SKILLS = Object.freeze({
  record: Object.freeze({
    name: '记录',
    stages: Object.freeze(['还没试过', '开始留意', '渐渐顺手', '有自己的眼光']),
  }),
  organize: Object.freeze({
    name: '张罗',
    stages: Object.freeze(['还没试过', '敢搭把手', '渐渐熟悉', '有自己的办法']),
  }),
});

export const FOCUSES = Object.freeze([
  Object.freeze({
    id: 'easy', title: '随心过',
    description: '上课、吃饭，空下来再看想做什么。',
    location: 'gate', skill: null,
  }),
  Object.freeze({
    id: 'club', title: '常去社团',
    description: '课余去活动室待待，有事就搭把手。',
    location: 'club', skill: 'organize',
  }),
  Object.freeze({
    id: 'walk', title: '散步，随手记录',
    description: '带着手机绕绕校园，偶尔拍点东西。',
    location: 'lake', skill: 'record',
  }),
  Object.freeze({
    id: 'friends', title: '和室友待着',
    description: '一起吃饭、闲聊，也各自做各自的事。',
    location: 'dorm', skill: null,
  }),
]);

export const CALENDAR_LOGS = Object.freeze([
  { day: 0, id: 'arrival', kind: 'calendar', location: 'dorm', text: '九月开学。床铺收拾好了，阿禾还在找能放下行李箱的位置。' },
  { day: 4, id: 'club_posters', kind: 'calendar', location: 'gate', text: '食堂门口贴满了社团招新海报。午饭时路过，总有人在发传单。' },
  { day: 11, id: 'first_rain', kind: 'daily', location: 'gate', text: '早上出门没带伞。下课后在教学楼门口等了一会儿，雨才小下来。' },
  { day: 29, id: 'september_end', kind: 'calendar', location: 'dorm', text: '九月快过完了。课表不用再截图翻来翻去，晾衣架倒是又不够用了。' },
  { day: 39, id: 'canteen', kind: 'daily', location: 'gate', text: '常去的食堂窗口换了菜单。排到跟前才发现，想吃的那道已经卖完了。' },
  { day: 53, id: 'cool_evening', kind: 'calendar', location: 'lake', text: '晚自习出来，湖边比前阵子冷了。回宿舍的人大多把外套拉链拉到了顶。' },
  { day: 70, id: 'november_laundry', kind: 'daily', location: 'dorm', text: '连着几天阴天，阳台上挂满没干的衣服。阿禾把风扇转过去吹了一下午。' },
  { day: 82, id: 'late_autumn', kind: 'calendar', location: 'gate', text: '路旁的树叶落了不少。保洁刚扫完一段，风又吹下来几片。' },
].map(log => Object.freeze(log)));

const WEEKLY_TEXT = Object.freeze({
  easy: Object.freeze([
    '这周照常上课、吃饭。空出来的一晚，洗了攒着的衣服。',
    '有两天起得晚，早饭和午饭并成了一顿。其他日子还是差不多。',
    '下午没课，在图书馆坐了一会儿。借的书还没看完。',
    '这几天常从同一条路去教学楼，已经很少看校园地图了。',
    '原本想出趟校门，最后嫌麻烦，留在宿舍看了半天视频。',
    '课间聊了几句周末去哪儿，到了周末，大家又各自改了主意。',
  ]),
  club: Object.freeze([
    '课后去活动室待了几次。有人排练，你在旁边帮着挪桌子。',
    '这周社团没什么活动，几个人围着电脑看下一次的安排。',
    '活动室那根接触不好的线又没声音了，拔出来重新插上才好。',
    '去社团时碰上教室被占用，等了一阵，改到隔壁坐着聊。',
    '周末帮着收了活动室。桌子推回原位，地上还有没撕干净的胶带。',
    '课后照常绕去活动室。有时正好有人，有时门还锁着。',
  ]),
  walk: Object.freeze([
    '下课后沿湖走了几次，手机里多了几张差不多的水面。',
    '这周走到了体育场后面。绕了一圈，发现回宿舍比原路还远。',
    '有天下午光线不错，拍了几张。回去翻看，大半都糊了。',
    '又经过湖边那排长椅。这次没拍照，坐了一会儿就回去了。',
    '这几天随手记下路上看到的东西，隔天再看，有的已经想不起来了。',
    '散步时换了一条小路，路灯有点暗，后来还是走回了大路。',
  ]),
  friends: Object.freeze([
    '这周常和阿禾一起吃晚饭。吃完回宿舍，一个戴耳机，一个开电脑。',
    '宿舍里聊了半天谁去拿快递，最后还是各自去拿了各自的。',
    '阿禾拉你看了段很长的视频。看完才发现，已经错过了常去的食堂窗口。',
    '周末大半天都待在宿舍，有人补觉，有人打游戏，偶尔说两句话。',
    '晚上一起下楼买了点吃的。回来的路上，阿禾还在讲白天上课的事。',
    '这周也没特意约什么，饭点碰上就一起走，没碰上就自己吃。',
  ]),
});

export function weeklyText(focusId, weekIndex) {
  const variants = WEEKLY_TEXT[focusId] || WEEKLY_TEXT.easy;
  const index = Number.isFinite(weekIndex) ? Math.max(0, Math.trunc(weekIndex)) : 0;
  return variants[index % variants.length];
}

export const STORIES = Object.freeze([
  {
    id: 'club_screen', title: '放映前，还差几双手',
    fromDay: 24, toDay: 38, requiresFocus: 'club', minDays: 10,
    location: 'club', personId: 'xiaoman',
    paragraphs: [
      '这阵子你常去活动室。今天进门，小满正蹲在地上分辨两根长得一样的线，椅子还堆在墙边。',
      '晚上有一场小放映，她问你要不要留下。片子还没开始，也有几件事要做。',
    ],
    choices: [
      {
        id: 'screen_help', title: '留下，把场地一起弄好',
        description: '平时看过几回布置，知道先从哪里下手。',
        requiresSkill: { id: 'organize', min: 1 },
        result: '你和小满把椅子摆好，试了声音。开场后，你坐在门边，给迟到的人让了几次路。',
        flags: { screenHelped: true },
      },
      {
        id: 'screen_watch', title: '等开场，找个位置看',
        description: '今天就想坐下来，看完一部电影。',
        result: '你留了下来。片子比想象中长，散场时食堂已经关门了，只好去小卖部买了面包。',
        flags: {},
      },
      {
        id: 'screen_leave', title: '今天先回去',
        description: '和小满打声招呼，改天再来。',
        result: '你说今天先不留了。回宿舍时，阿禾正准备出门吃饭，你们一起下了楼。',
        flags: {},
      },
    ],
  },
  {
    id: 'lake_photo', title: '湖边换了一种颜色',
    fromDay: 35, toDay: 49, requiresFocus: 'walk', minDays: 10,
    location: 'lake', personId: 'linye',
    paragraphs: [
      '最近沿湖走得多，林野常在这条路上碰到你。他说水边的树叶开始黄了，想趁天还没暗再绕一圈。',
      '他翻出手机里上个月拍的照片，问你记不记得当时站的位置。',
    ],
    choices: [
      {
        id: 'photo_same_place', title: '找找原来的角度，再拍一次',
        description: '这段路走熟了，大概认得照片里的位置。',
        requiresSkill: { id: 'record', min: 1 },
        result: '你们来回找了一会儿，在桥边对上了角度。两张照片放在一起，树叶和水位都变了些。',
        flags: { photoJoined: true },
      },
      {
        id: 'photo_walk', title: '一起走走，照片就让他拍',
        description: '边走边聊，走到哪儿算哪儿。',
        result: '林野走走停停地拍照，你在旁边等他。绕到湖另一头时，天已经暗下来了。',
        flags: {},
      },
      {
        id: 'photo_leave', title: '今天想早点回宿舍',
        description: '告诉他自己先走，沿近路回去。',
        result: '你和林野在桥边分开，拐进回宿舍的小路。今天这趟就走到这里。',
        flags: {},
      },
    ],
  },
  {
    id: 'lights_out', title: '走廊的灯突然灭了',
    fromDay: 60, toDay: 60, requiresFocus: null, minDays: 0,
    location: 'dorm', personId: 'ahe',
    paragraphs: [
      '晚上，桌上的屏幕和走廊灯一起黑了。门外响起几声抱怨，有人打开手机照明，问是不是整栋楼都停电了。',
      '阿禾搬了把椅子坐到门口。楼下还有亮着的地方，一时也不知道多久会来电。',
    ],
    choices: [
      {
        id: 'lights_talk', title: '搬把椅子，在门口坐会儿',
        description: '反正暂时做不了手里的事，聊两句。',
        result: '你坐到阿禾旁边，听隔壁宿舍的人聊各自的家乡。来电时，有人还没把话讲完。',
        flags: { dormTalked: true },
      },
      {
        id: 'lights_outside', title: '下楼透透气',
        description: '带上手机，去亮着灯的路上走走。',
        result: '你在楼下走了一圈。回来时楼里已经来电，电梯口还等着几个人。',
        flags: {},
      },
      {
        id: 'lights_rest', title: '留在床上歇会儿',
        description: '把手机放到一旁，等灯自己亮起来。',
        result: '你躺了一会儿。灯重新亮起时有点晃眼，宿舍里又响起了键盘声。',
        flags: {},
      },
    ],
  },
].map(story => Object.freeze({
  ...story,
  paragraphs: Object.freeze(story.paragraphs),
  choices: Object.freeze(story.choices.map(choice => Object.freeze({
    ...choice,
    flags: Object.freeze(choice.flags),
    ...(choice.requiresSkill ? { requiresSkill: Object.freeze(choice.requiresSkill) } : {}),
  }))),
})));

/** Let the common scene acknowledge an existing routine, without granting a prize. */
export function getStoryPresentation(storyId, state = {}) {
  const story = STORIES.find(item => item.id === storyId);
  if (!story) return { title: '', paragraphs: [] };
  const paragraphs = [...story.paragraphs];
  if (storyId === 'lights_out') {
    if ((state.focusDays?.friends || 0) >= 10) {
      paragraphs.push('这些天你和阿禾常一起吃饭，回宿舍也会聊几句。这会儿他把旁边的椅子往外拉了点：“你坐这儿？”');
    }
    if ((state.focusDays?.easy || 0) >= 10) {
      paragraphs.push('最近课余没排太多事，你渐渐习惯一个人待一会儿。眼睛适应了黑暗，你听着门外的声音，倒也没急着跟出去。');
    }
  }
  return { title: story.title, paragraphs };
}

export const AFTER_LOGS = Object.freeze([
  Object.freeze({
    day: 45, id: 'screen_next_time', requiresFlag: 'screenHelped', location: 'club',
    text: '小满在群里发了下一场放映的时间，顺便问你还记不记得上次那几根线放在哪儿。',
  }),
  Object.freeze({
    day: 65, id: 'photo_comparison', requiresFlag: 'photoJoined', location: 'lake',
    text: '林野发来湖边前后两张照片。你们上次站的位置，这回铺了一地落叶。',
  }),
  Object.freeze({
    day: 75, id: 'dorm_hometown', requiresFlag: 'dormTalked', location: 'dorm',
    text: '晚饭时又聊到家乡的吃的，阿禾接上了停电那晚没讲完的话。',
  }),
]);

/** day 0 is September 1; this playable slice ends at day 90, November 30. */
export function dateInfo(day) {
  const value = Number.isFinite(day) ? Math.trunc(day) : 0;
  const safeDay = Math.min(CONFIG.totalDays - 1, Math.max(0, value));
  const month = safeDay < 30 ? 9 : safeDay < 61 ? 10 : 11;
  const monthDay = safeDay + 1 - (month === 9 ? 0 : month === 10 ? 30 : 61);
  return {
    month,
    day: monthDay,
    label: `${month}月${monthDay}日`,
    monthLabel: ({ 9: '九月', 10: '十月', 11: '十一月' })[month],
    week: Math.floor(safeDay / 7) + 1,
  };
}
