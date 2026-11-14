// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawCachedRiverbankFaces} from './riverbank-geometry.js';
import {BLOCK,hasBridge} from './world.js';

// Share complete wall meshes, including doorway cutouts, by bank/bridge layout.
export function createThreeRetainingWalls(scene,{boundsVisible}={}){
  const models=new Map(),chunks=new Map();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  function key(chunk){return `${chunk.x},${chunk.z}:${chunk.riverStart}`;}
  function model(chunk){
    const first=chunk.z===chunk.riverStart,layout=`${+first}:${+hasBridge(chunk.x)}:${+hasBridge(chunk.x+1)}`;
    if(models.has(layout))return models.get(layout);
    const normalized={...chunk,z:first?0:1,riverStart:0},positions=[],colors=[],palette=new Map();
    drawCachedRiverbankFaces(normalized,(points,tint)=>{
      if(!palette.has(tint))palette.set(tint,new THREE.Color(tint));const color=palette.get(tint);
      for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){
        positions.push(p.x-chunk.x*BLOCK,p.y,-(p.z-normalized.z*BLOCK));colors.push(color.r,color.g,color.b);
      }
    },true);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();models.set(layout,geometry);return geometry;
  }
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].filter(chunk=>chunk.river).map(key));
      for(const [id,mesh] of chunks){if(!loaded.has(id)){scene.remove(mesh);chunks.delete(id);}else mesh.visible=false;}
    },
    draw(chunk,viewer){
      const first=chunk.z===chunk.riverStart,bank=chunk.riverStart*BLOCK+(first?18:110);
      if(viewer&&(first?viewer.z<=bank:viewer.z>=bank))return;
      const id=key(chunk);let mesh=chunks.get(id);
      if(!mesh){
        mesh=new THREE.Mesh(model(chunk),material);mesh.name=`retaining-wall:${chunk.x},${chunk.z}`;
        mesh.position.set(chunk.x*BLOCK,0,-chunk.z*BLOCK);mesh.matrixAutoUpdate=false;mesh.updateMatrix();
        chunks.set(id,mesh);scene.add(mesh);
      }
      const box=mesh.geometry.boundingBox,{x,y,z}=mesh.position;
      mesh.visible=!boundsVisible||boundsVisible(box.min.x+x,box.min.y+y,-box.max.z-z,box.max.x+x,box.max.y+y,-box.min.z-z);
    },
    dispose(){for(const mesh of chunks.values())scene.remove(mesh);chunks.clear();for(const geometry of models.values())geometry.dispose();models.clear();material.dispose();}
  };
}
