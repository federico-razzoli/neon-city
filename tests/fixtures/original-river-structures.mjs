/* SPDX-License-Identifier: AGPL-3.0-only */
import {BLOCK,WATER_LEVEL,bridgeHeight,hasBridge} from '../../neon-city/world.js';
import {drawBridgeFascias} from '../../neon-city/rivers.js';
export function originalRiverStructures(chunk,{face,box,boundsVisible},viewer){
  if(boundsVisible&&!boundsVisible(chunk.x*BLOCK,WATER_LEVEL,chunk.z*BLOCK,chunk.x*BLOCK+64,8,chunk.z*BLOCK+64))return;
  drawBridgeFascias(chunk,{face,boundsVisible},viewer);
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  const left=hasBridge(chunk.x)?14:0,right=hasBridge(chunk.x+1)?50:64;
  for(let a=left;a<right;a+=6){
    box(x+a,.06,bank-.22,Math.min(6,right-a),.2,.44,'#89929d');
    box(x+a,1.05,bank-.09,Math.min(6,right-a),.12,.18,'#9ba6ab');
    box(x+a,.1,bank-.1,.18,1,.2,'#6e7d8a');
  }
  const low=Math.max(z,start+18),high=Math.min(z+64,start+110);
  // Short planar segments approximate a continuous arch; physics uses the same curve.
  for(let a=low;a<high;a+=2){
    const b=Math.min(a+2,high),h0=bridgeHeight(a),h1=bridgeHeight(b);
    const strip=(left,right,y0,y1,color)=>face([
      {x:x+left,y:h0+y0,z:a},{x:x+right,y:h0+y0,z:a},
      {x:x+right,y:h1+y1,z:b},{x:x+left,y:h1+y1,z:b}
    ],color);
    for(const [left,right,color] of [[0,8,'#292b3b'],[8,14,'#757380'],[50,56,'#757380'],[56,64,'#292b3b']])if(hasBridge(chunk.x+(left>=50?1:0)))strip(left,right,.075,.075,color);
    if(hasBridge(chunk.x)&&Math.floor((a-start)/4)%3===0)strip(0,.15,.085,.085,'#c4af8c');
    for(const edge of [14,50]){
      if(!hasBridge(chunk.x+(edge===50?1:0)))continue;
      // The visible stone fascia and handrail rise together with the deck.
      face([{x:x+edge,y:h0+1.05,z:a},{x:x+edge,y:h1+1.05,z:b},{x:x+edge,y:h1+1.19,z:b},{x:x+edge,y:h0+1.19,z:a}],'#b0bac0');
      strip(edge-.15,edge+.15,.25,.25,'#8f9eab');
      strip(edge-.1,edge+.1,1.19,1.19,'#b0bac0');
      if(Math.round(a-start)%4===2)box(x+edge-.1,h0+.2,a,.2,1,.2,'#8594a2');
    }
  }
}
