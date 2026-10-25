import {facingDoorway,drawCylinder} from './pub-interior.js?v=taps-turned-1';
import {HOTEL_NOTE,TAKEN} from './inventory.js?v=hotel-note-1';

// A small storeroom behind the second-floor STORAGE door. Its door is on the
// south wall; entering faces north, with shelving along both side walls and
// a closed wooden box against the far wall under a small window. Either side
// of the door, before the shelves begin, brooms and buckets fill one corner
// and a handwritten note is pinned up in the other.
export const HOTEL_STORAGE={width:2.4,depth:4.2,height:2.6,door:{x:1.2,z:0,halfWidth:.5},spawn:{x:1.2,z:.8,angle:0},
  shelf:{depth:.45,from:1.1,to:4.1,levels:[.12,.62,1.12,1.62,2.12]},
  crate:{x:.75,z:3.6,w:.9,h:.8,d:.55},window:{x:.9,y:1.4,w:.6,h:.55},
  // Facing north, screen-left is the west wall (low x) and screen-right the east.
  shelves:[
    {side:'left',sections:[{from:1.1,to:2.6,goods:'cleaning'},{from:2.6,to:4.1,goods:'blankets'}]},
    {side:'right',sections:[{from:1.1,to:2.1,goods:'blankets'},{from:2.1,to:3.1,goods:'sheets'},{from:3.1,to:4.1,goods:'towels'}]}],
  brooms:[.18,.32,.46],broomReach:{x:.25,from:.05,to:.6},buckets:[{x:.3,z:.72,color:'#5d6f86',inside:'#46546a'},{x:.3,z:.98,color:'#c9c6b8',inside:'#97948a'}],
  // A sheet of paper pinned to the east wall at eye level.
  note:{z:.6,y:1.36,w:.16,h:.22}};
const GOODS_REPLY={cleaning:'CLEANING PRODUCTS.',blankets:'BLANKETS.',sheets:'SHEETS.',towels:'TOWELS.'};
export const CRATE_REPLY="I CAN'T OPEN IT.",BROOMS_REPLY='BROOMS.';
const REACH=2;

export const facingStorageExit=player=>player.z>0&&facingDoorway(player,HOTEL_STORAGE.door,HOTEL_STORAGE.door.halfWidth);

// What the player's line of sight reaches first: a shelf section, the brooms,
// the note (until it is taken), the box, or nothing. Things to look at carry a
// reply; the note carries the item it becomes.
export function storageTarget(player,noteTaken=false){
  const {width:W,shelf,crate,shelves,broomReach,note}=HOTEL_STORAGE,fx=Math.sin(player.angle),fz=Math.cos(player.angle);
  const walls=[...shelves.map(({side,sections})=>({x:side==='left'?shelf.depth:W-shelf.depth,spans:sections.map(s=>({...s,reply:GOODS_REPLY[s.goods]}))})),
    {x:broomReach.x,spans:[{...broomReach,reply:BROOMS_REPLY}]},
    {x:W,spans:noteTaken?[]:[{from:note.z-note.w/2-.1,to:note.z+note.w/2+.1,item:HOTEL_NOTE}]}];
  let nearest=null,distance=REACH;
  for(const {x,spans} of walls){
    const t=(x-player.x)/fx;
    if(!(t>0&&t<distance))continue;
    const z=player.z+fz*t,span=spans.find(s=>z>=s.from&&z<s.to);
    if(span){nearest=span;distance=t;}
  }
  const t=(crate.z-player.z)/fz,x=player.x+fx*t;
  if(t>0&&t<distance&&x>=crate.x-.1&&x<=crate.x+crate.w+.1)nearest={reply:CRATE_REPLY};
  return nearest;
}
// Space names what is in sight, or takes the note like any other item. Each
// hotel keeps its own note, which stays gone once taken.
export function interactStorage(player,hotel,inventory){
  const target=storageTarget(player,hotel.storageNoteTaken);
  if(!target?.item)return target?.reply??null;
  const taken=inventory.take(target.item);
  if(taken===TAKEN)hotel.storageNoteTaken=true;
  return taken;
}

export function moveInHotelStorage(player,dx,dz){
  const {width:W,depth:D,shelf,crate}=HOTEL_STORAGE,r=.3;
  const clear=(x,z)=>x>=shelf.depth+r&&x<=W-shelf.depth-r&&z>=r&&z<=D-r&&
    !(x>crate.x-r&&x<crate.x+crate.w+r&&z>crate.z-r);
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}

const BLANKETS=['#7c3f36','#3f5373','#6f6342','#5a6e4c'],SHEETS=['#ecebe3','#dfe5ea','#e9dfcf'],TOWELS=['#f2efe6','#9cc3d6'];
const BOTTLES=[['#2d8ad2','#e8eef3'],['#e2c33a','#2f6b3a'],['#d4473c','#f1f1ea'],['#56b06c','#e9e9e3'],['#8d5fc0','#f1f1ea']];

export function drawHotelStorage({face,quad,box,noteTaken=false}){
  const {width:W,depth:D,height:H,door,shelf,crate,shelves,brooms,buckets,note,window:win}=HOTEL_STORAGE;
  // Plain service finishes: a concrete floor, painted walls and a strip light.
  for(let x=0;x<W;x+=.6)for(let z=0;z<D;z+=.8){quad(x,0,z,.6,.8,(x/.6+z/.8)%2?'#5d5b56':'#66645e');quad(x,H,z,.6,.8,'#8b8a84');}
  for(const [x,z,w,d] of [[-.12,0,.12,D],[W,0,.12,D],[0,-.12,W,.12],[0,D,W,.12]])box(x,0,z,w,.12,d,'#4b4943');
  // The far wall is built around the window opening.
  for(const [x,y,w,h] of [[-.12,.12,.12,H-.12],[W,.12,.12,H-.12]])box(x,y,0,w,h,D,'#a8a597');
  box(0,.12,-.12,W,H-.12,.12,'#a8a597');
  for(const [x,y,w,h] of [[0,.12,W,win.y-.12],[0,win.y+win.h,W,H-win.y-win.h],[0,win.y,win.x,win.h],[win.x+win.w,win.y,W-win.x-win.w,win.h]])
    box(x,y,D,w,h,.12,'#a8a597');
  drawWindowView(face,box);
  box(W/2-.6,H-.05,D/2-.05,1.2,.05,.1,'#c9c8bc','#f4f2df');
  // The inside of the door the player came through.
  box(door.x-.57,0,0,1.14,2.4,.05,'#514d46');
  box(door.x-.5,.025,.05,1,2.3,.03,'#777568');
  box(door.x-.43,.91,.08,.13,.045,.045,'#a3a397');

  for(const {side,sections} of shelves){
    // Measure from the wall so both sides share one layout.
    const at=(off,w)=>side==='left'?off:W-off-w;
    for(const z of [shelf.from,...sections.map(s=>s.to)])for(const off of [.02,shelf.depth-.06])
      box(at(off,.04),0,z-.02,.04,shelf.levels.at(-1)+.03,.04,'#6f7275');
    for(const y of shelf.levels)box(at(0,shelf.depth),y,shelf.from,shelf.depth,.03,shelf.to-shelf.from,'#8a8d8f');
    for(const {from,to,goods} of sections)for(const [level,base] of shelf.levels.entries()){
      const y=base+.03,seed=level+(side==='left'?0:3);
      if(goods==='cleaning'){
        for(let i=0,z=from+.12;z<to-.1;i++,z+=.17){
          const [body,cap]=BOTTLES[(i+seed)%BOTTLES.length],tall=(i+level)%3?.24:.3;
          if((i+seed)%4===3){box(at(.1,.24),y,z-.07,.24,.2,.14,body,cap);continue;}
          const x=side==='left'?.22:W-.22;
          drawCylinder(face,x,y,z,.05,tall,body);
          drawCylinder(face,x,y+tall,z,.02,.05,cap);
        }
      }else{
        // Folded stacks spread evenly along the section.
        const [colors,width,thick,count]=goods==='blankets'?[BLANKETS,.44,.09,3]:goods==='sheets'?[SHEETS,.4,.04,6]:[TOWELS,.3,.06,4];
        const stacks=Math.max(1,Math.floor((to-from+.06)/(width+.06))),gap=(to-from-stacks*width)/(stacks+1);
        for(let s=0;s<stacks;s++)for(let n=0;n<count;n++)
          box(at(.04,shelf.depth-.08),y+n*thick,from+gap+s*(width+gap),shelf.depth-.08,thick-.004,width,colors[(n+s+seed)%colors.length]);
      }
    }
  }

  // Brooms lean on the west wall behind two buckets.
  for(const [i,z] of brooms.entries()){
    const foot={x:.24,y:.18,z},top={x:.035,y:1.35,z:z+(i-1)*.03};
    face([{x:.27,y:0,z:z-.13},{x:.27,y:0,z:z+.13},{x:.24,y:.2,z:z+.08},{x:.24,y:.2,z:z-.08}],['#b88a3e','#8d6a3a','#a39a84'][i]);
    face([{x:foot.x-.02,y:foot.y,z},{x:foot.x+.02,y:foot.y,z},{x:top.x+.02,y:top.y,z:top.z},{x:top.x-.02,y:top.y,z:top.z}],'#6b4a2b');
    face([{x:foot.x,y:foot.y,z:z-.02},{x:foot.x,y:foot.y,z:z+.02},{x:top.x,y:top.y,z:top.z+.02},{x:top.x,y:top.y,z:top.z-.02}],'#5a3e24');
  }
  for(const {x,z,color,inside} of buckets){
    drawCylinder(face,x,0,z,.11,.28,color,inside,.13);
    drawCylinder(face,x,.27,z,.135,.02,color,inside);
  }
  // The note: a pinned sheet with a few lines of handwriting.
  if(!noteTaken){
    const wall=(x,z,y,w,h,color)=>face([{x,y,z},{x,y,z:z+w},{x,y:y+h,z:z+w},{x,y:y+h,z}],color);
    const left=note.z-note.w/2;
    wall(W-.004,left,note.y,note.w,note.h,'#efe8d2');
    for(let i=0;i<5;i++)wall(W-.007,left+.025,note.y+.04+i*.032,note.w-.05-(i%2)*.03,.006,'#3e4a6a');
    box(W-.015,note.y+note.h-.03,note.z-.008,.012,.016,.016,'#c2302f');
  }
  // The closed wooden box against the far wall: planked sides, a lid and a hasp.
  const {x,z,w,h,d}=crate;
  box(x,0,z,w,h-.05,d,'#7d5631','#8c6238');
  for(const y of [.05,.27,.49])box(x-.01,y,z-.012,w+.02,.06,d+.02,'#6a4727');
  for(const cx of [x-.015,x+w-.035])box(cx,0,z-.015,.05,h-.05,.05,'#5c3d21');
  box(x-.02,h-.05,z-.02,w+.04,.06,d+.04,'#5c3d21','#946a3e');
  box(x+w/2-.04,h-.17,z-.035,.08,.14,.02,'#8a8a82');
}

// Through the window, across a narrow gap, the top of a lower building: lit
// windows under a parapet at about eye level, and the night sky above it.
function drawWindowView(face,box){
  const {width:W,depth:D,window:win}=HOTEL_STORAGE,front=D+4.5;
  const wall=(x,y,w,h,z,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y:y+h,z},{x,y:y+h,z}],color);
  wall(-40,-20,82,60,front+40,'#141a33');
  for(const [x,y] of [[-3,4.5],[2.5,6],[5,3.8],[-1,8],[8,7]])wall(x,y,.25,.25,front+39.9,'#c9d0f2');
  wall(-12,-12,26,13.85,front,'#4a3436');
  for(let y=-11.7;y<1.8;y+=.3)wall(-12,y,26,.025,front-.005,'#3b292b');
  // A parapet capped with a stone coping.
  box(-12,1.85,front-.1,26,.25,.1,'#3d2b2d','#6c625a');
  for(let row=-2;row<=0;row++)for(let col=-5;col<=5;col++){
    const x=W/2-.45+col*1.8,y=-.4+row*3,lit=(row*7+col*3+40)%5<2;
    wall(x-.06,y-.06,1.02,1.52,front-.01,'#2b2124');
    wall(x,y,.9,1.4,front-.02,lit?'#e9c46e':'#1d2233');
    if(lit)wall(x+.43,y,.04,1.4,front-.03,'#8a6a3c');
  }
  // The window's own frame, cross bars and sill on this side.
  const {x,y,w,h}=win,frame='#d9d5c6';
  for(const [fx,fy,fw,fh] of [[x,y,w,.04],[x,y+h-.04,w,.04],[x,y,.04,h],[x+w-.04,y,.04,h],[x+w/2-.015,y,.03,h],[x,y+h/2-.015,w,.03]])
    box(fx,fy,D+.04,fw,fh,.04,frame);
  box(x-.05,y-.04,D-.06,w+.1,.04,.18,frame,'#e7e3d6');
}
// A dropped note lies folded in half where it fell, slightly open along the
// crease, turned the way the player faced, its handwriting on the upper half.
export function drawDroppedNote(item,face){
  const {w,h}=HOTEL_STORAGE.note,c=Math.cos(item.angle),s=Math.sin(item.angle),y=item.ground+.004,fold=h/2,lift=.03;
  // u runs across the sheet, v from the crease out; the crease stands raised.
  const at=(u,v,up)=>({x:item.x+u*c+v*s,y:y+up,z:item.z-u*s+v*c});
  face([at(-w/2,0,lift),at(w/2,0,lift),at(w/2,fold,0),at(-w/2,fold,0)],'#efe8d2');
  face([at(-w/2,0,lift),at(w/2,0,lift),at(w/2,-fold,0),at(-w/2,-fold,0)],'#d3cab0');
  for(let i=0;i<3;i++){
    const v=.025+i*.025,up=lift*(1-v/fold)+.002,len=w-.05-(i%2)*.03;
    face([at(-w/2+.025,v,up),at(-w/2+.025+len,v,up),at(-w/2+.025+len,v+.006,up),at(-w/2+.025,v+.006,up)],'#3e4a6a');
  }
}
