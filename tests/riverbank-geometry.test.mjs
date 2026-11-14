import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK,RIVER_ROWS,WATER_LEVEL,hasBridge} from '../neon-city/world.js';
import {drawRiverbankFaces,drawRiverTerrain} from '../neon-city/rivers.js';
import {riverbankGeometry,riverbankWallGeometry,drawRiverbankTerrain} from '../neon-city/riverbank-geometry.js';
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

test('wall-only generation omits terrain and approaches while preserving every retaining-wall panel',()=>{
  const scratch=new Float64Array(geometryWasm.memory.buffer,geometryWasm.output(),256*24);
  for(const first of [0,1])for(const left of [0,1])for(const right of [0,1]){
    const count=geometryWasm.riverbank_build(first,left,right,WATER_LEVEL),walls=[];
    for(let k=0;k<count*14;k+=14)if(scratch[k]===2)walls.push(...scratch.slice(k,k+14));
    const wallCount=geometryWasm.riverbank_walls_build(first,WATER_LEVEL);
    assert.deepEqual(scratch.slice(0,wallCount*14),new Float64Array(walls));
    assert.ok(wallCount<count,'unused terrain is never emitted by the wall-only builder');
  }
  for(const part of [0,1]){
    const row=RIVER_ROWS[0],chunk={x:0,z:row+part,riverStart:row};
    const walls=riverbankWallGeometry(chunk),snapshot=walls.slice();
    assert.strictEqual(riverbankWallGeometry({...chunk,x:1}),walls,'walls share across bridge layouts');
    geometryWasm.riverbank_build(1,1,1,WATER_LEVEL);
    assert.deepEqual(walls,snapshot,'wall cache owns its data');
    for(let k=0;k<walls.length;k+=14)assert.equal(walls[k],2);
  }
});

test('native door openings remove wall faces on both sides of each chunk boundary',()=>{
  for(const street of [-3,0,3])for(const part of [0,1]){
    const row=RIVER_ROWS[0],faces=[];
    for(const x of [street-1,street])drawRiverbankFaces({x,z:row+part,riverStart:row},{nativeWater:true,face:v=>faces.push(v)});
    let area=0;
    for(const v of faces){
      const left=v[0].x,right=v[1].x,bottom=v[0].y,top=v[2].y;
      assert.ok(right<=street*BLOCK-.9||left>=street*BLOCK+.9||top<=-3.4||bottom>=-1.4,'no wall crosses the doorway');
      area+=(right-left)*(top-bottom);
    }
    assert.ok(Math.abs(area-(128*3.9-1.8*2))<1e-8,'only the door opening is removed');
  }
});
