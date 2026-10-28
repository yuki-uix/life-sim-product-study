/** Authored scenes for the two-Friday prototype. Rules live in engine.js. */
const has = (state, id) => state.prep.includes(id);
const isFeature = (state) => state.plan.film === 'feature';

const preparationChoices = {
  preview: {
    label: '把候选片都看一遍',
    detail: '一个人窝在宿舍看电影。下次有人中途来，你知道怎么接上故事。',
  },
  room: {
    label: '去空活动室摆摆椅子',
    detail: '借钥匙试试投影和座位。没人的时候，可以慢慢折腾。',
  },
  ahe: {
    label: '和阿禾一起吃晚饭',
    detail: '她说食堂新开了一个窗口。顺便问问，上次那一晚她过得怎么样。',
  },
  linye: {
    label: '等林野下课，一起走回宿舍',
    detail: '他周五总来得晚。去工作室门口等他，听听他这周在忙什么。',
  },
};

export function getScene(state) {
  const common = { place: '旧教学楼 · 203', choices: {} };
  switch (state.stage) {
    case 'arrival':
      return {
        ...common,
        date: '10月11日 · 周五', time: '18:40', eyebrow: '第一晚',
        title: '门没关，电影还没开始',
        paragraphs: [
          '你只是路过，听见旧教室里有人搬椅子。墙上的画面糊成一团，小满一手举着遥控器，一手按住快掉下来的插线板。',
          '门口的女生探头看了一眼，又退回走廊。小满看见你，往旁边挪了挪。',
        ],
        speaker: 'xiaoman', quote: '来都来了，搭把手？我好像把字幕调到墙外面去了。',
        choices: {
          picture: { label: '接过遥控器，试着调清画面', detail: '先把眼前这个糊掉的银幕弄好。' },
          welcome: { label: '去门口，问她要不要进来坐', detail: '投影先交给小满，你去招呼那个犹豫的女生。' },
        },
      };
    case 'first_door':
      return {
        ...common,
        date: '10月11日 · 周五', time: '19:40', eyebrow: '第一晚 · 电影中途',
        title: '有人轻轻敲了两下门',
        paragraphs: [
          state.first.help === 'picture'
            ? '画面终于清楚了。你坐在最后一排，刚看懂两个人为什么吵架，走廊的光从门缝里漏进来。'
            : '阿禾把书包放在旁边的空椅子上，给你留了位子。电影刚讲到一封没寄出的信，门外探进一个脑袋。',
          '来人背着画筒，鞋上还沾着一点白灰。小满又从椅子上站起来，正准备出去。',
        ],
        speaker: 'linye', quote: '还没散吧？我这才下课……现在进去会不会打扰？',
        choices: {
          pause: { label: '暂停一下，给他讲讲前面', detail: '大家一起等一会儿，林野能听明白再往下看。' },
          quiet: { label: '轻声招呼他，在后排坐下', detail: '电影接着放，你给他挪出一个位置。' },
        },
      };
    case 'first_close':
      return {
        ...common,
        date: '10月11日 · 周五', time: '20:50', eyebrow: '第一晚 · 散场后',
        title: '小满还在收最后一把椅子',
        paragraphs: [
          state.first.response === 'pause'
            ? '林野记下了片名，说回去把开头补上。阿禾蹲在地上卷电线，忽然提起刚才那个谁也没回答的问题。'
            : '林野问小满：“那封信后来寄给谁了？”阿禾笑了一下，说你得从开头看。大家在门口多站了一会儿。',
          '小满把遥控器放进抽屉。她说每次都有人晚来，自己走进走出，已经连续两周没看全一部电影。',
        ],
        speaker: 'xiaoman', quote: '下周还来玩？想试试选片也行，我陪你弄。我也想有一晚能坐着看全。',
        choices: {
          return: { label: '“好啊，下周五再来玩。”', detail: '这一周照常过。周五以前，还有两个空当留给自己。' },
        },
      };
    case 'prep_one':
    case 'prep_two': {
      const second = state.stage === 'prep_two';
      return {
        ...common,
        place: second ? '周四 · 下课以后' : '周二 · 下课以后',
        date: second ? '10月17日 · 周四' : '10月15日 · 周二',
        time: second ? '18:10' : '17:40',
        eyebrow: second ? '两晚之间 · 另一个空当' : '两晚之间 · 一个空当',
        title: second ? '下课铃响了，今晚没有别的安排' : '普通的一周，也有一点空闲',
        paragraphs: [
          second
            ? '这几天有课，有作业，也有在床上刷着手机睡着的时候。明天又是周五了，今晚还想做点什么？'
            : '周末睡了个懒觉，周一又满课。到了周二傍晚，才想起来答应小满的那场电影。你有一整个空闲的晚上。',
        ],
        choices: preparationChoices,
      };
    }
    case 'film':
      return {
        ...common,
        date: '10月18日 · 周五', time: '18:40', eyebrow: '第二晚 · 你来挑片',
        title: '还是那间教室，钥匙在你手里',
        paragraphs: [
          '窗外已经黑了。小满拎来一袋橘子，问你：“今晚看什么？”片单上有一部长片，也有两部能分开看的短片。',
          has(state, 'preview')
            ? '你都看过了。长片的结尾值得等，短片也有几处看完会想找人说说的地方。今晚不可能两边都塞满。'
            : '片单上的简介都挺有意思。可以安安静静看完一个故事，也可以留些时间，听听别人会说什么。',
        ],
        speaker: 'xiaoman', quote: '都行，你想怎么过这一晚？',
        choices: {
          feature: { label: '我也想坐下看完一部电影', detail: '《夜班慢车》· 82分钟。从19:10开始，留一段不被打断的时间。' },
          shorts: { label: '放两部短片，留点时间聊聊', detail: '14分钟和18分钟。中间留个空，聊够了再放下一部。' },
        },
      };
    case 'seats':
      return {
        ...common,
        date: '10月18日 · 周五', time: '18:55', eyebrow: '第二晚 · 开始前',
        title: '椅子还靠在墙边',
        paragraphs: [
          '阿禾来了，拎着一瓶汽水。你们把椅子搬到屋子中间。投影在前面，门在右后方，怎么坐由你决定。',
          has(state, 'room')
            ? '你试过这间屋子：把中间几把椅子转一点，外侧还能留出一条不挡银幕的小路。'
            : '摆成几排，看银幕最方便；围成一圈，大家能看见彼此的脸。',
        ],
        speaker: 'ahe',
        quote: has(state, 'ahe') ? '我坐边上一点就行。上回和你说的，你还记得吧？' : '我坐哪儿都行，别让我先自我介绍就好。',
        choices: {
          rows: { label: '排成面向银幕的几排', detail: '坐定以后就能专心看。想聊天时，可以再回过头。' },
          circle: { label: '围一个松松的圈', detail: '说话不用回头。电影开始后，大家要把椅子转向银幕。' },
          arc: { label: '摆成半弧，侧边留条小路', detail: '沿着你试过的摆法，能看银幕，也留得下晚来的人。', requires: '试过活动室的座位' },
        },
      };
    case 'door': {
      const feature = isFeature(state);
      return {
        ...common,
        date: '10月18日 · 周五', time: '19:40', eyebrow: '第二晚 · 林野到了',
        title: feature ? '门外的手机亮了一下' : '刚聊到一半，门又开了',
        paragraphs: [
          feature
            ? '电影放了半个小时。林野站在玻璃门外，朝里面指了指自己的手机。小满一看见他，就习惯性地站起来。'
            : '第一部短片放完了，大家还在聊那个没给答案的结尾。林野在门口摆摆手，小满刚剥开橘子，又准备起身。',
          has(state, 'linye')
            ? '你知道他刚从工作室出来，晚到不是因为不想来。门边还有一把空椅子。'
            : '他看了看银幕，又看了看屋里的人，没立刻推门进来。门边还有一把空椅子。',
        ],
        speaker: 'xiaoman', quote: '我出去接一下他？',
        choices: {
          pause: {
            label: feature ? '暂停电影，请林野一起听前情' : '停下这一轮，给林野讲讲刚才',
            detail: feature ? '大家等一会儿，他听明白以后一起接着看。' : '让他从大家正在聊的问题加入。原来的话题会先停一下。',
          },
          side: {
            label: '你去门口，带他到旁边坐下',
            detail: feature ? '电影接着放。你暂时离开银幕，陪他安静坐一会儿。' : '话题接着聊。你到门口接他，再一起坐回来。',
          },
          recap: {
            label: feature ? '写一句前情，递给林野' : '写下短片的问题，递给林野',
            detail: feature ? '你得从银幕移开一会儿，写清转折。他能跟上大概，错过的开头留待自己补。' : '你先停下听大家，给他写那个问题。他能接着想，却没看见大家刚才争的镜头。',
            requires: '看过候选片',
          },
          handoff: {
            label: '轻声问阿禾，愿不愿接他进来',
            detail: '你知道她不喜欢当众发言，可以私下问问。她若去接，会错过眼前这一小段。',
            requires: '和阿禾吃过晚饭',
          },
          message: {
            label: '给门外的林野发一句进度',
            detail: feature ? '让他自己找空位。他能知道看到哪里了，前半段仍得以后自己补。' : '他能自己找位子，也能接上话头，没听到的那一轮就先过去了。',
            requires: '和林野走过回宿舍的路',
          },
        },
      };
    }
    case 'ending':
      return {
        ...common,
        date: '10月18日 · 周五', time: '20:50', eyebrow: '第二晚 · 灯重新亮起来',
        title: '这一晚，就这样过去了',
        paragraphs: ['窗外的走廊静了下来。谁还坐着，谁留在门边说话，都和一周前有一点不一样。'],
        choices: {},
      };
    default:
      throw new Error(`Unknown Friday scene: ${state.stage}`);
  }
}

export function getFeedback(previousState, choiceId, nextState) {
  const stage = previousState.stage;
  if (stage === 'arrival') {
    return choiceId === 'picture'
      ? { title: '18:48 · 字幕回来了', text: '你和小满轮流按了半天。字终于清楚，她松开插线板，甩了甩发酸的手。', person: 'xiaoman', quote: '下回我可不乱碰这个键了。' }
      : { title: '18:48 · 门口的空位', text: '女生叫阿禾。你们一起搬了两把椅子，她坐下后，把旁边那把往你这儿推了推。', person: 'ahe', quote: '这儿，给你留的。' };
  }
  if (stage === 'first_door') {
    return choiceId === 'pause'
      ? { title: '19:43 · 电影等了三分钟', text: '林野听到一半笑出了声。阿禾轻轻敲了一下椅背：先看吧，后面还没演呢。', person: 'linye', quote: '懂了懂了，这回能接上了。' }
      : { title: '19:42 · 后排多了一个人', text: '你把书包抱到腿上。林野挨着你坐下，小满也坐了回来，画面一直往前走。', person: 'linye', quote: '我先看着，散了再问你。' };
  }
  if (stage === 'first_close') {
    return { title: '那之后，过了几天', text: '小满把钥匙递给你，自己留了一把。周六下了点雨，晾在阳台上的衣服一直没干。' };
  }
  if (stage === 'prep_one' || stage === 'prep_two') {
    const feedback = {
      preview: { title: '宿舍 · 片尾还在放', text: '电影看完，室友也洗完澡回来了。你关掉电脑，记住了那个不能提前说破的结尾。' },
      room: { title: '203 · 最后一把椅子', text: '椅子转来转去，你才发现侧边能留条小路。锁门时，裤脚蹭了一道灰。' },
      ahe: { title: '食堂 · 快凉掉的面', text: '你们从电影聊到选修课。阿禾说，她喜欢有人陪着看，但一被点名发言，脑子就空了。', person: 'ahe', quote: '帮忙可以，别让我上台主持就行。' },
      linye: { title: '回宿舍的路上', text: '林野说工作室周五七点半才下课。上次在门外站着，是没看懂，又不好意思问。', person: 'linye', quote: '给我发一句看到哪儿了就行，我自己找位子。' },
    };
    return feedback[choiceId];
  }
  if (stage === 'film') {
    const familiarProjector = previousState.first.help === 'picture';
    return choiceId === 'feature'
      ? { title: '片单上圈了一个名字', text: familiarProjector ? '你找出长片，顺手调清字幕。小满把橘子放在桌边，手里终于只剩一袋橘子。' : '小满按你的片单找出长片，帮你调好字幕。今晚有一整个故事要慢慢看。' }
      : { title: '两部短片，留出中间', text: familiarProjector ? '两部短片分开放。你已经知道怎么调画面，小满抱着橘子，在旁边陪你挑字幕。' : '你把两部短片分开放，小满帮你调好字幕。空出来的时间就先空着。' };
  }
  if (stage === 'seats') {
    const feedback = {
      rows: { title: '19:10 · 灯暗下来', text: '椅背一排排朝向银幕。阿禾坐在靠边的位置，小满终于也挑了一把椅子。' },
      circle: { title: '19:10 · 围坐下来', text: '大家把椅子挪了又挪，才都看得见银幕。橘子放在中间，伸手就能拿到。' },
      arc: { title: '19:10 · 门边留着一条路', text: '你没再来回试。椅子沿着上回摆过的弧线落下，小满从侧边走到自己的位子。' },
    };
    return feedback[choiceId];
  }
  if (stage === 'door') {
    const feature = isFeature(previousState);
    const familiarity = previousState.first.help === 'welcome';
    const feedback = {
      pause: {
        title: '19:43 · 等他接上',
        text: feature ? '画面停住了。林野听明白以后，小满拿起遥控器，先问了一声“那继续？”' : '大家腾出一点空，把刚才的问题讲给林野听。他放下画筒，先问了一个更奇怪的问题。',
        person: 'ahe', quote: feature ? '别把后面也讲了，我还想自己看。' : '你这个说法……好像也说得通。',
      },
      side: {
        title: '19:42 · 你去门口接他',
        text: familiarity
          ? '阿禾指了指身边的空位。你去接林野，小满本想起身，看见你们就放心坐了回去。'
          : '小满也习惯性地跟出来。你们在门边小声说了几句，才一起带林野回到位子上。',
        person: 'linye', quote: previousState.first.response === 'quiet' ? '又是你给我留位子。' : '这回我先安静看着。',
      },
      recap: {
        title: '19:41 · 一张折起的纸',
        text: feature ? '你没写结局，只写了那封信是谁留下的。林野读完，把纸折起来，坐下继续看。' : '纸上只有那个问题。林野看了看你，又看向大家，自己找了个话头加入。',
        person: 'linye', quote: feature ? '够了，这个我能接上。' : '那我说一个不一样的？',
      },
      handoff: {
        title: '19:42 · 阿禾去了一趟门边',
        text: '阿禾把汽水递给你拿着，过去和林野说了两句。小满坐了回去；阿禾回来时，顺手关小了门。',
        person: 'ahe', quote: familiarity ? '给他留了位子，就像你上次给我留的。' : '接进来了。汽水还我。',
      },
      message: {
        title: '19:41 · 屏幕上的一句话',
        text: feature ? '林野在门外读完消息，朝你举了举手机。他轻手轻脚地坐进空位，小满还捏着没吃完的橘子。' : '林野读完消息推门进来，把画筒靠好，顺着你发去的那句话接上了讨论。',
        person: 'linye', quote: '看到了，我自己进来。',
      },
    };
    return feedback[choiceId];
  }
  return { title: '', text: '' };
}

export function getNotes(state) {
  const notes = [];
  if (state.first.help === 'picture') {
    notes.push({ id: 'first-picture', label: '碰过一次遥控器', text: '字幕跑到墙外时，先别急着换片源。小满和你都记住了那个键。' });
  }
  if (state.first.help === 'welcome') {
    notes.push({ id: 'first-welcome', label: '阿禾记得那个空位', text: '第一次进203，是你在门口叫住了她。她给你留过旁边的椅子。' });
  }
  for (const id of state.prep) {
    const entries = {
      preview: { id, label: '看过这次的片单', text: '知道长片怎么用一句话接上，也记得短片里值得留下的问题。' },
      room: { id, label: '试过203的摆法', text: '几把椅子能摆成半弧；门边留路，晚到的人不用从银幕前穿过去。' },
      ahe: { id, label: '阿禾：陪着看就很好', text: '不喜欢被当众点名；私下接个人、帮点忙，她倒很愿意。' },
      linye: { id, label: '林野：周五七点半下课', text: '晚到是因为工作室。他想知道电影看到哪里，也不想让整屋人等自己。' },
    };
    notes.push(entries[id]);
  }
  if (state.plan.film) {
    notes.push({ id: 'plan-film', label: '今晚的片单', text: isFeature(state) ? '《夜班慢车》· 82分钟，一个完整的故事。' : '两部短片 · 14分钟和18分钟，中间留着聊天的时间。' });
  }
  if (state.plan.seats) {
    const seats = { rows: '几排椅子朝向银幕，阿禾坐在边上。', circle: '一个松松的圈，大家看得见彼此。', arc: '半弧的座位，门边留着一条小路。' };
    notes.push({ id: 'plan-seats', label: '203现在的样子', text: seats[state.plan.seats] });
  }
  return notes;
}
