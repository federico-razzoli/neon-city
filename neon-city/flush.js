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

// A toilet flush: a rush of water swelling and draining away, a few gurgles
// as the bowl empties, then the quiet hiss of the cistern refilling.
export const FLUSH_SECONDS=6;

export function playFlush(context,random=Math.random){
  if(context?.state!=='running')return;
  const now=context.currentTime,rate=context.sampleRate;
  const noise=context.createBuffer(1,Math.ceil(rate*FLUSH_SECONDS),rate),samples=noise.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=random()*2-1;
  // One filtered noise layer per part of the flush: [type, frequency from, to, peak, start, rise, end].
  const layers=[['bandpass',500,900,.8,0,.12,3.2],['lowpass',260,180,.5,0,.08,2.8],['highpass',3200,3200,.06,2.6,.6,FLUSH_SECONDS]];
  for(const [type,from,to,peak,start,rise,end] of layers){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=noise;filter.type=type;
    filter.frequency.setValueAtTime(from,now+start);
    filter.frequency.linearRampToValueAtTime(to,now+end);
    gain.gain.setValueAtTime(0,now+start);
    gain.gain.linearRampToValueAtTime(peak,now+start+rise);
    gain.gain.setValueAtTime(peak,now+start+(end-start)*.4);
    gain.gain.exponentialRampToValueAtTime(.0001,now+end);
    source.connect(filter);filter.connect(gain);gain.connect(context.destination);
    source.start(now+start);source.stop(now+end+.05);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  // Gurgles: short low notes that drop in pitch as the water goes down.
  for(let i=0;i<4;i++){
    const at=now+2+i*.22+random()*.08,pitch=160+random()*120;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(pitch,at);
    oscillator.frequency.exponentialRampToValueAtTime(pitch*.55,at+.12);
    gain.gain.setValueAtTime(0,at);
    gain.gain.linearRampToValueAtTime(.12,at+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,at+.14);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(at);oscillator.stop(at+.16);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
