import {PUB,pubChairs,pubPersonBlocks} from './pub-interior.js?v=bumps-1';
import {PUB_TYPES} from './world.js?v=bumps-1';
import {register} from './register.js';
const entrance={x:PUB.door.x,z:.4};
const center=c=>({x:c.x+c.w/2,z:c.z+c.d/2});
const sameSeat=(a,b)=>a&&b&&a.tableIndex===b.tableIndex&&a.seat===b.seat;
const seatKey=c=>`${c.tableIndex}:${c.seat}`;

// Shortest walking routes around the furniture, simplified to straight segments.
export function pubRoute(start,end,chair){
  const radius=.18,step=.25,chairs=pubChairs().filter(c=>!sameSeat(c,chair));
  const clear=p=>p.x>=radius&&p.x<=PUB.width-radius&&p.z>=radius&&p.z<=PUB.depth-radius&&
    ![...PUB.walls,PUB.bar,PUB.shelves,...chairs].some(b=>p.x>b.x-radius&&p.x<b.x+b.w+radius&&p.z>b.z-radius&&p.z<b.z+b.d+radius)&&
    !PUB.tables.some(b=>Math.hypot(p.x-b.x,p.z-b.z)<b.radius+radius)&&
    Math.hypot(p.x-PUB.bartender.x,p.z-PUB.bartender.z)>PUB.bartender.radius+radius;
  const segment=(a,b)=>{const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.08);for(let i=0;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/Math.max(1,n),z:a.z+(b.z-a.z)*i/Math.max(1,n)}))return false;return true;};
  if(segment(start,end))return [end];
  const key=p=>`${p.x},${p.z}`,first={x:Math.round(start.x/step)*step,z:Math.round(start.z/step)*step};
  if(!segment(start,first))return null;
  const queue=[first],previous=new Map([[key(first),null]]);let goal;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(Math.hypot(p.x-end.x,p.z-end.z)<.5&&segment(p,end)){goal=p;break;}
    for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const next={x:p.x+dx,z:p.z+dz};
      if(previous.has(key(next))||!segment(p,next))continue;
      previous.set(key(next),p);queue.push(next);
    }
  }
  if(!goal)return null;
  const route=[end];for(let p=goal;p;p=previous.get(key(p)))route.push(p);route.push(start);route.reverse();
  const result=[];let i=0;
  while(i<route.length-1){let j=route.length-1;while(j>i+1&&!segment(route[i],route[j]))j--;result.push(route[j]);i=j;}
  return result;
}
export class PubLife{
  constructor(random=Math.random){this.random=random;this.arrival=this.delay();this.departure=this.delay();this.walker=null;this.bumps=new Map();this.touching=new Set();}
  delay(){return 30+this.random()*30;}
  update(dt,patrons,playerSeat,player){
    this.arrival-=dt;this.departure-=dt;
    if(this.walker){
      const w=this.walker;let travel=dt*1.3;
      while(travel>0&&w.route.length){
        const p=w.route[0],dx=p.x-w.x,dz=p.z-w.z,d=Math.hypot(dx,dz);
        if(d>0){w.facingX=dx/d;w.facingZ=dz/d;}
        const move=Math.min(d,travel,.05),next={x:w.x+(d?dx/d*move:0),z:w.z+(d?dz/d*move:0)};
        if(pubPersonBlocks(w,next,player))break;
        w.x=next.x;w.z=next.z;w.walkTime+=move/1.3;travel-=move;
        if(d<=move)w.route.shift();
      }
      if(!w.route.length){
        if(w.chair){const seats=patrons[w.chair.tableIndex]??=[null,null];seats[w.chair.seat]=w.type;(seats.variants??=[0,0])[w.chair.seat]=w.variant;}
        this.walker=null;
      }
      return;
    }
    const chairs=pubChairs();
    if(this.arrival<=0&&(this.departure>0||this.arrival<=this.departure)){
      if(pubPersonBlocks(entrance,entrance,player))return;
      this.arrival=this.delay();
      const free=chairs.filter(c=>patrons[c.tableIndex]?.[c.seat]==null&&!sameSeat(c,playerSeat));
      const chair=free[Math.floor(this.random()*free.length)];
      const route=chair?pubRoute(entrance,center(chair),chair):[{x:entrance.x,z:1},entrance];
      if(route)this.walker={...entrance,type:PUB_TYPES[Math.floor(this.random()*PUB_TYPES.length)],variant:this.random(),chair,route,walkTime:0,facingX:0,facingZ:1};
    }else if(this.departure<=0){
      this.departure=this.delay();
      const occupied=chairs.filter(c=>patrons[c.tableIndex]?.[c.seat]!=null&&c.tableIndex!==playerSeat?.tableIndex);
      const chair=occupied[Math.floor(this.random()*occupied.length)];
      if(!chair)return;
      if(pubPersonBlocks(center(chair),center(chair),player))return;
      this.leave(chair,patrons);
    }
  }
  // The patron in this chair stands up and walks out.
  leave(chair,patrons){
    const start=center(chair),route=pubRoute(start,entrance,chair);
    if(!route)return;
    this.walker={...start,type:patrons[chair.tableIndex][chair.seat],variant:patrons[chair.tableIndex].variants?.[chair.seat]??0,route,walkTime:0,facingX:0,facingZ:-1};
    patrons[chair.tableIndex][chair.seat]=null;
    this.bumps.delete(seatKey(chair));
  }
  // Counts each fresh bump per seat; keeping in contact is still one bump.
  // On a seat's third bump its patron leaves half the time, unless someone is
  // already walking about, and the count starts over either way.
  bump(seats,patrons){
    const touching=new Set(seats.map(seatKey));
    for(const chair of seats){
      const key=seatKey(chair);
      if(this.touching.has(key))continue;
      const count=(this.bumps.get(key)??0)+1;
      if(count<3){this.bumps.set(key,count);continue;}
      this.bumps.delete(key);
      if(!this.walker&&this.random()<.5)this.leave(chair,patrons);
    }
    this.touching=touching;
  }
}
// Table talk after the greeting: one line every 3–5 seconds, looping until the player stands.
export class PubConversation{
  constructor(lines,random=Math.random,record=register,followup=null){
    this.followup=followup;this.ready=false;this.opened=false;
    this.lines=lines;this.random=random;this.record=record;this.index=0;this.wait=this.delay();
  }
  delay(){return 3+this.random()*2;}
  // Returns the line that is due now, if any.
  update(dt){
    if(!this.lines.length||this.ready)return null;
    this.wait-=dt;
    if(this.wait>0)return null;
    return this.advance();
  }
  advance(){
    if(!this.lines.length||this.ready)return null;
    if(this.followup&&this.index===this.lines.length){this.ready=true;return null;}
    this.wait=this.delay();
    const line=this.lines[this.index];
    this.index=this.followup?this.index+1:(this.index+1)%this.lines.length;
    if(line.sets)this.record[line.sets]=true;
    return line.say??line;
  }
}
