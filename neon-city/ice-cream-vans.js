// SPDX-License-Identifier: AGPL-3.0-only
export const ICE_CREAM_VAN={heightScale:1.2,rear:-2.65,front:1.55,halfWidth:1.05,doorHalf:.82,floor:.526};
export function iceCreamVanLocal(van,point){
  const sign=van.first?1:-1;
  return {x:(point.x-van.x)*sign,z:-(point.z-van.z)*sign};
}
export function iceCreamVanSolid(van,x,z,radius){
  const p=iceCreamVanLocal(van,{x,z}),v=ICE_CREAM_VAN;
  // The cab stays solid. The open rear doorway leads directly into the street model.
  if(p.x>=v.front-radius&&p.x<2.9+radius&&Math.abs(p.z)<1.15+radius)return true;
  if(van.doorOpen&&p.x>=v.rear-v.doorHalf*2-radius&&p.x<=v.rear+radius&&Math.abs(p.z+v.doorHalf)<.04+radius)return true;
  if(p.x<v.rear-radius||p.x>v.front+radius||Math.abs(p.z)>1.65+radius)return false;
  if(Math.abs(p.z)>v.halfWidth-radius)return true;
  if(p.x<v.rear+radius&&(!van.doorOpen||Math.abs(p.z)>v.doorHalf-radius))return true;
  // Counter and cupboards leave the central aisle clear.
  return p.x>-.2-radius&&p.z>.65-radius;
}
export function iceCreamVanFloor(van,player){
  const p=iceCreamVanLocal(van,player),v=ICE_CREAM_VAN;
  if((!van.doorOpen&&p.x<v.rear)||Math.abs(p.z)>v.halfWidth||p.x>v.front||p.x<v.rear-1.2)return 0;
  // A shallow rear ramp lets the street camera rise naturally into the van.
  return v.floor*Math.max(0,Math.min(1,(p.x-v.rear+1.2)/1.2));
}
export function interactIceCreamVanDoor(player,van){
  if(player.riverWalk)return null;
  const p=iceCreamVanLocal(van,player),v=ICE_CREAM_VAN;
  if(Math.abs(p.x-v.rear)>1.9||Math.abs(p.z)>.95)return null;
  const sign=van.first?1:-1,dx=(v.rear-p.x)*sign,dz=p.z*sign;
  const distance=Math.hypot(dx,dz);
  if(distance>.15&&(Math.sin(player.angle)*dx+Math.cos(player.angle)*dz)/distance<.65)return null;
  if(van.doorOpen&&Math.abs(p.x-v.rear)<.5&&Math.abs(p.z)<v.doorHalf+.45)return "I SHOULD STEP CLEAR OF THE DOOR.";
  van.doorOpen=!van.doorOpen;
  return van.doorOpen?'THE VAN DOOR IS OPEN.':'THE VAN DOOR IS CLOSED.';
}
