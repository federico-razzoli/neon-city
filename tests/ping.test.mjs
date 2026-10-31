import test from 'node:test';
import assert from 'node:assert/strict';
import {Ping} from '../neon-city/ping.js';
import {ARCADE,PING_CABINET,facingArcadeGame,tryArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens,PINE_CONE} from '../neon-city/inventory.js';

test('the nearest row leftmost cabinet is Ping; games require tokens, only Ping charges',()=>{
  assert.equal(PING_CABINET.z,Math.min(...ARCADE.cabinets.map(b=>b.z)));
  assert.equal(PING_CABINET.x,Math.min(...ARCADE.cabinets.filter(b=>b.z===PING_CABINET.z).map(b=>b.x)));
  const inventory=new Inventory();
  for(const machine of [...ARCADE.cabinets,...ARCADE.pinballs,ARCADE.bridgeConsole]){
    assert.equal(tryArcadeGame(machine,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
  }
  inventory.take(PINE_CONE);inventory.take(arcadeTokens(2));inventory.selected=1;
  assert.equal(tryArcadeGame(ARCADE.cabinets[0],inventory),'THIS GAME IS NOT AVAILABLE YET.');
  assert.equal(inventory.current.count,2);
  assert.equal(tryArcadeGame(PING_CABINET,inventory),'PING');assert.equal(inventory.current.count,1);
  assert.equal(tryArcadeGame(PING_CABINET,inventory),'PING');assert.equal(inventory.current,PINE_CONE);
  assert.equal(tryArcadeGame(PING_CABINET,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
  const player={x:PING_CABINET.x+.75,z:PING_CABINET.z-.8,angle:0};
  assert.equal(facingArcadeGame(player),PING_CABINET);
  assert.equal(facingArcadeGame({...player,angle:Math.PI}),null);
});
test('Ping paddle movement, rebounds, scoring and three misses end the game',()=>{
  const ping=new Ping(()=>.5);
  assert.equal(ping.lives,3);assert.equal(ping.score,0);
  ping.update(.1,-1);assert.ok(ping.playerY<180);
  ping.delay=0;Object.assign(ping,{x:37,y:ping.playerY,vx:-220,vy:0});
  ping.update(.02);assert.ok(ping.vx>0);assert.equal(ping.score,10);
  Object.assign(ping,{x:320,y:35,vx:220,vy:-100});ping.update(.02);assert.ok(ping.vy>0);
  Object.assign(ping,{x:639,y:90,vx:220,vy:0});ping.update(.02);assert.equal(ping.score,110);
  for(let lives=2;lives>=0;lives--){
    Object.assign(ping,{delay:0,x:1,y:90,vx:-220,vy:0});ping.update(.02);assert.equal(ping.lives,lives);
  }
  assert.equal(ping.over,true);const score=ping.score;ping.update(1);assert.equal(ping.score,score);
  const text=[],rects=[],ctx={fillRect(...rect){rects.push(rect);},fillText(t){text.push(t);}};ping.draw(ctx);
  assert.deepEqual(rects,[[0,0,640,360]],'GAME OVER replaces the entire playfield');
  assert.ok(text.includes('GAME OVER'));assert.ok(text.includes('SCORE 110'));
});
