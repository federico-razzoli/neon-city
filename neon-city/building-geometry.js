/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,building_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),4*8*4*5);
// Weak keys allow unloaded buildings and their arrays to be collected together.
const cache=new WeakMap();
export function buildingGeometry(building){
  let panels=cache.get(building);
  if(!panels){
    build(building.x,building.z,building.w,building.d,building.h);
    panels=scratch.slice();
    cache.set(building,panels);
  }
  return panels;
}

let template;
// Native walls transform one unit model instead of caching world-space panels
// separately for every building. Other consumers retain the original cache.
export function buildingTemplate(){
  return template??=buildingGeometry({x:0,z:0,w:1,d:1,h:1});
}
