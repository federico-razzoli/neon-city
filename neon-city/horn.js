export function distanceToCar(player,car){
  const dx=Math.max(0,Math.abs(player.x-car.x)-(car.axis?2.35:1.05));
  const dz=Math.max(0,Math.abs(player.z-car.z)-(car.axis?1.05:2.35));
  return Math.hypot(dx,dz);
}

export class HornWarning {
  constructor(){this.cooldown=0;}
  update(dt,player,cars){
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.cooldown>0||!cars.some(car=>distanceToCar(player,car)<2))return false;
    this.cooldown=2.5;
    return true;
  }
}

export function playHorn(context){
  if(context?.state!=='running')return;
  const now=context.currentTime,gain=context.createGain(),filter=context.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=1800;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(.1,now+.025);
  gain.gain.setValueAtTime(.1,now+.26);
  gain.gain.exponentialRampToValueAtTime(.001,now+.4);
  filter.connect(gain);gain.connect(context.destination);
  let remaining=2;
  // A paired low/high tone gives a short, familiar two-tone car horn.
  for(const frequency of [350,440]){
    const oscillator=context.createOscillator();
    oscillator.type='sawtooth';oscillator.frequency.value=frequency;
    oscillator.connect(filter);oscillator.start(now);oscillator.stop(now+.41);
    oscillator.onended=()=>{oscillator.disconnect();if(--remaining===0){filter.disconnect();gain.disconnect();}};
  }
}
