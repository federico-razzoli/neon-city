// SPDX-License-Identifier: AGPL-3.0-only
import {facingCounterObject,facingDoorway,facingNearest} from './pub-interior.js?v=bar-taps-1';

export const blueNoteDoor={x:8,z:0},blueNoteSpawn={x:8,z:1.2,angle:0,blueLevel:0};
export const blueNoteBins=[3.4,6.9].flatMap(z=>[
  {x:2.7,z,w:4.25,d:1.35},{x:9.05,z,w:4.25,d:1.35}
]);
export const counter={x:0,z:10.6,w:6.4,d:1};
export const clerk={x:3.55,z:12.1,radius:.5};
const records={x:counter.x+counter.w-.60,z:counter.z+.495,radius:.35};
const till={x:counter.x+.74,z:counter.z+.425,radius:.38};
export function blueNoteReply(player){
  if(player.blueLevel===2){
    if(facingCounterObject(player,instrumentTill))return "IT'S A BEAUTIFUL TILL.";
    if(player.z>instrumentDesk.z+instrumentDesk.d&&facingNearest(player,[instrumentClerk]))return 'CUSTOMERS ON THE OTHER SIDE, PLEASE.';
    return null;
  }
  if(player.blueLevel)return null;
  if(facingCounterObject(player,records))return 'SOME INDIE MUSIC.';
  if(facingCounterObject(player,till))return "DON'T TOUCH IT PLEASE.";
  if(player.z>counter.z+counter.d&&facingNearest(player,[clerk]))return 'CUSTOMERS ON THE OTHER SIDE, PLEASE.';
  return null;
}
export const blueNoteStairs=[
  {x:9.9,z:9.89,w:6.1,d:1.845,direction:1,label:'1ST FLOOR'},
  {x:9.9,z:11.855,w:6.1,d:2.145,direction:-1}
];
export const counterOverhang=.05,stairWallThickness=.10;
export const wallRecordRacks=[
  {x:0,z:0,w:.78,d:counter.z-counterOverhang},
  {x:15.22,z:0,w:.78,d:blueNoteStairs[0].z-stairWallThickness}
];
const [upper,lower]=blueNoteStairs;
export const stairRun=.29*17,flightDrop=.18*17,basementFloor=-2*flightDrop;
export const instrumentDesk={x:0,z:10,w:7,d:1},instrumentClerk={x:4,z:11.5,radius:.5};
export const instrumentTill={x:instrumentDesk.x+.74,z:instrumentDesk.z+.475,radius:.38};
export const keyboardTables=[3,8].map(x=>({x,z:4,w:2.7,d:.85}));
export const pedalCase={x:upper.x+.45,z:upper.z-stairWallThickness-.52,w:4.55,d:.52,h:2.12};
export const amplifiers=[
  {z:.65,w:.26,d:.52,h:.41,style:'mini'},
  {z:1.38,w:.42,d:.76,h:.62,style:'compact'},
  {z:2.34,w:.52,d:1.04,h:.82,style:'brown'},
  {z:3.58,w:.42,d:.76,h:.62,style:'compact'},
  {z:4.54,w:.52,d:1.04,h:.82,style:'brown'},
  {z:5.78,w:.72,d:1.22,h:1.48,style:'bass'},
  {z:7.20,w:.75,d:1.04,h:2.08,style:'tower'},
  {z:8.44,w:.72,d:1.22,h:1.48,style:'bass'}
].map(amp=>({...amp,x:16-amp.w}));
const staffFootprint=at=>({x:at.x-.35,z:at.z-.25,w:.7,d:.5});
const groundFixtures=[...blueNoteBins,...wallRecordRacks,counter,upper,
  {x:upper.x,z:upper.z+upper.d,w:upper.w,d:lower.z-upper.z-upper.d},staffFootprint(clerk)];
const basementFixtures=[pedalCase,instrumentDesk,staffFootprint(instrumentClerk),...keyboardTables,...amplifiers,
  {x:0,z:0,w:16,d:.45}];
export function blueNoteFloor(actor){
  if(actor.blueLevel===2)return basementFloor;
  if(actor.blueLevel!==1)return 0;
  const progress=Math.max(0,Math.min(1,(actor.x-upper.x)/stairRun));
  return actor.z>=lower.z?-progress*flightDrop:basementFloor+progress*flightDrop;
}
export function moveInBlueNote(actor,dx,dz){
  function move(x,z){
    if(x<.28||x>15.72||z<.28||z>13.72)return;
    let level=actor.blueLevel||0;
    const inUpper=z>=upper.z+.28&&z<=upper.z+upper.d-.28;
    const inLower=z>=lower.z+.28;
    if(level===1){
      if(x<upper.x)level=inLower?0:2;
      else if(z<upper.z+.28||(!inUpper&&!inLower&&x<upper.x+stairRun+.28))return;
    }else{
      const fixtures=level===2?basementFixtures:groundFixtures;
      if(fixtures.some(r=>x>r.x-.28&&x<r.x+r.w+.28&&z>r.z-.28&&z<r.z+r.d+.28))return;
      if(x>=upper.x-.28&&z>=upper.z-.28){
        if(level===2&&!inUpper||level===0&&!inLower)return;
        if(x>=upper.x){
          if(actor.x>=upper.x)return;
          level=1;
        }
      }
    }
    actor.x=x;actor.z=z;actor.blueLevel=level;
  }
  move(actor.x+dx,actor.z);
  move(actor.x,actor.z+dz);
}
export function blueNoteStairFacing(player){
  if(player.blueLevel)return null;
  // Express the sightline in the west-facing doorway's coordinate system.
  const view={x:player.z,z:player.x,angle:Math.PI/2-player.angle};
  return blueNoteStairs.find(s=>player.x<s.x&&facingDoorway(view,{x:s.z+s.d/2,z:s.x},s.d/2,2));
}
export const facingBlueNoteExit=player=>!player.blueLevel&&facingDoorway(player,blueNoteDoor,.85);
