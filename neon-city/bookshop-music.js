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

function renderSarabande(rate,samples){
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

// Lamplight, in 6/8. Durations are eighth notes, with zero pitch for a rest.
const lamplightBars=[
  [[36,3],[43,2],[45,1]], [[47,2],[43,1],[40,3]],
  [[41,3],[45,1],[48,2]], [[43,4],[0,2]],
  [[45,2],[48,1],[52,3]], [[50,3],[47,2],[43,1]],
  [[41,2],[45,1],[38,3]], [[43,4],[47,1],[50,1]],
  [[48,3],[43,2],[40,1]], [[38,3],[41,2],[45,1]],
  [[43,2],[50,1],[47,2],[43,1]], [[36,5],[0,1]]
];
const eighth=60/48/3;

function renderLamplight(rate,samples){
  function bass(start,pitch,length){
    const offset=Math.round(start*eighth*rate);
    const duration=length*eighth;
    const omega=2*Math.PI*440*2**((pitch-69)/12);
    for(let i=0;i<Math.floor(duration*rate);i++){
      const t=i/rate,phase=omega*t+.014*Math.sin(2*Math.PI*4*t);
      const bow=Math.min(1,t/.16,(duration-t)/.14);
      const body=Math.sin(phase)+.56*Math.sin(2*phase)+.28*Math.sin(3*phase)+.12*Math.sin(4*phase);
      samples[offset+i]+=.22*bow*(.8+.2*Math.sin(Math.PI*t/duration))*body;
    }
  }
  // A felt mallet striking a wooden bar, with a short, inharmonic overtone.
  function mallet(start,pitch,level){
    const offset=Math.round(start*eighth*rate),omega=2*Math.PI*440*2**((pitch-69)/12);
    for(let i=0;i<rate*.82;i++){
      const t=i/rate,phase=omega*t;
      const tone=Math.exp(-6*t)*Math.sin(phase)+.32*Math.exp(-17*t)*Math.sin(3.96*phase);
      samples[(offset+i)%samples.length]+=level*Math.min(1,t/.009)*Math.min(1,(.82-t)/.04)*tone;
    }
  }
  function triangle(start){
    const offset=Math.round(start*eighth*rate);
    for(let i=0;i<rate*1.4;i++){
      const t=i/rate,phase=2*Math.PI*t;
      const ring=Math.sin(phase*2410)+.64*Math.sin(phase*3167)+.38*Math.sin(phase*4531);
      const envelope=Math.min(1,t/.003,(1.4-t)/.05)*Math.exp(-3.6*t);
      samples[(offset+i)%samples.length]+=.042*ring*envelope;
    }
  }
  // Xylophone strikes as [eighth-note offset, MIDI pitch, level].
  // The E–G–F pickup returns higher midway and descends at the close.
  const xylophoneBars=[
    [[1.5,64,.12],[2,67,.15],[3,65,.17],[4.5,64,.13],[5,62,.11]],
    [[0,62,.16],[2,67,.12],[3.5,71,.15],[5,67,.11]],
    [[0,69,.17],[1.5,67,.12],[2,65,.14],[3,64,.15],[4,65,.12],[5,69,.13]],
    [[0,67,.17],[3.5,62,.13]],
    [[1.5,67,.12],[2,71,.15],[3,69,.17],[4,72,.14],[5.5,74,.12]],
    [[0,77,.17],[1,76,.13],[2,74,.14],[3.5,71,.15],[5,67,.11]],
    [[0,69,.16],[2,72,.12],[2.5,71,.10],[3,69,.15],[4.5,65,.13]],
    [[0,66,.11],[.5,67,.16],[3,74,.15],[5,71,.12]],
    [[0,72,.17],[1.5,64,.12],[2,67,.15],[3,65,.17],[4.5,64,.13],[5,62,.11]],
    [[0,65,.16],[2,69,.12],[3,72,.16],[4.5,71,.13],[5,69,.11]],
    [[0,67,.16],[1.5,74,.14],[3,65,.16],[4,64,.13],[5,62,.11]],
    [[0,60,.17]]
  ];
  lamplightBars.forEach((phrase,bar)=>{
    let start=bar*6;
    for(const [pitch,length] of phrase){
      if(pitch)bass(start,pitch,length);
      start+=length;
    }
    for(const [offset,pitch,level] of xylophoneBars[bar])mallet(bar*6+offset,pitch,level);
    if(bar%2===1)triangle(bar*6+3);
  });
}

const pieces=[
  {name:'Sarabande',seconds:bars.length*3*beat,render:renderSarabande},
  {name:'Lamplight',seconds:lamplightBars.length*6*eighth,render:renderLamplight}
];

export class BookshopMusic extends MusicLoop{
  constructor(){
    super({pieces,samples:(piece,rate,samples)=>piece.render(rate,samples),
      loopSeconds:piece=>piece.seconds,rate:22050,lowpass:4800});
  }
  enter(){this.choose(this.pieces[Math.floor(Math.random()*this.pieces.length)]);}
}
