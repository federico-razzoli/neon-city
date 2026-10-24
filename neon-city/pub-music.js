import {MusicLoop} from './music-loop.js?v=pub-music-1';
// Pub music: boogie-woogie piano. A twelve-bar blues in C with a rolling
// left-hand bass of eight swung notes to the bar, under right-hand riffs
// with crushed blue notes and runs down the blues scale.
// Played at about the same level as the hotel lobby music.
export const PUB_MUSIC={rate:22050,peak:.3,volume:.55};
const midi=n=>440*2**((n-69)/12);

// Seconds per beat; 0.36 s is about 167 beats a minute, a whole number of
// samples per beat. Swung eighths split each beat two thirds to one third.
const BEAT=.36;
const slotTime=slot=>BEAT*Math.floor(slot/2)+(slot%2?BEAT*2/3:0);
// The classic walking bass, up through the chord and its sixth and seventh
// and back down: semitones above the bar's root, one per swung eighth.
const WALK=[0,4,7,9,10,9,7,4];
// Right-hand riffs: [eighth of the bar, semitones above the root, seconds
// held]. A note given as [from, to] is crushed: a quick grace note sliding
// up a semitone, the blue third to the major third.
const RIFFS={
  stabs:[[1,[[3,4],7,12],.22],[3,[[3,4],7,12],.22],[5,[10,12],.18],[6,[[3,4],7,12],.4]],
  run:[[0,[15],.15],[1,[12],.15],[2,[10],.15],[3,[7],.15],[4,[6],.15],[5,[5],.15],[6,[3],.15],[7,[0],.3]],
  shout:[[0,[7,12,16],.3],[2,[[3,4],7,12],.18],[3,[7,12,16],.18],[4,[[3,4],7,12],.18],[5,[7,10,12],.4]]
};
// [left-hand root, right-hand root, riff] for each of the twelve bars:
// I I I I, IV IV I I, V IV I V.
export const BOOGIE={name:'BOOGIE-WOOGIE',bars:[
  [36,60,'stabs'],[36,60,'stabs'],[36,60,'run'],[36,60,'shout'],
  [41,65,'stabs'],[41,65,'run'],[36,60,'stabs'],[36,60,'shout'],
  [43,67,'stabs'],[41,65,'stabs'],[36,60,'run'],[43,67,'shout']
]};
export const PUB_PIECES=[BOOGIE];
export const loopSeconds=piece=>piece.bars.length*4*BEAT;

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

export function pubMusicSamples(piece,rate=PUB_MUSIC.rate){
  const samples=new Float32Array(Math.round(loopSeconds(piece)*rate));
  let n=0;
  piece.bars.forEach(([low,high,riff],bar)=>{
    const barStart=bar*4*BEAT;
    // Left hand: each bass note with its octave above, accents on the beat.
    WALK.forEach((step,slot)=>{
      const at=barStart+slotTime(slot)+.006*humanise(n++),velocity=(slot%2?.75:1)*(1+.08*humanise(n++));
      const held=(slot%2?BEAT/3:BEAT*2/3)*.9;
      addPianoNote(samples,rate,at,low+step,held,velocity);
      addPianoNote(samples,rate,at,low+step+12,held,velocity*.55);
    });
    // Right hand.
    for(const [slot,notes,held] of RIFFS[riff]){
      const at=barStart+slotTime(slot)+.008*humanise(n++),velocity=.8*(1+.1*humanise(n++));
      for(const note of notes){
        if(Array.isArray(note)){
          addPianoNote(samples,rate,at-.04,high+note[0],.05,velocity*.7);
          addPianoNote(samples,rate,at,high+note[1],held,velocity);
        }else addPianoNote(samples,rate,at,high+note,held,velocity);
      }
    }
  });
  let peak=0;
  for(const v of samples)peak=Math.max(peak,Math.abs(v));
  for(let i=0;i<samples.length;i++)samples[i]*=PUB_MUSIC.peak/peak;
  return samples;
}

// An upright piano heard across a busy room: the very top is softened.
export class PubMusic extends MusicLoop{
  constructor(){super({pieces:PUB_PIECES,samples:pubMusicSamples,rate:PUB_MUSIC.rate,lowpass:5000});}
}
