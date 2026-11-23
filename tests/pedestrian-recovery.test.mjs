// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import {City,pedestrian,RIVER_ROWS} from '../neon-city/world.js';

const dt=.05,player={x:-1000,z:-1000},traffic={canCross:()=>true};
const walker=(phase,reverse=false)=>({phase,reverse,speed:1,type:0,walkTime:0,variant:0});
function block(city,x,z){
  const chunk=city.generate(x,z);
  chunk.people=[];city.chunks.set(`${x},${z}`,chunk);
  return chunk;
}
function run(city,seconds,observe=()=>{}){
  for(let i=1;i<=Math.round(seconds/dt);i++){
    city.advancePedestrians(dt,player,i*dt,null,traffic);observe();
  }
}

test('three arrivals at a striped corner and a queued follower clear the junction',()=>{
  const city=new City(2),source=block(city,0,0),target=block(city,1,0);
  city.rng=()=>1;
  const lead=walker(42),tail=walker(42);
  for(const [p,distance] of [[lead,21.5],[tail,20.64]]){
    p.crossing={x:53,z:11,dx:1,dz:0,distance,started:true,target,request:{x:64,z:11}};
    source.people.push(p);
  }
  const westbound=walker(.65,true),northbound=walker(168-.65);
  target.people.push(westbound,northbound);
  let tailRetreated=false;
  run(city,35,()=>{if(tail.crossing?.returning)tailRetreated=true;});
  assert.ok(tailRetreated);
  for(const p of [lead,tail,westbound,northbound]){
    assert.ok(!p.crossing);
    const chunk=source.people.includes(p)?source:target;
    const at=pedestrian(chunk,p,0);
    assert.ok(Math.hypot(at.x-75,at.z-11)>6);
  }
});

test('a buyer can leave the hatch and a blocked promenade queue unwinds from its tail',()=>{
  const city=new City(1),row=RIVER_ROWS[0],chunk=block(city,0,row);
  block(city,1,row);
  const upper=s=>({...walker(0),riverMotion:{mode:'upper',s}});
  const buyer=upper(78),front=upper(0),tail=upper(0);
  chunk.people.push(buyer);
  city.rng=()=>0;
  let purchased=false,tailTurned=false;
  run(city,42,()=>{
    if(!purchased&&buyer.iceCream){
      purchased=true;
      // Put two eastbound walkers behind the buyer's return point and a
      // stopped player ahead. The front walker has no room to back up.
      const origin=buyer.riverMotion.origin;
      front.riverMotion.s=origin.x-15;tail.riverMotion.s=front.riverMotion.s-.86;
      chunk.people.push(front,tail);
      player.x=origin.x+1.26;player.z=origin.z;
    }
    if(tail.reverse){tailTurned=true;player.x=player.z=-1000;}
  });
  assert.ok(purchased);assert.ok(tailTurned);
  assert.equal(buyer.riverMotion.mode,'upper');
  assert.ok(Math.abs(pedestrian(chunk,buyer,0).x-96)>5);
});

test('a blocked buyer retraces the serving route and keeps the purchased cone',()=>{
  const city=new City(1),row=RIVER_ROWS[0],chunk=block(city,0,row);
  block(city,1,row);
  const buyer={...walker(0),riverMotion:{mode:'upper',s:78}};
  chunk.people.push(buyer);city.rng=()=>0;
  let purchased=false,retreated=false,rejoined=false;
  run(city,25,()=>{
    const m=buyer.riverMotion;
    if(!purchased&&buyer.iceCream){
      purchased=true;
      player.x=m.van.x+2.1;player.z=m.van.z-3.25;
    }
    if(m.stage==='retreat')retreated=true;
    if(retreated&&m.mode==='upper'){
      assert.ok(buyer.iceCream);rejoined=true;
    }
  });
  player.x=player.z=-1000;
  assert.ok(purchased&&retreated&&rejoined);
});
