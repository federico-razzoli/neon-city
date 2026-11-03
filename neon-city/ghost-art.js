const BX=194,BY=42,T=9,W=252,H=279,INK='#080c1b',CREAM='#f4efd9',MINT='#86f4bd';
export function drawGhost(c,g){
  const rect=(x,y,w,h,colour)=>{c.fillStyle=colour;c.fillRect(x,y,w,h);};
  const text=(s,x,y,size=11,colour=CREAM,align='left')=>{c.fillStyle=colour;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y);};
  const circle=(x,y,r,colour)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=colour;c.fill();};
  const line=(x,y,a,b,colour,width=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.strokeStyle=colour;c.lineWidth=width;c.stroke();};
  const panel=(x,y,w,h)=>{rect(x,y,w,h,'#11182a');rect(x,y,2,h,'#35415d');};
  const skull=(x,y,scale=1,colour=MINT)=>{
    const sprite=['..ggggg..','.ggggggg.','ggggggggg','gg..g..gg','gg..g..gg','.ggggggg.','..ggggg..','..g.g.g..'];
    sprite.forEach((row,j)=>[...row].forEach((cell,i)=>{if(cell==='g')rect(x+(i-4.5)*scale,y+(j-4)*scale,scale,scale,colour);}));
  };
  const ghost=(x,y,size,dir=1,dying=false)=>{
    c.save();c.translate(x,y);
    if(g.power>0&&!dying){circle(0,0,size*1.65,'#5afd9c19');c.beginPath();c.arc(0,0,size*1.4,0,Math.PI*2);c.strokeStyle=MINT;c.lineWidth=.8;c.stroke();}
    const r=size*(dying?Math.max(.03,g.timer/1.5):1),wave=Math.sin(g.clock*13)*r*.15;
    c.fillStyle='#ffe46b';c.beginPath();c.moveTo(-r,r*.8);c.lineTo(-r,0);c.arc(0,0,r,Math.PI,0);c.lineTo(r,r*.8);
    c.lineTo(r*.6,r*.55+wave);c.lineTo(r*.2,r*.85);c.lineTo(-r*.2,r*.55-wave);c.lineTo(-r*.6,r*.85);c.closePath();c.fill();
    if(!dying){const d=[{x:0,y:-1},{x:-1,y:0},{x:0,y:1},{x:1,y:0}][dir];
      for(const side of [-1,1]){circle(side*r*.39,-r*.1,r*.32,'#fff8df');circle(side*r*.39+d.x*r*.13,-r*.1+d.y*r*.15,r*.16,'#303251');}}
    c.restore();
  };
  const pac=(x,y,r,colour,dir=1,frightened=false,eyes=false)=>{
    const d=[-Math.PI/2,Math.PI,Math.PI/2,0][dir];
    if(eyes){for(const side of [-1,1]){circle(x+side*r*.4,y,r*.38,'#e4f2fc');circle(x+side*r*.4+Math.cos(d)*r*.13,y+Math.sin(d)*r*.13,r*.18,'#77b5ff');}return;}
    const mouth=(.045+Math.abs(Math.sin(g.clock*12))*.20)*Math.PI;
    c.save();c.translate(x,y);c.rotate(d);c.fillStyle=colour;c.beginPath();c.moveTo(0,0);c.arc(0,0,r,mouth,Math.PI*2-mouth);c.closePath();c.fill();
    if(!frightened)circle(-r*.1,-r*.48,r*.14,'#182036');
    c.restore();
    if(frightened){circle(x-r*.35,y-r*.24,r*.15,'#f2edd8');circle(x+r*.2,y-r*.24,r*.15,'#f2edd8');
      line(x-r*.4,y+r*.35,x-r*.1,y+r*.15,'#f2edd8',.8);line(x-r*.1,y+r*.15,x+r*.15,y+r*.35,'#f2edd8',.8);}
  };
  const boardMessage=(title,subtitle)=>{rect(BX+12,BY+H*.54,W-24,44,'#080c1bf5');text(title,320,BY+H*.54+18,16,'#ffe46b','center');text(subtitle,320,BY+H*.54+34,8,'#a2b2ca','center');};
  c.save();rect(0,0,640,360,INK);
  // Fine arena grid, kept outside the high-contrast maze.
  for(let x=8;x<640;x+=20)line(x,0,x,328,'#12192b');
  for(let y=0;y<328;y+=20)line(0,y,640,y,'#12192b');
  rect(BX-9,BY-9,W+18,H+18,'#10172c');rect(BX-4,BY-4,W+8,H+8,'#344264');rect(BX-2,BY-2,W+4,H+4,INK);
  const wallColour=g.phase==='clear'&&Math.floor(g.clock*6)%2?'#d3fbec':['#556ff0','#8c6ae7','#459ebd'][(g.level-1)%3];
  // Filled wall masses with continuous corridor outlines, rather than a tiled grid.
  for(let y=0;y<31;y++)for(let x=0;x<28;x++){
    if(g.cell(x,y)!=='#')continue;
    const px=BX+x*T,py=BY+y*T;rect(px,py,T,T,'#101a3c');
    if(g.cell(x-1,y)!=='#')line(px+.8,py,px+.8,py+T,wallColour,.9);
    if(g.cell(x+1,y)!=='#')line(px+T-.8,py,px+T-.8,py+T,wallColour,.9);
    if(g.cell(x,y-1)!=='#')line(px,py+.8,px+T,py+.8,wallColour,.9);
    if(g.cell(x,y+1)!=='#')line(px,py+T-.8,px+T,py+T-.8,wallColour,.9);
  }
  for(const id of g.dots){const x=id%28,y=Math.floor(id/28);rect(BX+(x+.5)*T-1,BY+(y+.5)*T-1,2,2,'#e8c99d');}
  for(const id of g.skulls){const x=id%28,y=Math.floor(id/28);skull(BX+(x+.5)*T,BY+(y+.5)*T,1,Math.sin(g.clock*5)>-.5?'#87f9a6':'#409c75');}
  // The cage gate is solid to the player, passable only to departing/returning pursuers.
  line(BX+13*T,BY+12.5*T,BX+15*T,BY+12.5*T,'#fa9dcb',2);
  text('CAGE',BX+14*T,BY+16*T-1,5,'#827391','center');
  for(const e of g.enemies){
    const p=g.position(e),x=BX+(p.x+.5)*T,y=BY+(p.y+.5)*T;
    const inCage=['caged','reviving','waiting'].includes(e.state);
    let colour=e.frightened&&g.power>0?(g.power<2&&Math.floor(g.clock*7)%2?'#e7eddc':'#647cfa'):e.colour;
    pac(x,y+(inCage?Math.sin(g.clock*4+e.index)*1.2:0),5.3,colour,e.dir,e.frightened,e.state==='eyes');
  }
  const p=g.position(g.player),px=BX+(p.x+.5)*T,py=BY+(p.y+.5)*T;
  if(g.phase!=='caught'||g.timer>.15)ghost(px,py,5.3,g.player.dir,g.phase==='caught');
  if(g.phase==='caught')for(let i=0;i<8;i++){const a=i*Math.PI/4,r=(1.5-g.timer)*15;circle(px+Math.cos(a)*r,py+Math.sin(a)*r,Math.max(.4,g.timer),'#ffe46b');}
  for(const pop of g.popups)text(pop.text,BX+(pop.x+.5)*T,BY+(pop.y+.5)*T-(1.2-pop.time)*9,9,'#b1ffbd','center');
  // Tunnels: both sides wrap to the same corridor.
  text('‹',BX-6,BY+14.5*T+3,11,'#7ad5d1','center');text('›',BX+W+6,BY+14.5*T+3,11,'#7ad5d1','center');
  text('GHOST',22,40,31,'#ffe46b');text('THE TABLES HAVE TURNED',24,55,8,'#8b9bb9');
  panel(22,74,147,47);text('SCORE',33,89,8,'#8b9bb9');text(g.score.toString().padStart(6,'0'),33,111,21,CREAM);
  panel(22,133,147,53);text(`LEVEL ${g.level.toString().padStart(2,'0')}`,33,151,12,MINT);text(g.level===1?'A GENTLE FIRST HAUNT':g.level<5?'THE HUNT IS QUICKENING':'NO REST FOR THE HAUNTED',33,170,7,'#9cacc2');
  text('LIVES',24,208,9,'#8b9bb9');for(let i=0;i<Math.min(g.lives,6);i++)ghost(32+i*20,226,6,3);if(g.lives>6)text(`+${g.lives-6}`,148,230,9);
  text('SOULS TO COLLECT',24,255,8,'#8b9bb9');text(`${g.remaining}`,24,278,22,CREAM);
  rect(24,288,140,3,'#29334e');rect(24,288,140*(1-g.remaining/g.total),3,MINT);
  text('10,000 = EXTRA LIFE',24,311,8,'#71849d');
  text('THE HUNTERS',475,42,12,'#a6b5cf');
  const names=['RED / SHADOW','PINK / AMBUSH','CYAN / VECTOR','ORANGE / SHY'];
  const rules=['Targets your tile','Four tiles ahead','Uses you + red','Retreats when close'];
  g.enemies.forEach((e,i)=>{
    const y=68+i*45;pac(481,y+3,7,e.colour,3);text(names[i],495,y,9,e.colour);text(rules[i],475,y+16,8,'#9cacc2');
    text(e.state==='caged'?'IN THE CAGE':e.state==='eyes'?'RETURNING':e.state==='reviving'||e.state==='waiting'?'RECOVERING':e.frightened?'VULNERABLE':e.state==='exiting'?'RELEASED':g.mode==='scatter'?'SCATTER':'CHASING',475,y+28,6,e.frightened?MINT:'#657992');
  });
  panel(469,250,151,68);skull(483,265,1.25);
  text(g.power>0?'SKULL POWER':'GREEN SKULLS',499,267,9,MINT);
  if(g.power>0){
    text(`${g.power.toFixed(1)}s`,483,292,17,g.power<2?'#ffe46b':MINT);rect(481,301,126,4,'#27374a');rect(481,301,126*g.power/g.difficulty.power,4,MINT);
    text('BLUE = YOUR PREY',547,292,6,'#b4c5d6');
  }else {text('Turn blue hunters into prey.',481,285,7,'#9cacc2');text('200 > 400 > 800 > 1600',481,301,7,CREAM);}
  text('GHOST',320,22,13,'#9cb5cb','center');text(g.power>0?'THE HUNTERS ARE HUNTED':g.mode==='scatter'?'SCATTER WAVE':'CHASE WAVE',320,34,7,g.power>0?MINT:'#6e83a0','center');
  rect(0,335,640,25,'#11182a');text('ARROWS / WASD  MOVE',22,351,9,'#a9bad0');text('ESC  LEAVE',618,351,9,'#a9bad0','right');
  for(const [i,s] of ['↑','←','↓','→'].entries()){rect(245+i*39,338,34,19,'#24324b');text(s,262+i*39,352,12,CREAM,'center');}
  if(g.phase==='ready')boardMessage('GET READY',g.level===1?'YOU ARE THE YELLOW GHOST':`LEVEL ${g.level}`);
  else if(g.phase==='clear')boardMessage('MAZE CLEARED',`+${500*g.level}   •   THE NEXT HUNT AWAITS`);
  if(g.phase==='title'){
    rect(0,0,640,335,'#050916c9');
    rect(69,40,502,271,'#10192af8');rect(69,40,502,2,MINT);rect(69,309,502,2,'#344663');
    ghost(216,105,17,3);text('GHOST',340,121,49,'#ffe46b','center');
    text('Collect every soul. Escape the four coloured hunters.',320,171,10,'#a9bad0','center');
    skull(134,195,1.6);
    g.enemies.forEach((e,i)=>{const x=137+i*121;pac(x,235,8,e.colour,3);});
    if(Math.sin(g.clock*4)>-.6)text('SPACE / ENTER TO HAUNT',320,285,13,'#ffe46b','center');
    text('ARROWS / WASD • BUFFER TURNS EARLY • TAP ARROWS ON TOUCH',320,302,8,'#718aa9','center');
  }
  if(g.over){
    rect(0,0,640,335,'#050916c9');rect(141,102,358,148,'#10192af5');rect(141,102,358,2,MINT);
    text('THE HAUNT IS OVER',320,140,24,'#ffe46b','center');text(`SCORE ${g.score}   •   LEVEL ${g.level}`,320,174,16,CREAM,'center');
    text('SPACE / ENTER TO RETURN TO THE ARCADE',320,225,11,'#a9bad0','center');
  }
  c.restore();
}
