import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeLavatorySpatial} from '../neon-city/three-lavatory-spatial.js';
import {LAVATORY,CUBICLE,LavatoryLife} from '../neon-city/lavatory.js?v=staff-room-1';
function fixture(t,kind){const s=createThreeLavatorySpatial(kind);t.after(()=>s.dispose());return s;}
test('lavatory rays select each doorway and its actual cubicle object',t=>{
  const s=fixture(t);
  for(const c of LAVATORY.cubicles){const hit=s.target({x:c.x,z:4.5,angle:0});assert.equal(hit?.type,'cubicle');assert.equal(hit.data,c);}
  assert.equal(s.target({x:3.6,z:1,angle:Math.PI})?.type,'exit');
  assert.equal(s.target({x:2.5,z:4.5,angle:0}),null);
  assert.equal(s.target({x:1.4,z:2,angle:0}),null);
});
test('lavatory basin targeting distinguishes sinks and ignores the gap between them',t=>{
  const s=fixture(t);
  for(const [i,sink] of LAVATORY.sinks.entries())assert.deepEqual(s.target({x:5.8,z:sink.z+sink.d/2,angle:Math.PI/2}),{type:'sink',data:i});
  assert.equal(s.target({x:5.8,z:3.1,angle:Math.PI/2}),null);
  assert.equal(s.target({x:5.8,z:2.35,angle:Math.PI/2},{x:6.3,z:2.35}),null);
});
test('lavatory body blocks sinks, walls and robots without tunnelling',t=>{
  const s=fixture(t),p={x:5,z:2.35};s.move(p,5,0);assert.ok(p.x<6.65);assert.ok(p.x>6.4);
  p.x=5;p.z=3.1;s.move(p,5,0);assert.ok(p.x>6.9);assert.ok(p.x<=7.02);
  p.x=3;p.z=2;s.move(p,0,3,{x:3,z:3});assert.ok(p.z<2.51);
  p.x=3;p.z=3;s.move(p,0,-1,{x:3,z:3.1});assert.ok(p.z<2.1);
  p.x=3;p.z=2;s.move(p,-10,-10);assert.ok(p.x>=.18);assert.ok(p.z>=.18);
});
test('cubicle toilet and exit use ray targets and toilet blocks walking',t=>{
  const s=fixture(t,'cubicle');
  assert.deepEqual(s.target({x:.75,z:1.5,angle:0}),{type:'toilet',data:CUBICLE.seat});
  assert.equal(s.target({x:.75,z:1,angle:Math.PI})?.type,'exit');
  assert.equal(s.target({x:.75,z:1.5,angle:Math.PI/2}),null);
  const p={...CUBICLE.spawn};s.move(p,0,10);assert.ok(p.z<2.7);assert.ok(p.z>2.4);
  s.move(p,10,0);assert.ok(p.x<=1.32);
});
test('Three.js robot collision checks sweep segments and allow separation',t=>{
  const s=fixture(t);
  assert.equal(s.blocksPerson({x:1,z:1},{x:1,z:4},{x:1,z:2}),true);
  assert.equal(s.blocksPerson({x:1,z:1},{x:1,z:1.1},{x:1,z:2}),false);
  assert.equal(s.blocksPerson({x:1,z:1},{x:1,z:.8},{x:1,z:1.1}),false);
  assert.equal(s.blocksPerson({x:1,z:1},{x:1,z:1},{x:1,z:1}),true);
  const life=new LavatoryLife(()=>0);life.walker={x:3.6,z:2,type:11,walkTime:0};
  life.update(.2,[true,true,true],{x:3.6,z:1.6},s.blocksPerson);assert.equal(life.held,true);
});
