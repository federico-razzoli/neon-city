// SPDX-License-Identifier: AGPL-3.0-only
import {facingCounterObject,facingDoorway,facingNearest} from './pub-interior.js?v=bar-taps-1';

export const blueNoteDoor={x:8,z:0},blueNoteSpawn={x:8,z:1.2,angle:0};
export const blueNoteBins=[3.4,6.9].flatMap(z=>[
  {x:2.7,z,w:4.25,d:1.35},{x:9.05,z,w:4.25,d:1.35}
]);
export const counter={x:0,z:10.6,w:6.4,d:1};
export const clerk={x:3.55,z:12.1,radius:.5};
const records={x:counter.x+counter.w-.60,z:counter.z+.495,radius:.35};
const till={x:counter.x+.74,z:counter.z+.425,radius:.38};
export function blueNoteReply(player){
  if(facingCounterObject(player,records))return 'SOME INDIE MUSIC.';
  if(facingCounterObject(player,till))return "DON'T TOUCH IT PLEASE.";
  if(player.z>counter.z+counter.d&&facingNearest(player,[clerk]))return 'CUSTOMERS ON THE OTHER SIDE, PLEASE.';
  return null;
}
export const blueNoteStairs=[
  {x:9.9,z:9.89,w:6.1,d:1.845,direction:1,label:'1ST FLOOR'},
  {x:9.9,z:11.855,w:6.1,d:2.145,direction:-1,label:'BASEMENT'}
];
export const counterOverhang=.05,stairWallThickness=.10;
export const wallRecordRacks=[
  {x:0,z:0,w:.78,d:counter.z-counterOverhang},
  {x:15.22,z:0,w:.78,d:blueNoteStairs[0].z-stairWallThickness}
];
const fixtures=[...blueNoteBins,...wallRecordRacks,counter,...blueNoteStairs,
  {x:9.9,z:11.735,w:6.1,d:.12},
  {x:clerk.x-.33,z:clerk.z-.22,w:.66,d:.44}];
export function moveInBlueNote(actor,dx,dz){
  const clear=(x,z)=>x>=.28&&x<=15.72&&z>=.28&&z<=13.72&&
    !fixtures.some(r=>x>r.x-.28&&x<r.x+r.w+.28&&z>r.z-.28&&z<r.z+r.d+.28);
  if(clear(actor.x+dx,actor.z))actor.x+=dx;
  if(clear(actor.x,actor.z+dz))actor.z+=dz;
}
export function blueNoteStairFacing(player){
  // Express the sightline in the west-facing doorway's coordinate system.
  const view={x:player.z,z:player.x,angle:Math.PI/2-player.angle};
  return blueNoteStairs.find(s=>player.x<s.x&&facingDoorway(view,{x:s.z+s.d/2,z:s.x},s.d/2,2));
}
export const facingBlueNoteExit=player=>facingDoorway(player,blueNoteDoor,.85);
