/** Fictional campus content. No engine, DOM, network or random generation. */
import { getSocialOpening } from './campus-reactions-v8.js';
export const CONFIG = Object.freeze({
  version: '0.8.0',
  schemaVersion: 8,
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


/** Familiarity opens room to try things; what grows depends on the chosen practice. */
export const CAPABILITIES = Object.freeze({
  record: Object.freeze([
    Object.freeze({ level: 1, title: '开始认真试一种记录方法', description: '可以从一个具体想法开始，在往后的散步里试着做。' }),
    Object.freeze({ level: 2, title: '记录渐渐顺手', description: '熟悉工具之后，还要看自己平时留意什么、怎样和人相处。' }),
    Object.freeze({ level: 3, title: '能带着已有经验继续试', description: '熟悉不代表什么都擅长，实际练过的做法仍会影响眼前能做的事。' }),
  ]),
  organize: Object.freeze([
    Object.freeze({ level: 1, title: '开始试着张罗一件事', description: '可以先准备一场小放映，再决定自己更想顾到哪一部分。' }),
    Object.freeze({ level: 2, title: '活动室里的事渐渐熟悉', description: '同样常去活动室，有人更留意片子，有人更留意来的人。' }),
    Object.freeze({ level: 3, title: '能把经验用到新的场合', description: '下一次怎样参与，取决于以前实际试过哪些办法。' }),
  ]),
});

export const PRACTICES = Object.freeze({
  record: Object.freeze([
    { id: 'observe', name: '留意地方的变化', action: '回到同一地点，换着角度看一看',
      description: '往后的散步里，多练习取景、比较和安排顺序。',
      capabilities: [
        { min: 4, title: '认出同一地方的小变化', description: '看过的地方再经过，能留意到光线、水位和画面里多出来的东西。' },
        { min: 12, title: '用一组画面讲清变化', description: '可以自己挑角度、定先后，让几张普通照片一起说明一件事。' },
      ] },
    { id: 'listen', name: '留意人想留下什么', action: '边走边听同伴讲，先问对方在意什么',
      description: '往后的记录里，多练习倾听、询问和取舍。',
      capabilities: [
        { min: 4, title: '问出对方愿意讲的细节', description: '知道何时追问、何时先不拍，让对方决定哪些东西愿意被留下。' },
        { min: 12, title: '留下对方真正想说的部分', description: '可以顺着一个人的讲述安排画面，也会先确认他不想公开的内容。' },
      ] },
  ].map(practice => Object.freeze({ ...practice, capabilities: Object.freeze(practice.capabilities.map(item => Object.freeze(item))) }))),
  organize: Object.freeze([
    { id: 'curate', name: '把内容串起来', action: '留意片子怎样开始、怎样接到下一段',
      description: '之后去活动室，多试片单、节奏和开场的安排。',
      capabilities: [
        { min: 4, title: '让片单围绕一个想法', description: '能说明几部片子为什么放在一起，也开始知道哪里该留一点空白。' },
        { min: 12, title: '安排一场有起落的放映', description: '可以自己决定开场、片序和结束的位置，把想法放进一整场体验里。' },
      ] },
    { id: 'connect', name: '把人照顾到', action: '留意谁没跟上，问问大家还需要什么',
      description: '之后去活动室，多练习给不同的人留位置与说话的机会。',
      capabilities: [
        { min: 4, title: '给没跟上的人留个位置', description: '晚来、安静或不熟悉的人进门时，知道怎样接一句话、留一条路。' },
        { min: 12, title: '让不同想法的人继续聊', description: '可以接住分歧、换一个问题，也知道什么时候让谈话自然结束。' },
      ] },
  ].map(practice => Object.freeze({ ...practice, capabilities: Object.freeze(practice.capabilities.map(item => Object.freeze(item))) }))),
});

/** Starting the same small project can lead to different daily practices. */
export const PROJECTS = Object.freeze([
  {
    id: 'photo_set', title: '拍一组校园照片',
    description: '先想想这回更想留下什么，再在平常的散步里慢慢试。',
    focusId: 'walk', requiresSkill: { id: 'record', min: 1 },
    duration: 7, personId: 'linye', location: 'lake',
    startText: '你在手机里建了一个相册，想在之后的散步里试着留下一组东西。',
    completeText: '相册里的东西整理过一遍。暂时先放在这里，往后的散步还可以继续试。',
    approaches: [
      { id: 'observe', title: '找一个地方，看看它每天哪里不同',
        description: '不急着走远，回到同一个位置比较光线、树影和水面。',
        startText: '你想起湖边那个转角，打算之后再经过时，看看同一个地方究竟哪里不同。',
        completeText: '相册里是同一段湖岸在不同日子里的样子。有两张几乎看不出区别，你仍留着，准备以后再比较。' },
      { id: 'listen', title: '问问身边的人，想留下怎样的校园',
        description: '先和同伴聊聊，再决定要不要拍、拍什么。',
        startText: '你问林野，入学以后哪件小事他最想记住。接下来的散步，打算先听听身边的人怎么说。',
        completeText: '相册里有几张同伴挑的位置，也记着他们说过的几句话。有人不想出镜，你就只拍了他指给你看的地方。' },
    ],
  },
  {
    id: 'host_screen', title: '筹一场小放映',
    description: '同样准备一场放映，这回更想先照顾到哪一部分？',
    focusId: 'club', requiresSkill: { id: 'organize', min: 1 },
    duration: 7, personId: 'xiaoman', location: 'club',
    startText: '你记下一场小放映的想法，准备之后去活动室时顺着往下试。',
    completeText: '这场小放映的准备暂时有了个样子，真正开场的时间还没有定。',
    approaches: [
      { id: 'curate', title: '先挑片子，想想怎样放在一起',
        description: '留意自己想表达什么，试试片序和开场的节奏。',
        startText: '你记下几个片名，想先弄明白为什么想把它们放在同一场里。之后去活动室，准备顺手试一试。',
        completeText: '片单删改过几次，最后留下了一部长片和一段短片。你写了两句开场的话，试着读了一遍，觉得还有点长。' },
      { id: 'connect', title: '先问来的人，怎样待着会舒服',
        description: '听听同伴的想法，也给不想说话或会晚到的人留点余地。',
        startText: '你先问小满和几位常来的同学，放映时有哪些地方让人不自在。之后去活动室，准备试着改一改。',
        completeText: '你把椅子重新围了一次，给晚来的人留了入口。几个人提的想法写在纸上，还有两条不太能同时做到。' },
    ],
  },
].map(project => Object.freeze({
  ...project, requiresSkill: Object.freeze(project.requiresSkill),
  approaches: Object.freeze(project.approaches.map(approach => Object.freeze(approach))),
})));

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

const PRACTICE_WEEKLY_TEXT = Object.freeze({
  record: Object.freeze({
    observe: Object.freeze([
      '这周几次走回同一段湖岸，挑了两个相近的角度。光线不同，照片看起来还是不太容易比较。',
      '整理照片时，发现上回没注意的施工围栏已经挪开了。把前后两张放在了一起。',
      '路过熟悉的长椅，先站远一点看了看。这次最后没拍，回去翻了之前留的画面。',
      '又试着从桥边拍那排树。为了避开逆光换了个位置，和原来那张就不太一样了。',
    ]),
    listen: Object.freeze([
      '散步时先聊了聊最近的事。对方指了一个想记住的地方，你问过以后才拿出手机。',
      '这周拍得不多，手机里倒多了几句和同伴聊天时记下的话。其中一段对方说先别留，你删掉了。',
      '有人说上次的照片不像自己想讲的那回事。一起翻了几张，才发现你们在意的地方不一样。',
      '沿湖走时听同伴把一件小事讲完。回去想配张照片，翻了半天，还是觉得暂时不用配。',
    ]),
  }),
  organize: Object.freeze({
    curate: Object.freeze([
      '去活动室时试了几段开场。两部片子接在一起有点急，先把顺序记下来，改天再看。',
      '这周花了一会儿改片单。删掉很喜欢的一段有点舍不得，但放回去又觉得不太接得上。',
      '和小满聊到一部片子为什么适合晚上看。你们说到后来，也没完全同意彼此。',
      '试着把开场的话缩短，读了一遍，还是像在交作业。收起纸，先看了会儿别人排练。',
    ]),
    connect: Object.freeze([
      '课后去活动室时，问了问晚来的同学想坐哪儿。挪开两把椅子，门口才没那么挤。',
      '这周几个人聊片子，话总落在同一个人那里。你试着问了另一边一句，对方说还没想好。',
      '有人不太想加入讨论，你给他留了靠边的位置。后来他自己凑过来听了一会儿。',
      '活动室里两个人意见不一样。你问他们各自在意哪一段，聊清楚了一点，也还是没完全谈拢。',
    ]),
  }),
});

export function practiceWeeklyText(skillId, styleId, weekIndex) {
  const variants = PRACTICE_WEEKLY_TEXT[skillId]?.[styleId];
  if (!variants) return weeklyText(skillId === 'record' ? 'walk' : 'club', weekIndex);
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
        id: 'screen_help', practiceChange: { skillId: 'organize', styleId: 'connect' }, title: '留下，把场地一起弄好',
        description: '平时看过几回布置，知道先从哪里下手。',
        requiresSkill: { id: 'organize', min: 1 },
        result: '你和小满把椅子摆好，试了声音。开场后，你坐在门边，给迟到的人让了几次路。',
        flags: { screenHelped: true },
      },
      {
        id: 'screen_watch', practiceChange: { skillId: 'organize', styleId: 'curate' }, title: '等开场，找个位置看',
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
        id: 'photo_same_place', practiceChange: { skillId: 'record', styleId: 'observe' }, title: '找找原来的角度，再拍一次',
        description: '这段路走熟了，大概认得照片里的位置。',
        requiresSkill: { id: 'record', min: 1 },
        result: '你们来回找了一会儿，在桥边对上了角度。两张照片放在一起，树叶和水位都变了些。',
        flags: { photoJoined: true },
      },
      {
        id: 'photo_walk', practiceChange: { skillId: 'record', styleId: 'listen' }, title: '一起走走，照片就让他拍',
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
  {
    id: 'photo_wall', family: 'photo_followup', requiresPractice: { skillId: 'record', styleId: 'observe', min: 8, current: true }, title: '那组照片，要不要贴出来？',
    fromDay: 55, toDay: 82, requiresFocus: null, minDays: 0,
    requiresProject: 'photo_set', requiresSkill: { id: 'record', min: 2 },
    location: 'hall', personId: 'linye',
    paragraphs: [
      '这阵子你常回到看过的地方，把同一段校园的变化留了下来。林野提起教学楼走廊有一块空着的展板，刚问到可以借几天。',
      '他把展板的尺寸发过来。照片都在你手里，这回可以自己决定放哪些、怎样放，也可以先和他一起试。',
    ],
    choices: [
      {
        id: 'wall_arrange', title: '自己选图排顺序，带林野试挂',
        description: '已经有了取舍的把握，想让这一组按自己的方式被看见。',
        requiresPractice: { skillId: 'record', styleId: 'observe', min: 12 },
        result: '你把几张照片排成从清晨到入夜的顺序，和林野量着展板贴上去。路过的人偶尔停一下，有人问其中一张是在哪儿拍的。',
        flags: { photoWallArranged: true },
      },
      {
        id: 'wall_together', title: '和林野一起试着排一排',
        description: '照片由自己挑，留白和位置再一起商量。',
        result: '你挑出想留下的几张，和林野在地上摆了几轮。有一处怎么排都觉得挤，最后少放了一张，贴上去反而舒服些。',
        flags: { photoWallShared: true },
      },
      {
        id: 'wall_later', title: '这组先自己留着',
        description: '现在还不想拿出去，告诉林野这次先不借展板。',
        result: '你把相册又翻了一遍，告诉林野这次先不贴了。他说好，下次有别的想法再聊。照片仍按原来的顺序留在手机里。',
        flags: {},
      },
    ],
  },
  {
    id: 'own_screen', family: 'screen_followup', requiresPractice: { skillId: 'organize', styleId: 'curate', min: 8, current: true }, title: '这次的放映，可以由你来安排',
    fromDay: 53, toDay: 80, requiresFocus: null, minDays: 0,
    requiresProject: 'host_screen', requiresSkill: { id: 'organize', min: 2 },
    location: 'club', personId: 'xiaoman',
    paragraphs: [
      '前阵子那场小放映的准备还在，之后你又试过几回片单和开场的安排。小满说，活动室这个周末空着，可以把这次的想法放给大家看。',
      '她能来搭把手，另有两个新同学愿意帮忙。接下来怎么安排，需要你拿个主意。',
    ],
    choices: [
      {
        id: 'own_screen_lead', title: '先拿钥匙去开门，带新同学布置',
        description: '之前一起处理过现场，这回想先接住开门、试音和接人的事。',
        requiresPractice: { skillId: 'organize', styleId: 'curate', min: 12 },
        requiresCooperation: { personId: 'xiaoman', min: 1 },
        result: '你拿上钥匙，先带两个新同学开门、试音，把门口接人和挪椅子的事分开。小满晚一点才来，片头亮起时，你还站在门边替迟到的人指空位。',
        flags: { ownScreenLed: true },
      },
      {
        id: 'own_screen_together', title: '和小满搭档，把这一场办起来',
        description: '片单和场地按自己的想法来，不熟悉的地方再问问她。',
        result: '你和小满在活动室里走了一圈，把几排椅子拉开。开场时投影没有声音，她提醒你切了输入源；等声音响起来，你们各找了个空位坐下。',
        flags: { ownScreenShared: true },
      },
      {
        id: 'own_screen_later', title: '准备先留着，这次不办',
        description: '告诉小满还想再等等，不把空教室变成一项必须完成的事。',
        result: '你说这次先不定了，小满把教室留给了别的安排。你把这回的想法先记下来，接下来去活动室时，还是照常和大家待着。',
        flags: {},
      },
    ],
  },
  {
    id: 'photo_people', family: 'photo_followup', title: '林野想寄回家的一小段校园',
    fromDay: 55, toDay: 82, requiresFocus: null, minDays: 0,
    requiresProject: 'photo_set', requiresSkill: { id: 'record', min: 2 },
    requiresPractice: { skillId: 'record', styleId: 'listen', min: 8, current: true },
    location: 'dorm', personId: 'linye',
    paragraphs: [
      '林野想拍一小段校园寄给家里，又不太想对着镜头介绍。他记得你平时更愿意先听人讲，再决定留下什么，就来问你能不能一起想想。',
      '他翻出家里发来的消息，说想让他们看看自己常走的路。说到宿舍里的事，他又停下来：“这段先别放进去。”',
    ],
    choices: [
      { id: 'people_follow_story', title: '跟着他想讲的部分拍，剪好再一起确认',
        description: '先听清楚哪些想说、哪些不想说，再把路上的画面放进来。',
        requiresPractice: { skillId: 'record', styleId: 'listen', min: 12 },
        result: '你没有让林野站到镜头前，而是陪他走了那段路。录到不想留下的部分就停一下；整理好以后，你们一起删掉两处，才把这段校园发了出去。',
        flags: { peopleStoryKept: true } },
      { id: 'people_together', title: '陪他找几个地方，让他自己拍',
        description: '先把想说的话聊清楚，你在旁边搭把手。',
        result: '你们在宿舍楼下聊了一会儿，挑出几个他想让家里看见的地方。林野自己拿着手机拍，你偶尔提醒一句，最后由他决定留哪几段。',
        flags: { peopleStoryShared: true } },
      { id: 'people_later', title: '今天先陪他聊，拍的事以后再说',
        description: '不把一次想家的闲聊立刻变成要做完的东西。',
        result: '手机收回了口袋。你们坐在楼下聊到食堂快关门，林野说改天再拍，先去吃点东西。',
        flags: {} },
    ],
  },
  {
    id: 'screen_circle', family: 'screen_followup', title: '散场以后，几个人还没走',
    fromDay: 53, toDay: 80, requiresFocus: null, minDays: 0,
    requiresProject: 'host_screen', requiresSkill: { id: 'organize', min: 2 },
    requiresPractice: { skillId: 'organize', styleId: 'connect', min: 8, current: true },
    location: 'club', personId: 'xiaoman',
    paragraphs: [
      '活动室这晚刚散场，几个人还坐着。一个人说没看懂结尾，另一个想讲起片子让他想起的事情，话有点接不上。',
      '小满正收设备，问常留意大家怎么相处的你，能不能先陪他们坐一会儿。不用再安排一场节目，也不知道这几个人究竟想聊到哪里。',
    ],
    choices: [
      { id: 'circle_hold_space', title: '先问他们想聊什么，给没开口的人留一会儿',
        description: '不急着让大家同意同一个结论，听听不同的人怎样接话。',
        requiresPractice: { skillId: 'organize', styleId: 'connect', min: 12 },
        result: '你把椅子拉近了一点，先问每个人最想接哪句话。有一阵谁也没说话，你没有马上填上；后来一直安静的同学讲了很长一段，另一个人也改了刚才的问题。',
        flags: { circleHeld: true } },
      { id: 'circle_with_xiaoman', title: '和小满一起坐下，先听大家说',
        description: '她接住一个话头，你照顾另一边，聊得下去就多坐一会儿。',
        result: '等小满收好设备，你们一起坐了下来。有人聊电影，有人岔到自己的事；中间停过几次，最后大家看了看时间，各自回了宿舍。',
        flags: { circleShared: true } },
      { id: 'circle_leave', title: '今天有点累，告诉小满自己先回去',
        description: '想照顾别人，也可以决定今天先照顾自己。',
        result: '你和还坐着的几个人道了别，把门口挡路的椅子挪开后回了宿舍。小满说她收完东西再陪他们待会儿。',
        flags: {} },
    ],
  },
].map(story => Object.freeze({
  ...story,
  paragraphs: Object.freeze(story.paragraphs),
  ...(story.requiresSkill ? { requiresSkill: Object.freeze(story.requiresSkill) } : {}),
  ...(story.requiresPractice ? { requiresPractice: Object.freeze(story.requiresPractice) } : {}),
  choices: Object.freeze(story.choices.map(choice => Object.freeze({
    ...choice,
    flags: Object.freeze(choice.flags),
    ...(choice.requiresSkill ? { requiresSkill: Object.freeze(choice.requiresSkill) } : {}),
    ...(choice.requiresPractice ? { requiresPractice: Object.freeze(choice.requiresPractice) } : {}),
    ...(choice.requiresCooperation ? { requiresCooperation: Object.freeze(choice.requiresCooperation) } : {}),
    ...(choice.practiceChange ? { practiceChange: Object.freeze(choice.practiceChange) } : {}),
  }))),
})));

/** Let the common scene acknowledge an existing routine, without granting a prize. */
export function getStoryPresentation(storyId, state = {}) {
  const story = STORIES.find(item => item.id === storyId);
  if (!story) return { title: '', paragraphs: [] };
  const paragraphs = [...story.paragraphs];
  const socialOpening = getSocialOpening(storyId,state);
  if (socialOpening) paragraphs.push(socialOpening);
  if (storyId === 'lights_out') {
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
