// Hotel lobby music: a slow ambient loop of soft pad chords, a low bass note
// and a sparse bell melody echoing away, played at a steady level in the hall.
export const LOBBY_MUSIC={rate:22050,chordSeconds:8,peak:.3,volume:.8};
const midi=n=>440*2**((n-69)/12);
// Dmaj9, Bm9, Gmaj9, Aadd9 (bass, then pad notes), MIDI numbers.
const CHORDS=[
  [38,[57,62,66,69,76]],
  [35,[57,62,66,69,73]],
  [31,[59,62,66,69,74]],
  [33,[57,61,64,69,71]]
];
// [beat in the loop, MIDI note]; beats are a second long.
const MELODY=[[1,78],[3.5,76],[6,73],[10,74],[12.5,73],[14,69],[18,71],[20.5,74],[22,78],[26,76],[28.5,73],[30,69]];
export const LOOP_SECONDS=CHORDS.length*LOBBY_MUSIC.chordSeconds;

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

export function lobbyMusicSamples(rate=LOBBY_MUSIC.rate){
  const length=LOOP_SECONDS*rate,pads=new Float32Array(length),bells=new Float32Array(length),{chordSeconds}=LOBBY_MUSIC;
  // Each chord swells in over three seconds and fades out over the next
  // chord's swell, with each note a pair of slightly detuned tones.
  const fade=3,hold=chordSeconds-fade;
  const swell=table(rate,chordSeconds+fade,t=>t<fade?.5-.5*Math.cos(Math.PI*t/fade):t<hold+fade?1:.5+.5*Math.cos(Math.PI*(t-hold-fade)/fade));
  CHORDS.forEach(([bass,notes],c)=>{
    const start=c*chordSeconds-fade/2;
    notes.forEach((note,n)=>{
      const f=midi(note);
      addNote(pads,rate,start+n*.12,swell,[[f,.045,0],[f*(1.003+n*.0007),.045,n],[2*f,.009,0]]);
    });
    const f=midi(bass);
    addNote(pads,rate,start,swell,[[f,.08,0],[2*f,.024,0]]);
  });
  // Soft bells: a struck tone with an inharmonic shimmer, ringing out.
  const strike=t=>.06*Math.min(1,t/.008)*Math.exp(-t*1.2);
  const ring=table(rate,4,strike),shimmer=table(rate,4,t=>.25*strike(t)*Math.exp(-t*2));
  for(const [beat,note] of MELODY){
    const f=midi(note);
    addNote(bells,rate,beat,ring,[[f,1,0]]);
    addNote(bells,rate,beat,shimmer,[[f*2.76,1,0]]);
  }
  // Echoes three-quarters of a second apart, wrapping round the loop.
  const echoes=new Float32Array(length);
  for(let k=1;k<=4;k++){
    const delay=Math.round(.75*k*rate),level=.45**k;
    for(let i=0;i<length;i++)echoes[(i+delay)%length]+=bells[i]*level;
  }
  const samples=new Float32Array(length);
  let peak=0;
  for(let i=0;i<length;i++){samples[i]=pads[i]+bells[i]+echoes[i];peak=Math.max(peak,Math.abs(samples[i]));}
  for(let i=0;i<length;i++)samples[i]*=LOBBY_MUSIC.peak/peak;
  return samples;
}

export class LobbyMusic{
  // Writing the loop takes a noticeable moment, so the game does it when
  // sound is switched on rather than at the hotel doors.
  prepare(context){
    if(!context||this.buffer)return;
    const data=lobbyMusicSamples();
    this.buffer=context.createBuffer(1,data.length,LOBBY_MUSIC.rate);
    this.buffer.getChannelData(0).set(data);
  }
  update(context,volume){
    if(!context||context.state!=='running')return;
    if(!this.gain){
      if(volume<=0)return;
      this.prepare(context);
      this.context=context;this.gain=context.createGain();this.gain.gain.value=0;
      this.gain.connect(context.destination);
      this.source=context.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;
      // A gentle low-pass keeps the music soft, like ceiling speakers.
      this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=3200;
      this.source.connect(this.filter);this.filter.connect(this.gain);this.source.start();
    }
    // The music swells in on entering the lobby and dies away on leaving.
    this.gain.gain.setTargetAtTime(volume,context.currentTime,.6);
  }
  mute(){
    if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
  }
}
