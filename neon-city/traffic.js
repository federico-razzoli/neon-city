import {BLOCK,RIVER_ROWS,hasBridge,isRiverRow,traffic} from './world.js?v=traffic-random-1';

const SPEED=10,RADIUS=6,HEADWAY=9;
const lane=car=>`${car.axis}:${car.dir}:${Math.round((car.axis?car.z:car.x)/BLOCK)}`;

// Match the painted crossings at offsets 9.5–12.2, including their gaps,
// and hold both lanes until the pedestrian reaches the pavement.
function occupiedCrossings(player){
  if(!player)return [];
  const x=Math.round(player.x/BLOCK)*BLOCK,z=Math.round(player.z/BLOCK)*BLOCK;
  if(isRiverRow(z/BLOCK))return [];
  const crossings=[];
  if(Math.abs(player.x-x)<=8.5&&player.z-z>=9&&player.z-z<=12.7)crossings.push({axis:0,street:x,start:z+9.5,end:z+12.2});
  if(Math.abs(player.z-z)<=8.5&&player.x-x>=9&&player.x-x<=12.7)crossings.push({axis:1,street:z,start:x+9.5,end:x+12.2});
  return crossings;
}

const tile=(x,z)=>`${Math.floor(x/BLOCK)},${Math.floor(z/BLOCK)}`;

function junction(car){
  if(car.axis||hasBridge(Math.round(car.x/BLOCK)))return null;
  for(const row of RIVER_ROWS){
    const bank=(row+(car.dir<0?2:0))*BLOCK;
    const distance=(bank-car.z)*car.dir;
    if(distance>=0&&distance<40)return {bank,street:Math.round(car.x/BLOCK)*BLOCK};
  }
  return null;
}

// Cars keep their identity while waiting and moving between loaded city tiles.
export class Traffic {
  constructor(){this.cars=[];this.loaded=new Set();this.blockedLanes=new Map();}

  update(chunks,time,dt,player){
    const tiles=[...chunks],loaded=new Set(tiles.map(c=>`${c.x},${c.z}`));
    this.cars=this.cars.filter(c=>loaded.has(tile(c.x,c.z)));
    this.updateSpawnLocks();
    for(const chunk of tiles)for(const candidate of traffic(chunk,time)){
      if(this.blockedLanes.has(lane(candidate)))continue;
      if(player&&Math.hypot(candidate.x-player.x,candidate.z-player.z)<12)continue;
      if(!loaded.has(tile(candidate.x,candidate.z)))continue;
      const previous=tile(candidate.x-(candidate.axis?candidate.dir*SPEED*dt:0),candidate.z-(candidate.axis?0:candidate.dir*SPEED*dt));
      if(this.loaded.has(`${chunk.x},${chunk.z}`)&&loaded.has(previous))continue;
      const turn=junction(candidate);
      if(turn&&(turn.bank-candidate.z)*candidate.dir<9)continue;
      // Leave extra room for cars joining the riverside lanes.
      const riverside=candidate.axis&&RIVER_ROWS.some(row=>Math.abs(candidate.z-row*BLOCK)<4||Math.abs(candidate.z-(row+2)*BLOCK)<4);
      if(riverside&&Math.floor((candidate.x-candidate.dir*SPEED*time)/BLOCK)%2!==0)continue;
      if(this.cars.some(c=>Math.hypot(c.x-candidate.x,c.z-candidate.z)<12))continue;
      this.cars.push({...candidate});
    }
    this.loaded=loaded;
    this.advance(dt,player);
    return this.cars;
  }

  updateSpawnLocks(){
    const present=new Set(this.cars),waiting=new Map();
    for(const [key,queue] of this.blockedLanes){
      for(const car of queue)if(!present.has(car)||!car.waiting)queue.delete(car);
      if(!queue.size)this.blockedLanes.delete(key);
    }
    for(const car of this.cars)if(car.waiting){
      const key=lane(car);
      if(!waiting.has(key))waiting.set(key,[]);
      waiting.get(key).push(car);
    }
    for(const [key,queue] of waiting)if(queue.length>=3&&!this.blockedLanes.has(key))this.blockedLanes.set(key,new Set(queue));
  }

  advance(dt,player){
    const crossings=occupiedCrossings(player);
    // Small steps keep queue spacing stable even after a slow frame.
    while(dt>1e-8){
      const step=Math.min(dt,.04);dt-=step;
      for(const car of this.cars){
        car.waiting=false;
        let travel=SPEED*step;
        const turn=car.turn??junction(car);
        if(turn&&!car.turn&&(turn.bank-car.z)*car.dir<=9+SPEED*step){
          travel-=Math.max(0,(turn.bank-car.z)*car.dir-9);
          car.z=turn.bank-car.dir*9;
          const mergeX=turn.street+car.dir*9,mergeZ=turn.bank-car.dir*3;
          const blocked=this.cars.some(other=>{
            if(other===car)return false;
            if(other.turn&&Math.hypot(other.x-mergeX,other.z-mergeZ)<16)return true;
            if(!other.axis||Math.abs(other.z-mergeZ)>2.8)return false;
            const gap=(other.x-mergeX)*car.dir;
            return gap>-24&&gap<14;
          });
          if(blocked){car.waiting=true;continue;}
          car.turn={...turn,angle:0};
        }
        const heading=car.turn?.angle??(car.axis?Math.PI/2:0);
        const dx=Math.sin(heading)*car.dir,dz=Math.cos(heading)*car.dir;
        for(const crossing of crossings)if(!car.turn&&car.axis===crossing.axis&&Math.abs((car.axis?car.z:car.x)-crossing.street)<4){
          const position=car.axis?car.x:car.z;
          const edge=car.dir>0?crossing.start:crossing.end;
          const distance=(edge-position)*car.dir;
          if(distance>=0)travel=Math.min(travel,Math.max(0,distance-3.5));
        }
        for(const other of this.cars){
          if(other===car)continue;
          const x=other.x-car.x,z=other.z-car.z;
          const along=x*dx+z*dz,across=Math.abs(x*dz-z*dx);
          if(along>0&&across<2.7&&other.dir===car.dir)travel=Math.min(travel,Math.max(0,along-HEADWAY));
        }
        if(travel<1e-8){car.waiting=true;continue;}
        if(car.turn){
          const t=car.turn;t.angle=Math.min(Math.PI/2,t.angle+travel/RADIUS);
          car.x=t.street+car.dir*(9-RADIUS*Math.cos(t.angle));
          car.z=t.bank+car.dir*(-9+RADIUS*Math.sin(t.angle));
          if(t.angle===Math.PI/2){car.axis=1;delete car.turn;}
        }else{car.x+=dx*travel;car.z+=dz*travel;}
      }
      this.updateSpawnLocks();
    }
  }
}
