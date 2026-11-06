/* SPDX-License-Identifier: AGPL-3.0-only */
// One boundary crossing per wall, with reusable input/output buffers.
export function createWallColumnKernel(instance){
  const {memory,input,output,columns}=instance.exports;
  const source=new Float64Array(memory.buffer,input(),32*5);
  const data=new Float64Array(memory.buffer,output(),8192*9);
  const result={data,count:0};
  return (points,vertices,width)=>{
    if(points.length<3||points.length>32||vertices.length!==points.length||!Number.isInteger(width)||width>8192||width<0)throw new RangeError('Unsupported wall column dimensions');
    for(let i=0;i<points.length;i++){
      const p=points[i],v=vertices[i],k=i*5;
      source[k]=p.x;source[k+1]=p.y;source[k+2]=v.z;source[k+3]=v.u;source[k+4]=v.v;
    }
    result.count=columns(points.length,width);
    return result;
  };
}
// Finish loading before dependent modules start rendering their first frame.
const url=new URL('./wall-columns.wasm',import.meta.url);
let bytes;
if(url.protocol==='file:'){
  const {readFile}=await import('node:fs/promises');
  bytes=await readFile(url);
}else{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WASM wall columns unavailable: ${response.status}`);
  bytes=await response.arrayBuffer();
}
const {instance}=await WebAssembly.instantiate(bytes);
export const wallColumnKernel=createWallColumnKernel(instance);
