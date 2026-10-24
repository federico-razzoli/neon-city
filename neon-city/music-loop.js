// Plays one of a room's pre-written music loops, through a low-pass filter
// for the room's speakers. The piece is chosen on each visit and plays from
// the start; the music swells in while the player is in the room and dies
// away when they leave.
export class MusicLoop{
  // pieces: what can be chosen; samples(piece) writes a piece's loop at rate.
  constructor({pieces,samples,rate,lowpass}){
    Object.assign(this,{pieces,samples,rate,lowpass});
    this.buffers=new Map();
  }
  // Writing the loops takes a noticeable moment, so the game does it when
  // sound is switched on rather than at the doors.
  prepare(context){
    if(!context)return;
    for(const piece of this.pieces)if(!this.buffers.has(piece)){
      const data=this.samples(piece),buffer=context.createBuffer(1,data.length,this.rate);
      buffer.getChannelData(0).set(data);this.buffers.set(piece,buffer);
    }
  }
  // The piece for this visit, played from the start.
  choose(piece){this.piece=piece;this.chosen=true;}
  update(context,volume){
    if(!context||context.state!=='running')return;
    if(volume>0&&this.chosen){
      this.chosen=false;this.stop();this.prepare(context);this.context=context;
      const gain=context.createGain(),source=context.createBufferSource(),filter=context.createBiquadFilter();
      gain.gain.value=0;gain.connect(context.destination);
      source.buffer=this.buffers.get(this.piece);source.loop=true;
      filter.type='lowpass';filter.frequency.value=this.lowpass;
      source.connect(filter);filter.connect(gain);source.start();
      this.playing={piece:this.piece,gain,source};
    }
    this.playing?.gain.gain.setTargetAtTime(volume,context.currentTime,.6);
  }
  // Ends the last visit's piece, quickly fading out whatever is left of it.
  stop(){
    if(!this.playing)return;
    const {gain,source}=this.playing;
    gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.stop(this.context.currentTime+.2);
    this.playing=null;
  }
  mute(){
    this.playing?.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
  }
}
