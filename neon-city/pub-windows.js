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

import {entranceWall} from './entrances.js';

// The main bar room occupies the full entrance facade (160 texture pixels).
export function pubWindowLayout(building){
  const scale=18/entranceWall(building).width;
  return [6,96].map(pixel=>({x:pixel*18/160,w:58*18/160,y:3/9*scale,h:33/9*scale,frame:2/9*scale,frameX:2*18/160}));
}
export function pubStreetCamera(building,player,eye){
  const wall=entranceWall(building),scale=wall.width/18;
  // Local +z points into the pub; local +x follows the interior's right wall.
  const tx=-wall.nz,tz=wall.nx;
  return {x:wall.x+(tx*(player.x-9)-wall.nx*player.z)*scale,
    z:wall.z+(tz*(player.x-9)-wall.nz*player.z)*scale,
    angle:Math.atan2(tx*Math.sin(player.angle)-wall.nx*Math.cos(player.angle),tz*Math.sin(player.angle)-wall.nz*Math.cos(player.angle)),
    eye:eye*scale,scale,wall};
}
export function clipPubStreet(vertices,wall){
  const distance=v=>(v.x-wall.x)*wall.nx+(v.z-wall.z)*wall.nz;
  const out=[];
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length],da=distance(a),db=distance(b);
    if(da>=0)out.push(a);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db),v={};
      for(const k of Object.keys(a))v[k]=a[k]+(b[k]-a[k])*t;
      out.push(v);
    }
  }
  return out;
}
