/* SPDX-License-Identifier: AGPL-3.0-only */
const url=new URL('./manhole-geometry.wasm',import.meta.url);
let bytes;
if(url.protocol==='file:'){
  const {readFile}=await import('node:fs/promises');
  bytes=await readFile(url);
}else{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WASM manhole geometry unavailable: ${response.status}`);
  bytes=await response.arrayBuffer();
}
const {instance}=await WebAssembly.instantiate(bytes);
const {memory,output,build}=instance.exports;
const scratch=new Float64Array(memory.buffer,output(),99);
// All current covers share radius .65 and therefore one 792-byte template.
// Cache by radius so future sizes also share geometry without per-cover storage.
const templates=new Map();
export function manholeGeometry(radius){
  let geometry=templates.get(radius);
  if(!geometry){
    build(radius);
    geometry=scratch.slice();
    templates.set(radius,geometry);
  }
  return geometry;
}
