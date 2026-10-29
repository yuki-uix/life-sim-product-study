/** Independent reconstruction of the continuous-investment loop, not original 1in8b formulas. */
import { INITIAL_FACTS, TIMELINE } from '../life/content.js';
import { getYoungView, getYoungTime } from '../life/living.js';
import { validateSave as validateV2 } from '../life/engine.js';

export const SAVE_VERSION = 3;
export const DAYS_PER_YEAR = 360;
export const END_AGE = 85;
export const DEFAULT_SEED = 0x1a8b2026;
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(value * 1e9) / 1e9));
const ledger = () => ({ make: 0, connect: 0, settle: 0, total: 0 });
const events = [...TIMELINE].sort((a, b) => a.age - b.age);
const byId = new Map(events.map(event => [event.id, event]));
const focusIds = ['make', 'connect', 'settle'];
const isCore = state => state.status === 'living' && state.facts.college === 'away' && state.facts.young && state.age >= 23 && state.age <= 30;
const monthIndex = state => state.age * 12 + Math.floor(state.day / 30);
const coreId = id => typeof id === 'string' && id.startsWith('core_');

function normalizeSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('A seed must be an unsigned 32-bit integer.');
  return seed >>> 0;
}
function makeCore() {
  return {
    yearLedger: ledger(), totalLedger: ledger(), history: [],
    style: null, styleDays: 0, styleCompleted: null,
    collaboration: null, cooperationCompleted: null, followupCompleted: null,
    offers: { craft: false, zhou: false, followup: false }, lastOfferMonth: -1000,
    arrangement: null, migrationAt: null, lastChanges: [], monthBefore: null,
    projectArchived: [], routeFacts: [], promiseDays: 0,
  };
}
export function createGame(seed = DEFAULT_SEED) {
  seed = normalizeSeed(seed);
  return {
    version: SAVE_VERSION, seed, rng: seed, origin: { type: 'new' },
    status: 'unborn', age: 0, day: 0, facts: clone(INITIAL_FACTS), core: makeCore(),
    processed: [], pending: null, log: [], choices: [], commands: [],
  };
}
function snapshot(state, id, kind, value) {
  const entry = { id, age: state.age, day: state.day, kind, title: value.title, text: value.text };
  for (const key of ['person', 'quote', 'memory']) if (value[key] !== undefined) entry[key] = value[key];
  return entry;
}
function append(state, id, kind, value) { state.log.push(snapshot(state, id, kind, value)); }
function values(state) {
  const y = state.facts.young;
  return y ? { progress: y.progress, skill: y.skill, energy: y.energy, connection: y.connection, reserve: y.reserve } : null;
}
function settlePrecision(state) {
  for (const key of ['progress', 'skill', 'energy', 'connection']) state.facts.young[key] = Math.round(state.facts.young[key] * 1e6) / 1e6;
  // Reserve is expressed in thousands of yuan: settle it to whole yuan.
  state.facts.young.reserve = Math.round(state.facts.young.reserve * 1000) / 1000;
}
function processAtAge(state) {
  const processed = new Set(state.processed);
  for (const event of events) {
    if (processed.has(event.id)) continue;
    if (event.age > state.age) break;
    state.processed.push(event.id); processed.add(event.id);
    if (event.when && !event.when(state.facts)) continue;
    if (event.effect) event.effect(state.facts);
    append(state, event.id, event.kind, event.present(state.facts));
    if (event.kind === 'decision') { state.pending = event.id; return; }
    if (event.kind === 'end') { state.status = 'ended'; state.pending = null; return; }
  }
}
export function begin(state) {
  if (state?.status !== 'unborn') throw new Error('This life has already begun.');
  const next = clone(state); next.status = 'living'; next.commands.push({ type: 'begin' }); processAtAge(next); return next;
}
function random(state) {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 0x100000000;
}
function recordFact(state, id, label) {
  const fact = { id, label, age: state.age, day: state.day };
  state.core.routeFacts.push(fact);
  return fact;
}
function project(state) {
  const c = state.core;
  if (state.age === 30 && state.facts.young?.followupDue) return { id: 'joint_promise', label: '按约帮周舟整理录音', progressDays: c.promiseDays, requiredDays: 120, routine: ['make', 'connect', 'settle'] };
  if (c.collaboration) {
    const p = c.collaboration;
    return { id: p.kind, label: p.kind === 'cooperation' ? '和周舟处理一段录音' : p.kind === 'structure' ? '互看会的试剪' : '录音整理', progressDays: p.days, requiredDays: p.requiredDays, routine: p.kind === 'cooperation' ? ['make', 'connect'] : ['make'] };
  }
  if (c.style && !c.styleCompleted) return { id: c.style, label: c.style === 'structure' ? '把一段片子的结构理清' : '把一段片子的声音接顺', progressDays: c.styleDays, requiredDays: 60, routine: ['make'] };
  if (c.arrangement) return { id: c.arrangement.id, label: c.arrangement.id === 'edit_lab' ? '旧版约好的剪辑练习' : c.arrangement.id === 'work_together' ? '旧版约好的共同剪辑' : '旧版约好的回乡', progressDays: c.arrangement.days, requiredDays: c.arrangement.requiredDays, routine: c.arrangement.routine };
  return null;
}
function finishPractice(state) {
  const c = state.core;
  if (!c.style || c.styleCompleted || c.styleDays < 60) return;
  c.styleCompleted = { style: c.style, age: state.age, day: state.day };
  const sound = c.style === 'sound';
  recordFact(state, 'practice_' + c.style, sound ? '实际修完过一段声音' : '实际重排过一段结构');
  append(state, 'core_practice_' + c.style, 'life', {
    title: sound ? '这一次，接缝没那么突兀了' : '把前后顺序再换一次',
    text: sound ? '你在后来的空闲里，反复修同一段声音。先前选定的方向终于落到一段真的改完的片子上。再听时，你能说清哪些接缝是自己处理的。' : '你在后来的空闲里，反复试同一段素材的先后顺序。先前选定的方向终于落到一段真的重排过的片子上。你留了前后两个版本，可以拿给别人看。',
    memory: sound ? state.age + '岁，在持续练习后真正修完一段声音，开始形成自己的声音处理经验。' : state.age + '岁，在持续练习后真正重排一段结构，留下可以对照的两个版本。',
  });
  c.lastChanges = [sound ? '有了一段实际处理过的声音经验。' : '有了一段实际重排过的结构经验。'];
}
function finishCollaboration(state) {
  const c = state.core, p = c.collaboration;
  if (!p || p.days < p.requiredDays) return;
  if (p.kind === 'cooperation') {
    state.facts.young.cooperation = true; state.facts.young.cooperationAge = state.age;
    c.cooperationCompleted = { age: state.age, day: state.day };
    recordFact(state, 'cooperation', '和周舟真正一起完成过一段');
    append(state, 'core_cooperation_completed', 'life', { title: '文件终于交到了彼此手上', text: '你把约好的空闲持续留给共同的片段。周舟负责声音，你接画面，几轮文件来回以后，这一段终于做完。以后再商量分工，已经有一件一起做过的事可以参照。', person: 'zhouzhou', quote: '这次知道你文件放哪了。下次真赶时间，也能分开弄。', memory: state.age + '岁，和周舟经过真实的共同投入，完成一段声音与画面的合作。' });
    c.lastChanges = ['完成了一次实际合作；联系熟悉和共同做过事现在是两项不同的经历。'];
  } else {
    c.followupCompleted = { kind: p.kind, age: state.age, day: state.day };
    recordFact(state, 'followup_' + p.kind, p.kind === 'structure' ? '在互看会完成过试剪' : '为别人整理完成过录音');
    append(state, 'core_followup_completed', 'life', { title: p.kind === 'structure' ? '片子放完以后，有人问起一个转场' : '耳机摘下来以后', text: p.kind === 'structure' ? '你在后来的空闲里把试剪慢慢做完，带去互看会。有人提出和你不同的顺序，你记下来，回家又试了一版。先前整理结构的经验，这次真正用到了另一段素材里。' : '你在后来的空闲里整理完那段采访录音，把底噪和人声分开处理。对方回信说，终于能听清其中一句原本埋住的话。先前修声音的经验，这次真正用到了别人的素材上。', memory: state.age + '岁，沿着' + (p.kind === 'structure' ? '结构练习的路线，实际完成互看会试剪。' : '声音练习的路线，实际完成一段采访录音整理。') });
    c.lastChanges = ['把先前真实练过的方法，用在了后来遇到的机会里。'];
  }
  c.collaboration = null;
}
function finishLegacyArrangement(state) {
  const c = state.core, p = c.arrangement;
  if (!p || p.days < p.requiredDays) return;
  const y = state.facts.young;
  y.reserve = clamp(y.reserve - p.cost, 0, 8);
  if (p.id === 'edit_lab') { y.skill = clamp(y.skill + 1, 0, 12); append(state, 'core_legacy_arrangement', 'life', { title: '上次约好的练习做完了', text: '你实际留出后来的时间，做完旧版已经约好的剪辑练习，费用也在这时付出。' }); }
  else if (p.id === 'visit_home') { y.lastVisitAge = state.age; y.connection = clamp(y.connection + .5, 0, 6); append(state, 'core_legacy_arrangement', 'life', { title: '回澄江吃了一顿晚饭', text: '你实际留出后来的时间，完成旧版已经约好的回乡。在铺子里吃了一顿晚饭，来回的费用也在这时付出。' }); }
  else { y.cooperation = true; y.cooperationAge = state.age; c.cooperationCompleted = { age: state.age, day: state.day }; recordFact(state, 'cooperation', '完成旧版已经约好的共同剪辑'); append(state, 'core_legacy_arrangement', 'life', { title: '旧版约好的那一段，后来做完了', text: '你实际留出后来的时间，和周舟做完旧版已经约好的共同剪辑。过去的预约没有被当成过去已经完成的合作。' }); }
  y.arranged = null; c.arrangement = null;
}
function investDay(state) {
  const y = state.facts.young, c = state.core, f = y.focus;
  if (!focusIds.includes(f)) return;
  if (state.age === 30 && y.followupDue) {
    c.promiseDays++;
    y.energy = clamp(y.energy - .5 / 120, 0, 6);
    y.reserve = clamp(y.reserve + 1 / 360, 0, 8);
    if (c.promiseDays === 120) {
      y.followupDue = false; y.followupDone = true;
      recordFact(state, 'joint_promise', '按约完成共同署名后的录音整理');
      append(state, 'core_joint_promise', 'life', { title: '把答应的录音交回去', text: '共同署名以后，你在后来的日子里真实留下了一部分时间，帮周舟整理文化馆的录音。原先答应的分担，这次做完了；这部分时间没有同时被算给自己的练习。' });
      c.lastChanges = ['按约完成了共同署名之后的录音整理。'];
    }
    return;
  }
  for (const book of [c.yearLedger, c.totalLedger]) { book[f]++; book.total++; }
  if (!c.monthBefore) c.monthBefore = values(state);
  const busy = getYoungTime(state.facts, state.age).total / 6;
  const effort = busy * (y.energy < 2 ? .5 : 1);
  const projectDay = Boolean(c.collaboration && (f === 'make' || (c.collaboration.kind === 'cooperation' && f === 'connect')));
  const arrangementDay = Boolean(!projectDay && c.arrangement && c.arrangement.routine.includes(f));
  y.reserve = clamp(y.reserve + 1 / 360, 0, 8);
  if (f === 'make') {
    if (state.facts.filmStatus === 'draft' && !projectDay && !arrangementDay) y.progress = clamp(y.progress + 6 * effort / 360, 0, 18);
    y.skill = clamp(y.skill + 3 * effort / 360, 0, 12);
    y.energy = clamp(y.energy - 2 / 360, 0, 6);
    y.reserve = clamp(y.reserve - 2 * busy / 360, 0, 8);
    y.connection = clamp(y.connection - .75 / 360, 0, 6);
    if (c.style && !projectDay && !arrangementDay) c.styleDays++;
  } else if (f === 'connect') {
    y.connection = clamp(y.connection + 3 / 360, 0, 6);
    y.energy = clamp(y.energy + 1 / 360, 0, 6);
    if (state.facts.filmStatus === 'draft' && !projectDay && !arrangementDay) y.progress = clamp(y.progress + .5 * busy / 360, 0, 18);
  } else {
    y.energy = clamp(y.energy + 2.5 / 360, 0, 6);
    y.reserve = clamp(y.reserve + 2 * busy / 360, 0, 8);
    y.connection = clamp(y.connection - .25 / 360, 0, 6);
  }
  if (projectDay) { c.collaboration.days++; y.energy = clamp(y.energy - .5 / c.collaboration.requiredDays, 0, 6); }
  if (arrangementDay) c.arrangement.days++;
  finishPractice(state); finishCollaboration(state); finishLegacyArrangement(state);
}
function opportunityValue(state, id) {
  const c = state.core, y = state.facts.young;
  if (id === 'core_craft') return { title: '同事问，要不要互看一段', text: '这阵子你把一些空闲留给了剪辑，也慢慢处理得动基本接缝。同事看见你总在开软件，传来一段素材，问下次愿不愿意拿来互看。你们聊起这段素材该先从哪里改。' };
  if (id === 'core_zhou') return { title: '周舟想起可以问你', text: '最近你把时间留给来往，周舟的消息也不再总是隔很久才回。她手上有一段采访录音，想问能不能一起处理。说到文件怎么交接，你们在电话里比划了好一会儿。', person: 'zhouzhou', quote: y.connection >= 4 ? '最近总能碰上你，想问这段要不要一起弄。' : '看你最近回得上消息，就先来问问。' };
  if (id === 'core_structure_followup') return { title: '互看会多留了一个试剪位', text: '互看会的组织者看过你先前重排的两个版本。知道你后来也还在剪辑，他来问，要不要拿一段新素材试剪。素材里有好几条线，片子的开头还没有定。' };
  return { title: '有人托周舟问起录音整理', text: '周舟还记得你先前修好的那段声音。她把一段采访的底噪问题转来，问能不能慢慢整理。录音里有一句很轻的话，对方一直舍不得删掉。', person: 'zhouzhou', quote: '想起你上次修好的那段，才来问问。' };
}
function maybeOffer(state) {
  if (!isCore(state) || state.age >= 29 || state.pending) return;
  const c = state.core, y = state.facts.young;
  if (monthIndex(state) - c.lastOfferMonth < 6) return;
  const candidates = [];
  if (!c.offers.craft && c.totalLedger.make >= 90 && y.skill >= 1 && y.energy >= 2) candidates.push(['core_craft', .22 + Math.min(6, y.skill) * .025, 'craft']);
  if (!c.offers.zhou && !y.cooperation && !c.collaboration && c.totalLedger.connect >= 120 && y.connection >= 2) candidates.push(['core_zhou', .18 + y.connection * .035, 'zhou']);
  if (!c.offers.followup && c.styleCompleted && c.styleDays >= 150 && !c.collaboration && y.energy >= 1) candidates.push(['core_' + c.style + '_followup', .2 + Math.min(10, y.skill) * .02, 'followup']);
  for (const [id, chance, family] of candidates) {
    if (random(state) >= chance) continue;
    c.offers[family] = true; c.lastOfferMonth = monthIndex(state); state.pending = id;
    append(state, id, 'decision', opportunityValue(state, id));
    return;
  }
}
function monthEnd(state) {
  if (!isCore(state)) return;
  settlePrecision(state);
  const c = state.core, before = c.monthBefore, after = values(state);
  if (before) {
    const labels = { progress: '片子准备', skill: '剪辑熟练', energy: '精力', connection: '近期来往', reserve: '备用金' };
    c.lastChanges = Object.keys(labels).filter(key => Math.abs(after[key] - before[key]) >= .02).map(key => labels[key] + (after[key] > before[key] ? '增加了' : '减少了') + (Math.abs(after[key] - before[key]) * (key === 'reserve' ? 1000 : 1)).toFixed(key === 'reserve' ? 0 : 1) + (key === 'reserve' ? '元' : ''));
  }
  c.monthBefore = after;
  if (state.day === 180) {
    const days = c.yearLedger;
    const dominant = focusIds.reduce((best, id) => days[id] > days[best] ? id : best, 'make');
    append(state, 'core_midyear_' + state.age, 'life', { title: '有些日子就这样过去', text: dominant === 'make' ? '下班后，你仍会在一些空闲里打开剪辑软件。素材一点点接起来，几条消息也偶尔放到了第二天。' : dominant === 'connect' ? '见面和回消息慢慢占了更多空闲。有时只是吃顿饭，聊完各自回去，手上的片子没有因此自动做好。' : '你把更多空闲留给休息和收拾住处。日子安稳一点，片子的进展也慢下来。' });
  }
  maybeOffer(state);
}
function yearEnd(state) {
  if (!isCore(state)) return;
  settlePrecision(state);
  const c = state.core, y = state.facts.young, days = clone(c.yearLedger);
  const descriptions = { make: '给作品留时间', connect: '和人来往', settle: '安顿生活' };
  const text = focusIds.filter(id => days[id]).map(id => (days[id] / 30).toFixed(1).replace(/\.0$/, '') + '个月' + descriptions[id]).join('，');
  let fareNote = '';
  if (y.fareDeferred) {
    const paid = Math.min(Math.max(0, y.reserve), y.fareDeferred);
    y.reserve = clamp(y.reserve - paid, 0, 8);
    y.fareDeferred = Math.max(0, Math.round((y.fareDeferred - paid) * 1e9) / 1e9);
    fareNote = paid ? '上次慢车的票款，今年从备用钱里补回了约' + Math.round(paid * 1000).toLocaleString('zh-CN') + '元。' : '';
    fareNote += y.fareDeferred ? '还有约' + Math.round(y.fareDeferred * 1000).toLocaleString('zh-CN') + '元票款，要从之后的生活费里慢慢补上。' : '这笔票款已经补齐。';
  }
  append(state, 'core_year_' + state.age, 'life', { title: '这一年留下的过法', text: (text ? '回看这一年，大约有' + text + '。下班后的日子就这样散在电脑前、饭桌边和自己的住处里。' : '工作、买菜和洗衣照常。空下来的日子没有另外安排。') + fareNote });
  c.history.push({ age: state.age, ledger: days, committedDays: state.age === 30 ? c.promiseDays : 0, after: values(state) });
  y.history.push({ age: state.age, ledger: days, focus: null, source: 'continuous-v3', after: values(state) });
  c.yearLedger = ledger();
}
function archiveUnfinished(state) {
  if (state.age !== 31) return;
  const c = state.core, unfinished = project(state);
  if (!unfinished) return;
  c.projectArchived.push({ ...unfinished, age: 31 });
  append(state, 'core_project_paused', 'life', { title: '还有一段停在文件夹里', text: '先前答应或选定的“' + unfinished.label + '”还没有实际投入够时间。这一段先停在这里，没有被记成已经完成的专精或合作。' });
  c.collaboration = null; c.arrangement = null;
}
export function advanceDays(state, days = 1) {
  if (!Number.isInteger(days) || days < 1 || days > END_AGE * DAYS_PER_YEAR) throw new RangeError('Advance by 1 to 30600 whole simulation days.');
  if (state?.status === 'unborn') throw new Error('Begin this life first.');
  if (state.status !== 'living' || state.pending || (isCore(state) && state.facts.young.focus === null)) return clone(state);
  const next = clone(state);
  processAtAge(next);
  let used = 0;
  for (let i = 0; i < days && next.status === 'living' && !next.pending; i++) {
    if (isCore(next) && next.facts.young.focus === null) break;
    if (isCore(next)) investDay(next);
    next.day++; used++;
    if (next.day % 30 === 0 && next.day < DAYS_PER_YEAR) monthEnd(next);
    if (next.day === DAYS_PER_YEAR) {
      yearEnd(next); next.day = 0; next.age++; processAtAge(next); archiveUnfinished(next);
      if (!next.pending && isCore(next)) monthEnd(next);
    }
  }
  if (used) {
    const previous = next.commands.at(-1);
    if (previous?.type === 'days' && previous.days + used <= END_AGE * DAYS_PER_YEAR) previous.days += used;
    else next.commands.push({ type: 'days', days: used });
  }
  return next;
}
export function advance(state, years = 1) {
  if (!Number.isInteger(years) || years < 1 || years > END_AGE) throw new RangeError('Advance by 1 to 85 whole years.');
  return advanceDays(state, years * DAYS_PER_YEAR);
}
export function setFocus(state, id) {
  if (!focusIds.includes(id)) throw new Error('Unknown focus.');
  if (!isCore(state) || state.pending) throw new Error('There is no free young-life day to arrange.');
  const next = clone(state); if (next.facts.young.focus === id) return next;
  next.facts.young.focus = id; next.commands.push({ type: 'focus', id }); return next;
}
export function arrange() { throw new Error('New cooperation comes from actual contact and an opportunity, not a fixed-age appointment.'); }
function optionStatus(option, facts) {
  const available = typeof option.available === 'function' ? option.available(facts) : option.available !== false;
  const reason = typeof option.unavailableReason === 'function' ? option.unavailableReason(facts) : option.unavailableReason || '';
  return { available: Boolean(available), reason: available ? '' : reason };
}
function coreOptions(state) {
  const c = state.core;
  if (state.pending === 'core_craft') return [
    { id: 'structure', label: '先试着理清结构', detail: '选定练习方向。之后仍需在“给作品留时间”中实际练满约两个月，才有一段完成过的结构经验。' },
    { id: 'sound', label: '先试着修声音', detail: '选定练习方向。之后仍需在“给作品留时间”中实际练满约两个月，才有一段完成过的声音经验。' },
    { id: 'decline', label: '这阵子先不接', detail: '照着自己的节奏过，不会失去已经投入的练习。' },
  ];
  if (state.pending === 'core_zhou') return [
    { id: 'together', label: '留出时间，一起把一段做完', detail: '之后实际把时间留给作品或来往，' + (c.styleCompleted ? '约两个月' : '约三个月') + '的项目投入后才算共同完成。', available: !c.collaboration, reason: c.collaboration ? '手上已经有一项需要继续投入的共同事情。' : '' },
    { id: 'help', label: '这次只帮她问问采访时间', detail: '会帮忙联络，但不会因此记成一起剪过片子。' },
    { id: 'decline', label: '坦白说最近接不下', detail: '不先答应一件还没时间做的事。' },
  ];
  const structure = state.pending === 'core_structure_followup';
  return [
    { id: 'accept', label: structure ? '用做过的结构方法，试剪这一段' : '用做过的声音方法，接下录音整理', detail: '会成为接下来要持续做的一件事。需要再实际留出约两个月的作品时间，完成后才留下这次经历。', available: !c.collaboration && c.styleCompleted?.style === (structure ? 'structure' : 'sound'), reason: c.collaboration ? '先把手上已经答应的片段继续做好。' : '需要这个方向真实完成过的经验。' },
    { id: 'observe', label: structure ? '这次先去听大家怎么看片子' : '先和她听一遍，提供几个意见', detail: '可以参与讨论，但不会记成自己完成了试剪或录音整理。' },
    { id: 'decline', label: '这次先不接', detail: '以前真正做过的经验会留下，不需要每次机会都答应。' },
  ];
}
export function getDecisionOptions(state) {
  if (state?.status !== 'living' || !state.pending) return [];
  if (coreId(state.pending)) return coreOptions(state).map(o => ({ ...o, available: o.available !== false, reason: o.available === false ? o.reason : '' }));
  const event = byId.get(state.pending);
  return event ? event.choices(state.facts).map(o => ({ id: o.id, label: o.label, detail: o.detail, ...optionStatus(o, state.facts) })) : [];
}
function chooseCore(state, choiceId) {
  const c = state.core, id = state.pending;
  let text, title;
  if (id === 'core_craft') {
    if (choiceId !== 'decline') { c.style = choiceId; c.styleDays = 0; title = '先挑一个地方练'; text = '你决定先从' + (choiceId === 'structure' ? '结构' : '声音') + '入手。同事把素材留给你，你在文件夹旁边记下几个想试的地方。'; }
    else { title = '这次先留在自己的节奏里'; text = '你说最近先顾手上的片子。同事把素材收回去，说以后有空还可以互相看看。已经做过的练习没有因此消失。'; }
  } else if (id === 'core_zhou') {
    if (choiceId === 'together') { c.collaboration = { kind: 'cooperation', days: 0, requiredDays: c.styleCompleted ? 60 : 90, startedAge: state.age, startedDay: state.day }; title = '先把后面的时间留出来'; text = '你答应和周舟一起处理一段，先把文件夹建好。现在还没有完成合作，后面仍要真的把空闲留给作品或来往。'; }
    else if (choiceId === 'help') { title = '先帮忙问一个时间'; text = '你替周舟问了采访方便的时间。她谢过你，录音和剪辑仍由她自己处理；你们并没有因此共同完成一段片子。'; }
    else { title = '把接不下的话说清'; text = state.facts.young.connection >= 4 ? '周舟说，知道你这阵子安排得满，不用为了熟就先答应。你们还是聊了几句别的。' : '周舟回说，先问问而已，她再找找别人。你们没有多作保证，也没把未发生的合作写进过去。'; }
  } else {
    const structure = id === 'core_structure_followup';
    if (choiceId === 'accept') { c.collaboration = { kind: structure ? 'structure' : 'sound', days: 0, requiredDays: 60, startedAge: state.age, startedDay: state.day }; title = '把新素材放进待做的文件夹'; text = '你接下这一段，留好文件和交接说明。熟悉的方法能帮上忙，但这次的片段仍要在后面的日子里真正做完。'; }
    else if (choiceId === 'observe') { title = '这一次先和别人一起听'; text = structure ? '你带着上次真实试过的方法去听大家看片子，记下几个不同的顺序。这次没有接下试剪。' : '你和对方把录音听过一遍，指出几处可以处理的地方。这次没有接下后续整理。'; }
    else { title = '这次没接，做过的仍然留下'; text = '你说最近先顾好手上的安排。先前真实练过的方法仍是自己的经验，这一次的项目没有被记成已经完成。'; }
  }
  append(state, id + ':choice', 'choice', { title, text, ...(id === 'core_zhou' ? { person: 'zhouzhou', quote: choiceId === 'together' ? '先别赶，留出时间再一起弄。' : '好，那我知道怎么安排了。' } : {}) });
}
export function choose(state, choiceId) {
  if (!getDecisionOptions(state).some(o => o.id === choiceId && o.available)) throw new Error('Unavailable choice: ' + String(choiceId));
  const next = clone(state), id = next.pending;
  if (coreId(id)) chooseCore(next, choiceId);
  else {
    const event = byId.get(id), option = event.choices(next.facts).find(o => o.id === choiceId);
    const fare = id === 'away_closing29' && choiceId === 'return_home'
      ? { reserve: next.facts.young.reserve, deferred: next.facts.young.fareDeferred } : null;
    if (option.effect) option.effect(next.facts);
    if (fare) {
      const paid = Math.min(1, Math.max(0, fare.reserve));
      next.facts.young.reserve = clamp(fare.reserve - paid, 0, 8);
      next.facts.young.fareDeferred = Math.max(0, Math.round((fare.deferred + 1 - paid) * 1e9) / 1e9);
    }
    const result = option.result(next.facts);
    if (fare && next.facts.young.fareDeferred) result.text = result.text.replace('约1000元票款还要从之后的生活费里补上。', '还有约' + Math.round(next.facts.young.fareDeferred * 1000).toLocaleString('zh-CN') + '元票款，需要从之后的生活费里补上。');
    append(next, id + ':choice', 'choice', result);
  }
  next.choices.push({ eventId: id, choiceId, age: next.age, day: next.day }); next.commands.push({ type: 'choose', choiceId }); next.pending = null; return next;
}
export function startYoungSample(seed = DEFAULT_SEED) { let state = advance(begin(createGame(seed)), 18); state = choose(state, 'away'); return advance(state, 5); }
export function getCurrentScene(state) {
  const entry = state?.pending ? state.log.findLast(e => e.id === state.pending) : state?.log?.findLast(e => e.kind !== 'decision');
  return entry ? clone(entry) : null;
}
export function getMemories(state) { return (state?.log || []).filter(e => e.kind !== 'decision' && typeof e.memory === 'string' && e.memory).map(e => ({ id: e.id, age: e.age, text: e.memory, title: e.title, sourceId: e.id })); }
export function getNextAge(state) { if (state?.status !== 'living' || state.pending) return null; if (isCore(state)) return state.age + 1; return events.find(e => !state.processed.includes(e.id) && e.age >= state.age && (!e.when || e.when(state.facts)))?.age ?? null; }
export function getLifeView(state) {
  const base = getYoungView(state), active = Boolean(isCore(state)), c = state.core, current = active ? project(state) : null;
  if (state.age >= 31 && state.facts.young?.closingChoice === 'co_edit_home') base.summary = state.facts.young.followupDone ? '30岁，你按约帮周舟整理了文化馆的录音；共同署名之后，也真实分担了后续的时间。' : '那一周，你和周舟联名交片，也回乡陪父母搬店。答应帮她整理的录音，这一段还没有完成。';
  if (state.facts.young?.fareDeferred) base.commitmentText = '慢车票还有约' + Math.round(state.facts.young.fareDeferred * 1000).toLocaleString('zh-CN') + '元待补回；之后只用实际留得下的备用钱归还。';
  if (current) Object.assign(current, { doneDays: current.progressDays, totalDays: current.requiredDays, focusIds: clone(current.routine) });
  return {
    ...clone(base), active, needsPlan: active && state.facts.young.focus === null,
    arrangements: [], plannedText: '', notice: current ? '正在继续：' + current.label + '。选定之后，还要用后来的真实时间做完。' : '',
    headline: active ? (state.age === 24 || state.age === 27 ? '这一年展览排得密，同样的空闲投入能推进的东西少一些。' : c.styleCompleted ? '做过的方法会留下，也让后来有人想起可以来问你。' : '日常一点点累积，机会会看你做过什么，也会受时机影响。') : base.headline || '',
    yearLedger: clone(c.yearLedger), totalLedger: clone(c.totalLedger), currentMonth: Math.floor(state.day / 30) + 1,
    activeProject: current, projectSummary: current ? current.label + ' · 已实际投入' + current.progressDays + ' / ' + current.requiredDays + '天' + (c.collaboration && c.style && !c.styleCompleted ? '；先继续共同的片段，自己的' + (c.style === 'structure' ? '结构' : '声音') + '练习暂留在' + c.styleDays + '天。' : '') : '',
    routeFacts: c.routeFacts.map(f => f.label), routeRecords: clone(c.routeFacts), lastChanges: clone(c.lastChanges),
    migrationAt: clone(c.migrationAt), committedDays: state.age === 30 ? c.promiseDays : 0,
  };
}
export function migrateV2(raw, seed = DEFAULT_SEED) {
  const base = validateV2(raw); if (!base) return null;
  seed = normalizeSeed(seed);
  const next = { ...clone(base), version: SAVE_VERSION, seed, rng: seed, origin: { type: 'v2', state: clone(base) }, day: 0, core: makeCore(), commands: [] };
  next.core.migrationAt = { age: next.age, day: 0 };
  if (next.facts.young?.cooperation) {
    next.core.cooperationCompleted = { age: next.facts.young.cooperationAge, day: null, legacy: true };
    next.core.routeFacts.push({ id: 'legacy_cooperation', label: '旧版记录：和周舟共同完成过一段', age: next.facts.young.cooperationAge, day: null });
  }
  const old = next.facts.young?.arranged;
  if (old) next.core.arrangement = { id: old.id, days: 0, requiredDays: old.id === 'edit_lab' ? 60 : 90, cost: old.id === 'work_together' ? 1 : 2, routine: old.id === 'edit_lab' ? ['make'] : old.id === 'work_together' ? ['make', 'connect'] : ['connect', 'settle'] };
  return next;
}
function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && same(a[k], b[k]));
}
export function validateSave(raw) {
  if (!raw || raw.version !== SAVE_VERSION || !Array.isArray(raw.commands) || raw.commands.length > 10000 || !Array.isArray(raw.log) || raw.log.length > 1000) return null;
  let replay;
  try {
    if (raw.origin?.type === 'new' && Object.keys(raw.origin).length === 1) replay = createGame(raw.seed);
    else if (raw.origin?.type === 'v2' && Object.keys(raw.origin).length === 2) replay = migrateV2(raw.origin.state, raw.seed);
    else return null;
    if (!replay) return null;
    let requested = 0;
    for (const command of raw.commands) {
      if (!command || typeof command !== 'object' || Array.isArray(command)) return null;
      if (command.type === 'begin' && Object.keys(command).length === 1) replay = begin(replay);
      else if (command.type === 'days' && Object.keys(command).length === 2 && Number.isInteger(command.days)) { requested += command.days; if (requested > 200000) return null; replay = advanceDays(replay, command.days); }
      else if (command.type === 'focus' && Object.keys(command).length === 2 && typeof command.id === 'string') replay = setFocus(replay, command.id);
      else if (command.type === 'choose' && Object.keys(command).length === 2 && typeof command.choiceId === 'string') replay = choose(replay, command.choiceId);
      else return null;
    }
    return same(raw, replay) ? replay : null;
  } catch { return null; }
}
