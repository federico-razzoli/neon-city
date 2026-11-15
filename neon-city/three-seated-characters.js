// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawSeatedCharacterLegs} from './pub-interior.js?v=bar-taps-1';
import {outfit} from './sprites.js?v=bumps-1';

// Geometry is local to the seat and shared by matching characters in any scene.
// A lease keeps buffers alive until the last scene using them has left.
const shared=new Map();
export function createThreeSeatedCharacters(){
  const owned=new Set();let disposed=false;
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  function geometry(type,variant=0,side=-1,reach=0){
    const key=`${type}:${outfit(type,variant)}:${side}:${reach}`;
    let entry=shared.get(key);
    if(!entry){
      const cube=new THREE.BoxGeometry(1,1,1),positions=[],colors=[];
      drawSeatedCharacterLegs({box(x,y,z,w,h,d,color){
        const tint=new THREE.Color(color),vertices=cube.attributes.position;
        for(let i=0;i<cube.index.count;i++){
          const j=cube.index.getX(i);
          positions.push(x+(vertices.getX(j)+.5)*w,y+(vertices.getY(j)+.5)*h,-z-(vertices.getZ(j)+.5)*d);
          colors.push(tint.r,tint.g,tint.b);
        }
      }},{x:-.4,z:-.4,w:.8,d:.8,side},type,variant,reach);
      cube.dispose();
      const buffer=new THREE.BufferGeometry();
      buffer.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      buffer.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));buffer.computeBoundingSphere();
      entry={geometry:buffer,users:0};shared.set(key,entry);
    }
    if(!owned.has(key)){owned.add(key);entry.users++;}
    return entry.geometry;
  }
  return {geometry,material,dispose(){
    if(disposed)return;disposed=true;
    for(const key of owned){const entry=shared.get(key);if(--entry.users===0){entry.geometry.dispose();shared.delete(key);}}
    owned.clear();material.dispose();
  }};
}
