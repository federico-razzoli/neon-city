import test from 'node:test';
import assert from 'node:assert/strict';
import {KongyKong,girderY,KONG_LADDERS} from '../neon-city/kongy-kong.js';
import {ARCADE,KONG_CABINET,FROG_CABINET,tryArcadeGame,facingArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';

test('Kongy Kong is next to Grog, costs one token, and other machines stay unavailable',()=>{
  assert.equal(KONG_CABINET,ARCADE.cabinets[7]);assert.equal(KONG_CABINET.z,FROG_CABINET.z);
  assert.ok(KONG_CABINET.x>FROG_CABINET.x);
  assert.equal(facingArcadeGame({x:KONG_CABINET.x+.75,z:KONG_CABINET.z-.8,angle:0}),KONG_CABINET);
  const inventory=new Inventory();assert.equal(tryArcadeGame(KONG_CABINET,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
  inventory.take(arcadeTokens(2));assert.equal(tryArcadeGame(KONG_CABINET,inventory),'KONGY KONG');assert.equal(inventory.current.count,1);
  assert.equal(tryArcadeGame(ARCADE.cabinets[8],inventory),'THIS GAME IS NOT AVAILABLE YET.');assert.equal(inventory.current.count,1);
});
function quietGame(){const game=new KongyKong();game.spawnIn=1000;return game;}
test('walking follows slopes, jumping lands, and ladders work in both directions',()=>{
  const game=quietGame(),p=game.player;
  game.update(.1,0,1);assert.ok(p.x>58);assert.equal(p.y,girderY(0,p.x));
  game.update(.1,0,0,true);assert.ok(p.air);assert.ok(p.y<girderY(0,p.x));
  for(let i=0;i<10;i++)game.update(.1);
  assert.equal(p.air,false);assert.equal(p.y,girderY(0,p.x));
  p.x=540;p.y=girderY(0,540);game.update(.02,-1);assert.ok(p.climb);
  for(let i=0;i<20;i++)game.update(.05);
  assert.equal(p.floor,1);assert.equal(p.climb,null);
  game.update(.02,1);for(let i=0;i<20;i++)game.update(.05);
  assert.equal(p.floor,0);
});
test('barrels spawn from the monkey and drop onto the next girder',()=>{
  const game=new KongyKong();for(let i=0;i<20;i++)game.update(.1);
  assert.ok(game.barrels.length);assert.equal(game.barrels[0].floor,5);
  const b=game.barrels[0];b.x=607;game.update(.05);assert.equal(b.floor,4);assert.equal(b.falling,true);
  for(let i=0;i<10;i++)game.update(.1);
  assert.equal(b.falling,false);assert.ok(b.x<608);
});
test('hammer pickup smashes barrels, expires, and prevents jumping and climbing',()=>{
  const game=quietGame(),p=game.player;p.floor=1;p.x=185;p.y=girderY(1,p.x);
  game.update(.01);assert.ok(game.hammer>0);assert.equal(game.hammers[0].taken,true);
  game.hammer=7.6;game.barrels.push({x:210,y:p.y,floor:1,falling:false});game.update(.01);
  assert.equal(game.barrels.length,0);assert.equal(game.score,300);assert.equal(game.lives,3);
  p.x=100;p.y=girderY(1,p.x);game.update(.05,-1,0,true);assert.equal(p.climb,null);assert.equal(p.air,false);
  for(let i=0;i<85;i++)game.update(.1);
  assert.equal(game.hammer,0);
});
test('jumping over a barrel scores once, collisions and timeout cost lives',()=>{
  const game=quietGame(),p=game.player;p.x=200;p.air=true;p.y=girderY(0,p.x)-20;p.vy=0;
  game.barrels.push({x:200,y:girderY(0,200),floor:0,falling:false});game.update(.01);
  assert.equal(game.score,100);game.update(.01);assert.equal(game.score,100);
  p.air=false;p.y=girderY(0,p.x);game.update(.01);assert.equal(game.lives,2);
  game.delay=0;game.time=.001;game.update(.01);assert.equal(game.lives,1);
  game.delay=0;game.time=.001;game.update(.01);assert.equal(game.over,true);
});
test('all six ladder crossings reach the girl and end level one',()=>{
  const game=quietGame(),p=game.player;
  for(let floor=0;floor<6;floor++){
    const ladder=KONG_LADDERS.find(l=>l.floor===floor);
    p.x=ladder.x;p.y=girderY(floor,p.x);p.floor=floor;
    game.update(.02,-1);for(let i=0;i<30&&!game.won;i++)game.update(.05);
    assert.equal(p.floor,floor+1);
  }
  assert.equal(game.won,true);assert.equal(game.lives,3);assert.ok(game.score>=1000);
  const score=game.score;game.update(10,1,1,true);assert.equal(game.score,score);
});
test('victory and GAME OVER use dedicated opaque screens',()=>{
  for(const victory of [false,true]){
    const game=quietGame();game.won=victory;game.over=!victory;
    const rects=[],text=[],ctx={fillRect(...r){rects.push([this.fillStyle,...r]);},fillText(t){text.push(t);}};
    game.draw(ctx);assert.deepEqual(rects[0],['#000000',0,0,640,360]);
    assert.ok(rects.every(r=>/^#[0-9a-f]{6}$/i.test(r[0])),'all screens are opaque');
    if(!victory)assert.equal(rects.length,1);
    assert.ok(text.includes(victory?'LEVEL 1 COMPLETE!':'GAME OVER'));
    assert.ok(!text.includes('YOU SAVED THE GIRL!'));
    if(victory)assert.ok(text.includes('LEVEL 1 RESTARTING...'));
  }
});

test('victory shows the monkey collecting the girl, escaping, then restarts level one',()=>{
  const game=quietGame();game.player.floor=6;game.player.x=520;game.player.y=62;game.step(.01,0,0,false);
  const score=game.score,lives=game.lives;
  game.barrels.push({x:200,y:200,floor:3});game.hammers[0].taken=true;
  assert.equal(game.won,true);assert.equal(game.escapePose().carrying,false);
  const first=game.escapePose();game.update(2.2);
  const carrying=game.escapePose();assert.equal(carrying.carrying,true);
  assert.ok(carrying.monkeyX>first.monkeyX);assert.ok(carrying.girlY<first.girlY);
  game.update(2.6);const escaped=game.escapePose();assert.ok(escaped.monkeyX>640);assert.ok(escaped.girlX>640);
  game.update(.2);assert.equal(game.won,false);assert.equal(game.player.floor,0);
  assert.equal(game.time,90);assert.equal(game.barrels.length,0);assert.equal(game.hammer,0);
  assert.ok(game.hammers.every(h=>!h.taken));assert.equal(game.score,score);assert.equal(game.lives,lives);
});
test('the girl is small, blonde and barefoot, and the monkey uses brown colours',()=>{
  const game=quietGame(),rects=[],ctx={fillRect(...r){rects.push([this.fillStyle,...r]);},fillText(){}};
  game.draw(ctx);
  const girl=rects.filter(([,x,y,w,h])=>x>=540&&x<550&&y>=48&&y<62&&w===1&&h===1);
  assert.ok(girl.length>0);assert.ok(girl.some(([color])=>color==='#ffe050'));
  const feet=girl.filter(([,x,y])=>y===61);assert.ok(feet.length>0);
  assert.ok(feet.every(([color])=>color==='#ffbd80'));
  const monkey=rects.filter(([,x,y,w,h])=>x>=60&&x<100&&y>=70&&y<104&&w===2&&h===2);
  assert.ok(monkey.length>0);assert.ok(monkey.every(([color])=>['#9c4a18','#502000','#d88b45'].includes(color)));
});

test('hammer alternates between overhead and forward strike and mirrors with facing',()=>{
  const game=quietGame(),p=game.player;game.hammer=8;
  const raised=game.hammerPose();assert.equal(raised.state,'raised');assert.ok(raised.y+raised.h<p.y-14);
  game.update(.25);assert.equal(game.hammerPose().state,'raised');
  game.update(.1);const down=game.hammerPose();assert.equal(down.state,'down');assert.ok(down.x>p.x);
  p.facing=-1;assert.ok(game.hammerPose().x+game.hammerPose().w<p.x);
  game.update(.25);game.update(.01);assert.equal(game.hammerPose().state,'raised');
});
test('barrels kill from behind during a strike, and from either side while raised',()=>{
  for(const facing of [-1,1])for(const [phase,side] of [['raised',1],['raised',-1],['down',-1]]){
    const game=quietGame(),p=game.player;p.x=300;p.facing=facing;p.y=girderY(0,p.x);
    game.hammer=phase==='raised'?7.9:7.6;
    game.barrels.push({x:p.x+5*side*facing,y:p.y,floor:0,falling:false});
    game.update(.008);assert.equal(game.lives,2,`${phase}, facing ${facing}, side ${side}`);
    assert.equal(game.score,0);
  }
});
test('only the forward hammer head destroys barrels during a down strike',()=>{
  for(const facing of [-1,1]){
    const game=quietGame(),p=game.player;p.x=300;p.y=girderY(0,p.x);p.facing=facing;game.hammer=7.6;
    const front={x:p.x+22*facing,y:p.y,floor:0,falling:false};
    assert.equal(game.hammerHits(front),true);
    assert.equal(game.hammerHits({...front,x:p.x-22*facing}),false);
    assert.equal(game.hammerHits({...front,y:p.y-42}),false);
    game.hammer=7.9;assert.equal(game.hammerHits(front),false);
    game.hammer=7.6;game.barrels.push(front);game.update(.008);
    assert.equal(game.lives,3);assert.equal(game.score,300);assert.equal(game.barrels.length,0);
  }
});
