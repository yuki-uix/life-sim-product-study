/** Short authored scenes grounded in recorded abilities and actions. No state mutation. */
const actions = state => (state?.events || []).filter(event => event.type === 'round.resolved');
const count = (state, action) => actions(state).filter(event => event.action === action).length;
const skill = (state, key) => state?.skills?.[key] || 0;
const completed = (state, id) => (state?.completedTasks || []).includes(id);
const hasIdentity = (state, id) => (state?.identities || []).includes(id);

function scene(title, paragraphs, speaker = '', dialogue = '', opportunityId) {
  return {
    title,
    paragraphs,
    ...(speaker ? { speaker } : {}),
    ...(dialogue ? { dialogue } : {}),
    ...(opportunityId ? { opportunityId } : {}),
    log: paragraphs.join('') + (dialogue ? `${speaker}：“${dialogue}”` : ''),
  };
}

export const STORY_INTRO = Object.freeze({
  title: '周六，早上。',
  paragraphs: Object.freeze([
    '陈姐把一箱新到的旧书推到你面前：“今天先认认书架。”',
    '路过早餐摊时，你也想把那块歪歪的招牌画下来。这个周末，从哪件事开始？',
  ]),
});

function opportunityReady(state, id) {
  if (completed(state, id)) return false;
  if (id === 'shop_shift') return skill(state, 'shop') >= 2;
  if (id === 'art_commission') return skill(state, 'art') >= 2;
  if (id === 'shop_table') return skill(state, 'shop') >= 4 && completed(state, 'shop_shift') && !hasIdentity(state, 'shop');
  if (id === 'art_book') return skill(state, 'art') >= 4 && completed(state, 'art_commission') && !hasIdentity(state, 'art');
  return false;
}

function invitation(id) {
  switch (id) {
    case 'shop_shift': return scene('这次，请你独立看店。', [
      '你已经能照着自己整理的索引找到书。陈姐把周末排班表转到你面前。',
      '这回没有人站在旁边分活：接待读者、找书、核对结款，都要由你照看。',
    ], '陈姐', '我这周要出去半天。你能单独看一会儿店吗？', id);
    case 'art_commission': return scene('草稿被看见了。', [
      '早餐摊老板看了你练习本里的街景，指了指门前褪色的招牌。',
      '这一次，纸上的线条要变成别人每天都能看见的东西。',
    ], '早餐摊老板', '能给我画块新招牌吗？就写“早点见”。', id);
    case 'shop_table': return scene('把这一角交给你。', [
      '收货、找书、独立值班，你都已经做过。陈姐腾出了靠窗的一张小桌。',
      '放什么书、怎样介绍，这次由你决定。桌前也会写上你的名字。',
    ], '陈姐', '试着做一张你自己的周末书桌吧。以后这一角，就请你照看。', id);
    case 'art_book': return scene('散页可以成为一本。', [
      '你翻过练习本：招牌草稿、街角速写，还有真正挂出去的那一块招牌。',
      '现在你已经能安排画面，也做过实际委托。可以把这些街巷装订成自己的小册了。',
    ], '', '', id);
    default: throw new TypeError('Unknown story opportunity.');
  }
}

export function getScene(state) {
  if (!state || state.round <= 1) return scene(STORY_INTRO.title, [...STORY_INTRO.paragraphs]);
  const pending = (state.opportunities || [])
    .filter(item => item.unlockedRound <= state.round && opportunityReady(state, item.id))
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => {
      const milestoneA = ['shop_table', 'art_book'].includes(a.id) ? 1 : 0;
      const milestoneB = ['shop_table', 'art_book'].includes(b.id) ? 1 : 0;
      return milestoneB - milestoneA || b.unlockedRound - a.unlockedRound || b.index - a.index;
    })[0];
  if (pending) return invitation(pending.id);
  if (hasIdentity(state, 'shop') && hasIdentity(state, 'art')) return scene('各有一处，留下你的名字。', [
    '书桌旁放着你写的荐书卡，另一边是你装订的小册。今天的安排可以从任何一边继续。',
  ]);
  if (hasIdentity(state, 'shop')) return scene('这回，由你安排。', [
    '靠窗书桌的荐书卡上写着你的名字。陈姐把新到的书单递给你，等你决定哪几本上桌。',
    '熟客进门，先朝你这一角看过来。',
  ], '陈姐', '这周的书桌，你来换一批？');
  if (hasIdentity(state, 'art')) return scene('有人带着题目来找你。', [
    '《住在这里》放在桌边，一份新的插画需求已经发来：想画雨天里亮着灯的街角。',
    '你翻出空白纸，这次可以直接从构图开始。',
  ]);
  const last = actions(state).at(-1)?.action;
  if (last === 'shop_shift') return scene('值班记录，收进抽屉。', [
    '上次由你独立核对的单子还夹在账本里。书店的门、书架与结账台，开始连成一件完整的事。',
    skill(state, 'shop') < 4 ? '有些旧书的分类还会拿不准。要继续练，也可以再接一次值班。' : '你整理的索引已经齐全。下次遇到陌生的书，也知道该从哪里查起。',
  ]);
  if (last === 'art_commission') return scene('路过时，抬头看了一眼。', [
    '“早点见”的招牌挂在早餐摊门前。你停了一下，认出了自己调整过的那道弧线。',
    skill(state, 'art') < 4 ? '练习本里还有没画顺的地方。接下一件活，或继续磨一磨，都来得及。' : '你已经能把一页安排完整，也有一块真的挂出去的招牌。',
  ]);
  if (last === 'shop_practice') return scene('索引卡还在原处。', [
    skill(state, 'shop') >= 4 ? '收货单、分类卡、旧书索引都摆在手边。你已经能自己处理它们。' : '你上周写的索引卡夹在书架旁。这次再走进去，可以从认得的那一排开始。',
    '也可以换个地方，带着练习本去街口坐坐。',
  ]);
  if (last === 'art_practice') return scene('翻到下一张空白纸。', [
    skill(state, 'art') >= 4 ? '散页里的线条越来越稳，几张画已经能彼此接起来。' : '上次那张街角速写还摊在桌上。你把它和最初的草稿并排放好，能看出线条的变化。',
    '书店的帮工消息也还在。这个周末，想把哪件事再做熟一点？',
  ]);
  return scene('又到周末。', ['你看了看书店的消息，又翻开手边的练习本。今天还能安排一件事。']);
}

export function getActionNarrative(previous, actionId) {
  if (actionId === 'shop_practice') {
    const level = skill(previous, 'shop');
    if (level === 0) return scene('先找到这一排。', [
      '你抱着几本旧书，在两个书架之间来回找。陈姐教你先看作者，再核对侧面的分类纸。',
      '收工前，你把容易弄混的几处写成一张索引卡，夹在书架边。',
    ], '陈姐', '不用急着记住所有书。先把这一排认熟。');
    if (level === 1) return scene('这次，自己找到了。', [
      '一位读者报出书名。你翻了自己写的索引卡，在靠墙那排找到书，不用再喊陈姐。',
      '你顺手补上两张缺失的分类纸。刚来时那箱没头绪的旧书，现在有了位置。',
    ]);
    if (level === 2) return scene('把漏掉的地方补起来。', [
      completed(previous, 'shop_shift') ? '你把上次值班时记下的几个疑问摊开，一一核对收货单。' : '你跟着陈姐核对收货单，把同名不同版的书分开放好。',
      '索引卡多了一栏版次，找书时不必再把整摞搬下来。',
    ]);
    return scene(level >= 4 ? '熟悉的活，做得稳妥。' : '一套自己能用的办法。', [
      level >= 4 ? '你照着自己的索引整理新书。熟悉的流程没有再增加新本领，但这箱书仍被妥当地放回了架上。' : '新到的旧书里混着几本没有标签的杂志。你按内容和年份补齐卡片，连陈姐也沿着你的索引找到了一期旧刊。',
      '书架边那叠卡片，已经能交给下一个刚来帮忙的人使用。',
    ]);
  }
  if (actionId === 'art_practice') {
    const level = skill(previous, 'art');
    if (level === 0) return scene('第一张，线还有些歪。', [
      '你在早餐摊对面坐下。招牌画到一半，才发现右边几乎没留空。',
      '擦掉重画后，字终于放得下了。你把第一张歪歪的草稿留在练习本里。',
    ]);
    if (level === 1) return scene('这一张，终于放得下。', [
      '你先用铅笔比了比招牌的宽度，轻轻分好位置，再落下线条。',
      '新旧两张并排放着，字和屋檐不再挤在一起。你开始知道动笔前该看什么。',
    ]);
    if (level === 2) return scene('试着少画一点。', [
      '这次你只用两种深浅画街角，把最亮的灯留成纸面的空白。',
      completed(previous, 'art_commission') ? '画过真实招牌以后，你更留意远处能不能看清；这张画的轮廓也跟着简洁起来。' : '有几处细节被你擦掉，整条街反而更容易看清。',
    ]);
    return scene(level >= 4 ? '换一张纸，继续画。' : '几张画，可以放在一起。', [
      level >= 4 ? '你试着用另一种留白画同一个街角。这次练习没有再增加新本领，纸上留下了另一种画法。' : '你把街口、早餐摊和回家那盏灯排在一起，调整画面之间的距离。',
      '最初那张歪歪的招牌还留着。旁边的新稿，已经有了稳定的线条和节奏。',
    ]);
  }
  if (actionId === 'shop_shift') {
    if (hasIdentity(previous, 'shop')) return scene('今天的书桌，由你照看。', [
      '你把已经翻旧的一本换下，补上一册刚到的散文，重新写好荐书卡。',
      '有读者问为什么把这几本放在一起。你从容说起自己的选法，又把对方提到的书记进下周的单子。',
    ], '陈姐', '这边就照你的安排来，我去理里间。');
    if (!completed(previous, 'shop_shift')) return scene('第一次，独立看店。', [
      '陈姐出门后，你照着索引替读者找书，核对付款，再把订书单夹回账本。',
      '关店前，你一项项划掉待办。陈姐回来时，柜台上只剩一张你写好的值班记录。',
    ], '陈姐', '单子很清楚。下次我可以放心把这一班交给你。');
    return count(previous, actionId) % 2 === 1 ? scene('这次遇到的，是另一件小事。', [
      '一位读者要找的书正好借给了邻店。你查过记录，替他留了消息，再找出一本题材相近的。',
      '等陈姐回来，你已经把取书安排写进交接本。',
    ]) : scene('接过一班，交清一班。', [
      '新书比预想的多到一箱。你先处理柜台的订书，再按索引把箱子分开，没让来取书的人白等。',
      '交接时，你把没做完的两件事标出来，留在记录的末尾。',
    ]);
  }
  if (actionId === 'art_commission') {
    if (hasIdentity(previous, 'art')) return scene('把别人的想法，画成看得见的样子。', [
      '对方想要一个雨天亮着灯的街角。你先画出两种构图，解释灯光和留白的不同，再按商量好的那张完成插画。',
      '交稿时，你附上适合印刷和放在屏幕上的两个版本。这次，开始前就知道要交出什么。',
    ]);
    if (!completed(previous, 'art_commission')) return scene('“早点见”，挂起来了。', [
      '你先量好木板，把练过的字和屋檐排进去。最后一笔干透后，早餐摊老板扶着梯子，你把招牌挂上门楣。',
      '退到街对面看时，三个字都清楚。练习本里的线条，第一次成了别人每天会看见的东西。',
    ], '早餐摊老板', '对，就是这个样子。明早来的客人也能看见了。');
    return scene('旧招牌旁，又添了一张价目牌。', [
      '早餐摊换了两样吃的，老板又来请你画价目牌。这次你先试好字号，不用等画满了再擦掉。',
      '新牌挂在“早点见”旁边，两块牌子的线条连成了一套。',
    ]);
  }
  if (actionId === 'shop_table') return scene('一张写着你名字的书桌。', [
    '你选了《街角来信》《旧物小记》和《走慢一点》，把“住在附近的人”写在桌前。每本旁边都有一张你亲手写的荐书卡。',
    '陈姐把下周的书桌安排留给你。以后你来这里，除了帮忙，还有自己负责的一角。',
  ], '陈姐', '周宁的周末书桌，今天开张。');
  if (actionId === 'art_book') return scene('自己的名字，印在封底。', [
    '街口、早餐摊、回家那盏灯，你把画和短句排成四页，订成一本《住在这里》。最早那张歪歪的招牌也留在末页。',
    '你在封底写下名字，把小册放到书店窗边。有人翻过以后，带着一份插画需求来找你。',
  ]);
  throw new TypeError('Unknown story action.');
}

export function getEndingNarrative(state) {
  const paragraphs = [];
  if (hasIdentity(state, 'shop')) paragraphs.push('靠窗的周末书桌仍写着你的名字。你已经从照着索引帮忙的人，变成能选书、荐书、独立照看这一角的书店搭档。');
  else if (completed(state, 'shop_shift')) paragraphs.push('交接本里留下了你独立值班的记录。陈姐下次需要人照看店面时，已经知道可以来问你。');
  else if (skill(state, 'shop') > 0) paragraphs.push('书架边那叠索引卡还留着。你已经认得了几排书，也知道下一次该怎样把活接起来。');
  if (hasIdentity(state, 'art')) paragraphs.push('《住在这里》已经装订成册。新的插画需求放在旁边；接下来，你可以带着街巷画手的本领继续接活，也可以画自己的东西。');
  else if (completed(state, 'art_commission')) paragraphs.push('“早点见”已经挂在早餐摊门前。从第一张歪歪的草稿到一块真正能用的招牌，这段变化留在了街上。');
  else if (skill(state, 'art') > 0) paragraphs.push('练习本里夹着新旧几张速写。你没有把它们写成已经完成的作品，但一页页翻回去，能看见手是怎样渐渐稳下来的。');
  if (!paragraphs.length) paragraphs.push('这八周的安排留在记录里。接下来想把什么做熟，还可以重新开始。');
  return scene('这八周，你学会了什么。', paragraphs);
}
