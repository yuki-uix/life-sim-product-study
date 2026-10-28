const svg=(label,body,box='0 0 240 108')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${label}" shape-rendering="crispEdges">${body}</svg>`;

export function lifeScene(age,city='澄江'){
  const childhood=age<18, old=age>=68, home=city==='澄江';
  const sky=old?'#64787a':childhood?'#708a8c':'#4b6477';
  let body=`<path fill="${sky}" d="M0 0h240v108H0z"/><path fill="#aebbb1" d="M18 13h19v3H18zM26 10h24v3H26zM183 18h26v3h-26z"/><path fill="#344c50" d="M0 80h240v28H0z"/><path fill="#5e7370" d="M0 96h240v2H0z"/>`;
  if(childhood){
    body+='<path fill="#a09a80" d="M24 22h112v64H24z"/><path fill="#c4b78e" d="M20 20h120v7H20z"/><path fill="#56716c" d="M31 31h98v13H31z"/><path fill="#d4d4b7" d="M43 35h13v3H43zM69 35h17v3H69zM100 35h15v3h-15z"/><path fill="#233940" d="M34 49h45v37H34zM87 49h38v37H87z"/><path fill="#b3ac88" d="M38 70h37v4H38zM42 74h3v12h-3zM68 74h3v12h-3z"/><path fill="#758e85" d="M43 54h24v14H43z"/><path fill="#d0c39e" d="M47 57h15v8H47z"/><path fill="#587271" d="M91 58h25v23H91z"/><path fill="#b7bca4" d="M95 61h17v15H95z"/><path fill="#8b9e88" d="M153 39h39v3h-39zM161 35h28v4h-28zM169 30h14v5h-14z"/><path fill="#445b54" d="M173 42h4v44h-4z"/><path fill="#7e8e76" d="M155 27h39v8h-39z"/>';
  }else if(home){
    body+='<path fill="#748b84" d="M0 65h240v15H0z"/><path fill="#adc0ac" d="M6 72h37v2H6zM92 68h29v2H92zM172 74h38v2h-38z"/><path fill="#b6aa89" d="M26 39h65v48H26z"/><path fill="#6b7669" d="M20 36h77v6H20z"/><path fill="#d0c99f" d="M35 49h17v19H35zM63 49h17v19H63z"/><path fill="#5c746e" d="M44 74h20v13H44z"/><path fill="#a7a48a" d="M114 81h100v4H114zM126 85h4v10h-4zM196 85h4v10h-4z"/><path fill="#516f64" d="M160 33h5v48h-5z"/><path fill="#8ba082" d="M147 19h32v8h-32zM140 27h46v15h-46zM147 42h32v7h-32z"/>';
  }else{
    body+='<path fill="#758a8b" d="M20 27h53v59H20zM83 12h57v74H83zM153 33h61v53h-61z"/><path fill="#b9c4af" d="M29 36h10v11H29zM50 36h10v11H50zM29 59h10v11H29zM50 59h10v11H50zM93 23h11v11H93zM118 23h11v11h-11zM93 45h11v11H93zM118 45h11v11h-11zM93 66h11v11H93zM118 66h11v11h-11zM165 44h10v12h-10zM190 44h10v12h-10zM165 66h10v12h-10zM190 66h10v12h-10z"/><path fill="#b0a483" d="M7 87h226v4H7z"/><path fill="#607c6b" d="M43 79h6v16h-6zM178 77h6v18h-6z"/><path fill="#94a685" d="M35 70h22v12H35zM169 68h24v12h-24z"/>';
  }
  body+='<path fill="#c8b78e" d="M218 58h3v30h-3zM213 53h13v7h-13z"/>';
  return svg(childhood?'澄江老街的家电维修铺':home?'沿江小城的河堤、树和房子':`${city}的楼房与亮起的窗户`,body);
}

export function personArt(id='you',heroAge=18){
  const styles={you:['#83a995','#28383e'],zhouzhou:['#bdad77','#4c4138'],songwen:['#9faeb1','#3a3633'],xuyang:['#a391a2','#36383b'],xiaoyin:['#7faeaa','#354237'],mother:['#b3a68a','#50463c'],father:['#8f9b94','#4b4038']};
  const [shirt,hair]=styles[id]||styles.you;
  const age=id==='xiaoyin'?Math.max(20,heroAge-32):['mother','father'].includes(id)?heroAge+27:heroAge;
  const grey=age>=65?'#c2c2af':hair;
  const label={you:'陈知夏',zhouzhou:'周舟',songwen:'宋闻',xuyang:'许阳',xiaoyin:'小尹',mother:'母亲',father:'父亲'}[id]||id;
  return svg(`${label}的像素头像`,`<path fill="#2a3c43" d="M0 0h32v32H0z"/><path fill="${grey}" d="M9 4h14v4h2v14H7V8h2z"/><path fill="#d1b396" d="M10 10h12v12H10z"/><path fill="${grey}" d="M9 8h11v5H9z"/><path fill="#344047" d="M12 15h2v2h-2zM19 15h2v2h-2z"/><path fill="${shirt}" d="M8 24h16v8H8zM12 22h8v3h-8z"/><path fill="#c9b190" d="M14 22h4v4h-4z"/>${age>=55?'<path fill="#64736f" d="M10 14h6v5h-6zM18 14h6v5h-6zM15 15h4v1h-4z"/><path fill="#d1b396" d="M11 15h4v3h-4zM19 15h4v3h-4z"/>':''}`,'0 0 32 32');
}
