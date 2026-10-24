export const PEDESTRIAN_TYPES=16;
// Optional per-character traits; characters without an entry use the defaults.
const CHARACTER_TRAITS={
  3:{lines:[
    'DO YOU KNOW THE RADIOACTIVE COWS?',
    "THEY'RE A POLKA METAL BAND.",
    "THEIR DRUMMER COMPOSED ALL SEPULTURA'S SONGS.",
    "THEY'LL BE IN TOWN TOMORROW, BUT THE TICKETS ARE SOLD OUT.",
    "FIND ME ONE AND I'LL MARRY YOU.",
    'I PROMISE.'
  ],riverLines:[
    "♪♫ I'M A RADIOACTIVE COW ♪",
    "♪♫ YOU'RE A RADIOACTIVE COW ♪",
    "♪♫ LET'S MOO TOGETHER ♪",
    '♪♫ MOO ♪ MOO ♪ MOO ♪',
    "♪♫ LET'S MOO FOREVER ♪",
    "AND THEN, THERE'S THAT BEAUTIFUL CLAVICHORD SOLO...",
    '♫ ♫ ♫ ♫ ♫ ♫ ♫'
  ],footpathLines:[
    '♪♫ COWS ARE COOL ♪',
    '♪♫ H-BOMBS ARE COOL ♪',
    '♪♫ THEY MESSED UP OUR CELLS ♪',
    '♪♫ THEY FRIED OUR DNA ♪',
    '♪♫ WE KEEP MUTATING ♪',
    '♪♫ MOO-MUTATING ♪',
    '♪♫ MOO-MUTATE LIKE NO TOMORROW ♪',
    'A SONG LIKE THIS MIGHT CHANGE THE WORLD.'
  ]},
  4:{height:1.68,lines:[
    'MY DAD SENT ME TO THE PUB AGAIN.',
    "I DON'T WANT TO GET DRUNK. I WANT TO STUDY MATH.",
    'MY DAD SAYS THAT GETTING DRUNK IS MORE EDUCATIONAL THAN STUDYING.',
    'MY DAD IS A BLOCKHEAD.',
    'BY THE WAY, I LOVE TALKING TO YOU.',
    'SOMETIMES I REALLY FEEL ALONE.'
  ],riverLines:[
    'THE GOVERNMENT SAYS THAT 2 + 2 = 5.',
    "I THINK IT'S 4.",
    "YOU SEE WHY IT'S IMPORTANT TO STUDY MATH?"
  ],footpathLines:[
    'I LOVE THIS PARK.',
    'I WISH IT WERE BIGGER.'
  ]},
  5:{lines:['THIS BEER SUCKS.','THIS PUB SUCKS.','LIFE SUCKS.','THIS CONVERSATION SUCKS.'],riverLines:['THIS RIVER SUCKS.'],footpathLines:['THIS PARK SUCKS.']},
  6:{lines:[
    "DON'T TALK TO THE STUPID ROBOTS.",
    "THEY'RE SO BORING.",
    "THEY'RE OBSESSED WITH LADYBUGS.",
    'ONE OF THEM TOLD ME THAT LADYBUGS ARE THE SMARTEST SPECIES.',
    'THOSE ROBOTS SHOULD SEE A DOCTOR.'
  ]},
  7:{riverLines:["SORRY PAL, I'M IN HURRY."],footpathLines:['SORRY PAL, TIME IS MONEY.']},
  8:{riverLines:[
    'HAVE YOU MET NURSE JOY?',
    'I THINK YOU TWO WOULD GET ALONG.',
    "CAREFUL, THOUGH. I THINK SHE'S UP TO SOMETHING."
  ],footpathLines:[
    'I CAME HERE TO RELAX.',
    "IT DIDN'T WORK."
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
  ],riverLines:[
    "I'M HERE TO STUDY HUMANS.",
    'I SUPPOSE I SHOULD STUDY YOU.',
    'NO OFFENCE INTENDED, BUT I FIND YOU RATHER BORING.'
  ],footpathLines:['SO MANY LADYBUGS IN THIS PARK!'],lavatoryLines:[
    'I FEEL MUCH BETTER NOW!',
    'ROBOTS NEED TO GO TO THE TOILET, TOO.',
    'ACTUALLY, MORE OFTEN THAN HUMANS.',
    'BUT NOT AS OFTEN AS LADYBUGS.'
  ]},
  12:{goesToPub:false,weight:.25,riverLines:["THIS DOESN'T LOOK LIKE EGYPT.",'WHY AM I HERE?'],footpathLines:[
    'THERE ARE LOTS OF PLACES LIKE THIS IN EGYPT.',
    'BUT WITH LESS GRASS.',
    'AND MORE SAND.',
    'AND TOURISTS VISITING THE PYRAMIDS.',
    'THEY TASTE GOOD.',
    'I MEAN THE TOURISTS. NOT THE PYRAMIDS.',
    "I GUESS I'M A BIT HOME-SICK."
  ]},
  13:{height:1.6,girth:1.25,lines:[
    'MY WIFE HAS ANOTHER MAN AND ANOTHER WOMAN.',
    'MY DAUGHTER HAS ANOTHER DAD.',
    "BUT I DON'T MIND.",
    'FANCY ANOTHER PINT?'
  ],riverLines:[
    'I WAS PLANNING TO JUMP FROM A BRIDGE AND DISAPPEAR.',
    'BUT NIGHT RIVER MADE MY MOOD BETTER.',
    'THIS HAPPENS EVERY NIGHT.',
    "FUCKING RIVER! I'M STILL HERE BECAUSE OF IT."
  ],footpathLines:[
    'HAVE YOU SEEN MY WIFE AROUND?',
    "OH, WELL. I DON'T NEED HER."
  ]},
  14:{height:1.7,lines:[
    "I'M LEARNING THE PERL PROGRAMMING LANGUAGE.",
    "DO YOU KNOW THAT PERL'S AUTHOR IS A LINGUIST?",
    "A LANGUAGE IS MORE THAN GRAMMAR. IT'S A WAY OF THINKING.",
    "PITY ONE CAN'T PROGRAM ROBOTS WITH PERL.",
    `perl -e 'print "PERL IS GOOD\\n"'`
  ],riverLines:[
    'I LOVE REGULAR EXPRESSIONS.',
    "I'M NOT SURE YOU CAN UNDERSTAND."
  ],footpathLines:[
    'DATABASE BENCHMARKING IS SUCH A FASCINATING SUBJECT!',
    'ESPECIALLY WHEN IT COMES TO REPLICATION AND SHARDING.'
  ]},
  15:{height:1.95,lines:[
    'PEOPLE KEEP JUDGING ME.',
    'MY SKIN, MY OPINION, MY... SEXUAL ORIENTATION.',
    "I KNOW THEY'RE JUST WANKERS, BUT...",
    'SOMETIMES IT HURTS.',
    "WHEN I'M SAD, I GO TO THE NIGHT RIVER.",
    "I THINK I'VE HEARD STRANGE NOISES FROM THE STAFF ROOM..."
  ],riverLines:[
    "I COME HERE WHEN I'M SAD.",
    'NIGHT RIVER ALWAYS HELPS MY MOOD.',
    'THOSE ROBOTS SCARE ME.'
  ],footpathLines:[
    'SO MANY RACISTS AND BIGOTS IN OUR GOVERNMENT!',
    'THEY KNOW NOTHING ABOUT DEMOCRACY.',
    'FUCKING TROGLODYTES!',
    'SORRY. YOU CAME HERE TO RELAX, NOT TO TALK ABOUT THIS.',
    'SEE YOU LATER.'
  ]}
};
export const goesToPub=type=>CHARACTER_TRAITS[type]?.goesToPub??true;
export const characterHeight=type=>CHARACTER_TRAITS[type]?.height??1.85;
// Horizontal stretch of the sprite; sprites are otherwise half as wide as tall.
export const characterGirth=type=>CHARACTER_TRAITS[type]?.girth??1;
// What a character says, in order, while the player shares their pub table.
export const pubLines=type=>CHARACTER_TRAITS[type]?.lines??[];
// What a character says, in order, while the player blocks their way in one
// of these places. Elsewhere, or without lines, they say the usual bump notice.
const PLACE_LINES={river:'riverLines',footpath:'footpathLines',lavatory:'lavatoryLines'};
export const placeLines=(type,place)=>CHARACTER_TRAITS[type]?.[PLACE_LINES[place]]??[];
// The riverside promenade, a park footpath, or null for an ordinary sidewalk.
const walkerPlace=(chunk,p)=>chunk.river?'river':p.detour?'footpath':null;
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
// Night River occupies district rows 4 and 5.
export const RIVER_ROWS = [4];
export const RIVER_WIDTH = 92;
export const WATER_LEVEL = -7;
export const BRIDGE_RISE = 6;
export const riverStart = row => RIVER_ROWS.find(start=>row>=start&&row<start+2);
export const isRiverRow = row => riverStart(row)!==undefined;
// Which way the nearest river lies from a row outside it: dz is +1 or -1, and
// blocks counts the rows up to its bank, so 1 means the row borders the river.
export function riverBearing(row) {
  let best=null;
  for(const start of RIVER_ROWS){
    const dz=row<start?1:-1,blocks=row<start?start-row:row-start-1;
    if(!best||blocks<best.blocks)best={dz,blocks};
  }
  return best;
}
export const hasBridge = street => mod(street,3)===0;
export function bridgeHeight(z) {
  const start=riverStart(Math.floor(z/BLOCK));
  if(start===undefined)return 0;
  const t=(z-start*BLOCK-18)/RIVER_WIDTH;
  return t>0&&t<1?BRIDGE_RISE*Math.sin(Math.PI*t):0;
}
export function groundHeight(x,z) {
  const lx=mod(x,BLOCK);
  const street=Math.round(x/BLOCK);
  return hasBridge(street)&&(lx<=14||lx>=50)?bridgeHeight(z):0;
}
// A block has a 10% chance of becoming a park, unless another cached park lies
// within two blocks in any direction, diagonals included.
export const PARK_CHANCE = .1;
export const PARK_GAP = 2;
export const PARK_PATH_WIDTH = 3;
// A fingerpost: the board hangs off the side of a 3.75 m pole, from its surface
// out to the arrow tip, which points along z towards the river.
export const RIVER_SIGN = {pole:.08, height:3.75, start:.08, reach:2.48, tip:.45, bottom:2.925, top:3.495};
// A second board hangs just below the first on the same pole.
export const LOWER_BOARD = {bottom:2.255, top:2.825};
// The game starts in front of the first building of block 0,0, a few steps
// from its corner towards block 1,0: just far enough to see the boards of the
// fingerpost on the sidewalk corner by the crossroads, clear of the walkers.
// Its pole is half as tall again as a park's, with the boards raised to match.
export const START_SIGN = {x:8.6, z:8.6, height:1.5*RIVER_SIGN.height};
export const START = {x:17, z:13.5, angle:Math.atan2(START_SIGN.x-17,START_SIGN.z-13.5)};
// One block down one of the four streets from that crossroads is always a
// park, with a block of buildings in between. No other park is generated as
// close to the fingerpost, so it is the closest park.
export const START_PARKS = [{x:2,z:0},{x:-2,z:0},{x:0,z:2},{x:0,z:-2}];
// From the fingerpost to the nearest point of a block's lawn.
export const startSignDistance = (x,z) => Math.hypot(
  Math.max(x*BLOCK+14-START_SIGN.x,0,START_SIGN.x-x*BLOCK-50),
  Math.max(z*BLOCK+14-START_SIGN.z,0,START_SIGN.z-z*BLOCK-50));
// The boards point along the streets: to the river, and to the start park.
export function startSignBoards(park){
  const dx=(park.x+.5)*BLOCK-START_SIGN.x,dz=(park.z+.5)*BLOCK-START_SIGN.z;
  const parkAxis=Math.abs(dx)>Math.abs(dz)?{dx:Math.sign(dx),dz:0}:{dx:0,dz:Math.sign(dz)};
  const raise=START_SIGN.height-RIVER_SIGN.height;
  return [
    {text:'NIGHT RIVER',dx:0,dz:riverBearing(Math.floor(START_SIGN.z/BLOCK)).dz,bottom:RIVER_SIGN.bottom+raise,top:RIVER_SIGN.top+raise},
    {text:'PARK',...parkAxis,bottom:LOWER_BOARD.bottom+raise,top:LOWER_BOARD.top+raise}
  ];
}
// A walker reaching either end of the footpath takes it one time in four.
export const FOOTPATH_CHANCE = .25;
export const LOAD_RADIUS = 2;
export const KEEP_RADIUS = 3;
export const RIVER_VIEW_DISTANCE = 260;
const RIVER_LOAD_RADIUS = 4;
export const PEDESTRIAN_MIN_SPEED = .9;
export const PEDESTRIAN_MAX_SPEED = PEDESTRIAN_MIN_SPEED * 2;
export const PERSON_CLEARANCE = .85; // Player radius plus pedestrian radius.
const STREET_BUMP_RADIUS = PERSON_CLEARANCE * 1.5; // 50% larger player–NPC collision radius.
export const mod = (n, d) => ((n % d) + d) % d;
function crossesPerson(a,b,person,clearance=PERSON_CLEARANCE) {
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((person.x-a.x)*dx+(person.z-a.z)*dz)/length)):0;
  return Math.hypot(a.x+dx*t-person.x,a.z+dz*t-person.z)<clearance;
}
// Let an actor already inside the collision area retreat without getting stuck.
function crossesPlayer(a,b,person){
  const dx=b.x-a.x,dz=b.z-a.z;
  if(Math.hypot(a.x-person.x,a.z-person.z)<STREET_BUMP_RADIUS&&
    (a.x-person.x)*dx+(a.z-person.z)*dz>=0&&
    Math.hypot(b.x-person.x,b.z-person.z)>Math.hypot(a.x-person.x,a.z-person.z))return false;
  return crossesPerson(a,b,person,STREET_BUMP_RADIUS);
}
export function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Each vending machine sells one of these papers; game.js styles them.
export const NEWSPAPERS = ['DAILY BUGLE', 'NEON NEWS', 'THE RECORD'];
const signs = ['DISCO', 'HOTEL', 'COCKTAILS', 'NEON PUB', 'PARADISE', 'BLUE NOTE', 'DREAMS', 'ARCADE', 'MIDNIGHT', 'CLUB 87'];
const neon = ['#ff46b5', '#55e8ef', '#af78ff', '#ffbc57'];
export class City {
  constructor(seed = Date.now()) {
    this.rng = random(seed); this.chunks = new Map();
    this.startPark = START_PARKS[Math.floor(this.rng() * START_PARKS.length)];
    this.startSignBoards = startSignBoards(this.startPark);
  }
  update(x, z) {
    const cx = Math.floor(x / BLOCK), cz = Math.floor(z / BLOCK);
    for (const [key, c] of this.chunks) if (Math.max(Math.abs(c.x - cx), Math.abs(c.z - cz)) > (c.river?RIVER_LOAD_RADIUS:KEEP_RADIUS)) this.chunks.delete(key);
    for (let i = cx - RIVER_LOAD_RADIUS; i <= cx + RIVER_LOAD_RADIUS; i++) for (let j = cz - LOAD_RADIUS; j <= cz + LOAD_RADIUS; j++) {
      if(Math.abs(i-cx)>LOAD_RADIUS&&!isRiverRow(j))continue;
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
      // A three-block loop follows both banks between consecutive bridges.
      return {x,z,river:true,riverStart:start,buildings:[],people:z===start&&hasBridge(x)?people:[],manholes:[],newspaperMachines:[]};
    }
    const startPark=x===this.startPark.x&&z===this.startPark.z;
    const park=startPark||r()<PARK_CHANCE&&!this.parkNear(x,z)?parkLayout(x,z,r):null;
    if(park)buildings.length=0;
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
    for(let side=0;side<4&&!park;side++)if(r()<.07){
      const [a,b]=neighbors[side].map(index=>buildings[index]);
      if(a.sign===b.sign)continue;
      const along=side<2?(a.x+a.w+b.x)/2:(a.z+a.d+b.z)/2;
      const across=(side<2?a.z:a.x)+(side===0||side===2?-.9*.85/2:(side<2?a.d:a.w)+.9*.85/2);
      newspaperMachines.push({x:side<2?along:across,z:side<2?across:along,side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85,paper:NEWSPAPERS[Math.floor(r()*NEWSPAPERS.length)]});
    }
    return { x, z, buildings, people, manholes, newspaperMachines, park };
  }
  parkNear(x,z) {
    // The start park counts even before it is cached, and stays the closest.
    if(Math.max(Math.abs(this.startPark.x-x),Math.abs(this.startPark.z-z))<=PARK_GAP)return true;
    if(startSignDistance(x,z)<=startSignDistance(this.startPark.x,this.startPark.z))return true;
    for(const c of this.chunks.values())if(c.park&&Math.max(Math.abs(c.x-x),Math.abs(c.z-z))<=PARK_GAP)return true;
    return false;
  }
  solid(x,z, radius=.45) {
    // All blocks share the same footprint, so collision works before a chunk is loaded.
    const lx=mod(x,BLOCK),lz=mod(z,BLOCK);
    const start=riverStart(Math.floor(z/BLOCK));
    if(start!==undefined){
      const street=Math.round(x/BLOCK);
      const onBridge=hasBridge(street)&&Math.abs(x-street*BLOCK)<=14-radius;
      return !onBridge&&z>start*BLOCK+18-radius&&z<start*BLOCK+110+radius;
    }
    const chunk=this.chunks.get(`${Math.floor(x/BLOCK)},${Math.floor(z/BLOCK)}`);
    if(lx>14-radius && lx<50+radius && lz>14-radius && lz<50+radius){
      // Unloaded blocks keep the building footprint; parks block only trees and benches.
      const park=chunk?.park;
      if(!park)return true;
      return park.trees.some(t=>Math.hypot(x-t.x,z-t.z)<t.radius+radius)||
        (park.sign!=null&&Math.hypot(x-park.sign.x,z-park.sign.z)<RIVER_SIGN.pole+radius)||
        park.benches.some(b=>Math.abs((x-b.x)*b.tx+(z-b.z)*b.tz)<1.08+radius&&Math.abs((x-b.x)*b.nx+(z-b.z)*b.nz)<.3+radius);
    }
    if(Math.hypot(x-START_SIGN.x,z-START_SIGN.z)<RIVER_SIGN.pole+radius)return true;
    return (chunk?.newspaperMachines??[]).some(m=>Math.abs(x-m.x)<m.w/2+radius&&Math.abs(z-m.z)<m.d/2+radius);
  }
  pedestrians(time) {
    // Each position keeps its walker, so a bump can tell who was bumped and where.
    return [...this.chunks.values()].flatMap(chunk=>chunk.people.map(p=>({...pedestrian(chunk,p,time),walker:p,place:walkerPlace(chunk,p)})));
  }
  // Returns {walker, place} for each walker on the promenade or a footpath
  // that the player is standing in the way of.
  advancePedestrians(dt,player,time) {
    const heldInPlace=[];
    // Sidewalk loops in separate blocks are at least 22 units apart.
    for(const chunk of this.chunks.values()){
      for(const p of chunk.people)p.walkTime??=time-dt;
      // Reserve one yielding pedestrian per encounter. Their route clock stays
      // frozen until they have stepped out, let the other pass, and returned.
      for(let i=0;i<chunk.people.length;i++)for(let j=i+1;j<chunk.people.length;j++){
        const a=chunk.people[i],b=chunk.people[j];
        if(a.yielding||b.yielding||a.detour||b.detour||a.reverse===b.reverse)continue;
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
        if(crossesPlayer(origin,target,player)||chunk.people.some(q=>q!==p&&crossesPerson(origin,target,pedestrian(chunk,q,time))))continue;
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
          if(!crossesPlayer(origin,target,player)&&!chunk.people.some(q=>q!==p&&crossesPerson(origin,target,pedestrian(chunk,q,time))))y.stage='back';
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
        // Turning onto or off the footpath is part of the planned step, so the
        // collision checks below see where the walker will really be.
        const route=!y&&!waitingForSideStep&&chunk.park?this.footpathStep(chunk,p,dt):null;
        const after=pedestrian(chunk,{...p,...route,walkTime:p.walkTime+((y&&y.stage!=='escape')||waitingForSideStep?0:dt),yielding:y?{...y,offset}:undefined},time);
        const held=crossesPlayer(before,after,player);
        return {p,before,after,offset,waitingForSideStep,route,held,blocked:held||this.solid(after.x,after.z)};
      });
      // Walkers with lines for their place stay to talk while the player blocks them.
      const talking=new Set();
      for(const move of moves){
        const place=walkerPlace(chunk,move.p);
        if(!move.held||!place)continue;
        heldInPlace.push({walker:move.p,place});
        if(placeLines(move.p.type,place).length)talking.add(move.p);
      }
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
        if(!y){
          if(move.waitingForSideStep)continue;
          move.p.walkTime+=dt;
          if(move.route){Object.assign(move.p,move.route);if(!move.p.detour)delete move.p.detour;delete move.p.footpathChoice;}
          continue;
        }
        if(y.stage==='escape')move.p.walkTime+=dt;
        y.offset=move.offset;
        if(y.stage==='out'&&y.offset===1.3)y.stage='wait';
        if(y.stage==='back'&&y.offset===0)delete move.p.yielding;
      }
      const turnAround=p=>{
        if((p.yielding&&p.yielding.stage!=='escape')||p.turnCooldown||p.stuckTime<1.5||talking.has(p))return false;
        // On the footpath, walk back the way they came.
        const turned=p.detour?{detour:reverseDetour(p.detour,p)}:{phase:mod(p.phase+2*p.walkTime*p.speed*(p.reverse?-1:1),chunk.river?552:168),reverse:!p.reverse};
        const origin=pedestrian(chunk,p,time);
        const next=pedestrian(chunk,{...p,...turned,walkTime:p.walkTime+.2},time);
        if(this.solid(next.x,next.z)||crossesPlayer(origin,next,player)||chunk.people.some(q=>q!==p&&crossesPerson(origin,next,pedestrian(chunk,q,time))))return false;
        Object.assign(p,turned);p.stuckTime=0;p.turnCooldown=3;delete p.footpathChoice;
        return true;
      };
      for(let i=0;i<chunk.people.length;i++)for(let j=i+1;j<chunk.people.length;j++){
        const a=chunk.people[i],b=chunk.people[j];
        if(a.detour||b.detour||a.reverse===b.reverse||a.stuckTime<1.5||b.stuckTime<1.5||a.turnCooldown||b.turnCooldown)continue;
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
    return heldInPlace;
  }
  // Plans a walker's next dt on a park block: the state to adopt if the step
  // goes ahead, or null to keep walking as before. A choice made at a blocked
  // step is kept, so waiting at a junction does not roll the dice again.
  footpathStep(chunk,p,dt) {
    const walkTime=p.walkTime+dt,step=dt*p.speed;
    if(p.detour){
      const walked=(walkTime-p.detour.start)*p.speed;
      if(walked<p.detour.total)return null;
      // Back on the sidewalk at the far end, heading left or right at random.
      p.footpathChoice??={reverse:this.rng()<.5};
      const {reverse}=p.footpathChoice,dir=reverse?-1:1;
      return {detour:undefined,reverse,phase:p.detour.exit+(walked-p.detour.total)*dir-walkTime*p.speed*dir};
    }
    // Did this step reach a footpath end? Ties at the start of a step do not
    // count, so a walker leaving the footpath does not decide again at once.
    const dir=p.reverse?-1:1,now=mod(p.phase+walkTime*p.speed*dir,168);
    for(const junction of footpathJunctions(chunk)){
      const passed=mod((junction.at-now)*-dir,168);
      if(passed>=step-1e-9)continue;
      if(p.footpathChoice?.at!==junction.at)p.footpathChoice={at:junction.at,take:this.rng()<FOOTPATH_CHANCE};
      if(!p.footpathChoice.take)return {};
      const detour=footpathDetour(chunk,junction.end);
      detour.start=walkTime-passed/p.speed;
      return {detour};
    }
    return null;
  }
  // Bumped people are also added to the optional bumped list.
  move(p,dx,dz,people=[],bumped=[]) {
    let bumpedPedestrian=false;
    const reach=Math.hypot(dx,dz)+STREET_BUMP_RADIUS;
    const nearby=people.filter(person=>Math.hypot(person.x-p.x,person.z-p.z)<=reach);
    const blocked=(x,z)=>{
      if(this.solid(x,z))return true;
      const hit=x!==p.x||z!==p.z?nearby.filter(person=>
        Math.hypot(x-person.x,z-person.z)<=Math.hypot(p.x-person.x,p.z-person.z)&&
        crossesPerson(p,{x,z},person,STREET_BUMP_RADIUS)):[];
      if(hit.length){
        for(const person of hit)if(!bumped.includes(person))bumped.push(person);
        bumpedPedestrian=true;
      }
      return nearby.some(person=>crossesPlayer(p,{x,z},person));
    };
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
    for(let i=0;i<steps;i++){if(!blocked(p.x+dx/steps,p.z))p.x+=dx/steps;if(!blocked(p.x,p.z+dz/steps))p.z+=dz/steps;}
    return bumpedPedestrian;
  }
}
// Shortest distance from a point to the footpath's centre line.
export function pathDistance(path,x,z){
  let best=Infinity;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;
    best=Math.min(best,Math.hypot(a.x+dx*t-x,a.z+dz*t-z));
  }
  return best;
}
// The lawn spans local 14..50. A winding footpath joins two opposite sidewalks,
// meeting each one squarely. "along" runs between those sidewalks.
function parkLayout(x,z,r){
  const axis=Math.floor(r()*2),half=PARK_PATH_WIDTH/2;
  const at=(along,across)=>axis?{x:x*BLOCK+across,z:z*BLOCK+along}:{x:x*BLOCK+along,z:z*BLOCK+across};
  // Bends on either side of the middle make an S; on the same side, a C.
  // Their size keeps every curve wider than the path, so its edges never fold.
  const bend=r()<.5?-1:1,mid=32+(r()-.5)*4;
  const keys=r()<.6
    ?[[14,mid-bend*r()*3],[26,mid+bend*(4.5+r()*2.5)],[38,mid-bend*(4.5+r()*2.5)],[50,mid+bend*r()*3]]
    :[[14,mid-bend*(1+r()*3)],[26,mid+bend*(5+r()*3)],[38,mid+bend*(5+r()*3)],[50,mid-bend*(1+r()*3)]];
  // Hermite segments through the key points; the ends leave the sidewalks squarely.
  const tangents=keys.map((k,i)=>i===0||i===keys.length-1?[18,0]:[(keys[i+1][0]-keys[i-1][0])/2,(keys[i+1][1]-keys[i-1][1])/2]);
  const path=[];
  for(let i=0;i<keys.length-1;i++)for(let step=i?1:0;step<=10;step++){
    const t=step/10,h00=2*t**3-3*t**2+1,h10=t**3-2*t**2+t,h01=-2*t**3+3*t**2,h11=t**3-t**2;
    const along=h00*keys[i][0]+h10*tangents[i][0]+h01*keys[i+1][0]+h11*tangents[i+1][0];
    const across=h00*keys[i][1]+h10*tangents[i][1]+h01*keys[i+1][1]+h11*tangents[i+1][1];
    path.push(at(along,across));
  }
  // Benches sit beside the path, parallel to it, with their backs away from it.
  const benches=[],inLawn=(px,pz)=>px-x*BLOCK>=15&&px-x*BLOCK<=49&&pz-z*BLOCK>=15&&pz-z*BLOCK<=49;
  for(const range of [[6,12],[18,24]])for(let tries=0;tries<12;tries++){
    const i=range[0]+Math.floor(r()*(range[1]-range[0])),side=r()<.5?-1:1;
    const a=path[i-1],b=path[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);
    const tx=(b.x-a.x)/length,tz=(b.z-a.z)/length,nx=-tz*side,nz=tx*side;
    const bench={x:path[i].x+nx*(half+.65),z:path[i].z+nz*(half+.65),tx,tz,nx,nz};
    const corners=[[-1.08,-.3],[1.08,-.3],[-1.08,.3],[1.08,.3]].map(([u,v])=>({x:bench.x+tx*u+nx*v,z:bench.z+tz*u+nz*v}));
    if(corners.some(c=>!inLawn(c.x,c.z)||pathDistance(path,c.x,c.z)<half+.2))continue;
    benches.push(bench);break;
  }
  // Parks away from the river have a fingerpost on the lawn's river-side edge,
  // read face-on from the street along that edge.
  const bearing=riverBearing(z);
  let sign=null;
  if(bearing.blocks>1)for(const lx of [17,47,20,44,23,41,26,38,29,35,32]){
    const pole={x:x*BLOCK+lx,z:z*BLOCK+(bearing.dz>0?47:17),dz:bearing.dz};
    const tip={x:pole.x,z:pole.z+pole.dz*RIVER_SIGN.reach};
    if(pathDistance(path,pole.x,pole.z)<half+1||pathDistance(path,tip.x,tip.z)<half+.3)continue;
    if(benches.some(b=>Math.hypot(b.x-pole.x,b.z-pole.z)<2.2||Math.hypot(b.x-tip.x,b.z-tip.z)<1.6))continue;
    sign=pole;break;
  }
  // Pines stand 16-22 units tall. Their lowest boughs start above head height,
  // so only trunks block walking; boughs may overhang the path.
  const trees=[],count=3+Math.floor(r()*3);
  for(let tries=0;trees.length<count&&tries<200;tries++){
    const along=17+r()*30,across=17+r()*30,scale=.9+r()*.3,p=at(along,across);
    const crown=3.6*scale,radius=.45*scale;
    if(pathDistance(path,p.x,p.z)<half+1.2)continue;
    if(benches.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<2.6))continue;
    // Boughs stay clear of the sign, so it stands against the sky.
    if(sign&&Math.hypot(sign.x-p.x,sign.z-p.z)<crown+.5)continue;
    if(trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<t.crown+crown))continue;
    trees.push({...p,scale,crown,radius});
  }
  // A few fallen cones lie on the grass beneath each pine, never on the path.
  const cones=[];
  for(const t of trees)for(let placed=0,count=1+Math.floor(r()*2),tries=0;placed<count&&tries<10;tries++){
    const angle=r()*Math.PI*2,distance=(1+r()*2.2)*t.scale,cx=t.x+Math.cos(angle)*distance,cz=t.z+Math.sin(angle)*distance;
    const cone={x:cx,z:cz,angle:r()*Math.PI*2,length:.16+r()*.08,radius:.055+r()*.02};
    if(!inLawn(cx,cz)||pathDistance(path,cx,cz)<half+.3)continue;
    if(benches.some(b=>Math.hypot(b.x-cx,b.z-cz)<1.3))continue;
    cones.push(cone);placed++;
  }
  return {axis,path,benches,trees,cones,sign};
}
// Loop positions of the sidewalk points level with each footpath end.
export function footpathJunctions(chunk){
  const {axis,path}=chunk.park,lx=q=>q.x-chunk.x*BLOCK,lz=q=>q.z-chunk.z*BLOCK;
  const first=path[0],last=path.at(-1);
  // Axis 0 joins the x=11 and x=53 sidewalks; axis 1 joins z=11 and z=53.
  return axis
    ?[{end:0,at:lx(first)-11},{end:1,at:84+53-lx(last)}]
    :[{end:0,at:126+53-lz(first)},{end:1,at:42+lz(last)-11}];
}
// The walk from one sidewalk, along the whole footpath, to the opposite one.
function footpathDetour(chunk,end){
  const {axis,path}=chunk.park,points=end?[...path].reverse():[...path];
  const out=(q,toward)=>axis?{x:q.x,z:q.z+toward*3}:{x:q.x+toward*3,z:q.z};
  const outward=end?1:-1;
  points.unshift(out(points[0],outward));points.push(out(points.at(-1),-outward));
  const lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  const exit=footpathJunctions(chunk)[1-end].at;
  return {points,lengths,total:lengths.at(-1),exit,entry:footpathJunctions(chunk)[end].at};
}
const detourDistance=(detour,p)=>(p.walkTime-detour.start)*p.speed;
function reverseDetour(detour,p){
  const walked=Math.min(detour.total,detourDistance(detour,p));
  const points=[...detour.points].reverse(),lengths=detour.lengths.map(l=>detour.total-l).reverse();
  return {points,lengths,total:detour.total,exit:detour.entry,entry:detour.exit,start:p.walkTime-(detour.total-walked)/p.speed};
}
function detourPosition(detour,distance){
  const d=Math.max(0,Math.min(detour.total,distance)),{points,lengths}=detour;
  let i=1;
  while(i<points.length-1&&lengths[i]<d)i++;
  const a=points[i-1],b=points[i],t=(d-lengths[i-1])/((lengths[i]-lengths[i-1])||1);
  const length=Math.hypot(b.x-a.x,b.z-a.z)||1;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,facingX:(b.x-a.x)/length,facingZ:(b.z-a.z)/length};
}
function pedestrianRoute(chunk,p,time){
  const length=chunk.river?106:42;
  const width=chunk.river?170:42;
  let t=mod(p.phase+time*p.speed*(p.reverse?-1:1),2*(width+length));
  const lengths=[width,length,width,length];
  let side=0;
  while(side<3&&t>=lengths[side])t-=lengths[side++];
  return {side,t,length,width};
}
export function pedestrian(chunk,p,time) {
  time=p.walkTime??time;
  if(p.detour){
    const at=detourPosition(p.detour,(time-p.detour.start)*p.speed);
    return {...at,type:p.type,frame:Math.floor(time*p.speed*5+p.phase)%4,variant:p.variant};
  }
  const {side,t,length,width}=pedestrianRoute(chunk,p,time);
  return {x:chunk.x*64+[11+t,11+width,11+width-t,11][side]+(p.yielding?p.yielding.dx*p.yielding.offset:0),z:(chunk.river?chunk.riverStart:chunk.z)*64+[11,11+t,11+length,11+length-t][side]+(p.yielding?p.yielding.dz*p.yielding.offset:0),facingX:[1,0,-1,0][side]*(p.reverse?-1:1),facingZ:[0,1,0,-1][side]*(p.reverse?-1:1),type:p.type,frame:Math.floor(time*p.speed*5+p.phase)%4,variant:p.variant};
}
export function pedestrianShowsBack(person,viewer) {
  return (viewer.x-person.x)*person.facingX+(viewer.z-person.z)*person.facingZ<0;
}
export function traffic(chunk,time) {
  const cars=[];
  // Identify each car in the moving stream so its colour survives tile crossings.
  for(let axis=0;axis<2;axis++)for(let dir=-1;dir<=1;dir+=2){
    // The street through the middle of a wide river is removed.
    if(!axis&&isRiverRow(chunk.z)&&!hasBridge(chunk.x))continue;
    if(axis&&isRiverRow(chunk.z)&&chunk.z!==riverStart(chunk.z))continue;
    const lane=axis?chunk.z:chunk.x, phase=time*10*dir+lane*17+dir*13, t=mod(phase,64);
    const carId=(axis?chunk.x:chunk.z)-Math.floor(phase/64);
    const colour=random(Math.imul(carId,73856093)^Math.imul(lane,19349663)^Math.imul(axis+1,83492791)^Math.imul(dir,2654435761))();
    cars.push({x:chunk.x*64+(axis?t:dir*3),z:chunk.z*64+(axis?-dir*3:t),axis,dir,color:['#e94054','#397fe0','#f173bc','#43c18b'][Math.floor(colour*4)]});
  }
  return cars;
}
