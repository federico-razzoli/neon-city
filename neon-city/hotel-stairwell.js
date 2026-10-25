import {register} from './register.js';
import {facingDoorway,facingNearest,drawRod} from './pub-interior.js?v=taps-turned-1';
import {hotelInteriorLook,drawHotelDoubleDoor,STAIR_CARPET} from './hotel-interior.js?v=street-lights-1';

// Door frames are 2.65m tall: the former 1.35m gap above them is now 2.025m.
export const HOTEL_STAIRWELL={width:8,depth:16,rise:4.675,floors:3,steps:24,stairStart:3,stairEnd:13,spawn:{x:4,z:1.2,angle:0}};
const {depth:D,rise:R,steps:N,stairStart:S,stairEnd:E}=HOTEL_STAIRWELL;
const RUN=E-S;
export const createHotelStairwell=()=>({floor:1,flight:null});
export function stairwellHeight(player,state){
  if(state.flight===1)return (player.z-S)*R/RUN;
  if(state.flight===2)return R+(E-player.z)*R/RUN;
  return (state.floor-1)*R;
}
export const facingStairwellExit=(player,state)=>state.floor===1&&state.flight===null&&facingDoorway(player,{x:4,z:0},1.2);
export const facingHotelCorridor=(player,state)=>state.flight===null&&facingDoorway(player,{x:4,z:D},1.2);

export const STAIRWELL_LIGHT_REPLY='THIS REMINDS ME... WHY DO THE STREETS HAVE NO LIGHTS?';
const stairwellLights=()=>[1.2,6.8].map(x=>({x,z:D-.2,radius:.25,reach:1.8}));
export function interactStairwellLight(player,state,record=register){
  if(state.flight!==null||!facingNearest(player,stairwellLights()))return null;
  record.STREETS_HAVE_NO_LIGHTS=true;
  return STAIRWELL_LIGHT_REPLY;
}

// The two flights share one continuous space: east rises northwards to floor 2,
// west rises southwards to floor 3. Railings prevent entering either from the side.
export function moveInHotelStairwell(player,dx,dz,state){
  const step=(x,z)=>{
    if(x<.3||x>7.7||z<.3||z>D-.3)return;
    if(state.flight!==null){
      if(state.flight===1&&x<5.3||state.flight===2&&x>2.7)return;
      if(z<=S){state.floor=state.flight===1?1:3;state.flight=null;}
      else if(z>=E){state.floor=2;state.flight=null;}
    }else{
      const east=state.floor<3,west=state.floor>1;
      // Guard the open sides and the closed ends of the upper-floor wells.
      if(z>S-.3&&z<E+.3&&((east&&Math.abs(x-5)<.3)||(west&&Math.abs(x-3)<.3)))return;
      if(state.floor===2&&x>5&&z>S-.3&&z<=S+.3)return;
      if(state.floor===3&&x<3&&z>=E-.3&&z<E+.3)return;
      if(z>S&&z<E){
        if(east&&x>=5.3){
          if(!(state.floor===1&&player.z<=S||state.floor===2&&player.z>=E))return;
          state.flight=1;
        }else if(west&&x<=2.7){
          if(!(state.floor===2&&player.z>=E||state.floor===3&&player.z<=S))return;
          state.flight=2;
        }
      }
    }
    player.x=x;player.z=z;
  };
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<count;i++){
    if(dx)step(player.x+dx/count,player.z);
    if(dz)step(player.x,player.z+dz/count);
  }
}

export function drawHotelStairwell({face,quad,box,look:facade}){
  const look=hotelInteriorLook(facade),rod=(a,b,r,color)=>drawRod(face,a,b,r,color);
  for(let level=0;level<3;level++){
    const y=level*R;
    // Floor openings follow the descending flight, including its lower end.
    for(let x=0;x<8;x++)for(let z=0;z<D;z++){
      if(z>=S&&z<E&&(level===1&&x>=5||level===2&&x<3))continue;
      box(x,y-.12,z,1,.12,1,look.column[1],look.floor[(x+z)%2]);
    }
    quad(3.15,y+.008,.2,1.7,D-.4,look.carpet);
    for(const x of [3.1,4.85])quad(x,y+.01,.2,.05,D-.4,look.metal);
    for(const [x,z,w,d] of [[-.12,0,.12,D],[8,0,.12,D],[0,-.12,8,.12],[0,D,8,.12]]){
      box(x,y,z,w,1.05,d,look.panel);
      box(x,y+1.05,z,w,.06,d,look.metal);
      box(x,y+1.11,z,w,R-1.11,d,look.wall);
    }
    // Every corridor has the same double doors as the lobby entrance.
    drawHotelDoubleDoor(box,4,y,D-.08,look);
    box(3.65,y+2.76,D-.11,.7,.25,.05,look.wood[0]);
    for(let i=0;i<=level;i++)box(4-level*.07+i*.14-.02,y+2.8,D-.18,.04,.16,.04,look.metal);
    // Warm wall lights and a coffered border use the lobby's own finishes.
    for(const {x} of stairwellLights()){
      box(x-.1,y+1.75,D-.17,.2,.45,.06,look.metal);
      box(x-.14,y+1.95,D-.28,.28,.28,.18,'#d8bd8d','#f4ddae');
    }
    for(const x of [0,7.85])box(x,y+R-.15,0,.15,.15,D,look.wood[0]);
  }
  for(let x=0;x<8;x++)for(let z=0;z<D;z++)quad(x,3*R,z,1,1,look.panel);
  drawHotelDoubleDoor(box,4,0,.06,look,1);
  // A plain service door in the recess beyond the upward flight on floor 2.
  const storageX=1.5;
  box(storageX-.57,R,.015,1.14,2.18,.1,'#514d46');
  box(storageX-.5,R+.025,.12,1,2.08,.045,'#777568');
  box(storageX+.36,R+.91,.17,.075,.2,.025,'#444642');
  box(storageX+.29,R+1.02,.195,.13,.035,.045,'#a3a397');
  box(storageX-.4,R+1.58,.17,.8,.22,.025,'#c4c1ad');
  // Lettering faces into the room: screen-right is decreasing world x here.
  const letters={
    S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    O:['111','101','101','101','111'],R:['110','101','110','101','101'],
    A:['010','101','111','101','101'],G:['111','100','101','101','111'],
    E:['111','100','110','100','111']
  },word='STORAGE',size=.024;
  for(const [i,char] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    if(letters[char][row][col]!=='1')continue;
    const x=storageX+(word.length*4-1)*size/2-(i*4+col+1)*size,y=R+1.75-(row+1)*size;
    face([{x,y,z:.2},{x:x+size,y,z:.2},{x:x+size,y:y+size,z:.2},{x,y:y+size,z:.2}],'#30332e');
  }

  for(const flight of [1,2]){
    const x=flight===1?5:0,base=(flight-1)*R,railX=flight===1?5.04:2.96;
    for(let i=0;i<N;i++){
      const z=flight===1?S+i*RUN/N:E-(i+1)*RUN/N,h=(i+1)*R/N;
      box(x,base,z,3,h,RUN/N,look.column[1],look.column[0]);
      box(x+.45,base+h-R/N,z-.005,2.1,R/N+.012,RUN/N+.01,...STAIR_CARPET);
      box(x+.4,base+h+.014,flight===1?z+.02:z+RUN/N-.04,2.2,.025,.025,look.metal);
      if(i%2===0)box(railX-.025,base+h,z+RUN/N/2,.05,.95,.05,look.metal);
    }
    const bottom=flight===1?S:E,top=flight===1?E:S;
    rod({x:railX,y:base+1,z:bottom},{x:railX,y:base+R+1,z:top},.045,look.wood[0]);
    // Upper landing guardrails along the well and across its far end.
    for(let z=S;z<=E;z+=.5)box(railX-.025,base+R,z,.05,1,.05,look.metal);
    rod({x:railX,y:base+R+1,z:S},{x:railX,y:base+R+1,z:E},.045,look.wood[0]);
    for(let t=.2;t<3;t+=.5)box(x+t,base+R,bottom-.025,.05,1,.05,look.metal);
    rod({x,y:base+R+1,z:bottom},{x:x+3,y:base+R+1,z:bottom},.045,look.wood[0]);
  }
}
