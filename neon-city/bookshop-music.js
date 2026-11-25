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

import {MusicLoop} from './music-loop.js?v=visit-buffer-1';

// Sarabande in D minor. Each bar pairs a broken piano chord (bass first)
// with a flute phrase in [MIDI pitch, quarter-note beats]. Zero is a breath.
const bars=[
  [[50,57,62,65],[[0,.5],[69,.5],[74,1.5],[72,.5]]],
  [[49,57,64,67],[[72,.5],[73,.5],[76,1],[73,1]]],
  [[50,57,62,65],[[74,1.5],[69,.5],[65,1]]],
  [[53,57,60,65],[[67,.5],[69,.5],[72,2]]],
  [[46,53,58,62],[[74,1],[77,1.5],[76,.5]]],
  [[43,55,58,62],[[74,1],[70,1],[67,1]]],
  [[52,58,62,67],[[67,.5],[69,.5],[70,1],[74,1]]],
  [[45,57,61,64],[[73,2.5],[0,.5]]],
  [[50,57,62,65],[[69,.5],[74,.5],[77,1],[76,.5],[74,.5]]],
  [[48,55,60,64],[[67,.5],[72,.5],[76,1],[74,.5],[72,.5]]],
  [[46,53,58,62],[[65,.5],[70,.5],[74,1],[72,.5],[70,.5]]],
  [[45,53,57,60],[[69,1.5],[67,.5],[65,1]]],
  [[43,50,55,58],[[67,1],[70,1.5],[69,.5]]],
  [[45,57,62,65],[[69,1],[74,1],[77,1]]],
  [[45,55,61,64],[[76,1.5],[74,.5],[73,1]]],
  [[50,57,62,65],[[74,2.5],[0,.5]]]
];
const beat=60/54;
const loopSeconds=()=>bars.length*3*beat;

function renderScore(piece,rate,samples){
  function note(start,pitch,beats,flute,level){
    const offset=Math.round(start*beat*rate),hold=beats*beat;
    const omega=2*Math.PI*440*2**((pitch-69)/12);
    const release=flute?.12:.32;
    const count=Math.ceil((hold+release)*rate);
    for(let i=0;i<count;i++){
      const t=i/rate,phase=omega*t;
      const tail=Math.max(0,1-Math.max(0,t-hold)/release);
      let tone;
      if(flute){
        const p=phase+.09*Math.min(1,t*3)*Math.sin(2*Math.PI*4.7*t);
        tone=Math.min(1,t/.09)*(Math.sin(p)+.12*Math.sin(2*p)+.045*Math.sin(3*p));
      }else{
        tone=Math.min(1,t/.006)*Math.exp(-1.7*t)*(Math.sin(phase)+
          Math.exp(-3*t)*(.38*Math.sin(2*phase)+.21*Math.sin(3.003*phase)+.09*Math.sin(5.01*phase)));
      }
      samples[(offset+i)%samples.length]+=level*tone*tail*tail;
    }
  }
  bars.forEach(([chord,melody],bar)=>{
    let onset=bar*3;
    note(onset,chord[0],2.7,false,.16);
    [1,2,3,2,1].forEach((voice,i)=>note(bar*3+(i+1)/2,chord[voice],.65,false,i===1?.105:.08));
    for(const [pitch,duration] of melody){
      if(pitch)note(onset,pitch,duration*.94,true,.14);
      onset+=duration;
    }
  });
}

export class BookshopMusic extends MusicLoop{
  constructor(){super({pieces:['Sarabande'],samples:renderScore,loopSeconds,rate:22050,lowpass:4800});}
  enter(){this.choose(this.pieces[0]);}
}
