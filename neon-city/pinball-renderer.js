// The screen depicts the table itself. All marks belong to its playfield or apron.
const TAU=Math.PI*2;
const project=(x,y,z=0)=>{const s=.36+y/900*.045;return {x:320+(x-240)*s,y:34+y/900*310-z*.22,s};};
function polygon(g,points,fill,stroke=null,width=1){g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function plate(g,points,z,fill,stroke=null,width=1){polygon(g,points.map(([x,y])=>project(x,y,z)),fill,stroke,width);}
function line(g,points,z,color,width=1){g.beginPath();points.forEach(([x,y],i)=>{const p=project(x,y,z);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.stroke();}
function ellipse(g,x,y,r,z,fill,stroke=null,width=1){const p=project(x,y,z);g.beginPath();g.ellipse(p.x,p.y,r*p.s,r*(310/900),0,0,TAU);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function cylinder(g,x,y,r,bottom,top,cap,side){
  const a=project(x,y,bottom),b=project(x,y,top),rx=r*a.s,ry=r*(310/900);
  const wall=g.createLinearGradient(a.x-rx,0,a.x+rx,0);wall.addColorStop(0,'#263840');wall.addColorStop(.23,side);wall.addColorStop(.55,side);wall.addColorStop(1,'#334650');
  g.beginPath();g.moveTo(b.x-rx,b.y);g.lineTo(a.x-rx,a.y);g.ellipse(a.x,a.y,rx,ry,0,Math.PI,0,true);g.lineTo(b.x+rx,b.y);g.closePath();g.fillStyle=wall;g.fill();
  ellipse(g,x,y,r,top,cap,'#c3c9bd',.6);
}
function radial(g,x,y,r,inner,outer){const a=g.createRadialGradient(x-r*.35,y-r*.45,r*.05,x,y,r);a.addColorStop(0,inner);a.addColorStop(1,outer);return a;}
function screw(g,x,y,z){const p=project(x,y,z);ellipse(g,x,y,3.5,z,'#c9d0d2','#637077',.6);g.strokeStyle='#445057';g.lineWidth=.6;g.beginPath();g.moveTo(p.x-1.7,p.y);g.lineTo(p.x+1.7,p.y);g.stroke();}
function print(g,s,x,y,size=8,color='#31434a',z=0){const p=project(x,y,z);g.textAlign='center';g.fillStyle=color;g.font=`600 ${size*p.s}px Arial, sans-serif`;g.fillText(s,p.x,p.y);}
function rubber(g,points,z=13,color='#f5ebe0',width=4){line(g,points.map(([x,y])=>[x+3,y+8]),0,'#17212650',width+2);line(g,points,z,'#675d52',width+1.5);line(g,points,z+1,color,width);}
function metal(g,points,z=10,width=3){line(g,points.map(([x,y])=>[x+4,y+9]),0,'#17212640',width+3);line(g,points,z,'#48565d',width+1.3);line(g,points,z+1,'#d0d9dc',width);line(g,points,z+2,'#f7fafa',Math.max(.6,width*.24));}
function post(g,x,y){ellipse(g,x+3,y+6,11,0,'#19272c40');cylinder(g,x,y,9,2,14,'#df4637','#b94937');ellipse(g,x,y,10,9,'#eee7d6','#a9a79a',.5);ellipse(g,x,y,6,16,'#f5ede1','#b1b5b5',.7);screw(g,x,y,17);}
function insert(g,x,y,on,color='#ebbc48',r=10){ellipse(g,x,y,r+2,0,'#73623a','#7c785f',.5);const p=project(x,y);g.save();if(on){g.shadowColor=color;g.shadowBlur=10;}ellipse(g,x,y,r,0,on?color:'#ac956969');g.restore();ellipse(g,x-2,y-2,r*.55,0,on?'#fff6c580':'#ffffff18');}
function bumper(g,b,on=false){
  const {x,y,r}=b,p=project(x,y,30);
  ellipse(g,x+8,y+17,r+6,0,'#29312b48');
  cylinder(g,x,y,r+3,2,7,'#c7d0cd','#88999e');
  cylinder(g,x,y,r-10,7,27,'#d0d5ce','#acb9b9');
  g.save();if(on){g.shadowColor='#ffbd74';g.shadowBlur=18;}
  const red=radial(g,p.x,p.y,r*p.s,on?'#fff3bc':'#fb7964',on?'#ff8d39':'#ba2d2a');
  cylinder(g,x,y,r-5,27,34,red,on?'#ef8541':'#b83c30');g.restore();
  ellipse(g,x,y,r-15,35,'#f7e8cc','#e8ad86',.5);ellipse(g,x,y,r-19,35,on?'#fff7d4':'#cf3830');
  print(g,'100',x,y+7,10,'#fff0d0',36);screw(g,x-r+7,y,34);screw(g,x+r-7,y,34);
}
function drawFixed(g,game){
  // The only surrounding scenery is the dark gap beside the machine.
  g.fillStyle='#11161b';g.fillRect(0,0,640,360);
  const ambient=g.createLinearGradient(0,0,640,0);ambient.addColorStop(0,'#12131a');ambient.addColorStop(.5,'#31383c');ambient.addColorStop(1,'#11161b');g.fillStyle=ambient;g.fillRect(0,0,640,360);
  // Cabinet, playfield wood and steel side channels.
  plate(g,[[-23,-10],[503,-10],[503,915],[-23,915]],0,'#090d11');
  const wood=g.createLinearGradient(0,50,0,355);wood.addColorStop(0,'#d2c19d');wood.addColorStop(.45,'#eee0bc');wood.addColorStop(1,'#d4bc86');
  plate(g,[[0,0],[480,0],[480,900],[0,900]],0,wood,'#d1d1c5',1);
  g.save();plate(g,[[9,4],[471,4],[471,900],[9,900]],0,null);g.clip();
  // Restrained printed stripes are paint under the mechanisms, not screen graphics.
  for(const [x,offset] of [[45,0],[420,1]]){
    plate(g,[[x-11,70],[x+17,70],[x+(offset?-55:55),510],[x+(offset?-90:90),777],[x+(offset?-120:120),790],[x+(offset?-77:77),510]],0,'#2b7181');
    plate(g,[[x+22,82],[x+28,82],[x+(offset?-40:72),510],[x+(offset?-113:143),790],[x+(offset?-123:133),790],[x+(offset?-48:64),510]],0,'#c54b36');
  }
  // Faint grain and small varnish highlights.
  for(let i=0;i<170;i++){const y=(i*49.717)%900,x=(i*97.13)%480;line(g,[[x,y],[x+8+(i%15),y+1]],0,i%3?'#7e66380b':'#fff7dc18',.5);}
  // Repeating arcs printed around the bumper nest.
  for(const b of game.bumpers){ellipse(g,b.x,b.y,b.r+16,0,'#256a77','#ded1a5',1);ellipse(g,b.x,b.y,b.r+11,0,'#e4c877','#b99049',1);}
  for(const [x,y] of [[185,500],[296,500],[240,573]]){
    plate(g,[[x,y-23],[x+17,y+5],[x+6,y+5],[x+6,y+40],[x-6,y+40],[x-6,y+5],[x-17,y+5]],0,'#ba4632','#f5deaa',1);
  }
  print(g,'500',76,414,10,'#963d2d');print(g,'100',153,350,9,'#315560');
  print(g,'BONUS',240,641,9,'#4e5350');print(g,'1000',240,663,10,'#9e392c');
  for(const [x,y] of [[58,698],[390,713]])print(g,'OUT',x,y,8,'#99533d');
  g.restore();
  // Shooter groove, formed by two steel rails; it has a real spring and plunger.
  plate(g,[[431,205],[468,145],[468,850],[431,850]],0,'#7c8e91');
  plate(g,[[436,215],[462,190],[462,846],[436,846]],0,'#313e45');
  // Top arch and guide rails are steel standing above the wood.
  metal(g,game.arch,18,4);
  for(const r of game.rails.slice(game.arch.length-1))metal(g,[[r[0],r[1]],[r[2],r[3]]],12,r[0]===431?3:2.7);
  // Four rollover lane guides with two mounting screws each.
  for(const x of [125,202,280,357]){metal(g,[[x,106],[x,185]],18,3);screw(g,x,111,18);screw(g,x,179,18);}
  for(const [i,r] of game.rollovers.entries()){
    print(g,String(i+1),r.x,116,11,'#a94430');
    metal(g,[[r.x-6,165],[r.x+6,165]],3,1.5);
  }
  // Drop-target bank: a plastic bracket, three slots and replaceable targets.
  plate(g,[[76,343],[111,343],[111,476],[76,476]],8,'#2b5d70','#b5c9c9',.8);
  for(const t of game.targets)plate(g,[[91,t.y-16],[108,t.y-16],[108,t.y+16],[91,t.y+16]],9,'#253940','#bfc7c2',.6);
  screw(g,82,350,10);screw(g,82,468,10);
  // Spinner: a hanging metal paddle between a pair of actual wire uprights.
  metal(g,[[130,307],[130,294],[176,294],[176,307]],33,2.5);
  for(const x of [130,176]){ellipse(g,x,307,5,0,'#b8bfc0','#697b80',.7);metal(g,[[x,307],[x,294]],28,1.5);}
  // Rubber slingshots with raised translucent triangular plastic covers.
  for(const s of game.slings){
    const [a,b,c]=s.points;
    rubber(g,[a,b,c,a],15,'#f8f0e0',4);
    plate(g,[[a[0],a[1]+9],[b[0],b[1]-8],[c[0]+(a[0]<200?2:-2),c[1]-4]],24,'#19566ed9','#d2e5e2',1);
    plate(g,[[a[0]+(a[0]<200?5:-5),a[1]+30],[b[0]+(a[0]<200?-8:8),b[1]-18],[c[0]+(a[0]<200?8:-8),c[1]-17]],25,'#cc4c38','#eec6a0',.6);
    screw(g,a[0],a[1]+19,26);screw(g,c[0]+(a[0]<200?6:-6),c[1]-6,26);
  }
  for(const p of game.posts)post(g,p.x,p.y);
  // Return-lane wire guides and switches.
  for(const points of [[[70,543],[107,683],[138,720]],[[405,543],[377,683],[347,720]]]){
    metal(g,points,17,2);for(const [x,y] of [points[0],points[1]]){post(g,x,y);}
  }
  for(const b of game.bumpers)bumper(g,b);
  // Brushed metal apron and its small physical instruction cards.
  const apron=g.createLinearGradient(0,317,640,358);apron.addColorStop(0,'#293b43');apron.addColorStop(.5,'#40525b');apron.addColorStop(1,'#172e39');
  plate(g,[[13,828],[427,828],[427,900],[13,900]],5,apron,'#86999e',1);
  plate(g,[[25,840],[159,840],[159,888],[25,888]],6,'#f0e6cc','#adad95',.6);
  plate(g,[[307,840],[416,840],[416,888],[307,888]],6,'#f0e6cc','#adad95',.6);
  print(g,'FLIPPERS ← → · NUDGE A D',92,859,10,'#273a40',7);print(g,'3 BALLS  ·  ESC TO LEAVE',92,880,10,'#273a40',7);
  print(g,'HOLD ↓ TO PULL',361,858,10,'#273a40',7);print(g,'RELEASE TO LAUNCH',361,880,10,'#273a40',7);
  print(g,'PINBALL',235,872,15,'#e4d7b5',8);
  // Full-length stainless side trims. No surrounding dashboard.
  for(const [a,b] of [[-17,-5],[484,496]]){
    const trim=g.createLinearGradient(project(a,0).x,0,project(b,900).x,0);trim.addColorStop(0,'#526069');trim.addColorStop(.35,'#e3e5e2');trim.addColorStop(.6,'#838e91');trim.addColorStop(1,'#2d3a43');
    plate(g,[[a,-5],[b,-5],[b,900],[a,900]],15,trim,'#9ca8ab',.5);
    for(const y of [60,465,850])screw(g,(a+b)/2,y,17);
  }
  // Backbox: score glass, speaker grilles and integrated ball counter.
  g.save();g.translate(320,0);g.scale(.58,.58);g.translate(-320,0);
  const bezel=g.createLinearGradient(0,0,0,52);bezel.addColorStop(0,'#cbd0ce');bezel.addColorStop(.1,'#6c7b82');bezel.addColorStop(.9,'#23353e');bezel.addColorStop(1,'#b7c2c4');
  polygon(g,[{x:133,y:0},{x:507,y:0},{x:501,y:51},{x:139,y:51}],bezel,'#172027',2);
  g.fillStyle='#080f13';g.fillRect(148,5,344,38);g.strokeStyle='#67767b';g.lineWidth=.6;g.strokeRect(148,5,344,38);
  for(const x of [155,461])for(let i=0;i<7;i++){g.fillStyle='#435258';g.fillRect(x+i*3.3,12,1.2,23);}
  g.fillStyle='#152229';g.fillRect(187,8,263,31);
  g.textAlign='left';g.font='600 6px Arial';g.fillStyle='#b7c0bc';g.fillText('SCORE',199,17);g.fillText('BALL',398,17);
  // Glass reflection on the score panel only; the playfield stays clear.
  polygon(g,[{x:188,y:8},{x:302,y:8},{x:277,y:38},{x:188,y:38}],'#ffffff05');g.restore();
}
function flipper(g,f){
  const world=(x,y)=>[f.x+Math.cos(f.a)*x-Math.sin(f.a)*y,f.y+Math.sin(f.a)*x+Math.cos(f.a)*y];
  const points=[];
  for(let i=0;i<=12;i++){const a=Math.PI/2+i*Math.PI/12;points.push(world(Math.cos(a)*11,Math.sin(a)*11));}
  for(let i=0;i<=12;i++){const a=-Math.PI/2+i*Math.PI/12;points.push(world(72+Math.cos(a)*6,Math.sin(a)*6));}
  plate(g,points.map(([x,y])=>[x+5,y+9]),0,'#1c252b60');
  plate(g,points,7,'#8f2421','#6a2823',1);plate(g,points,14,'#df4333','#ffb99a',.8);
  line(g,[world(0,0),world(70,0)],16,'#f0e9db',10);
  line(g,[world(2,-3),world(68,-2)],17,'#fffaf0',1.3);
  screw(g,f.x,f.y,18);
}
function plunger(g,game){
  const y=813+game.plungerPull*45;
  for(let i=0;i<9;i++){const yy=y+4+i*(70-(y-813))/9;metal(g,[[440,yy],[460,yy+2]],7,1);}
  metal(g,[[450,y],[450,909+game.plungerPull*45]],8,2.5);metal(g,[[440,y],[460,y]],10,4);
}
export function drawPinball(g,game){
  const resolution=Math.max(1,Math.min(3,g.getTransform().a));
  if(!game.art||game.artResolution!==resolution){
    game.art=document.createElement('canvas');game.art.width=640*resolution;game.art.height=360*resolution;game.artResolution=resolution;
    const a=game.art.getContext('2d');a.scale(resolution,resolution);drawFixed(a,game);
  }
  g.save();g.drawImage(game.art,0,0,640,360);
  // Lit inserts, moving targets and the physical parts that move during play.
  for(const [i,r] of game.rollovers.entries())insert(g,r.x,202,r.on,['#e9b944','#eab846','#e9b944'][i],10);
  for(const [i,y] of [602,635,670].entries())insert(g,240,y,game.score>=(i+1)*1000,'#e6aa36',8);
  for(const t of game.targets)if(!t.down){
    plate(g,[[t.x-3,t.y-13],[t.x+5,t.y-13],[t.x+5,t.y+13],[t.x-3,t.y+13]],22,'#eee2c5','#8e9a97',.7);
    line(g,[[t.x+2,t.y-11],[t.x+2,t.y+11]],23,'#d44932',2.2);
  }
  const spin=(game.spinnerUntil||0)>game.time?Math.cos(game.time*35):1;
  const p=project(153,301,29);g.fillStyle='#c74b35';g.strokeStyle='#efd1a4';g.lineWidth=.6;g.fillRect(p.x-5,p.y-6*Math.abs(spin),10,12*Math.abs(spin));g.strokeRect(p.x-5,p.y-6*Math.abs(spin),10,12*Math.abs(spin));
  for(const b of game.bumpers)if(b.lit>0)bumper(g,b,true);
  for(const s of game.slings)if(s.lit>0){const p=project(s.points[0][0],s.points[0][1]+45,22);g.save();g.globalAlpha=s.lit*3;g.fillStyle='#ffe2a3';g.beginPath();g.ellipse(p.x,p.y,10,5,0,0,TAU);g.fill();g.restore();}
  for(const f of game.flippers)flipper(g,f);
  plunger(g,game);
  // A sphere stays round in projection; only its shadow lies flat on the wood.
  const b=game.ball,pb=project(b.x,b.y,8),r=8*pb.s;
  if(b.y<827){
  ellipse(g,b.x+5,b.y+8,10,0,'#18283160');
  const chrome=g.createRadialGradient(pb.x-r*.35,pb.y-r*.45,.2,pb.x,pb.y,r);
  for(const [t,c] of [[0,'#fff'],[.15,'#fffef0'],[.31,'#dbe2df'],[.45,'#81949b'],[.56,'#31434f'],[.74,'#172833'],[.86,'#bbc8c7'],[1,'#5c747d']])chrome.addColorStop(t,c);
  g.fillStyle=chrome;g.beginPath();g.arc(pb.x,pb.y,r,0,TAU);g.fill();g.strokeStyle='#c6d1d0';g.lineWidth=.5;g.stroke();
  for(const b of game.bumpers)if(game.ball.y<b.y&&Math.abs(game.ball.x-b.x)<b.r+10)bumper(g,b,b.lit>0);
  }
  // The only live score readout is the machine's own display.
  g.save();g.translate(320,0);g.scale(.58,.58);g.translate(-320,0);
  g.fillStyle='#132026';g.fillRect(196,20,188,18);g.fillRect(394,20,48,18);
  g.textAlign='right';g.fillStyle='#f5ead1';g.font='500 21px Arial, sans-serif';g.fillText(String(game.score).padStart(7,'0'),381,37);
  g.font='500 18px Arial, sans-serif';g.fillText(`${game.lives}`,430,36);
  if(game.tilted&&!game.over){g.textAlign='center';g.font='600 12px Arial';g.fillStyle='#ff866b';g.fillText('TILT',285,34);}
  if(game.over){g.fillStyle='#112027';g.fillRect(190,7,260,32);g.textAlign='center';g.font='600 10px Arial';g.fillStyle='#f6e4ba';g.fillText(`GAME OVER    ${game.score}`,320,20);g.font='7px Arial';g.fillText('SPACE / ENTER TO RETURN TO ARCADE',320,32);}
  g.restore();
  // The lock bar closes the cabinet, leaving the entire table in view.
  const bar=g.createLinearGradient(0,350,0,360);bar.addColorStop(0,'#e0e4e1');bar.addColorStop(.3,'#aab5b6');bar.addColorStop(1,'#3b515b');
  polygon(g,[{x:210,y:350},{x:430,y:350},{x:427,y:360},{x:213,y:360}],bar,'#5f737d',.7);
  g.restore();
}
