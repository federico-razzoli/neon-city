import test from 'node:test';
import assert from 'node:assert/strict';
import {Frog} from '../neon-city/frog.js';
import {FROG_CABINET,PING_CABINET,ARCADE,facingArcadeGame,tryArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';

test('Frog is adjacent to Ping and consumes exactly one token',()=>{
  assert.equal(FROG_CABINET,ARCADE.cabinets[6]);
  assert.equal(FROG_CABINET.z,PING_CABINET.z);assert.ok(FROG_CABINET.x>PING_CABINET.x);
  assert.equal(facingArcadeGame({x:FROG_CABINET.x+.75,z:FROG_CABINET.z-.8,angle:0}),FROG_CABINET);
  const inventory=new Inventory();
  assert.equal(tryArcadeGame(FROG_CABINET,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
  inventory.take(arcadeTokens(2));
  assert.equal(tryArcadeGame(FROG_CABINET,inventory),'GROG');assert.equal(inventory.current.count,1);
  assert.equal(tryArcadeGame(ARCADE.cabinets[0],inventory),'THIS GAME IS NOT AVAILABLE YET.');
  assert.equal(inventory.current.count,1);
});
test('Frog only hops forward; sideways and backward controls do nothing',()=>{
  const frog=new Frog();frog.cooldown=0;
  for(const [vertical,horizontal] of [[0,1],[0,-1],[1,0]])frog.update(.016,vertical,horizontal);
  assert.equal(frog.x,300);assert.equal(frog.row,11);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[1,-1],[0,-2]])frog.hop(dx,dy);
  assert.equal(frog.x,300);assert.equal(frog.row,11);
  frog.hop(0,-1);assert.equal(frog.row,10);assert.equal(frog.score,10);
  frog.hop(0,-1);assert.equal(frog.row,10,'keyboard hop cooldown still applies');
});
test('each tap advances once without creating held input; taps can restart a crossing',()=>{
  const frog=new Frog();frog.lanes=[];
  frog.tap();assert.equal(frog.row,10);assert.equal(frog.x,300);
  frog.update(.2);assert.equal(frog.row,10,'holding the pointer does not repeat');
  frog.tap();assert.equal(frog.row,9);
  frog.tap();assert.equal(frog.row,8);
  frog.row=1;frog.tap();assert.equal(frog.crossed,true);
  frog.tap();assert.equal(frog.crossed,false);assert.equal(frog.row,11);
  frog.delay=.5;frog.tap();assert.equal(frog.row,11,'respawn delay still applies');
  frog.delay=0;frog.over=true;frog.tap();assert.equal(frog.row,11);
});
test('cars, water, drifting offscreen and expired time each cost one life',()=>{
  for(const cause of ['car','water','edge','time']){
    const frog=new Frog();frog.cooldown=1;
    if(cause==='car'){frog.row=10;frog.x=140;frog.lanes.find(l=>l.row===10).offset=120;}
    if(cause==='water'){frog.row=4;frog.x=40;frog.lanes.find(l=>l.row===4).offset=90;}
    if(cause==='edge'){frog.row=4;frog.x=9;frog.lanes.find(l=>l.row===4).offset=-40;}
    if(cause==='time')frog.time=.001;
    frog.update(.016);
    assert.equal(frog.lives,2,cause);assert.equal(frog.row,11,cause);
    frog.update(.1);assert.equal(frog.lives,2,'respawn delay avoids repeated deaths');
  }
});
test('short wooden platforms carry the frog and leave wider water gaps',()=>{
  const frog=new Frog();
  for(const lane of frog.lanes.filter(l=>l.water)){
    assert.ok(lane.length<=88);
    assert.ok(lane.spacing-lane.length>=100);
  }
  frog.row=4;frog.x=150;frog.cooldown=1;
  frog.update(.016);assert.equal(frog.lives,3);assert.ok(frog.x<150);
});
test('crossing shows congratulations, freezes gameplay and restarts after five seconds',()=>{
  const frog=new Frog();frog.cooldown=0;frog.row=1;frog.x=20;
  frog.hop(0,-1);
  assert.equal(frog.crossed,true);assert.equal(frog.row,0);assert.equal(frog.restartIn,5);
  const score=frog.score,offset=frog.lanes[0].offset,time=frog.time;
  const text=[],rects=[],ctx={fillRect(...rect){rects.push(rect);},fillText(t){text.push(t);}};
  frog.draw(ctx);assert.ok(text.includes('CONGRATS, YOU CROSSED THE ROAD!'));
  assert.deepEqual(rects,[[0,0,640,360]],'dedicated screen replaces the playfield');
  frog.update(4.9,-1);frog.hop(0,-1);frog.die();
  assert.equal(frog.crossed,true);assert.equal(frog.lives,3);assert.equal(frog.score,score);
  assert.equal(frog.lanes[0].offset,offset);assert.equal(frog.time,time);
  frog.update(.1);
  assert.equal(frog.crossed,false);assert.equal(frog.row,11);assert.equal(frog.x,300);
  assert.equal(frog.time,40);assert.equal(frog.level,2);assert.equal(frog.score,score);
});
test('a button can start the next crossing early without charging tokens or losing lives',()=>{
  const frog=new Frog();
  for(const [i,x] of [20,300,620,300].entries()){
    frog.cooldown=0;frog.row=1;frog.x=x;frog.hop(0,-1);
    assert.equal(frog.crossed,true);const score=frog.score;
    frog.continueCrossing();
    assert.equal(frog.crossed,false);assert.equal(frog.row,11);assert.equal(frog.x,300);
    assert.equal(frog.time,40);assert.equal(frog.lives,3);assert.equal(frog.level,i+2);
    assert.equal(frog.score,score);
  }
});
test('three deaths show GAME OVER under the Grog title',()=>{
  const frog=new Frog();
  for(let i=0;i<3;i++){frog.delay=0;frog.die();}
  assert.equal(frog.lives,0);assert.equal(frog.over,true);
  const score=frog.score;frog.update(1,-1);assert.equal(frog.score,score);
  const text=[],rects=[],ctx={fillRect(...rect){rects.push(rect);},fillText(t){text.push(t);}};frog.draw(ctx);
  assert.deepEqual(rects,[[0,0,640,360]],'GAME OVER replaces the entire playfield');
  assert.ok(text.includes('GAME OVER'));assert.ok(text.includes('GROG'));
});
