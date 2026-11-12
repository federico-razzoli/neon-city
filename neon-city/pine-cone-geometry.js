/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,pine_cone_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),19*23);
const cache=new WeakMap();
const colors=['#2b1d17','#3b291e','#4f3626','#654530','#7a5739'];
// Cones vary in proportions and orientation, which affect normals and lighting.
// Weak keys release their cached mesh when the cone or its chunk unloads.
export function pineConeGeometry(cone){
  const {length,radius,angle}=cone;
  let cached=cache.get(cone);
  if(!cached||cached.length!==length||cached.radius!==radius||cached.angle!==angle){
    const count=build(length,radius,Math.cos(angle),Math.sin(angle));
    cached={length,radius,angle,geometry:scratch.slice(0,count*23)};
    cache.set(cone,cached);
  }
  return cached.geometry;
}
export function drawPineConeGeometry(cone,face,viewer){
  const geometry=pineConeGeometry(cone),ground=cone.ground??.085;
  for(let k=0;k<geometry.length;k+=23){
    if(geometry[k+4]<0)continue;
    const x=cone.x+geometry[k+5],y=ground+geometry[k+6],z=cone.z+geometry[k+7];
    if((viewer.x-x)*geometry[k+1]+(viewer.y-y)*geometry[k+2]+(viewer.z-z)*geometry[k+3]<=0)continue;
    const vertices=[];
    for(let i=0;i<geometry[k];i++){
      const v=k+5+i*3;
      vertices.push({x:cone.x+geometry[v],y:ground+geometry[v+1],z:cone.z+geometry[v+2]});
    }
    face(vertices,colors[geometry[k+4]]);
  }
}
