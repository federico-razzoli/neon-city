export const BLOCK = 64;
export const LOAD_RADIUS = 2;
export const KEEP_RADIUS = 3;
export const PEDESTRIAN_MIN_SPEED = .9;
export const PEDESTRIAN_MAX_SPEED = PEDESTRIAN_MIN_SPEED * 1.5;
export const PERSON_CLEARANCE = .85; // Player radius plus pedestrian radius.
export const mod = (n, d) => ((n % d) + d) % d;
function crossesPerson(a,b,person) {
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((person.x-a.x)*dx+(person.z-a.z)*dz)/length)):0;
  return Math.hypot(a.x+dx*t-person.x,a.z+dz*t-person.z)<PERSON_CLEARANCE;
}
export function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const signs = ['DISCO', 'HOTEL', 'COCKTAILS', 'NEON PUB', 'PARADISE', 'BLUE NOTE', 'DREAMS', 'ARCADE', 'MIDNIGHT', 'CLUB 87'];
const neon = ['#ff46b5', '#55e8ef', '#af78ff', '#ffbc57'];
export class City {
  constructor(seed = Date.now()) { this.rng = random(seed); this.chunks = new Map(); }
  update(x, z) {
    const cx = Math.floor(x / BLOCK), cz = Math.floor(z / BLOCK);
    for (const [key, c] of this.chunks) if (Math.max(Math.abs(c.x - cx), Math.abs(c.z - cz)) > KEEP_RADIUS) this.chunks.delete(key);
    for (let i = cx - LOAD_RADIUS; i <= cx + LOAD_RADIUS; i++) for (let j = cz - LOAD_RADIUS; j <= cz + LOAD_RADIUS; j++) {
      const key = `${i},${j}`;
      if (!this.chunks.has(key)) this.chunks.set(key, this.generate(i, j));
    }
  }
  generate(x, z) {
    const r = this.rng, buildings = [], people = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      buildings.push({x: x * BLOCK + 14 + i * 18, z: z * BLOCK + 14 + j * 18, w:17.8, d:17.8, h:12 + Math.floor(r() * 8) * 3, color:['#24233c','#30233c','#1f303b','#38283c'][Math.floor(r()*4)], sign:signs[Math.floor(r()*signs.length)], neon:neon[Math.floor(r()*neon.length)], seed:Math.floor(r()*10000), i, j});
    }
    // Jitter separated slots so new pedestrians never spawn inside each other.
    // Assign speed once, using a separate random draw from appearance.
    for(let i=0;i<7;i++) people.push({phase:i*24+r()*20,speed:PEDESTRIAN_MIN_SPEED+r()*(PEDESTRIAN_MAX_SPEED-PEDESTRIAN_MIN_SPEED),type:Math.floor(r()*3),reverse:r()>.5,variant:r(),walkTime:0});
    return { x, z, buildings, people };
  }
  solid(x,z, radius=.45) {
    // All blocks share the same footprint, so collision works before a chunk is loaded.
    const lx=mod(x,BLOCK),lz=mod(z,BLOCK);
    return lx>14-radius && lx<49.8+radius && lz>14-radius && lz<49.8+radius;
  }
  pedestrians(time) {
    return [...this.chunks.values()].flatMap(chunk=>chunk.people.map(p=>pedestrian(chunk,p,time)));
  }
  advancePedestrians(dt,player,time) {
    // Sidewalk loops in separate blocks are at least 22 units apart.
    for(const chunk of this.chunks.values()){
      for(const p of chunk.people)p.walkTime??=time-dt;
      // Reserve one yielding pedestrian per encounter. Their route clock stays
      // frozen until they have stepped out, let the other pass, and returned.
      for(let i=0;i<chunk.people.length;i++)for(let j=i+1;j<chunk.people.length;j++){
        const a=chunk.people[i],b=chunk.people[j];
        if(a.yielding||b.yielding||a.reverse===b.reverse)continue;
        const pa=pedestrian(chunk,a,time),pb=pedestrian(chunk,b,time);
        const gap=Math.hypot(pa.x-pb.x,pa.z-pb.z);
        if(gap>1.2)continue;
        const na=pedestrian(chunk,{...a,walkTime:a.walkTime+.05},time);
        const nb=pedestrian(chunk,{...b,walkTime:b.walkTime+.05},time);
        if(Math.hypot(na.x-nb.x,na.z-nb.z)>=gap)continue;
        // Always choose the forward walker, independent of array order.
        const p=a.reverse?b:a,partner=p===a?b:a;
        const n=mod(p.phase+p.walkTime*p.speed,168),side=Math.floor(n/42);
        const dx=[0,1,0,-1][side],dz=[-1,0,1,0][side];
        const origin=pedestrian(chunk,p,time),target={x:origin.x+dx*1.3,z:origin.z+dz*1.3};
        if(crossesPerson(origin,target,player)||chunk.people.some(q=>q!==p&&crossesPerson(origin,target,pedestrian(chunk,q,time))))continue;
        p.yielding={dx,dz,offset:0,stage:'out',partner,partnerTime:partner.walkTime,passDistance:gap+1.2};
      }
      const moves=chunk.people.map(p=>{
        p.walkTime??=time-dt;
        const before=pedestrian(chunk,p,time);
        const y=p.yielding;
        const waitingForSideStep=chunk.people.some(q=>q.yielding?.partner===p&&q.yielding.stage==='out');
        if(y?.stage==='wait'&&(y.partner.walkTime-y.partnerTime)*y.partner.speed>=y.passDistance)y.stage='back';
        const offset=y?(y.stage==='out'?Math.min(1.3,y.offset+dt*1.8):y.stage==='back'?Math.max(0,y.offset-dt*1.8):y.offset):0;
        const after=pedestrian(chunk,{...p,walkTime:p.walkTime+(y||waitingForSideStep?0:dt),yielding:y?{...y,offset}:undefined},time);
        return {p,before,after,offset,waitingForSideStep,blocked:crossesPerson(before,after,player)||this.solid(after.x,after.z)};
      });
      // Resolve from one shared snapshot. Repeat so a stop propagates backwards
      // through a queue in this frame, regardless of array order.
      let changed=true;
      while(changed){
        changed=false;
        for(let i=0;i<moves.length;i++)for(let j=i+1;j<moves.length;j++){
          const a=moves[i],b=moves[j];
          const endA=a.blocked?a.before:a.after,endB=b.blocked?b.before:b.after;
          if(!crossesPerson(
            {x:a.before.x-b.before.x,z:a.before.z-b.before.z},
            {x:endA.x-endB.x,z:endA.z-endB.z},{x:0,z:0}))continue;
          const va={x:a.after.x-a.before.x,z:a.after.z-a.before.z};
          const vb={x:b.after.x-b.before.x,z:b.after.z-b.before.z};
          let stop=[a,b];
          if(va.x*vb.x+va.z*vb.z>0){
            // Same direction: only the follower yields, so a faster follower
            // cannot permanently pin the pedestrian in front of them.
            const aBehind=(b.before.x-a.before.x)*(va.x+vb.x)+(b.before.z-a.before.z)*(va.z+vb.z)>0;
            stop=[aBehind?a:b];
          }
          for(const move of stop)if(!move.blocked){move.blocked=true;changed=true;}
        }
      }
      for(const move of moves)if(!move.blocked){
        const y=move.p.yielding;
        if(!y){if(!move.waitingForSideStep)move.p.walkTime+=dt;continue;}
        y.offset=move.offset;
        if(y.stage==='out'&&y.offset===1.3)y.stage='wait';
        if(y.stage==='back'&&y.offset===0)delete move.p.yielding;
      }
    }
  }
  move(p,dx,dz,people=[]) {
    const reach=Math.hypot(dx,dz)+PERSON_CLEARANCE;
    const nearby=people.filter(person=>Math.hypot(person.x-p.x,person.z-p.z)<=reach);
    const blocked=(x,z)=>this.solid(x,z)||nearby.some(person=>crossesPerson(p,{x,z},person));
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
    for(let i=0;i<steps;i++){if(!blocked(p.x+dx/steps,p.z))p.x+=dx/steps;if(!blocked(p.x,p.z+dz/steps))p.z+=dz/steps;}
  }
}
export function pedestrian(chunk,p,time) {
  time=p.walkTime??time;
  const n=mod(p.phase+time*p.speed*(p.reverse?-1:1),168), side=Math.floor(n/42), t=n%42;
  return {x:chunk.x*64+[11+t,53,53-t,11][side]+(p.yielding?p.yielding.dx*p.yielding.offset:0),z:chunk.z*64+[11,11+t,53,53-t][side]+(p.yielding?p.yielding.dz*p.yielding.offset:0),type:p.type,frame:Math.floor(time*p.speed*5+p.phase)%4,variant:p.variant};
}
export function traffic(chunk,time) {
  const cars=[];
  // Identify each car in the moving stream so its colour survives tile crossings.
  for(let axis=0;axis<2;axis++)for(let dir=-1;dir<=1;dir+=2){
    const lane=axis?chunk.z:chunk.x, phase=time*10*dir+lane*17+dir*13, t=mod(phase,64);
    const carId=(axis?chunk.x:chunk.z)-Math.floor(phase/64);
    const colour=random(Math.imul(carId,73856093)^Math.imul(lane,19349663)^Math.imul(axis+1,83492791)^Math.imul(dir,2654435761))();
    cars.push({x:chunk.x*64+(axis?t:dir*3),z:chunk.z*64+(axis?-dir*3:t),axis,dir,color:['#e94054','#397fe0','#f173bc','#43c18b'][Math.floor(colour*4)]});
  }
  return cars;
}
