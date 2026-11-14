// SPDX-License-Identifier: AGPL-3.0-only
import {BLOCK,RIVER_STAIRS,RIVER_WALK_HEIGHT,PERSON_CLEARANCE,groundHeight,riverWalkHeight,mod} from './world.js';

export const RIVER_STAIR_CHANCE=.25;
const STAGING=1.5;
function path(points,junctions=[]){
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  return {points,lengths,total:lengths.at(-1),junctions:junctions.map(([index,bank,heading])=>({s:lengths[index],bank,heading}))};
}
function sample(route,s,loop=true){
  s=loop?mod(s,route.total):Math.min(route.total,Math.max(0,s));
  let i=1;while(i<route.points.length-1&&route.lengths[i]<s)i++;
  const a=route.points[i-1],b=route.points[i],length=route.lengths[i]-route.lengths[i-1],t=length?(s-route.lengths[i-1])/length:0;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,facingX:(b.x-a.x)/(length||1),facingZ:(b.z-a.z)/(length||1)};
}
function routes(chunk,reverse=false){
  const key=reverse?'reverse':'forward';chunk.riverRoutes??={};
  if(chunk.riverRoutes[key])return chunk.riverRoutes[key];
  const x=chunk.x*BLOCK,z=chunk.riverStart*BLOCK,o=reverse?-.55:.55;
  const north=z+11-o,south=z+117+o,left=x+11-o,right=x+181+o,gate=x+RIVER_STAIRS.landing+1;
  const upper=path(reverse?[
    {x:gate,z:north},{x:left,z:north},{x:left,z:south},{x:gate,z:south},{x:right,z:south},{x:right,z:north},{x:gate,z:north}
  ]:[
    {x:gate,z:north},{x:right,z:north},{x:right,z:south},{x:gate,z:south},{x:left,z:south},{x:left,z:north},{x:gate,z:north}
  ],[[0,0,reverse?-1:1],[3,1,reverse?1:-1]]);
  const lower=[0,1].map(bank=>{
    const wall=z+(bank?110:18),dir=bank?-1:1,bottom=x+RIVER_STAIRS.end+1;
    const heading=bank?(reverse?1:-1):(reverse?-1:1),lane=heading>0?4:5;
    // Repeat the straight segment by translation, never by turning around.
    return path([{x:bottom,z:wall+dir*lane},{x:bottom+heading*3*BLOCK,z:wall+dir*lane}],[[0,bank,heading]]);
  });
  return chunk.riverRoutes[key]={upper,lower};
}
export function seedRiverPeople(chunk,people,random){
  const lowerCount=Math.max(1,Math.round(people.length*2/7)),upperCount=Math.max(1,people.length-lowerCount);
  for(let i=0;i<people.length;i++){
    const p=people[i],route=routes(chunk,p.reverse);
    // Four residents start below, two on each bank; others start well separated
    // around the upper loop. Route clocks advance only when a step is clear.
    p.riverMotion=i<lowerCount?{mode:'lower',bank:i%2,s:45+Math.floor(i/2)*90+(i%2)*60,lastDecision:-Infinity}:
      {mode:'upper',s:(i-lowerCount)*route.upper.total/upperCount+8+random()*4,lastDecision:-Infinity};
  }
  return people;
}
export function riverPerson(chunk,p){
  const m=p.riverMotion,route=m.mode==='stairs'?m.route:m.mode==='lower'?routes(chunk,p.reverse).lower[m.bank]:routes(chunk,p.reverse).upper;
  const at=sample(route,m.s,m.mode!=='stairs');
  if(m.mode!=='stairs'){
    at.x+=(m.offset??0)*BLOCK;
    if(m.mode==='lower')at.x+=Math.floor(m.s/route.total)*route.junctions[0].heading*3*BLOCK;
  }
  let ground=groundHeight(at.x,at.z);
  if(m.mode==='lower')ground=RIVER_WALK_HEIGHT;
  if(m.mode==='stairs'){
    const wall=chunk.riverStart*BLOCK+(m.bank?110:18),d=(at.z-wall)*(m.bank?-1:1);
    ground=d<0?0:riverWalkHeight(at.x,at.z);
  }
  return {...at,ground,riverWalk:m.mode!=='upper',type:p.type,variant:p.variant,frame:Math.floor((p.walkTime??0)*p.speed*5+p.phase)%4};
}
function nextEvent(route,m){
  let best=null;
  for(const junction of route.junctions){
    const stage=mod(junction.s-STAGING,route.total);
    let s=m.s+mod(stage-m.s,route.total);
    if(s<=(m.lastDecision??-Infinity)+1e-7)s+=route.total;
    if(!best||s<best.s)best={...junction,s};
  }
  return best;
}
function eventOffset(chunk,p,event){
  const m=p.riverMotion;
  if(m.mode!=='lower')return m.offset??0;
  const route=routes(chunk,p.reverse).lower[m.bank];
  return (m.offset??0)+Math.round((event.s+STAGING)/route.total)*event.heading*3;
}
function stairKey(chunk,p,event){return `${chunk.x+eventOffset(chunk,p,event)}:${chunk.riverStart}:${event.bank}`;}
function transition(chunk,p,event){
  const m=p.riverMotion,down=m.mode==='upper',bank=event.bank,dir=bank?-1:1,wall=chunk.riverStart*BLOCK+(bank?110:18),offset=eventOffset(chunk,p,event),x=(chunk.x+offset)*BLOCK;
  // Preserve the direction along the bank when rejoining the other level.
  const reverse=bank?event.heading>0:event.heading<0;
  const r=routes(chunk,reverse),upper=r.upper.junctions.find(j=>j.bank===bank);
  const lower=r.lower[bank].junctions.find(j=>j.heading===event.heading);
  const upperPoint=sample(r.upper,upper.s),lowerPoint=sample(r.lower[bank],lower.s);
  upperPoint.x+=offset*BLOCK;lowerPoint.x+=offset*BLOCK;
  const landing={x:x+RIVER_STAIRS.landing+1,z:wall+dir*1.5},bottom={x:x+RIVER_STAIRS.end+1,z:wall+dir*1.5};
  const start=riverPerson(chunk,p);
  return {mode:'stairs',bank,direction:down?'down':'up',s:0,
    key:stairKey(chunk,p,event),
    route:path(down?[start,upperPoint,landing,bottom,lowerPoint]:[start,lowerPoint,bottom,landing,upperPoint]),
    exit:{mode:down?'lower':'upper',bank,offset,s:down?lower.s:upper.s,lastDecision:-Infinity},reverse};
}
function sweptNear(a,b,q,clearance){
  if(Math.abs(b.ground-q.ground)>1.5)return false;
  const dx=b.x-a.x,dz=b.z-a.z,old=(a.x-q.x)**2+(a.z-q.z)**2;
  const end=(b.x-q.x)**2+(b.z-q.z)**2;
  if(old<clearance*clearance&&end>old+1e-9)return false;
  const length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.z-a.z)*dz)/length)):0;
  return (a.x+dx*t-q.x)**2+(a.z+dz*t-q.z)**2<clearance*clearance;
}
// Update all river owners together, so queues and exits see neighbours in other
// chunks. A small spatial index bounds collision work; no all-pairs scan.
export function advanceRiverPeople(city,dt,player,time,speaker){
  const actors=[];
  for(const chunk of city.chunks.values())for(const p of chunk.people)if(p.riverMotion)actors.push({chunk,p});
  if(!actors.length)return [];
  const held=new Set(),steps=Math.max(1,Math.ceil(dt/.05)),step=dt/steps;
  for(let tick=0;tick<steps;tick++){
    const cells=new Map(),positions=new Map(),locks=new Map();
    const cellKey=q=>`${Math.floor(q.x/2)},${Math.floor(q.z/2)}`;
    const insert=(p,q)=>{const key=cellKey(q);if(!cells.has(key))cells.set(key,new Map());cells.get(key).set(p,q);positions.set(p,q);};
    for(const person of city.pedestrians(time))insert(person.walker,{...person,ground:person.ground??groundHeight(person.x,person.z)});
    const playerPosition={...player,ground:groundHeight(player.x,player.z,player.riverWalk)};
    for(const {p} of actors)if(p.riverMotion.mode==='stairs')locks.set(p.riverMotion.key,p.riverMotion.direction);
    for(const {chunk,p} of actors){
      p.walkTime??=0;
      let m=p.riverMotion,before=positions.get(p),next=m;
      if(m.mode!=='stairs'){
        const route=m.mode==='upper'?routes(chunk,p.reverse).upper:routes(chunk,p.reverse).lower[m.bank];
        const event=m.pending??nextEvent(route,m),budget=p.speed*step;
        if(m.pending||event.s-m.s<=budget+1e-7){
          if(!m.pending&&event.s>m.s+1e-7)next={...m,s:event.s};
          else{
            if(!m.pending){
              m.lastDecision=event.s;
              if(city.rng()<RIVER_STAIR_CHANCE)m.pending=event;
            }
            if(m.pending){
              const key=stairKey(chunk,p,event),direction=m.mode==='upper'?'down':'up';
              if(locks.has(key)&&locks.get(key)!==direction)continue;
              next=transition(chunk,p,event);locks.set(key,direction);
            }else next={...m,s:m.s+budget};
          }
        }else next={...m,s:m.s+budget};
      }else next={...m,s:Math.min(m.route.total,m.s+p.speed*step)};
      p.riverMotion=next;
      let after=riverPerson(chunk,p);
      const blockedByPlayer=sweptNear(before,after,playerPosition,PERSON_CLEARANCE*1.5)||p===speaker&&Math.abs(before.ground-playerPosition.ground)<1.5&&Math.hypot(before.x-player.x,before.z-player.z)<2.8;
      let blocked=blockedByPlayer;
      for(let cx=Math.floor((Math.min(before.x,after.x)-PERSON_CLEARANCE)/2);!blocked&&cx<=Math.floor((Math.max(before.x,after.x)+PERSON_CLEARANCE)/2);cx++)
        for(let cz=Math.floor((Math.min(before.z,after.z)-PERSON_CLEARANCE)/2);!blocked&&cz<=Math.floor((Math.max(before.z,after.z)+PERSON_CLEARANCE)/2);cz++)
          for(const [other,q] of cells.get(`${cx},${cz}`)??[])if(other!==p&&sweptNear(before,after,q,PERSON_CLEARANCE)){blocked=true;break;}
      if(blocked){p.riverMotion=m;if(blockedByPlayer)held.add(p);continue;}
      if(next.mode==='stairs'&&next.s===next.route.total){
        // Do not release the direction reservation until the exit is clear.
        p.riverMotion=next.exit;p.reverse=next.reverse;
        const stillOccupied=actors.some(a=>a.p!==p&&a.p.riverMotion.mode==='stairs'&&a.p.riverMotion.key===next.key);
        if(!stillOccupied)locks.delete(next.key);
        after=riverPerson(chunk,p);
      }
      cells.get(cellKey(before))?.delete(p);insert(p,after);p.walkTime+=step;
    }
  }
  return [...held].map(walker=>({walker,place:'river'}));
}
