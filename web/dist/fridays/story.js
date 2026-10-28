/** The week is ordinary life; Friday makes some of that practice useful. */
const people = { you: '你', xiaoman: '小满', ahe: '阿禾', linye: '林野' };
const names = ids => ids.map(id => people[id] || id).join('、');
const timeOf = state => `${11 + state.day}日`;
const filmNames = state => state.works.theme === 'strange'
  ? { feature: '《消失的自动贩卖机》', shorts: ['《楼梯向下》', '《第七次敲门》'] }
  : { feature: '《夜班慢车》', shorts: ['《便利店亮着》', '《绕远的回家路》'] };
const selectedFilm = (state, facts) => facts.film === 'feature'
  ? filmNames(state).feature
  : filmNames(state).shorts.join('、');
const weekdays = ['周五', '周六', '周日', '周一', '周二', '周三', '周四', '周五'];
const dayText = [
  null,
  { time: '14:30', title: '睡醒了，下午还很长', paragraphs: ['昨晚回来得有点晚。室友已经出门，你在阳台收好衣服，想了想今天做什么。'] },
  { time: '15:10', title: '周日没什么急事', paragraphs: ['作业写到一半，有点坐不住了。窗外有人在晒被子，楼下的小卖部刚开门。'] },
  { time: '17:40', title: '下课以后的一小段时间', paragraphs: ['最后一节课拖了堂。你慢慢走出教学楼，离食堂关门还有很久。'] },
  { time: '18:10', title: '今晚没有晚课', paragraphs: ['群里的消息往上翻了几页。小满问周五还来不来，你回了个“来”，把手机揣进口袋。'] },
  { time: '16:50', title: '这周已经过了一半', paragraphs: ['下午的课提前结束了。你背着包站在岔路口，回宿舍也行，绕去别处也来得及。'] },
  { time: '18:20', title: '明天又是周五', paragraphs: ['食堂门口飘来烤饼的味道。今晚还有一个自己的空当，之后就是答应过的那场电影了。'] },
];

export function getDay(state) {
  const common = { date: `10月${timeOf(state)}`, weekday: weekdays[state.day] || '周五', time: '18:40' };
  if (state.phase === 'intro') return {
    ...common, title: '203的门还开着',
    paragraphs: ['你路过旧教学楼，小满在203搬椅子。今晚有场小放映，墙上的画面还没调清。'],
    speaker: 'xiaoman', quote: '来啦？先坐着看也行，搭把手也行。',
  };
  if (state.phase === 'schedule') return { ...common, ...dayText[state.day] };
  if (state.phase === 'friday') return {
    ...common, title: '又到周五了，今晚怎么过？',
    paragraphs: [
      '小满把钥匙放在桌上。有人来看片，有人只是想找个地方坐坐。203今晚能用到20:45。',
      state.visits.linye > 0 ? '林野说19:40能到。你知道的事、试过的东西，现在可以用上了。' : '你知道的事、试过的东西，现在可以用上了。今晚也可以只来坐坐。',
    ],
    speaker: 'xiaoman', quote: '想试哪一件？我陪你。想坐着看也好。',
  };
  if (state.phase === 'scene') return sceneDay(state, common);
  return { ...common, time: '20:45', title: '这一晚留下了什么', paragraphs: [] };
}

function sceneDay(state, common) {
  const second = state.finale.length > 0;
  switch (state.route) {
    case 'curator': return second ? {
      ...common, time: '18:55', title: '几点开始放？',
      paragraphs: [
        '片子已经选好了。墙上的借用单写着20:45关门，长片要82分钟，两部短片一共32分钟。',
        state.visits.linye > 0 ? '林野发来消息：19:40能到。早一点开场就能从容看完；等他来，会挤掉最后一段时间。' : '19:10开场，可以从容看完。晚一点开场，大家能先聊聊，但留给银幕的时间只有65分钟。',
      ],
    } : {
      ...common, title: '把排过的片单拿出来',
      paragraphs: [state.works.theme === 'strange' ? '这几天，你把几部怪故事排在了一起。那台消失的自动贩卖机，还有两部留着问号的短片，都在片单里。' : '这几天，你把几部普通生活里的小故事排在了一起。夜班电车、便利店和回家的路，现在轮到你挑给大家看。'],
      speaker: 'xiaoman', quote: '你都看过了。今晚想让大家看哪一组？',
    };
    case 'open_room': return second ? {
      ...common, time: '19:00', title: '门外又来了几个人',
      paragraphs: [
        '你照着试过的摆法收拾好房间。电影还没开始，走廊上又来了几个路过的同学。',
        state.visits.linye >= 2 ? '林野提前发来一句：“等我七点四十到，门口交给我，你进去坐。”这次可以晚些开片，等他来替你接一阵。' : '把门开着，会有更多人进来；你也会来回接待，没法一直坐着看片。',
      ],
    } : {
      ...common, title: '给203留一个角落',
      paragraphs: ['试放那天记下的插座、过道和椅子间距，这回都用得上。你想把这间屋子布置成什么样？'],
      speaker: 'xiaoman', quote: '电影我来管。你看着弄，别把自己累着。',
    };
    case 'cohost': return second ? {
      ...common, time: '19:00', title: '一晚能招呼多少人？',
      paragraphs: ['你和小满各管一件事。来的人多了，现场会热闹一些，你也得经常从椅子上起来；只留熟人，就能慢慢看完。'],
    } : {
      ...common, title: '你们各拿一件顺手的事',
      paragraphs: ['你会一点选片，也摸过投影。小满把片单和遥控器放在两张桌上，等你先挑。'],
      speaker: 'xiaoman', quote: '一人管一件。你拿哪个，另一个给我。',
    };
    case 'private': return {
      ...common, time: '19:10', title: '不用赶去203了',
      paragraphs: ['阿禾给你发消息，说宿舍公共小厅今晚没人。上次一起吃饭时说好的，两个人也可以看一场。'],
      speaker: 'ahe', quote: '我带汽水。你挑，长一点短一点都行。',
    };
    case 'audience': return second ? {
      ...common, time: '20:10', title: '阿禾轻轻碰了碰你的胳膊',
      paragraphs: ['电影还没结束。阿禾看了眼食堂的关门时间，把书包抱到腿上，低声问你要不要一起去吃点东西。'],
      speaker: 'ahe', quote: '再晚面就没了。你要看完，我先去也行。',
    } : {
      ...common, time: '19:10', title: '今晚只要找个位子',
      paragraphs: ['小满已经调好画面。没有人催你接过什么，你可以拎着水杯，挑一个自己喜欢的位置。'],
    };
    default: return { ...common, title: '这一晚还没开始', paragraphs: [] };
  }
}

export function getAction(state, id) {
  if (state.phase === 'intro') {
    if (id === 'watch') return { label: '先坐下，看一会儿', detail: '今晚先当观众，看看小满挑了什么片子。', category: '随便来坐坐', effect: '选片 +1' };
    if (id === 'help') return { label: '先帮小满调投影、搬椅子', detail: '你们边试边聊，弄好了也能坐下来看。', category: '搭把手', effect: '动手 +1' };
  }
  const film = filmNames(state);
  const actions = {
    watch: { label: '窝在宿舍看部电影', detail: '看完再翻翻片尾和别人的讨论，记住自己喜欢的地方。', category: '日常', effect: '选片 +1' },
    practice: { label: '去203摆弄投影和椅子', detail: '小满留了备用钥匙。趁没人的时候，慢慢试。', category: '日常', effect: '动手 +1' },
    curate_daily: { label: '试着排一组「普通的一天」', detail: '把看过的日常故事放在一起，试试两部片子怎么接。', category: '自己试试', effect: '选片 +1 · 留下一份片单' },
    curate_strange: { label: '试着排一组「有点奇怪」', detail: '把看过的怪故事放在一起，试试一晚能留下几个问号。', category: '自己试试', effect: '选片 +1 · 留下一份片单' },
    open_trial: { label: '找两个人，临时试放一场', detail: '只试一个短片。看看坐下以后，插线和过道还顺不顺。', category: '自己试试', effect: '动手 +1 · 试过实际开门' },
    ahe: { label: state.visits.ahe ? '再约阿禾吃顿饭' : '问阿禾要不要一起吃饭', detail: state.visits.ahe >= 2 ? '去上次没吃成的那个窗口，坐一会儿。' : state.visits.ahe ? '上回说起的那部电影，还没聊完。' : '上次放映见过她，名字已经对得上脸了。', category: '一起待会儿', effect: state.visits.ahe < 2 ? '和阿禾更熟一点' : undefined },
    linye: { label: state.visits.linye ? '等林野下课，一起走一段' : '去工作室门口等林野', detail: state.visits.linye >= 2 ? '他又拖堂了。带瓶水过去，边走边聊。' : state.visits.linye ? '你们约好去看看203，那张画筒还得找地方放。' : '他总来得晚。去听听他这一周在忙什么。', category: '一起待会儿', effect: state.visits.linye < 2 ? '和林野更熟一点' : undefined },
    rest: { label: '回宿舍，随便过完这一天', detail: '洗衣服、刷手机，或者躺着听室友说话。', category: '日常' },
    curator: { label: '把自己排的片单带去203', detail: '由你定这一晚看什么、几点开始。小满负责现场。', category: '今晚想做', effect: '独立选片' },
    open_room: { label: '按自己试过的摆法，开一晚门', detail: '你安排屋子、接待来人。电影交给小满。', category: '今晚想做', effect: '独立布置' },
    cohost: { label: '和小满一人管一件', detail: '选片和放映，各拿一件。再一起决定要不要多叫人。', category: '今晚想做', effect: '搭档来办' },
    private: { label: '和阿禾单独找个地方看', detail: '上次吃饭约好的。宿舍公共小厅，两个人，一瓶汽水。', category: '今晚想做', effect: '和熟悉的人待一晚' },
    audience: { label: '带水杯过去，当一晚观众', detail: '片单由小满来定。你只要挑个位子，想走的时候再走。', category: '今晚想做' },
    feature: { label: `完整放${film.feature}`, detail: '82分钟，一个故事从开头放到结尾。' },
    two_shorts: { label: `放${film.shorts.join('和')}`, detail: '14分钟和18分钟。中间留时间说几句。' },
    early: { label: '19:10就开始', detail: state.visits.linye > 0 ? '长片也能放完。林野19:40来，会错过前半小时。' : '留足95分钟，长片也能完整放完。' },
    late: { label: '19:40再开始', detail: state.visits.linye > 0 ? '等林野一起。关门前只剩65分钟，长片会放不完。' : '大家先聊一会儿。关门前只剩65分钟，长片会放不完。' },
    quiet_corner: { label: '留一个安静看片的角落', detail: '椅子都朝着银幕，门边留好过道。' },
    chat_corner: { label: '留一个能慢慢聊天的角落', detail: '几把椅子面向彼此，汽水放在伸手能拿到的地方。' },
    welcome_all: { label: '把门开着，来的人都接进来', detail: state.visits.linye >= 2 ? '等林野19:40到。你仍和他一起接待6个人，自己只能断续看。' : '屋里能坐6个人。你要来回接待，自己只能断续看。' },
    sit_with_friends: { label: '自己坐下来，陪熟人看', detail: state.visits.linye >= 2 ? '等林野19:40来接门再开片。你和小满、阿禾坐着，屋里也能到6个。' : '今晚先留3个人。门外偶尔路过的人，就先不招呼了。' },
    make_playlist: { label: '我来排片单', detail: '把两部短片顺好，放映和设备交给小满。' },
    run_projector: { label: '我来管投影', detail: '把画面和声音弄好，片单交给小满。' },
    big_room: { label: '叫上路过的人，坐满一小屋', detail: '6个人会热闹一些。你要照应现场，只能断续看完。' },
    small_room: { label: '就我们三个，慢慢放', detail: '你、小满和阿禾。两部短片都能坐下来完整看。' },
    private_feature: { label: '看一部长片，不赶时间', detail: `${film.feature}，82分钟。小厅没有203的关门时间。` },
    private_shorts: { label: '看两部短片，边看边聊', detail: '一共32分钟。想停下说话，伸手就能按暂停。' },
    sit_front: { label: '坐前一点，专心看银幕', detail: '小满把身边的位置留给你。' },
    sit_back: { label: '坐后排，把水杯放在脚边', detail: '阿禾坐在旁边。看得见整间屋子，也容易悄悄进出。' },
    stay_credits: { label: '留到片尾字幕走完', detail: '接着看。阿禾先去食堂，你们下次再约。' },
    leave_with_ahe: { label: '和阿禾先去吃面', detail: '现在走就看不到最后一段了。今晚这张票根，会少一个结局。' },
  };
  const result = actions[id];
  if (!result) throw new Error(`Unknown campus action: ${String(id)}`);
  return result;
}

export function getLogText(before, action, after) {
  const intro = before.phase === 'intro';
  if (intro) return action === 'watch'
    ? { title: '周五 · 第一次走进203', text: '你在后排看完电影。小满挑的那部片，结尾比你想的要安静。' }
    : { title: '周五 · 第一次走进203', text: '椅子搬来搬去，字幕总算回到墙里。小满递给你半个橘子。' };
  if (before.phase === 'schedule') {
    const title = `${weekdays[before.day]} · ${getAction(before, action).label}`;
    const pools = {
      watch: [
        '室友洗完澡回来时，片尾还没放完。你往里挪了挪，两个人一起看。',
        '窗外下了点雨。你回放了一个镜头，才发现配角一直站在门边。',
        '电影看完，饭也凉了。你记下片名，准备改天再看一遍开头。',
        '这部片没想象中好看。你还是看完了，翻了翻别人怎么说。',
        '你本来只想看一会儿，抬头才发现室友已经关了台灯。',
        '片尾音乐播着，你没急着关。阳台上的衣服该收了。',
      ],
      practice: [
        '投影总歪一点。你在桌脚垫了半本旧杂志，才发现还有调节旋钮。',
        '你把椅子围成一圈，坐下又站起来试。最后挪出一条不碰膝盖的路。',
        '天还没黑，你关好窗帘试画面。走的时候，裤脚蹭了一道灰。',
        '插线板够不着。你绕着墙重新走线，收好时刚好赶上晚饭。',
        '你找了个空椅子放画筒，才发觉门口其实不适合堆书包。',
        '今天没再挪错那两张桌子。你试好声音，回去洗了件外套。',
      ],
      rest: [
        '洗衣机排了半小时。你靠在阳台上刷手机，晚饭吃了泡面。',
        '室友聊起选修课，越说越偏。你躺在床上听，没留意几点睡着。',
        '你睡了个长觉。醒来宿舍只亮着一盏灯，桌上有室友带的饼。',
        '本来想出门，鞋穿到一半又脱了。今天就在宿舍待着。',
        '你把书桌收了一半，翻出上个月没吃完的饼干。',
        '手机充上电，你在床上发了一会儿呆。这一天也就过去了。',
      ],
    };
    if (pools[action]) return { title, text: pools[action][(before.day - 1) % pools[action].length] };
    if (action === 'curate_daily') return { title, text: '你把便利店和回家路排在一起，换了几次顺序。片单上留下两行字。' };
    if (action === 'curate_strange') return { title, text: '几部怪故事放在一起，味道还真不一样。你划掉一部，把问号留到最后。' };
    if (action === 'open_trial') return { title, text: '两个人来试坐。有人踢到电线，你把线挪开，又看了一遍门边的过道。' };
    if (action === 'ahe') {
      if (before.visits.ahe === 0) return { title, text: '你们聊到上次那场放映。阿禾说，陪着看就挺好，不必每个人都发言。', person: 'ahe', quote: '一被点名，我脑子就空了。' };
      if (before.visits.ahe === 1) return { title, text: '面都快凉了，电影还没聊完。阿禾问，下次要不要在宿舍小厅单独看。', person: 'ahe', quote: '我带汽水，你挑片。周五也行。' };
      return { title, text: '新窗口还是排长队。你们换了两碗面，边吃边吐槽今天的课。' };
    }
    if (action === 'linye') {
      if (before.visits.linye === 0) return { title, text: '林野出来时还背着画筒。他说工作室周五七点半下课，到203得七点四十。', person: 'linye', quote: '想来。我晚到，顺手帮你们接人也行。' };
      if (before.visits.linye === 1) return { title, text: '你们去203试了试门边的空位。林野说，周五他能帮你接一阵来的人。', person: 'linye', quote: '门口我熟，你也进去坐会儿。' };
      return { title, text: '林野给你看没画完的作业。走到宿舍楼下，他才想起水还落在工作室。' };
    }
  }
  if (before.phase === 'friday') return {
    title: '周五 · 今晚的打算',
    text: {
      curator: '你把折过几次的片单放在桌上，小满让出电脑前的位置。',
      open_room: '钥匙转了半圈。你先推开窗，按试过的摆法挪开门边的椅子。',
      cohost: '小满往里让了让。两张桌子上，一边是片单，一边是遥控器。',
      private: '你跟小满说了今晚不去203，带上电脑去找阿禾。小厅的桌子已经收好了。',
      audience: '水杯装满了。你路过食堂买了个包子，慢慢走到203。',
    }[action],
  };
  const text = {
    feature: '你把长片排在最前面，删掉后面一串备选。今晚就看这一个故事。',
    two_shorts: '两部短片分开放。你在中间画了一道空格，留给还没发生的话。',
    early: '钟刚过七点十分，小满把灯关小。走廊上还有脚步声。',
    late: '你没急着关灯。大家先坐着聊，直到时针快走到八。',
    quiet_corner: '几把椅子朝向银幕，门边的通道留着。你坐下试了试视线。',
    chat_corner: '椅子转过来，汽水放到中间。小满伸手拿了一瓶，先问起今天的课。',
    welcome_all: '你把门口的书包挪开，又添了几把椅子。屋里慢慢多了几个名字。',
    sit_with_friends: '你把水杯放在脚边，坐进留好的位置。小满朝银幕那边指了指。',
    make_playlist: '你把两部短片顺好。小满拿起遥控器，试了试声音。',
    run_projector: '画面调清了。你坐到设备边，小满开始翻今晚的片单。',
    big_room: '你们往群里说了一声。有人带着汽水来，椅子一把把添进屋里。',
    small_room: '没再添椅子。三个人坐好，谁也没急着把第一部点开。',
    private_feature: '阿禾抱着汽水坐下。片子有点长，今晚你们没给自己定散场时间。',
    private_shorts: '第一部只有十四分钟。阿禾说不着急，聊完了再点下一部。',
    sit_front: '你在小满旁边坐下。前排的银幕比在宿舍看大了很多。',
    sit_back: '你在阿禾旁边坐下。后排有点暗，水杯盖子碰了一下椅腿。',
    stay_credits: '阿禾先走了。你把手机放回口袋，继续看那班车开往哪里。',
    leave_with_ahe: '你和阿禾从后门悄悄走出去。食堂的窗口还有热气，电影还在203放着。',
  }[action];
  return { title: '周五 · ' + getAction(before, action).label, text: text || '这一晚继续往前走。' };
}

function nextAbility(state) {
  if (state.skills.content >= 4 && state.works.theme) return '你已经能把看过的电影排成一晚的片单。下次可以换一组，再试一次。';
  if (state.skills.hands >= 4 && state.works.roomTested) return '你已经试过实际开门。下次换一批人来，也知道先把哪里收拾好。';
  if (state.skills.content >= 2 && state.skills.hands >= 2) return '和小满各管一件事，已经做得起来；再多试几回，也能自己负责其中一件。';
  if (state.skills.content >= 2) return '看过的片子已经够你试着排一组。下次可以亲手做一份片单。';
  if (state.skills.hands >= 2) return '设备和椅子已经熟悉。下次可以找两个人，试着实际放一场。';
  return '203仍然开着。下次想亲手试什么，可以从一部电影或一把椅子开始。';
}

export function getEnding(state, facts) {
  const film = selectedFilm(state, facts);
  const minutes = facts.watchedMinutes;
  const base = { artifactItems: [], resultLabel: '', nextAbility: nextAbility(state) };
  const isFeature = facts.film === 'feature';
  const fullLength = isFeature ? 82 : 32;
  const personallyFinished = minutes >= fullLength;
  switch (facts.route) {
    case 'curator': {
      const late = state.finale.includes('late');
      const stopped = late && isFeature;
      const linye = facts.sharedWith.includes('linye');
      return {
        ...base,
        title: stopped ? '电影停在最后一站之前' : isFeature ? '片尾，正好落在这一晚' : '片单里空出的一段，聊起来了',
        paragraphs: [
          stopped ? `20:45，借用教室的老师来敲门。${film}放了65分钟，后面还有17分钟。你亲手排出了这场放映，也亲手按下了没到片尾的暂停。` : `${film}按你排的顺序放完了。你知道该在哪里开始、在哪里停一下。小满这次负责放映，片单一直在你手边。`,
          linye ? late ? '林野从开头就在。你们等来的那半小时，有人说了工作室今天的事；少掉的放映时间也确实没法再补回来。' : '林野19:40才坐进来，错过了前半小时。你给他留了片名，他说回去自己补；这一晚没有为迟到再停一次。' : '散场时，你把这份片单留在203。有人抄走片名，有人问下一次还放什么。',
        ],
        artifactTitle: '你留在203的片单',
        artifactItems: [state.works.theme === 'strange' ? '主题：有点奇怪' : '主题：普通的一天', film, `${late ? '19:40' : '19:10'}开场 · ${stopped ? '20:45停在片尾前' : '完整放映'}`],
        resultLabel: stopped ? '长片未放完 · 65 / 82分钟' : `你排的片单完整放映 · ${facts.guests}人在场`,
        missed: stopped ? '最后17分钟没能放出，需要另外找时间补。' : linye && !late ? '林野错过了开头30分钟。' : undefined,
      };
    }
    case 'open_room': {
      const help = state.visits.linye >= 2;
      const chat = state.finale.includes('chat_corner');
      return {
        ...base,
        title: facts.guests >= 6 ? '203里多坐了几个人' : '门留了一条缝，你也坐了下来',
        paragraphs: [
          `你摆好的${chat ? '聊天角' : '看片角'}真的用了起来。${facts.guests}个人在这间屋子里待了一晚，椅子、过道和插线都照着试过的方式留着。`,
          help && personallyFinished ? '你们等到19:40才开片。林野接过门口，你坐在里面看完两部短片；原来约着走过的那几段路，这次替你留出了整晚的位子。' : personallyFinished ? '你没有把屋子坐满。小满、阿禾和你一起看完了两部短片，门外路过的人没有都被叫进来。' : `两部短片都放完了。你来回接人、挪座、找汽水，自己只连着看了${minutes}分钟。有些镜头听见了声音，转身已经过去。`,
        ],
        artifactTitle: '这一晚，203的样子',
        artifactItems: [chat ? '面对面的椅子 · 中间放汽水' : '朝向银幕的椅子 · 门边留通道', `${facts.guests}个人坐过这里`, `你实际看了 ${minutes} / 32分钟`],
        resultLabel: `${facts.guests}人在场 · 你${personallyFinished ? '完整看完' : '断续看片'}`,
        missed: personallyFinished ? undefined : '来回接待时，你错过了电影里的几段。',
      };
    }
    case 'cohost': {
      const playlist = state.finale.includes('make_playlist');
      return {
        ...base,
        title: playlist ? '这张片单，是你排的' : '这一晚的画面，由你管着',
        paragraphs: [
          playlist ? '你把两部短片按自己的顺序放在一起，小满管设备和开场。放到第二部时，你没再问她下一部点哪个。' : '声音忽大忽小时，你已经知道去哪里调。小满选了片单，你守着遥控器，把两部短片放了下去。',
          personallyFinished ? '没有再添人。你、小满和阿禾坐着看完32分钟，中间聊起一段，后来又安静下来。' : `屋里坐了${facts.guests}个人。你们分了工，现场仍有忙不过来的时候；节目放完了，你自己只坐下看了${minutes}分钟。`,
        ],
        artifactTitle: playlist ? '你负责的片单' : '你用过的设备便条',
        artifactItems: playlist ? [film, '你：选片和顺序', '小满：设备与放映'] : ['画面调清 · 声音调稳', '你：设备与放映', '小满：选片和顺序'],
        resultLabel: `${facts.guests}人在场 · 你负责${playlist ? '片单' : '放映'}`,
        missed: personallyFinished ? undefined : `你实际看了${minutes} / 32分钟，其他时间在照应现场。`,
      };
    }
    case 'private': return {
      ...base,
      title: '这次没有一屋子的目光',
      paragraphs: [
        `小厅里只有你和阿禾。${film}放到一半，她按了暂停，说起食堂那天没聊完的事。你们讲完，才继续往下看。`,
        '汽水剩了一点气，片尾已经走完。203今天放了什么，你们回宿舍时才想起来问。',
      ],
      artifactTitle: '没贴出去的片单',
      artifactItems: [film, `2个人 · ${fullLength}分钟完整看完`, '暂停了几次，聊完再继续'],
      resultLabel: '和阿禾单独待了一晚 · 2人',
    };
    case 'audience': {
      const left = state.finale.includes('leave_with_ahe');
      return {
        ...base,
        title: left ? '电影还在放，面已经端上来了' : '灯亮了，字幕还在往上走',
        paragraphs: [
          left ? `你看了${minutes}分钟，和阿禾先去吃面。她问你猜后面会怎样，你说了一个版本。真正的结尾，你们两个都没看见。` : '阿禾先走了。你留在椅子上，看完那班车最后停在哪里。字幕走完，小满才伸手开灯。',
          left ? '回来时203已经锁门。下次遇到小满，你还有一个结局要问。' : '你帮着叠了两把椅子，带着空水杯往回走。今晚的电影是小满挑的，其中一个镜头还在你脑子里。',
        ],
        artifactTitle: '夹在口袋里的票根',
        artifactItems: ['小满选片 · 《夜班慢车》', `${state.finale.includes('sit_front') ? '前排' : '后排'}座位`, left ? `看到第${minutes}分钟 · 先去吃面` : '82分钟 · 留到字幕结束'],
        resultLabel: left ? `看了${minutes} / 82分钟 · 和阿禾吃面` : '完整看完82分钟',
        missed: left ? `最后${82 - minutes}分钟没有看到。` : undefined,
      };
    }
    default: throw new Error(`Unknown Friday route: ${facts.route}`);
  }
}
