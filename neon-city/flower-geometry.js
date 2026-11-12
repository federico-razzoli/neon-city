/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,flower_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),15);
let template;
export function flowerGeometry(){
  if(!template){build();template=scratch.slice();}
  return template;
}
export function drawFlowerGeometry(f,quad){
  const {x,z,size=.3,color='#d38aa9',ground=0,centre=true}=f,geometry=flowerGeometry();
  for(let k=0;k<(centre?15:10);k+=5){
    quad(x+geometry[k]*size,ground+geometry[k+4],z+geometry[k+1]*size,
      geometry[k+2]*size,geometry[k+3]*size,k===10?'#e5bb60':color);
  }
}
