// SPDX-License-Identifier: AGPL-3.0-only
import {Matrix4,Plane,Vector3} from './vendor/three/three.module.js';
import {entranceWall} from './entrances.js';
import {createRenderCamera} from './render-camera.js';

import {createVenueStreetWindow} from './three-venue-street-window.js';

// Conservative cones from the eye through each visible display window. Reject
// exterior bounds before building their geometry, rather than clipping on GPU.
export function storefrontWindowView(frame,{panes,doorX}){
  const camera=createRenderCamera();
  camera.set({position:frame.player,eye:frame.eye,pitch:frame.playerSeat?.pitch??0});
  const windows=panes.filter(p=>camera.boundsVisible(p.x,p.y,p.z,p.x+p.w,p.y+p.h,p.z));
  const {x:px,z:pz}=frame.player,eye=frame.eye;
  if(!windows.length)return {visible:false,boundsVisible:()=>false};
  const wall=entranceWall(frame.currentVenue),{nx,nz}=wall,tx=-nz,tz=nx;
  const offsetX=doorX-tx*wall.x-tz*wall.z,offsetZ=nx*wall.x+nz*wall.z;
  const cones=windows.filter(p=>pz>p.z).map(p=>{
    const left=p.x,right=p.x+p.w,bottom=p.y,top=p.y+p.h,distance=pz-p.z;
    return [[distance,0,left-px,-distance*px-(left-px)*pz],
      [-distance,0,px-right,distance*px-(px-right)*pz],
      [0,distance,bottom-eye,-distance*eye-(bottom-eye)*pz],
      [0,-distance,eye-top,distance*eye-(eye-top)*pz],
      [0,0,-1,p.z]].map(([a,b,c,d])=>[a*tx-c*nx,b,a*tz-c*nz,d+a*offsetX+c*offsetZ]);
  });
  return {visible:cones.length>0,boundsVisible(minX,minY,minZ,maxX,maxY,maxZ){
    const x=(minX+maxX)/2,y=(minY+maxY)/2,z=(minZ+maxZ)/2;
    const rx=(maxX-minX)/2,ry=(maxY-minY)/2,rz=(maxZ-minZ)/2;
    return cones.some(planes=>planes.every(([a,b,c,d])=>a*x+b*y+c*z+d+Math.abs(a)*rx+Math.abs(b)*ry+Math.abs(c)*rz>=-1e-8));
  }};
}

// Convert the room's south-facing storefront to the actual entrance in the city.
export function storefrontStreetView(frame,doorX){
  const wall=entranceWall(frame.currentVenue),{nx,nz}=wall,tx=-nz,tz=nx;
  const across=frame.player.x-doorX,depth=frame.player.z;
  const forwardX=tx*Math.sin(frame.player.angle)-nx*Math.cos(frame.player.angle);
  const forwardZ=tz*Math.sin(frame.player.angle)-nz*Math.cos(frame.player.angle);
  const player={...frame.player,x:wall.x+tx*across-nx*depth,z:wall.z+tz*across-nz*depth,angle:Math.atan2(forwardX,forwardZ)};
  const transform=new Matrix4().set(tx,0,-tz,doorX-tx*wall.x-tz*wall.z,
    0,1,0,0,nx,0,-nz,-nx*wall.x-nz*wall.z,0,0,0,1);
  // Keep loaded chunks cached even outside the window view; draw culling
  // handles visibility. Omit the shop shell supplied by the interior.
  const chunks=new Map([...frame.city.chunks].map(([key,chunk])=>[key,{...chunk,buildings:chunk.buildings.filter(b=>b!==frame.currentVenue)}]));
  return {transform,frame:{...frame,player,city:{...frame.city,chunks},indoors:false,insideBookshop:false,insideBlueNote:false,
    playerSeat:null,windowView:{pitch:frame.playerSeat?.pitch??0},
    skyView:{...frame.skyView,angle:player.angle,pitch:frame.playerSeat?.pitch??0}}};
}

export function createStorefrontStreet(scene,layout,options={}){
  return createVenueStreetWindow(scene,{
    ...options,
    canUpdate:frame=>!!frame.currentVenue&&!!frame.skyView,
    windowViewFor:frame=>storefrontWindowView(frame,layout),
    streetViewFor:frame=>storefrontStreetView(frame,layout.doorX),
    clippingPlanes:[new Plane(new Vector3(0,0,1),0)],
    preparationViews:frame=>layout.preparationPoints.map(([x,z])=>({
      ...frame,player:{...frame.player,x,z,angle:Math.PI},playerSeat:null
    }))
  });
}
