import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeLife,ARCADE_VISITOR_TYPES,arcadeRoute,arcadeWalkable} from '../neon-city/arcade-life.js';
import {ARCADE,moveInArcade} from '../neon-city/arcade-interior.js';
const stepUntil=(life,predicate,limit=3000)=>{
  for(let i=0;i<limit&&!predicate();i++)life.update(.05);
  assert.ok(predicate(),'visitor reaches expected state');
};
const playing=(type,machine,wait=1)=>({type,machine,wait,state:'playing',x:machine.x+.75,z:machine.z-.7,walkTime:0});

test('first entry is 5–10 seconds; visitor walks to desk, talks five seconds, then plays 5–10 seconds',()=>{
  for(const value of [0,.5,.999]){
    const life=new ArcadeLife(()=>value);assert.equal(life.arrival,5+value*5);
    life.update(life.arrival-.01);assert.equal(life.people.length,0);
    life.update(.02);assert.equal(life.people.length,1);assert.equal(life.people[0].state,'to-desk');
    assert.ok(ARCADE_VISITOR_TYPES.includes(life.people[0].type));assert.ok(life.arrival>=10&&life.arrival<=20);
    stepUntil(life,()=>life.deskBusy);const p=life.people[0];
    assert.equal(p.wait,5);assert.equal(p.x,ARCADE.attendant.x);assert.equal(p.z,ARCADE.desk.z-.85);
    life.update(4.9);assert.equal(p.state,'desk');life.update(.11);assert.equal(p.state,'to-cabinet');
    stepUntil(life,()=>p.state==='playing');assert.ok(p.wait>=5&&p.wait<=10);assert.ok(life.occupied(p.machine));
  }
});
test('departures restart the arrival delay at 5–10 seconds and exclude the last departing character',()=>{
  for(const value of [0,.5,.999])for(const type of ARCADE_VISITOR_TYPES){
    const life=new ArcadeLife(()=>value);
    const others=ARCADE_VISITOR_TYPES.filter(t=>t!==type).slice(0,2);
    const p={type,state:'to-exit',x:ARCADE.door.x,z:.51,route:[{x:ARCADE.door.x,z:.5}],walkTime:0};
    life.people=[p,...others.map((t,i)=>playing(t,ARCADE.cabinets[i],100))];
    life.arrival=-100;
    life.update(.1);
    assert.equal(life.people.length,2);
    assert.equal(life.lastDepartedType,type);
    assert.equal(life.arrival,5+value*5,'delay starts when the visitor actually exits');
    life.update(life.arrival-.01);assert.equal(life.people.length,2);
    life.update(.02);assert.equal(life.people.length,3);
    const entrant=life.people.find(person=>person.state==='to-desk');
    assert.ok(entrant);
    assert.notEqual(entrant.type,type);
    assert.ok(!others.includes(entrant.type));
    assert.equal(life.people.filter(person=>person.state!=='playing'&&person.state!=='desk').length,1);
  }
});
test('an expired post-departure delay still waits for the active visitor',()=>{
  const life=new ArcadeLife(()=>0);
  life.lastDepartedType=14;life.arrival=5;
  const p=playing(15,ARCADE.cabinets[0]);
  p.state='desk';p.wait=100;life.people=[p];
  life.update(6);
  assert.equal(life.people.length,1);
  p.state='playing';p.wait=100;
  life.update(.01);
  assert.equal(life.people.length,2);
  assert.notEqual(life.people[1].type,14);
});
test('all cabinet routes avoid furniture, chairs and the attendant',()=>{
  const start={x:ARCADE.attendant.x,z:ARCADE.desk.z-.85};
  for(const machine of ARCADE.cabinets){
    const end={x:machine.x+.75,z:machine.z-.7},route=arcadeRoute(start,end);assert.ok(route);
    let a=start;
    for(const b of route){
      const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025));
      for(let i=0;i<=n;i++)assert.ok(arcadeWalkable({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}));
      a=b;
    }
  }
});
test('visitors route around cabinet rows rather than through the gaps',()=>{
  for(const [i,left] of ARCADE.cabinets.entries()){
    const right=ARCADE.cabinets[i+1];
    if(!right||right.z!==left.z)continue;
    const x=(left.x+left.w+right.x)/2;
    assert.equal(arcadeWalkable({x,z:left.z+left.d/2}),false);
    if(left.z+left.d+.4>ARCADE.depth-.3)continue; // The back row meets the wall.
    const start={x,z:left.z-.7},end={x,z:left.z+left.d+.4};
    const route=arcadeRoute(start,end);assert.ok(route,'both sides of the row remain reachable');
    const row=ARCADE.cabinets.filter(b=>b.z===left.z);
    const minX=Math.min(...row.map(b=>b.x))-.3,maxX=Math.max(...row.map(b=>b.x+b.w))+.3;
    let a=start;
    for(const b of route){
      const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025);
      for(let j=0;j<=n;j++){
        const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};
        if(p.z>left.z-.3&&p.z<left.z+left.d+.3)
          assert.ok(p.x<=minX||p.x>=maxX,'cross the row only beyond its ends');
      }
      a=b;
    }
  }
});
test('post-game decisions use 35% exit, 15% desk, 50% another cabinet',()=>{
  for(const [value,state] of [[0,'to-exit'],[.3499,'to-exit'],[.35,'to-desk'],[.4999,'to-desk'],[.5,'to-cabinet'],[.999,'to-cabinet']]){
    const life=new ArcadeLife(()=>value);life.arrival=100;
    const p=playing(14,ARCADE.cabinets[5],0);life.people=[p];const previous=p.machine;
    life.update(.01);assert.equal(p.state,state);
    if(state==='to-cabinet')assert.notEqual(p.machine,previous,'choose a different game');
    if(state==='to-exit'){stepUntil(life,()=>!life.people.includes(p));}
  }
});
test('one nonplaying visitor blocks entry and all other departures until playing',()=>{
  const life=new ArcadeLife(()=>.6);life.update(6.01); // initial arrival is 8.0
  life.arrival=0;life.update(.01);const active=life.people[0];
  const p=playing(0,ARCADE.cabinets[8],.01);life.people.push(p);life.arrival=0;
  life.update(1);assert.equal(life.people.length,2);assert.equal(p.wait,0);assert.equal(p.state,'playing');
  stepUntil(life,()=>active.state==='playing');assert.equal(p.state,'playing');
  life.arrival=100;life.update(.01);assert.equal(p.state,'to-cabinet');
  assert.equal(life.people.filter(p=>p.state!=='playing').length,1);
});
test('overdue arrivals take their turn, never exceed three and use distinct characters',()=>{
  const life=new ArcadeLife(()=>.7);let max=0;
  for(let i=0;i<5000;i++){
    life.update(.05);max=Math.max(max,life.people.length);
    assert.ok(life.people.length<=3);assert.equal(new Set(life.people.map(p=>p.type)).size,life.people.length);
    assert.ok(life.people.filter(p=>p.state!=='playing').length<=1);
  }
  assert.equal(max,3);
});
test('visitors reserve cabinets, avoid the player cabinet and remain solid to the player',()=>{
  const life=new ArcadeLife(()=>0),p=playing(14,ARCADE.cabinets[0],0),other=playing(4,ARCADE.cabinets[1],100);
  life.people=[p,other];life.arrival=100;life.update(.01,null,ARCADE.cabinets[2]); // chooses exit at random=0
  p.state='desk';p.wait=0;life.update(.01,null,ARCADE.cabinets[2]);
  assert.equal(p.state,'to-cabinet');assert.notEqual(p.machine,other.machine);assert.notEqual(p.machine,ARCADE.cabinets[2]);
  assert.equal(life.occupied(p.machine),true);
  const player={x:11,z:5};moveInArcade(player,0,2,[{x:11,z:6}]);assert.ok(player.z<=5.4);
});
test('player can block arrivals, movement and desk access without losing the visitor',()=>{
  const life=new ArcadeLife(()=>0);life.update(6,{x:ARCADE.door.x,z:.5});assert.equal(life.people.length,0);
  life.update(.01);const p=life.people[0],before={x:p.x,z:p.z};
  life.update(.1,{x:p.x,z:p.z});assert.deepEqual({x:p.x,z:p.z},before);
  p.x=ARCADE.attendant.x;p.z=ARCADE.desk.z-1.9;p.route=[{x:p.x,z:ARCADE.desk.z-.85}];
  life.update(1,null,null,true);assert.equal(p.state,'to-desk');assert.equal(life.deskBusy,false);
  stepUntil(life,()=>life.deskBusy);assert.equal(p.wait,5);
});

test('random choice can select every cabinet, regardless of character type',()=>{
  for(const type of ARCADE_VISITOR_TYPES)for(let i=0;i<ARCADE.cabinets.length;i++){
    const life=new ArcadeLife(()=>(i+.5)/ARCADE.cabinets.length);
    const p={type,state:'desk',machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
    life.people=[p];assert.equal(life.play(p,null),true);
    assert.deepEqual({x:p.machine.x,z:p.machine.z},{x:ARCADE.cabinets[i].x,z:ARCADE.cabinets[i].z});
  }
});
test('occupancy works across versioned cabinet imports for the player and visitors',async()=>{
  const {ARCADE:otherArcade}=await import('../neon-city/arcade-interior.js?v=occupancy-test');
  const life=new ArcadeLife(()=>0),p=playing(14,otherArcade.cabinets[0],100);
  life.people=[p];
  assert.equal(life.occupied(ARCADE.cabinets[0]),true,'player sees visitor reservations across module copies');
  const visitor={type:4,state:'desk',machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
  life.people.push(visitor);
  assert.equal(life.play(visitor,otherArcade.cabinets[1]),true);
  assert.deepEqual({x:visitor.machine.x,z:visitor.machine.z},{x:ARCADE.cabinets[2].x,z:ARCADE.cabinets[2].z});
  assert.equal(life.occupied({...visitor.machine}),true,'walking visitors reserve the destination');
});
test('visitors reselect if their destination becomes occupied before arrival',()=>{
  for(const occupiedBy of ['player','visitor']){
    const life=new ArcadeLife(()=>.6);life.arrival=100;
    const p={type:14,state:'desk',wait:0,machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
    life.people=[p];life.play(p,null);const target=p.machine;
    if(occupiedBy==='visitor')life.people.push(playing(4,{...target},100));
    const playerMachine=occupiedBy==='player'?{...target}:null;
    life.update(.01,null,playerMachine);
    assert.notDeepEqual(p.machine,target);
    for(let i=0;i<2000&&p.state!=='playing';i++)life.update(.05,null,playerMachine);
    assert.equal(p.state,'playing');assert.notDeepEqual(p.machine,target);
  }
});
test('when every other cabinet is reserved, visitors wait without taking an occupied game',()=>{
  const life=new ArcadeLife(()=>0);life.arrival=100;
  const p={type:14,state:'desk',wait:0,machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
  life.people=[p,...ARCADE.cabinets.slice(1).map((machine,i)=>playing(i,{...machine},100))];
  life.update(.1,null,{...ARCADE.cabinets[0]});assert.equal(p.state,'desk');assert.equal(p.machine,null);
  life.people.pop();life.update(.1,null,{...ARCADE.cabinets[0]});assert.equal(p.state,'to-cabinet');
  assert.deepEqual(p.machine,ARCADE.cabinets.at(-1));
});

test('visitors share a random rotation through free cabinets before repeating',()=>{
  for(const value of [0,.35,.7,.999]){
    const life=new ArcadeLife(()=>value),chosen=[];
    for(let i=0;i<ARCADE.cabinets.length*2;i++){
      // Alternate visitors, returning to the desk between choices.
      const p={type:ARCADE_VISITOR_TYPES[i%4],state:'desk',machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
      life.people=[p];assert.equal(life.play(p,null),true);chosen.push(p.machine);
    }
    for(const start of [0,ARCADE.cabinets.length])assert.equal(new Set(chosen.slice(start,start+ARCADE.cabinets.length)).size,ARCADE.cabinets.length);
  }
});
test('a cabinet skipped while occupied stays in the rotation when released',()=>{
  const life=new ArcadeLife(()=>0),blocked=ARCADE.cabinets[0];
  const choose=playerMachine=>{
    const p={type:14,state:'desk',machine:null,x:ARCADE.attendant.x,z:ARCADE.desk.z-.85,walkTime:0};
    life.people=[p];assert.ok(life.play(p,playerMachine));return p.machine;
  };
  for(let i=1;i<ARCADE.cabinets.length;i++)assert.notDeepEqual(choose({...blocked}),blocked);
  assert.deepEqual(choose(null),blocked);
});
