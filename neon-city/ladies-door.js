// SPDX-License-Identifier: AGPL-3.0-only
export const LADIES_DOOR_TEXT='DANNY... IS IT YOU?';
export const LADIES_DOOR_SECONDS=3.25;
let buffer=null,loading=null;
export function loadLadiesDoorVoice(context){
  if(!context||buffer)return Promise.resolve(buffer);
  loading??=fetch(new URL('./assets/ladies-danny.wav?v=female-1',import.meta.url))
    .then(response=>{if(!response.ok)throw new Error('Ladies door voice unavailable');return response.arrayBuffer();})
    .then(data=>context.decodeAudioData(data)).then(value=>{buffer=value;return value;})
    .catch(()=>null).finally(()=>{loading=null;});
  return loading;
}

// Attempts persist for the session; the active scene is cleared on leaving.
export class LadiesDoorEvent{
  constructor(random=Math.random){this.random=random;this.attempts=0;this.active=null;this.source=null;}
  try(occupied,life,register,context,index){
    if(this.active)return true;
    const chance=this.attempts++===0?.75:.5;
    if(this.random()>=chance)return false;
    const event=this.active={occupied,life,index,elapsed:0,loading:!!context};
    life.hauntedLadiesPending=index;
    register.PUB_PARANORMAL_ACTIVITIES=true;
    loadLadiesDoorVoice(context).then(()=>{event.loading=false;});
    return true;
  }
  get text(){return this.active?LADIES_DOOR_TEXT:'';}
  stopAudio(){if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}}
  cancel(){this.stopAudio();if(this.active)delete this.active.life.hauntedLadiesPending;this.active=null;}
  update(dt,context,present=true,playing=true){
    if(!this.active)return;
    if(!present){this.cancel();return;}
    if(!playing){this.stopAudio();return;}
    const event=this.active;
    if(event.loading)return;
    event.elapsed+=Math.max(0,dt);
    if(event.elapsed>=LADIES_DOOR_SECONDS){
      event.occupied[event.index]=false;
      event.life.emptyLadies=true;
      delete event.life.hauntedLadiesPending;
      this.stopAudio();this.active=null;return;
    }
    if(context?.state!=='running')return;
    if(!buffer){loadLadiesDoorVoice(context);return;}
    if(!this.source&&event.elapsed<buffer.duration){
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
      source.start(context.currentTime,event.elapsed);this.source=source;
    }
  }
}
