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

import {BLOCK} from './world.js?v=parks-4';

// Full volume on the lawn and its sidewalks, fading to silence across the street.
export const BIRD_FULL_DISTANCE=4,BIRD_SILENT_DISTANCE=22;
export function parkVolume(player,chunks){
  let nearest=Infinity;
  for(const chunk of chunks){
    if(!chunk.park)continue;
    const x=chunk.x*BLOCK+14,z=chunk.z*BLOCK+14;
    const dx=Math.max(x-player.x,0,player.x-x-36),dz=Math.max(z-player.z,0,player.z-z-36);
    nearest=Math.min(nearest,Math.hypot(dx,dz));
  }
  return Math.max(0,Math.min(1,(BIRD_SILENT_DISTANCE-nearest)/(BIRD_SILENT_DISTANCE-BIRD_FULL_DISTANCE)));
}

// Night birds: songbird trills and chirps, a two-note whistle, and an owl.
export const BIRD_CALLS=['trill','chirps','whistle','hoot'];
const CALL_WEIGHTS=[.32,.3,.24,.14];

export class BirdSchedule {
  constructor(random=Math.random){this.random=random;this.remaining=null;}
  reset(){this.remaining=null;}
  update(dt,nearby){
    if(!nearby){this.reset();return null;}
    if(this.remaining===null)this.remaining=.5+this.random()*1.5;
    this.remaining-=dt;
    if(this.remaining>0)return null;
    let pick=this.random(),kind=BIRD_CALLS.at(-1);
    for(let i=0;i<BIRD_CALLS.length;i++){if(pick<CALL_WEIGHTS[i]){kind=BIRD_CALLS[i];break;}pick-=CALL_WEIGHTS[i];}
    const call={kind,pitch:.9+this.random()*.25,pan:this.random()*1.6-.8,seed:Math.floor(this.random()*1e9)};
    // Calls never overlap: each one is followed by 0.8–3.5 seconds of quiet.
    this.remaining=birdCallDuration(kind)+.8+this.random()*2.7;
    return call;
  }
}

export function birdCallDuration(kind){
  return {trill:1.1,chirps:.9,whistle:1,hoot:1.6}[kind];
}

export function birdCallSamples(kind,rate,pitch=1,seed=1){
  const duration=birdCallDuration(kind),samples=new Float32Array(Math.ceil(duration*rate));
  let state=seed|0;
  const random=()=>{state=Math.imul(state^state>>>15,0x2c1b3c6d)+0x6d2b79f5|0;return ((state^state>>>13)>>>0)/4294967296;};
  // Each note: start time, length, start/end frequency, loudness.
  const notes=[];
  if(kind==='trill'){
    const count=9+Math.floor(random()*5),step=(duration-.12)/count;
    for(let i=0;i<count;i++)notes.push([i*step,.045,3300+random()*300,4600+random()*400,.09*(1-i/count*.4)]);
  }else if(kind==='chirps'){
    for(let i=0,count=2+Math.floor(random()*3);i<count;i++)notes.push([i*.21,.09,1900+random()*200,3900+random()*300,.1]);
  }else if(kind==='whistle'){
    // A clear "fee-bee": a high, slightly rising note, then a lower one.
    notes.push([.02,.32,2500,2650,.08],[.45,.4,2050,1980,.075]);
  }else{
    // A tawny owl's low "hoo ... hoo-hoo".
    notes.push([.02,.42,410,380,.12],[.75,.22,400,385,.09],[1.08,.42,395,360,.1]);
  }
  for(const [start,length,from,to,loudness] of notes){
    let phase=0;
    const first=Math.floor(start*rate),last=Math.min(samples.length-1,Math.floor((start+length)*rate));
    for(let i=first;i<=last;i++){
      const u=(i-first)/Math.max(1,last-first);
      const vibrato=kind==='hoot'?1+.012*Math.sin(2*Math.PI*6*u*length):1+.03*Math.sin(2*Math.PI*38*u*length);
      phase+=2*Math.PI*(from+(to-from)*u)*pitch*vibrato/rate;
      // Soft attack and decay; owls swell more slowly than songbirds.
      const envelope=kind==='hoot'?Math.sin(Math.PI*u)**1.5:Math.sin(Math.PI*Math.min(1,u*1.6))**2*(1-u*.3);
      samples[i]+=loudness*envelope*(Math.sin(phase)+(kind==='hoot'?.18:.08)*Math.sin(2*phase));
    }
  }
  return samples;
}

export class ParkBirds {
  constructor(random=Math.random){this.calls=new BirdSchedule(random);this.sources=new Set();}
  update(context,volume,dt=0){
    if(!context||context.state!=='running')return;
    if(!this.gain){
      if(volume<=0)return;
      this.context=context;this.gain=context.createGain();this.gain.gain.value=0;
      this.gain.connect(context.destination);
    }
    this.gain.gain.setTargetAtTime(volume,context.currentTime,.2);
    const call=this.calls.update(dt,volume>0);
    if(volume<=0)this.stopAll();
    if(!call)return;
    const data=birdCallSamples(call.kind,context.sampleRate,call.pitch,call.seed);
    const buffer=context.createBuffer(1,data.length,context.sampleRate);
    buffer.getChannelData(0).set(data);
    const source=context.createBufferSource();source.buffer=buffer;
    // Birds call from different places in the trees.
    let output=this.gain;
    if(context.createStereoPanner){output=context.createStereoPanner();output.pan.value=call.pan;output.connect(this.gain);}
    source.connect(output);
    source.onended=()=>{source.disconnect();if(output!==this.gain)output.disconnect();this.sources.delete(source);};
    this.sources.add(source);source.start();
  }
  stopAll(){for(const source of this.sources)source.stop();this.sources.clear();}
  mute(){
    if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
    this.stopAll();this.calls.reset();
  }
}
