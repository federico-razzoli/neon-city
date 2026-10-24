// BANSHEE: one roll per cubicle entry; seconds measured against a real clock.
export const BANSHEE_CHANCE=.25,SCREAM_SECONDS=5,FADE_SECONDS=2;
export function rollBanshee(random=Math.random,misses=0){return misses>=3||random()<BANSHEE_CHANCE;}
export function bansheeFrame(seconds){
  // One quiet second before the flicker; controls remain locked.
  if(seconds<1)return {active:true,dark:false,opacity:0};
  seconds-=1;
  if(seconds>=1+SCREAM_SECONDS+FADE_SECONDS)return {active:false,dark:false,opacity:0};
  if(seconds<1)return {active:true,dark:[1,3,4,7,9,12,14,17].includes(Math.floor(seconds*18)),opacity:0};
  return {active:true,dark:true,opacity:seconds<1+SCREAM_SECONDS?1:(1+SCREAM_SECONDS+FADE_SECONDS-seconds)/FADE_SECONDS};
}
// A voiced, breathy vowel scream: rising pitch, vibrato and three vocal
// formants. A finite buffer guarantees exactly five seconds of sound.
export function playBansheeScream(context,delay=0,random=Math.random){
  if(!context)return;
  const rate=context.sampleRate,buffer=context.createBuffer(1,rate*SCREAM_SECONDS,rate),data=buffer.getChannelData(0);
  let phase=0;
  for(let i=0;i<data.length;i++){
    const t=i/rate,pitch=740+180*Math.sin(Math.PI*t/SCREAM_SECONDS)+26*Math.sin(t*37);
    phase+=2*Math.PI*pitch/rate;
    let voice=0;
    for(let harmonic=1;harmonic<=8;harmonic++){
      const f=harmonic*pitch;
      const weight=.7*Math.exp(-(((f-900)/450)**2))+.5*Math.exp(-(((f-2400)/600)**2))+.2*Math.exp(-(((f-3400)/700)**2));
      voice+=Math.sin(phase*harmonic)*weight/harmonic;
    }
    const envelope=Math.min(1,t/.045,(SCREAM_SECONDS-t)/.12);
    data[i]=Math.tanh(voice*1.8+(random()*2-1)*.08)*envelope*.38;
  }
  const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
  source.start(context.currentTime+delay);source.onended=()=>source.disconnect();
  return source;
}
// Preload the transparent photographic apparition when the game module loads.
const portrait=typeof Image==='undefined'?null:new Image();
if(portrait)portrait.src=new URL('./assets/banshee.png',import.meta.url).href;
export function drawBanshee(ctx,width,height,seconds,opacity){
  if(!portrait?.complete||!portrait.naturalWidth||opacity<=0)return;
  const h=height*.98,w=h*portrait.naturalWidth/portrait.naturalHeight;
  ctx.save();
  // The portrait is always 75% transparent; the event adds its fade.
  ctx.globalAlpha=.25*Math.max(0,Math.min(1,opacity));
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(portrait,(width-w)/2,height*.01+Math.sin(seconds*2)*2,w,h);
  ctx.restore();
}
