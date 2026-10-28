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

import {occupiedCrossings} from './traffic.js?v=junction-priority-1';

export function distanceToCar(player,car){
  const dx=Math.max(0,Math.abs(player.x-car.x)-(car.axis?2.35:1.05));
  const dz=Math.max(0,Math.abs(player.z-car.z)-(car.axis?1.05:2.35));
  return Math.hypot(dx,dz);
}

export class HornWarning {
  constructor(){this.cooldown=0;this.crossings=new Map();}
  update(dt,player,cars){
    this.cooldown=Math.max(0,this.cooldown-dt);
    const active=new Map();
    let impatient=false;
    for(const crossing of occupiedCrossings(player)){
      const key=`${crossing.axis}:${crossing.street}:${crossing.start}`;
      const timer=this.crossings.get(key)??{elapsed:0,nextHorn:5};
      timer.elapsed+=dt;
      active.set(key,timer);
      const queued=cars.some(car=>car.waiting&&!car.turn&&car.axis===crossing.axis&&
        Math.abs((car.axis?car.z:car.x)-crossing.street)<4&&
        ((car.dir>0?crossing.start:crossing.end)-(car.axis?car.x:car.z))*car.dir>=0);
      if(queued&&timer.elapsed>timer.nextHorn){
        impatient=true;
        timer.nextHorn=timer.elapsed+2+Math.random();
      }
    }
    this.crossings=active;
    const nearby=player&&cars.some(car=>!car.waiting&&(car.speed??10)>0&&distanceToCar(player,car)<2);
    if(impatient){this.cooldown=2.5;return true;}
    if(this.cooldown>0||!nearby)return false;
    this.cooldown=2.5;
    return true;
  }
}

export function playHorn(context){
  if(context?.state!=='running')return;
  const acute=Math.random()<.5,duration=acute?1.5:1,pitch=acute?1.3:1;
  const now=context.currentTime,gain=context.createGain(),filter=context.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=1800*pitch;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(.1,now+.025*duration);
  gain.gain.setValueAtTime(.1,now+.26*duration);
  gain.gain.exponentialRampToValueAtTime(.001,now+.4*duration);
  filter.connect(gain);gain.connect(context.destination);
  let remaining=2;
  // Randomly choose the original two-tone horn or a higher, longer variant.
  for(const frequency of [350,440]){
    const oscillator=context.createOscillator();
    oscillator.type='sawtooth';oscillator.frequency.value=frequency*pitch;
    oscillator.connect(filter);oscillator.start(now);oscillator.stop(now+.41*duration);
    oscillator.onended=()=>{oscillator.disconnect();if(--remaining===0){filter.disconnect();gain.disconnect();}};
  }
}
