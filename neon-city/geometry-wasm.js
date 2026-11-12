/* SPDX-License-Identifier: AGPL-3.0-only */
const url=new URL('./geometry.wasm',import.meta.url);
let bytes;
if(url.protocol==='file:'){
  const {readFile}=await import('node:fs/promises');
  bytes=await readFile(url);
}else{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WASM geometry unavailable: ${response.status}`);
  bytes=await response.arrayBuffer();
}
// ES module caching gives every generator the same instance and scratch memory.
const {instance}=await WebAssembly.instantiate(bytes);
export const geometryWasm=instance.exports;
