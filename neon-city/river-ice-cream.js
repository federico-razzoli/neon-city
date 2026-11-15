// SPDX-License-Identifier: AGPL-3.0-only
import {riverIceCreamVan} from './world.js';
export const ICE_CREAM_STOP_CHANCE=1/3;
export function carriedIceCreamStage(iceCream){
  if(!iceCream||iceCream.age>=30)return null;
  return iceCream.age<10?'full':iceCream.age<20?'bitten':'cone';
}
export function ageCarriedIceCreams(city,dt){
  for(const chunk of city.chunks.values())for(const p of chunk.people)if(p.iceCream){
    p.iceCream.age+=dt;if(p.iceCream.age>=30)delete p.iceCream;
  }
}
const active=m=>m?.mode==='ice-cream'&&m.stage!=='leave';
export function startIceCreamVisit(city,p,before,after,resume,actors){
  if(p.iceCream||resume.mode!=='upper'||!before.facingX)return null;
  for(const chunk of city.chunks.values()){
    const van=riverIceCreamVan(chunk);if(!van||Math.abs(before.z-van.z)>8)continue;
    const key=`${van.x},${van.z}`,heading=before.facingX,trigger=van.x-heading*2.4;
    if((trigger-before.x)*heading<0||(after.x-trigger)*heading<0)continue;
    const last=p.riverMotion.lastIceCreamPass;
    if(last?.key===key&&Math.abs(resume.s-last.s)<20)continue;
    p.riverMotion.lastIceCreamPass={key,s:resume.s};
    resume.lastIceCreamPass=p.riverMotion.lastIceCreamPass;
    const occupants=actors.map(a=>a.p.riverMotion).filter(m=>active(m)&&m.key===key);
    // Reserve a serving place plus at most one waiting place. Others keep walking.
    if(occupants.length>=2||city.rng()>=ICE_CREAM_STOP_CHANCE)return null;
    return {mode:'ice-cream',key,van:{x:van.x,z:van.z,first:van.first},
      slot:occupants.some(m=>m.slot===0)?1:0,stage:'approach',elapsed:0,
      at:{...before},origin:{...after},resume:{...p.riverMotion}};
  }
  return null;
}
export function iceCreamVisitPerson(p){
  const m=p.riverMotion;
  return {...m.at,ground:0,riverWalk:false,type:p.type,variant:p.variant,
    frame:m.stage==='talk'||m.stage==='wait'?1:Math.floor((p.walkTime??0)*p.speed*5+p.phase)%4,
    iceCreamStage:carriedIceCreamStage(p.iceCream),iceCreamFlavour:p.iceCream?.flavour??0};
}
export function advanceIceCreamVisit(p,step,actors){
  const m=p.riverMotion,next={...m,at:{...m.at},grantIceCream:false};
  if(m.slot===1&&!actors.some(a=>a.p!==p&&active(a.p.riverMotion)&&a.p.riverMotion.key===m.key&&a.p.riverMotion.slot===0)){
    next.slot=0;next.stage='approach';
  }
  if(next.stage==='talk'){
    next.elapsed+=step;
    if(next.elapsed>=5-1e-9){next.stage='leave';next.grantIceCream=true;}
    return next;
  }
  if(next.stage==='wait')return next;
  const sign=m.van.first?1:-1;
  // Both places are off the two through lanes, tucked against the serving hatch.
  const target=next.stage==='leave'?(m.exitLeg==='return'?m.origin:{x:m.van.x+sign*2.1,z:m.van.z-sign*3.25}):{x:m.van.x+sign*(next.slot===0?.2:-1.25),z:m.van.z-sign*2.25};
  const dx=target.x-m.at.x,dz=target.z-m.at.z,distance=Math.hypot(dx,dz),travel=Math.min(distance,p.speed*step);
  if(distance>1e-8){
    next.at.x+=dx/distance*travel;next.at.z+=dz/distance*travel;
    next.at.facingX=dx/distance;next.at.facingZ=dz/distance;
  }
  if(distance<=travel+1e-8){
    if(next.stage==='leave'){if(m.exitLeg==='return')return {...m.resume};next.exitLeg='return';return next;}
    next.stage=next.slot===0?'talk':'wait';next.elapsed=0;
    next.at.facingX=0;next.at.facingZ=sign;
  }
  return next;
}
