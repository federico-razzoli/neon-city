// Choose once per address so all walls agree, including after a block reloads.
export function hotelSignSeed(building){
  let hash=2166136261;
  for(const char of `hotel:${building.x},${building.z}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;
  return hash>>>0;
}

export function hotelHIsDim(building,time){
  if(building.sign!=='HOTEL'||Math.floor(building.h*9)<137)return false;
  const seed=building.hotelSignSeed??=hotelSignSeed(building);
  if(seed%3!==0)return false;
  // Brief, uneven outages in a burst, followed by several seconds of steady
  // light. Each hotel's phase and cycle length differ; no per-frame randomness.
  const period=4.7+(seed%29)/10,phase=(time+(seed%997)/97)%period;
  return phase<.09||(phase>.16&&phase<.23)||(phase>.39&&phase<.56)||(phase>.68&&phase<.73);
}

export function dimHotelH(ctx,height){
  ctx.save();
  ctx.fillStyle='#160c24';ctx.fillRect(132,height-137,24,16);
  ctx.shadowBlur=0;ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillStyle='#302331';ctx.fillText('H',144,height-124);
  ctx.restore();
}
