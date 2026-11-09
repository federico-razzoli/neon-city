import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pedestrianCollisionKernel,pedestrianWasmAvailable} from '../neon-city/pedestrian-collisions-wasm.js';

const move=(x,z,dx,dz,blocked=false)=>({before:{x,z},after:{x:x+dx,z:z+dz},blocked});
// Exhaustive reference: all pairs, original distance calculation and pair order.
function reference(moves,clearance=.85){
  let changed=true;
  while(changed){
    changed=false;
    for(let i=0;i<moves.length;i++)for(let j=i+1;j<moves.length;j++){
      const a=moves[i],b=moves[j],endA=a.blocked?a.before:a.after,endB=b.blocked?b.before:b.after;
      const x=a.before.x-b.before.x,z=a.before.z-b.before.z;
      const dx=endA.x-endB.x-x,dz=endA.z-endB.z-z,length=dx*dx+dz*dz;
      const t=length?Math.max(0,Math.min(1,(-x*dx-z*dz)/length)):0;
      if(Math.hypot(x+dx*t,z+dz*t)>=clearance)continue;
      const ax=a.after.x-a.before.x,az=a.after.z-a.before.z,bx=b.after.x-b.before.x,bz=b.after.z-b.before.z;
      let stop=[a,b];
      if(ax*bx+az*bz>0)stop=[(b.before.x-a.before.x)*(ax+bx)+(b.before.z-a.before.z)*(az+bz)>0?a:b];
      for(const p of stop)if(!p.blocked){p.blocked=true;changed=true;}
    }
  }
  return moves.map(p=>p.blocked);
}
function agrees(moves,clearance=.85){
  const expected=reference(structuredClone(moves),clearance);
  assert.equal(pedestrianCollisionKernel(moves,clearance),true);
  assert.deepEqual(moves.map(p=>p.blocked),expected);
}

test('pedestrian WASM loads by default and resolves queue propagation in both orders',()=>{
  assert.equal(pedestrianWasmAvailable,true);
  for(const reverse of [false,true]){
    const queue=[move(-8,-4,1,0),move(-7,-4,1,0),move(-6,-4,1,0,true)];
    if(reverse)queue.reverse();
    agrees(queue);
    assert.ok(queue.every(p=>p.blocked));
  }
});

test('WASM handles crossing paths, sidesteps, overlaps, and long swept steps',()=>{
  agrees([move(-8,-4,16,0),move(0,-12,0,16)]);
  agrees([move(3.9,-.1,.4,1.3),move(4.1,.9,-.4,0)]);
  agrees([move(0,0,1,0),move(0,0,-1,0),move(100,100,0,0)]);
  agrees([move(-1,-1,2,0),move(1,-1,-2,0)]);
  agrees([]);
});

test('WASM broad phase and stop flags match exhaustive collision rules across deterministic crowds',()=>{
  let seed=31;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(let scenario=0;scenario<80;scenario++){
    // Cross several bitset words and vary sizes to detect stale scratch data.
    const count=scenario%4===0?100:scenario%37;
    const moves=Array.from({length:count},()=>move((random()-.5)*40,(random()-.5)*40,(random()-.5)*8,(random()-.5)*8,random()<.15));
    agrees(moves);
  }
});

test('unsupported inputs and ambiguous distance boundaries leave all JS flags untouched',()=>{
  const cases=[
    Array.from({length:513},()=>move(0,0,0,0)),
    [move(0,0,1e6,1e6)],
    [move(1e9,0,1,0)],
    [move(NaN,0,1,0)],
    [move(0,0,1,0),move(.2,0,-1,0),move(100,0,0,0),move(100,.85,0,0)],
    [move(0,0,0,0),move(0,.85-1e-14,0,0)],
    [move(0,0,0,0),move(0,.85+1e-14,0,0)]
  ];
  for(const moves of cases){
    const original=structuredClone(moves);
    assert.equal(pedestrianCollisionKernel(moves,.85),false);
    assert.deepEqual(moves,original,'fallback must see original input, even after partial WASM resolution');
  }
  for(const clearance of [0,-1,Infinity,NaN,17]){
    const moves=[move(0,0,1,0)];
    assert.equal(pedestrianCollisionKernel(moves,clearance),false);
  }
  agrees([move(-8,-4,1,0),move(-7,-4,0,0,true)]);
});

test('missing WASM leaves the JavaScript resolver available',async()=>{
  let source=await readFile(new URL('../neon-city/pedestrian-collisions-wasm.js',import.meta.url),'utf8');
  source=source.replace("'./pedestrian-collisions.wasm'","'file:///nonexistent-neon-city-pedestrian-collisions.wasm'");
  const fallback=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.equal(fallback.pedestrianWasmAvailable,false);
  const moves=[move(0,0,1,0),move(1,0,0,0,true)],original=structuredClone(moves);
  assert.equal(fallback.pedestrianCollisionKernel(moves,.85),false);
  assert.deepEqual(moves,original);
});
