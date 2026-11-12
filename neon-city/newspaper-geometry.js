/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,newspaper_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),11*4*5);
// Shared by dimensions and orientation, independent of position and newspaper.
const templates=new Map();
export function newspaperGeometry(machine){
  const {side,w,d}=machine,key=`${side}:${w}:${d}`;
  let geometry=templates.get(key);
  if(!geometry){
    build(side,w,d);
    geometry=scratch.slice();
    templates.set(key,geometry);
  }
  return geometry;
}
export function drawNewspaperGeometry(machine,geometry,player,eye,look,texture,face){
  function emit(f,color,tex=null){
    const vertices=[];
    for(let i=0;i<4;i++){
      const k=(f*4+i)*5;
      vertices.push({x:machine.x+geometry[k],y:geometry[k+1],z:machine.z+geometry[k+2],u:geometry[k+3],v:geometry[k+4]});
    }
    face(vertices,color,tex);
  }
  for(let box=0;box<2;box++){
    const f=box*5,k=f*20,colors=box?look.cap:look.body;
    if(player.z<machine.z+geometry[k+2])emit(f,colors[0]);
    if(player.z>machine.z+geometry[(f+1)*20+2])emit(f+1,colors[0]);
    if(player.x<machine.x+geometry[k])emit(f+2,colors[0]);
    if(player.x>machine.x+geometry[(f+3)*20])emit(f+3,colors[0]);
    if(eye>geometry[(f+4)*20+1])emit(f+4,colors[1]);
  }
  emit(10,look.paint,texture);
}
