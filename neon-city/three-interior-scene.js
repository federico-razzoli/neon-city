// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {NATIVE_VIEW} from './render-camera.js';
import {drawDroppedObject} from './dropped-object.js';
import {sprite} from './sprites.js?v=bumps-1';
import {characterHeight,characterGirth,pedestrianShowsBack} from './world.js?v=start-pub-1';

// Reflect world Z to convert the game's left-handed +Z view to Three.js -Z.
export function createInteriorCamera(viewport=NATIVE_VIEW){
  const {width,height,focal,horizon,near,far}=viewport;
  const camera=new THREE.PerspectiveCamera(2*Math.atan(height/(2*focal))*180/Math.PI,width/height,near,far);
  camera.setViewOffset(width,height,0,height/2-horizon,width,height);
  return camera;
}
export function updateInteriorCamera(camera,{position,eye,pitch=0}){
  camera.position.set(position.x,eye,-position.z);
  camera.rotation.set(pitch,-position.angle,0,'YXZ');
  camera.updateMatrixWorld(true);
}

// One vertex-colored mesh per room/object, sharing a single unlit material.
// This is a geometry adapter for existing world-space helpers, not a frame cache.
export function createInteriorGeometryBuilder(){
  const cube=new THREE.BoxGeometry(1,1,1),colors=new Map();
  function build(draw){
    const positions=[],rgb=[];
    const append=(point,color)=>{
      let value=colors.get(color);
      if(!value){value=new THREE.Color(color);colors.set(color,value);}
      positions.push(point.x,point.y,-point.z);rgb.push(value.r,value.g,value.b);
    };
    const face=(vertices,color)=>{
      for(let i=1;i<vertices.length-1;i++)for(const point of [vertices[0],vertices[i],vertices[i+1]])append(point,color);
    };
    const quad=(x,y,z,w,d,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);
    const box=(x,y,z,w,h,d,color,roof=color)=>{
      const vertices=cube.attributes.position,indices=cube.index;
      for(const group of cube.groups){
        const tint=group.materialIndex===2?roof:color;
        for(let i=group.start;i<group.start+group.count;i++){
          const index=indices.getX(i);
          append({x:x+(vertices.getX(index)+.5)*w,y:y+(vertices.getY(index)+.5)*h,z:z+(vertices.getZ(index)+.5)*d},tint);
        }
      }
    };
    draw({face,quad,box});
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    geometry.computeBoundingSphere();
    return geometry;
  }
  return {build,dispose(){cube.dispose();colors.clear();}};
}

export function createThreeInteriorScene({name,drawRoom,createExtras}){
  const scene=new THREE.Scene(),camera=createInteriorCamera();
  scene.background=new THREE.Color('#3a2d36');
  const builder=createInteriorGeometryBuilder();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const room=new THREE.Mesh(builder.build(drawRoom),material);
  room.name=`${name}-room`;scene.add(room);
  const extras=createExtras?.({scene,builder,material});
  const dropped=new Map(),actors=new Map(),artwork=new Map();
  const actorGeometry=new THREE.PlaneGeometry(1,1);
  let disposed=false;
  function actorMaterial(image){
    let entry=artwork.get(image);
    if(!entry){
      const texture=new THREE.CanvasTexture(image);
      texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
      texture.generateMipmaps=false;
      const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.5,toneMapped:false});
      entry={texture,material};artwork.set(image,entry);
    }
    return entry.material;
  }
  function update(frame){
    if(disposed)throw new Error('Interior scene has been disposed.');
    updateInteriorCamera(camera,{position:frame.player,eye:frame.eye,pitch:frame.windowView?.pitch??frame.playerSeat?.pitch??0});
    extras?.update(frame);
    const present=new Set();
    for(const chunk of frame.city.chunks.values())for(const item of chunk.droppedItems??[]){
      if(item.room!==frame.itemRoom)continue;
      present.add(item);
      if(!dropped.has(item)){
        const mesh=new THREE.Mesh(builder.build(helpers=>drawDroppedObject(item,helpers)),material);
        mesh.name=`dropped-${item.item.id}`;dropped.set(item,mesh);scene.add(mesh);
      }
    }
    for(const [item,mesh] of dropped)if(!present.has(item)){
      scene.remove(mesh);mesh.geometry.dispose();dropped.delete(item);
    }
    const guests=new Set(frame.hotelGuests);
    for(const guest of guests){
      let mesh=actors.get(guest);
      if(!mesh){mesh=new THREE.Mesh(actorGeometry,material);mesh.name=`${name}-guest`;actors.set(guest,mesh);scene.add(mesh);}
      const image=sprite(guest.type,Math.floor(guest.walkTime*6)%4,pedestrianShowsBack(guest,frame.player),guest.variant);
      mesh.material=actorMaterial(image);
      const height=characterHeight(guest.type);
      mesh.scale.set(height*characterGirth(guest.type)/2,height,1);
      mesh.position.set(guest.x,(guest.y??0)+height/2,-guest.z);mesh.rotation.y=-frame.player.angle;
    }
    for(const [guest,mesh] of actors)if(!guests.has(guest)){scene.remove(mesh);actors.delete(guest);}
  }
  function dispose(){
    if(disposed)return;disposed=true;
    room.geometry.dispose();extras?.dispose();
    for(const mesh of dropped.values())mesh.geometry.dispose();
    dropped.clear();actors.clear();actorGeometry.dispose();
    for(const {texture,material} of artwork.values()){texture.dispose();material.dispose();}
    artwork.clear();material.dispose();builder.dispose();scene.clear();
  }
  return {scene,camera,update,dispose};
}
