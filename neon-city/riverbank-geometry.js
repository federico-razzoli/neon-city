/* SPDX-License-Identifier: AGPL-3.0-only */
import {RIVER_GRATE} from './river-grates.js';
import {geometryWasm} from './geometry-wasm.js';
import {BLOCK,WATER_LEVEL,RIVER_WALK_HEIGHT,hasBridge} from './world.js';
const {memory,output,riverbank_build:build,riverbank_walls_build:buildWalls}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),256*24);
const templates=new Map();
const colors=['#345841','#757380','#252233','#454c60','#52566a'];
function templateFor(chunk,wallsOnly=false){
  const first=chunk.z===chunk.riverStart,left=hasBridge(chunk.x),right=hasBridge(chunk.x+1);
  const key=wallsOnly?`walls:${+first}`:(first?4:0)+(left?2:0)+(right?1:0);
  let template=templates.get(key);
  if(!template){
    const count=wallsOnly?buildWalls(+first,WATER_LEVEL):build(+first,+left,+right,WATER_LEVEL);
    const geometry=scratch.slice(0,count*14),ranges=new Map();
    for(let k=0;k<geometry.length;k+=14){
      const stage=geometry[k];
      if(!ranges.has(stage))ranges.set(stage,[k,k+14]);
      else ranges.get(stage)[1]=k+14;
    }
    template={geometry,ranges};templates.set(key,template);
  }
  return template;
}
export function riverbankGeometry(chunk){return templateFor(chunk).geometry;}
export function riverbankWallGeometry(chunk){return templateFor(chunk,true).geometry;}
export function drawRiverbankTerrain(chunk,quad,approaches=false){
  const {geometry,ranges}=templateFor(chunk),range=ranges.get(approaches?1:0);
  if(!range)return;
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK;
  for(let k=range[0];k<range[1];k+=14)
    quad(x+geometry[k+2],geometry[k+3],z+geometry[k+4],geometry[k+5]-geometry[k+2],geometry[k+10]-geometry[k+4],colors[geometry[k+1]]);
}
export function drawCachedRiverbankFaces(chunk,face,doorways=false){
  const {geometry,ranges}=templateFor(chunk,true),range=ranges.get(2);
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK;
  for(let k=range[0];k<range[1];k+=14){
    const vertices=[];
    for(let i=0;i<4;i++){
      const v=k+2+i*3;vertices.push({x:x+geometry[v],y:geometry[v+1],z:z+geometry[v+2]});
    }
    if(!doorways){face(vertices,colors[geometry[k+1]]);continue;}
    // Subtract the actual opening, including the half owned by the adjacent
    // chunk. The wall and recessed door never share a depth plane.
    let panels=[[vertices[0].x,vertices[1].x,vertices[0].y,vertices[2].y]];
    for(const street of [chunk.x,chunk.x+1])if(hasBridge(street)){
      const left=street*BLOCK-RIVER_GRATE.width/2,right=street*BLOCK+RIVER_GRATE.width/2;
      const bottom=RIVER_WALK_HEIGHT,top=bottom+RIVER_GRATE.height,next=[];
      for(const [a,b,c,d] of panels){
        const l=Math.max(a,left),r=Math.min(b,right),lo=Math.max(c,bottom),hi=Math.min(d,top);
        if(l>=r||lo>=hi){next.push([a,b,c,d]);continue;}
        if(a<l)next.push([a,l,c,d]);if(r<b)next.push([r,b,c,d]);
        if(c<lo)next.push([l,r,c,lo]);if(hi<d)next.push([l,r,hi,d]);
      }
      panels=next;
    }
    for(const [a,b,c,d] of panels){const z=vertices[0].z;face([{x:a,y:c,z},{x:b,y:c,z},{x:b,y:d,z},{x:a,y:d,z}],colors[geometry[k+1]]);}
  }
}
