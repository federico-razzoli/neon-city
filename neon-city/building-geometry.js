/* SPDX-License-Identifier: AGPL-3.0-only */
const url=new URL('./building-geometry.wasm',import.meta.url);
let bytes;
if(url.protocol==='file:'){
  const {readFile}=await import('node:fs/promises');
  bytes=await readFile(url);
}else{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WASM building geometry unavailable: ${response.status}`);
  bytes=await response.arrayBuffer();
}
const {instance}=await WebAssembly.instantiate(bytes);
const {memory,output,build}=instance.exports;
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
