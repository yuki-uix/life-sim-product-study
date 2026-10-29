/** Read-only presentation of the China sample, not a second simulation. */
import { getCurrentScene, getLifeView } from '../life/engine.js';
import { PROFILE, getPeople } from '../life/content.js';

const copy = value => JSON.parse(JSON.stringify(value));
const yuan = value => value.toLocaleString('zh-CN') + '元';

function identityFor(state) {
  const f = state.facts;
  const processed = new Set(state.processed);
  const study = f.college === 'away' ? '岚城 · 数字媒体' : f.college === 'local' ? '澄江 · 数字媒体' : '尚未选择大学路线';
  const occupation = processed.has('away_job') ? '展览视频' : processed.has('local_job') ? '展馆音频' : '';
  return {
    name: PROFILE.name, gender: PROFILE.gender, birthYear: PROFILE.birthYear,
    country: PROFILE.country, birthplace: PROFILE.birthplace, city: f.city,
    items: [
      { label: '性别', value: PROFILE.gender },
      { label: '出生', value: PROFILE.country + ' · ' + PROFILE.birthplace + ' · ' + PROFILE.birthYear + '年' },
      { label: '居住地', value: f.city },
      { label: '出身家庭', value: '家电维修铺' },
      { label: '求学', value: study },
      ...(occupation ? [{ label: '工作经历', value: occupation }] : []),
    ],
    footer: 'CHN · 2005 · CHEN ZHIXIA',
  };
}

/** All numerical rows retain the game's real scale and units. */
function statusFor(state, view) {
  if (!view.active) return [];
  const y = state.facts.young;
  return [
    { id: 'progress', label: '片子准备', raw: y.progress, max: 18, unit: '', value: y.progress + ' / 18', detail: view.items[0].value },
    { id: 'skill', label: '剪辑熟练', raw: y.skill, max: 12, unit: '', value: y.skill + ' / 12', detail: view.items[0].detail },
    { id: 'energy', label: '精力', raw: y.energy, max: 6, unit: '', value: y.energy + ' / 6', detail: y.energy <= 1 ? '需要缓一缓' : y.energy <= 3 ? '有些累' : '精力尚可' },
    { id: 'connection', label: '近期来往', raw: y.connection, max: 6, unit: '', value: y.connection + ' / 6', detail: view.items[3].value },
  ];
}

export function getReplicaView(state) {
  const view = getLifeView(state);
  const currentScene = getCurrentScene(state);
  const identity = identityFor(state);
  const stage = state.status === 'unborn' ? '尚未开始' : state.status === 'ended' ? '这一生已结束' : view.active ? '展览视频 · ' + state.facts.city : state.age < 18 ? '在澄江长大' : state.facts.college && !state.processed.some(id => id === 'away_job' || id === 'local_job') ? '数字媒体专业 · ' + state.facts.city : '在' + state.facts.city + '生活';
  return {
    identity, stage, headline: view.headline || currentScene?.title || '',
    statusItems: statusFor(state, view),
    money: view.active ? { label: '备用金', raw: state.facts.young.reserve * 1000, unit: '元', value: yuan(state.facts.young.reserve * 1000), detail: '扣除日常固定开销后，可动用的备用钱。' } : null,
    people: copy(getPeople(state.facts)), active: view.active, needsPlan: view.needsPlan,
    focus: view.focus || null, focusOptions: copy(view.focusOptions || []),
    arrangements: copy(view.arrangements || []), plannedText: view.plannedText || '',
    commitmentText: view.commitmentText || '', notice: view.notice || '',
    yearTime: view.active ? copy(view.yearTime) : null,
    summary: view.summary || '', currentScene,
  };
}

/** Full authored snapshots remain intact; pending decisions have their own layer. */
export function logDisplayEntries(state) {
  const entries = state.log.filter(entry => entry.kind !== 'decision' && entry.kind !== 'end').map(copy).reverse();
  const view = getLifeView(state);
  if (!view.active && state.status === 'living' && state.age === 31 && view.summary) {
    entries.unshift({ id: 'young-phase-summary', age: 31, kind: 'life', title: '这几年的安排，留下了什么', text: view.summary, displayOnly: true });
  }
  return entries;
}
