// SPDX-License-Identifier: AGPL-3.0-only
import {groundHeight,RIVER_WALK_HEIGHT,RIVER_STAIRS} from './world.js';

const replies=['OUCH! MY FOOT!','OUCH! MY KNEE!','I THINK I LOST 5 HPs!'];
// The fall only affects camera height and a landing remark; there is no health state.
export function advanceRiverFall(player,dt,random=Math.random){
  const fall=player.riverFall;
  if(!fall)return null;
  if(!player.riverWalk){delete player.riverFall;return null;}
  fall.height-=fall.velocity*dt+4.9*dt*dt;
  fall.velocity+=9.8*dt;
  const ground=groundHeight(player.x,player.z,true);
  if(fall.height>ground)return null;
  delete player.riverFall;
  const step=Math.abs(RIVER_WALK_HEIGHT)/RIVER_STAIRS.steps;
  return fall.start-ground>3*step+1e-9?replies[Math.floor(random()*replies.length)]:null;
}
