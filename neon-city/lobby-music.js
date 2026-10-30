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
// Hotel lobby music: slow ambient loops of soft pad chords over a low bass
// note, with a sparse melody echoing away, played at a steady level in the
// hall. Each visit to a lobby plays one of the pieces, chosen at random.
// The volume is a third quieter to the ear than the first level of .8: loudness
// halves every 10 dB, so that is 10*log2(2/3), about -5.85 dB.
export const LOBBY_MUSIC={rate:22050,peak:.3,volume:.8*(2/3)**(Math.log2(10)/2)};
const midi=n=>440*2**((n-69)/12);
// One note per [seconds into each chord], taking that pad note an octave up.
const arpeggio=(chords,chordSeconds,steps)=>chords.flatMap(([,notes],c)=>steps.map(([at,n])=>[c*chordSeconds+at,notes[n]+12]));
const LOUNGE_CHORDS=[
  [41,[57,64,67,72]],
  [40,[55,62,67,71]],
  [38,[53,60,64,69]],
  [36,[52,59,62,67]]
];
// Each piece: chords as [bass, pad notes] in MIDI numbers, a melody of
// [seconds into the loop, MIDI note], the voice playing it, and its echo.
export const LOBBY_PIECES=[
  // Bells over Dmaj9, Bm9, Gmaj9 and Aadd9.
  {name:'AIRPORT BELLS',chordSeconds:8,chords:[
    [38,[57,62,66,69,76]],
    [35,[57,62,66,69,73]],
    [31,[59,62,66,69,74]],
    [33,[57,61,64,69,71]]
  ],melody:[[1,78],[3.5,76],[6,73],[10,74],[12.5,73],[14,69],[18,71],[20.5,74],[22,78],[26,76],[28.5,73],[30,69]],
  // A struck tone with an inharmonic shimmer, ringing out.
  voice:{level:.06,attack:.008,decay:1.2,partial:2.76,partialLevel:.25,partialDecay:2},echo:{seconds:.75,feedback:.45}},
  // A slow electric-piano arpeggio drifting down Fmaj9, Em7, Dm9 and Cmaj9.
  {name:'NIGHT LOUNGE',chordSeconds:10,chords:LOUNGE_CHORDS,
  melody:arpeggio(LOUNGE_CHORDS,10,[[.5,0],[2,2],[3.5,1],[5.5,3],[7,2],[8.5,1]]),
  // A rounder, softer strike with its octave fading first.
  voice:{level:.05,attack:.015,decay:1.4,partial:2,partialLevel:.3,partialDecay:3},echo:{seconds:.6,feedback:.35}}
];
export const loopSeconds=piece=>piece.chords.length*piece.chordSeconds;

// Adds a note to the loop, starting at start seconds: a sum of [frequency,
// level, phase] tones shaped by envelope[i], one value per sample. A tail
// running past the end wraps round to the beginning, so the loop joins up
// seamlessly. Each tone turns a phasor rather than calling Math.sin, so the
// whole loop is written in a few tens of milliseconds.
function addNote(samples,rate,start,envelope,tones){
  const first=Math.round(start*rate),length=samples.length;
  for(const [frequency,level,phase] of tones){
    const step=2*Math.PI*frequency/rate,cs=Math.cos(step),sn=Math.sin(step);
    let c=Math.cos(phase),s=Math.sin(phase);
    for(let i=0,j=mod(first,length);i<envelope.length;i++){
      samples[j]+=level*envelope[i]*s;
      const next=c*cs-s*sn;s=s*cs+c*sn;c=next;
      if(++j===length)j=0;
    }
  }
}
const mod=(n,d)=>((n%d)+d)%d;
const table=(rate,seconds,f)=>Float32Array.from({length:Math.round(seconds*rate)},(_,i)=>f(i/rate));

export function lobbyMusicSamples(piece,rate=LOBBY_MUSIC.rate,samples=new Float32Array(Math.round(loopSeconds(piece)*rate))){
  const {chordSeconds,chords,melody,voice,echo}=piece;
  const length=loopSeconds(piece)*rate,pads=new Float32Array(length),notes=new Float32Array(length);
  // Each chord swells in over three seconds and fades out over the next
  // chord's swell, with each note a pair of slightly detuned tones.
  const fade=3,hold=chordSeconds-fade;
  const swell=table(rate,chordSeconds+fade,t=>t<fade?.5-.5*Math.cos(Math.PI*t/fade):t<hold+fade?1:.5+.5*Math.cos(Math.PI*(t-hold-fade)/fade));
  chords.forEach(([bass,pad],c)=>{
    const start=c*chordSeconds-fade/2;
    pad.forEach((note,n)=>{
      const f=midi(note);
      addNote(pads,rate,start+n*.12,swell,[[f,.045,0],[f*(1.003+n*.0007),.045,n],[2*f,.009,0]]);
    });
    const f=midi(bass);
    addNote(pads,rate,start,swell,[[f,.08,0],[2*f,.024,0]]);
  });
  // The melody's voice: a struck tone and an overtone that fades sooner.
  const strike=t=>voice.level*Math.min(1,t/voice.attack)*Math.exp(-t*voice.decay);
  const ring=table(rate,4,strike),overtone=table(rate,4,t=>voice.partialLevel*strike(t)*Math.exp(-t*voice.partialDecay));
  for(const [at,note] of melody){
    const f=midi(note);
    addNote(notes,rate,at,ring,[[f,1,0]]);
    addNote(notes,rate,at,overtone,[[f*voice.partial,1,0]]);
  }
  // Echoes of the melody, wrapping round the loop.
  const echoes=new Float32Array(length);
  for(let k=1;k<=4;k++){
    const delay=Math.round(echo.seconds*k*rate),level=echo.feedback**k;
    for(let i=0;i<length;i++)echoes[(i+delay)%length]+=notes[i]*level;
  }
  let peak=0;
  for(let i=0;i<length;i++){samples[i]=pads[i]+notes[i]+echoes[i];peak=Math.max(peak,Math.abs(samples[i]));}
  for(let i=0;i<length;i++)samples[i]*=LOBBY_MUSIC.peak/peak;
  return samples;
}

// A gentle low-pass keeps the lobby music soft, like ceiling speakers.
export class LobbyMusic extends MusicLoop{
  constructor(){super({pieces:LOBBY_PIECES,samples:lobbyMusicSamples,loopSeconds,rate:LOBBY_MUSIC.rate,lowpass:3200});}
}
