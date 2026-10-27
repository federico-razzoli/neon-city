import {HOTEL_STAIRWELL} from './hotel-stairwell.js?v=hotel-cash-2';
import {facingDoorway} from './pub-interior.js?v=taps-turned-1';
import {hotelInteriorLook,drawHotelDoubleDoor} from './hotel-interior.js?v=street-lights-1';

export const HOTEL_CORRIDOR={width:4.8,depth:24,height:HOTEL_STAIRWELL.rise,spawn:{x:2.4,z:1.2,angle:0},window:{x:.5,y:.65,w:3.8,h:2.4}};
// Number along the corridor in pairs: odd rooms left, even rooms right.
export const corridorRooms=floor=>Array.from({length:10},(_,i)=>({
  number:String(floor*100+i+1).padStart(3,'0'),side:i%2?'right':'left',
  x:i%2?HOTEL_CORRIDOR.width:0,z:4+Math.floor(i/2)*4
}));
export const facingCorridorExit=player=>facingDoorway(player,{x:HOTEL_CORRIDOR.width/2,z:0},1.2);
export function corridorReply(player,floor){
  for(const room of corridorRooms(floor)){
    if(facingDoorway({x:player.z,z:player.x,angle:Math.PI/2-player.angle},{x:room.z,z:room.x},.55))return "IT'S LOCKED...";
  }
  return null;
}
export function moveInHotelCorridor(player,dx,dz){
  player.x=Math.max(.3,Math.min(HOTEL_CORRIDOR.width-.3,player.x+dx));
  player.z=Math.max(.3,Math.min(HOTEL_CORRIDOR.depth-.3,player.z+dz));
}
const DIGITS={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};

export function drawHotelCorridor({face,quad,box,look:facade,floor}){
  const look=hotelInteriorLook(facade),{width:W,depth:D,height:H,window:win}=HOTEL_CORRIDOR;
  for(let x=0;x<W;x+=.8)for(let z=0;z<D;z++)quad(x,0,z,.8,1,look.floor[(Math.round(x/.8)+z)%2]);
  quad(.8,.008,0,W-1.6,D,look.carpet);
  for(const x of [.75,W-.8])quad(x,.012,0,.05,D,look.metal);
  quad(0,H,0,W,D,look.panel);
  for(const [x,z,w,d] of [[-.12,0,.12,D],[W,0,.12,D],[0,-.12,W,.12]]){
    box(x,0,z,w,1.05,d,look.panel);
    box(x,1.05,z,w,.06,d,look.metal);
    box(x,1.11,z,w,H-1.11,d,look.wall);
  }
  // The far wall surrounds a real opening; exterior geometry sits beyond it.
  for(const [x,y,w,h] of [[0,0,W,win.y],[0,win.y+win.h,W,H-win.y-win.h],[0,win.y,win.x,win.h],[win.x+win.w,win.y,W-win.x-win.w,win.h]])box(x,y,D,w,h,.12,look.wall);
  for(const x of [0,W-.1])box(x,H-.12,0,.1,.12,D,look.wood[0]);
  drawHotelDoubleDoor(box,W/2,0,.06,look,1);
  for(const room of corridorRooms(floor)){
    const left=room.side==='left',at=(offset,width)=>left?offset:W-offset-width;
    box(at(.01,.08),0,room.z-.68,.08,2.6,1.36,look.metal);
    box(at(.09,.035),.04,room.z-.6,.035,2.48,1.2,look.wood[0]);
    for(const y of [.22,1.15])box(at(.125,.025),y,room.z-.49,.025,.78,.98,look.wood[1]);
    box(at(.16,.07),.99,room.z+.39,.07,.045,.15,look.metal);
    box(at(.155,.025),1.95,room.z-.27,.025,.3,.54,look.metal);
    // Read left-to-right from either wall, using depth-tested, smooth glyphs.
    const size=.038,sign=left?1:-1,x=left?.185:W-.185;
    for(const [i,digit] of [...room.number].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++){
      if(DIGITS[digit][row][col]!=='1')continue;
      const z=room.z+sign*((i*4+col-5.5)*size),y=2.195-row*size;
      face([{x,y,z},{x,y,z:z+sign*size},{x,y:y-size,z:z+sign*size},{x,y:y-size,z}],look.wood[0],null,true);
    }
  }
  // Three evenly spaced flush ceiling lights, with brass surrounds and warm diffusers.
  for(const z of [D/6,D/2,D*5/6]){
    box(W/2-.48,H-.1,z-.68,.96,.1,1.36,look.metal);
    box(W/2-.4,H-.14,z-.6,.8,.04,1.2,'#f4ddae');
  }
  // Two small framed geometric landscapes, safely flush against the walls.
  for(const [side,z] of [[0,10],[1,14]]){
    const at=(off,w)=>side?W-off-w:off;
    box(at(.03,.08),1.35,z-.62,.08,.74,1.24,look.metal);
    box(at(.11,.015),1.42,z-.55,.015,.6,1.1,'#253c50');
    box(at(.13,.015),1.42,z-.55,.015,.19,1.1,'#64746b');
    box(at(.15,.015),1.76,z+.22,.015,.13,.13,'#d8bd8d');
  }
  drawCorridorWindow(face,box,look,floor);
}

function drawCorridorWindow(face,box,look,floor){
  const {width:W,depth:D,window:{x,y,w,h}}=HOTEL_CORRIDOR;
  const wall=(x,y,z,w,h,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y:y+h,z},{x,y:y+h,z}],color);
  // The same neighbouring skyline appears lower as the player climbs floors.
  const elevation=(floor-1)*HOTEL_STAIRWELL.rise;
  wall(-100,-100,D+65,200,200,'#141a33');
  for(const [sx,sy] of [[-12,9],[-3,7],[6,12],[15,8],[23,15]])wall(sx,sy,D+64,.14,.14,'#c9d0f2');
  wall(-60,-6-elevation,D+4,120,1,'#242332');
  for(let i=0;i<7;i++){
    const bx=-18+i*6,bz=D+12+(i%3)*3,roof=3+(i*7%5)-elevation;
    box(bx,roof-30,bz,5,30,4,i%2?'#443747':'#3d4054');
    box(bx-.1,roof,bz-.1,5.2,.16,4.2,'#77707b');
    for(let row=0;row<8;row++)for(let col=0;col<3;col++){
      const wy=roof-1.8-row*2.8;
      wall(bx+.65+col*1.35,wy,bz-.02,.65,1.1,(i+row+col)%3?'#20273d':'#d4b879');
    }
  }
  for(const [fx,fy,fw,fh] of [[x,y,w,.08],[x,y+h-.08,w,.08],[x,y,.08,h],[x+w-.08,y,.08,h],[x+w/2-.035,y,.07,h],[x,y+h*.55,w,.05]])box(fx,fy,D-.06,fw,fh,.12,look.metal);
  box(x-.1,y-.07,D-.22,w+.2,.07,.38,look.column[0]);
}
