const wrap = (body, label, cls = 'room-art', box = '0 0 320 184') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${cls}" role="img" aria-label="${label}" shape-rendering="crispEdges">${body}</svg>`;

const seatPositions = {
  rows: [[100, 114], [133, 114], [166, 114], [199, 114], [100, 142], [133, 142], [166, 142], [199, 142]],
  circle: [[115, 101], [153, 96], [191, 101], [96, 125], [210, 125], [115, 150], [153, 155], [191, 150]],
  arc: [[100, 109], [135, 102], [171, 102], [206, 109], [91, 140], [128, 133], [167, 133], [205, 140]],
};
const names = {you:'你',xiaoman:'小满',ahe:'阿禾',linye:'林野'};
const colors = {you:'#91b89d',xiaoman:'#86a49c',ahe:'#c4a36c',linye:'#a39488'};

function person(id, x, y) {
  return `<g><title>${names[id]}</title><path fill="#443a35" d="M${x-5} ${y-17}h10v4h2v10h-14v-10h2z"/><path fill="#d2b397" d="M${x-4} ${y-12}h8v8h-8z"/><path fill="${colors[id]}" d="M${x-7} ${y-3}h14v12h-14z"/><path fill="#263a47" d="M${x-5} ${y+9}h4v4h-4zM${x+1} ${y+9}h4v4h-4z"/></g>`;
}

export function layoutThumb(layout) {
  const seats = seatPositions[layout] || seatPositions.rows;
  return wrap(`<path fill="#bac5b6" d="M29 4h28v3H29z"/>${seats.map(([x,y])=>`<rect x="${(x-70)/2.5}" y="${(y-77)/2.5+7}" width="6" height="4" fill="#78918c"/>`).join('')}`, {rows:'座位朝向银幕',circle:'椅子围成一圈',arc:'弧形座位，侧边留通道'}[layout], 'layout-thumb', '0 0 80 45');
}

export function roomArt(state, outcome) {
  const stage = state.stage;
  const between = stage.startsWith('prep');
  const second = ['film','seats','door','ending'].includes(stage);
  const ending = stage === 'ending';
  const layout = state.plan.seats || 'rows';
  const film = state.plan.film;
  const dark = ['first_door','door'].includes(stage) && film !== 'shorts';
  const stowed = second && !state.plan.seats;
  const chairs = stowed ? [[79,108],[79,120],[79,132],[79,144],[224,108],[224,120],[224,132],[224,144]] : seatPositions[layout];
  const screen = dark ? '#bcc5ae' : '#7b8e86';
  let people = [];
  if (stage === 'arrival') people = [['xiaoman',201,88],['you',247,137],['ahe',281,117]];
  else if (stage === 'first_door') people = [['xiaoman',245,131],['you',202,142],['ahe',116,113],['linye',279,129]];
  else if (stage === 'first_close') people = [['xiaoman',133,144],['you',169,143],['ahe',104,112],['linye',201,112]];
  else if (between) {
    const currentPrep = state.prep.at(-1);
    people = [['you',160,139], [currentPrep === 'ahe' ? 'ahe' : currentPrep === 'linye' ? 'linye' : 'xiaoman',201,139]];
  } else if (ending) {
    const result = outcome.room;
    const used = {seated:0, talking:0, door:0};
    for (const id of ['you','xiaoman','ahe','linye']) {
      const status = result[id] || (id === 'you' ? 'seated' : null);
      if (!status || status === 'left') continue;
      let pos;
      if (status === 'door') pos = [254 + used.door++ * 19,132];
      else if (status === 'talking') pos = [[130,128],[171,128],[152,151],[194,151]][used.talking++];
      else pos = chairs[[1,2,0,3][used.seated++]];
      people.push([id,...pos]);
    }
  } else if (stage === 'door') people = [['you',...chairs[2]],['ahe',...chairs[0]],['xiaoman',246,130],['linye',278,130]];
  else people = [['xiaoman',207,90],['ahe',95,132],['you',161,145]];
  const sunset = between ? '#9d8570' : '#616d79';
  const label = between ? '课间的校园：为下一个周五留出一点时间' : `同一间203教室。${stowed?'椅子还靠在墙边':layout==='rows'?'椅子朝向银幕':layout==='circle'?'椅子围成一圈':'椅子排成弧形，门边留出通道'}。${ending ? '这一晚的大家各自留在了不同的位置' : stage==='door'||stage==='first_door'?'林野来到门口，小满走去迎接':'灯还亮着'}`;
  return wrap(`
    <path fill="${dark?'#18252c':'#22333b'}" d="M0 0h320v184H0z"/>
    <path fill="${dark?'#2b3b41':'#3c4d51'}" d="M12 13h296v143H12z"/>
    <path fill="#344047" d="M0 153h320v31H0z"/>
    <path fill="#414d50" d="M0 172h320v2H0zM65 155h2v29h-2zM224 155h2v29h-2z"/>
    <path fill="#172b37" d="M24 30h38v69H24z"/><path fill="${sunset}" d="M28 34h30v61H28z"/>
    <path fill="#2c4249" d="M28 80h8v15h-8zM39 69h10v26H39zM51 78h7v17h-7z"/>
    <path fill="#596563" d="M41 32h3v64h-3zM27 63h32v3H27z"/>
    <path fill="#1b2a31" d="M256 42h41v110h-41z"/><path fill="#5c655d" d="M259 46h3v104h-3z"/>
    <path fill="#899581" d="M269 32h16v6h-16z"/>
    <path fill="#a79c7f" d="M103 19h94v4h-94z"/><path fill="${screen}" d="M104 26h92v50h-92z"/>
    ${dark ? '<path fill="#738b83" d="M108 57h21v15h-21zM129 47h23v25h-23zM152 60h40v12h-40z"/><path fill="#d9c89b" d="M169 35h10v10h-10z"/>' : '<path fill="#697e78" d="M126 48h48v2h-48zM138 56h24v2h-24z"/>'}
    <path fill="#a6a589" d="M222 22h12v13h-12z"/><path fill="#38484b" d="M227 25h2v6h-2zM228 29h4v2h-4z"/>
    <path fill="#586564" d="M148 82h23v8h-23z"/><path fill="#c0bd94" d="M151 84h5v3h-5z"/>
    ${chairs.map(([x,y]) => `<path fill="#536d70" d="M${x-9} ${y+2}h18v6h-18z"/><path fill="#728580" d="M${x-8} ${y-7}h16v8h-16z"/><path fill="#273b44" d="M${x-7} ${y+8}h3v7h-3zM${x+4} ${y+8}h3v7h-3z"/>`).join('')}
    ${people.map(p=>person(...p)).join('')}
    <path fill="#829288" d="M21 132h38v3H21z"/><path fill="#536960" d="M24 135h3v20h-3zM53 135h3v20h-3z"/>
    <path fill="#c4b493" d="M29 125h5v7h-5zM42 125h5v7h-5z"/>
    <path fill="#cab98d" d="M77 9h47v3H77zM190 9h47v3h-47z"/>
    ${between ? '<path fill="#2b3b3c" opacity=".55" d="M0 0h320v184H0z"/><path fill="#bcb99e" d="M105 68h112v53H105z"/><path fill="#d3cbb1" d="M110 72h102v44H110z"/><path fill="#6d7d70" d="M117 81h33v3h-33zM117 91h86v2h-86zM117 99h74v2h-74zM117 107h49v2h-49z"/>' : ''}
    <text x="16" y="174" fill="#b6bea9" font-size="7" font-family="monospace">${between ? 'BETWEEN FRIDAYS' : `203 / ${second?'OCT.18':'OCT.11'}`}</text>`, label);
}
