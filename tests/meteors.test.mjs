import test from 'node:test';
import assert from 'node:assert/strict';
import {Meteors} from '../neon-city/meteors.js';
import {METEORS_CABINET,tryArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';

test('Meteors cabinet requires and consumes one token',()=>{
  const inventory=new Inventory();
  assert.equal(tryArcadeGame(METEORS_CABINET,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
  inventory.take(arcadeTokens(2));
  assert.equal(tryArcadeGame(METEORS_CABINET,inventory,false),'METEORS');assert.equal(inventory.current.count,2);
  assert.equal(tryArcadeGame(METEORS_CABINET,inventory),'METEORS');assert.equal(inventory.current.count,1);
});
test('ship turns, thrusts, fires and wraps around',()=>{
  const game=new Meteors(()=>.5);game.rocks=[game.rock(50,50,3)];
  game.update(.1,-1,1,true);
  assert.ok(game.ship.angle>-Math.PI/2);assert.ok(game.ship.vy<0);assert.equal(game.bullets.length,1);
  Object.assign(game.ship,{x:639,vx:200});game.update(.02);assert.ok(game.ship.x<10);
});
test('shots split large rocks, destroy small rocks and advance waves',()=>{
  const game=new Meteors(()=>.5);
  const hit=size=>{game.rocks=[game.rock(100,100,size)];game.bullets=[{x:100,y:100,vx:0,vy:0,life:1}];game.update(.001);};
  hit(3);assert.equal(game.score,20);assert.deepEqual(game.rocks.map(r=>r.size),[2,2]);
  hit(2);assert.equal(game.score,70);assert.deepEqual(game.rocks.map(r=>r.size),[1,1]);
  hit(1);assert.equal(game.score,170);assert.equal(game.level,2);assert.equal(game.rocks.length,5);
});
test('three collisions end play; respawn protection prevents repeated losses',()=>{
  const game=new Meteors(()=>.5);assert.equal(game.lives,3);
  for(let lives=2;lives>=0;lives--){
    game.invulnerable=0;game.rocks=[game.rock(game.ship.x,game.ship.y,3)];game.update(.001);assert.equal(game.lives,lives);
    assert.ok(game.explosion);
    for(let i=0;i<9;i++)game.update(.1);
    if(lives){assert.equal(game.lives,lives);assert.ok(game.invulnerable>0);}
  }
  assert.equal(game.over,true);const ship={...game.ship};game.update(.1,-1,1,true);assert.deepEqual(game.ship,ship);
  const text=[],ctx={fillRect(){},fillText(t){text.push(t);}};game.draw(ctx);assert.ok(text.includes('GAME OVER'));assert.ok(text.includes('LIVES 0'));
});

test('returning shots and meteors use one explosion event and sound, including the final life',()=>{
  for(const cause of ['shot','meteor']){
    const game=new Meteors(()=>.5);let sounds=0;game.playExplosion=()=>sounds++;
    game.invulnerable=0;game.lives=1;
    game.rocks=[game.rock(cause==='meteor'?320:50,cause==='meteor'?151:50,3)];
    game.bullets=[{x:320,y:151,vx:0,vy:0,life:1,armed:true}];
    if(cause==='meteor')game.bullets=[];
    game.update(.001);assert.equal(game.lives,0);assert.equal(sounds,1);assert.equal(game.over,false);
    assert.equal(game.explosion.particles.length,24);assert.equal(game.bullets.length,0);
    const calls=[],ctx=new Proxy({},{get:(_,key)=>key==='fillText'?t=>calls.push(t):()=>{},set:()=>true});
    game.draw(ctx);assert.ok(!calls.includes('GAME OVER'),'final explosion remains visible');
    for(let i=0;i<9;i++)game.update(.1);
    assert.equal(game.over,true);assert.equal(sounds,1);
  }
});
test('new shots clear the muzzle safely and returning shots respect respawn protection',()=>{
  const game=new Meteors(()=>.5);game.invulnerable=0;game.rocks=[game.rock(50,50,3)];
  game.update(.001,0,0,true);assert.equal(game.lives,3);assert.equal(game.bullets[0].armed,false);
  game.update(.05);assert.equal(game.bullets[0].armed,true);
  game.invulnerable=1;game.bullets=[{x:game.ship.x,y:game.ship.y,vx:0,vy:0,life:1,armed:true}];
  game.update(.001);assert.equal(game.lives,3);assert.equal(game.explosion,null);
});
test('explosion synthesizes a fading noise effect and releases audio nodes',()=>{
  const game=new Meteors(()=>.5),events=[];
  const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
  const node=()=>({connect(){},disconnect(){events.push('disconnect');}});
  const source={...node(),start(){events.push('start');}};
  game.audioContext={state:'running',sampleRate:1000,currentTime:0,destination:{},
    createBuffer:()=>({getChannelData:()=>new Float32Array(550)}),createBufferSource:()=>source,
    createBiquadFilter:()=>({...node(),frequency:param}),createGain:()=>({...node(),gain:param})};
  game.playExplosion();assert.deepEqual(events,['start']);source.onended();assert.equal(events.length,4);
});
