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

import {BLOCK,PARK_PATH_WIDTH,mod,pathDistance} from './world.js';

// Keep collectible state on the chunk so it disappears when the block unloads.
export function flowersFor(chunk){
  if(chunk.flowers)return chunk.flowers;
  const flowers=[];
  if(!chunk.park&&!chunk.river)return flowers;
  const scatter=n=>mod(Math.sin(chunk.x*127.1+chunk.z*311.7+n*74.7)*43758.5453,1);
  const petals=['#d38aa9','#d9c47b','#aaa0d1','#d9d3c5'];
  const first=chunk.z===chunk.riverStart,bank=chunk.riverStart*BLOCK+(first?8:110);
  for(let i=0;i<(chunk.park?40:12);i++){
    if(chunk.park&&i%3)continue;
    const x=chunk.x*BLOCK+15.5+scatter(i*3)*(chunk.park?33:32.5);
    const z=chunk.park?chunk.z*BLOCK+15.5+scatter(i*3+1)*33:bank+(first?6.5:.5)+scatter(i*3+1)*2.6;
    if(chunk.park&&pathDistance(chunk.park.path,x,z)<PARK_PATH_WIDTH/2+.8)continue;
    flowers.push({x,z,size:.24+scatter(i*3+2)*.12,color:petals[i%petals.length],ground:chunk.park ? .09 : .065,centre:!chunk.park});
  }
  return chunk.flowers=flowers;
}
export function drawFlower(f,quad){
  const {x,z,size=.3,color='#d38aa9',ground=0,centre=true}=f;
  quad(x-size/2,ground,z-size/6,size,size/3,color);
  quad(x-size/6,ground,z-size/2,size/3,size,color);
  if(centre)quad(x-size/6,ground+.001,z-size/6,size/3,size/3,'#e5bb60');
}
