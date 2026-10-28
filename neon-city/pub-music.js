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

import {MusicLoop} from './music-loop.js?v=pub-music-2';
// Pub music: boogie-woogie, twelve-bar blues with a piano left hand of eight
// swung notes to the bar under right-hand riffs with crushed blue notes;
// one tune is for solo piano, the other for a trio with bass and drums.
// Each visit to the pub plays one of the tunes, chosen at random.
// Played at about the same level as the hotel lobby music. Through the
// lavatory wall it is barely audible and muffled; in a cubicle, gone.
export const PUB_MUSIC={rate:22050,peak:.3,volume:.55,lavatory:{level:.05,lowpass:700}};
// How the pub music is heard in each place: {volume, lowpass}, where an
// undefined lowpass keeps the speakers' own.
export function pubMusicHeard(place){
  if(place==='pub')return {volume:PUB_MUSIC.volume};
  if(place==='lavatory')return {volume:PUB_MUSIC.volume*PUB_MUSIC.lavatory.level,lowpass:PUB_MUSIC.lavatory.lowpass};
  return {volume:0};
}
const midi=n=>440*2**((n-69)/12);

// Swung eighths split each beat two thirds to one third.
const slotTime=(beat,slot)=>beat*Math.floor(slot/2)+(slot%2?beat*2/3:0);
// Boogie in C: seconds per beat, a whole number of samples at the rate; the
// left hand's eight notes to the bar, as semitones above the bar's root, and
// the [semitones, level] it plays on each; right-hand riffs as [eighth of
// the bar, semitones above the root, seconds held], where a note given as
// [from, to] is crushed: a quick grace note sliding up a semitone, the blue
// third to the major third; and [left-hand root, right-hand root, riff] for
// each of the twelve bars.
export const BOOGIE_IN_C={name:'BOOGIE IN C',beat:.36,
  // About 167 beats a minute. The classic walking bass, up through the
  // chord and its sixth and seventh and back down, with its octave above.
  walk:[0,4,7,9,10,9,7,4],left:step=>[[step,1],[step+12,.55]],
  riffs:{
    stabs:[[1,[[3,4],7,12],.22],[3,[[3,4],7,12],.22],[5,[10,12],.18],[6,[[3,4],7,12],.4]],
    run:[[0,[15],.15],[1,[12],.15],[2,[10],.15],[3,[7],.15],[4,[6],.15],[5,[5],.15],[6,[3],.15],[7,[0],.3]],
    shout:[[0,[7,12,16],.3],[2,[[3,4],7,12],.18],[3,[7,12,16],.18],[4,[[3,4],7,12],.18],[5,[7,10,12],.4]]
  },
  // I I I I, IV IV I I, V IV I V.
  bars:[
    [36,60,'stabs'],[36,60,'stabs'],[36,60,'run'],[36,60,'shout'],
    [41,65,'stabs'],[41,65,'run'],[36,60,'stabs'],[36,60,'shout'],
    [43,67,'stabs'],[41,65,'stabs'],[36,60,'run'],[43,67,'shout']
  ]};

// Jump Boogie in F, for piano, upright bass and brushed drums: two choruses
// of the twelve-bar blues. The first plays a theme in call and response; the
// second is a solo that opens with four bars of stop-time, the band hitting
// only the first beat while the piano runs on alone, then comes back in with
// a rolling left hand. No right-hand bar is played twice.
// Left-hand patterns: eight notes to the bar, a null being a rest, as
// semitones above the bar's root, and how each is voiced.
const LEFT={
  walk:{steps:[0,4,7,9,10,9,7,4],voice:step=>[[step,1],[step+12,.55]]},
  // Broken octaves rolling up the chord, then back down it.
  rollUp:{steps:[0,12,4,16,7,19,9,21],voice:step=>[[step,.9]]},
  rollDown:{steps:[22,10,21,9,19,7,16,4],voice:step=>[[step,.9]]},
  // Stop-time: one hit on the first beat.
  stop:{steps:[0,null,null,null,null,null,null,null],voice:step=>[[step,1],[step+12,.7]]}
};
// Upright bass lines: [beat, semitones above the bass root].
const BASS={
  two:[[0,0],[2,7]],
  up:[[0,0],[1,4],[2,7],[3,9]],
  down:[[0,10],[1,9],[2,7],[3,4]],
  // Climbing chromatically from the fifth to the next chord's root.
  lead:[[0,0],[1,2],[2,3],[3,4]],
  stop:[[0,0]]
};
// The chords, as [left-hand root, upright bass root], in F.
const F7=[41,29],BB7=[46,34],C7=[48,36];
// Right-hand phrases, as [beat, semitones above F above middle C, seconds
// held, loudness], with notes crushed as in Boogie in C. Triplets fall on
// thirds of a beat, swung quavers on two thirds.
const A=[3,4],DB=[8,9],EB=[10,11],AH=[15,16];
const triplets=(from,notes,held=.1)=>notes.map((n,i)=>[from+i/3,[n],held]);
// A tremolo in triplets from the first beat, between two sets of notes.
const tremolo=(a,b,count)=>Array.from({length:count},(_,i)=>[i/3,i%2?b:a,.1]);
export const JUMP_BOOGIE_IN_F={name:'JUMP BOOGIE IN F',beat:.38,
  // About 158 beats a minute, relaxed enough for the band to swing. The
  // crash cymbal sets its peak, so it is written to a higher one to sound
  // as loud as the solo piano.
  peak:.4,
  bars:[
    // First chorus: the theme.
    {chord:F7,left:'walk',bass:'two',drums:'ride',right:[[.667,[A,7,12],.22],[1.667,[A,7,12],.22],[2.667,[10,12],.2],[3,[A,7,12],.5]]},
    {chord:F7,left:'walk',bass:'two',drums:'ride',right:[...triplets(0,[15,12,10]),[1,[12],.3],[2,[7],.2],[2.667,[5],.15],[3,[A],.4]]},
    {chord:F7,left:'walk',bass:'two',drums:'ride',right:[[.667,[A,7,12],.22],[1.667,[A,7,12],.22],[2.667,[10,15],.2],[3,[AH,19],.5]]},
    {chord:F7,left:'walk',bass:'up',drums:'ride',right:[[0,[0],.15],[.667,[3],.12],[1,[4],.15],[1.667,[7],.12],[2,[9],.15],[2.667,[10],.15],[3,[[11,12],15],.35],[3.667,[14],.2]]},
    {chord:BB7,left:'walk',bass:'up',drums:'ride',right:[[.667,[DB,12,17],.22],[1.667,[DB,12,17],.22],[2.667,[15,17],.2],[3,[DB,12,17],.5]]},
    {chord:BB7,left:'walk',bass:'down',drums:'ride',right:[...triplets(0,[17,15,12]),[1,[10],.15],[1.667,[9],.2],[2,[5],.3],[3,[3],.15],[3.333,[4],.15],[3.667,[7],.25]]},
    {chord:F7,left:'walk',bass:'up',drums:'ride',right:[...tremolo([12],[4,7],9),[3,[A,7,12],.45]]},
    {chord:F7,left:'walk',bass:'down',drums:'ride',right:[...triplets(0,[19,17,15,12,10,7,5,3]),[2.667,[0],.3],[3.667,[11],.25]]},
    {chord:C7,left:'walk',bass:'up',drums:'ride',right:[[0,[EB,14,19],.3],[1.667,[EB,14,19],.2],[2.667,[EB,14,19],.2],[3.667,[17],.15]]},
    {chord:BB7,left:'walk',bass:'down',drums:'ride',right:[[0,[DB,12,17],.3],...triplets(1,[15,12,9],.13),[2,[5],.3],[3,[A,7],.3]]},
    // The turnaround: an inner voice sliding down under F.
    {chord:F7,left:'walk',bass:'up',drums:'ride',right:[[0,[9,12],.18],[.667,[8,12],.15],[1,[7,12],.18],[1.667,[6,12],.15],[2,[5,12],.18],[2.667,[4,12],.2],[3.667,[EB],.2]]},
    {chord:C7,left:'walk',bass:'lead',drums:'fill',right:[[0,[7,11,17],.3],[1,[EB,14],.2],[2.667,[17],.12],[3,[14],.12],[3.333,[11],.12],[3.667,[7],.2]]},
    // Second chorus: stop-time, the piano answering each hit on its own.
    {chord:F7,left:'stop',bass:'stop',drums:'stopCrash',louder:1.1,right:[[0,[A,7,12],.4],[1.667,[12],.1],...triplets(2,[15,16,19]),[3,[24],.3],[3.667,[22],.15]]},
    {chord:BB7,left:'stop',bass:'stop',drums:'stop',louder:1.1,right:[[0,[DB,12,17],.4],[1.667,[17],.1],...triplets(2,[15,12,9]),...triplets(3,[5,3,4])]},
    {chord:F7,left:'stop',bass:'stop',drums:'stop',louder:1.1,right:[[0,[A,7,12],.4],[1.333,[AH,19],.25],[2,[AH,19],.25],[2.667,[AH,19],.25],[3.333,[24],.4]]},
    {chord:F7,left:'stop',bass:'stop',drums:'stopFill',louder:1.1,right:[[0,[A,7,12],.3],...triplets(1,[22,19,15,17,15,12,10,9]),[3.667,[DB],.2]]},
    // The band is back, and the left hand rolls.
    {chord:BB7,left:'rollUp',bass:'up',drums:'crash',louder:1.1,right:[[0,[5,17],.3],[.667,[9,21],.2],[1.667,[12,24],.2],[2.667,[9,21],.2],[3,[DB,12,17],.4]]},
    {chord:BB7,left:'rollDown',bass:'down',drums:'ride',louder:1.1,right:[...tremolo([17],[9,12],9),[3,[DB,12,17],.4]]},
    {chord:F7,left:'rollUp',bass:'up',drums:'ride',louder:1.1,right:[[.667,[12,24],.12],[1,[12,24],.12],[1.667,[12,24],.12],[2,[AH,19],.25],[2.667,[12,24],.12],[3.667,[12,24],.15]]},
    {chord:F7,left:'rollDown',bass:'down',drums:'ride',louder:1.1,right:[...triplets(0,[0,3,5,6,7,10,12,15,17,18,19]),[3.667,[23],.2]]},
    {chord:C7,left:'rollUp',bass:'up',drums:'ride',louder:1.1,right:[[0,[EB,14,19],.35],[.667,[EB,14,19],.2],[1.667,[EB,14,19],.2],[2.667,[17,22],.2],[3,[EB,14,19],.4]]},
    {chord:BB7,left:'rollDown',bass:'down',drums:'ride',louder:1.1,right:[[0,[12,24],.25],[.667,[9,21],.15],[1,[5,17],.25],[2,[DB,12,17],.25],[2.667,[DB,12,17],.2],[3.667,[A],.2]]},
    {chord:F7,left:'walk',bass:'up',drums:'ride',louder:1.1,right:[...triplets(0,[12,11,10,9,8,7]),[2,[A,7,12],.3],[3,[A,7,12],.15],[3.667,[11],.2]]},
    {chord:C7,left:'walk',bass:'lead',drums:'fill',louder:1.1,right:[[0,[7,11,17],.3],[1,[EB,14,17],.3],[2,[14,17],.2],[2.667,[13,16],.2],[3,[12,15],.2],[3.667,[7,11],.2]]}
  ]};
export const PUB_PIECES=[BOOGIE_IN_C,JUMP_BOOGIE_IN_F];
export const loopSeconds=piece=>piece.bars.length*4*piece.beat;
// Every tune's bars in one form: the left hand's root, steps and voicing;
// the right hand's root and phrases as [seconds into the bar, notes, held,
// loudness]; and the band's parts, if any.
function scoreBars(piece){
  const {beat}=piece;
  if(piece.riffs)return piece.bars.map(([low,high,riff])=>({low,high,steps:piece.walk,voice:piece.left,
    right:piece.riffs[riff].map(([slot,notes,held])=>[slotTime(beat,slot),notes,held,1])}));
  return piece.bars.map(bar=>({...LEFT[bar.left],low:bar.chord[0],high:65,bassRoot:bar.chord[1],bass:BASS[bar.bass],drums:bar.drums,
    right:bar.right.map(([at,notes,held,loud=1])=>[at*beat,notes,held,loud*(bar.louder??1)])}));
}

// A piano note: a few slightly stretched partials, each dying away faster
// than the one below, struck quickly and damped when the key is let go.
// A tail running past the end of the loop wraps round to its start.
function addPianoNote(samples,rate,start,note,held,velocity){
  const f=midi(note),first=Math.round(start*rate),length=samples.length;
  const attack=.003*rate,release=.08*rate,keyUp=Math.round(held*rate),count=keyUp+release;
  // Higher notes ring more briefly.
  const brightness=Math.min(1.6,Math.max(.6,f/260));
  for(let k=1;k<=5;k++){
    const step=2*Math.PI*f*k*Math.sqrt(1+.0004*k*k)/rate,cs=Math.cos(step),sn=Math.sin(step);
    const fall=Math.exp(-(1.2+.9*k)*brightness/rate);
    let c=1,s=0,level=velocity*.12/k**1.4;
    for(let i=0,j=((first%length)+length)%length;i<count;i++){
      const shape=Math.min(1,i/attack)*(i<keyUp?1:1-(i-keyUp)/release);
      samples[j]+=level*shape*s;
      const next=c*cs-s*sn;s=s*cs+c*sn;c=next;level*=fall;
      if(++j===length)j=0;
    }
  }
}

// A steady but human touch: each note a few milliseconds early or late and a
// little louder or softer, the same every time the loop is written.
const humanise=n=>Math.sin(n*12.9898)*43758.5453%1;

// Adds a recorded sound to the loop at start seconds, scaled by level and
// wrapping round the end of the loop.
function addSound(samples,rate,start,sound,level){
  const length=samples.length;
  for(let i=0,j=((Math.round(start*rate)%length)+length)%length;i<sound.length;i++){
    samples[j]+=level*sound[i];
    if(++j===length)j=0;
  }
}
// Upright bass: a plucked string, round and quickly fading, its partials
// turning phasors as the piano's do.
function addBassNote(samples,rate,start,note,held,velocity){
  const f=midi(note),first=Math.round(start*rate),length=samples.length;
  const attack=.006*rate,release=.06*rate,keyUp=Math.round(held*rate),count=keyUp+release;
  for(const [k,partial,decay] of [[1,1,3],[2,.5,5],[3,.2,8]]){
    const step=2*Math.PI*f*k/rate,cs=Math.cos(step),sn=Math.sin(step),fall=Math.exp(-decay/rate);
    let c=1,s=0,level=velocity*.11*partial;
    for(let i=0,j=((first%length)+length)%length;i<count;i++){
      samples[j]+=level*Math.min(1,i/attack)*(i<keyUp?1:1-(i-keyUp)/release)*s;
      const next=c*cs-s*sn;s=s*cs+c*sn;c=next;level*=fall;
      if(++j===length)j=0;
    }
  }
}
// Brushed drums from a fixed stream of noise, so they are the same each time.
// Each drum is recorded once, as [seconds, voice(t)], and replayed per hit.
function drumKit(rate){
  let seed=1987;
  const noise=Float32Array.from({length:rate},()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/2147483648-1;});
  // Bright noise: the difference of neighbouring samples.
  const hiss=t=>{const i=Math.floor(t*rate)%(rate-1);return noise[i+1]-noise[i];};
  const shimmer=t=>Math.sin(2*Math.PI*3210*t)+Math.sin(2*Math.PI*4170*t)+.7*Math.sin(2*Math.PI*5320*t);
  const drums={
    ride:[.6,t=>.022*Math.exp(-t*7)*hiss(t)+.006*Math.exp(-t*4)*shimmer(t)],
    crash:[1.6,t=>.05*Math.exp(-t*2.5)*hiss(t)+.01*Math.exp(-t*2)*shimmer(t)],
    hat:[.06,t=>.03*Math.exp(-t*70)*hiss(t)],
    brush:[.25,t=>.035*Math.exp(-t*16)*noise[Math.floor(t*rate)%rate]+.02*Math.exp(-t*30)*Math.sin(2*Math.PI*190*t)],
    kick:[.3,t=>.09*Math.exp(-t*12)*Math.sin(2*Math.PI*(45*t+25*(1-Math.exp(-t*20))/20))]
  };
  // The kit sits about 9 dB under the piano, the bass about 7 dB.
  return Object.fromEntries(Object.entries(drums).map(([name,[seconds,voice]])=>[name,Float32Array.from({length:Math.round(seconds*rate)},(_,i)=>2.5*voice(i/rate))]));
}
// Drum patterns: [beat, drum, loudness]. The ride swings ding, ding-a-ding;
// the hi-hat closes and the brush lands on two and four; the kick is felt
// on every beat rather than heard.
const SWING=[[0,'ride',1],[1,'ride',1],[1.667,'ride',.6],[2,'ride',1],[3,'ride',1],[3.667,'ride',.6],
  [1,'hat',1],[3,'hat',1],[1,'brush',.8],[3,'brush',.8],[0,'kick',.6],[1,'kick',.4],[2,'kick',.6],[3,'kick',.4]];
const DRUMS={
  ride:SWING,
  crash:[[0,'crash',1],...SWING.filter(([at,drum])=>at||drum!=='ride')],
  // A triplet roll on the brush leads into the next chorus.
  fill:[...SWING.filter(([at])=>at<2),...[2,2.333,2.667,3,3.333,3.667].map((at,i)=>[at,'brush',.6+.1*i]),[3,'kick',.7]],
  stop:[[0,'kick',1],[0,'ride',1]],
  stopCrash:[[0,'kick',1],[0,'crash',1]],
  stopFill:[[0,'kick',1],[0,'ride',1],...[2,2.333,2.667,3,3.333,3.667].map((at,i)=>[at,'brush',.6+.1*i])]
};

export function pubMusicSamples(piece,rate=PUB_MUSIC.rate){
  const {beat}=piece,samples=new Float32Array(Math.round(loopSeconds(piece)*rate));
  const kit=piece.riffs?null:drumKit(rate);
  let n=0,m=1e5;
  scoreBars(piece).forEach(({low,high,steps,voice,right,bassRoot,bass,drums},bar)=>{
    const barStart=bar*4*beat;
    // Left hand, with accents on the beat.
    steps.forEach((step,slot)=>{
      const at=barStart+slotTime(beat,slot)+.006*humanise(n++),velocity=(slot%2?.75:1)*(1+.08*humanise(n++));
      const held=(slot%2?beat/3:beat*2/3)*.9;
      if(step!==null)for(const [note,level] of voice(step))addPianoNote(samples,rate,at,low+note,held,velocity*level);
    });
    // Right hand.
    for(const [offset,notes,held,loud] of right){
      const at=barStart+offset+.008*humanise(n++),velocity=.8*loud*(1+.1*humanise(n++));
      for(const note of notes){
        if(Array.isArray(note)){
          addPianoNote(samples,rate,at-.04,high+note[0],.05,velocity*.7);
          addPianoNote(samples,rate,at,high+note[1],held,velocity);
        }else addPianoNote(samples,rate,at,high+note,held,velocity);
      }
    }
    // The band, when there is one.
    for(const [at,step] of bass??[])addBassNote(samples,rate,barStart+at*beat+.005*humanise(m++),bassRoot+step,beat*.9,1+.1*humanise(m++));
    for(const [at,drum,loud] of DRUMS[drums]??[]){
      const level=loud*(1+.12*humanise(m++));
      addSound(samples,rate,barStart+at*beat+.004*humanise(m++),kit[drum],level);
    }
  });
  let peak=0;
  for(const v of samples)peak=Math.max(peak,Math.abs(v));
  for(let i=0;i<samples.length;i++)samples[i]*=(piece.peak??PUB_MUSIC.peak)/peak;
  return samples;
}

// An upright piano heard across a busy room: the very top is softened.
export class PubMusic extends MusicLoop{
  constructor(){super({pieces:PUB_PIECES,samples:pubMusicSamples,rate:PUB_MUSIC.rate,lowpass:5000});}
}
