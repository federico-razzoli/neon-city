// SPDX-License-Identifier: AGPL-3.0-only
export const CUBICLE_KNOCK_CHANCE=.5;
export const KNOCK_TEXT='KNOCK KNOCK';
export const CHILD_TEXT="MOM? I CAN'T SEE YOU... WHERE ARE YOU?";
export const KNOCK_EXIT_TEXT='WTF JUST HAPPENED!?..';
export const KNOCK_AT=.7,CHILD_AT=2.1,KNOCK_AUDIO_SECONDS=6.882,CHILD_TEXT_END=8;
let buffer=null,loading=null,retryAt=0;

export function rollCubicleKnock(random=Math.random){return random()<CUBICLE_KNOCK_CHANCE;}
export function loadCubicleKnock(context){
  if(!context||buffer)return Promise.resolve(buffer);
  if(Date.now()<retryAt)return Promise.resolve(null);
  loading??=fetch(new URL('./assets/cubicle-child-knock.wav?v=door-recording-2',import.meta.url))
    .then(response=>{if(!response.ok)throw new Error('Knock audio unavailable');return response.arrayBuffer();})
    .then(data=>context.decodeAudioData(data)).then(value=>{buffer=value;return value;})
    .catch(()=>{retryAt=Date.now()+5000;return null;}).finally(()=>{loading=null;});
  return loading;
}

// Game time drives both subtitles and the audio offset, so pausing and late
// audio decoding cannot make the voice restart or play outside the cubicle.
export class CubicleKnockEvent{
  constructor(){this.elapsed=0;this.source=null;this.disposed=false;}
  get text(){return this.elapsed<KNOCK_AT||this.elapsed>=CHILD_TEXT_END?'':this.elapsed<CHILD_AT?KNOCK_TEXT:CHILD_TEXT;}
  update(dt,context,playing=true){
    if(this.disposed)return;
    if(!playing){this.stopAudio();return;}
    this.elapsed+=Math.max(0,dt);
    if(this.elapsed>=KNOCK_AUDIO_SECONDS){this.stopAudio();return;}
    if(!context||context.state!=='running')return;
    if(!buffer){loadCubicleKnock(context);return;}
    if(!this.source&&this.elapsed<buffer.duration){
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
      source.start(context.currentTime,this.elapsed);this.source=source;
    }
  }
  stopAudio(){if(!this.source)return;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}
  dispose(){if(this.disposed)return;this.stopAudio();this.disposed=true;}
}
