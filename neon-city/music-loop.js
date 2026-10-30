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

// Plays one of a room's pre-written music loops, through a low-pass filter
// for the room's speakers, or a lower one when heard through a wall. The
// piece is chosen on each visit and plays from the start; the music swells
// in while the player is in the room and dies away when they leave.
export class MusicLoop{
  // samples(piece, rate, target) writes a loop into the supplied channel.
  constructor({pieces,samples,loopSeconds,rate,lowpass}){
    Object.assign(this,{pieces,samples,loopSeconds,rate,lowpass});
    this.buffers=new Map();
  }
  // Generate only the selected visit's track, directly into its audio buffer.
  prepare(context){
    if(!context||!this.piece||this.buffers.has(this.piece))return;
    this.buffers.clear();
    const buffer=context.createBuffer(1,Math.round(this.loopSeconds(this.piece)*this.rate),this.rate);
    this.samples(this.piece,this.rate,buffer.getChannelData(0));
    this.buffers.set(this.piece,buffer);
  }
  // Passing null ends the visit and releases the retained track.
  choose(piece){
    this.stop();this.buffers.clear();
    this.piece=piece;this.chosen=!!piece;
  }
  update(context,volume,lowpass=this.lowpass){
    if(!context||context.state!=='running')return;
    if(volume>0&&this.chosen){
      this.chosen=false;this.stop();this.prepare(context);this.context=context;
      const gain=context.createGain(),source=context.createBufferSource(),filter=context.createBiquadFilter();
      gain.gain.value=0;gain.connect(context.destination);
      source.buffer=this.buffers.get(this.piece);source.loop=true;
      filter.type='lowpass';filter.frequency.value=lowpass;
      source.connect(filter);filter.connect(gain);source.start();
      this.playing={piece:this.piece,gain,source,filter};
    }
    this.playing?.gain.gain.setTargetAtTime(volume,context.currentTime,.6);
    this.playing?.filter.frequency.setTargetAtTime(lowpass,context.currentTime,.1);
  }
  // Ends the last visit's piece, quickly fading out whatever is left of it.
  stop(){
    if(!this.playing)return;
    const {gain,source,filter}=this.playing;
    gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
    source.onended=()=>{
      source.buffer=null;source.disconnect();filter.disconnect();gain.disconnect();
      source.onended=null;
    };
    source.stop(this.context.currentTime+.2);
    this.playing=null;
  }
  mute(){
    this.playing?.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
  }
}
