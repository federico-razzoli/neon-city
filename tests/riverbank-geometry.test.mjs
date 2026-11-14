import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK,RIVER_ROWS,WATER_LEVEL} from '../neon-city/world.js';
import {drawRiverbankFaces} from '../neon-city/rivers.js';
import {riverbankWallGeometry} from '../neon-city/riverbank-geometry.js';
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
test('wall-only templates share across bridge layouts, preserve their cache and respect culling',()=>{
  for(const part of [0,1]){
    const row=RIVER_ROWS[0],chunk={x:0,z:row+part,riverStart:row};
    const walls=riverbankWallGeometry(chunk),snapshot=walls.slice();
    assert.strictEqual(riverbankWallGeometry({...chunk,x:1}),walls);
    geometryWasm.tree_build();assert.deepEqual(walls,snapshot);
    for(let k=0;k<walls.length;k+=14)assert.equal(walls[k],2);
    const count=geometryWasm.riverbank_walls_build(+!part,WATER_LEVEL);
    assert.equal(walls.length,count*14);
    let calls=0;drawRiverbankFaces(chunk,{face:()=>calls++,boundsVisible:()=>false});assert.equal(calls,0);
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
