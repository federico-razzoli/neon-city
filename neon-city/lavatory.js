import {drawCylinder,drawRod,facingDoorway,facingNearest,pubPersonBlocks} from './pub-interior.js?v=receptionist-talk-1';

// The pub's lavatory, entered through the TOILET door at the back of the
// lounge. Local coordinates: the way back to the pub is centred on the south
// wall, the gents', ladies' and disabled cubicles face it from the north
// wall, and the sinks hang on the east wall, to the right of someone walking in.
// Every door in the room is the same size.
const DOOR_HALF_WIDTH=.5;
export const LAVATORY={width:7.2,depth:6,height:3,
  door:{x:3.6,z:0,halfWidth:DOOR_HALF_WIDTH},spawn:{x:3.6,z:1,angle:0},
  // Each cubicle may be taken; one that is alwaysOccupied never comes free.
  cubicles:[{x:1.4,halfWidth:DOOR_HALF_WIDTH,icon:'gents'},{x:3.6,halfWidth:DOOR_HALF_WIDTH,icon:'ladies'},{x:5.8,halfWidth:DOOR_HALF_WIDTH,icon:'disabled',alwaysOccupied:true}],
  sinks:[{x:6.65,z:2,w:.55,d:.7},{x:6.65,z:3.6,w:.55,d:.7}]};
export const CUBICLE_REPLIES=["SORRY, I'M IN!",'JUST A MINUTE, PLEASE!'];

// A robot walking out is in the way, as people are in the pub.
export function moveInLavatory(player,dx,dz,walker){
  const radius=.3,{width:W,depth:D,sinks}=LAVATORY;
  const clear=(x,z)=>!pubPersonBlocks(player,{x,z},walker)&&x>=radius&&x<=W-radius&&z>=radius&&z<=D-radius&&
    !sinks.some(s=>x>s.x-radius&&x<s.x+s.w+radius&&z>s.z-radius&&z<s.z+s.d+radius);
  // Substeps keep running and diagonal motion from crossing the sinks.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
export const facingLavatoryExit=player=>player.z>LAVATORY.door.z&&facingDoorway(player,LAVATORY.door,LAVATORY.door.halfWidth);
export const facingCubicle=player=>player.z<LAVATORY.depth&&LAVATORY.cubicles.find(c=>facingDoorway(player,{x:c.x,z:LAVATORY.depth},c.halfWidth));
// Which cubicles are taken, decided afresh each time the player comes in
// from the pub: an even chance for each, unless it is alwaysOccupied.
export const rollOccupancy=(random=Math.random)=>LAVATORY.cubicles.map(c=>c.alwaysOccupied===true||random()<.5);
const isOccupied=(cubicle,occupied)=>occupied[LAVATORY.cubicles.indexOf(cubicle)]!==false;
export function facingVacantCubicle(player,occupied){
  const cubicle=facingCubicle(player);
  return cubicle&&!isOccupied(cubicle,occupied)?cubicle:null;
}
// Every 20–30 seconds, whoever is in the gents' or the ladies' (a robot,
// either way) comes out and walks straight to the way back to the pub,
// leaving the cubicle free. It waits while the player is in its path, and
// held reports that it is waiting.
const ROBOT=11,ROBOT_SPEED=1.3,ROBOT_EXIT={x:LAVATORY.door.x,z:.4};
export class LavatoryLife{
  constructor(random=Math.random){this.random=random;this.wait=this.delay();this.walker=null;this.held=false;}
  delay(){return 20+this.random()*10;}
  update(dt,occupied,player){
    this.held=false;
    if(this.walker){
      const w=this.walker;let travel=dt*ROBOT_SPEED;
      while(travel>0){
        const dx=ROBOT_EXIT.x-w.x,dz=ROBOT_EXIT.z-w.z,d=Math.hypot(dx,dz);
        if(!d){this.walker=null;return;}
        w.facingX=dx/d;w.facingZ=dz/d;
        const move=Math.min(d,travel,.05),next={x:w.x+dx/d*move,z:w.z+dz/d*move};
        if(pubPersonBlocks(w,next,player)){this.held=true;return;}
        w.x=next.x;w.z=next.z;w.walkTime+=move/ROBOT_SPEED;travel-=move;
      }
      return;
    }
    this.wait-=dt;
    if(this.wait>0)return;
    const taken=LAVATORY.cubicles.map((c,i)=>i).filter(i=>occupied[i]&&!LAVATORY.cubicles[i].alwaysOccupied);
    if(!taken.length){this.wait=this.delay();return;}
    const index=taken[Math.floor(this.random()*taken.length)],start={x:LAVATORY.cubicles[index].x,z:LAVATORY.depth-.4};
    // Someone standing at that door keeps it shut until they step aside.
    if(pubPersonBlocks(start,start,player))return;
    this.wait=this.delay();occupied[index]=false;
    this.walker={...start,type:ROBOT,variant:0,walkTime:0,facingX:0,facingZ:-1};
  }
}
const sinkSpots=()=>LAVATORY.sinks.map((s,index)=>({x:s.x+s.w/2,z:s.z+s.d/2,radius:s.d/2,index}));
// The index of the sink in reach and in view, or null.
export const facingSink=player=>facingNearest(player,sinkSpots())?.index??null;
// What Space says in the lavatory: someone answers from a taken cubicle.
// Null where there is nothing to say, or the door opens.
export function lavatoryReply(player,occupied,random=Math.random){
  const cubicle=facingCubicle(player);
  if(cubicle)return isOccupied(cubicle,occupied)?CUBICLE_REPLIES[Math.floor(random()*CUBICLE_REPLIES.length)]:null;
  return null;
}
// Where each tap's water falls: under the end of its spout, into the basin.
export const tapStream=sink=>({x:sink.x+sink.w-.25,z:sink.z+sink.d/2,top:1.08,bottom:.941});
// How loud the running taps are where the player stands: each open tap is
// loudest beside its basin and fades with distance across the room.
export function tapVolume(player,open){
  let volume=0;
  for(const [i,sink] of LAVATORY.sinks.entries())if(open[i]){
    const {x,z}=tapStream(sink);
    volume+=.3/Math.max(1,Math.hypot(player.x-x,player.z-z));
  }
  return Math.min(.45,volume);
}

// The mirror above a sink: its glass faces the room, in the plane x.
export const mirrorOf=sink=>({x:LAVATORY.width-.05,y0:1.29,y1:2.06,z0:sink.z-.01,z1:sink.z+sink.d+.01});
// The player's outline, in metres across (u) and up (y).
// A human contour: a broad crown, temples, small ears, cheekbones and
// an angular jaw tapering to a chin. Eyes sit near 1.65m, halfway down.
const HEAD=[
  [-.045,1.835],[.045,1.835],[.085,1.82],[.112,1.79],
  [.125,1.75],[.126,1.705],[.119,1.665],
  [.139,1.67],[.145,1.65],[.138,1.605],[.119,1.595],
  [.109,1.555],[.085,1.515],[.045,1.485],[.025,1.478],
  [-.025,1.478],[-.045,1.485],[-.085,1.515],[-.109,1.555],
  [-.119,1.595],[-.138,1.605],[-.145,1.65],[-.139,1.67],
  [-.119,1.665],[-.126,1.705],[-.125,1.75],[-.112,1.79],[-.085,1.82]
];
const NECK=[[-.062,1.535],[.062,1.535],[.061,1.425],[.092,1.39],[-.092,1.39],[-.061,1.425]];
// Trapezius slopes into rounded shoulders and upper arms; the waist tapers.
const TORSO=[
  [-.061,1.435],[.061,1.435],[.105,1.405],[.177,1.382],
  [.218,1.36],[.241,1.325],[.255,1.27],[.27,1.08],[.265,.9],
  [.197,.9],[.193,1.12],[.181,.97],[.17,.9],
  [-.17,.9],[-.181,.97],[-.193,1.12],[-.197,.9],
  [-.265,.9],[-.27,1.08],[-.255,1.27],[-.241,1.325],
  [-.218,1.36],[-.177,1.382],[-.105,1.405]
];
// Keeps the part of a polygon, given as [z, y] points, inside a mirror.
function clipToMirror(points,m){
  for(const [axis,limit,keepAbove] of [[0,m.z0,true],[0,m.z1,false],[1,m.y0,true],[1,m.y1,false]]){
    const inside=p=>keepAbove?p[axis]>=limit:p[axis]<=limit,out=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      if(inside(a))out.push(a);
      if(inside(a)!==inside(b)){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    points=out;
    if(points.length<3)return [];
  }
  return points;
}
// The viewer's reflection, as polygons drawn on the glass. A mirror image
// stands as far behind the glass as the viewer stands in front, so its
// outline on the glass is half size, about the viewer's eyes: it grows on
// approach, shrinks going back, and slides off the edge stepping aside.
// Turned away from the mirror, the shoulders narrow towards a side view.
export function mirrorSilhouette(viewer,mirror){
  if(viewer.x>=mirror.x)return [];
  const across=Math.max(.55,Math.abs(Math.sin(viewer.angle)));
  const shapes=[HEAD,NECK,TORSO.map(([u,y])=>[u*across,y])];
  return shapes.map(shape=>clipToMirror(shape.map(([u,y])=>[viewer.z+u/2,viewer.eye+(y-viewer.eye)/2]),mirror))
    .filter(points=>points.length)
    .map(points=>points.map(([z,y])=>({x:mirror.x-.004,y,z})));
}

// Door sign pictograms, one cell per character.
const ICONS={
  gents:['...###...','..#####..','..#####..','...###...','.........','.#######.','#########','#.#####.#','#.#####.#','#.#####.#','#.#####.#','..#####..','..##.##..','..##.##..','..##.##..','..##.##..','..##.##..'],
  disabled:['......##.......','......##.......','...............','......##.......','......##.......','......#######..','......##.......','...#..##.......','..#...#######..','.#...........#.','#............#.','#............#.','#...........###','.#.......#.....','..#.....#......','...#####.......'],
  ladies:['...###...','..#####..','..#####..','...###...','.........','..#####..','.#######.','#.#####.#','#.#####.#','#..###..#','#.#####.#','.#######.','#########','...#.#...','...#.#...','...#.#...','...#.#...']
};
const SIGN_COLORS={gents:'#2f5aa3',ladies:'#b03a5a',disabled:'#1f6fb5'};

// Black and white floor tiles, a plain ceiling, and walls tiled to shoulder
// height in two near-white glazes, painted above.
const TILE=.3;
function drawTiledRoom({face,quad},W,D,H){
  for(let x=0;x<W;x+=TILE)for(let z=0;z<D;z+=TILE)
    quad(x,0,z,Math.min(TILE,W-x),Math.min(TILE,D-z),Math.round(x/TILE+z/TILE)%2?'#d9d6cc':'#2a2a30');
  for(let x=0;x<W;x++)for(let z=0;z<D;z++)quad(x,H,z,Math.min(1,W-x),Math.min(1,D-z),'#bcb7a8');
  const wall=(x0,z0,x1,z1)=>{
    const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/TILE);
    for(let i=0;i<n;i++){
      const a=i/n,b=(i+1)/n,p=(t,y)=>({x:x0+(x1-x0)*t,y,z:z0+(z1-z0)*t});
      for(let row=0;row<6;row++)face([p(a,row*TILE),p(b,row*TILE),p(b,(row+1)*TILE),p(a,(row+1)*TILE)],(i+row)%2?'#dfe3dc':'#d3d9d2');
      face([p(a,1.8),p(b,1.8),p(b,1.86),p(a,1.86)],'#3d6f73');
      face([p(a,1.86),p(b,1.86),p(b,H),p(a,H)],'#a9b5a0');
    }
  };
  wall(0,0,W,0);wall(0,D,W,D);wall(0,0,0,D);wall(W,0,W,D);
}
// A wooden door in a light frame, on the south (z=0) or north wall.
function drawDoor({face,box},x,z,halfWidth,south){
  const s=south?1:-1;
  // The frame is only its front face: its 3.5 cm sides, seen at a slant,
  // would be thinner than a pixel and speckle the tiles beside it.
  const frameZ=z+s*.035,left=x-halfWidth-.08,right=x+halfWidth+.08;
  face([{x:left,y:0,z:frameZ},{x:right,y:0,z:frameZ},{x:right,y:2.3,z:frameZ},{x:left,y:2.3,z:frameZ}],'#a08057');
  box(x-halfWidth,0,south?z+.035:z-.06,2*halfWidth,2.22,.025,'#49332d');
  box(x+s*(halfWidth-.22)-.06,1.,south?z+.06:z-.12,.12,.16,.06,'#d9b671');
}

export function drawLavatory({face,quad,box,occupied=[],viewer=null,taps=[],time=0}){
  const {width:W,depth:D,height:H}=LAVATORY;
  const cylinder=(...args)=>drawCylinder(face,...args);
  const door=(...args)=>drawDoor({face,box},...args);
  drawTiledRoom({face,quad},W,D,H);
  // Doors back to the pub and into the three cubicles.
  door(LAVATORY.door.x,0,LAVATORY.door.halfWidth,true);
  for(const c of LAVATORY.cubicles){
    door(c.x,D,c.halfWidth,false);
    // A red ENGAGED or green VACANT flag just above the handle.
    box(c.x-c.halfWidth+.15,1.22,D-.1,.14,.06,.04,isOccupied(c,occupied)?'#d23a32':'#3f9a4c');
    // The cubicle's pictogram, white on a coloured plate.
    const rows=ICONS[c.icon],size=.032,z=D-.09,width=rows[0].length*size,top=1.98,bottom=top-rows.length*size;
    box(c.x-width/2-.06,bottom-.07,z+.01,width+.12,top-bottom+.14,.02,SIGN_COLORS[c.icon]);
    const left=c.x-width/2;
    for(const [row,line] of rows.entries())for(const [col,cell] of [...line].entries())if(cell==='#'){
      const x=left+col*size,y=top-row*size;
      face([{x,y,z},{x:x+size,y,z},{x:x+size,y:y-size,z},{x,y:y-size,z}],'#f2efe4');
    }
  }
  // White basins on pedestals, each with a chrome tap and a mirror above.
  for(const s of LAVATORY.sinks){
    const cx=s.x+s.w/2,cz=s.z+s.d/2;
    box(cx-.12,0,cz-.12,.24,.78,.24,'#e3e1d7');
    box(s.x,.78,s.z,s.w,.16,s.d,'#e9e7de','#f3f1ea');
    quad(s.x+.07,.941,s.z+.08,s.w-.2,s.d-.16,'#aab4b4');
    cylinder(s.x+s.w-.09,.94,cz,.025,.16,'#c6ccd0');
    box(s.x+s.w-.27,1.08,cz-.02,.2,.035,.04,'#c6ccd0');
    for(const dz of [-.12,.12])cylinder(s.x+s.w-.09,.94,cz+dz,.03,.05,'#c6ccd0',dz<0?'#4f7fc0':'#c8484a');
    box(W-.03,1.25,s.z-.05,.03,.85,s.d+.1,'#7c6a52');
    const m=mirrorOf(s);
    box(m.x,m.y0,m.z0,.02,m.y1-m.y0,m.z1-m.z0,'#8ea2ac');
    if(viewer)for(const points of mirrorSilhouette(viewer,m))face(points,'#0b0b10');
    if(taps[LAVATORY.sinks.indexOf(s)])drawRunningWater({quad,cylinder},s,time);
  }
  // Two strip lights across the ceiling.
  for(const z of [D/3,2*D/3])box(W/2-.7,H-.08,z-.08,1.4,.08,.16,'#f4f2e6');
}

// An open tap: a column of water, thinning as it falls, with bright and dark
// bands sliding down it, splashing into a shallow pool in the basin.
const WATER=['#eaf7fc','#5fa9c9'];
function drawRunningWater({quad,cylinder},sink,time){
  const {x,z,top,bottom}=tapStream(sink),bands=5,band=(top-bottom)/bands,shift=Math.floor(time*14);
  for(let i=0;i<bands;i++){
    const y=bottom+i*band,radius=t=>.01+.007*t;
    cylinder(x,y,z,radius(i/bands),band,WATER[(i+shift)%2],WATER[(i+shift)%2],radius((i+1)/bands));
  }
  quad(sink.x+.1,.943,sink.z+.12,sink.w-.26,sink.d-.24,'#6fa9bf');
  cylinder(x,.943,z,.035+.01*((shift%3)/2),.004,WATER[0]);
}

// Inside a free cubicle: the door back to the lavatory is on the south wall,
// the toilet against the north wall, and a paper roll on the west wall, on
// the right of someone sitting down. It is roomy, so the toilet is in view
// from the door rather than below the bottom of the screen.
export const CUBICLE={width:1.5,depth:3.4,height:3,
  door:{x:.75,z:0,halfWidth:DOOR_HALF_WIDTH},spawn:{x:.75,z:.5,angle:0},
  toilet:{x:.5,z:2.7,w:.5,d:.7},
  // Seated on the toilet, facing the door, eyes lower than on a pub chair.
  seat:{x:.75,z:3.02,radius:.3,angle:Math.PI,eye:1.25},
  // Seated players only look up, so the roll is ahead of the seat, not beside it.
  paper:{z:1.95,y:.78}};
export function moveInCubicle(player,dx,dz){
  const radius=.3,{width:W,depth:D,toilet:t}=CUBICLE;
  const clear=(x,z)=>x>=radius&&x<=W-radius&&z>=radius&&z<=D-radius&&
    !(x>t.x-radius&&x<t.x+t.w+radius&&z>t.z-radius&&z<t.z+t.d+radius);
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
export const facingCubicleExit=player=>player.z>CUBICLE.door.z&&facingDoorway(player,CUBICLE.door,CUBICLE.door.halfWidth);
export const facingToilet=player=>facingNearest(player,[CUBICLE.seat]);
// Back in the lavatory, just in front of the cubicle's door.
export const outsideCubicle=cubicle=>({x:cubicle.x,z:LAVATORY.depth-.9,angle:Math.PI});

export function drawCubicle({face,quad,box}){
  const {width:W,depth:D,height:H,seat}=CUBICLE,x=seat.x;
  const cylinder=(...args)=>drawCylinder(face,...args);
  const china='#eceae2',white='#f5f4ee',chrome='#c6ccd0';
  drawTiledRoom({face,quad},W,D,H);
  drawDoor({face,box},CUBICLE.door.x,0,CUBICLE.door.halfWidth,true);
  // A coat hook on the back of the door.
  box(CUBICLE.door.x-.03,1.85,.06,.06,.06,.08,chrome);
  // The toilet: pedestal, bowl, a white seat round the water, the lid raised
  // against a low cistern with a chrome flush button on top.
  const z=seat.z;
  cylinder(x,0,z+.08,.13,.26,china,china,.16);
  cylinder(x,.26,z+.04,.17,.14,china,china,.21);
  cylinder(x,.4,z+.02,.22,.035,white);
  cylinder(x,.436,z+.02,.13,.002,'#a9bfc3');
  box(x-.21,.44,z+.21,.42,.5,.03,white);
  box(x-.24,.42,z+.24,.48,.52,D-z-.24,china,white);
  cylinder(x,.94,(z+.24+D)/2,.04,.015,chrome);
  // A paper roll on its holder.
  const {paper}=CUBICLE;
  box(.02,paper.y+.04,paper.z-.1,.04,.03,.2,chrome);
  drawRod(face,{x:.13,y:paper.y,z:paper.z-.08},{x:.13,y:paper.y,z:paper.z+.08},.06,white);
  // A small ceiling light.
  box(W/2-.2,H-.06,D/2-.2,.4,.06,.4,'#f4f2e6');
}
