import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawFlower} from '../neon-city/flowers.js';
import {flowerGeometry} from '../neon-city/flower-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';

function original(f,quad){
  const {x,z,size=.3,color='#d38aa9',ground=0,centre=true}=f;
  quad(x-size/2,ground,z-size/6,size,size/3,color);
  quad(x-size/6,ground,z-size/2,size/3,size,color);
  if(centre)quad(x-size/6,ground+.001,z-size/6,size/3,size/3,'#e5bb60');
}
test('flower template preserves petal and centre placement, size, colour and elevation',()=>{
  for(const size of [undefined,.24,.3,.36])for(const centre of [undefined,false,true])for(const color of [undefined,'#aaa0d1'])for(const [x,z,ground] of [[0,0,undefined],[128,-64,.09],[-4096,8192,4]]){
    const f={x,z,ground,size,centre,color},before=[],after=[];
    original(f,(...q)=>before.push(q));drawFlower(f,(...q)=>after.push(q));
    assert.equal(after.length,before.length);
    before.forEach((quad,i)=>{
      assert.equal(after[i][5],quad[5]);
      for(let j=0;j<5;j++)assert.ok(Math.abs(after[i][j]-quad[j])<=Number.EPSILON*Math.max(1,Math.abs(quad[j]))*4);
    });
  }
});
test('all flowers share one template across scratch reuse and collectible state',()=>{
  const geometry=flowerGeometry(),snapshot=geometry.slice();
  assert.ok(geometry instanceof Float64Array);
  assert.equal(geometry.byteLength,120);
  geometryWasm.pine_cone_build(.22,.07,1,0);
  drawFlower({x:10,z:20,size:.36,color:'#aaa0d1',centre:false,taken:true},()=>{});
  assert.strictEqual(flowerGeometry(),geometry);
  assert.deepEqual(geometry,snapshot);
});
