// SPDX-License-Identifier: AGPL-3.0-only
import {BOOKSHOP} from './midnite-interior.js';
import {entranceWall} from './entrances.js';
import {createRenderCamera} from './render-camera.js';

// Conservative cones from the eye through each visible display window. Reject
// exterior bounds before building their geometry, rather than clipping on GPU.
export function bookshopWindowView(frame){
  const camera=createRenderCamera();
  camera.set({position:frame.player,eye:frame.eye,pitch:frame.playerSeat?.pitch??0});
  const windows=BOOKSHOP.windowShelves.filter(b=>camera.boundsVisible(b.x+.12,.95,.04,b.x+b.w-.12,2.75,.04));
  const {x:px,z:pz}=frame.player,eye=frame.eye,distance=pz-.04;
  if(!windows.length||distance<=0)return {visible:false,boundsVisible:()=>false};
  const wall=entranceWall(frame.currentVenue),{nx,nz}=wall,tx=-nz,tz=nx;
  const offsetX=BOOKSHOP.door.x-tx*wall.x-tz*wall.z,offsetZ=nx*wall.x+nz*wall.z;
  const cones=windows.map(b=>{
    const left=b.x+.12,right=b.x+b.w-.12,bottom=.95,top=2.75;
    return [[distance,0,left-px,-distance*px-(left-px)*pz],
      [-distance,0,px-right,distance*px-(px-right)*pz],
      [0,distance,bottom-eye,-distance*eye-(bottom-eye)*pz],
      [0,-distance,eye-top,distance*eye-(eye-top)*pz],
      [0,0,-1,.04]].map(([a,b,c,d])=>[a*tx-c*nx,b,a*tz-c*nz,d+a*offsetX+c*offsetZ]);
  });
  return {visible:true,boundsVisible(minX,minY,minZ,maxX,maxY,maxZ){
    const x=(minX+maxX)/2,y=(minY+maxY)/2,z=(minZ+maxZ)/2;
    const rx=(maxX-minX)/2,ry=(maxY-minY)/2,rz=(maxZ-minZ)/2;
    return cones.some(planes=>planes.every(([a,b,c,d])=>a*x+b*y+c*z+d+Math.abs(a)*rx+Math.abs(b)*ry+Math.abs(c)*rz>=-1e-8));
  }};
}
