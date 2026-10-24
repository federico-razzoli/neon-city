// A brass service bell: a struck note with inharmonic partials, the higher
// ones fading first, so it sounds a bright "dlin" and then rings away.
export const BELL_PARTIALS=[[2200,.1,1.6],[2200*2.76,.044,.8],[2200*5.4,.024,.4],[2200*8.93,.012,.2]];

export function playDeskBell(context){
  if(context?.state!=='running')return;
  const now=context.currentTime;
  for(const [frequency,level,ring] of BELL_PARTIALS){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(level,now+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,now+ring);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(now);oscillator.stop(now+ring+.02);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
