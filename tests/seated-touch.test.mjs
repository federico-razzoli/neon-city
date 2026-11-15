import test from 'node:test';
import assert from 'node:assert/strict';
import {installSeatedTouch} from '../neon-city/seated-touch.js';
function setup(initialSeat={}){
  const handlers={},options={},captured=new Set(),moves=[],taps=[];let clock=0,seat=initialSeat,enabled=true,stands=0;
  const canvas={addEventListener:(name,fn,opts)=>{handlers[name]=fn;options[name]=opts;},setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),getBoundingClientRect:()=>({top:0,width:400,height:200})};
  const controls=installSeatedTouch(canvas,{getSeat:()=>seat,canUse:()=>enabled,look:(...move)=>moves.push(move),stand:()=>stands++,tap:ground=>taps.push(ground),now:()=>clock});
  return {controls,taps,options,advance:ms=>clock+=ms,send:(name,x=100,y=100,extra={})=>handlers[name]({pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,preventDefault(){},...extra}),moves,get stands(){return stands;},disable:()=>enabled=false,changeSeat:()=>seat={}};
}
test('single tap stands; small finger jitter does not move the camera',()=>{
  const s=setup();s.send('pointerdown');s.send('pointermove',103,102);s.send('pointerup',103,102);assert.equal(s.stands,1);assert.equal(s.moves.length,0);
});
test('drag inverts camera movement and never stands, even after returning to its origin',()=>{
  const s=setup();s.send('pointerdown');s.send('pointermove',140,120);assert.ok(s.moves[0][0]<0);assert.ok(s.moves[0][1]>0);s.send('pointermove');s.send('pointerup');assert.equal(s.stands,0);
});
test('cancellation, menus, seat changes and multiple fingers do not stand',()=>{
  for(const cancel of [s=>s.send('pointercancel'),s=>s.send('lostpointercapture'),s=>s.disable(),s=>s.changeSeat(),s=>s.send('pointerdown',100,100,{pointerId:2,isPrimary:false})]){
    const s=setup();s.send('pointerdown');cancel(s);s.send('pointerup');assert.equal(s.stands,0);
  }
});
test('mouse and non-primary touches cannot trigger a single tap',()=>{
  for(const extra of [{pointerType:'mouse'},{isPrimary:false}]){const s=setup();s.send('pointerdown',100,100,extra);s.send('pointerup');assert.equal(s.stands,0);}
});

test('walking drag turns horizontally with inverted movement and ignores vertical movement',()=>{
  const s=setup(null);s.send('pointerdown');s.send('pointermove',140,120);
  assert.ok(s.moves[0][0]<0);assert.equal(s.moves[0][1],0);
  s.send('pointermove',140,160);assert.ok(s.moves[1][0]===0);assert.equal(s.moves[1][1],0);
  s.send('pointerup');assert.equal(s.stands,0);
});
test('walking taps do not stand and sitting during a walking gesture cancels it',()=>{
  const s=setup(null);s.send('pointerdown');s.send('pointerup');assert.equal(s.stands,0);
  s.send('pointerdown');s.changeSeat();s.send('pointermove',140,120);s.send('pointerup');
  assert.equal(s.moves.length,0);assert.equal(s.stands,0);
});

test('holding walks only after the tap threshold and stops on release without interacting',()=>{
  const s=setup(null);s.send('pointerdown');assert.equal(s.controls.update(),false);
  s.advance(219);assert.equal(s.controls.update(),false);s.advance(1);assert.equal(s.controls.update(),true);
  s.send('pointermove',140,120);assert.equal(s.controls.update(),true);
  s.send('pointerup');assert.equal(s.controls.update(),false);assert.deepEqual(s.taps,[]);
});
test('quick walking taps distinguish forward and ground interactions',()=>{
  const s=setup(null);s.send('pointerdown',100,60);s.advance(50);s.send('pointerup',100,60);
  s.send('pointerdown',100,180);s.advance(50);s.send('pointerup',100,180);assert.deepEqual(s.taps,[false,true]);
});
test('menus and cancellation stop held walking; long holds never trigger taps',()=>{
  for(const cancel of [s=>s.disable(),s=>s.send('pointercancel'),s=>s.send('lostpointercapture'),s=>s.changeSeat()]){
    const s=setup(null);s.send('pointerdown');s.advance(250);assert.equal(s.controls.update(),true);
    cancel(s);assert.equal(s.controls.update(),false);s.send('pointerup');assert.deepEqual(s.taps,[]);
  }
  const s=setup(null);s.send('pointerdown');s.advance(500);s.send('pointerup');assert.deepEqual(s.taps,[]);
});

test('dragging locks out forward movement until a fresh touch begins',()=>{
  const s=setup(null);s.send('pointerdown');s.send('pointermove',140,120);
  s.advance(500);assert.equal(s.controls.update(),false);
  s.send('pointermove');s.advance(500);assert.equal(s.controls.update(),false);
  s.send('pointerup');assert.deepEqual(s.taps,[]);
  s.send('pointerdown');s.advance(50);s.send('pointerup');assert.deepEqual(s.taps,[false]);
  s.send('pointerdown');s.advance(250);assert.equal(s.controls.update(),true);
});

test('native long-press defaults are suppressed without interrupting held movement',()=>{
  const s=setup(null);s.send('pointerdown');s.advance(250);assert.equal(s.controls.update(),true);
  for(const name of ['touchstart','touchmove','contextmenu']){
    let prevented=false;s.send(name,100,100,{preventDefault(){prevented=true;}});
    assert.equal(prevented,true);assert.equal(s.controls.update(),true);
    if(name!=='contextmenu')assert.equal(s.options[name].passive,false);
  }
  s.advance(3000);assert.equal(s.controls.update(),true);
  s.send('pointerup');assert.equal(s.controls.update(),false);assert.deepEqual(s.taps,[]);
});
test('native defaults are left available when gameplay is inactive',()=>{
  const s=setup(null);s.disable();
  for(const name of ['touchstart','touchmove','contextmenu']){
    let prevented=false;s.send(name,100,100,{preventDefault(){prevented=true;}});assert.equal(prevented,false);
  }
});

test('holding first allows continuous steering while walking until release',()=>{
  const s=setup(null);s.send('pointerdown');s.advance(250);assert.equal(s.controls.update(),true);
  s.send('pointermove',140,120);assert.ok(s.moves[0][0]<0);assert.equal(s.controls.update(),true);
  s.advance(1000);assert.equal(s.controls.update(),true);
  s.send('pointermove',80,160);assert.ok(s.moves[1][0]>0);assert.equal(s.moves[1][1],0);
  assert.equal(s.controls.update(),true);s.send('pointerup');assert.equal(s.controls.update(),false);assert.deepEqual(s.taps,[]);
});
test('a hold before the first drag is recognised even between simulation updates',()=>{
  const s=setup(null);s.send('pointerdown');s.advance(250);s.send('pointermove',140,120);
  assert.equal(s.controls.update(),true);s.send('pointerup');assert.deepEqual(s.taps,[]);
});

test('two-finger holds run, steer, return to walking and stop on release',()=>{
  const s=setup(null);s.send('pointerdown');
  s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
  assert.equal(s.controls.running,false);
  s.advance(220);assert.equal(s.controls.update(),true);assert.equal(s.controls.running,true);
  s.send('pointermove',130,100);assert.ok(s.moves[0][0]<0);assert.equal(s.controls.strafe,0);assert.equal(s.controls.running,true);
  s.send('pointerup',140,100,{pointerId:2,isPrimary:false});
  assert.equal(s.controls.running,false);assert.equal(s.controls.update(),true);
  s.send('pointerup');assert.equal(s.controls.update(),false);assert.deepEqual(s.taps,[]);
});
test('adding a second finger to walking runs; ending the first touch stops both',()=>{
  const s=setup(null);s.send('pointerdown');s.advance(250);s.controls.update();
  s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});assert.equal(s.controls.running,true);
  s.send('pointerup');assert.equal(s.controls.running,false);assert.equal(s.controls.update(),false);
  s.send('pointerup',140,100,{pointerId:2,isPrimary:false});assert.deepEqual(s.taps,[]);
});
test('quick two-finger taps never interact and interrupted running clears',()=>{
  const quick=setup(null);quick.send('pointerdown');quick.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
  quick.send('pointerup',140,100,{pointerId:2,isPrimary:false});quick.send('pointerup');assert.deepEqual(quick.taps,[]);
  for(const cancel of [s=>s.disable(),s=>s.changeSeat(),s=>s.send('pointercancel'),s=>s.send('lostpointercapture')]){
    const s=setup(null);s.send('pointerdown');s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
    s.advance(250);s.controls.update();assert.equal(s.controls.running,true);
    cancel(s);assert.equal(s.controls.update(),false);assert.equal(s.controls.running,false);
  }
});

test('two-finger drags strafe in either direction without rotating, even before a hold',()=>{
  const s=setup(null);s.send('pointerdown');
  s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
  s.send('pointermove',200,100,{pointerId:2,isPrimary:false});
  assert.ok(s.controls.strafe<0);assert.equal(s.controls.running,true);
  assert.equal(s.controls.update(),false);assert.deepEqual(s.moves,[]);
  s.send('pointermove',40,100,{pointerId:2,isPrimary:false});
  assert.ok(s.controls.strafe>0);assert.deepEqual(s.moves,[]);
  s.send('pointermove',140,100,{pointerId:2,isPrimary:false});assert.equal(s.controls.strafe,0);
  s.send('pointerup',140,100,{pointerId:2,isPrimary:false});assert.equal(s.controls.strafe,0);
  s.send('pointermove',130,100);assert.ok(s.moves[0][0]<0);
  s.send('pointerup');assert.equal(s.controls.strafe,0);assert.deepEqual(s.taps,[]);
});
test('cancelling a two-finger strafe clears sideways movement',()=>{
  const s=setup(null);s.send('pointerdown');s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
  s.send('pointermove',180,100);assert.ok(s.controls.strafe<0);
  s.disable();s.controls.update();assert.equal(s.controls.strafe,0);assert.equal(s.controls.running,false);
});

test('adding a second finger after forward movement keeps camera rotation',()=>{
  for(const updateFirst of [true,false]){
    const s=setup(null);s.send('pointerdown');s.advance(250);
    if(updateFirst)assert.equal(s.controls.update(),true);
    s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
    s.send('pointermove',180,100);
    assert.equal(s.controls.update(),true);assert.equal(s.controls.running,true);
    assert.equal(s.controls.strafe,0);assert.ok(s.moves[0][0]<0);
    s.send('pointermove',40,100);assert.ok(s.moves[1][0]>0);assert.equal(s.controls.strafe,0);
  }
});
test('a two-finger strafe stays sideways after the hold threshold',()=>{
  const s=setup(null);s.send('pointerdown');s.send('pointerdown',140,100,{pointerId:2,isPrimary:false});
  s.send('pointermove',180,100);s.advance(1000);
  assert.equal(s.controls.update(),false);assert.ok(s.controls.strafe<0);
  s.send('pointermove',20,100);assert.ok(s.controls.strafe>0);assert.deepEqual(s.moves,[]);
});
