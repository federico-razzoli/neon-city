import {BLOCK,RIVER_WIDTH,riverStart,hasBridge} from './world.js?v=bridge-visibility-1';

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
