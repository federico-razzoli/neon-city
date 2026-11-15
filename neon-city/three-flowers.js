// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {flowerGeometry} from './flower-geometry.js';
import {flowersFor} from './flowers.js';
import {createStaticInstances} from './three-static-instances.js';

export function createThreeFlowers(scene,{boundsVisible}={}){
  let disposed=false;
  const source=flowerGeometry();
  function geometry(start,end){
    const positions=[];
    for(let k=start;k<end;k+=5){
      const [x,z,w,d,y]=source.slice(k,k+5);
      for(const [px,pz] of [[x,z],[x+w,z],[x+w,z+d],[x,z],[x+w,z+d],[x,z+d]])positions.push(px,y,-pz);
    }
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.computeBoundingSphere();return result;
  }
  const petals=geometry(0,10),centre=geometry(10,15);
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false});
  const gold=new THREE.MeshBasicMaterial({color:'#e5bb60',side:THREE.DoubleSide,toneMapped:false});
  const droppedMaterial=material.clone(),droppedGold=gold.clone();
  for(const m of [droppedMaterial,droppedGold]){m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;}
  const value=(flower,key,fallback)=>flower[key]??flower.item?.[key]??fallback;
  const batches=createStaticInstances(scene,{name:'flowers',boundsVisible,
    stateFor:f=>[f.x,f.z,value(f,'size',.3),value(f,'color','#d38aa9'),value(f,'centre',true),f.ground??0],
    keyFor:f=>`${value(f,'centre',true)}:${!!f.item}`,
    assetFor:f=>[{geometry:petals,material:f.item?droppedMaterial:material,colorFor:f=>value(f,'color','#d38aa9')},...(value(f,'centre',true)?[{geometry:centre,material:f.item?droppedGold:gold}]:[])],
    matrixFor(f,matrix){const size=value(f,'size',.3);matrix.makeScale(size,1,size);matrix.setPosition(f.x,f.ground??0,-f.z);}
  });
  return {
    beginFrame:frame=>batches.beginFrame(frame),
    draw(chunk,itemRoom='street'){
      const flowers=chunk.park||chunk.river?flowersFor(chunk).filter(f=>!f.taken):[];
      for(const item of chunk.droppedItems??[])if(item.room===itemRoom&&item.item.id==='flower')flowers.push(item);
      batches.draw(chunk,flowers);
    },
    dispose(){if(disposed)return;disposed=true;batches.dispose();petals.dispose();centre.dispose();material.dispose();gold.dispose();droppedMaterial.dispose();droppedGold.dispose();}
  };
}
