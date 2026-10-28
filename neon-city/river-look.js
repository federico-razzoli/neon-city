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

import {BLOCK,RIVER_WIDTH,riverStart,hasBridge} from './world.js?v=parks-4';

export function facingRiver(player){
  const start=riverStart(Math.floor(player.z/BLOCK));
  if(start===undefined)return false;
  const along=player.z-start*BLOCK-18;
  // Leave twelve metres at each end for the approaches and bank junctions.
  if(along<12||along>RIVER_WIDTH-12)return false;
  const street=Math.round(player.x/BLOCK),offset=player.x-street*BLOCK;
  if(!hasBridge(street)||Math.abs(offset)<11||Math.abs(offset)>14)return false;
  return Math.sin(player.angle)*Math.sign(offset)>.65;
}

export class RiverLook {
  constructor(){this.held=false;}
  try(player,pressed,fresh=false){
    const repeated=this.held&&!fresh;this.held=pressed;
    return pressed&&!repeated&&facingRiver(player);
  }
}
