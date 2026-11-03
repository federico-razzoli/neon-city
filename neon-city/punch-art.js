// Canvas-native artwork: articulated silhouettes, shaded anatomy and pose animation.
const GOLD='#f3cc76',INK='#121b30',CREAM='#f9edcf';
export function drawPunch(c,g){
  const box=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const text=(s,x,y,size=12,col=CREAM,align='center')=>{c.fillStyle=col;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y);};
  const ellipse=(x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const path=(points,col,stroke=null,width=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=col;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
  const line=(points,col,w=2)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const panel=(x,y,w,h)=>{box(x,y,w,h,'#101a2cf2');box(x,y,w,2,GOLD);box(x,y+h-2,w,2,'#5f5260');};
  const meter=(x,y,w,v,col)=>{box(x-1,y-1,w+2,9,'#080e1b');box(x,y,w,7,'#384358');box(x,y,w*Math.max(0,v)/100,7,col);};
  const f=g.fighter;
  c.save();
  box(0,0,640,360,'#080e1b');
  // Arena light cones and a layered, gently animated crowd.
  path([[72,0],[180,0],[340,193],[-20,193]],'#17243a');path([[460,0],[565,0],[660,193],[290,193]],'#152238');
  for(let row=0;row<4;row++){
    box(0,66+row*18,640,1,'#394051');
    for(let i=0;i<43;i++){
      const x=i*16+(row%2)*7,y=73+row*18+Math.sin(i*4+g.clock*(i%5===0?3:0))*1.2;
      ellipse(x,y,3,4,['#b17b65','#7a6668','#948781','#5d626e'][(i*7+row)%4]);
      box(x-4,y+4,8,8,['#374865','#5b3c59','#365a58','#4d4658'][(i+row)%4]);
    }
  }
  box(0,132,640,12,'#1b263a');text('P U N C H   •   WORLD CIRCUIT',320,142,9,'#8296af');
  path([[123,148],[517,148],[662,315],[-22,315]],'#477d8a');
  path([[140,163],[500,163],[595,296],[45,296]],'#548c94');
  line([[141,164],[498,164],[592,294],[47,294],[141,164]],'#83afb1',1);
  ellipse(320,231,82,27,'#52848c');text('P U N C H',320,239,21,'#709da0');
  for(const [y,col] of [[151,'#c4bfba'],[171,'#cd6571'],[193,'#e2ded1']]){
    line([[17,y+55],[124,y],[516,y],[623,y+55]],'#101b30',5);
    line([[17,y+53],[124,y-2],[516,y-2],[623,y+53]],col,3);
  }
  for(const [x,near] of [[19,true],[621,true],[123,false],[517,false]]){box(x-4,near?190:133,8,near?121:66,'#202b42');box(x-7,near?204:141,14,near?42:31,x<320?'#bf4d60':'#3e74b1');}
  // Referee at ringside, visible throughout the match and during counts.
  const refX=g.phase==='down'?190:548,refY=g.phase==='down'?188:158;
  ellipse(refX,refY-12,9,12,'#bf9474');path([[refX-14,refY],[refX+12,refY],[refX+17,refY+33],[refX-17,refY+33]],'#e4dfd0');
  line([[refX,refY+1],[refX,refY+27]],'#2b3140',3);line([[refX-8,refY+33],[refX-10,refY+52]],'#232f43',8);line([[refX+8,refY+33],[refX+12,refY+52]],'#232f43',8);
  if(g.phase==='down')line([[refX-12,refY+4],[refX-27,refY-12],[refX-25,refY-29]],'#bf9474',7);

  function glove(x,y,r,color,side=1){
    ellipse(x+2,y+3,r+1,r*.85,INK);ellipse(x,y,r,r*.84,color);
    ellipse(x-side*r*.24,y-r*.2,r*.57,r*.35,'#ffffff25');
    ellipse(x+side*r*.68,y+r*.18,r*.33,r*.37,color);
    box(x-r*.55,y+r*.57,r*1.1,5,'#eadbc0');line([[x-r*.5,y-r*.3],[x+r*.3,y-r*.45]],'#ffffff55',2);
  }
  function opponent(){
    const down=g.phase==='down'&&g.downWho==='opponent';
    c.save();
    if(g.shake)c.translate(Math.sin(g.clock*100)*3,0);
    let x=320+Math.sin(g.clock*3)*3,y=101+Math.sin(g.clock*5)*1.5;
    if(g.phase==='tell'){x+=g.attack.side*17;y+=g.attack.type==='uppercut'?13:0;}
    if(g.phase==='strike'){x-=g.attack.side*12;y+=8;}
    if(g.reaction){x+=g.reactionSide*9;y-=3;}
    if(down){c.translate(320,258);c.rotate(-1.4);c.scale(.8,.8);c.translate(-320,-210);x=320;y=101;}
    const b=f.build;
    c.translate(x,y);c.scale(b,1);
    ellipse(0,172,59,11,'#142a3c66');
    // Boots, legs, trunks, waistband.
    line([[-20,125],[-26,151],[-30,167]],f.shade,17);line([[20,125],[27,151],[28,167]],f.skin,17);
    path([[-41,162],[-21,163],[-17,175],[-45,175]],'#1a2337',INK,2);path([[18,163],[37,162],[46,175],[17,175]],'#1a2337',INK,2);
    line([[-36,167],[-23,167]],'#e9dcca',2);line([[23,167],[35,167]],'#e9dcca',2);
    path([[-33,97],[33,97],[37,132],[5,138],[0,120],[-5,138],[-36,132]],f.trunks,INK,2);
    path([[-33,99],[-23,101],[-25,131],[-35,130]],'#ffffff33');path([[26,101],[33,99],[36,132],[28,134]],'#121c3644');
    box(-34,95,68,9,'#ece0c4');box(-10,95,20,9,'#d8b36a');text(g.bout===2?'T':'P',0,103,8,INK);
    // Curved torso with shoulders, pecs and abdominal shading.
    c.beginPath();c.moveTo(-12,31);c.bezierCurveTo(-22,37,-43,32,-43,55);c.bezierCurveTo(-39,71,-29,76,-30,96);c.lineTo(30,96);c.bezierCurveTo(30,77,40,73,43,55);c.bezierCurveTo(44,34,22,37,12,31);c.closePath();c.fillStyle=f.skin;c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
    path([[-40,48],[-31,57],[-23,91],[-29,95],[-35,71]],f.shade);path([[4,49],[29,46],[31,59],[8,63]],'#ffffff14');
    line([[-28,59],[-12,64],[-3,60]],f.shade,2);line([[3,60],[13,64],[29,59]],f.shade,2);line([[0,66],[0,89]],f.shade,2);line([[-11,76],[11,76]],f.shade,1);line([[-10,84],[10,84]],f.shade,1);
    // Neck, ears, jaw, hair and expressive facial details.
    box(-10,23,20,17,f.shade);ellipse(-20,12,5,8,f.shade);ellipse(20,12,5,8,f.skin);
    path([[-20,-8],[-13,-19],[10,-20],[20,-10],[19,17],[10,31],[-8,31],[-19,19]],f.skin,INK,2);
    path([[-19,-8],[-10,-16],[-11,17],[-4,29],[-9,31],[-19,19]],f.shade);
    if(g.bout===0){path([[-21,-7],[-19,-19],[-6,-25],[15,-20],[22,-10],[12,-12],[2,-17],[-8,-10]],f.hair);path([[-13,23],[-8,31],[10,31],[15,22],[7,25],[-7,24]],f.hair);}
    else if(g.bout===1){path([[-21,3],[-22,-18],[-8,-25],[14,-23],[23,-11],[19,9],[15,-9],[4,-6],[-12,-12],[-15,6]],f.hair);}
    else {path([[-20,-9],[-17,-21],[15,-21],[21,-9],[10,-13],[-10,-13]],f.hair);line([[-20,3],[-12,3]],'#d8b97b',3);}
    const hurt=g.reaction>0||g.phase==='stunned';
    line([[-13,4],[-5,hurt?8:3]],f.hair,3);line([[5,hurt?8:3],[13,4]],f.hair,3);
    if(hurt){line([[-12,12],[-5,14]],INK,2);line([[6,14],[13,12]],INK,2);}else {box(-12,9,7,4,'#f7edcf');box(6,9,7,4,'#f7edcf');box(-8,9,3,4,INK);box(7,9,3,4,INK);}
    line([[1,11],[-2,18],[3,19]],f.shade,2);line([[-6,24],[7,24]],'#633933',2);
    if(g.bout===0)line([[-7,20],[8,20]],f.hair,3);
    // Each arm follows the current move. Feints share a wind-up but never extend.
    for(const side of [-1,1]){
      let gx=side*29,gy=g.guard==='head'?24:67;
      if(g.phase==='recover'||g.phase==='stunned'){gx=side*53;gy=75;}
      if(g.phase==='tell'&&g.attack.side===side){gx=side*64;gy=g.attack.type==='uppercut'?87:5;}
      if(g.phase==='strike'&&g.attack.side===side){gx=side*10;gy=g.attack.type==='uppercut'?96:74;}
      const elbowX=side*50,elbowY=68;
      line([[side*34,48],[elbowX,elbowY],[gx,gy]],INK,19);line([[side*34,48],[elbowX,elbowY],[gx,gy]],side<0?f.shade:f.skin,15);
      const glow=g.phase==='tell'&&g.timer<.24&&g.timer>.065&&g.attack.type!=='feint';
      if(glow)ellipse(gx,gy,24,22,'#f8d16d55');
      glove(gx,gy,g.phase==='strike'&&g.attack.side===side?24:17,f.gloves,side);
    }
    if(g.phase==='stunned')for(let i=0;i<3;i++)text('✦',Math.cos(g.clock*5+i*2.1)*32,-31+Math.sin(g.clock*5+i*2.1)*7,14,GOLD);
    c.restore();
  }
  opponent();
  function player(){
    const down=g.phase==='down'&&g.downWho==='player';
    c.save();
    let lean=g.dodgeTimer?Math.sin(Math.PI*g.dodgeTimer/.46)*g.dodge*46:0;
    let x=320+lean,y=250+(g.duck?23:0)+(g.stun?5:0);
    if(down){c.translate(315,294);c.rotate(1.4);c.scale(.85,.85);c.translate(-320,-250);}
    c.translate(x,y);c.rotate(lean*.003);
    ellipse(0,57,47,9,'#10253b88');
    line([[-13,32],[-19,53]],'#b97e60',13);line([[13,32],[20,53]],'#d9a17a',13);
    path([[-25,11],[25,11],[28,39],[4,41],[0,26],[-5,41],[-28,39]],'#338e9c',INK,2);
    box(-24,10,48,7,'#f4e7c9');
    path([[-11,-34],[-31,-22],[-26,11],[26,11],[31,-22],[11,-34]],'#407f8b',INK,2);
    path([[-14,-31],[-9,-8],[9,-8],[14,-31],[7,-35],[-7,-35]],'#dfa882');
    line([[-18,-25],[-13,5]],'#6fc1bc',4);line([[18,-25],[13,5]],'#6fc1bc',4);
    box(-8,-43,16,15,'#b77c5f');ellipse(0,-48,16,20,'#dba37e');
    path([[-17,-45],[-18,-59],[-11,-69],[8,-70],[18,-60],[16,-43],[9,-48],[6,-58],[-7,-59],[-11,-46]],'#272837');
    line([[-14,-58],[-6,-63],[8,-63]],'#48434a',3);
    for(const side of [-1,1]){
      let gx=side*40,gy=g.block?-46:-15;
      const punch=g.punch&&g.punch.hand===side;
      if(punch){const t=Math.sin(Math.PI*Math.min(1,g.punch.time/.28));gx=side*(40-23*t);gy=-15-(g.punch.head?94:56)*t;}
      line([[side*25,-23],[side*43,1],[gx,gy]],INK,14);line([[side*25,-23],[side*43,1],[gx,gy]],'#d9a17a',10);
      glove(gx,gy,punch?16:14,'#54c7b6',side);
    }
    c.restore();
  }
  player();
  if(g.reaction){const x=320+g.reactionSide*18,y=g.punch?.head?112:167;line([[x-19,y-14],[x-9,y-6]],'#fff0b9',2);line([[x+17,y-17],[x+9,y-7]],'#fff0b9',2);}
  if(g.flash&&g.stun){box(0,70,4,244,'#e97468');box(636,70,4,244,'#e97468');}
  // Broadcast scoreboard: names and meters keep the action clear.
  box(0,0,640,61,'#10192b');box(0,60,640,2,'#d5ac62');
  text('PUNCH',320,22,20,GOLD);text(`ROUND ${g.round} / 3`,320,37,9,'#9fb0c3');
  const minute=Math.floor(g.time/60),sec=Math.floor(g.time%60).toString().padStart(2,'0');text(`${minute}:${sec}`,320,55,15);
  text('THE CHALLENGER',16,17,11,CREAM,'left');text(f.name,624,17,11,CREAM,'right');
  meter(16,25,220,g.health,'#61d4af');meter(404,25,220,g.opponentHealth,'#ed827e');
  text(`HEART ${Math.ceil(g.stamina)}`,16,48,10,g.exhausted?'#ef7d77':'#9db8c8','left');
  text('★'.repeat(g.stars)+'☆'.repeat(3-g.stars),204,50,17,GOLD);
  text(`KD ${g.roundPlayerDowns}`,16,58,8,'#8092ab','left');text(`KD ${g.roundOpponentDowns}     ${g.score.toString().padStart(6,'0')}`,624,48,10,'#9db8c8','right');
  box(0,313,640,47,'#10192b');box(0,313,640,1,'#6c7e94');
  if(['idle','tell','strike','recover','stunned'].includes(g.phase))text(g.message||'READ HIS RHYTHM. FIND YOUR OPENING.',320,309,10,GOLD);
  const buttons=[['←','SLIP L'],['→','SLIP R'],['↓','DUCK'],['↑','GUARD'],['Z','LEFT'],['X','RIGHT'],['SPACE','STAR']];
  buttons.forEach(([key,label],i)=>{const x=i<2?8+i*86:i===2?180:i===3?270:i===4?360:i===5?450:540;box(x+2,320,i<2?78:86,27,'#1c2a40');text(key,x+43,332,10,CREAM);text(label,x+43,342,7,'#8da5b8');});
  text('HOLD ↑ + Z / X: HEAD   •   Z / X: BODY   •   TAP DIRECTIONS TO EVADE   •   ESC: EXIT',320,355,8,'#90a7b9');

  if(g.phase==='title'){
    panel(79,76,482,220);text('THE WORLD CIRCUIT',320,99,10,'#9eb7c8');text('PUNCH',320,145,48,GOLD);
    text('THREE FIGHTERS. ONE BELT.',320,168,13);
    text('Z / X  LEFT & RIGHT BODY PUNCH',320,193,11);text('HOLD ↑ FOR HEAD PUNCHES & HIGH GUARD',320,210,11);
    text('← → SLIP   ↓ DUCK   SPACE STAR UPPERCUT',320,227,11);
    text('DODGE • COUNTER • EARN STARS • BEAT THE COUNT',320,250,10,'#91b6bf');
    if(Math.sin(g.clock*4)>-.5)text('PRESS Z / X / SPACE TO ENTER THE RING',320,278,12,GOLD);
  }else if(g.phase==='intro'){
    panel(38,79,257,217);text(`CONTENDER ${g.bout+1} OF 3`,166,102,10,'#9eb7c8');
    text(f.name,166,132,23,GOLD);text(f.alias,166,153,10);text(f.record,166,175,11,'#a3bbca');
    const hints=g.bout===0?['Big hooks. A wide-open chin.','Slip away from the glove.','Then let your hands go.']:g.bout===1?['He changes his guard.','The first move may be a feint.','Wait for the real punch.']:['A three-punch combination.','Duck the sweeping cross.','Gold flash? Counter for a star.'];
    hints.forEach((s,i)=>text(s,166,200+i*16,10,'#a9bdc9'));text('Z / X / SPACE — FIGHT',166,278,11,GOLD);
  }else if(g.phase==='bell'){
    panel(223,158,194,49);text(g.message,320,189,21,GOLD);
  }else if(g.phase==='down'){
    text(g.downWho==='player'?'GET UP!':'KNOCKDOWN',320,91,24,GOLD);text(`${g.count||''}`,320,151,45,CREAM);
    if(g.downWho==='player'){panel(144,225,352,65);text('TAP Z / X / SPACE TO BEAT THE COUNT',320,246,12,GOLD);meter(168,262,304,g.rise,'#61d4af');}
  }else if(g.phase==='rest'){
    panel(104,104,432,173);text(`END OF ROUND ${g.round}`,320,137,24,GOLD);text('CORNER ADVICE',320,162,11,'#9eb7c8');
    text(g.stamina<35?'Make him miss. Let your hands recover.':'Change levels. Watch for the gold flash.',320,185,11);
    text(`LANDED ${g.landed}   TAKEN ${g.taken}`,320,211,12);text('Z / X / SPACE — NEXT ROUND',320,252,12,GOLD);
  }else if(g.phase==='result'){
    panel(76,92,488,194);text(g.victory?'WORLD CHAMPION':g.boutWon?'VICTORY':'DEFEAT',320,129,29,GOLD);
    text(g.message,320,159,15);text(g.result||'',320,181,11,'#a8bdca');text(`SCORE ${g.score}`,320,211,20,CREAM);
    if(g.victory){path([[290,229],[350,229],[345,249],[295,249]],GOLD);box(309,231,22,17,'#ba8e3f');text('★',320,245,16,CREAM);}
    text(g.over?'SPACE — RETURN TO ARCADE':'Z / X / SPACE — NEXT CONTENDER',320,271,11,GOLD);
  }
  c.restore();
}
