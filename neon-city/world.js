export const PEDESTRIAN_TYPES=13;
// Optional per-character traits; characters without an entry use the defaults.
const CHARACTER_TRAITS={
  3:{lines:[
    'DO YOU KNOW THE RADIOACTIVE COWS?',
    "THEY'RE A POLKA BAND.",
    "THEIR DRUMMER COMPOSED ALL SEPULTURA'S SONGS.",
    "THEY'LL BE IN TOWN TOMORROW, BUT THE TICKETS ARE SOLD OUT.",
    "FIND ME ONE AND I'LL MARRY YOU.",
    'I PROMISE.'
  ]},
  4:{height:1.68,lines:[
    'MY DAD SENT ME TO THE PUB AGAIN.',
    "I DON'T WANT TO GET DRUNK. I WANT TO STUDY MATH.",
    'MY DAD SAYS THAT GETTING DRUNK IS MORE EDUCATIONAL THAN STUDYING.',
    'MY DAD IS A BLOCKHEAD.',
    'BY THE WAY, I LOVE TALKING TO YOU.',
    'SOMETIMES I REALLY FEEL ALONE.'
  ]},
  5:{lines:['THIS BEER SUCKS.','THIS PUB SUCKS.','LIFE SUCKS.','THIS CONVERSATION SUCKS.']},
  6:{lines:[
    "DON'T TALK TO THE STUPID ROBOTS.",
    "THEY'RE SO BORING.",
    "THEY'RE OBSESSED WITH LADYBUGS.",
    'ONE OF THEM TOLD ME THAT LADYBUGS ARE THE SMARTEST SPECIES.',
    'THOSE ROBOTS SHOULD SEE A DOCTOR.'
  ]},
  9:{goesToPub:false},
  10:{height:1.78},
  11:{lines:[
    'I WAS CREATED BY AN ADVANCED ALIEN CIVILISATION.',
    'I WAS SENT HERE TO STUDY THE HUMAN BEINGS.',
    "BUT IT'S SUCH A BORING TASK...",
    "I'M STUDYING LADYBUGS, INSTEAD. THEY'RE MORE INTERESTING.",
    "I HOPE MY CREATORS DON'T THROW ME INTO A BLACK HOLE FOR THIS.",
    'DID YOU KNOW THAT LADYBUGS ARE THE SMARTEST SPECIES IN THE GALAXY?',
    'THE MOST BEAUTIFUL LOVE POEMS WERE WRITTEN BY LADYBUGS.',
    'I ADMIRE LADYBUGS.',
    'I REALLY DO.'
  ]},
  12:{goesToPub:false,weight:.25}
};
export const goesToPub=type=>CHARACTER_TRAITS[type]?.goesToPub??true;
export const characterHeight=type=>CHARACTER_TRAITS[type]?.height??1.85;
// What a character says, in order, while the player shares their pub table.
export const pubLines=type=>CHARACTER_TRAITS[type]?.lines??[];
export const PUB_TYPES=Array.from({length:PEDESTRIAN_TYPES},(_,type)=>type).filter(goesToPub);
// Relative chance of meeting each character on the street; pubs ignore it.
export const streetWeight=type=>CHARACTER_TRAITS[type]?.weight??1;
const STREET_WEIGHT_TOTAL=Array.from({length:PEDESTRIAN_TYPES},(_,type)=>streetWeight(type)).reduce((a,b)=>a+b);
// Maps one random draw in [0,1) to a character, in proportion to street weights.
export function streetType(value){
  let target=value*STREET_WEIGHT_TOTAL;
  for(let type=0;type<PEDESTRIAN_TYPES;type++){target-=streetWeight(type);if(target<0)return type;}
  return PEDESTRIAN_TYPES-1;
}
export const BLOCK = 64;
// Each river occupies two rows; their centres are ten blocks apart.
export const RIVER_ROWS = [-6, 4];
export const RIVER_WIDTH = 92;
export const WATER_LEVEL = -7;
export const BRIDGE_RISE = 6;
export const riverStart = row => RIVER_ROWS.find(start=>row>=start&&row<start+2);
export const isRiverRow = row => riverStart(row)!==undefined;
export function bridgeHeight(z) {
  const start=riverStart(Math.floor(z/BLOCK));
  if(start===undefined)return 0;
  const t=(z-start*BLOCK-18)/RIVER_WIDTH;
  return t>0&&t<1?BRIDGE_RISE*Math.sin(Math.PI*t):0;
}
export function groundHeight(x,z) {
  const lx=mod(x,BLOCK);
  return lx<=14||lx>=50?bridgeHeight(z):0;
}
export const LOAD_RADIUS = 2;
export const KEEP_RADIUS = 3;
export const PEDESTRIAN_MIN_SPEED = .9;
export const PEDESTRIAN_MAX_SPEED = PEDESTRIAN_MIN_SPEED * 2;
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
      buildings.push({x: x * BLOCK + 14 + i * 18, z: z * BLOCK + 14 + j * 18, w:18, d:18, h:12 + Math.floor(r() * 8) * 3, color:['#24233c','#30233c','#1f303b','#38283c'][Math.floor(r()*4)], sign:signs[Math.floor(r()*signs.length)], neon:neon[Math.floor(r()*neon.length)], seed:Math.floor(r()*10000), i, j});
    }
    // Jitter separated slots so new pedestrians never spawn inside each other.
    // Assign speed once, using a separate random draw from appearance.
    for(let i=0;i<7;i++) people.push({phase:i*24+r()*20,speed:PEDESTRIAN_MIN_SPEED+r()*(PEDESTRIAN_MAX_SPEED-PEDESTRIAN_MIN_SPEED),type:streetType(r()),reverse:r()>.5,variant:r(),walkTime:0});
    if(isRiverRow(z)){
      const start=riverStart(z);
      // One shared loop follows both banks and the two bridge sidewalks.
      return {x,z,river:true,riverStart:start,buildings:[],people:z===start?people:[],manholes:[],newspaperMachines:[]};
    }
    const manholes=[],slots=Array.from({length:32},(_,i)=>i);
    const count=Math.floor(r()*4);
    for(let i=0;i<count;i++){
      const slot=slots.splice(Math.floor(r()*slots.length),1)[0];
      const side=Math.floor(slot/8),along=16+(slot%8)*4+r()*1.5;
      const across=10+r()*2;
      const lx=[along,64-across,along,across][side];
      const lz=[across,along,64-across,along][side];
      manholes.push({x:x*BLOCK+lx,z:z*BLOCK+lz,radius:.65});
    }
    // Only the shared blank edges between unlike venues can host a cabinet.
    // These seams leave the windows and central doors of both venues clear.
    const newspaperMachines=[],neighbors=[[0,2],[1,3],[0,1],[2,3]];
    for(let side=0;side<4;side++)if(r()<.07){
      const [a,b]=neighbors[side].map(index=>buildings[index]);
      if(a.sign===b.sign)continue;
      const along=side<2?(a.x+a.w+b.x)/2:(a.z+a.d+b.z)/2;
      const across=(side<2?a.z:a.x)+(side===0||side===2?-.9*.85/2:(side<2?a.d:a.w)+.9*.85/2);
      newspaperMachines.push({x:side<2?along:across,z:side<2?across:along,side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85});
    }
    return { x, z, buildings, people, manholes, newspaperMachines };
  }
  solid(x,z, radius=.45) {
    // All blocks share the same footprint, so collision works before a chunk is loaded.
    const lx=mod(x,BLOCK),lz=mod(z,BLOCK);
    const start=riverStart(Math.floor(z/BLOCK));
    if(start!==undefined)return lx>14-radius&&lx<50+radius&&z>start*BLOCK+18-radius&&z<start*BLOCK+110+radius;
    if(lx>14-radius && lx<50+radius && lz>14-radius && lz<50+radius)return true;
    const chunk=this.chunks.get(`${Math.floor(x/BLOCK)},${Math.floor(z/BLOCK)}`);
    return (chunk?.newspaperMachines??[]).some(m=>Math.abs(x-m.x)<m.w/2+radius&&Math.abs(z-m.z)<m.d/2+radius);
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
        const {side}=pedestrianRoute(chunk,p,p.walkTime);
        const dx=[0,1,0,-1][side],dz=[-1,0,1,0][side];
        const origin=pedestrian(chunk,p,time),target={x:origin.x+dx*1.3,z:origin.z+dz*1.3};
        if(crossesPerson(origin,target,player)||chunk.people.some(q=>q!==p&&crossesPerson(origin,target,pedestrian(chunk,q,time))))continue;
        p.yielding={dx,dz,offset:0,stage:'out',partner,partnerTime:partner.walkTime,passDistance:gap+1.2};
      }
      // Recover interrupted sidesteps too: their route clocks are deliberately
      // frozen, so ordinary blocked-walker recovery cannot release them.
      for(const p of chunk.people){
        const y=p.yielding;
        if(!y)continue;
        if((p.stuckTime??0)>=1.5){
          if(y.stage==='out')y.stage='back';
          else if(y.stage==='wait'&&(!chunk.people.includes(y.partner)||y.partner.reverse===p.reverse||(y.partner.stuckTime??0)>=1.5))y.stage='back';
          else if(y.stage==='back')y.stage='escape';
        }
        if(y.stage==='escape'){
          const origin=pedestrian(chunk,p,time),target=pedestrian(chunk,{...p,yielding:undefined},time);
          if(!crossesPerson(origin,target,player)&&!chunk.people.some(q=>q!==p&&crossesPerson(origin,target,pedestrian(chunk,q,time))))y.stage='back';
        }
        if(y.stage==='back'&&y.offset===0){delete p.yielding;p.stuckTime=0;}
      }
      const moves=chunk.people.map(p=>{
        p.walkTime??=time-dt;
        const before=pedestrian(chunk,p,time);
        const y=p.yielding;
        const waitingForSideStep=chunk.people.some(q=>q.yielding?.partner===p&&q.yielding.stage==='out');
        if(y?.stage==='wait'&&y.partner&&(y.partner.walkTime-y.partnerTime)*y.partner.speed>=y.passDistance)y.stage='back';
        const offset=y?(y.stage==='out'?Math.min(1.3,y.offset+dt*1.8):y.stage==='back'?Math.max(0,y.offset-dt*1.8):y.offset):0;
        const after=pedestrian(chunk,{...p,walkTime:p.walkTime+((y&&y.stage!=='escape')||waitingForSideStep?0:dt),yielding:y?{...y,offset}:undefined},time);
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
      // Detect a sustained pedestrian deadlock, including a stalled sidestep.
      for(const move of moves){
        const moving=!move.blocked&&Math.hypot(move.after.x-move.before.x,move.after.z-move.before.z)>1e-6;
        move.p.stuckTime=moving?0:(move.p.stuckTime??0)+dt;
        move.p.turnCooldown=Math.max(0,(move.p.turnCooldown??0)-dt);
      }
      for(const move of moves)if(!move.blocked){
        const y=move.p.yielding;
        if(!y){if(!move.waitingForSideStep)move.p.walkTime+=dt;continue;}
        if(y.stage==='escape')move.p.walkTime+=dt;
        y.offset=move.offset;
        if(y.stage==='out'&&y.offset===1.3)y.stage='wait';
        if(y.stage==='back'&&y.offset===0)delete move.p.yielding;
      }
      const turnAround=p=>{
        if((p.yielding&&p.yielding.stage!=='escape')||p.turnCooldown||p.stuckTime<1.5)return false;
        const phase=mod(p.phase+2*p.walkTime*p.speed*(p.reverse?-1:1),chunk.river?296:168);
        const origin=pedestrian(chunk,p,time);
        const next=pedestrian(chunk,{...p,phase,reverse:!p.reverse,walkTime:p.walkTime+.2},time);
        if(this.solid(next.x,next.z)||crossesPerson(origin,next,player)||chunk.people.some(q=>q!==p&&crossesPerson(origin,next,pedestrian(chunk,q,time))))return false;
        p.phase=phase;p.reverse=!p.reverse;p.stuckTime=0;p.turnCooldown=3;
        return true;
      };
      for(let i=0;i<chunk.people.length;i++)for(let j=i+1;j<chunk.people.length;j++){
        const a=chunk.people[i],b=chunk.people[j];
        if(a.reverse===b.reverse||a.stuckTime<1.5||b.stuckTime<1.5||a.turnCooldown||b.turnCooldown)continue;
        const pa=pedestrian(chunk,a,time),pb=pedestrian(chunk,b,time);
        if(Math.hypot(pa.x-pb.x,pa.z-pb.z)>2.6)continue;
        // Prefer the forward walker; never teleport someone out of a sidestep.
        const candidates=a.reverse?[b,a]:[a,b];
        for(const p of candidates){
          if(!turnAround(p))continue;
          a.stuckTime=b.stuckTime=0;a.turnCooldown=b.turnCooldown=3;
          break;
        }
      }
      // A player or a queue can block a single walker too; no opposing pair
      // is required. The clearance check lets a queue unwind from its free end.
      for(const move of moves)if(move.p.stuckTime>=1.5)turnAround(move.p);
    }
  }
  move(p,dx,dz,people=[]) {
    let bumpedPedestrian=false;
    const reach=Math.hypot(dx,dz)+PERSON_CLEARANCE;
    const nearby=people.filter(person=>Math.hypot(person.x-p.x,person.z-p.z)<=reach);
    const blocked=(x,z)=>{
      if(this.solid(x,z))return true;
      if((x!==p.x||z!==p.z)&&nearby.some(person=>crossesPerson(p,{x,z},person))){
        bumpedPedestrian=true;return true;
      }
      return false;
    };
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
    for(let i=0;i<steps;i++){if(!blocked(p.x+dx/steps,p.z))p.x+=dx/steps;if(!blocked(p.x,p.z+dz/steps))p.z+=dz/steps;}
    return bumpedPedestrian;
  }
}
function pedestrianRoute(chunk,p,time){
  const length=chunk.river?106:42;
  let t=mod(p.phase+time*p.speed*(p.reverse?-1:1),2*(42+length));
  const lengths=[42,length,42,length];
  let side=0;
  while(side<3&&t>=lengths[side])t-=lengths[side++];
  return {side,t,length};
}
export function pedestrian(chunk,p,time) {
  time=p.walkTime??time;
  const {side,t,length}=pedestrianRoute(chunk,p,time);
  return {x:chunk.x*64+[11+t,53,53-t,11][side]+(p.yielding?p.yielding.dx*p.yielding.offset:0),z:(chunk.river?chunk.riverStart:chunk.z)*64+[11,11+t,11+length,11+length-t][side]+(p.yielding?p.yielding.dz*p.yielding.offset:0),facingX:[1,0,-1,0][side]*(p.reverse?-1:1),facingZ:[0,1,0,-1][side]*(p.reverse?-1:1),type:p.type,frame:Math.floor(time*p.speed*5+p.phase)%4,variant:p.variant};
}
export function pedestrianShowsBack(person,viewer) {
  return (viewer.x-person.x)*person.facingX+(viewer.z-person.z)*person.facingZ<0;
}
export function traffic(chunk,time) {
  const cars=[];
  // Identify each car in the moving stream so its colour survives tile crossings.
  for(let axis=0;axis<2;axis++)for(let dir=-1;dir<=1;dir+=2){
    // The street through the middle of a wide river is removed.
    if(axis&&isRiverRow(chunk.z)&&chunk.z!==riverStart(chunk.z))continue;
    const lane=axis?chunk.z:chunk.x, phase=time*10*dir+lane*17+dir*13, t=mod(phase,64);
    const carId=(axis?chunk.x:chunk.z)-Math.floor(phase/64);
    const colour=random(Math.imul(carId,73856093)^Math.imul(lane,19349663)^Math.imul(axis+1,83492791)^Math.imul(dir,2654435761))();
    cars.push({x:chunk.x*64+(axis?t:dir*3),z:chunk.z*64+(axis?-dir*3:t),axis,dir,color:['#e94054','#397fe0','#f173bc','#43c18b'][Math.floor(colour*4)]});
  }
  return cars;
}
