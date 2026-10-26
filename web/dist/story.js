/** Authored short scenes. No new rules, randomness, DOM or state mutation. */
const resolved = state => (state?.events || []).filter(event => event.type === 'round.resolved');
const count = (state, action) => resolved(state).filter(event => event.action === action).length;
function scene(heading, paragraphs, quote = '', quoteSpeaker = '') {
  const log = paragraphs.join('') + (quote ? `${quoteSpeaker}：“${quote}”` : '');
  return { heading, paragraphs, quote, quoteSpeaker, log };
}

export const STORY_INTRO = Object.freeze({
  heading: '周六，早上。',
  paragraphs: Object.freeze([
    '手机亮了：“书店今天缺人，来吗？200 块。”',
    '桌上压着小展通知：下周末截稿。旁边是一本空白小册。',
  ]),
  quote: '',
  quoteSpeaker: '',
});

export function getScene(state) {
  const last = resolved(state).at(-1)?.action;
  const work = count(state, 'work');
  const steps = state?.projectSteps || 0;
  if (!state || state.round <= 1) return { ...STORY_INTRO, paragraphs: [...STORY_INTRO.paragraphs] };
  if (state.round === 2 && last === 'work') {
    return scene('又到周六。', [
      '陈姐发来展架的照片，上面夹着你上周找到的街巷图。桌上的小册还没动。',
      '今晚截稿。现在动笔能留下素材，但来不及一次做完整本。',
    ], '今天书店也缺人，要来吗？', '陈姐');
  }
  if (state.round === 2) {
    return scene('招牌还摊在桌上。', [
      '上周画下的早餐摊招牌还摊在桌上。把这些页订起来，今晚就能交稿。',
      '陈姐又发来一条帮工消息。你看了一眼手头的余量。',
    ], '今天有空的话，再来帮半天。', '陈姐');
  }
  if (state.showcase === 'submitted') {
    return scene('靠窗的位置。', [
      '陈姐发来照片。你的《住在这里》摆在靠窗展架上，封底还留着一块空白。',
      '三个周末还剩最后一次安排。',
    ], '有人翻了很久，还问早餐摊是不是就在街尾。', '陈姐');
  }
  if (steps > 0) {
    return scene(last === 'work' ? '口袋里的结款单。' : '还没装订的那一页。', [
      last === 'work' ? '口袋里放着上周的结款单。桌上那张招牌草稿还压在杯子底下。' : '上周画的街角还摊在桌上，你把翘起的纸边压平。',
      '小展已经收稿。把它做完，仍然会有一本可以翻的小册。',
    ]);
  }
  return scene('熟悉的书架。', [
    work >= 2 ? '陈姐发来一张订书单。你扫一眼，就知道那些书放在哪个架子上。' : '书店的帮工消息还留在手机里。',
    '桌上的小册还是空白。最后一个周末还没安排。',
  ], '今天要来的话，直接到里间找我。', '陈姐');
}

export function getActionNarrative(previous, action) {
  if (!['work', 'project'].includes(action)) throw new TypeError('Unknown story action.');
  const work = count(previous, 'work');
  const steps = previous?.projectSteps || 0;
  if (action === 'work' && work === 0) {
    return scene('旧书里的一张街图。', [
      '你把旧书摆回架上。一册旅行书里，掉出一张手画的街巷图。',
      steps > 0 ? '你认出了自己画过的路口。陈姐收好图，指了指靠窗的展架。' : '图上那家旧影院，如今已经是你常去的便利店。陈姐指了指靠窗的空墙。',
    ], '这张先留下。小展的时候，大家也许认得。', '陈姐');
  }
  if (action === 'work' && work === 1) {
    return scene('这次，不用再等人分活。', [
      '你进门后直接去了里间。一位街坊来取订的书，你记起上回听过的名字，找到了窗边那一摞。',
      '临近关门，陈姐让你留下喝了杯茶，才把工钱递来。',
    ], '以后他再来，就把这本散文给他。', '陈姐');
  }
  if (action === 'work') {
    return scene('里间的灯。', [
      '关店前，陈姐去门口招呼熟客，你把剩下的书归回架上。有人来问一本旧杂志，这回你知道该去哪个箱子找。',
      '结账后，陈姐把里间那盏灯留给你关。',
    ], '下回有活，我先问你。没空也没关系。', '陈姐');
  }
  if (steps === 0) {
    return scene('第一页。', [
      '你把早餐摊的招牌和回家那盏灯画在纸上。第一页排好时，天已经黑了。',
      work > 0 ? '你记起书店那张旧街图，在已经消失的影院旁画了一个小方框。' : '你在角落写下“住在这里”，把这张纸压在杯子底下。',
    ]);
  }
  if (steps === 1) {
    return previous.round <= 2 ? scene('四页纸，订在一起。', [
      '你对齐纸边，拆了两次才把订线收好。傍晚，陈姐在书店门口接过小册，翻到了早餐摊那一页。',
      '她把它放到靠窗的位置，旁边也是街坊做的小刊。',
    ], '这个招牌，画歪一点反而像。', '陈姐') : scene('留在自己手里的那本。', [
      '你试了两次，终于把四页纸订在一起。街角的线条和句子连成了完整的小册。',
      '没赶上小展。你把它翻到封底，写上今天的日期，放回桌角。',
    ]);
  }
  return scene('封底的后记。', [
    '你重新理过封面和装订，在末页补了几行字：第一次找这家早餐摊时，你在街口绕了两圈。',
    '誊清一遍后，你还是把原来那张有涂改的纸留了下来。',
  ]);
}

export function getEndingNarrative(state) {
  const work = count(state, 'work');
  const steps = state?.projectSteps || 0;
  if (!steps) return scene('现在，你认得里间的灯。', [
    '三个周末里，你渐渐认得了书店的人和书。陈姐的新消息留在手机上，不再从“你是哪位”问起。',
    '桌上那本空白小册还在。这次，它没有被做成作品。',
  ], '下次要来，直接到里间找我。', '陈姐');
  if (steps === 1) return scene('那张还没装订的纸。', [
    '早餐摊的招牌已经画在纸上。你把散页收回文件夹，没有替它补一个完成日期。',
    work >= 2 ? '陈姐又发来一张书单。你看一眼就知道该去哪个架子。' : '纸边还有一点翘，下次翻开时，应该一眼就能认出来。',
  ]);
  if (state.showcase === 'submitted') return scene('靠窗展架上的一本。', [
    '《住在这里》放在靠窗的展架上。有人翻到早餐摊那页，抬头看了看门外。',
    steps === 3 ? '封底新添的手写后记，还留着涂改的痕迹。' : '封底还有一块空白，你没有急着把它填满。',
  ]);
  return scene('桌角的那一本。', [
    '小展收稿时它还没完成。现在，四页纸已经订好，封底写着最后一个周末的日期。',
    '你把它放到桌角。回家路上经过的地方，终于连在了一起。',
  ]);
}
