import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wallColumns,drawWallTexture} from '../neon-city/perspective.js';
import {wallColumnKernel} from '../neon-city/wall-columns-wasm.js';

const points=[{x:0,y:10},{x:2,y:10},{x:2,y:0},{x:0,y:0}];
const vertices=[{z:2,u:0,v:20},{z:2,u:20,v:20},{z:2,u:20,v:0},{z:2,u:0,v:0}];

test('WASM is loaded by default and projects texture coordinates',()=>{
  assert.deepEqual([...wallColumns(points,vertices,640)],[
    {x:0,top:{y:0,depth:2,u:5,v:0},bottom:{y:10,depth:2,u:5,v:20}},
    {x:1,top:{y:0,depth:2,u:15,v:0},bottom:{y:10,depth:2,u:15,v:20}}
  ]);
});

test('default wall renderer draws WASM columns',()=>{
  const draws=[];
  const ctx=new Proxy({}, {get:(_,key)=>(...args)=>{if(key==='drawImage')draws.push(args);},set:()=>true});
  const texture={width:20,height:20};
  drawWallTexture(ctx,points,vertices,texture,640);
  assert.deepEqual(draws,[
    [texture,5,0,1,20,0,0,1,10],
    [texture,15,0,1,20,1,0,1,10]
  ]);
});

test('unsupported buffer sizes fail explicitly',()=>{
  assert.throws(()=>wallColumnKernel([],[],640),RangeError);
  assert.throws(()=>wallColumnKernel(Array(33),Array(33),640),RangeError);
  assert.throws(()=>wallColumnKernel(points,vertices,8193),RangeError);
});
