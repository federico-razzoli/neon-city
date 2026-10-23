export function arcadeVolume(player,buildings){
  let nearest=Infinity;
  for(const b of buildings){
    if(b.sign!=='ARCADE')continue;
    const dx=Math.max(b.x-player.x,0,player.x-b.x-b.w);
    const dz=Math.max(b.z-player.z,0,player.z-b.z-b.d);
    nearest=Math.min(nearest,Math.hypot(dx,dz));
  }
  return Math.max(0,Math.min(1,(12-nearest)/10));
}

export function drawArcade(g,height){
  const y=height-39;
  const rect=(colour,x,z,w,h)=>{g.fillStyle=colour;g.fillRect(x,y+z,w,h);};
  rect('#191329',0,0,160,39);
  // Glazed display windows reveal rows of cabinets and a chequered floor.
  for(const x of [6,96]){
    rect('#72648b',x,3,58,33);rect('#090e25',x+2,5,54,29);
    rect('#3d2358',x+3,6,52,2);
    for(let row=0;row<3;row++)for(let col=0;col<13;col++){
      rect((row+col)%2?'#292540':'#48405e',x+3+col*4,28+row*2,4,2);
    }
    for(let i=0;i<3;i++){
      const cx=x+5+i*17,colour=['#ee47b8','#53ddea','#ffd166'][i];
      rect('#30233d',cx,10,13,21);rect(colour,cx+1,10,11,3);
      rect('#111827',cx+1,14,11,10);rect('#17394b',cx+2,15,9,7);
      // Distinct tiny game screens: invaders, a maze, and a racer.
      if(i===0){for(let n=0;n<3;n++)rect('#7bff9b',cx+3+n*3,16,2,2);rect('#ff80cd',cx+5,20,3,1);}
      if(i===1){rect('#63a4ff',cx+3,16,7,1);rect('#63a4ff',cx+3,16,1,5);rect('#ffe285',cx+6,19,2,2);}
      if(i===2){rect('#8c92bc',cx+4,15,1,7);rect('#8c92bc',cx+9,15,1,7);rect('#ff6584',cx+6,19,2,3);}
      rect(colour,cx,24,13,2);rect('#111322',cx+1,26,11,5);
      rect('#f4e4eb',cx+3,23,1,2);rect('#fa678d',cx+8,24,2,1);
    }
    // Subtle glass reflections leave the interior readable.
    g.globalAlpha=.13;rect('#a9e9ff',x+4,7,2,25);rect('#a9e9ff',x+49,7,3,25);g.globalAlpha=1;
    rect('#79698a',x+28,4,2,31);
  }
  // Solid closed door with inset glass, frame, threshold and handle.
  rect('#8d7799',68,2,24,37);rect('#30243e',70,4,20,34);
  rect('#111b31',73,7,14,19);rect('#4b415c',74,8,2,17);
  rect('#ddd3ad',85,28,2,5);rect('#776681',70,37,20,2);
}

export class ArcadeEffectSchedule {
  constructor(random=Math.random){this.random=random;this.remaining=null;}
  reset(){this.remaining=null;}
  update(dt,nearby){
    if(!nearby){this.reset();return null;}
    if(this.remaining===null)this.remaining=3+this.random()*3;
    this.remaining-=dt;
    if(this.remaining>0)return null;
    const effect={kind:['laser','crash','pinball'][Math.floor(this.random()*3)],duration:1+this.random()};
    // Leave 3–6 seconds of music alone after each effect finishes.
    this.remaining=effect.duration+3+this.random()*3;
    return effect;
  }
}

export function arcadeEffectSamples(kind,duration,rate,random=Math.random){
  const samples=new Float32Array(Math.ceil(duration*rate));
  let phase=0,noise=0;
  for(let i=0;i<samples.length;i++){
    const t=i/rate,u=t/duration;
    let value;
    if(kind==='laser'){
      const pulse=t%.24,frequency=1600*Math.exp(-pulse*14)+90;
      phase+=2*Math.PI*frequency/rate;
      value=.11*Math.exp(-pulse*10)*Math.sign(Math.sin(phase));
    }else if(kind==='crash'){
      // Tyre squeal gives way to crunchy, low-resolution impact noise.
      if(i%Math.max(1,Math.floor(rate/5000))===0)noise=random()*2-1;
      phase+=2*Math.PI*(700+180*Math.sin(t*65))/rate;
      const impact=Math.max(0,(u-.24)/.76);
      value=u<.24?.07*Math.sin(phase):.18*noise*Math.exp(-impact*3)+.07*Math.sin(2*Math.PI*65*t)*Math.exp(-impact*7);
    }else{
      const pulse=t%.18,note=[784,1046.5,1318.5,1046.5,1568][Math.floor(t/.18)%5];
      value=.12*Math.exp(-pulse*22)*(Math.sin(2*Math.PI*note*pulse)+.3*Math.sin(2*Math.PI*note*2.76*pulse));
    }
    samples[i]=value*Math.min(1,t/.008,(duration-t)/.06);
  }
  return samples;
}

export class ArcadeAmbience {
  constructor(){this.effects=new ArcadeEffectSchedule();}
  update(context,volume,dt=0){
    if(!context||context.state!=='running')return;
    if(!this.gain){
      if(volume<=0)return;
      this.context=context;this.gain=context.createGain();this.gain.gain.value=0;
      this.gain.connect(context.destination);
      const rate=context.sampleRate,buffer=context.createBuffer(1,rate*8,rate),samples=buffer.getChannelData(0);
      const notes=[261.63,329.63,392,523.25,392,329.63,293.66,440];
      // Several imaginary cabinets: a melody, coin pings and descending laser chirps.
      for(let i=0;i<samples.length;i++){
        const t=i/rate,beat=t%.25,envelope=Math.max(0,1-beat/.18);
        const tone=Math.sin(2*Math.PI*notes[Math.floor(t*4)%8]*t);
        const ping=t%1,laser=t%.8;
        samples[i]=.035*envelope*(tone+.3*Math.sin(2*Math.PI*notes[Math.floor(t*4)%8]*2*t))
          +.025*Math.exp(-ping*18)*Math.sin(2*Math.PI*1320*ping)
          +.018*Math.max(0,1-laser/.2)*Math.sin(2*Math.PI*(900*laser-1400*laser*laser));
        samples[i]*=Math.min(1,t/.02,(8-t)/.02);
      }
      this.source=context.createBufferSource();this.source.buffer=buffer;this.source.loop=true;
      this.source.connect(this.gain);this.source.start();
    }
    this.gain.gain.setTargetAtTime(volume,context.currentTime,.15);
    const effect=this.effects.update(dt,volume>0);
    if(volume<=0&&this.effectSource){this.effectSource.stop();this.effectSource=null;}
    if(effect){
      const data=arcadeEffectSamples(effect.kind,effect.duration,context.sampleRate);
      const buffer=context.createBuffer(1,data.length,context.sampleRate);
      buffer.getChannelData(0).set(data);
      const source=context.createBufferSource();source.buffer=buffer;source.connect(this.gain);
      source.onended=()=>{source.disconnect();if(this.effectSource===source)this.effectSource=null;};
      this.effectSource=source;source.start();
    }
  }
  mute(){
    if(this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
    if(this.effectSource){this.effectSource.stop();this.effectSource=null;}
    this.effects.reset();
  }
}
