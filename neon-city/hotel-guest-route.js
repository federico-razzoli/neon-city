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

import {HOTEL,ROBOT_ROUTE} from './hotel-interior.js';
import {HOTEL_STAIRWELL,stairwellHeight} from './hotel-stairwell.js';
import {HOTEL_CORRIDOR,corridorRooms} from './hotel-corridor.js';

// Doorway transitions connect the three separately rendered hotel interiors.
export function businessmanRoute(arriving,floor=3){
  const lobby=ROBOT_ROUTE.map(p=>({...p,scene:'lobby'}));
  const stair=(x,z,floor,flight=null)=>({x,z,scene:'stairs',y:stairwellHeight({x,z},{floor,flight})});
  const {stairStart:s,stairEnd:e,depth:d}=HOTEL_STAIRWELL;
  const flights=[stair(4,1.2,1),stair(6.5,1.5,1),stair(6.5,s,1),
    stair(6.5,e,2),stair(6.5,e+1.5,2),stair(1.5,e+1.5,2),
    stair(1.5,e,2),stair(1.5,s,3),stair(1.5,1.5,3),
    stair(4,1.5,3),stair(4,d-.4,3)];
  const upward=floor===2?[...flights.slice(0,5),stair(4,e+1.5,2),stair(4,d-.4,2)]:flights;
  const room=corridorRooms(floor).filter(r=>r.side==='right').at(-1),cx=HOTEL_CORRIDOR.width/2;
  const corridor=[{x:cx,z:.4},{x:cx,z:room.z},{x:room.x-.3,z:room.z}]
    .map(p=>({...p,scene:`corridor:${floor}`,y:0}));
  if(arriving)return [lobby.at(-1),lobby[3],lobby[2],lobby[1],lobby[0],...upward,...corridor];
  return [...[...corridor].reverse(),...[...upward].reverse(),...lobby];
}

// First-floor guests leave their room, cross the corridor and stairwell,
// then follow the shared lobby route to reception and the street.
export function robotRoute(random=Math.random){
  const rooms=corridorRooms(1),room=rooms[Math.min(rooms.length-1,Math.floor(random()*rooms.length))];
  const cx=HOTEL_CORRIDOR.width/2;
  const corridor=[{x:room.x+(room.side==='left'?.3:-.3),z:room.z},
    {x:cx,z:room.z},{x:cx,z:.4}].map(p=>({...p,scene:'corridor:1',y:0}));
  const stairs=[{x:4,z:HOTEL_STAIRWELL.depth-.4},{x:4,z:1.2}]
    .map(p=>({...p,scene:'stairs',y:stairwellHeight(p,{floor:1})}));
  return [...corridor,...stairs,...ROBOT_ROUTE.map(p=>({...p,scene:'lobby'}))];
}
