import {drawCylinder,facingDoorway,facingNearest} from './pub-interior.js?v=lavatory-1';

// The pub's lavatory, entered through the TOILET door at the back of the
// lounge. Local coordinates: the way back to the pub is centred on the south
// wall, the gents', ladies' and disabled cubicles face it from the north
// wall, and the sinks hang on the east wall, to the right of someone walking in.
// Every door in the room is the same size.
const DOOR_HALF_WIDTH=.5;
export const LAVATORY={width:7.2,depth:6,height:3,
  door:{x:3.6,z:0,halfWidth:DOOR_HALF_WIDTH},spawn:{x:3.6,z:1,angle:0},
  cubicles:[{x:1.4,halfWidth:DOOR_HALF_WIDTH,icon:'gents'},{x:3.6,halfWidth:DOOR_HALF_WIDTH,icon:'ladies'},{x:5.8,halfWidth:DOOR_HALF_WIDTH,icon:'disabled'}],
  sinks:[{x:6.65,z:2,w:.55,d:.7},{x:6.65,z:3.6,w:.55,d:.7}]};
export const CUBICLE_REPLIES=["SORRY, I'M IN!",'JUST A MINUTE, PLEASE!'];
export const SINK_REPLY="THERE'S NO WATER.";

export function moveInLavatory(player,dx,dz){
  const radius=.3,{width:W,depth:D,sinks}=LAVATORY;
  const clear=(x,z)=>x>=radius&&x<=W-radius&&z>=radius&&z<=D-radius&&
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
const sinkSpots=()=>LAVATORY.sinks.map(s=>({x:s.x+s.w/2,z:s.z+s.d/2,radius:s.d/2}));
export const facingSink=player=>facingNearest(player,sinkSpots())!=null;
// What Space says in the lavatory: every cubicle is always taken, and the
// taps are dry. Null where there is nothing to try.
export function lavatoryReply(player,random=Math.random){
  if(facingCubicle(player))return CUBICLE_REPLIES[Math.floor(random()*CUBICLE_REPLIES.length)];
  if(facingSink(player))return SINK_REPLY;
  return null;
}

// Door sign pictograms, one cell per character.
const ICONS={
  gents:['...###...','..#####..','..#####..','...###...','.........','.#######.','#########','#.#####.#','#.#####.#','#.#####.#','#.#####.#','..#####..','..##.##..','..##.##..','..##.##..','..##.##..','..##.##..'],
  disabled:['......##.......','......##.......','...............','......##.......','......##.......','......#######..','......##.......','...#..##.......','..#...#######..','.#...........#.','#............#.','#............#.','#...........###','.#.......#.....','..#.....#......','...#####.......'],
  ladies:['...###...','..#####..','..#####..','...###...','.........','..#####..','.#######.','#.#####.#','#.#####.#','#..###..#','#.#####.#','.#######.','#########','...#.#...','...#.#...','...#.#...','...#.#...']
};
const SIGN_COLORS={gents:'#2f5aa3',ladies:'#b03a5a',disabled:'#1f6fb5'};

export function drawLavatory({face,quad,box}){
  const {width:W,depth:D,height:H}=LAVATORY;
  const cylinder=(...args)=>drawCylinder(face,...args);
  // Black and white floor tiles, a plain ceiling.
  const tile=.3;
  for(let x=0;x<W;x+=tile)for(let z=0;z<D;z+=tile)
    quad(x,0,z,Math.min(tile,W-x),Math.min(tile,D-z),Math.round(x/tile+z/tile)%2?'#d9d6cc':'#2a2a30');
  for(let x=0;x<W;x++)for(let z=0;z<D;z++)quad(x,H,z,1,Math.min(1,D-z),'#bcb7a8');
  // Tiled to shoulder height in two near-white glazes, painted above.
  const wall=(x0,z0,x1,z1)=>{
    const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/tile);
    for(let i=0;i<n;i++){
      const a=i/n,b=(i+1)/n,p=(t,y)=>({x:x0+(x1-x0)*t,y,z:z0+(z1-z0)*t});
      for(let row=0;row<6;row++)face([p(a,row*tile),p(b,row*tile),p(b,(row+1)*tile),p(a,(row+1)*tile)],(i+row)%2?'#dfe3dc':'#d3d9d2');
      face([p(a,1.8),p(b,1.8),p(b,1.86),p(a,1.86)],'#3d6f73');
      face([p(a,1.86),p(b,1.86),p(b,H),p(a,H)],'#a9b5a0');
    }
  };
  wall(0,0,W,0);wall(0,D,W,D);wall(0,0,0,D);wall(W,0,W,D);
  // Wooden doors in light frames: back to the pub, and the three cubicles.
  const door=(x,z,halfWidth,south)=>{
    const s=south?1:-1;
    // The frame is only its front face: its 3.5 cm sides, seen at a slant,
    // would be thinner than a pixel and speckle the tiles beside it.
    const frameZ=z+s*.035,left=x-halfWidth-.08,right=x+halfWidth+.08;
    face([{x:left,y:0,z:frameZ},{x:right,y:0,z:frameZ},{x:right,y:2.3,z:frameZ},{x:left,y:2.3,z:frameZ}],'#a08057');
    box(x-halfWidth,0,south?z+.035:z-.06,2*halfWidth,2.22,.025,'#49332d');
    box(x+s*(halfWidth-.22)-.06,1.,south?z+.06:z-.12,.12,.16,.06,'#d9b671');
  };
  door(LAVATORY.door.x,0,LAVATORY.door.halfWidth,true);
  for(const c of LAVATORY.cubicles){
    door(c.x,D,c.halfWidth,false);
    // A red ENGAGED flag just above the handle.
    box(c.x-c.halfWidth+.15,1.22,D-.1,.14,.06,.04,'#d23a32');
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
    box(W-.05,1.29,s.z-.01,.02,.77,s.d+.02,'#8ea2ac');
  }
  // Two strip lights across the ceiling.
  for(const z of [D/3,2*D/3])box(W/2-.7,H-.08,z-.08,1.4,.08,.16,'#f4f2e6');
}
