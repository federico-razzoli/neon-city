/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

import {drawRiverbankTerrain,drawCachedRiverbankFaces} from './riverbank-geometry.js';
import {drawRiverRailings} from './railing-geometry.js';
import {flowersFor,drawFlower} from './flowers.js';
import {BLOCK,WATER_LEVEL,bridgeHeight,hasBridge,mod} from './world.js?v=parks-4';

// Scratch geometry is consumed synchronously by face(), which transforms and
// owns the queued camera vertices. Nothing here retains unloaded city chunks.
const ripplePoints=Array.from({length:14},()=>({x:0,y:WATER_LEVEL+.012,z:0}));
const rippleFaces=Array.from({length:6},(_,i)=>[ripplePoints[i*2],ripplePoints[(i+1)*2],ripplePoints[(i+1)*2+1],ripplePoints[i*2+1]]);
const rippleWidths=Float64Array.from({length:7},(_,i)=>Math.sin(i/6*Math.PI)*.09);

// Each chunk owns half of a river, including its share of each bridge.
export function drawRiverTerrain(chunk,{quad,face,boundsVisible,nativeRoads=false},time){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const first=chunk.z===chunk.riverStart;
  if(!nativeRoads)drawRiverbankTerrain(chunk,quad);
  for(const flower of flowersFor(chunk))if(!flower.taken)drawFlower(flower,quad);
  const low=Math.max(z,start+18),high=Math.min(z+64,start+110);
  for(let a=0;a<64;a+=8)for(let b=low;b<high;b+=8){
    // This box contains both the water tile and its two animated ripples.
    if(boundsVisible&&!boundsVisible(x+a,WATER_LEVEL,b,x+a+8,WATER_LEVEL+.012,b+8))continue;
    quad(x+a,WATER_LEVEL,b,8,Math.min(8,high-b),'#164957');
    // Tapered, curved ripples gently sway instead of sliding like road dashes.
    const seed=mod(Math.sin((x+a)*12.9898+b*78.233)*43758.5453,1);
    const phase=seed*Math.PI*2+time*.65;
    for(let ripple=0;ripple<2;ripple++){
      const length=2.4+seed*1.6;
      const cx=x+a+1+seed*1.2+Math.sin(phase)*.35;
      const cz=b+1.5+ripple*3+Math.cos(phase+ripple)*.25;
      for(let i=0;i<=6;i++){
        const t=i/6,px=cx+t*length,pz=cz+Math.sin(t*Math.PI*1.6+phase+ripple)*.38;
        const left=ripplePoints[i*2],right=ripplePoints[i*2+1];
        left.x=right.x=px;left.z=pz-rippleWidths[i];right.z=pz+rippleWidths[i];
      }
      for(const vertices of rippleFaces)face(vertices,ripple?'#225d70':'#306b78');
    }
  }
  if(!nativeRoads){
    const road=first?start:start+120;
    quad(x,.015,road,64,8,'#252233');
    for(let t=16;t<52;t+=12)quad(x+t,.025,first?road+.1:road+7.8,4,.18,'#b09485');
    // Canvas keeps its own road submission; Three.js owns all road meshes.
    drawRiverbankTerrain(chunk,quad,true);
  }
}

// Split the fascia at ground level so its buried ends draw before the banks.
// The lower wall faces the water; from the deck side it is hidden by the deck.
export function drawBridgeFascias(chunk,{face,boundsVisible},viewer,belowGround=false){
  if(boundsVisible&&!boundsVisible(chunk.x*BLOCK,WATER_LEVEL,chunk.z*BLOCK,chunk.x*BLOCK+64,8,chunk.z*BLOCK+64))return;
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const clip=vertices=>{
    const out=[],sign=belowGround?-1:1;
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length];
      const ai=sign*a.y>=0,bi=sign*b.y>=0;
      if(ai)out.push(a);
      if(ai!==bi){const t=-a.y/(b.y-a.y);out.push({x:a.x+(b.x-a.x)*t,y:0,z:a.z+(b.z-a.z)*t});}
    }
    if(out.length>=3)face(out,'#68758a');
  };
  for(let a=Math.max(z,start+18);a<Math.min(z+64,start+110);a+=2){
    const b=Math.min(a+2,z+64,start+110),h0=bridgeHeight(a),h1=bridgeHeight(b);
    for(const edge of [14,50]){
      if(!hasBridge(chunk.x+(edge===50?1:0)))continue;
      const wall=(bottom,top)=>clip([
        {x:x+edge,y:h0+bottom,z:a},{x:x+edge,y:h1+bottom,z:b},
        {x:x+edge,y:h1+top,z:b},{x:x+edge,y:h0+top,z:a}
      ]);
      if(!viewer||(edge===14?viewer.x>x+edge:viewer.x<x+edge))wall(-1.4,.075);
      if(!belowGround)wall(.075,.25);
    }
  }
}

// Below-ground faces must be painted before the grass, promenade, and roads.
export function drawRiverbankFaces(chunk,{face,boundsVisible},viewer){
  if(boundsVisible&&!boundsVisible(chunk.x*BLOCK,WATER_LEVEL,chunk.z*BLOCK,chunk.x*BLOCK+64,0,chunk.z*BLOCK+64))return;
  const start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  // Stone retaining walls expose the full drop from the grass to the water.
  const waterSide=!viewer||(chunk.z===chunk.riverStart?viewer.z>bank:viewer.z<bank);
  if(waterSide)drawCachedRiverbankFaces(chunk,face);
}

export function drawRiverStructures(chunk,{face,boundsVisible,nativeRoads=false,nativeRailings=false},viewer){
  if(boundsVisible&&!boundsVisible(chunk.x*BLOCK,WATER_LEVEL,chunk.z*BLOCK,chunk.x*BLOCK+64,8,chunk.z*BLOCK+64))return;
  drawBridgeFascias(chunk,{face,boundsVisible},viewer);
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  if(!nativeRailings)drawRiverRailings(chunk,face,viewer);
  const low=Math.max(z,start+18),high=Math.min(z+64,start+110);
  // Short planar segments approximate a continuous arch; physics uses the same curve.
  for(let a=low;a<high;a+=2){
    const b=Math.min(a+2,high),h0=bridgeHeight(a),h1=bridgeHeight(b);
    const strip=(left,right,y0,y1,color)=>face([
      {x:x+left,y:h0+y0,z:a},{x:x+right,y:h0+y0,z:a},
      {x:x+right,y:h1+y1,z:b},{x:x+left,y:h1+y1,z:b}
    ],color);
    if(!nativeRoads)for(const [left,right,color] of [[0,8,'#292b3b'],[8,14,'#757380'],[50,56,'#757380'],[56,64,'#292b3b']])if(hasBridge(chunk.x+(left>=50?1:0)))strip(left,right,.075,.075,color);
    if(!nativeRoads&&hasBridge(chunk.x)&&Math.floor((a-start)/4)%3===0)strip(0,.15,.085,.085,'#c4af8c');
    if(!nativeRailings)drawRiverRailings(chunk,face,viewer,a-z);
  }
}
