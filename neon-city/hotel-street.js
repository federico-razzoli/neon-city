import {random,streetType,traffic,mod} from './world.js?v=rive-gauche-6';
import {HOTEL_STAIRWELL} from './hotel-stairwell.js?v=hotel-cash-2';

// A continuous street scene shared by all floors of one hotel. Wrapping happens
// well beyond the window, and appearances stay stable while people pass by.
export function hotelStreetLife(seed,time,floor){
  const ground=-6-(floor-1)*HOTEL_STAIRWELL.rise,people=[],cars=[];
  const rng=random(seed),lane=100+Math.abs(seed|0);
  for(let track=0;track<4;track++){
    const dir=track%2?1:-1,speed=.85+rng()*.35;
    for(let i=0;i<4;i++){
      const phase=i*30+rng()*12,type=streetType(rng()),variant=rng();
      people.push({x:mod(phase+time*speed*dir,120)-60,
        z:24.12+[.8,2.1,10.55,11.45][track],y:ground+.16,
        type,variant,walkTime:time*speed,facingX:dir,facingZ:0});
    }
  }
  // Use the city's own vehicle selection, colours, spacing and travel speed.
  for(let x=-1;x<=0;x++)for(const c of traffic({x,z:lane},time)){
    if(c.axis!==1||Math.abs(c.x)>60)continue;
    cars.push({...c,z:24.12+6.5-c.dir*1.75,y:ground});
  }
  return {people,cars};
}
