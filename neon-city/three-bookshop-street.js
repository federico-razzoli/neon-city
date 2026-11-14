// SPDX-License-Identifier: AGPL-3.0-only
import {Matrix4,Plane,Vector3} from './vendor/three/three.module.js';
import {entranceWall} from './entrances.js';
import {BOOKSHOP} from './midnite-interior.js';
import {createThreeStreetScene} from './three-street-scene.js';

// Convert the room's south-facing storefront to the actual entrance in the city.
export function bookshopStreetView(frame){
  const wall=entranceWall(frame.currentVenue),{nx,nz}=wall,tx=-nz,tz=nx;
  const across=frame.player.x-BOOKSHOP.door.x,depth=frame.player.z;
  const forwardX=tx*Math.sin(frame.player.angle)-nx*Math.cos(frame.player.angle);
  const forwardZ=tz*Math.sin(frame.player.angle)-nz*Math.cos(frame.player.angle);
  const player={...frame.player,x:wall.x+tx*across-nx*depth,z:wall.z+tz*across-nz*depth,angle:Math.atan2(forwardX,forwardZ)};
  const transform=new Matrix4().set(tx,0,-tz,BOOKSHOP.door.x-tx*wall.x-tz*wall.z,
    0,1,0,0,nx,0,-nz,-nx*wall.x-nz*wall.z,0,0,0,1);
  // The shop interior supplies its own walls, so omit its exterior shell.
  const chunks=new Map([...frame.city.chunks].map(([key,chunk])=>[key,{...chunk,buildings:chunk.buildings.filter(b=>b!==frame.currentVenue)}]));
  return {transform,frame:{...frame,player,city:{...frame.city,chunks},indoors:false,insideBookshop:false,
    playerSeat:null,windowView:{pitch:frame.playerSeat?.pitch??0},
    skyView:{...frame.skyView,angle:player.angle,pitch:frame.playerSeat?.pitch??0}}};
}

export function createBookshopStreet(scene,{createStreet=createThreeStreetScene}={}){
  let street=null;
  const outside=new Plane(new Vector3(0,0,1),0);
  const background=scene.background;
  return {
    update(frame){
      if(!frame.currentVenue||!frame.skyView)return;
      street??=createStreet();
      if(street.scene.parent!==scene)scene.add(street.scene);
      const view=bookshopStreetView(frame);street.update(view.frame);
      // Clip in the composed room's world space, keeping only z >= 0 outside.
      // Street asphalt and pavement otherwise continue beneath the interior.
      street.scene.traverse(object=>{
        for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[]){
          if(material.clippingPlanes?.[0]===outside)continue;
          material.clippingPlanes=[outside];material.needsUpdate=true;
        }
      });
      street.scene.matrixAutoUpdate=false;street.scene.matrix.copy(view.transform);street.scene.matrixWorldNeedsUpdate=true;
      scene.background=street.scene.background;
    },
    dispose(){if(street){scene.remove(street.scene);street.dispose();}scene.background=background;}
  };
}
