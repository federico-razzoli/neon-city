import test from 'node:test';
import assert from 'node:assert/strict';
import {City,BLOCK,RIVER_ROWS,PERSON_CLEARANCE,RIVER_WALK_HEIGHT,pedestrian} from '../neon-city/world.js';
import {seedRiverPeople,RIVER_STAIR_CHANCE} from '../neon-city/river-pedestrians.js';
const row=RIVER_ROWS[0],far={x:10000,z:10000};
function fixture(){
  const city=new City(1),chunk=city.generate(0,row);chunk.people=[];city.chunks.set(`0,${row}`,chunk);city.rng=()=>0;
  return {city,chunk};
}
function walker(chunk,mode='upper',bank=0){
  const p={phase:0,speed:1.5,type:0,variant:0,reverse:false,walkTime:0};
  seedRiverPeople(chunk,[p],()=>0);
  const route=mode==='upper'?chunk.riverRoutes.forward.upper:chunk.riverRoutes.forward.lower[bank];
  p.riverMotion={mode,bank,s:mode==='lower'?-1.5:route.total-1.5,lastDecision:-Infinity};
  return p;
}
function tick(city,n=1,dt=.05){for(let i=0;i<n;i++)city.advancePedestrians(dt,far,i*dt);}

test('generated river populations start on both lower paths at their actual elevation',()=>{
  for(const x of [-3,0,3]){
    const city=new City(1),chunk=city.generate(x,row),lower=chunk.people.filter(p=>p.riverMotion?.mode==='lower');
    assert.equal(chunk.people.length,14);assert.equal(lower.length,4);
    assert.equal(chunk.people.filter(p=>p.riverMotion.mode==='upper').length,10);
    assert.deepEqual(lower.map(p=>p.riverMotion.bank),[0,1,0,1]);
    for(const p of lower){const at=pedestrian(chunk,p,0);assert.equal(at.ground,RIVER_WALK_HEIGHT);assert.ok(at.z>=row*BLOCK+18&&at.z<=row*BLOCK+110);}
  }
});
test('the stair decision is exactly 25 percent, with one draw per encounter',()=>{
  assert.equal(RIVER_STAIR_CHANCE,.25);
  for(const mode of ['upper','lower'])for(const draw of [.249999,.25,.99]){
    const {city,chunk}=fixture(),p=walker(chunk,mode);chunk.people=[p];let rolls=0;city.rng=()=>{rolls++;return draw;};
    tick(city);assert.equal(p.riverMotion.mode==='stairs',draw<.25);assert.equal(rolls,1);
    tick(city,10);assert.equal(rolls,1,'blocked or departing walkers never reroll the same decision');
  }
});
test('opposite stair directions queue, matching directions can follow, and queues clear after exit',()=>{
  const {city,chunk}=fixture(),down=walker(chunk);chunk.people=[down];tick(city);assert.equal(down.riverMotion.mode,'stairs');
  down.riverMotion.s=10;
  const follower=walker(chunk);chunk.people.push(follower);tick(city);assert.equal(follower.riverMotion.mode,'stairs','same direction can enter when spaced apart');
  chunk.people.pop();
  const up=walker(chunk,'lower');chunk.people.push(up);let draws=0;city.rng=()=>{draws++;return 0;};
  tick(city,20);assert.equal(up.riverMotion.mode,'lower');assert.ok(up.riverMotion.pending);assert.equal(draws,1,'queued choice is retained');
  let entered=false,completed=false;
  for(let i=0;i<1800;i++){
    tick(city);
    const stairs=chunk.people.filter(p=>p.riverMotion.mode==='stairs');
    assert.ok(new Set(stairs.map(p=>p.riverMotion.direction)).size<=1,'opposite directions never share the stairs');
    const a=pedestrian(chunk,down,0),b=pedestrian(chunk,up,0);
    if(Math.abs(a.ground-b.ground)<1.5)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=PERSON_CLEARANCE-1e-7);
    if(up.riverMotion.mode==='stairs')entered=true;
    if(entered&&up.riverMotion.mode==='upper'){completed=true;break;}
  }
  assert.ok(entered&&completed,'waiting ascender eventually reaches the upper path');
});
test('both stair exits wait for path traffic to clear before releasing their direction reservation',()=>{
  for(const origin of ['upper','lower']){
    const {city,chunk}=fixture(),p=walker(chunk,origin);chunk.people=[p];tick(city);
    assert.equal(p.riverMotion.mode,'stairs');p.riverMotion.s=p.riverMotion.route.total-1.2;
    const exit=p.riverMotion.exit,blocker=walker(chunk,exit.mode,exit.bank);blocker.speed=0;blocker.riverMotion={...exit};chunk.people.push(blocker);
    tick(city,50);assert.equal(p.riverMotion.mode,'stairs','waits on stair route rather than entering an occupied path');
    const a=pedestrian(chunk,p,0),b=pedestrian(chunk,blocker,0);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=PERSON_CLEARANCE-1e-7);
    blocker.riverMotion.s+=8;tick(city,40);assert.equal(p.riverMotion.mode,exit.mode,'joins the path once the exit has space');
  }
});
test('river routes remain collision-free across repeated stair choices and neighbouring owners',()=>{
  const city=new City(1);for(const x of [-3,0,3])city.chunks.set(`${x},${row}`,city.generate(x,row));
  let stairs=0;
  for(let i=0;i<2400;i++){
    city.advancePedestrians(.05,far,i*.05);
    const people=city.pedestrians(0);
    stairs+=people.filter(p=>p.walker.riverMotion.mode==='stairs').length;
    for(let a=0;a<people.length;a++)for(let b=a+1;b<people.length;b++)if(Math.abs(people[a].ground-people[b].ground)<1.5)
      assert.ok(Math.hypot(people[a].x-people[b].x,people[a].z-people[b].z)>=PERSON_CLEARANCE-1e-6,`collision at frame ${i}`);
  }
  assert.ok(stairs>0);
});

test('player collisions and conversations respect lower walker elevation',async()=>{
  const {WalkerTalk}=await import('../neon-city/walker-talk.js');
  const {city,chunk}=fixture(),p=walker(chunk,'lower');p.type=15;p.riverMotion.s=45;chunk.people=[p];
  const at=pedestrian(chunk,p,0),player={x:at.x-2,z:at.z,angle:Math.PI/2,riverWalk:true},bumped=[];
  const talk=new WalkerTalk(()=>0);
  assert.equal(talk.interact({...player,riverWalk:false},city.pedestrians(0)),null,'upper level cannot talk through the floor');
  assert.ok(talk.interact(player,city.pedestrians(0)));
  city.move(player,4,0,city.pedestrians(0),bumped);
  assert.ok(at.x-player.x>=PERSON_CLEARANCE*1.5-1e-7);assert.equal(bumped[0].walker,p);
});

test('lower walkers continue straight through successive bridges without reversing or teleporting',()=>{
  for(const bank of [0,1])for(const reverse of [false,true]){
    const {city,chunk}=fixture(),p=walker(chunk,'lower',bank);p.reverse=reverse;
    p.riverMotion.s=0;chunk.people=[p];let decisions=0;
    city.rng=()=>{decisions++;return .99;};
    const heading=bank?(reverse?1:-1):(reverse?-1:1);
    let before=pedestrian(chunk,p,0);
    for(let i=0;i<1600;i++){
      city.advancePedestrians(.2,far,i*.2);
      const after=pedestrian(chunk,p,0);
      assert.equal(p.riverMotion.mode,'lower');
      assert.equal(after.facingX,heading);
      assert.ok((after.x-before.x)*heading>=0);
      assert.ok(Math.abs(after.x-before.x)<=p.speed*.2+1e-7);
      assert.equal(after.z,before.z);assert.equal(after.ground,RIVER_WALK_HEIGHT);
      before=after;
    }
    assert.equal(decisions,2,'one stair choice at each successive bridge');
  }
});

test('walkers use stairs at the bridge they actually reach, preserving direction when they leave',()=>{
  for(const bank of [0,1])for(const reverse of [false,true]){
    const {city,chunk}=fixture(),p=walker(chunk,'lower',bank);p.reverse=reverse;
    p.riverMotion.s=3*BLOCK-1.5;chunk.people=[p];
    const heading=bank?(reverse?1:-1):(reverse?-1:1);
    tick(city);assert.equal(p.riverMotion.mode,'stairs');
    assert.equal(p.riverMotion.key,`${heading*3}:${row}:${bank}`);
    assert.ok(p.riverMotion.route.points.every(point=>Math.abs(point.x-heading*3*BLOCK)<35));
    for(let i=0;i<1500&&p.riverMotion.mode==='stairs';i++)tick(city);
    assert.equal(p.riverMotion.mode,'upper');
    tick(city,25);
    assert.ok(Math.abs(pedestrian(chunk,p,0).facingX-heading)<1e-9);
  }
});

test('ice cream stops roll once per pass at one third and reserve no more than one waiting place',async()=>{
  const {startIceCreamVisit,ICE_CREAM_STOP_CHANCE}=await import('../neon-city/river-ice-cream.js');
  assert.equal(ICE_CREAM_STOP_CHANCE,1/3);
  for(const roll of [1/3-1e-6,1/3,.9]){
    const city=new City(1),vanChunk=city.generate(1,row);city.chunks.set(`1,${row}`,vanChunk);
    const p={riverMotion:{mode:'upper',s:76}},before={x:93.5,z:row*BLOCK+10.45,facingX:1},after={...before,x:93.7};
    let draws=0;city.rng=()=>{draws++;return roll;};
    assert.equal(!!startIceCreamVisit(city,p,before,after,{mode:'upper',s:76.7},[]),roll<1/3);
    startIceCreamVisit(city,p,before,after,{mode:'upper',s:76.7},[]);assert.equal(draws,1);
  }
  const city=new City(1),vanChunk=city.generate(1,row);city.chunks.set(`1,${row}`,vanChunk);city.rng=()=>0;
  const before={x:93.5,z:row*BLOCK+10.45,facingX:1},after={...before,x:93.7},actors=[];
  for(let i=0;i<3;i++){
    const p={riverMotion:{mode:'upper',s:76}};
    const visit=startIceCreamVisit(city,p,before,after,{mode:'upper',s:76.7},actors);
    if(i<2){assert.equal(visit.slot,i);p.riverMotion=visit;actors.push({p});}
    else assert.equal(visit,null);
  }
});

test('ice cream service lasts five seconds and eating advances every ten seconds even while stopped',async()=>{
  const {advanceIceCreamVisit,carriedIceCreamStage,ageCarriedIceCreams}=await import('../neon-city/river-ice-cream.js');
  const p={riverMotion:{mode:'ice-cream',slot:0,stage:'talk',elapsed:0,at:{x:0,z:0}}};
  p.riverMotion=advanceIceCreamVisit(p,4.95,[]);assert.equal(p.riverMotion.stage,'talk');
  p.riverMotion=advanceIceCreamVisit(p,.05,[]);assert.equal(p.riverMotion.stage,'leave');assert.equal(p.riverMotion.grantIceCream,true);
  p.iceCream={age:0};const city={chunks:new Map([['test',{people:[p]}]])};
  assert.equal(carriedIceCreamStage(p.iceCream),'full');
  ageCarriedIceCreams(city,10);assert.equal(carriedIceCreamStage(p.iceCream),'bitten');
  ageCarriedIceCreams(city,10);assert.equal(carriedIceCreamStage(p.iceCream),'cone');
  ageCarriedIceCreams(city,10);assert.equal(p.iceCream,undefined);assert.equal(carriedIceCreamStage(p.iceCream),null);
});

test('river customers step clear of both through lanes, queue safely, and resume their routes with ice creams',()=>{
  for(const bank of [0,1]){
    const {city}=fixture(),owner=bank?3:0,chunk=city.generate(owner,row),vanChunk=city.generate(owner+1,row+bank);
    chunk.people=[];vanChunk.people=[];city.chunks.clear();city.chunks.set(`${owner},${row}`,chunk);city.chunks.set(`${owner+1},${row+bank}`,vanChunk);
    const people=[];
    for(let i=0;i<3;i++){
      const p=walker(chunk);p.reverse=false;
      seedRiverPeople(chunk,[p],()=>0);
      const route=chunk.riverRoutes.forward.upper,target=owner*BLOCK+(bank?98.5+i*1.5:93.5-i*1.5);
      const segment=route.points.findIndex((a,j)=>j<route.points.length-1&&a.z===route.points[j+1].z&&Math.abs(a.z-(row*BLOCK+(bank?117.55:10.45)))<.01&&Math.min(a.x,route.points[j+1].x)<=target&&Math.max(a.x,route.points[j+1].x)>=target);
      assert.ok(segment>=0);
      p.riverMotion={mode:'upper',s:route.lengths[segment]+Math.abs(target-route.points[segment].x),lastDecision:-Infinity};people.push(p);
    }
    chunk.people=people;let queued=false,served=new Set(),resumed=new Set();
    for(let i=0;i<900;i++){
      city.advancePedestrians(.05,far,i*.05);
      const visiting=people.filter(p=>p.riverMotion.mode==='ice-cream'&&p.riverMotion.stage!=='leave');
      assert.ok(visiting.length<=2);assert.ok(visiting.filter(p=>p.riverMotion.slot===1).length<=1);
      for(const p of visiting)if(['talk','wait'].includes(p.riverMotion.stage)){
        const at=pedestrian(chunk,p,0),laneA=row*BLOCK+(bank?116.45:10.45),laneB=laneA+1.1;
        assert.ok(Math.abs(at.z-laneA)>PERSON_CLEARANCE&&Math.abs(at.z-laneB)>PERSON_CLEARANCE);
        if(p.riverMotion.stage==='wait')queued=true;
      }
      for(const p of people){if(p.iceCream)served.add(p);if(served.has(p)&&p.riverMotion.mode==='upper')resumed.add(p);}
      for(let a=0;a<people.length;a++)for(let b=a+1;b<people.length;b++){
        const pa=pedestrian(chunk,people[a],0),pb=pedestrian(chunk,people[b],0);
        assert.ok(Math.hypot(pa.x-pb.x,pa.z-pb.z)>=PERSON_CLEARANCE-1e-7);
      }
    }
    assert.ok(queued);assert.equal(served.size,2);assert.equal(resumed.size,2);
  }
});
