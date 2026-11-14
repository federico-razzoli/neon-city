// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawFingerpost} from './parks.js';
import {START_SIGN,RIVER_SIGN} from './world.js';
import {createThreeArtwork} from './three-artwork.js';

export function createThreeFingerposts(scene,{boundsVisible}={}){
  const models=new Map(),signs=new Map(),artwork=createThreeArtwork();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  const id=s=>`${s.x}:${s.z}`;
  function model(s,boards,signTexture){
    const key=JSON.stringify([s.height??RIVER_SIGN.height,boards.map(b=>[b.text,b.dx,b.dz,b.bottom,b.top])]);
    if(models.has(key))return {key,...models.get(key)};
    const group=new THREE.Group(),positions=[],colors=[];
    drawFingerpost({...s,x:0,z:0},boards,{complete:true,signTexture,face(points,tint,image){
      if(image){group.add(artwork.mesh(points,image));return;}
      const color=new THREE.Color(tint);
      for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){
        positions.push(p.x,p.y,-p.z);colors.push(color.r,color.g,color.b);
      }
    }},null);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();
    group.add(new THREE.Mesh(geometry,material));
    const box=new THREE.Box3().setFromObject(group),value={group,geometry,box};models.set(key,value);return {key,...value};
  }
  return {
    beginFrame(frame){
      const loaded=new Set([id(START_SIGN)]);
      for(const chunk of frame.city.chunks.values())if(chunk.park?.sign)loaded.add(id(chunk.park.sign));
      for(const [key,entry] of signs){if(!loaded.has(key)){scene.remove(entry.group);signs.delete(key);}else entry.group.visible=false;}
    },
    draw(s,boards,signTexture){
      const asset=model(s,boards,signTexture),key=id(s);let entry=signs.get(key);
      if(!entry||entry.key!==asset.key){
        if(entry)scene.remove(entry.group);
        const group=asset.group.clone(true);group.name=`fingerpost:${key}`;group.position.set(s.x,0,-s.z);group.matrixAutoUpdate=false;group.updateMatrix();
        entry={key:asset.key,group};signs.set(key,entry);scene.add(group);
      }
      const {min,max}=asset.box;
      entry.group.visible=!boundsVisible||boundsVisible(min.x+s.x,min.y,s.z-max.z,max.x+s.x,max.y,s.z-min.z);
    },
    dispose(){for(const entry of signs.values())scene.remove(entry.group);signs.clear();for(const model of models.values())model.geometry.dispose();models.clear();artwork.dispose();material.dispose();}
  };
}
