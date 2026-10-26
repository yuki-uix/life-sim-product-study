/** Small native pixel illustrations. No external assets, DOM or shared SVG IDs. */
const wrap = (viewBox, label, body, className = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${className}" role="img" aria-label="${label}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

export function campusScene(location = 'gate', season = 'autumn') {
  const spring = season === 'spring';
  const foliage = spring ? '#779b75' : '#b29162';
  const light = spring ? '#ddd7a0' : '#dbb483';
  const grass = spring ? '#486c56' : '#5b6850';
  const sky = '<path fill="#17283a" d="M0 0h160v60H0z"/><path fill="#354a5a" d="M0 39h160v21H0z"/>';
  // Each scene owns its coordinates; no defs, filters or IDs are reused across cards.
  const trees = `<path fill="#7a725b" d="M14 32h4v22h-4zM143 30h4v24h-4z"/><path fill="${foliage}" d="M8 14h16v4h4v16h-4v5H8v-5H4V18h4zM137 11h16v5h4v16h-4v5h-16v-5h-4V16h4z"/>`;
  let body;
  let label;
  switch (location) {
    case 'dorm':
      label = '宿舍楼亮着暖灯，窗边挂着衣服';
      body = `<path fill="#4d6577" d="M33 8h94v44H33z"/><path fill="#647b87" d="M29 6h102v5H29z"/><path fill="${light}" d="M40 16h12v8H40zM62 16h12v8H62zM84 16h12v8H84zM106 16h12v8h-12zM40 33h12v8H40zM84 33h12v8H84zM106 33h12v8h-12z"/><path fill="#1a2a36" d="M62 33h12v19H62z"/><path fill="#9aafac" d="M37 27h85v2H37z"/><path fill="#8bd0a5" d="M86 25h6v8h-6z"/><path fill="#d6bc78" d="M102 25h7v7h-7z"/>${trees}`;
      break;
    case 'lake':
      label = spring ? '春天的湖边，小桥旁长出新叶' : '校园湖边，晚霞映在水面';
      body = `<path fill="#496d78" d="M0 36h160v19H0z"/><path fill="#719498" d="M4 40h25v2H4zM83 44h24v2H83zM121 49h26v2h-26zM39 50h17v2H39z"/><path fill="#b5a17c" d="M48 32h67v5H48zM52 37h5v16h-5zM106 37h5v16h-5z"/><path fill="#d1ba90" d="M51 27h61v3H51zM53 27v9h3v-9zM108 27v9h3v-9z"/><path fill="${light}" d="M116 7h12v12h-12z"/>${trees}`;
      break;
    case 'club':
      label = '社团活动室门口，桌上摆着海报和小旗';
      body = `<path fill="#526c7a" d="M27 15h106v37H27z"/><path fill="#7c8e91" d="M23 12h114v5H23z"/><path fill="#1a2b38" d="M65 24h22v28H65z"/><path fill="#d2c6a1" d="M34 23h19v18H34zM98 23h23v18H98z"/><path fill="#6e8e7c" d="M37 27h13v3H37zM37 34h9v3h-9z"/><path fill="#a88e68" d="M102 27h15v3h-15zM102 34h11v3h-11z"/><path fill="#a18d70" d="M22 43h38v4H22zM25 47h3v8h-3zM53 47h3v8h-3z"/><path fill="#8bd0a5" d="M32 35h3v8h-3zM35 35h12v5H35z"/>${trees}`;
      break;
    case 'hall':
      label = '校园小放映室，几排座位对着亮起的银幕';
      body = `<path fill="#273b4e" d="M15 7h130v47H15z"/><path fill="#b9c6b5" d="M39 13h83v25H39z"/><path fill="#638487" d="M43 17h75v17H43z"/><path fill="#d6bc78" d="M89 20h9v9h-9z"/><path fill="#465f64" d="M47 27h16v7H47zM63 24h13v10H63zM76 29h10v5H76z"/><path fill="#5a7782" d="M27 43h18v5H27zM52 43h18v5H52zM78 43h18v5H78zM104 43h18v5h-18z"/><path fill="#31495b" d="M23 51h24v6H23zM51 51h24v6H51zM79 51h24v6H79zM107 51h24v6h-24z"/><path fill="${light}" d="M20 16h4v12h-4zM136 16h4v12h-4z"/>`;
      break;
    default:
      label = spring ? '南棠大学校门，树木发了新芽' : '南棠大学校门，秋天的树和路灯';
      body = `<path fill="#536d7d" d="M48 13h65v38H48z"/><path fill="#728692" d="M43 10h75v5H43z"/><path fill="${light}" d="M54 20h8v8h-8zM69 20h8v8h-8zM84 20h8v8h-8zM99 20h8v8h-8z"/><path fill="#1c3040" d="M72 35h18v17H72z"/><path fill="#91a3a1" d="M34 35h94v5H34zM34 40h5v15h-5zM123 40h5v15h-5z"/><path fill="#bac3ad" d="M57 35h47v5H57z"/><path fill="#516e61" d="M67 52h28v8H67z"/>${trees}`;
      break;
  }
  return wrap('0 0 160 60', label, `${sky}${body}<path fill="${grass}" d="M0 56h160v4H0z"/>`, 'campus-scene');
}

export function avatar(personId = 'you') {
  const people = {
    you: { name: '你', hair: '#233243', shirt: '#87b69c', skin: '#d4b292', detail: '' },
    ahe: { name: '阿禾', hair: '#45362f', shirt: '#c4a36c', skin: '#d8b997', detail: '<path fill="#e1ce9b" d="M12 23h8v3h-8z"/>' },
    xiaoman: { name: '小满', hair: '#4e3c35', shirt: '#7fa499', skin: '#d7b598', detail: '<path fill="#b7cfc1" d="M10 26h12v3H10z"/><path fill="#c4b57d" d="M20 8h4v3h-4z"/>' },
    linye: { name: '林野', hair: '#243443', shirt: '#9f8d82', skin: '#d0ad8d', detail: '<path fill="#4c5359" d="M10 14h5v4h-5zM18 14h5v4h-5zM15 15h3v1h-3z"/><path fill="#d0ad8d" d="M11 15h3v2h-3zM19 15h3v2h-3z"/>' },
  };
  const person = people[personId] || people.you;
  const body = `<path fill="#2d4051" d="M0 0h32v32H0z"/><path fill="${person.hair}" d="M10 4h12v3h3v14H7V7h3z"/><path fill="${person.skin}" d="M10 10h12v11H10z"/><path fill="${person.hair}" d="M10 9h9v3h-9zM12 15h2v2h-2zM19 15h2v2h-2z"/><path fill="${person.shirt}" d="M8 24h16v8H8zM11 22h10v4H11z"/><path fill="${person.skin}" d="M14 21h4v4h-4z"/>${person.detail}`;
  return wrap('0 0 32 32', `${person.name}的像素头像`, body, 'campus-avatar');
}

export function memoryArt(type = 'leaf') {
  const paper = '<path fill="#cabb96" d="M7 4h50v40H7z"/><path fill="#e0d4b5" d="M11 8h42v32H11z"/>';
  const icons = {
    camera: '<path fill="#3e5968" d="M17 17h31v18H17zM22 12h11v5H22z"/><path fill="#8eaaa7" d="M27 20h13v12H27z"/><path fill="#344954" d="M30 23h7v6h-7z"/><path fill="#d6bc78" d="M42 20h3v3h-3z"/>',
    ticket: '<path fill="#a98762" d="M15 14h35v21H15z"/><path fill="#e0d4b5" d="M14 22h4v5h-4zM47 22h4v5h-4z"/><path fill="#5c725f" d="M22 18h3v13h-3zM29 18h15v3H29zM29 25h11v3H29z"/>',
    leaf: '<path fill="#6c8a64" d="M20 13h21v4h5v12h-5v5H24v-5h-6V17h2z"/><path fill="#a89c6a" d="M31 19h3v20h-3zM24 21h8v3h-8zM33 25h8v3h-8z"/>',
    map: '<path fill="#718d80" d="M15 13h11v23H15zM38 13h11v23H38z"/><path fill="#d0bd8e" d="M26 13h12v23H26z"/><path fill="#587281" d="M19 28h9v-9h13v3H31v9H19z"/><path fill="#b8856b" d="M38 17h6v6h-6z"/>',
    screen: '<path fill="#455e6d" d="M16 12h34v23H16z"/><path fill="#9bb5ae" d="M20 16h26v15H20z"/><path fill="#5b7a7e" d="M24 25h8v6h-8zM32 21h7v10h-7z"/><path fill="#d3bc7b" d="M38 18h5v5h-5z"/><path fill="#736c5c" d="M30 35h4v4h-4z"/>',
    song: '<path fill="#52736b" d="M26 13h19v5H26zM26 17h4v15h-4zM41 16h4v12h-4zM20 29h10v7H20zM35 25h10v7H35z"/>',
    photo: '<path fill="#76959b" d="M15 12h34v23H15z"/><path fill="#d6bd83" d="M36 16h7v7h-7z"/><path fill="#527366" d="M18 28h7v-5h8v5h7v5H18z"/><path fill="#9bb3a6" d="M20 36h24v2H20z"/>',
    flower: '<path fill="#64896c" d="M31 23h3v16h-3zM24 31h8v4h-8zM34 27h7v4h-7z"/><path fill="#b78c92" d="M27 12h11v5h6v9h-7v5H27v-5h-6v-9h6z"/><path fill="#d6bd83" d="M29 19h7v6h-7z"/>',
  };
  const labels = { camera: '借过的相机', ticket: '留在本子里的票根', leaf: '一片校园的树叶', map: '记住的校园小路', screen: '一起看过的银幕', song: '记住的一首歌', photo: '留住的一张照片', flower: '春天的小花' };
  return wrap('0 0 64 48', labels[type] || '大学生活的一张小纪念', paper + (icons[type] || icons.leaf), 'memory-illustration');
}
