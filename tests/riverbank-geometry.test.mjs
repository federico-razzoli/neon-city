import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK,RIVER_ROWS,WATER_LEVEL,hasBridge} from '../neon-city/world.js';
import {drawRiverbankFaces,drawRiverTerrain} from '../neon-city/rivers.js';
import {riverbankGeometry,drawRiverbankTerrain} from '../neon-city/riverbank-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';
import {originalRiverbankFaces} from './fixtures/original-riverbanks.mjs';

test('cached riverbank walls preserve all panels, colours, winding and visibility',()=>{
  for(const row of RIVER_ROWS)for(const part of [0,1])for(const x of [-6,-5,-4,0,1,2]){
    const chunk={x,z:row+part,riverStart:row};
    const bank=row*BLOCK+(part?110:18);
    for(const viewer of [undefined,{z:bank-1},{z:bank},{z:bank+1}]){
      const before=[],after=[];
      const capture=out=>({face:(vertices,color)=>out.push({vertices,color})});
      originalRiverbankFaces(chunk,capture(before),viewer);
      drawRiverbankFaces(chunk,capture(after),viewer);
      assert.deepEqual(after,before);
    }
  }
});
test('cached bank grass, promenade and approaches match original terrain formulas',()=>{
  for(const row of RIVER_ROWS)for(const part of [0,1])for(const cx of [-3,-2,-1,0,1,2]){
    const chunk={x:cx,z:row+part,riverStart:row},x=cx*BLOCK,start=row*BLOCK;
    const bank=part?start+110:start+8;
    const before=[[x,.04,bank,64,10,'#345841'],[x,.06,part?bank+4:bank,64,6,'#757380']],approaches=[];
    for(const [offset,width,color] of [[0,8,'#252233'],[8,6,'#757380'],[50,6,'#757380'],[56,8,'#252233']])
      if(hasBridge(cx+(offset>=50?1:0)))approaches.push([x+offset,.075,bank,width,10,color]);
    const after=[],actualApproaches=[];
    drawRiverbankTerrain(chunk,(...q)=>after.push(q));
    drawRiverbankTerrain(chunk,(...q)=>actualApproaches.push(q),true);
    assert.deepEqual(after,before);assert.deepEqual(actualApproaches,approaches);
    // The terrain entry point submits the bank and approaches in their original passes.
    const quads=[];
    drawRiverTerrain(chunk,{quad:(...q)=>quads.push(q),face(){},boundsVisible:()=>false},0);
    assert.deepEqual(quads.slice(0,2),before);
    if(approaches.length)assert.deepEqual(quads.slice(-approaches.length),approaches);
  }
});
test('bank templates share across blocks, survive scratch reuse and respect culling',()=>{
  const row=RIVER_ROWS[0];
  for(const part of [0,1])for(const x of [0,1,2]){
    const chunk={x,z:row+part,riverStart:row},g=riverbankGeometry(chunk),snapshot=g.slice();
    assert.ok(g instanceof Float64Array);
    assert.strictEqual(riverbankGeometry({...chunk,x:x+3,z:chunk.z+64,riverStart:row+64}),g);
    geometryWasm.railing_build(1,1,0);assert.deepEqual(g,snapshot);
    let calls=0;
    drawRiverbankFaces(chunk,{face:()=>calls++,boundsVisible:()=>false});
    assert.equal(calls,0);
  }
  for(const first of [0,1])for(const left of [0,1])for(const right of [0,1])
    assert.ok(geometryWasm.riverbank_build(first,left,right,WATER_LEVEL)*14<=256*24);
});
