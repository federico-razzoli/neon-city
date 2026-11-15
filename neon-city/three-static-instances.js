// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';

// Keep immutable geometry and placement buffers on the GPU. Repack a chunk
// only when its objects change, including pickups, drops and edited dimensions.
export function createStaticInstances(scene,{name,stateFor,keyFor,assetFor,matrixFor,boundsVisible}){
  const chunks=new Map(),matrix=new THREE.Matrix4();
  const id=chunk=>`${chunk.x},${chunk.z}`;
  function release(entry){for(const group of entry.groups.values())for(const mesh of group.meshes){scene.remove(mesh);mesh.dispose();}}
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].map(id));
      for(const [key,entry] of chunks){
        if(!loaded.has(key)){release(entry);chunks.delete(key);}
        else for(const group of entry.groups.values())for(const mesh of group.meshes)mesh.visible=false;
      }
    },
    draw(chunk,objects){
      const key=id(chunk),state=objects.flatMap(object=>[object,...stateFor(object)]);
      let entry=chunks.get(key);
      const changed=!entry||state.length!==entry.state.length||state.some((value,i)=>value!==entry.state[i]);
      if(!entry){entry={state:[],groups:new Map()};chunks.set(key,entry);}
      if(changed){
        const groups=new Map();
        for(const object of objects){const groupKey=keyFor(object);if(!groups.has(groupKey))groups.set(groupKey,[]);groups.get(groupKey).push(object);}
        for(const [groupKey,group] of entry.groups)if(!groups.has(groupKey)){
          for(const mesh of group.meshes){scene.remove(mesh);mesh.dispose();}entry.groups.delete(groupKey);
        }
        for(const [groupKey,items] of groups){
          let group=entry.groups.get(groupKey);
          if(group&&group.capacity<items.length){for(const mesh of group.meshes){scene.remove(mesh);mesh.dispose();}entry.groups.delete(groupKey);group=null;}
          if(!group){
            const parts=assetFor(items[0]),capacity=2**Math.ceil(Math.log2(Math.max(1,items.length)));
            group={capacity,parts,meshes:parts.map(part=>{
              const mesh=new THREE.InstancedMesh(part.geometry,part.material,capacity);mesh.name=`${name}:${key}`;scene.add(mesh);return mesh;
            })};entry.groups.set(groupKey,group);
          }
          group.meshes.forEach((mesh,partIndex)=>{
            items.forEach((object,i)=>{
              matrixFor(object,matrix);mesh.setMatrixAt(i,matrix);
              if(group.parts[partIndex].colorFor)mesh.setColorAt(i,new THREE.Color(group.parts[partIndex].colorFor(object)));
            });
            mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;
            if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
            mesh.computeBoundingBox();mesh.computeBoundingSphere();
          });
        }
        entry.state=state;
      }
      for(const group of entry.groups.values())for(const mesh of group.meshes){
        const box=mesh.boundingBox;
        mesh.visible=!boundsVisible||boundsVisible(box.min.x,box.min.y,-box.max.z,box.max.x,box.max.y,-box.min.z);
      }
    },
    dispose(){for(const entry of chunks.values())release(entry);chunks.clear();}
  };
}
