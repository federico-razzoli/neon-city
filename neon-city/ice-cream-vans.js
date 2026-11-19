// SPDX-License-Identifier: AGPL-3.0-only
export const ICE_CREAM_VAN={heightScale:1.2,rear:-2.65,front:1.55,halfWidth:1.05,doorHalf:.82,floor:.526};
export const ICE_CREAM_VENDOR={type:17,x:.2,z:.65,height:1.85};
export function iceCreamVanLocal(van,point){
  const sign=van.first?1:-1;
  return {x:(point.x-van.x)*sign,z:-(point.z-van.z)*sign};
}
export function iceCreamVanSolid(van,x,z,radius){
  const p=iceCreamVanLocal(van,{x,z}),v=ICE_CREAM_VAN;
  for(const side of [-1,1])if(van.cabDoorOpen?.[side]&&Math.abs(p.x-2.6)<.05+radius&&p.z*side>1.025-radius&&p.z*side<2.225+radius)return true;
  // The cab stays solid. The open rear doorway leads directly into the street model.
  if(p.x>=v.front-radius&&p.x<2.9+radius&&Math.abs(p.z)<1.15+radius)return true;
  if(van.doorOpen&&p.x>=v.rear-v.doorHalf*2-radius&&p.x<=v.rear+radius&&Math.abs(p.z+v.doorHalf)<.04+radius)return true;
  if(p.x<v.rear-radius||p.x>v.front+radius||Math.abs(p.z)>1.65+radius)return false;
  if(Math.abs(p.z)>v.halfWidth-radius)return true;
  if(p.x<v.rear+radius&&(!van.doorOpen||Math.abs(p.z)>v.doorHalf-radius))return true;
  if(p.x>-2.3-radius&&p.x<-.9+radius&&p.z<-.55+radius)return true;
  if(Math.hypot(p.x-ICE_CREAM_VENDOR.x,p.z-ICE_CREAM_VENDOR.z)<.25+radius)return true;
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
  const doorway=vanTargetDistance(player,van,v.rear-.08,-v.doorHalf,v.rear+.08,v.doorHalf);
  const leaf=van.doorOpen?vanTargetDistance(player,van,v.rear-v.doorHalf*2,-v.doorHalf-.04,v.rear,-v.doorHalf+.04):Infinity;
  if(!Number.isFinite(doorway)&&!Number.isFinite(leaf))return null;
  if(van.doorOpen&&Math.abs(p.x-v.rear)<.45-1e-6&&Math.abs(p.z)<v.doorHalf+.45)return "I SHOULD STEP CLEAR OF THE DOOR.";
  van.doorOpen=!van.doorOpen;
  return ''; // Handled silently; null means there was no interaction.
}

export function interactIceCreamVendor(player,van){
  if(player.riverWalk)return null;
  const p=iceCreamVanLocal(van,player),v=ICE_CREAM_VAN;
  if(p.x<v.rear+.35||p.x>v.front-.35||Math.abs(p.z)>v.halfWidth-.3)return null;
  const sign=van.first?1:-1,dx=(ICE_CREAM_VENDOR.x-p.x)*sign,dz=-(ICE_CREAM_VENDOR.z-p.z)*sign;
  const distance=Math.hypot(dx,dz);
  if(distance>1.8||distance<.01||(Math.sin(player.angle)*dx+Math.cos(player.angle)*dz)/distance<.6)return null;
  return 'CLIENTS ON THE OTHER SIDE, PLEASE.';
}

// Choose the first object along the player's view, so aiming at a tray doesn't
// trigger the vendor's wider conversation cone instead.
function vanTargetDistance(player,van,minX,minZ,maxX,maxZ){
  const p=iceCreamVanLocal(van,player),sign=van.first?1:-1;
  let near=0,far=1.9;
  for(const [position,direction,min,max] of [[p.x,Math.sin(player.angle)*sign,minX,maxX],[p.z,-Math.cos(player.angle)*sign,minZ,maxZ]]){
    if(Math.abs(direction)<1e-9){if(position<min||position>max)return Infinity;continue;}
    const a=(min-position)/direction,b=(max-position)/direction;
    near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    if(near>far)return Infinity;
  }
  return near;
}
// The cab has two seats: -1 is the driver's, on the left; 1 is the passenger's.
export function iceCreamVanCabSeat(van,seat){
  const sign=van.first?1:-1;
  return {x:van.x+1.93*sign,z:van.z-.52*seat*sign};
}
// The dome light's lens, in van-local metres (y is world height, including the van's .04 lift).
export const ICE_CREAM_VAN_CAB_LIGHT={x:2.05,y:.04+2.128*ICE_CREAM_VAN.heightScale,z:0};
// The knot of the arbre magique under the mirror, in the same coordinates.
export const ARBRE_MAGIQUE_TREE={x:2.56,y:.04+1.98*ICE_CREAM_VAN.heightScale,z:0};
// The railing beside the driver's side keeps the left-hand cab door shut, inside and out.
export const LEFT_CAB_DOOR_REPLY="CAN'T OPEN THIS DOOR. THE RAILING IS TOO CLOSE.";
// The steering wheel's hub, in front of the driver's (left) seat.
const STEERING_WHEEL={x:2.08,y:.04+1.35*ICE_CREAM_VAN.heightScale,z:-.52};
// The angle in radians between the seated player's gaze and a point in the van.
function gazeAngle(player,van,pitch,eye,target){
  const p=iceCreamVanLocal(van,player),sign=van.first?1:-1;
  const dx=target.x-p.x,dy=target.y-eye,dz=target.z-p.z,distance=Math.hypot(dx,dy,dz);
  if(distance>1.5||distance<.01)return Infinity;
  const look=[Math.cos(pitch)*Math.sin(player.angle)*sign,Math.sin(pitch),-Math.cos(pitch)*Math.cos(player.angle)*sign];
  return Math.acos(Math.max(-1,Math.min(1,(look[0]*dx+look[1]*dy+look[2]*dz)/distance)));
}
// What a seated player looks at in the cab: 'tree', 'light', 'wheel', 'right-door', 'left-door' or null.
// Each small object accepts gazes within its own tolerance: 15 degrees for the hanging card
// (about 5cm below its knot), 30 for the lens beside and above each seat, near the turning
// limit, and 36 for the wheel, which lies below the 45-degree downward limit. Where
// tolerances overlap, the object looked at most directly, relative to its tolerance, wins.
// Doors, being large, are checked in plan only when no object is in view.
export function iceCreamVanCabTarget(player,van,pitch,eye){
  const objects=[
    ['tree',{...ARBRE_MAGIQUE_TREE,y:ARBRE_MAGIQUE_TREE.y-.05},Math.PI/12,!van.arbreMagiqueTaken],
    ['light',ICE_CREAM_VAN_CAB_LIGHT,Math.PI/6,true],
    // Only the driver, on the left seat (negative local z), can reach the wheel.
    ['wheel',STEERING_WHEEL,Math.PI/5,iceCreamVanLocal(van,player).z<0]
  ];
  let best=null,ratio=1;
  for(const [kind,target,tolerance,present] of objects){
    const r=present?gazeAngle(player,van,pitch,eye,target)/tolerance:Infinity;
    if(r<ratio){best=kind;ratio=r;}
  }
  if(best)return best;
  // The right-hand door: its closed doorway, or its opened leaf.
  if(Number.isFinite(vanTargetDistance(player,van,1.38,1.025-.08,2.66,1.025+.08)))return 'right-door';
  if(van.cabDoorOpen?.[1]&&Number.isFinite(vanTargetDistance(player,van,2.56,1.025,2.7,2.225)))return 'right-door';
  if(Number.isFinite(vanTargetDistance(player,van,1.38,-1.025-.08,2.66,-1.025+.08)))return 'left-door';
  return null;
}
// A clear spot on the road beside the open right-hand door, behind its leaf and
// outside the cab's collision footprint for the player's .45 radius.
export function iceCreamVanCabExit(van){
  const sign=van.first?1:-1;
  return {x:van.x+2.05*sign,z:van.z-1.75*sign};
}
export function interactIceCreamVan(player,van){
  if(player.riverWalk)return null;
  const v=ICE_CREAM_VAN,p=iceCreamVanLocal(van,player),targets=[];
  const add=(kind,...bounds)=>{const distance=vanTargetDistance(player,van,...bounds);if(Number.isFinite(distance))targets.push({kind,distance});};
  for(const side of [-1,1])if(p.z*side>=1.05){
    if(!van.cabDoorOpen?.[side])add(`cab:${side}`,1.38,side*1.025-.08,2.66,side*1.025+.08);
    else add(`seat:${side}`,1.55,-.85,2.5,.85);
    if(van.cabDoorOpen?.[side])add(`cab:${side}`,2.56,Math.min(side*1.025,side*2.225),2.7,Math.max(side*1.025,side*2.225));
  }
  add('door',v.rear-.08,-v.doorHalf,v.rear+.08,v.doorHalf);
  if(van.doorOpen)add('door',v.rear-v.doorHalf*2,-v.doorHalf-.04,v.rear,-v.doorHalf+.04);
  // Trays and cones are interactive only from inside the van.
  if(p.x>=v.rear+.1&&p.x<=v.front-.1&&p.z>-.55&&p.z<v.halfWidth){
    for(const x of [-1.65,-1.05,-.45])add('food',x-.27,.75,x+.27,1.3);
    add('food',.18,1,.95,1.4);
  }
  if(p.x>=v.rear+.1&&p.x<=v.front-.1&&Math.abs(p.z)<v.halfWidth)
    add('food',-2.3,-.95,-.9,-.55);
  if(p.x>=v.rear+.35&&p.x<=v.front-.35&&Math.abs(p.z)<=v.halfWidth-.3)
    add('vendor',ICE_CREAM_VENDOR.x-.35,ICE_CREAM_VENDOR.z-.2,ICE_CREAM_VENDOR.x+.35,ICE_CREAM_VENDOR.z+.2);
  targets.sort((a,b)=>a.distance-b.distance);
  for(const target of targets){
    if(target.kind.startsWith('seat:')){
      const side=Number(target.kind.slice(5)),sign=van.first?1:-1;
      return {cabVan:van,side,seat:-1,...iceCreamVanCabSeat(van,-1),angle:sign*Math.PI/2,eye:.04+1.9*ICE_CREAM_VAN.heightScale};
    }
    if(target.kind.startsWith('cab:')){
      const side=Number(target.kind.slice(4));
      if(side===-1)return LEFT_CAB_DOOR_REPLY;van.cabDoorOpen??={};van.cabDoorOpen[side]=!van.cabDoorOpen[side];return '';
    }
    if(target.kind==='food')return 'DO NOT TOUCH, PLEASE.';
    const reply=target.kind==='door'?interactIceCreamVanDoor(player,van):interactIceCreamVendor(player,van);
    if(reply!==null)return reply;
  }
  return null;
}
