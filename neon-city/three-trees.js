// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {treeGeometry,TREE_COLORS} from './tree-geometry.js';

// Convert the cached WASM model once. All parks share its GPU buffers.
export function createThreeTrees(scene,{boundsVisible}={}){
  const source=treeGeometry(),positions=[],colors=[];
  const palette=TREE_COLORS.map(color=>new THREE.Color(color));
  for(let k=0;k<source.length;k+=29){
    const normal=new THREE.Vector3(source[k+1],source[k+2],-source[k+3]),color=palette[source[k+4]];
    const points=Array.from({length:source[k]},(_,i)=>new THREE.Vector3(source[k+5+i*3],source[k+6+i*3],-source[k+7+i*3]));
    for(let i=1;i<points.length-1;i++){
      const triangle=[points[0],points[i],points[i+1]];
      const cross=new THREE.Vector3().subVectors(triangle[1],triangle[0]).cross(new THREE.Vector3().subVectors(triangle[2],triangle[0]));
      if(cross.dot(normal)<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];
      for(const point of triangle){positions.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
  const parks=new Map(),matrix=new THREE.Matrix4();
  function release(mesh){scene.remove(mesh);mesh.dispose();}
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].map(chunk=>chunk.park).filter(Boolean));
      for(const [park,mesh] of parks){
        if(!loaded.has(park)){release(mesh);parks.delete(park);}else mesh.visible=false;
      }
    },
    draw(chunk){
      const park=chunk.park;if(!park?.trees.length)return;
      let mesh=parks.get(park);
      if(!mesh){
        mesh=new THREE.InstancedMesh(geometry,material,park.trees.length);mesh.name=`park-trees:${chunk.x},${chunk.z}`;
        park.trees.forEach((tree,i)=>{
          matrix.makeScale(tree.scale,tree.scale,tree.scale);matrix.setPosition(tree.x,0,-tree.z);mesh.setMatrixAt(i,matrix);
        });
        mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
        parks.set(park,mesh);scene.add(mesh);
      }
      const box=mesh.boundingBox;
      mesh.visible=!boundsVisible||boundsVisible(box.min.x,box.min.y,-box.max.z,box.max.x,box.max.y,-box.min.z);
    },
    dispose(){for(const mesh of parks.values())release(mesh);parks.clear();geometry.dispose();material.dispose();}
  };
}
