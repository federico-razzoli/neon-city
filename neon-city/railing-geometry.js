/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
import {BLOCK,hasBridge} from './world.js';
const {memory,output,railing_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),256*24);
const templates=new Map();
const colors=['#89929d','#9ba6ab','#6e7d8a','#b0bac0','#8f9eab','#8594a2'];
function templateFor(chunk){
  const first=chunk.z===chunk.riverStart,left=hasBridge(chunk.x),right=hasBridge(chunk.x+1);
  const key=(first?4:0)+(left?2:0)+(right?1:0);
  let template=templates.get(key);
  if(!template){
    const count=build(+first,+left,+right),geometry=scratch.slice(0,count*15),ranges=new Map();
    for(let k=0;k<geometry.length;k+=15){
      const segment=geometry[k+2];
      if(!ranges.has(segment))ranges.set(segment,[k,k+15]);
      else ranges.get(segment)[1]=k+15;
    }
    template={geometry,ranges};templates.set(key,template);
  }
  return template;
}
export function railingGeometry(chunk){return templateFor(chunk).geometry;}
// Keep each segment in its original position in the scene's submission order.
// The viewer includes eye height; undefined emits all exterior box faces.
export function drawRiverRailings(chunk,face,viewer,segment=-1){
  const {geometry,ranges}=templateFor(chunk),range=ranges.get(segment);
  if(!range)return;
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK;
  for(let k=range[0];k<range[1];k+=15){
    const rule=geometry[k],px=x+geometry[k+3],py=geometry[k+4],pz=z+geometry[k+5];
    if(viewer&&(rule===1&&!(viewer.z<pz)||rule===2&&!(viewer.z>pz)||
      rule===3&&!(viewer.x<px)||rule===4&&!(viewer.x>px)||rule===5&&!(viewer.y>py)))continue;
    const vertices=[];
    for(let i=0;i<4;i++){
      const v=k+3+i*3;vertices.push({x:x+geometry[v],y:geometry[v+1],z:z+geometry[v+2]});
    }
    face(vertices,colors[geometry[k+1]]);
  }
}
