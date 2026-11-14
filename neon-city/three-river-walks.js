// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WALK_HEIGHT,RIVER_WALK_WIDTH,RIVER_STAIRS,hasRiverStairs} from './world.js';

export function createThreeRiverWalks(scene){
  const cube=new THREE.BoxGeometry(1,1,1);
  // Lighter treads and darker risers make the profile legible in the same
  // cool stone palette. Small per-step variations avoid a single flat shape.
  const stone=['#4e5563','#555d6c','#788091','#424957','#606878','#606878']
    .map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  const shades=['#ffffff','#e5e8ef','#f2f4f8'].map(color=>new THREE.Color(color));
  const parts=new Map(),transform=new THREE.Object3D();
  function build(chunk){
    const group=new THREE.Group();group.name=`river-walk:${chunk.x},${chunk.z}`;
    const x=chunk.x*BLOCK,first=chunk.z===chunk.riverStart,bank=chunk.riverStart*BLOCK+(first?18:110),dir=first?1:-1;
    const slabs=[];
    const box=(items,px,y,d,w,h,depth)=>{
      transform.position.set(x+px+w/2,y+h/2,-bank-dir*(d+depth/2));
      transform.rotation.set(0,0,0);transform.scale.set(w,h,depth);transform.updateMatrix();items.push(transform.matrix.clone());
    };
    box(slabs,0,RIVER_WALK_HEIGHT-.2,0,BLOCK,.2,RIVER_WALK_WIDTH);
    if(hasRiverStairs(x)){
      box(slabs,RIVER_STAIRS.landing,RIVER_WALK_HEIGHT,0,2,-RIVER_WALK_HEIGHT,RIVER_STAIRS.width);
      const tread=(RIVER_STAIRS.end-RIVER_STAIRS.start)/RIVER_STAIRS.steps;
      for(let step=0;step<RIVER_STAIRS.steps;step++){
        const top=RIVER_WALK_HEIGHT*(step+1)/RIVER_STAIRS.steps;
        if(top>RIVER_WALK_HEIGHT)box(slabs,RIVER_STAIRS.start+step*tread,RIVER_WALK_HEIGHT,0,tread,top-RIVER_WALK_HEIGHT,RIVER_STAIRS.width);
      }
    }
    const mesh=new THREE.InstancedMesh(cube,stone,slabs.length);mesh.name='river-walk-stone';
    slabs.forEach((matrix,i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,shades[i<2?0:(i-2)%shades.length]);});
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
    scene.add(group);return group;
  }
  const release=part=>{scene.remove(part.group);for(const mesh of part.group.children)mesh.dispose();};
  return {
    beginFrame(){for(const part of parts.values())part.seen=false;},
    draw(chunk){const key=`${chunk.x},${chunk.z}`;let part=parts.get(key);if(!part){part={group:build(chunk),seen:true};parts.set(key,part);}part.seen=true;},
    endFrame(){for(const [key,part] of parts)if(!part.seen){release(part);parts.delete(key);}},
    dispose(){for(const part of parts.values())release(part);parts.clear();cube.dispose();for(const material of stone)material.dispose();}
  };
}
