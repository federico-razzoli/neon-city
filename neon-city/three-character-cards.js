// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawCharacter,outfit} from './sprites.js?v=bumps-1';

// Resolve the original opaque rectangle layers before emitting geometry. This
// preserves overwritten details without overlapping faces or depth offsets.
export function characterCardRuns(type,frame,back=false,variant=0,rows=48){
  const pixels=new Array(24*48);
  drawCharacter(type,frame,back,variant,(color,x,y,w,h)=>{
    for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)
      for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels[py*24+px]=color;
  });
  const runs=[];
  for(let y=0;y<rows;y++)for(let x=0;x<24;){
    const color=pixels[y*24+x];
    if(!color){x++;continue;}
    let end=x+1;while(end<24&&pixels[y*24+end]===color)end++;
    runs.push({x,y,end,color});x=end;
  }
  return runs;
}

// Scene owners share GPU buffers; materials stay local for clipping and lighting.
const sharedGeometries=new Map();
export function createThreeCharacterCards(){
  const geometries=new Map(),colors=new Map();let disposed=false;
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  function geometry(type,frame,back=false,variant=0,seated=false){
    const rows=seated?32:48,key=`${type}:${frame}:${!!back}:${outfit(type,variant)}:${rows}`;
    if(geometries.has(key))return geometries.get(key);
    const shared=sharedGeometries.get(key);
    if(shared){shared.users++;geometries.set(key,shared.geometry);return shared.geometry;}
    const positions=[],rgb=[];
    for(const run of characterCardRuns(type,frame,back,variant,rows)){
      let color=colors.get(run.color);
      if(!color){color=new THREE.Color(run.color);colors.set(run.color,color);}
      const left=run.x/24-.5,right=run.end/24-.5,top=.5-run.y/rows,bottom=.5-(run.y+1)/rows;
      for(const [x,y] of [[left,bottom],[right,bottom],[right,top],[left,bottom],[right,top],[left,top]]){
        positions.push(x,y,0);rgb.push(color.r,color.g,color.b);
      }
    }
    const result=new THREE.BufferGeometry();
    result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    result.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
    result.computeBoundingSphere();geometries.set(key,result);sharedGeometries.set(key,{geometry:result,users:1});return result;
  }
  return {geometry,material,dispose(){
    if(disposed)return;disposed=true;
    for(const key of geometries.keys()){
      const entry=sharedGeometries.get(key);
      if(--entry.users===0){entry.geometry.dispose();sharedGeometries.delete(key);}
    }
    geometries.clear();colors.clear();material.dispose();
  }};
}
