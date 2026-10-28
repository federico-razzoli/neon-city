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

import {random,streetType,traffic,mod} from './world.js?v=rive-gauche-6';
import {HOTEL_STAIRWELL} from './hotel-stairwell.js?v=hotel-cash-2';

// A continuous street scene shared by all floors of one hotel. Wrapping happens
// well beyond the window, and appearances stay stable while people pass by.
export function hotelStreetLife(seed,time,floor){
  const ground=-6-(floor-1)*HOTEL_STAIRWELL.rise,people=[],cars=[];
  const rng=random(seed),lane=100+Math.abs(seed|0);
  for(let track=0;track<4;track++){
    const dir=track%2?1:-1,speed=.85+rng()*.35;
    for(let i=0;i<4;i++){
      const phase=i*30+rng()*12,type=streetType(rng()),variant=rng();
      people.push({x:mod(phase+time*speed*dir,120)-60,
        z:24.12+[.8,2.1,10.55,11.45][track],y:ground+.16,
        type,variant,walkTime:time*speed,facingX:dir,facingZ:0});
    }
  }
  // Use the city's own vehicle selection, colours, spacing and travel speed.
  for(let x=-1;x<=0;x++)for(const c of traffic({x,z:lane},time)){
    if(c.axis!==1||Math.abs(c.x)>60)continue;
    cars.push({...c,z:24.12+6.5-c.dir*1.75,y:ground});
  }
  return {people,cars};
}
