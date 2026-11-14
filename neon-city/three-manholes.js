// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {manholeGeometry} from './manhole-geometry.js';

export function createThreeManholes(scene,{boundsVisible}={}){
  const models=new Map(),chunks=new Map(),matrix=new THREE.Matrix4();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  function model(radius){
    if(models.has(radius))return models.get(radius);
    const source=manholeGeometry(radius),positions=[],colors=[];
    function face(points,tint){
      const color=new THREE.Color(tint);
      for(let i=1;i<points.length-1;i++)for(const [x,y,z] of [points[0],points[i],points[i+1]]){
        positions.push(x,y,-z);colors.push(color.r,color.g,color.b);
      }
    }
    for(const [layer,y,color] of [[0,.09,'#171923'],[1,.091,'#777482'],[2,.092,'#343541']])
      face(Array.from({length:16},(_,i)=>[source[layer*32+i*2],y,source[layer*32+i*2+1]]),color);
    for(let i=0;i<3;i++){
      const z=(i-1)*.25-.025,length=source[96+i];
      face([[-length/2,.093,z],[length/2,.093,z],[length/2,.093,z+.05],[-length/2,.093,z+.05]],'#161923');
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();models.set(radius,geometry);return geometry;
  }
  function release(meshes){for(const mesh of meshes){scene.remove(mesh);mesh.dispose();}}
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].map(chunk=>chunk.manholes));
      for(const [covers,meshes] of chunks){
        if(!loaded.has(covers)){release(meshes);chunks.delete(covers);}
        else for(const mesh of meshes)mesh.visible=false;
      }
    },
    draw(chunk){
      const covers=chunk.manholes;if(!covers?.length)return;
      let meshes=chunks.get(covers);
      if(!meshes){
        const groups=new Map();
        for(const cover of covers){if(!groups.has(cover.radius))groups.set(cover.radius,[]);groups.get(cover.radius).push(cover);}
        meshes=[];
        for(const [radius,group] of groups){
          const mesh=new THREE.InstancedMesh(model(radius),material,group.length);mesh.name=`manholes:${chunk.x},${chunk.z}:${radius}`;
          group.forEach((cover,i)=>{matrix.makeTranslation(cover.x,0,-cover.z);mesh.setMatrixAt(i,matrix);});
          mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();meshes.push(mesh);scene.add(mesh);
        }
        chunks.set(covers,meshes);
      }
      for(const mesh of meshes){
        const box=mesh.boundingBox;
        mesh.visible=!boundsVisible||boundsVisible(box.min.x,box.min.y,-box.max.z,box.max.x,box.max.y,-box.min.z);
      }
    },
    dispose(){for(const meshes of chunks.values())release(meshes);chunks.clear();for(const geometry of models.values())geometry.dispose();models.clear();material.dispose();}
  };
}
