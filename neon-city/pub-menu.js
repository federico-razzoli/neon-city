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

import {entranceSide} from './entrances.js';
// Menus occupy the centre of every pub wall except the entrance wall.
export function facingPubMenu(player,buildings){
  for(const b of buildings){
    if(b.sign!=='NEON PUB')continue;
    const walls=[
      {x:b.x+b.w/2,z:b.z,nx:0,nz:-1},
      {x:b.x+b.w/2,z:b.z+b.d,nx:0,nz:1},
      {x:b.x,z:b.z+b.d/2,nx:-1,nz:0},
      {x:b.x+b.w,z:b.z+b.d/2,nx:1,nz:0},
    ];
    for(let side=0;side<walls.length;side++){
      if(side===entranceSide(b))continue;
      const wall=walls[side],dx=wall.x-player.x,dz=wall.z-player.z;
      const distance=Math.hypot(dx,dz);
      // Require the outside of this wall, close proximity and a centred view.
      if(dx*wall.nx+dz*wall.nz>=0||distance>3||distance<.01)continue;
      if((dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/distance>=Math.cos(.22))return true;
    }
  }
  return false;
}
