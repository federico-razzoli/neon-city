// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {pineConeTemplate} from './pine-cone-geometry.js';
import {createStaticInstances} from './three-static-instances.js';

export function createThreePineCones(scene,{boundsVisible}={}){
  let disposed=false;
  // One unit WASM template. Nonuniform instance scales supply length/radius;
  // the shader shades transformed face normals with the original five colors.
  const source=pineConeTemplate(),positions=[],normals=[];
  for(let k=0;k<source.length;k+=23){
    if(source[k+4]<0)continue;
    const points=Array.from({length:source[k]},(_,i)=>new THREE.Vector3(source[k+5+i*3],source[k+6+i*3],-source[k+7+i*3]));
    const normal=new THREE.Vector3(source[k+1],source[k+2],-source[k+3]);
    for(let i=1;i<points.length-1;i++){
      const triangle=[points[0],points[i],points[i+1]];
      if(new THREE.Vector3().subVectors(triangle[1],triangle[0]).cross(new THREE.Vector3().subVectors(triangle[2],triangle[0])).dot(normal)<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];
      for(const p of triangle){positions.push(p.x,p.y,p.z);normals.push(normal.x,normal.y,normal.z);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('coneNormal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(positions.length).fill(1),3));geometry.computeBoundingSphere();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const palette=['#2b1d17','#3b291e','#4f3626','#654530','#7a5739'].map(c=>new THREE.Color(c));
  material.onBeforeCompile=shader=>{
    shader.uniforms.conePalette={value:palette};
    shader.vertexShader='attribute vec3 coneNormal;\nuniform vec3 conePalette[5];\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>',`#include <color_vertex>
      vec3 scalesSquared=vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
      vec3 n=normalize(mat3(instanceMatrix)*(coneNormal/scalesSquared));
      float light=max(0.0,dot(n,vec3(0.4466625002869186,0.7444375004781977,0.4962916669854651)));
      int shade=int(min(4.0,floor((0.5*light+0.25*n.y+0.25)*5.0)));
      vColor.rgb=conePalette[shade];`);
  };
  material.customProgramCacheKey=()=> 'pine-cone-palette-v1';
  const rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3();
  const batches=createStaticInstances(scene,{name:'pine-cones',boundsVisible,
    stateFor:c=>[c.x,c.z,c.length,c.radius,c.angle,c.ground??.085],keyFor:()=>0,assetFor:()=>[{geometry,material}],
    matrixFor(c,matrix){position.set(c.x,c.ground??.085,-c.z);rotation.setFromAxisAngle(axis,c.angle);scale.set(c.length,c.radius,c.radius);matrix.compose(position,rotation,scale);}
  });
  return {
    beginFrame:frame=>batches.beginFrame(frame),
    draw(chunk,itemRoom='street'){
      const cones=(chunk.park?.cones??[]).filter(c=>!c.taken);
      for(const item of chunk.droppedItems??[])if(item.room===itemRoom&&item.item.id==='pine-cone')cones.push(item);
      batches.draw(chunk,cones);
    },
    dispose(){if(disposed)return;disposed=true;batches.dispose();geometry.dispose();material.dispose();}
  };
}
