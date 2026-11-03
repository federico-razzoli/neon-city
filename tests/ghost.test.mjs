import test from 'node:test';
import assert from 'node:assert/strict';
import {Ghost,GHOST_MAZE,ghostDifficulty} from '../neon-city/ghost.js';
import {GHOST_CABINET,facingArcadeGame,tryArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';
const id=(x,y)=>y*28+x;
const at=(a,x,y,dir=1)=>Object.assign(a,{x,y,dir,next:null,progress:0});
const playing=()=>{const g=new Ghost();g.phase='playing';return g;};
const tick=(g,time,v=0,h=0)=>{for(let t=0;t<time-1e-8;t+=.02)g.update(Math.min(.02,time-t),v,h);};
const nearestRoute=(g,start,goals)=>{
 const queue=[{...start,path:[]}],seen=new Set([id(start.x,start.y)]);
 for(let i=0;i<queue.length;i++){
  const cell=queue[i];if(goals.has(id(cell.x,cell.y)))return cell.path;
  for(let d=0;d<4;d++){const next=g.neighbour(cell,d);if(next&&!seen.has(id(next.x,next.y))){seen.add(id(next.x,next.y));queue.push({...next,path:[...cell.path,d]});}}
 }
 return null;
};
test('GHOST is a token cabinet with a free preview and facing interaction',()=>{
 const i=new Inventory();assert.match(tryArcadeGame(GHOST_CABINET,i),/TOKENS/);i.take(arcadeTokens(2));
 assert.equal(tryArcadeGame(GHOST_CABINET,i,false),'GHOST');assert.equal(i.current.count,2);assert.equal(tryArcadeGame(GHOST_CABINET,i),'GHOST');assert.equal(i.current.count,1);
 assert.equal(facingArcadeGame({x:GHOST_CABINET.x+.75,z:GHOST_CABINET.z-.8,angle:0}),GHOST_CABINET);
});
test('all souls and four skulls are reachable; the cage is forbidden to the player',()=>{
 const g=playing();assert.equal(GHOST_MAZE.length,31);assert.ok(GHOST_MAZE.every(row=>row.length===28));assert.equal(g.dots.size,240);assert.equal(g.skulls.size,4);
 const queue=[{x:13,y:23}],seen=new Set([id(13,23)]);
 for(let i=0;i<queue.length;i++)for(let d=0;d<4;d++){const next=g.neighbour(queue[i],d);if(next&&!seen.has(id(next.x,next.y))){queue.push(next);seen.add(id(next.x,next.y));}}
 for(const tile of [...g.dots,...g.skulls])assert.ok(seen.has(tile),`unreachable tile ${tile}`);
 assert.equal(g.canWalk(13,12),false);assert.equal(g.canWalk(13,14),false);assert.equal(g.canWalk(13,12,true),true);
});
test('red directly pursues, pink leads four tiles, cyan doubles the red-to-lookahead vector, orange retreats nearby',()=>{
 const g=playing();g.mode='chase';at(g.player,10,20,3);at(g.enemies[0],6,8);
 assert.deepEqual(g.target(g.enemies[0]),{x:10,y:20});assert.deepEqual(g.target(g.enemies[1]),{x:14,y:20});assert.deepEqual(g.target(g.enemies[2]),{x:18,y:32});
 at(g.enemies[3],1,1);assert.deepEqual(g.target(g.enemies[3]),{x:10,y:20});at(g.enemies[3],10,13);assert.deepEqual(g.target(g.enemies[3]),{x:0,y:34});
 at(g.enemies[3],10,12);assert.deepEqual(g.target(g.enemies[3]),{x:10,y:20},'eight tiles is still chase range');
});
test('the original upward targeting overflow is preserved for pink and cyan',()=>{
 const g=playing();g.mode='chase';at(g.player,10,20,0);at(g.enemies[0],6,8);
 assert.deepEqual(g.target(g.enemies[1]),{x:6,y:16});assert.deepEqual(g.target(g.enemies[2]),{x:10,y:28});
});
test('scatter gives each colour its proper corner, with the red end-of-maze acceleration',()=>{
 const g=playing();assert.deepEqual(g.enemies.map(e=>g.target(e)),[{x:27,y:-3},{x:0,y:-3},{x:27,y:34},{x:0,y:34}]);
 g.dots=new Set([1]);g.skulls.clear();assert.deepEqual(g.target(g.enemies[0]),{x:13,y:23});
});
test('chasers use local intersection decisions, cannot reverse freely, and use up/left/down/right tie order',()=>{
 const g=playing(),e=g.enemies[0];g.mode='chase';e.state='active';at(e,6,5,3);at(g.player,6,1,1);assert.equal(g.chooseEnemy(e),0);
 at(g.player,1,5);assert.notEqual(g.chooseEnemy(e),1,'a direct target behind does not permit a U-turn');
 at(e,6,5,0);g.target=()=>({x:5,y:4});assert.equal(g.chooseEnemy(e),0,'up wins equally near choices');
});
test('four pursuers start in the cage and leave one at a time in colour order',()=>{
 const g=playing();assert.ok(g.enemies.every(e=>e.state==='caged'));
 for(let i=0;i<4;i++){
  g.elapsed=g.difficulty.release[i];g.release(.01);assert.equal(g.enemies[i].state,'exiting');g.elapsed=100;g.release(.01);assert.equal(g.enemies.filter(e=>e.state==='exiting').length,1);
  for(let t=0;t<300&&g.enemies[i].state!=='active';t++)g.move(g.enemies[i],.03,()=>g.chooseEnemy(g.enemies[i]));
  assert.equal(g.enemies[i].state,'active');assert.equal(g.enemies[i].y,11);
 }
});
test('turns buffer at tile centres, reversals work between tiles, and the side tunnel wraps',()=>{
 const g=playing();g.elapsed=-1000;at(g.player,1,5,3);g.wanted=0;g.update(.1);assert.equal(g.player.dir,0);
 at(g.player,1,5,3);g.wanted=3;g.update(.1);const p=g.position(g.player);g.keyDown('ArrowLeft');g.update(.01);assert.ok(g.position(g.player).x<p.x);
 at(g.player,0,14,1);g.wanted=1;g.update(1/g.difficulty.playerSpeed);assert.equal(g.player.x,27);assert.equal(g.player.y,14);
 at(g.player,6,8,3);g.wanted=0;g.update(1/g.difficulty.playerSpeed);assert.equal(g.player.x,6);assert.equal(g.player.y,7);
});
test('souls score once; skulls frighten hunters without reversing them, refill duration and reset the capture chain',()=>{
 const g=playing();at(g.player,1,1);g.collect();assert.equal(g.score,10);g.collect();assert.equal(g.score,10);
 g.enemies[0].state='active';at(g.player,1,3);g.collect();assert.equal(g.score,60);assert.equal(g.power,10);assert.ok(g.enemies.every(e=>e.frightened));assert.equal(g.enemies[0].dir,2);
 g.power=1;g.chain=3;at(g.player,26,3);g.collect();assert.equal(g.power,10);assert.equal(g.chain,0);
});
test('frightened hunters wander deterministically, slow down, and mode clocks pause until power expires',()=>{
 const a=playing(),b=playing();for(const g of [a,b]){g.energize();at(g.enemies[0],6,5,3);g.enemies[0].state='active';}
 assert.deepEqual(Array.from({length:30},()=>a.chooseEnemy(a.enemies[0])),Array.from({length:30},()=>b.chooseEnemy(b.enemies[0])));
 const time=a.modeTime;tick(a,.2);assert.equal(a.modeTime,time);a.power=.01;a.update(.02);assert.equal(a.power,0);assert.ok(a.enemies.every(e=>!e.frightened));assert.ok(a.modeTime<time);
 const normal=playing(),scared=playing();for(const g of [normal,scared]){g.elapsed=-100;at(g.enemies[0],1,5,3);g.enemies[0].state='active';}scared.energize();
 normal.update(.1);scared.update(.1);assert.ok(scared.position(scared.enemies[0]).x<normal.position(normal.enemies[0]).x);
});
test('captures escalate 200/400/800/1600, freeze play briefly, and eyes return through the gate to regenerate',()=>{
 const g=playing();g.energize();
 for(const e of g.enemies){e.state='active';at(e,13,23);}
 g.collide();assert.equal(g.score,3000);assert.equal(g.chain,4);assert.ok(g.enemies.every(e=>e.state==='eyes'));assert.equal(g.freeze,.5);
 const e=g.enemies[0];
 for(let n=0;n<2000&&e.state==='eyes';n++)g.move(e,.1,()=>g.chooseEnemy(e));
 assert.equal(e.state,'reviving');assert.equal(e.x,13);assert.equal(e.y,14);assert.equal(e.frightened,false);
 g.release(1.1);assert.equal(e.state,'exiting');assert.equal(e.frightened,false);
});
test('coloured regenerated hunters are dangerous even while skull power remains',()=>{
 const g=playing();g.energize();const e=g.enemies[0];e.state='active';e.frightened=false;at(e,13,23);g.collide();assert.equal(g.phase,'caught');assert.equal(g.lives,2);
});
test('normal collisions cost one life, preserve remaining dots, and reset the cage and powers',()=>{
 const g=playing();at(g.player,1,1);g.collect();at(g.enemies[0],1,1);g.enemies[0].state='active';g.collide();assert.equal(g.lives,2);g.collide();assert.equal(g.lives,2);
 tick(g,1.6);assert.equal(g.phase,'ready');assert.equal(g.dots.size,239);assert.ok(g.enemies.every(e=>e.state==='caged'));
 g.phase='playing';g.lives=1;at(g.enemies[0],13,23);g.enemies[0].state='active';g.collide();tick(g,1.6);assert.equal(g.over,true);assert.equal(g.phase,'gameover');
 const score=g.score;tick(g,2);assert.equal(g.score,score);
});
test('scatter/chase transitions preserve hunter direction; the final chase wave lasts indefinitely',()=>{
 const g=playing();g.elapsed=-1000;g.enemies[0].state='active';at(g.enemies[0],6,5,3);g.enemies[0].next={x:7,y:5};g.enemies[0].progress=.2;
 g.modeTime=.001;g.update(.01);assert.equal(g.mode,'chase');assert.equal(g.enemies[0].dir,3);assert.deepEqual(g.enemies[0].next,{x:7,y:5});
 g.wave=6;g.modeTime=.001;g.update(.01);assert.equal(g.wave,7);assert.equal(g.modeTime,Infinity);assert.equal(g.mode,'chase');
});
test('clearing the full maze through legal movement advances to a faster, less forgiving level',()=>{
 const g=playing();g.elapsed=-100000;
 let moves=0;
 while(g.phase==='playing'&&moves<1500){
  const path=nearestRoute(g,g.player,new Set([...g.dots,...g.skulls]));assert.ok(path&&path.length,'there is a path to the next collectible');
  for(const d of path){g.wanted=d;g.update(1/(g.difficulty.playerSpeed+(g.power>0?.25:0)));moves++;if(g.phase!=='playing')break;}
 }
 assert.equal(g.phase,'clear');assert.equal(g.remaining,0);assert.ok(g.score>=3100);const score=g.score,speed=g.difficulty.enemySpeed,power=g.difficulty.power;
 tick(g,2.6);assert.equal(g.level,2);assert.equal(g.phase,'ready');assert.equal(g.score,score);assert.equal(g.remaining,244);assert.ok(g.difficulty.enemySpeed>speed);assert.ok(g.difficulty.power<power);
});
test('difficulty increases with bounded speed and always leaves useful skull power; one extra life at 10,000',()=>{
 const first=ghostDifficulty(1),late=ghostDifficulty(50);assert.ok(first.playerSpeed>first.enemySpeed*1.3);assert.ok(late.enemySpeed>first.enemySpeed);assert.ok(late.power>=2.5);assert.ok(late.release[3]<first.release[3]);assert.ok(late.scatter<first.scatter);assert.ok(late.chase>first.chase);
 const g=playing();g.addScore(10000);assert.equal(g.lives,4);g.addScore(10000);assert.equal(g.lives,4);
});
test('touch arrows buffer directions and release removes held input without stopping movement',()=>{
 const g=playing();for(let i=0;i<4;i++){g.pointer('down',262+i*39,345);assert.equal(g.wanted,i);g.pointer('up',262+i*39,345);assert.equal(g.touchDirection,null);assert.equal(g.wanted,i);}
 const title=new Ghost();title.pointer('down',320,180);assert.equal(title.phase,'ready');
});

test('intercept targets use tile coordinates even while red is moving or the player wraps',()=>{
 const g=playing();g.mode='chase';at(g.player,10,20,3);at(g.enemies[0],6,8,3);g.enemies[0].next={x:7,y:8};g.enemies[0].progress=.2;
 assert.deepEqual(g.target(g.enemies[2]),{x:18,y:32});
 at(g.player,27,14,3);g.player.next={x:0,y:14};g.player.progress=.8;assert.deepEqual(g.target(g.enemies[0]),{x:0,y:14});
});

test('skulls activate on contact before the tile centre and protect against hunters in the same step',()=>{
 const g=playing();g.elapsed=-1000;at(g.player,1,2,2);g.player.next={x:1,y:3};g.player.progress=.4;g.wanted=2;
 const e=g.enemies[0];at(e,1,3,0);e.state='active';
 g.update(.001);
 assert.equal(g.skulls.has(id(1,3)),false);assert.ok(g.power>0);assert.equal(g.lives,3);assert.equal(g.phase,'playing');
 assert.equal(g.player.y,2,'the ghost has not reached the skull tile centre');
 const score=g.score;g.collectNearbySkull();assert.equal(g.score,score,'contact cannot consume the skull twice');
});
test('skull power changes a moving hunter immediately without reversing it',()=>{
 const g=playing(),e=g.enemies[0];at(e,6,5,3);e.next={x:7,y:5};e.progress=.3;e.state='active';
 const before=g.position(e);g.energize();assert.deepEqual(g.position(e),before);assert.equal(e.dir,3);assert.equal(e.frightened,true);
 g.move(e,.1,()=>g.chooseEnemy(e));assert.ok(g.position(e).x>before.x);
});
test('touching the last skull clears the maze immediately',()=>{
 const g=playing();g.dots.clear();g.skulls=new Set([id(1,3)]);at(g.player,1,2,2);g.player.next={x:1,y:3};g.player.progress=.4;
 g.collectNearbySkull();assert.equal(g.phase,'clear');assert.equal(g.remaining,0);assert.equal(g.score,550);
});

test('active hunters never choose a U-turn anywhere in the maze, including frightened mode',()=>{
 const g=playing(),e=g.enemies[0],opposite=[2,3,0,1];e.state='active';
 for(const mode of ['scatter','chase','frightened']){
  g.mode=mode==='frightened'?'chase':mode;e.frightened=mode==='frightened';
  for(let y=0;y<31;y++)for(let x=0;x<28;x++)if(g.canWalk(x,y))for(let dir=0;dir<4;dir++){
   at(e,x,y,dir);if(!g.neighbour(e,opposite[dir]))continue;
   const chosen=g.chooseEnemy(e);assert.notEqual(chosen,opposite[dir],`${mode} at ${x},${y} heading ${dir}`);
  }
 }
});
