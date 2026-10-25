import {entranceSide} from './entrances.js';
// Choose once per address so all walls agree, including after a block reloads.
export function hotelSignSeed(building){
  let hash=2166136261;
  for(const char of `hotel:${building.x},${building.z}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;
  return hash>>>0;
}

export function hotelHIsDim(building,time){
  if(building.sign!=='HOTEL'||Math.floor(building.h*9)<137)return false;
  const seed=building.hotelSignSeed??=hotelSignSeed(building);
  if(seed%3!==0)return false;
  // Brief, uneven outages in a burst, followed by several seconds of steady
  // light. Each hotel's phase and cycle length differ; no per-frame randomness.
  const period=4.7+(seed%29)/10,phase=(time+(seed%997)/97)%period;
  return phase<.09||(phase>.16&&phase<.23)||(phase>.39&&phase<.56)||(phase>.68&&phase<.73);
}

export function dimHotelH(ctx,height){
  ctx.save();
  ctx.fillStyle='#160c24';ctx.fillRect(132,height-137,24,16);
  ctx.shadowBlur=0;ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillStyle='#302331';ctx.fillText('H',144,height-124);
  ctx.restore();
}

// Lobby colour schemes; each hotel keeps one for all its walls.
export const HOTEL_LOOKS=[
  {name:'plum',wall:'#33202e',panel:'#4a2a33',inset:'#3d2229',metal:'#8a7047',floor:['#a39780','#6b6056'],column:['#a89d89','#8b8170'],carpet:'#6e2030',velvet:['#5e2236','#72304a'],wood:['#4e2a21','#3b1f19']},
  {name:'emerald',wall:'#1f2e27',panel:'#3a2a22',inset:'#2e211b',metal:'#8a7047',floor:['#999483','#4a544b'],column:['#9b998a','#7f7d70'],carpet:'#24493a',velvet:['#2f5244','#3b6253'],wood:['#4a2e22','#37211a']},
  {name:'navy',wall:'#1e2438',panel:'#2c3046',inset:'#242839',metal:'#7c8189',floor:['#96989c','#3a3e4c'],column:['#a0a2a6','#83868a'],carpet:'#2b3a6a',velvet:['#344272','#425186'],wood:['#33303a','#26232c']},
  {name:'oxblood',wall:'#3a1c1f',panel:'#2a1b1a',inset:'#211514',metal:'#927648',floor:['#a59f92','#2c2a2e'],column:['#a39a8b','#877e70'],carpet:'#5a1f2b',velvet:['#4f2a2a','#633535'],wood:['#3e231d','#2d1914']},
  {name:'teal',wall:'#1d3233',panel:'#3b2b26',inset:'#2e211d',metal:'#8a5f44',floor:['#9f9480','#6e4b3d'],column:['#a29883','#867c69'],carpet:'#7a3b2c',velvet:['#2e5254','#3a6466'],wood:['#4b2d22','#38211a']}
];
const hash=text=>{
  let h=2166136261;
  for(const char of text)h=Math.imul(h^char.charCodeAt(0),16777619);
  h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;
  return h>>>0;
};
export const hotelLook=building=>HOTEL_LOOKS[hash(`lobby:${building.x},${building.z}`)%HOTEL_LOOKS.length];
const frontSide=entranceSide;
// Wide windows show one of these views; narrow ones a single piece of furniture.
export const HALL_SCENES=['sofa','armchairs','stairs','lifts'];
export const NOOK_SCENES=['clock','vase','palm','lamp'];
// The scenes behind one wall: [left, middle, right]. The street-facing wall
// has the entrance in the middle and the reception desk on the left.
export function hotelScenes(building,side){
  let seed=hash(`hotel:${building.x},${building.z}:${side}`);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const halls=[...HALL_SCENES];
  const pick=()=>halls.splice(Math.floor(random()*halls.length),1)[0];
  const front=side===frontSide(building);
  return {left:front?'desk':pick(),middle:front?'entrance':NOOK_SCENES[Math.floor(random()*NOOK_SCENES.length)],right:pick(),random};
}

// A chandelier, its glow fading in steps as pixel light does.
function chandelier(g,rect,look,cx){
  g.globalAlpha=.05;
  for(const [dx,dy] of [[10,0],[7,1],[4,2]])rect('#e0b970',cx-dx,5+dy,2*dx+1,9-2*dy);
  g.globalAlpha=1;
  rect(look.metal,cx,5,1,3);rect(look.metal,cx-5,8,11,1);rect(look.metal,cx-5,9,1,2);rect(look.metal,cx+5,9,1,2);rect('#b5ab97',cx,9,1,3);
  for(const dx of [-5,-2,2,5])rect('#d8c48c',cx+dx,7,1,1);
}
function palm(rect,look,tx){
  rect(look.metal,tx,26,4,4);rect('#2a5a3c',tx+1,19,2,7);
  rect('#356f4b',tx-2,18,3,2);rect('#356f4b',tx+3,18,3,2);rect('#2a5a3c',tx-1,16,2,2);rect('#2a5a3c',tx+3,16,2,2);
}
// One window: walls, wainscoting and marble floor, then its scene.
function lobbyWindow(g,rect,look,x,w,scene,random){
  rect(look.metal,x,3,w,33);
  rect(look.wall,x+2,5,w-4,21);rect(look.panel,x+2,18,w-4,8);rect(look.metal,x+2,18,w-4,1);
  for(let px=x+4;px+9<=x+w-3;px+=12)rect(look.inset,px,20,9,5);
  for(let row=0;row<4;row++)for(let col=0;col*4<w-4;col++)
    rect(look.floor[(row+col)%2],x+2+col*4,26+row*2,Math.min(4,w-4-col*4),2);
  const columns=w>30&&scene!=='lifts'&&scene!=='stairs'&&random()<.7;
  if(columns)for(const cx of [x+5,x+w-9]){
    rect(look.column[0],cx,7,4,19);rect(look.column[1],cx+3,7,1,19);
    rect(look.metal,cx-1,6,6,2);rect(look.metal,cx-1,25,6,2);
  }
  const runner=(top,height)=>{rect(look.carpet,x+21,top,16,height);rect(look.metal,x+21,top,1,height);rect(look.metal,x+36,top,1,height);};
  if(scene==='desk'){
    runner(30,4);
    // Pigeonholes with keys behind a desk topped in marble.
    rect(look.wood[1],x+17,11,24,9);
    for(let r=0;r<2;r++)for(let c=0;c<5;c++){
      rect('#1f120e',x+18+c*5,12+r*4,4,3);
      if(random()<.7)rect(look.metal,x+20+c*5,13+r*4,1,2);
    }
    rect(look.wood[0],x+14,21,30,9);rect(look.column[0],x+13,20,32,2);
    rect(look.metal,x+14,24,30,1);
    for(const px of [x+21,x+29,x+37])rect(look.wood[1],px,25,1,5);
    // A banker's lamp, a bell and a vase of roses on the counter.
    rect('#2a5a40',x+16,16,5,2);rect('#d9c48c',x+17,18,3,1);rect(look.metal,x+18,18,1,2);
    rect(look.metal,x+37,18,3,2);rect(look.metal,x+38,17,1,1);
    rect('#7f95a0',x+27,17,2,3);rect('#9c2a3e',x+26,15,2,2);rect('#ad3c52',x+29,16,1,1);rect('#2a5a3c',x+28,16,1,1);
    chandelier(g,rect,look,x+28);
  }else if(scene==='sofa'){
    runner(27,7);
    const px=random()<.5?x+13:x+31;
    rect(look.metal,px,8,14,9);rect(['#2a3f58','#4a3350','#344c3b'][Math.floor(random()*3)],px+1,9,12,7);
    rect('#b0935a',px+3+Math.floor(random()*6),11,3,2);
    rect(look.velvet[0],x+19,22,20,4);rect(look.velvet[1],x+19,20,20,2);rect(look.velvet[0],x+18,21,2,6);rect(look.velvet[0],x+38,21,2,6);
    rect(look.wood[1],x+20,27,1,2);rect(look.wood[1],x+37,27,1,2);
    for(const tx of random()<.5?[x+11]:[x+11,x+44])palm(rect,look,tx);
    chandelier(g,rect,look,x+28);
  }else if(scene==='armchairs'){
    runner(28,6);
    // A gilt mirror above two armchairs either side of a lamp table.
    rect(look.metal,x+22,7,14,8);rect('#4f5760',x+23,8,12,6);rect('#6b737b',x+24,9,2,4);
    for(const cx of [x+12,x+38]){
      rect(look.velvet[1],cx,17,8,5);rect(look.velvet[0],cx,22,8,3);
      rect(look.velvet[0],cx-1,20,2,6);rect(look.velvet[0],cx+7,20,2,6);
      rect(look.wood[1],cx,26,1,2);rect(look.wood[1],cx+7,26,1,2);
    }
    rect(look.wood[0],x+25,22,8,1);rect(look.wood[1],x+28,23,2,5);
    g.globalAlpha=.08;rect('#e0b970',x+22,13,14,10);g.globalAlpha=1;
    rect(look.metal,x+28,19,2,3);rect('#96804f',x+26,16,6,3);
    if(random()<.5)palm(rect,look,x+48);
  }else if(scene==='stairs'){
    // A carpeted staircase climbs to a landing, with a brass banister.
    for(let i=0;i<7;i++){
      const sx=x+16+i*4,top=24-i*2;
      rect(look.carpet,sx,top,4,26-top);rect(look.floor[0],sx,top,4,1);
      rect(look.metal,sx,top-5,4,1);rect(look.metal,sx+1,top-4,1,4);
    }
    rect(look.carpet,x+44,10,x+w-2-(x+44),16);rect(look.floor[0],x+44,10,x+w-2-(x+44),1);
    rect(look.metal,x+44,5,x+w-2-(x+44),1);
    palm(rect,look,x+9);
    chandelier(g,rect,look,x+14);
  }else if(scene==='lifts'){
    // Two lifts with brass frames and floor dials, lit by wall sconces.
    for(const lx of [x+10,x+34]){
      rect(look.metal,lx,8,14,18);rect(look.wood[1],lx+1,9,12,17);
      rect('#5f5a52',lx+2,10,10,16);rect('#4a463f',lx+6,10,2,16);
      rect('#1a1210',lx+4,5,6,2);rect('#d8c48c',lx+5+Math.floor(random()*4),5,1,1);
    }
    rect(look.metal,x+28,16,2,3);rect('#d8c48c',x+28,17,1,1);
    for(const sx of [x+6,x+50]){
      g.globalAlpha=.07;rect('#e0b970',sx-2,9,6,6);g.globalAlpha=1;
      rect(look.metal,sx,11,2,3);rect('#d8c48c',sx,10,2,1);
    }
    runner(30,4);
  }else if(scene==='clock'){
    // A grandfather clock.
    rect(look.wood[0],x+9,8,6,18);rect(look.wood[1],x+8,7,8,2);rect('#c9bea8',x+10,10,4,4);
    rect('#2a1c18',x+11,11,1,2);rect('#2a1c18',x+12,12,1,1);
    rect('#1f120e',x+10,16,4,8);rect(look.metal,x+11,20,2,2);rect(look.metal,x+12,16,1,4);
  }else if(scene==='vase'){
    // A porcelain vase of flowers on a marble pedestal.
    rect(look.column[0],x+9,18,6,8);rect(look.column[1],x+13,18,2,8);rect(look.metal,x+8,17,8,1);
    rect('#6d8494',x+10,13,4,4);rect('#7e95a4',x+11,12,2,1);
    rect('#2a5a3c',x+11,9,1,3);rect('#9c2a3e',x+9,8,2,2);rect('#b0935a',x+13,8,2,2);rect('#ad3c52',x+11,7,2,2);
  }else if(scene==='palm')palm(rect,look,x+10);
  else if(scene==='lamp'){
    // A standing lamp beside a small side table.
    g.globalAlpha=.08;rect('#e0b970',x+5,6,14,14);g.globalAlpha=1;
    rect('#a58c5c',x+8,9,8,4);rect(look.metal,x+11,13,2,13);rect(look.metal,x+9,25,6,1);
  }
  g.globalAlpha=.08;rect('#c5e6ed',x+4,6,2,27);if(w>30)rect('#c5e6ed',x+w-10,6,3,27);g.globalAlpha=1;
}

// The ground floor of a hotel: windows onto an empty lobby. The street-facing
// facade has the entrance, with the reception desk in its left window; other
// walls have a narrow window in the middle instead.
export function drawHotel(g,height,building,side){
  const y=height-39,look=hotelLook(building),{left,middle,right,random}=hotelScenes(building,side);
  const rect=(colour,x,z,w,h)=>{g.fillStyle=colour;g.fillRect(x,y+z,w,h);};
  rect('#1a1120',0,0,160,39);
  lobbyWindow(g,rect,look,6,58,left,random);
  lobbyWindow(g,rect,look,96,58,right,random);
  if(middle==='entrance'){
    // Glazed double doors under a canopy, with a carpet over the threshold.
    rect(look.carpet,64,0,32,3);rect(look.metal,64,3,32,1);
    rect(look.metal,68,4,24,35);rect('#3e2a2a',70,6,20,31);
    g.globalAlpha=.22;rect('#e0b970',70,6,20,31);g.globalAlpha=1;
    rect(look.metal,70,12,20,1);rect(look.metal,79,6,2,31);
    rect('#d2b678',76,19,1,6);rect('#d2b678',83,19,1,6);
    g.globalAlpha=.08;rect('#c5e6ed',72,13,2,23);rect('#c5e6ed',85,13,2,23);g.globalAlpha=1;
    rect(look.carpet,68,36,24,3);
  }else lobbyWindow(g,rect,look,68,24,middle,random);
}
