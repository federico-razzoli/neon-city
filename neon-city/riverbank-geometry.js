/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
import {BLOCK,WATER_LEVEL,hasBridge} from './world.js';
const {memory,output,riverbank_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),256*24);
const templates=new Map();
const colors=['#345841','#757380','#252233','#454c60','#52566a'];
function templateFor(chunk){
  const first=chunk.z===chunk.riverStart,left=hasBridge(chunk.x),right=hasBridge(chunk.x+1);
  const key=(first?4:0)+(left?2:0)+(right?1:0);
  let template=templates.get(key);
  if(!template){
    const count=build(+first,+left,+right,WATER_LEVEL),geometry=scratch.slice(0,count*14),ranges=new Map();
    for(let k=0;k<geometry.length;k+=14){
      const stage=geometry[k];
      if(!ranges.has(stage))ranges.set(stage,[k,k+14]);
      else ranges.get(stage)[1]=k+14;
    }
    template={geometry,ranges};templates.set(key,template);
  }
  return template;
}
export function riverbankGeometry(chunk){return templateFor(chunk).geometry;}
export function drawRiverbankTerrain(chunk,quad,approaches=false){
  const {geometry,ranges}=templateFor(chunk),range=ranges.get(approaches?1:0);
  if(!range)return;
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK;
  for(let k=range[0];k<range[1];k+=14)
    quad(x+geometry[k+2],geometry[k+3],z+geometry[k+4],geometry[k+5]-geometry[k+2],geometry[k+10]-geometry[k+4],colors[geometry[k+1]]);
}
export function drawCachedRiverbankFaces(chunk,face){
  const {geometry,ranges}=templateFor(chunk),range=ranges.get(2);
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK;
  for(let k=range[0];k<range[1];k+=14){
    const vertices=[];
    for(let i=0;i<4;i++){
      const v=k+2+i*3;vertices.push({x:x+geometry[v],y:geometry[v+1],z:z+geometry[v+2]});
    }
    face(vertices,colors[geometry[k+1]]);
  }
}
