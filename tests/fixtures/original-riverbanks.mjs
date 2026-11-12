/* SPDX-License-Identifier: AGPL-3.0-only */
import {BLOCK,WATER_LEVEL} from '../../neon-city/world.js';
export function originalRiverbankFaces(chunk,{face,boundsVisible},viewer){
  if(boundsVisible&&!boundsVisible(chunk.x*BLOCK,WATER_LEVEL,chunk.z*BLOCK,chunk.x*BLOCK+64,0,chunk.z*BLOCK+64))return;
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  // Stone retaining walls expose the full drop from the grass to the water.
  const waterSide=!viewer||(chunk.z===chunk.riverStart?viewer.z>bank:viewer.z<bank);
  for(let a=0;waterSide&&a<64;a+=8){
    for(let y=WATER_LEVEL;y<0;y+=1.4){
      face([{x:x+a,y,z:bank},{x:x+a+8,y,z:bank},{x:x+a+8,y:Math.min(0,y+1.4),z:bank},{x:x+a,y:Math.min(0,y+1.4),z:bank}],Math.round((y-WATER_LEVEL)/1.4)%2?'#52566a':'#454c60');
    }
  }
}

