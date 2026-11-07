import test from 'node:test';
import assert from 'node:assert/strict';
import {Pinball} from '../neon-city/pinball.js';
import {ARCADE,PINBALL_MACHINE,tryArcadeGame} from '../neon-city/arcade-interior.js';

test('only the first pinball is playable and consumes one token',()=>{
  const inventory={items:[{id:'arcade-token',count:2}],selected:0};
  assert.equal(tryArcadeGame(PINBALL_MACHINE,inventory,false),'PINBALL');
  assert.equal(inventory.items[0].count,2);
  assert.equal(tryArcadeGame(PINBALL_MACHINE,inventory),'PINBALL');
  assert.equal(inventory.items[0].count,1);
  assert.equal(tryArcadeGame(ARCADE.pinballs[1],inventory),'THIS GAME IS NOT AVAILABLE YET.');
  assert.equal(tryArcadeGame(PINBALL_MACHINE,inventory),'PINBALL');
  assert.equal(inventory.items.length,0);
  assert.equal(tryArcadeGame(PINBALL_MACHINE,inventory),'TO PLAY GAMES YOU NEED TOKENS.');
});
test('Down progressively pulls the spring; release returns it to the ball before launching',()=>{
  const g=new Pinball();
  g.update(.1,0,0,true);assert.equal(g.charge,0,'Space does not pull the spring');
  g.update(.1,1);const firstPull=g.plungerPull;
  assert.ok(firstPull>0);assert.equal(g.ball.vy,0);assert.equal(g.ready,true);
  g.update(.1,1);assert.ok(g.plungerPull>firstPull);
  g.update(.001);assert.equal(g.ready,true,'ball waits until the released spring strikes it');
  g.update(.02);assert.ok(g.plungerPull<g.charge);assert.equal(g.ball.vy,0);
  g.update(.04);assert.equal(g.ready,false);assert.ok(g.ball.vy<0);assert.equal(g.plungerPull,0);
});
test('pull distance determines launch speed and the full pull is capped',()=>{
  const speeds=[];
  for(const hold of [.15,.4,1.2]){
    const g=new Pinball();for(let t=0;t<hold;t+=.01)g.update(.01,1);
    const pull=g.plungerPull;assert.ok(pull<=1);
    g.update(.001);for(let i=0;i<53;i++)g.update(.001);
    speeds.push(-g.ball.vy);
  }
  assert.ok(speeds[1]>speeds[0]*2);assert.ok(speeds[2]>speeds[1]*1.9);
});
test('a weak shot rolls back onto the spring; a full shot reaches the playfield',()=>{
  for(const [hold,strong] of [[.1,false],[1,true]]){
    const g=new Pinball();for(let t=0;t<hold;t+=.01)g.update(.01,1);
    g.update(.01);let entered=false;
    for(let i=0;i<300;i++){g.update(1/120);if(g.ball.x<420&&g.ball.y<650)entered=true;}
    assert.equal(entered,strong);
    if(!strong){assert.equal(g.ready,true);assert.equal(g.lives,3);assert.equal(g.ball.y,796);}
  }
});
test('weak shots near the launch lane exit gain no energy from the guide',()=>{
  for(const speed of [10,60,150]){
    const g=new Pinball();g.ready=false;
    g.ball={x:450,y:200,vx:0,vy:-speed};
    const energy=()=>.5*(g.ball.vx**2+g.ball.vy**2)-480*g.ball.y;
    for(let i=0;i<120;i++){
      const before=energy();g.step(1/480);
      assert.ok(energy()<=before+1e-6,'the stationary guide cannot add energy');
    }
  }
});
test('side nudges tilt on a second push within one second and reset after draining',()=>{
  const g=new Pinball();g.nudge(-1);assert.equal(g.ball.vx,0,'waiting balls cannot be nudged');
  g.ready=false;g.ball={x:240,y:500,vx:0,vy:0};
  g.nudge(-1);assert.equal(g.ball.vx,-160);
  g.time+=1.01;g.nudge(1);assert.equal(g.ball.vx,0);assert.equal(g.tilted,false);
  g.time+=.2;g.nudge(-1);assert.equal(g.tilted,true);assert.equal(g.ball.vx,0);
  g.update(.1,0,0,false,true,true);
  assert.ok(g.flippers.every(f=>f.a===f.rest),'tilt disables flippers');
  const p=g.bumpers[0];g.ball={x:p.x,y:p.y-p.r-7,vx:0,vy:150};g.step(.002);
  assert.equal(g.score,0,'tilt disables scoring');
  g.ball={x:240,y:866,vx:0,vy:100};g.step(.002);
  assert.equal(g.lives,2);assert.equal(g.tilted,false);
  g.ready=false;g.nudge(1);assert.equal(g.ball.vx,160);assert.equal(g.tilted,false);
});
test('pop bumpers impart an outward impulse and score once per impact',()=>{
  const g=new Pinball(),p=g.bumpers[0];g.ready=false;
  g.ball={x:p.x,y:p.y-p.r-7,vx:0,vy:150};g.step(.002);
  assert.equal(g.score,100);assert.ok(g.ball.vy<0);assert.ok(p.lit>0);
  for(let i=0;i<5;i++)g.step(.002);
  assert.equal(g.score,100);
});
test('flippers operate independently, and a moving flipper strikes the ball',()=>{
  for(const side of [0,1]){
    const g=new Pinball(),f=g.flippers[side];g.ready=false;
    g.ball={x:f.x+(side?-39:39),y:f.y-1,vx:0,vy:180};
    g.update(.04,0,0,false,side===0,side===1);
    assert.ok(g.ball.vy<0);
    assert.notEqual(f.a,f.rest);assert.equal(g.flippers[1-side].a,g.flippers[1-side].rest);
  }
});
test('dropping a target scores once and a completed bank earns a bonus before resetting',()=>{
  const g=new Pinball();g.ready=false;
  for(const t of g.targets){
    g.ball={x:t.x+11,y:t.y,vx:-150,vy:0};g.step(.002);assert.equal(t.down,true);
  }
  assert.equal(g.score,4500);assert.ok(g.bankReset>0);
  const t=g.targets[0];g.ball={x:t.x+11,y:t.y,vx:-150,vy:0};g.step(.002);
  assert.equal(g.score,4500);
  g.ready=true;for(let i=0;i<20;i++)g.update(.1);
  assert.ok(g.targets.every(t=>!t.down));
});
test('rollover switches score on downward crossings and complete a set',()=>{
  const g=new Pinball();g.ready=false;
  for(const r of g.rollovers){g.ball={x:r.x,y:179.9,vx:0,vy:150};g.step(.002);}
  assert.equal(g.score,1750);assert.ok(g.rollovers.every(r=>!r.on));
});
test('three drains end a credit and each new ball waits for the plunger',()=>{
  const g=new Pinball();
  for(let i=0;i<3;i++){
    g.ready=false;g.ball={x:240,y:866,vx:0,vy:100};g.step(.002);
    assert.equal(g.lives,2-i);
    if(i<2){assert.equal(g.ready,true);assert.equal(g.ball.x,450);}
  }
  assert.equal(g.over,true);g.update(.1,0,0,true);assert.equal(g.lives,0);
});
test('the disposable cabinet runtime loads Pinball by its arcade name',async()=>{
  const previous=globalThis.window;
  globalThis.window={};
  try{
    await import('../neon-city/cabinet-runtime.js');
    const game=await window.createCabinetGame('PINBALL');
    assert.equal(game.constructor.name,'Pinball');
    assert.equal(game.kind,'pinball');
  }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
test('touch permits both flippers together and a held plunger; pause releases them',()=>{
  const g=new Pinball();g.pointer('down',160,240,1);g.pointer('down',420,240,2);
  g.update(.1);assert.equal(g.flippers[0].a,g.flippers[0].active);assert.equal(g.flippers[1].a,g.flippers[1].active);
  g.pointer('down',405,320,3);g.update(.1);assert.equal(g.ready,true);assert.ok(g.charge>0);
  g.pointer('up',405,320,3);g.update(.01);g.update(.06);assert.equal(g.ready,false);
  g.syncInput(null,false);assert.equal(g.pointers.size,0);assert.equal(g.launchHeld,false);
});
