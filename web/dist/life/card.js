const WIDTH=960;
const FONT='system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
function lines(ctx,text,width){
  const result=[];let row='';
  for(const c of String(text||'')){
    if(c==='\n'){result.push(row);row='';continue;}
    if(row&&ctx.measureText(row+c).width>width){result.push(row);row=c;}else row+=c;
  }
  if(row)result.push(row);
  return result;
}
function write(ctx,text,x,y,width,lineHeight){
  for(const row of lines(ctx,text,width)){ctx.fillText(row,x,y);y+=lineHeight;}
  return y;
}

export async function drawCard(canvas,{profile,portrait,memories,caption}){
  try{await document.fonts.load('40px CampusPixel');}catch{}
  canvas.width=WIDTH;canvas.height=1260;
  const c=canvas.getContext('2d');
  c.fillStyle='#ece7d5';c.fillRect(0,0,WIDTH,canvas.height);
  c.fillStyle='#d1ccb8';c.fillRect(24,24,WIDTH-48,canvas.height-48);
  c.fillStyle='#f0ecdd';c.fillRect(27,27,WIDTH-54,canvas.height-54);
  c.textBaseline='top';
  c.fillStyle='#607260';c.font=`22px ${FONT}`;c.fillText('这一生  /  人生纪录',72,65);
  c.font='40px CampusPixel, monospace';c.fillStyle='#34463f';
  let y=write(c,portrait.title,72,115,816,51);
  y+=19;c.font=`40px ${FONT}`;c.fillText(profile.name,72,y);y+=55;
  c.font=`23px ${FONT}`;c.fillStyle='#677565';
  c.fillText(`${profile.birthYear}—${profile.birthYear+profile.endAge}  ·  ${profile.endAge}岁  ·  ${profile.country}`,72,y);
  y+=56;c.fillStyle='#9ba88b';c.fillRect(72,y,816,2);y+=30;
  // A quiet, native pixel motif: a river and windows, no external image or canvas taint.
  c.fillStyle='#d5dfcf';c.fillRect(72,y,816,100);
  c.fillStyle='#859b90';c.fillRect(72,y+70,816,30);
  c.fillStyle='#a3b39c';c.fillRect(100,y+26,125,44);c.fillRect(246,y+14,78,56);c.fillRect(627,y+30,130,40);
  c.fillStyle='#ece1b4';for(const x of [114,148,182,260,294,641,675,709])c.fillRect(x,y+37,12,15);
  c.fillStyle='#f1eedc';c.fillRect(377,y+80,117,3);c.fillRect(547,y+89,84,3);
  y+=138;
  for(const memory of memories){
    c.fillStyle='#61775e';c.font=`21px ${FONT}`;c.fillText(`${memory.age}岁`,72,y);y+=34;
    c.fillStyle='#34463f';c.font=`32px ${FONT}`;
    const body=memory.text.replace(new RegExp(`^${memory.age}岁[，、：:\\s]*`),'');
    y=write(c,body,72,y,816,46)+29;
  }
  if(caption.trim()){
    y+=9;c.fillStyle='#b1baa2';c.fillRect(72,y,3,Math.max(48,lines(c,caption,776).length*37));
    c.fillStyle='#596c56';c.font=`25px ${FONT}`;
    y=write(c,caption.trim(),94,y,790,38)+28;
  }
  const footerY=Math.max(y+20,1160);
  if(footerY>canvas.height-70){
    // Extend rather than clip a long selected record or caption.
    const image=c.getImageData(0,0,WIDTH,canvas.height),oldHeight=canvas.height;
    canvas.height=footerY+86;
    c.fillStyle='#ece7d5';c.fillRect(0,0,WIDTH,canvas.height);
    c.fillStyle='#d1ccb8';c.fillRect(24,24,WIDTH-48,canvas.height-48);
    c.fillStyle='#f0ecdd';c.fillRect(27,27,WIDTH-54,canvas.height-54);
    c.putImageData(image,0,0);
    c.fillStyle='#f0ecdd';c.fillRect(27,oldHeight-40,WIDTH-54,canvas.height-oldHeight+13);
    c.fillStyle='#d1ccb8';c.fillRect(24,canvas.height-27,WIDTH-48,3);
  }
  c.fillStyle='#7c8875';c.font=`18px ${FONT}`;
  c.fillText('虚构人生 · 选自本局实际经历',72,footerY);
  c.fillText('中国的一生',72,footerY+30);
  return canvas;
}

export function saveCard(canvas,filename='陈知夏-这一生.png'){
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    if(!blob){reject(new Error('Image generation failed'));return;}
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);resolve(blob);
  },'image/png'));
}
