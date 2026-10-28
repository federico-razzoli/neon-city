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

// Running tap water: a looping hiss of filtered noise with a gentle splash
// rising and falling in it, faded in and out to the volume asked for.
const LOOP_SECONDS=3;

export class TapWater{
  update(context,volume){
    if(!context||context.state!=='running')return;
    if(!this.gain){
      if(volume<=0)return;
      this.context=context;this.gain=context.createGain();this.gain.gain.value=0;
      this.gain.connect(context.destination);
      const rate=context.sampleRate,buffer=context.createBuffer(1,rate*LOOP_SECONDS,rate),samples=buffer.getChannelData(0);
      // Whole numbers of cycles per loop, so the swell joins up seamlessly.
      for(let i=0;i<samples.length;i++){
        const phase=2*Math.PI*i/samples.length;
        samples[i]=(Math.random()*2-1)*(1+.2*Math.sin(3*phase)+.12*Math.sin(11*phase+1)+.06*Math.sin(29*phase+2));
      }
      this.source=context.createBufferSource();this.source.buffer=buffer;this.source.loop=true;
      // One filtered layer per part of the sound: [type, frequency, Q, level].
      this.nodes=[];
      for(const [type,frequency,Q,level] of [['bandpass',1100,.7,.9],['bandpass',2600,1.2,.35],['highpass',5200,.7,.12]]){
        const filter=context.createBiquadFilter(),gain=context.createGain();
        filter.type=type;filter.frequency.value=frequency;filter.Q.value=Q;gain.gain.value=level;
        this.source.connect(filter);filter.connect(gain);gain.connect(this.gain);
        this.nodes.push(filter,gain);
      }
      this.source.start();
    }
    this.gain.gain.setTargetAtTime(volume,context.currentTime,.08);
  }
  mute(){
    if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
  }
}
