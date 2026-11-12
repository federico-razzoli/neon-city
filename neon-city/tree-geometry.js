/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,tree_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),56*29);
const colors=['#2a1f27','#35272c','#423133','#4d3a39',
  '#122a24','#163228','#1b3a2d','#214432','#284e38'];
let template;
// world.js generates pines with radius=.45*scale, so the whole model scales
// uniformly and needs one template, independent of tree count and position.
export function treeGeometry(){
  if(!template){
    const count=build();
    template=scratch.slice(0,count*29);
  }
  return template;
}
export function drawTreeGeometry(tree,face,viewer){
  const geometry=treeGeometry(),s=tree.scale;
  for(let k=0;k<geometry.length;k+=29){
    const x=tree.x+geometry[k+5]*s,y=geometry[k+6]*s,z=tree.z+geometry[k+7]*s;
    if((viewer.x-x)*geometry[k+1]+(viewer.y-y)*geometry[k+2]+(viewer.z-z)*geometry[k+3]<=0)continue;
    const vertices=[];
    for(let i=0;i<geometry[k];i++){
      const v=k+5+i*3;
      vertices.push({x:tree.x+geometry[v]*s,y:geometry[v+1]*s,z:tree.z+geometry[v+2]*s});
    }
    face(vertices,colors[geometry[k+4]]);
  }
}
