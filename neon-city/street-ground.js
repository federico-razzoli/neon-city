// SPDX-License-Identifier: AGPL-3.0-only
import {drawParkGround} from './parks.js?v=rive-gauche-6';

// Static ground details only. Roads, river water and collectible flowers have
// separate renderers and lifetimes.
export function drawStreetGround(chunk,{quad,face,nativeFlowers=false}){
  const x=chunk.x*64,z=chunk.z*64;
  quad(x+8,.04,z+8,48,48,'#414052');quad(x+8,.06,z+8,48,.25,'#777185');quad(x+8,.06,z+8,.25,48,'#777185');
  for(let i=10;i<56;i+=6){quad(x+i,.07,z+8,.06,6,'#272739');quad(x+8,.07,z+i,6,.06,'#272739');}
  if(chunk.park){drawParkGround(chunk,{quad,face,nativeFlowers});return;}
  quad(x+16,.08,z+9,12,3,'#57354f');quad(x+9,.08,z+35,3,10,'#294755');
}
