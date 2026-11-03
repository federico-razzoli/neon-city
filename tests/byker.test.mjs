import test from 'node:test';
import assert from 'node:assert/strict';
import {Byker} from '../neon-city/byker.js';
import {BYKER_CABINET,tryArcadeGame,facingArcadeGame,drawArcadeInterior} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';
const rideGame=seed=>{const game=new Byker(random(seed));game.skipIntro();return game;};
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('BYKER is reachable and uses one arcade token',()=>{
 const i=new Inventory();assert.match(tryArcadeGame(BYKER_CABINET,i),/TOKENS/);i.take(arcadeTokens(2));assert.equal(tryArcadeGame(BYKER_CABINET,i,false),'BYKER');assert.equal(i.current.count,2);assert.equal(tryArcadeGame(BYKER_CABINET,i),'BYKER');assert.equal(i.current.count,1);assert.equal(facingArcadeGame({x:BYKER_CABINET.x+.75,z:BYKER_CABINET.z-.8,angle:0}),BYKER_CABINET);
});
test('BYKER cabinet marquee renders the B glyph',()=>{
 const pixels=[];
 drawArcadeInterior({quad(){},box(){},face(points,colour){
  if(colour==='#14263c'&&Math.abs(points[0].z-15.3)<.001&&points[0].x>=.899&&points[0].x<1.004&&points[0].y>=2.399&&points[0].y<2.576)pixels.push(points[0]);
 }});
 assert.equal(pixels.length,10);
});

test('throttle, engine braking, stopping and steering respond progressively',()=>{
 const g=rideGame(1);g.obstacles=[];g.nextTraffic=1e9;
 const start=g.speed;g.update(.1,-1,1);assert.ok(g.speed>start);assert.ok(g.lean>0);assert.ok(g.x>0);
 const fast=g.speed;g.update(.1,0);assert.ok(g.speed<fast);
 for(let i=0;i<100;i++){g.x=0;g.update(.1,1);}
 assert.equal(g.speed,0);const z=g.distance;g.update(.1,1);assert.equal(g.distance,z);
});
test('swept traffic collision costs one life and recovery prevents repeated hits',()=>{
 const g=rideGame(4);g.x=0;g.speed=85;g.obstacles=[{z:7,x:0,velocity:-30,passed:false}];
 g.update(.1,-1);assert.equal(g.lives,2);assert.ok(g.speed<35);assert.ok(g.invulnerable>0);
 g.hit('TRAFFIC');assert.equal(g.lives,2);
 g.invulnerable=0;g.hit('TRAFFIC');g.invulnerable=0;g.hit('TRAFFIC');assert.equal(g.over,true);
});
test('close calls reward speed and proximity with points, time and chained multipliers',()=>{
 const g=rideGame(2);g.speed=60;g.x=0;g.nextTraffic=1e9;
 for(let i=1;i<=3;i++){
  g.obstacles=[{z:g.distance+1,x:1.8,velocity:-25,passed:false}];g.x=0;
  const time=g.time,score=g.score;g.update(.03,-1);
  assert.equal(g.combo,i);assert.ok(g.score>=score+100*i);assert.ok(g.time>time+1);
 }
 assert.equal(g.bestCombo,3);assert.equal(g.nearMisses,3);
 const score=g.score;g.obstacles[0].z=g.distance-20;g.update(.05);assert.ok(g.score<score+1);
});
test('distant passes and slow passes do not earn near-miss bonuses',()=>{
 for(const [speed,x] of [[20,1.8],[60,3.5]]){
  const g=rideGame(1);g.speed=speed;g.x=0;g.obstacles=[{z:.1,x,velocity:-25}];g.update(.03);
  assert.equal(g.nearMisses,0);
 }
});
test('guardrails contain the rider and checkpoint repairs extend the run',()=>{
 const g=rideGame(9);g.x=4;g.update(.01);assert.equal(g.lives,2);assert.ok(g.x<3.8);
 g.distance=g.length-.1;g.x=0;g.speed=60;const time=g.time;g.update(.02);
 assert.equal(g.level,2);assert.equal(g.length,5200);assert.equal(g.lives,3);assert.ok(g.time>time+34);assert.ok(g.score>=1000);
});
test('timeout ends the ride and simulation freezes',()=>{
 const g=rideGame(1);g.time=.01;g.update(.02);assert.equal(g.over,true);assert.equal(g.reason,'OUT OF TIME');
 const z=g.distance;g.update(.1,-1,1);assert.equal(g.distance,z);
});
test('generated traffic is bounded and both directions follow their lanes',()=>{
 const g=rideGame(17);
 assert.ok(g.obstacles.some(o=>o.velocity<0));assert.ok(g.obstacles.some(o=>o.velocity>0));
 for(const o of g.obstacles)assert.equal(Math.sign(o.x),Math.sign(o.velocity));
 for(let i=0;i<100;i++){g.distance=i*100;g.populate();assert.ok(g.obstacles.length<35);assert.ok(g.obstacles.every(o=>o.z>g.distance-90));}
});
test('the mountain pass is achievable without mandatory close-call bonuses',()=>{
 for(let seed=1;seed<=20;seed++){
  const g=rideGame(seed);
  // Verify the base time budget without traffic bonuses or collisions.
  g.obstacles=[];g.nextTraffic=1e9;
  while(g.level===1&&!g.over){
   const steer=Math.max(-1,Math.min(1,(g.curve(g.distance)*g.speed**2*.65-g.x*6)/(1.8+g.speed*.045)));
   g.update(.02,-1,steer);
  }
  assert.equal(g.level,2,`seed ${seed}: ${g.reason}`);assert.equal(g.lives,3);assert.ok(g.time>35);
 }
});

test('the opening shows mounting then accelerates toward the horizon without consuming gameplay',()=>{
 const g=new Byker(random(1)),initial=g.introPose();assert.equal(g.intro,true);assert.equal(initial.frame,0);
 for(let i=0;i<8;i++)g.update(.1,-1,1);assert.equal(g.introPose().frame,1);
 for(let i=0;i<6;i++)g.update(.1);assert.equal(g.introPose().frame,2);
 for(let i=0;i<10;i++)g.update(.1);const mounted=g.introPose();assert.equal(mounted.frame,3);
 for(let i=0;i<20;i++)g.update(.1);const departing=g.introPose();assert.ok(departing.scale<mounted.scale*.2);assert.ok(departing.y<mounted.y);
 assert.equal(g.time,55);assert.equal(g.distance,0);assert.equal(g.lives,3);assert.equal(g.score,0);assert.equal(g.x,0);
 for(let i=0;i<20;i++)g.update(.1);assert.equal(g.intro,false);
 g.update(.1,-1);assert.ok(g.distance>0);assert.ok(g.time<55);
});
test('intro can be skipped immediately and repeatedly without changing ride state',()=>{
 const g=new Byker(random(3));g.skipIntro();g.skipIntro();assert.equal(g.intro,false);
 assert.equal(g.time,55);assert.equal(g.distance,0);assert.equal(g.speed,26);
 g.update(.1,-1);assert.ok(g.distance>0);
});
