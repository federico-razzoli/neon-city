/* SPDX-License-Identifier: AGPL-3.0-only */
const url=new URL('./sign-geometry.wasm',import.meta.url);
let bytes;
if(url.protocol==='file:'){
  const {readFile}=await import('node:fs/promises');
  bytes=await readFile(url);
}else{
  const response=await fetch(url);
  if(!response.ok)throw new Error(`WASM sign geometry unavailable: ${response.status}`);
  bytes=await response.arrayBuffer();
}
const {instance}=await WebAssembly.instantiate(bytes);
const {memory,output,board,pole}=instance.exports;
const scratch=new Float64Array(memory.buffer,output(),7*34);
const boards=new Map(),poles=new Map();
export function signBoardGeometry(b,dimensions,width,rows){
  const {dx,dz,bottom,top}=b,{start,reach,tip}=dimensions;
  const key=[dx,dz,bottom,top,start,reach,tip,width,rows].join(':');
  if(!boards.has(key)){
    board(dx,dz,bottom,top,start,reach,tip,width,rows);
    boards.set(key,scratch.slice());
  }
  return boards.get(key);
}
export function signPoleGeometry(height,radius){
  const key=`${height}:${radius}`;
  if(!poles.has(key)){
    pole(height,radius);
    poles.set(key,scratch.slice());
  }
  return poles.get(key);
}
export function drawSignGeometry(data,s,viewer,face,style){
  for(let f=0;f<7;f++){
    const k=f*34,nx=data[k+1],ny=data[k+2],nz=data[k+3];
    // Board edges originally test visibility at the positive-side vertex.
    const anchor=k+4+(style.board&&f>=2?3*5:0);
    if((viewer.x-(s.x+data[anchor]))*nx+(viewer.y-data[anchor+1])*ny+(viewer.z-(s.z+data[anchor+2]))*nz<=0)continue;
    const vertices=[];
    for(let i=0;i<data[k];i++){
      const v=k+4+i*5;
      const p={x:s.x+data[v],y:data[v+1],z:s.z+data[v+2]};
      if(style.board&&f<2){p.u=data[v+3];p.v=data[v+4];}
      vertices.push(p);
    }
    face(vertices,style.colors[f],style.board&&f<2?style.texture?.(f===1)??null:null);
  }
}
