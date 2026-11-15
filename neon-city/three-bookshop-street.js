// SPDX-License-Identifier: AGPL-3.0-only
import {Matrix4,Plane,Vector3} from './vendor/three/three.module.js';
import {entranceWall} from './entrances.js';
import {BOOKSHOP} from './midnite-interior.js';
import {bookshopWindowView} from './bookshop-window-view.js';
import {createVenueStreetWindow} from './three-venue-street-window.js';

// Convert the room's south-facing storefront to the actual entrance in the city.
export function bookshopStreetView(frame,boundsVisible=null){
  const wall=entranceWall(frame.currentVenue),{nx,nz}=wall,tx=-nz,tz=nx;
  const across=frame.player.x-BOOKSHOP.door.x,depth=frame.player.z;
  const forwardX=tx*Math.sin(frame.player.angle)-nx*Math.cos(frame.player.angle);
  const forwardZ=tz*Math.sin(frame.player.angle)-nz*Math.cos(frame.player.angle);
  const player={...frame.player,x:wall.x+tx*across-nx*depth,z:wall.z+tz*across-nz*depth,angle:Math.atan2(forwardX,forwardZ)};
  const transform=new Matrix4().set(tx,0,-tz,BOOKSHOP.door.x-tx*wall.x-tz*wall.z,
    0,1,0,0,nx,0,-nz,-nx*wall.x-nz*wall.z,0,0,0,1);
  // Keep loaded chunks cached even outside the window view; draw culling
  // handles visibility. Omit the shop shell supplied by the interior.
  const chunks=new Map([...frame.city.chunks].map(([key,chunk])=>[key,{...chunk,buildings:chunk.buildings.filter(b=>b!==frame.currentVenue)}]));
  return {transform,frame:{...frame,player,city:{...frame.city,chunks},indoors:false,insideBookshop:false,
    playerSeat:null,windowView:{pitch:frame.playerSeat?.pitch??0},
    skyView:{...frame.skyView,angle:player.angle,pitch:frame.playerSeat?.pitch??0}}};
}

export function createBookshopStreet(scene,options={}){
  return createVenueStreetWindow(scene,{
    ...options,
    canUpdate:frame=>!!frame.currentVenue&&!!frame.skyView,
    windowViewFor:bookshopWindowView,
    streetViewFor:bookshopStreetView,
    clippingPlanes:[new Plane(new Vector3(0,0,1),0)],
    preparationViews:frame=>[[4,2.4],[14,2.4],[9,6]].map(([x,z])=>({
      ...frame,player:{...frame.player,x,z,angle:Math.PI},playerSeat:null
    }))
  });
}
