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
