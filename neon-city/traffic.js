/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

import {BLOCK,RIVER_ROWS,hasBridge,isRiverRow,traffic} from './world.js?v=traffic-random-1';

const SPEED=10,RADIUS=6,HEADWAY=9;
const BRAKING=4,ACCELERATION=4;
// Keep the whole car outside the crossing while waiting for junction priority.
const JUNCTION_EDGE=17,APPROACH=31.5;
const lane=car=>`${car.axis}:${car.dir}:${Math.round((car.axis?car.z:car.x)/BLOCK)}`;

// Match the painted crossings at offsets 9.5–12.2, including their gaps,
// and hold both lanes until the pedestrian reaches the pavement.
export function occupiedCrossings(player){
  if(!player)return [];
  const x=Math.round(player.x/BLOCK)*BLOCK,z=Math.round(player.z/BLOCK)*BLOCK;
  if(isRiverRow(z/BLOCK))return [];
  const crossings=[];
  if(Math.abs(player.x-x)<=8.5&&player.z-z>=9&&player.z-z<=12.7)crossings.push({axis:0,street:x,start:z+9.5,end:z+12.2});
  if(Math.abs(player.z-z)<=8.5&&player.x-x>=9&&player.x-x<=12.7)crossings.push({axis:1,street:z,start:x+9.5,end:x+12.2});
  return crossings;
}

function crossingStop(car,crossing){
  const position=car.axis?car.x:car.z;
  const speed=car.speed??SPEED,stoppingDistance=speed*speed/(2*BRAKING)+speed*.04;
  const approachStop=Math.round(crossing.start/BLOCK)*BLOCK-car.dir*JUNCTION_EDGE;
  const canStopAt=stop=>(stop-position)*car.dir>=stoppingDistance-1e-7;
  return canStopAt(approachStop)?approachStop:null;
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

// Index both road axes so turns remain visible to either lane. Entries store
// their coordinates: moving a car must not invalidate the sorted order before
// its entry is removed. Narrow strips also work across negative coordinates.
const STRIP=3;
const position=(car,axis)=>axis?car.x:car.z;
const transverse=(car,axis)=>axis?car.z:car.x;
function lowerBound(entries,value){
  let lo=0,hi=entries.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(entries[mid].position<value)lo=mid+1;else hi=mid;}
  return lo;
}
class RoadIndex {
  constructor(cars){
    this.axes=[new Map(),new Map()];this.entries=new Map();
    for(const car of cars){
      const records=[];
      for(let axis=0;axis<2;axis++){
        const key=Math.floor(transverse(car,axis)/STRIP),entry={car,key,position:position(car,axis)};
        const strips=this.axes[axis];
        if(!strips.has(key))strips.set(key,[]);
        strips.get(key).push(entry);records.push(entry);
      }
      this.entries.set(car,records);
    }
    for(const strips of this.axes)for(const entries of strips.values())entries.sort((a,b)=>a.position-b.position);
  }
  update(car){
    const records=this.entries.get(car);
    for(let axis=0;axis<2;axis++){
      const entry=records[axis],next=position(car,axis),key=Math.floor(transverse(car,axis)/STRIP);
      if(entry.position===next&&entry.key===key)continue;
      const strips=this.axes[axis],old=strips.get(entry.key);
      old.splice(old.indexOf(entry),1);
      if(!old.length)strips.delete(entry.key);
      entry.position=next;entry.key=key;
      if(!strips.has(key))strips.set(key,[]);
      const entries=strips.get(key);entries.splice(lowerBound(entries,next),0,entry);
    }
  }
  *range(axis,across,min,max,start,end){
    const strips=this.axes[axis];
    for(let key=Math.floor((across+min)/STRIP);key<=Math.floor((across+max)/STRIP);key++){
      const entries=strips.get(key);if(!entries)continue;
      for(let i=lowerBound(entries,start);i<entries.length&&entries[i].position<=end;i++)yield entries[i].car;
    }
  }
  clearance(car){
    const axis=car.axis,across=transverse(car,axis),at=position(car,axis),strips=this.axes[axis];
    let gap=Infinity;
    for(let key=Math.floor((across-2.7)/STRIP);key<=Math.floor((across+2.7)/STRIP);key++){
      const entries=strips.get(key);if(!entries)continue;
      let i=lowerBound(entries,at);
      if(car.dir<0)i--;
      for(;i>=0&&i<entries.length;i+=car.dir){
        const entry=entries[i],other=entry.car,distance=(entry.position-at)*car.dir;
        if(distance>=gap)break;
        if(distance<=0||other===car||other.dir!==car.dir||(!other.turn&&other.axis!==axis)||Math.abs(transverse(other,axis)-across)>=2.7)continue;
        gap=distance;break;
      }
    }
    return Math.max(0,gap-HEADWAY);
  }
}

// Cars keep their identity while waiting and moving between loaded city tiles.
export class Traffic {
  constructor(){this.cars=[];this.loaded=new Set();this.blockedLanes=new Map();this.junctionOwners=new Map();this.arrivals=new Map();this.elapsed=0;}

  update(chunks,time,dt,player,pedestrians=[]){
    const tiles=[...chunks],loaded=new Set(tiles.map(c=>`${c.x},${c.z}`));
    this.cars=this.cars.filter(c=>loaded.has(tile(c.x,c.z)));
    this.updateSpawnLocks();
    for(const chunk of tiles)for(const candidate of traffic(chunk,time)){
      if(this.blockedLanes.has(lane(candidate)))continue;
      if([player,...pedestrians].some(p=>p&&Math.hypot(candidate.x-p.x,candidate.z-p.z)<12))continue;
      if(!loaded.has(tile(candidate.x,candidate.z)))continue;
      const previous=tile(candidate.x-(candidate.axis?candidate.dir*SPEED*dt:0),candidate.z-(candidate.axis?0:candidate.dir*SPEED*dt));
      if(this.loaded.has(`${chunk.x},${chunk.z}`)&&loaded.has(previous))continue;
      const turn=junction(candidate);
      if(turn&&(turn.bank-candidate.z)*candidate.dir<9)continue;
      // Leave extra room for cars joining the riverside lanes.
      const riverside=candidate.axis&&RIVER_ROWS.some(row=>Math.abs(candidate.z-row*BLOCK)<4||Math.abs(candidate.z-(row+2)*BLOCK)<4);
      if(riverside&&Math.floor((candidate.x-candidate.dir*SPEED*time)/BLOCK)%2!==0)continue;
      if(this.cars.some(c=>Math.hypot(c.x-candidate.x,c.z-candidate.z)<12))continue;
      // Do not introduce new cross-traffic inside a junction already in use.
      const cx=Math.round(candidate.x/BLOCK)*BLOCK,cz=Math.round(candidate.z/BLOCK)*BLOCK;
      const inside=Math.abs((candidate.axis?candidate.x-cx:candidate.z-cz))<JUNCTION_EDGE;
      if(inside&&!RIVER_ROWS.some(row=>cz/BLOCK>=row&&cz/BLOCK<=row+2)&&
        this.cars.some(c=>c.axis!==candidate.axis&&Math.abs(c.x-cx)<APPROACH&&Math.abs(c.z-cz)<APPROACH))continue;
      this.cars.push({...candidate});
    }
    this.loaded=loaded;
    this.advance(dt,player,pedestrians);
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
    for(const [key,queue] of waiting)if(queue.length>=2&&!this.blockedLanes.has(key))this.blockedLanes.set(key,new Set(queue));
  }

  junctionLimits(index=new RoadIndex(this.cars)){
    const groups=new Map(),present=new Set(this.cars),limits=new Map();
    for(const car of this.arrivals.keys())if(!present.has(car))this.arrivals.delete(car);
    for(const car of this.cars){
      if(car.turn)continue;
      const x=Math.round(car.x/BLOCK)*BLOCK,z=Math.round(car.z/BLOCK)*BLOCK;
      // Riverside merges retain their existing turning priority.
      if(RIVER_ROWS.some(row=>z/BLOCK>=row&&z/BLOCK<=row+2))continue;
      const along=((car.axis?car.x:car.z)-(car.axis?x:z))*car.dir;
      if(along < -APPROACH||along>JUNCTION_EDGE)continue;
      const key=`${x},${z}`;
      let arrival=this.arrivals.get(car);
      if(arrival?.key!==key){
        arrival={key,time:this.elapsed+Math.max(0,-along-JUNCTION_EDGE)/Math.max(1,car.speed??SPEED)};
        this.arrivals.set(car,arrival);
      }
      if(!groups.has(key))groups.set(key,[]);
      const exitBlocked=[...index.range(car.axis,transverse(car,car.axis),-2.7,2.7,
        (car.axis?x:z)-JUNCTION_EDGE-HEADWAY,(car.axis?x:z)+JUNCTION_EDGE+HEADWAY)].some(other=>{
        if(other===car||other.turn||other.axis!==car.axis||other.dir!==car.dir)return false;
        if(Math.abs((other.axis?other.z:other.x)-(car.axis?car.z:car.x))>2.7)return false;
        const exit=((car.axis?other.x:other.z)-(car.axis?x:z))*car.dir;
        return exit>along&&exit>0&&exit<JUNCTION_EDGE+HEADWAY;
      });
      groups.get(key).push({car,along,arrival:arrival.time,exitBlocked});
    }
    for(const key of this.junctionOwners.keys())if(!groups.has(key))this.junctionOwners.delete(key);
    for(const [key,entries] of groups){
      // Cars already inside clear first. Keep the chosen approach stable while
      // it enters; equal arrival times use axis and direction, never array order.
      const eligible=entries.filter(e=>e.car.speed!==0||e.car.stoppedForJunction);
      const inside=entries.filter(e=>e.along>-JUNCTION_EDGE);
      let owner=eligible.find(e=>e.car===this.junctionOwners.get(key));
      if(inside.length){
        if(!inside.includes(owner))owner=inside[0];
      }else if(!owner||owner.exitBlocked){
        owner=eligible.filter(e=>!e.exitBlocked).sort((a,b)=>a.arrival-b.arrival||a.car.axis-b.car.axis||a.car.dir-b.car.dir)[0];
      }
      if(owner)this.junctionOwners.set(key,owner.car);
      else this.junctionOwners.delete(key);
      for(const entry of entries)if(entry.along<=-JUNCTION_EDGE&&entry!==owner){
        if(!owner&&!entry.exitBlocked)continue;
        // Parallel lanes can share a junction, but must not jump ahead of
        // cross-traffic already waiting or enter without room at the exit.
        const parallel=owner&&entry.car.axis===owner.car.axis&&!entry.exitBlocked&&
          !inside.some(other=>other.car.axis!==entry.car.axis)&&
          !eligible.some(other=>other.car.axis!==entry.car.axis&&other.arrival<=entry.arrival);
        if(!parallel)limits.set(entry.car,Math.max(0,-entry.along-JUNCTION_EDGE));
      }
    }
    return limits;
  }

  canCross(person){
    return occupiedCrossings(person).every(crossing=>this.cars.every(car=>{
      if(car.turn||car.axis!==crossing.axis||Math.abs((car.axis?car.z:car.x)-crossing.street)>=4)return true;
      const position=car.axis?car.x:car.z;
      const exit=car.dir>0?crossing.end:crossing.start;
      if((position-exit)*car.dir>2.8)return true;
      return crossingStop(car,crossing)!==null;
    }));
  }

  advance(dt,player,pedestrians=[]){
    const crossings=[...new Map([player,...pedestrians].flatMap(occupiedCrossings).map(c=>[`${c.axis}:${c.street}:${c.start}`,c])).values()].map(c=>({...c,key:`${c.axis}:${c.street}:${c.start}`}));
    const activeCrossings=new Set(crossings.map(c=>c.key));
    // Small steps keep queue spacing stable even after a slow frame.
    while(dt>1e-8){
      const step=Math.min(dt,.04);dt-=step;
      this.elapsed+=step;
      const index=new RoadIndex(this.cars);
      const junctionLimits=this.junctionLimits(index);
      for(const car of this.cars){
        try{
          car.waiting=false;
          car.crossingDecisions??=new Map();
          for(const key of car.crossingDecisions.keys())if(!activeCrossings.has(key))car.crossingDecisions.delete(key);
          const speed=car.speed??SPEED;
          let travel=Math.min(SPEED,speed+ACCELERATION*step)*step,clearance=Infinity;
          const turn=car.turn??junction(car);
          if(turn&&!car.turn&&(turn.bank-car.z)*car.dir<=9+travel){
            travel-=Math.max(0,(turn.bank-car.z)*car.dir-9);
            car.z=turn.bank-car.dir*9;
            const mergeX=turn.street+car.dir*9,mergeZ=turn.bank-car.dir*3;
            const blocked=[...index.range(1,mergeZ,-16,16,mergeX-24,mergeX+24)].some(other=>{
              if(other===car)return false;
              if(other.turn&&Math.hypot(other.x-mergeX,other.z-mergeZ)<16)return true;
              if(!other.axis||Math.abs(other.z-mergeZ)>2.8)return false;
              const gap=(other.x-mergeX)*car.dir;
              return gap>-24&&gap<14;
            });
            if(blocked){car.speed=0;car.waiting=true;car.stoppedForJunction=false;continue;}
            car.turn={...turn,angle:0};
          }
          const heading=car.turn?.angle??(car.axis?Math.PI/2:0);
          const dx=car.turn?Math.sin(heading)*car.dir:(car.axis?car.dir:0),dz=car.turn?Math.cos(heading)*car.dir:(car.axis?0:car.dir);
          for(const crossing of crossings)if(!car.turn&&car.axis===crossing.axis&&Math.abs((car.axis?car.z:car.x)-crossing.street)<4){
            const position=car.axis?car.x:car.z;
            const edge=car.dir>0?crossing.start:crossing.end;
            const distance=(edge-position)*car.dir;
            if(distance<0)continue;
            if(!car.crossingDecisions.has(crossing.key)){
              car.crossingDecisions.set(crossing.key,crossingStop(car,crossing));
            }
            const stop=car.crossingDecisions.get(crossing.key);
            if(stop!==null)clearance=Math.min(clearance,Math.max(0,(stop-position)*car.dir));
          }
          if(!car.turn)clearance=Math.min(clearance,index.clearance(car));
          else for(const other of this.cars){
            if(other===car||(!car.turn&&!other.turn&&other.axis!==car.axis))continue;
            const x=other.x-car.x,z=other.z-car.z;
            const along=x*dx+z*dz,across=Math.abs(x*dz-z*dx);
            if(along>0&&across<2.7&&other.dir===car.dir)clearance=Math.min(clearance,Math.max(0,along-HEADWAY));
          }
          // Stopped approaches can release priority; cars inside still occupy it.
          const junctionClearance=junctionLimits.get(car)??Infinity;
          car.stoppedForJunction=junctionClearance<clearance;
          clearance=Math.min(clearance,junctionClearance);
          // A braking-distance envelope reduces speed before the stop line.
          // Include this step's travel so even a slow frame cannot overshoot it.
          const safeSpeed=Math.sqrt((BRAKING*step)**2+2*BRAKING*clearance)-BRAKING*step;
          const nextSpeed=Math.min(SPEED,speed+ACCELERATION*step,safeSpeed);
          if(!car.turn)travel=nextSpeed*step;
          else travel=Math.min(travel,nextSpeed*step);
          car.speed=nextSpeed;
          if(clearance<.002){travel=clearance;car.speed=0;}
          if(travel<1e-8){car.speed=0;car.waiting=true;continue;}
          if(car.turn){
            const t=car.turn;t.angle=Math.min(Math.PI/2,t.angle+travel/RADIUS);
            car.x=t.street+car.dir*(9-RADIUS*Math.cos(t.angle));
            car.z=t.bank+car.dir*(-9+RADIUS*Math.sin(t.angle));
            if(t.angle===Math.PI/2){car.axis=1;delete car.turn;}
          }else{car.x+=dx*travel;car.z+=dz*travel;}
        }finally{index.update(car);}
      }
      this.updateSpawnLocks();
    }
  }
}
