/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,road_marking_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),30*12);
let template;
export function roadMarkingGeometry(){
  if(!template){
    build();
    // Keep a private copy: the other generators reuse the WASM scratch buffer.
    template=scratch.slice();
  }
  return template;
}
export function drawRoadMarkings(x,z,face){
  const geometry=roadMarkingGeometry();
  for(let f=0;f<30;f++){
    const k=f*12;
    face([
      {x:x+geometry[k],y:geometry[k+1],z:z+geometry[k+2]},
      {x:x+geometry[k+3],y:geometry[k+4],z:z+geometry[k+5]},
      {x:x+geometry[k+6],y:geometry[k+7],z:z+geometry[k+8]},
      {x:x+geometry[k+9],y:geometry[k+10],z:z+geometry[k+11]}
    ],f<8?'#b09485':'#81798a');
  }
}
