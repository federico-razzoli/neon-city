/* SPDX-License-Identifier: AGPL-3.0-only */
// One call per chunk. Numeric buffers are shared with WASM and reused; walker
// objects and gameplay state remain in JavaScript.
export function createPedestrianCollisionKernel(instance){
  const {memory,input,initial,output,capacity,resolve}=instance.exports;
  const limit=capacity();
  const source=new Float64Array(memory.buffer,input(),limit*4);
  const flags=new Uint8Array(memory.buffer,initial(),limit);
  const result=new Uint8Array(memory.buffer,output(),limit);
  return (moves,clearance)=>{
    if(moves.length>limit)return false;
    for(let i=0;i<moves.length;i++){
      const {before,after,blocked}=moves[i],k=i*4;
      source[k]=before.x;source[k+1]=before.z;source[k+2]=after.x;source[k+3]=after.z;
      flags[i]=blocked?1:0;
    }
    if(resolve(moves.length,clearance)!==1)return false;
    // Never publish a partial result when WASM requests the JS fallback.
    for(let i=0;i<moves.length;i++)moves[i].blocked=Boolean(result[i]);
    return true;
  };
}
let instance;
try{
  const url=new URL('./pedestrian-collisions.wasm',import.meta.url);
  let bytes;
  if(url.protocol==='file:'){
    const {readFile}=await import('node:fs/promises');
    bytes=await readFile(url);
  }else{
    const response=await fetch(url);
    if(!response.ok)throw new Error(`Pedestrian WASM unavailable: ${response.status}`);
    bytes=await response.arrayBuffer();
  }
  ({instance}=await WebAssembly.instantiate(bytes));
}catch{
  // The JS resolver also covers environments where WASM cannot be loaded.
}
export const pedestrianWasmAvailable=Boolean(instance);
export const pedestrianCollisionKernel=instance?createPedestrianCollisionKernel(instance):()=>false;
