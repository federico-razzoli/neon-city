/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

import {register} from './register.js';
import {facingDoorway,facingNearest,drawRod} from './pub-interior.js?v=taps-turned-1';
import {hotelInteriorLook,drawHotelDoubleDoor,STAIR_CARPET} from './hotel-interior.js?v=street-lights-1';

// Door frames are 2.65m tall: the former 1.35m gap above them is now 2.025m.
export const HOTEL_STAIRWELL={width:8,depth:16,rise:4.675,floors:3,steps:24,stairStart:3,stairEnd:13,spawn:{x:4,z:1.2,angle:0}};
const {depth:D,rise:R,steps:N,stairStart:S,stairEnd:E}=HOTEL_STAIRWELL;
const RUN=E-S;
// Each hotel keeps its own cash pickup in the first-floor recess beyond the upward flight.
export const stairwellNote=hotel=>hotel.stairwellNote??={x:6.5,z:14.5,ground:0,taken:false};
export const createHotelStairwell=()=>({floor:1,flight:null});
export function stairwellHeight(player,state){
  if(state.flight===1)return (player.z-S)*R/RUN;
  if(state.flight===2)return R+(E-player.z)*R/RUN;
  return (state.floor-1)*R;
}
// Where a dropped item comes to rest: on the tread underfoot, centred along
// it, just above the carpet, rather than on the smooth ramp the view follows.
export function stairwellDropSpot(player,state){
  const tread=RUN/N,lift=.015,step=z=>Math.max(0,Math.min(N-1,Math.floor(z/tread)));
  if(state.flight===1){const i=step(player.z-S);return {x:player.x,z:S+(i+.5)*tread,ground:(i+1)*R/N+lift};}
  if(state.flight===2){const i=step(E-player.z);return {x:player.x,z:E-(i+.5)*tread,ground:R+(i+1)*R/N+lift};}
  return {x:player.x,z:player.z,ground:(state.floor-1)*R+lift};
}
export const facingStairwellExit=(player,state)=>state.floor===1&&state.flight===null&&facingDoorway(player,{x:4,z:0},1.2);
export const facingHotelCorridor=(player,state)=>state.flight===null&&facingDoorway(player,{x:4,z:D},1.2);

// The storage door stands on the west wall, so swap axes to reuse the doorway test.
const STORAGE_DOOR={z:1.5,halfWidth:.5};
// Leaving the storeroom puts the player back before its door, facing east.
export const STORAGE_EXIT={x:.9,z:STORAGE_DOOR.z,angle:Math.PI/2};
export const facingStorageDoor=(player,state)=>state.floor===2&&state.flight===null&&
  facingDoorway({x:player.z,z:player.x,angle:Math.PI/2-player.angle},{x:STORAGE_DOOR.z,z:0},STORAGE_DOOR.halfWidth);

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
  // A plain service door on the west wall of the recess beyond the upward flight on floor 2.
  const storageZ=STORAGE_DOOR.z;
  box(.015,R,storageZ-.57,.1,2.4,1.14,'#514d46');
  box(.12,R+.025,storageZ-.5,.045,2.3,1,'#777568');
  box(.17,R+.91,storageZ+.36,.025,.2,.075,'#444642');
  box(.195,R+1.02,storageZ+.29,.045,.035,.13,'#a3a397');
  box(.17,R+1.8,storageZ-.4,.025,.22,.8,'#c4c1ad');
  // Lettering faces into the room: screen-right is increasing world z here.
  const letters={
    S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    O:['111','101','101','101','111'],R:['110','101','110','101','101'],
    A:['010','101','111','101','101'],G:['111','100','101','101','111'],
    E:['111','100','110','100','111']
  },word='STORAGE',size=.024;
  for(const [i,char] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    if(letters[char][row][col]!=='1')continue;
    const z=storageZ-(word.length*4-1)*size/2+(i*4+col)*size,y=R+1.97-(row+1)*size;
    face([{x:.2,y,z},{x:.2,y,z:z+size},{x:.2,y:y+size,z:z+size},{x:.2,y:y+size,z}],'#30332e');
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
