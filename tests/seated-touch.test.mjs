import test from 'node:test';
import assert from 'node:assert/strict';
import {installSeatedTouch} from '../neon-city/seated-touch.js';
function setup(){
  const handlers={},captured=new Set(),moves=[];let seat={},enabled=true,stands=0;
  const canvas={addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),getBoundingClientRect:()=>({width:400,height:200})};
  installSeatedTouch(canvas,{getSeat:()=>seat,canUse:()=>enabled,look:(...move)=>moves.push(move),stand:()=>stands++});
  return {send:(name,x=100,y=100,extra={})=>handlers[name]({pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,preventDefault(){},...extra}),moves,get stands(){return stands;},disable:()=>enabled=false,changeSeat:()=>seat={}};
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
