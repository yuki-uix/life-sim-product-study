/** Authored fictional lives. Effects describe facts; prose never invents an unplayed branch. */
import { makeYoungLife, getClosingPlan, applyClosingChoice } from './living.js';

export const PROFILE = { name: '陈知夏', gender: '女', birthYear: 2005, endAge: 85, country: '中国', birthplace: '澄江' };

export const INITIAL_FACTS = {
  college: null, city: '澄江', cities: ['澄江'], visitedPlaces: [],
  metZhou: false, childhoodRecord: false, parentsAlive: true,
  closingPresence: false, closingRecording: null, streetRecordCount: 0, streetRecordOwner: null,
  filmStatus: 'none', filmEdition: 'full', filmCredit: 'solo', young: null,
  songMet: false, songStatus: 'unknown', songCity: null, cohabit: false,
  xuMet: false, xuStatus: 'unknown', movedForXu: false,
  classMode: null, studentMet: false, northVisited: false, kitchenRenovated: false,
  homeChoice: null, seaDays: 0, soundWorkCompleted: false, soundWorkSubmitted: false,
  soundWorkExhibited: false, missedExhibition: false, archiveHanded: false, archiveFormat: null,
};

const away = f => f.college === 'away';
const local = f => f.college === 'local';
const move = (f, city) => { f.city = city; if (!f.cities.includes(city)) f.cities.push(city); };
const visit = (f, place) => { if (!f.visitedPlaces.includes(place)) f.visitedPlaces.push(place); };
const scene = (title, text, more = {}) => ({ title, text, ...more });
const life = (id, age, present, more = {}) => ({ id, age, kind: 'life', present, ...more });
const decision = (id, age, present, choices, when) => ({ id, age, kind: 'decision', present, choices, when });
const choice = (id, label, detail, effect, result) => ({ id, label, detail, effect, result });
const archiveName = f => f.streetRecordCount === 13 ? '十三家旧店' : '周舟录下的五家旧店';
const filmName = f => f.filmCredit === 'joint' ? '和周舟共同署名的短片' : f.filmEdition === 'short' ? '九十秒精简版短片' : '个人完整版短片';
const conditionalChoice = (value, available, reason) => ({ ...value, available, unavailableReason: available ? '' : reason });

function awayClosingChoices(f) {
  const plan = getClosingPlan(f);
  return [
    choice('return_home', '这次先回去，短片改投以后', '请长假坐慢车，把这一周留给父母。票款约1000元，不足时从之后的生活费先补；保留手上的版本，不参加这次征集。', f => applyClosingChoice(f, 'return_home'), f => scene('你在卷帘门旁边', `你坐慢车回去，陪父亲修完最后一台风扇，用手机录下拉卷帘门的声音。回临港时征集已截止，电脑里仍是出发前留下的版本。${f.young?.fareDeferred ? '约1000元票款还要从之后的生活费里补上。' : '慢车票也花掉了一部分备用金。'}`, { person: 'father', quote: '抽屉里这个录音笔，你还要不要？', memory: '29岁，回乡陪父母搬店，亲手录下旧铺最后关门；没有参加那次短片征集。' })),
    choice('finish_film', '留下，把完整版亲手交出去', `按你现在的准备，还需${plan.fullDays}天，包括夜班补拍、声音核对与输出。独立完成并按时投稿，旧铺关门时赶不回去。`, f => applyClosingChoice(f, 'finish_film'), () => scene('邮件发出去以后', '你跟着夜班师傅拍完两个晚上，核过声音，在截止前发出了自己署名的完整版。母亲传来关门的视频，里面有人叫她把手机拿稳。再回澄江时，旧铺前已经围起挡板。', { memory: '29岁，独立完成并提交完整版短片；父母搬店时不在场，收到母亲拍的关门视频。' })),
    conditionalChoice(choice('short_cut_home', '交精简版，再赶回去搬店', `剪辑${plan.shortDays}天，加上快车往返与搬店${plan.travelDays}天；动用约${plan.travelCost * 1000}元备用金。把片子缩成九十秒，舍掉原本想保留的夜班段落。`, f => applyClosingChoice(f, 'short_cut_home'), () => scene('把那一段留在计划里', '你用已有画面剪成九十秒，原计划跟拍夜班师傅的段落，这次不再补拍。早先拍下的零散夜景仍另存着。邮件发出后赶车回乡，关门前到了父亲身边。旧铺最后的声音，是你亲手按下录音键留下的。', { person: 'father', quote: '到了就先坐会儿，还没收完。', memory: '29岁，删减并提交九十秒短片后回乡，亲历父母搬店；原计划的夜班段落没有进入投稿版。' })), plan.canShort, plan.shortReason),
    conditionalChoice(choice('co_edit_home', '和周舟分工，联名交片后回乡', `你还需${plan.coeditDays}天处理画面，快车往返与搬店${plan.travelDays}天，动用约${plan.travelCost * 1000}元备用金。周舟接声音部分；共同署名，明年还要留出两个完整空闲周末帮她的项目。`, f => applyClosingChoice(f, 'co_edit_home'), () => scene('片尾写上两个名字', '周舟按之前的合作约定接下声音部分，你把画面和文件交接清楚，再赶车回乡。投稿时写了两个人的名字。父母关门时你在场；周舟自己的口述史还没做完，你答应明年留出两个完整空闲周末替她整理一部分。', { person: 'zhouzhou', quote: '我只能接声音这一段。片尾写我们两个，明年留两个周末来帮我。', memory: '29岁，与周舟分工并共同署名提交短片，回乡亲历关门；答应下一年用两个完整空闲周末协助她的口述史项目。' })), plan.canCoedit, plan.coeditReason),
  ];
}

function awayClosingPortrait(f) {
  if (f.filmStatus === 'draft') return '29岁，你回到旧铺陪父母搬店，留下自己在场的关门声；手上的短片没有参加那次征集。';
  if (f.filmCredit === 'joint') return `29岁，你和周舟分工、共同署名投稿，也回乡亲历了旧铺关门。${f.young?.followupDone ? '下一年，你按约替她整理了口述史素材。' : ''}`;
  if (f.filmEdition === 'short') return '29岁，你舍去原计划的一段内容，提交九十秒精简版，再赶回旧铺陪父母搬店。';
  return '29岁，你留下独立完成完整版，后来进入小型线上放映单；旧铺关门时，你只能看母亲发来的视频。';
}

function zhouDetail(f) {
  if (f.seaDays) return `一起在海边住过${f.seaDays}天。`;
  if (f.streetRecordCount) return '还记得十岁时的街声，也参与了旧街采录。';
  if (f.filmCredit === 'joint') return f.young?.followupDone ? '一起署名完成过短片，你也按约帮她整理了口述史素材。' : '一起署名提交了短片；你还答应为她的口述史留出时间。';
  if (f.young?.cooperation) return '一起做过剪辑，约好忙不过来时可以商量分工。';
  return '十岁时，一起用旧录音笔录过声音。';
}

export const TIMELINE = [
  life('birth', 0, () => scene('维修铺后面的一张小床', '2005年，你出生在沿江小城澄江。父母经营一间家电维修铺。婴儿床放在柜台后面，傍晚收摊时，父亲总要再检查一次插线板。')),
  life('shop_child', 6, () => scene('等父母收工', '放学早的时候，你坐在店门口等。街坊大多不叫你的全名，只叫“小夏”。有时等得饿了，母亲会从抽屉里找一包饼干。')),
  life('child_recording', 10, () => scene('别按停，还没录完', '同桌周舟借来一支旧录音笔。你们录了轮船汽笛、放学铃和铺子的风扇。第二天又去玩别的，录音笔留在抽屉里。', { person: 'zhouzhou', quote: '陈知夏，别按停！', memory: '10岁，和周舟录下码头、放学铃和修理铺的风扇声。' }), { effect: f => { f.metZhou = true; f.childhoodRecord = true; } }),
  life('shared_earphones', 16, () => scene('一人一只耳机', '周舟偶尔到铺子写作业。你们各戴一只耳机，听歌，互相抱怨考试。有时谁也不说话，父亲在柜台那边试一台刚修好的电视。')),

  decision('college18', 18, () => scene('志愿表上的两座城', '两所想报的学校，专业都是数字媒体。一所在外省岚城，一所在澄江。今晚要定志愿的先后。你以前没有在另一座城长住过。'), () => [
    choice('away', '把外省岚城放在前面', '独自住校，去一个陌生的地方。回家要坐一整天车。', f => { f.college = 'away'; move(f, '岚城'); }, () => scene('半箱衣服', '录取后，你带走半箱衣服，没带录音笔。岚城第一场雪，你拍给周舟，她回了一张澄江下雨的照片。', { memory: '18岁，离开澄江，到岚城读数字媒体。' })),
    choice('local', '把本地澄江放在前面', '能常回家，在熟悉的地方上大学。也可以以后再试着离开。', f => { f.college = 'local'; move(f, '澄江'); }, () => scene('坐公交去大学', '录取后，你开始坐公交上大学。原以为会常见周舟，课表不同以后，仍然要专门约。住得近，没有自动变成每天都在一起。', { memory: '18岁，留在澄江读数字媒体。' })),
  ]),

  life('student_life', 20, f => away(f)
    ? scene('先学会自己去医院', '你学会剪视频，也学会和室友轮流打扫。第一次独自去医院，在挂号窗口前绕了两圈。宿舍有人半夜煮面，你跟着分了一碗。')
    : scene('课本封底的地名', '你和周舟在公交上看到一张海边照片，说毕业以后去看看。那个暑假，一个实习，一个打工。地名写在课本封底，谁也没订票。')),
  life('local_job', 22, () => scene('自己住以后', '你在本地做展馆音频，搬出家住。梅雨季衣服总晾不干，父亲来修过两次电饭锅。晚上有时去铺子吃饭，有时只想在家煮面。'), { when: local }),
  life('away_job', 23, () => scene('临港，一间晒不到太阳的房', '毕业后，你到临港做展览视频。有时工作很有趣，有时反复改同一行字幕。自己拍过的几段素材，还没剪成想要的样子。空下来的晚上，你会开电脑，也会先躺一会儿；周舟的语音常攒到周末才听。'), { when: away, effect: f => { move(f, '临港'); f.filmStatus = 'draft'; f.young = makeYoungLife(); } }),
  life('ordinary_twenty_six', 26, () => scene('换了一个窗口', '常去的食堂换了窗口。你和周舟排到跟前，才发现想吃的那道卖完了。吃完回去上班时，你们又约了一次没定日期的海边旅行。'), { when: local }),
  life('moving_notice', 28, () => scene('父亲发来一张门口的照片', '旧街列进了改造计划。父母开始找新的铺面，最后营业日还没定。父亲说柜台里有些旧东西，等你回来再收。周舟接了文化馆的口述史整理，回消息也比以前慢了。你自己的片子还在约最后一段夜班补拍，要等师傅排出空闲。', { person: 'father', quote: '不急着现在回来，等日子定了再说。' }), { when: away }),

  decision('away_closing29', 29, f => scene('老街月底搬走', `父母定好月底搬店，短片征集也在这周截止。片中的夜班师傅终于约出两个晚上；保留他的段落，还要做声音核对与输出。加上尚待整理的部分，你独立收尾需要${getClosingPlan(f).fullDays}天。快车往返和陪搬店要留四天。父亲问你，要不要回来收柜台里的东西。`), awayClosingChoices, away),
  decision('local_closing29', 29, () => scene('同一个营业下午', '老街要改造。父母约了周日下午搬店，文化馆也想在最后营业日留下十三家店的声音。周舟负责访问，你负责录音，几位店主只有那天下午能聚齐。'), () => [
    choice('with_parents', '先陪父母收店', '周舟一个人继续采录，能留下多少算多少。', f => { f.closingPresence = true; f.closingRecording = 'own'; f.streetRecordCount = 5; f.streetRecordOwner = 'zhouzhou'; }, () => scene('把灯泡递上去', '你陪父母收好工具，录下最后一次关门。周舟后来传来五家店的声音，说一个人问着问着，总忘了先按录音。新店的灯，你们晚上一起装好。', { person: 'zhouzhou', quote: '先给你这五段，别的确实没赶上。', memory: '29岁，陪父母收店并亲手录下关门；收到周舟独自采录的五家旧店声音。' })),
    choice('record_street', '把十三家的采访录完整', '先把答应的采录做完。父母那边晚上再去，关门时你不在场。', f => { f.closingPresence = false; f.closingRecording = 'mother-video'; f.streetRecordCount = 13; f.streetRecordOwner = 'joint'; }, () => scene('十三段录音和一段视频', '你录下十三家店。母亲发来关门的视频，你有影像，却没站在那扇门旁。晚上去新店帮忙，父亲只指了指箱子，让你递灯泡。', { person: 'father', quote: '灯泡递我一下。', memory: '29岁，和周舟录下十三家旧店；父母关门时不在场，收到母亲拍的视频。' })),
  ], local),
  life('film_reply', 31, f => scene('一封带链接的回信', f.filmCredit === 'joint'
    ? '放映通知寄到了你和周舟两人的邮箱。小型线上节目单里，片尾按约写着两个名字。没有奖项，观看的人也不多。周舟把其中一条声音反馈转给你，说下次可以换个录法。'
    : f.filmEdition === 'short'
      ? '小型线上放映单里出现了那段九十秒精简版。没有奖项，观看的人也不多。你回看了一次，想起没有补拍的夜班段落；早先拍下的零散夜景，仍留在另一个文件夹里。'
      : '小型线上放映单里出现了你的三分钟短片。没有奖项，观看的人也不多。一位同学发来两个镜头的反馈，你回放了一遍，记下他说的地方。', { memory: `31岁，收到线上放映通知，${f.filmCredit === 'joint' ? '29岁与周舟共同署名提交的短片' : `29岁提交的${filmName(f)}`}进入放映单。` }), { when: f => away(f) && f.filmStatus === 'submitted', effect: f => { f.filmStatus = 'screened'; } }),
  life('meet_song', 33, () => scene('周舟来临港出差', '周舟拉你参加一次周末骑行。你认识宋闻，后来开始约会。有一次两个人骑错路，最后在便利店吃了晚饭；也有几次约好又临时取消。', { memory: '33岁，经周舟的一次来访认识宋闻，后来开始交往。' }), { when: away, effect: f => { f.songMet = true; f.songStatus = 'dating'; f.songCity = '临港'; } }),
  life('meet_xu', 35, () => scene('有人录家里的锅', '周舟在文化馆工作，偶尔请你带声音小课。第一次回放，大家总嫌自己的声音奇怪。这一年，你和大学时就认识的许阳开始交往。', { memory: '35岁，在澄江带起声音小课，与大学同学许阳开始交往。' }), { when: local, effect: f => { f.xuMet = true; f.xuStatus = 'dating'; f.classMode = 'occasional'; } }),
  life('thirty_seven', 37, f => away(f)
    ? scene('一顿约好的晚饭', '宋闻下班早，先买好菜等你。你回消息说又要改一段字幕，饭就晚了半个小时。吃完各自回去时，你们站在路口，讲了很久谁走哪边。')
    : scene('收完设备才到家', '声音课有人迟到，有人带了一段特别长的录音。你收完设备才回家，许阳给你留了饭。周舟在群里问，下一次能不能带朋友来。')),

  decision('song_home40', 40, () => scene('两个人的书能不能放下', '你和宋闻看中一套能放下两个人的书的房子，但离你的工作地点更远。现在见面总要先对时间，搬到一起也会打乱各自习惯。'), () => [
    choice('together', '把两个人的东西搬到一起', '接受更长通勤，开始共同生活。', f => { f.cohabit = true; f.songStatus = 'cohabiting'; }, () => scene('先把书带上', '搬家后你们为洗碗争过，也慢慢知道对方什么时候只想安静待着。长通勤没有变短。晚上回来，有时能闻到厨房里的面汤。', { person: 'songwen', quote: '那就把你的书也带上，别只搬我的。', memory: '40岁，与宋闻开始合住，接受更长的通勤。' })),
    choice('separate', '先继续各住', '保留自己的住处和节奏。见面仍需专门约时间。', f => { f.cohabit = false; f.songStatus = 'separate-homes'; }, () => scene('各自留一把钥匙', '你们没搬家，各留了一把对方家的钥匙。周末有时一起过，有时各忙各的。宋闻会先发消息问你在不在，不再直接拎菜上门。', { person: 'songwen', quote: '那周日还一起吃饭？我先不买太多菜。', memory: '40岁，和宋闻约定继续各住，保留往来与各自的生活。' })),
  ], away),
  decision('xu_move40', 40, () => scene('许阳想去岚城', '许阳得到外省一份长期工作，想去，也问你要不要一起。你在澄江有工作和刚开始的课程，岚城的日子还不熟悉。'), () => [
    choice('follow', '一起搬去岚城', '本地课程先交给别人，在新的城市尝试共同生活。', f => { f.xuStatus = 'together'; f.movedForXu = true; f.cohabit = true; f.classMode = null; move(f, '岚城'); }, () => scene('新地址写在纸箱上', '你把课交给周舟联系的人，和许阳搬到岚城。两个人一起找房，第一周忘了买锅。周舟发来课程的照片，里面坐着几个不认识的新面孔。', { memory: '40岁，与许阳搬到岚城共同生活，把澄江的课程交给别人。' })),
    choice('try_distance', '先留在澄江，试试异地', '课程照常。见面和共同生活需要重新安排。', f => { f.xuStatus = 'distance'; f.cohabit = false; }, () => scene('先排下一次见面的日子', '你们试着轮流坐夜车，也认真排过休假。有一次你到了车站，才知道许阳临时加班。第二天，你又得赶回来。', { memory: '40岁，许阳去了岚城，你先留在澄江，开始尝试异地。' })),
  ], local),
  decision('xu_future42', 42, () => scene('以后住在哪里', '两年的异地里，你们排过假，也改过票。许阳再次问起以后住在哪里，这一次谈的是长期打算。你也还没决定要不要放下澄江的生活。'), () => [
    choice('trial_together', '去岚城住半年，亲自试一次', '手上的课程暂时交接，看看共同生活是否适合彼此。', f => { f.xuStatus = 'trial'; f.movedForXu = true; f.cohabit = true; f.classMode = null; move(f, '岚城'); }, () => scene('先带够半年的衣服', '你没有马上退掉澄江的住处，只带够半年的衣服去岚城。许阳替你清出一张桌子。很多原来只能在电话里说的事，终于可以一起慢慢做。', { memory: '42岁，到岚城与许阳试住半年，暂时交接澄江的课程。' })),
    choice('part', '承认都不愿搬，结束伴侣关系', '不再靠下一张车票等待共同生活，各自继续。', f => { f.xuStatus = 'parted'; f.cohabit = false; }, () => scene('没有再订下一张票', '你们在车站把话说清。之后一段时间，你仍会点开许阳的头像。后来偶尔看到近况，会回一句，却不再安排下一次见面。', { memory: '42岁，与许阳在两年异地后结束伴侣关系。' })),
  ], f => local(f) && f.xuStatus === 'distance'),
  life('xu_trial_settles', 45, () => scene('半年以后又过了几年', '试住结束时，你们没有急着搬回去。后来你把澄江那套房退了，留在岚城。许阳仍常出差，你也开始在附近找一些自己的事情做。'), { when: f => local(f) && f.xuStatus === 'trial', effect: f => { f.xuStatus = 'together'; } }),
  life('ordinary_forty_seven', 47, f => away(f)
    ? scene('手机里多是晚饭', f.cohabit ? '手机里拍得最多的，已经是晚饭、阳台上的衣服和宋闻睡着以后歪掉的眼镜。父亲不再接大件维修，你回去时帮他把沉的东西搬到柜台下。' : '你偶尔拍些东西，更多时候只是晚饭和窗台上的植物。宋闻发来自己新添的书架，问下次吃饭时能不能顺路帮忙搬几本书。')
    : scene('下班后也想只看一集剧', `你在${f.city}换过房，也有几个月只想下班回去看剧。周舟发来的消息不总是当天回，真的打通电话时，又能聊很久。`)),
  life('old_shop_visitor', 49, f => scene('这是我那口锅', `当年卖豆花的阿姨带外孙来听旧街录音。${f.city === '澄江' ? '你们在小课的教室里坐下' : '你刚开始在岚城活动室帮忙，周舟安排视频，你从那里接进来'}。她突然让你倒回去一点：“这是我那口锅。”她没有问为什么还没剪成完整作品。`, { memory: `49岁，旧店主带外孙听${f.streetRecordCount}家旧店的录音，认出了自己那口锅的声音。` }), { when: local, effect: f => { if (!f.classMode) f.classMode = 'occasional'; } }),

  decision('away_budget55', 55, f => scene('收藏夹里的北方', f.cohabit ? '你们存了一笔钱。北方路线还在收藏里，厨房也用了很久，两个人做饭总得侧身让路。这次能请出一段长假，预算却不够两件事都做。' : '你存了一笔钱。北方路线还在收藏里，自己的厨房也用了很久，收纳不够。这次能请出一段长假，预算却不够两件事都做。'), () => [
    choice('north_trip', '请长假，去北方', '这次真的出发。厨房先照旧用着。', f => { f.northVisited = true; visit(f, '北方'); }, () => scene('车票终于没有留在收藏夹', '你订了票，带着那份存了多年的路线出发。有一站下了雨，照片并不好看。回临港后，厨房还是原来那样，你先把行李摊在地上。', { memory: '55岁，请长假走完收藏多年的北方路线，厨房没有在那年翻新。' })),
    choice('renovate', '先翻新厨房和卫生间', '每天方便一些。北方旅行这次往后放。', f => { f.kitchenRenovated = true; }, f => scene('十几天外卖', f.cohabit ? '装修时，你们连吃十几天外卖。新厨房装好，宋闻第一次煮面，忘了开排风。那份北方路线仍留在收藏夹里。' : '装修时你连吃十几天外卖。厨房装好，宋闻带菜来，先找了半天锅放在哪里。那份北方路线仍留在收藏夹里。', { memory: '55岁，先翻新住处，这次把北方旅行往后放。' })),
  ], away),
  decision('local_teaching55', 55, f => scene('课程想怎么继续', `你在${f.city}偶尔带的声音课渐渐有人问起。活动室想请你把课带到更多社区。你也还有旧录音想整理，不希望每个周末都在赶场。`), () => [
    choice('expand', '多带几个社区，每周去两天', '认识更多学员。自己的录音和空闲时间会继续往后排。', f => { f.classMode = 'expanded'; f.studentMet = true; }, () => scene('教室的地址多了几个', '你的包里多了一张排课表。小尹帮忙检查设备，有的学员上几次就走，也有人一直跟着。回到家，有时连电脑都不想再打开。', { memory: '55岁，把声音课扩到几个社区，每周两天；小尹开始帮忙检查设备。' })),
    choice('small_group', '收成每月一次的小组', '留出自己的时间。想系统学习的人可能去别处。', f => { f.classMode = 'monthly'; f.studentMet = true; }, () => scene('没带录音也来坐坐', '几个人不再来了，小尹留下，周舟也偶尔参加。有一晚没人带录音，四个人各带了一样晚饭。吃完才想起来，原本要讲剪辑。', { memory: '55岁，把课程收为每月小组，小尹留下；有时大家只带晚饭来坐坐。' })),
  ], local),
  life('parents_and_backup', 61, f => scene('最后一箱旧零件', `父母已经先后离世。你和周舟收拾最后一箱旧零件，换电脑时又备份了童年的街声。${away(f) ? f.filmStatus === 'draft' ? '没赶上那次征集的短片也还在，保存着你后来留下的版本。' : f.filmCredit === 'joint' ? '当年那部片子的片尾仍有两个人的名字，周舟一眼听出了自己改过的那段声音。' : f.filmEdition === 'short' ? '那段九十秒的投稿版和另存的零散夜景放在相邻文件夹里，你没有把它们合成同一个版本。' : '你又打开当年投稿的片子，觉得几处剪得太急。' : '机器已经坏了，文件还在。你有时认得声音，却一下想不起店名。'}`, { memory: '61岁，收拾父母留下的旧零件，再次备份童年街声。' }), { effect: f => { f.parentsAlive = false; } }),
  life('sixty_three', 63, f => scene('听着烧饭', `${archiveName(f)}的录音仍有几段没剪好。你有时听着烧饭，有时几个月不打开。周舟问还认不认得那家小吃店，你得听到后半段才想起来。`), { when: local }),

  decision('away_home68', 68, f => scene('要不要回澄江住一阵', '周舟说河边有套房子空着。你有点想回去，但宋闻还喜欢临港的生活。', { person: 'songwen', quote: f.cohabit ? '我不想一下子都退掉。你要不先去住一阵？' : '你先去试试？我这里还想再住几年。' }), f => [
    choice('try_home', '自己先回去试住三个月', f.cohabit ? '重新适应故乡，也接受暂时分开住。' : '看看故乡现在的生活，和宋闻见面会隔一段路。', f => { f.homeChoice = 'try_home'; move(f, '澄江'); }, () => scene('回乡第一周又走错了站', '你先回去了。旧修理铺的位置已经开了别的店，公交站也挪过。宋闻来住了几次，有一次嫌屋里潮，提前回了临港。', { memory: '68岁，先独自回澄江试住，宋闻暂时留在临港。' })),
    choice('stay_city', '继续留在临港', '保留熟悉的日常，每年回澄江住几周。', f => { f.homeChoice = 'stay_city'; }, f => scene('这套房子还住得惯', f.cohabit ? '你们没再搬家。桌边那块磕掉的漆一直没补，宋闻说看习惯了。你回澄江住过几周，回来时仍觉得临港的床睡得惯。' : '你没再搬家。周舟来住过几晚，宋闻也过来吃饭。回澄江住几周以后，你又拖着箱子回到临港的这间屋子。', { memory: '68岁，决定留在临港生活，回澄江探望而没有迁居。' })),
  ], away),
  decision('local_sea68', 68, f => scene('海边的两个星期', `小尹如今参与一个城市声音展，问你能否把${archiveName(f)}的素材整理成片，十天后交。周舟约好的海边行程有两周，课本封底那个地名，终于要去了。`), () => [
    choice('finish_work', '先交作品，再去会合', '按时提交，海边只能赶上最后三天；投稿不等于已经展出。', f => { f.soundWorkCompleted = true; f.soundWorkSubmitted = true; f.seaDays = 3; visit(f, '海边'); }, f => scene('带着一张提交回执出发', `你用${f.streetRecordOwner === 'zhouzhou' ? '周舟采录的' : '当年一起采录的'}${f.streetRecordCount}家店声音剪成一段作品，按期提交。再到海边时，周舟已经知道哪家面馆没写招牌。你们一起住了最后三天。`, { memory: `68岁，用${f.streetRecordCount}家旧店素材完成并提交声音作品，随后与周舟在海边住了三天。` })),
    choice('go_sea', '从第一天就一起出发', '完整过这两个星期，作品赶不上这届展。', f => { f.seaDays = 14; f.missedExhibition = true; visit(f, '海边'); }, () => scene('这一次没有改票', '展览开幕那天，你们正在找一家没写招牌的面馆。风很大，周舟拍照时头发总挡住脸。回来后，那届展已经结束，名单里没有你的作品。', { memory: '68岁，与周舟在海边住了两个星期，错过当届城市声音展。' })),
  ], local),
  life('song_at_home', 71, f => f.cohabit
    ? scene('最后一箱书到了', '你们试了几个冬天，才慢慢决定把大部分东西搬回来。宋闻最后一箱书到了，箱子上仍贴着临港搬家公司留下的旧标签。', { memory: '71岁，宋闻也搬到澄江，继续与你共同生活。' })
    : scene('河对岸过一个周末', '宋闻来澄江住了一个周末，问你附近有没有合适的短租屋。走时仍带回临港的钥匙。你们各住各的，往来没有变成搬家。'), { when: f => away(f) && f.homeChoice === 'try_home', effect: f => { if (f.cohabit) { f.songCity = '澄江'; f.songStatus = 'cohabiting'; } else f.songStatus = 'separate-homes'; } }),
  life('seventy_five', 75, f => away(f)
    ? scene('地图册里的一张纸', f.northVisited ? '你又翻到北方旅行那年的车票。路线旁写着几个实际没停过的小站，下次也许可以看看。窗外天快黑了，你先把晚饭热上。' : '你又翻到北方旅行清单，添了一个地名。那一年仍没成行。路线一直夹在地图册里，没有谁把它划掉。')
    : scene('今天不用赶课', f.classMode === 'monthly' ? '小组有人去了别的城市，有人路过时再来坐坐。你不再按日历准备整堂课。有一回大家坐到楼下关灯，才收拾饭盒各自回家。' : '排课表已经交给别人，你偶尔去看看。小尹会先问你想不想带一小段；你说今天只想坐着，她就替你留张椅子。')),
  life('archive_handoff', 77, f => scene('把文件交给小尹', f.soundWorkCompleted
    ? `你把完成的声音作品和${f.streetRecordCount}家店的原始素材一并交给小尹保存。文件夹里也留着当年的提交回执；有没有展出，不能只凭这张回执说。`
    : `你把${f.streetRecordCount}家店的原始录音交给小尹保存。没有剪出完整的城市声音作品，几段文件仍很乱。她先复制了一份，没有催你再从头改。`, { memory: f.soundWorkCompleted ? `77岁，将完成的声音作品及原始素材交给小尹保存。` : `77岁，将${f.streetRecordCount}家旧店的原始录音交给小尹保存，作品仍未完成。` }), { when: local, effect: f => { f.archiveHanded = true; f.archiveFormat = f.soundWorkCompleted ? 'finished' : 'raw'; } }),
  life('old_friends', 83, f => scene('喊别按停的是谁', f.city === '澄江'
    ? `周舟来吃饭，你们重听十岁时的街声。${f.cohabit ? '宋闻问，喊别按停的是谁。周舟说：“我，现在听着也嫌吵。”' : '周舟说自己现在听着也嫌吵。宋闻发来临港的天气，说下次再一起听。'}`
    : `周舟来临港住了几天。你们重听十岁时的街声，${f.cohabit ? '宋闻在旁边问，喊别按停的是谁' : '你给宋闻发了其中一小段'}。周舟说：“我，现在听着也嫌吵。”`), { when: away }),
  life('student_helps', 84, () => scene('这次小尹教你', '小尹来教你用新的播放工具，先把界面上的字调大。以前分不清剪切和删除的是她。现在，她陪你听完一段声音，再慢慢讲按钮在哪里。', { memory: '84岁，小尹反过来教你使用播放工具，陪你把旧录音听完。' }), { when: local }),
  { id: 'life_end', age: 85, kind: 'end', present: f => scene('2090年，这一生走到了这里', `一个普通冬夜，你在${f.city}离世，85岁。${away(f) ? f.northVisited ? '北方的车票与街声备份留在抽屉里。' : '北方旅行的清单仍夹在地图册里，街声的备份也还在。' : f.soundWorkCompleted ? '声音作品和原始素材都已经交给小尹，海边的照片留在相册里。' : '旧店的原始录音有人继续保存，一张海边照片留在相册里。'}过去的日子已经成为这一生的记录。`) },
];

export function getPeople(f) {
  const people = [
    { id: 'father', name: '父亲', relation: f.parentsAlive ? '家人' : '已离世', detail: f.parentsAlive ? '修理铺里的家人。' : '留下了一箱旧零件，以及记忆里的风扇声。' },
    { id: 'mother', name: '母亲', relation: f.parentsAlive ? '家人' : '已离世', detail: f.parentsAlive ? '一起经营维修铺。' : '一起经营过那间旧铺。' },
  ];
  if (f.metZhou) people.push({ id: 'zhouzhou', name: '周舟', relation: '童年好友', detail: zhouDetail(f) });
  if (f.songMet) people.push({ id: 'songwen', name: '宋闻', relation: f.cohabit ? f.songCity === f.city ? '共同生活的伴侣' : '伴侣，暂时分开住' : '各住各的伴侣', detail: f.songCity === f.city ? f.cohabit ? `现在与你一起住在${f.city}。` : `也住在${f.songCity}，见面仍会先约时间。` : `宋闻住在${f.songCity}，你住在${f.city}，各自决定自己的住处。` });
  if (f.xuMet) people.push({ id: 'xuyang', name: '许阳', relation: f.xuStatus === 'parted' ? '曾经的伴侣' : f.xuStatus === 'distance' ? '异地的伴侣' : '伴侣', detail: ({ dating: '35岁开始交往。', distance: '许阳去了岚城，你先留在澄江。', trial: '正在岚城一起试住。', together: '现在一起在岚城生活。', parted: '42岁，在两年异地后分开。' })[f.xuStatus] || '大学时就认识的人。' });
  if (f.studentMet) people.push({ id: 'xiaoyin', name: '小尹', relation: '学员，后来也成了朋友', detail: f.archiveHanded ? '继续保存旧录音，仍与你有来往。' : f.classMode === 'monthly' ? '留在每月的小组里。' : '在课程里认识，也会帮忙检查设备。' });
  return people;
}

export function getPortrait(f) {
  const isAway = away(f);
  const title = isAway
    ? f.homeChoice === 'try_home' ? '走过三座城，后来又回到澄江' : '在临港住下的那些年'
    : f.movedForXu ? '留过澄江，也试过另一座城' : '旧店的声音，海边的几天';
  const paragraphs = [];
  const unfulfilled = [];
  if (isAway) {
    paragraphs.push(`18岁，你去岚城读书，后来到临港工作。${awayClosingPortrait(f)}`);
    paragraphs.push(`${f.cohabit ? '40岁开始，你与宋闻建立共同生活。' : '你和宋闻一直保留各自住处，见面要约时间。'}${f.homeChoice === 'try_home' ? f.cohabit ? '68岁先回澄江试住，几个冬天以后，宋闻才把书搬过来。' : '68岁，你先回澄江，宋闻仍留在临港，来往没有变成同住。' : '晚年，你选择留在临港，熟悉的住处没有再退掉。'}`);
    paragraphs.push(f.northVisited ? '北方那条存了多年的路线，你确实走过。那张车票后来又被翻出来看过几次。' : '厨房翻新过，日子方便了。北方的路线仍留在地图册里，这段人生后来没有安排成行。');
    if (f.filmStatus === 'draft') unfulfilled.push('手上的短片没有参加29岁那次征集。');
    if (!f.northVisited) unfulfilled.push('收藏多年的北方旅行没有成行。');
  } else {
    paragraphs.push(`18岁，你留在澄江读书，后来做音频工作。${f.closingPresence ? '29岁，你陪父母收店，周舟另带回五家店的录音；你留下了自己在场的关门声。' : '29岁，你和周舟完整采录十三家店。父母关门时不在场，晚上又去新店帮忙。'}`);
    paragraphs.push(`${f.movedForXu ? '后来你也离开澄江，与许阳在岚城生活。' : f.xuStatus === 'parted' ? '与许阳尝试异地两年后，你们结束了七年的伴侣关系。' : '你继续留在澄江生活。'}${f.classMode === 'monthly' ? '课程收成每月的小组，小尹留了下来。' : `你把声音课带进${f.city}更多社区，小尹也开始帮忙。`}`);
    paragraphs.push(f.soundWorkCompleted ? `68岁，你完成并提交了用旧街素材剪出的作品，再到海边与周舟住了三天。提交回执不代表已经展出。晚年，作品和原始素材交给小尹继续保存。` : '68岁，你选择和周舟完整去海边住两周，错过当届声音展。没有剪成完整作品的原始录音，后来交给小尹保存。');
    if (f.missedExhibition) unfulfilled.push('68岁那届城市声音展没有你的作品。');
    if (!f.soundWorkCompleted) unfulfilled.push('旧街录音没有剪成一部完整的城市声音作品。');
  }
  return {
    title, paragraphs, place: f.city, people: getPeople(f), unfulfilled,
    facts: [
      { label: '生活过的城市', value: f.cities.join('、') },
      { label: '亲历的旧铺关门', value: f.closingPresence ? '你当时在场，亲手录下声音' : '你不在场，收到母亲拍的视频' },
      ...(isAway ? [{ label: '短片', value: f.filmStatus === 'screened' ? `${filmName(f)}，完成投稿后进入线上放映单` : '已有版本保留，没有参加29岁那次征集' }]
        : [{ label: '旧街素材', value: f.streetRecordOwner === 'zhouzhou' ? '周舟独自采录的五家旧店，你收到并使用' : '和周舟共同采录的十三家旧店' }, { label: '声音作品', value: f.soundWorkCompleted ? '已完成并提交；没有展出确认' : '原始素材保留，未完成成片' }]),
      { label: '出发过的旅行', value: f.visitedPlaces.length ? f.visitedPlaces.map(p => p === '海边' ? `海边 ${f.seaDays}天` : p).join('、') : '北方的路线仍在收藏里' },
    ],
  };
}
