import test from 'node:test';
import assert from 'node:assert/strict';
import {Super} from '../neon-city/super.js';
import {SUPER_CABINET,tryArcadeGame,facingArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';

test('SUPER can be inspected without tokens and never spends an existing token',()=>{
  const inventory=new Inventory();
  for(const consume of [false,true])assert.equal(tryArcadeGame(SUPER_CABINET,inventory,consume),'SUPER');
  assert.equal(inventory.items.length,0);
  inventory.take(arcadeTokens(3));const before=JSON.stringify(inventory);
  for(const consume of [false,true])assert.equal(tryArcadeGame(SUPER_CABINET,inventory,consume),'SUPER');
  assert.equal(JSON.stringify(inventory),before);
  assert.equal(facingArcadeGame({x:SUPER_CABINET.x+.75,z:SUPER_CABINET.z-.8,angle:0}),SUPER_CABINET);
});
test('SUPER displays its blue crash screen and can immediately be closed',()=>{
  const game=new Super(),text=[],rects=[];
  const ctx={fillRect(...args){rects.push([this.fillStyle,...args]);},fillText(t){text.push(t);}};
  game.update(10,-1,1,true);game.draw(ctx);
  assert.equal(game.over,true);assert.deepEqual(rects[0],['#0000aa',0,0,640,360]);
  assert.ok(text.includes('SUPER'));assert.ok(text.some(t=>t.includes('fatal exception')));
  assert.ok(text.includes('SPACE / ESC TO RETURN TO THE ARCADE'));
});
