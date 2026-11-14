// SPDX-License-Identifier: AGPL-3.0-only
import {BLOCK,RIVER_ROWS,RIVER_WALK_HEIGHT,hasBridge} from './world.js';

export const RIVER_GRATE={width:1.8,height:-1.4-RIVER_WALK_HEIGHT,depth:.12};
export const RIVER_GRATE_MESSAGE='THIS LOOKS ANCIENT, MYSTERIOUS AND SCARY...';

export function facingRiverGrate(player){
  if(!player.riverWalk||player.riverFall)return false;
  const street=Math.round(player.x/BLOCK);
  if(!hasBridge(street)||Math.abs(player.x-street*BLOCK)>RIVER_GRATE.width/2+.5)return false;
  for(const row of RIVER_ROWS)for(const [bank,dir] of [[row*BLOCK+18,1],[row*BLOCK+110,-1]]){
    const distance=(player.z-bank)*dir;
    if(distance<.4||distance>2.5)continue;
    // The door is in the retaining wall, facing out onto the lower path.
    if(Math.cos(player.angle)*dir<-.65)return true;
  }
  return false;
}
