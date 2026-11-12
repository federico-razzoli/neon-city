import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK,RIVER_ROWS,bridgeHeight} from '../neon-city/world.js';
import {drawRiverStructures} from '../neon-city/rivers.js';
import {railingGeometry} from '../neon-city/railing-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';
import {originalRiverStructures} from './fixtures/original-river-structures.mjs';

function originalBox(face,viewer){
  return (x,y,z,w,h,d,color,roof=color)=>{
    const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
    const up=p=>({...p,y:y+h});
    if(viewer.z<z)face([a,b,up(b),up(a)],color);
    if(viewer.z>z+d)face([c,e,up(e),up(c)],color);
    if(viewer.x<x)face([e,a,up(a),up(e)],color);
    if(viewer.x>x+w)face([b,c,up(c),up(b)],color);
    if(viewer.y>y+h)face([up(a),up(b),up(c),up(e)],roof);
  };
}
test('cached river railings preserve bank and bridge geometry, culling and face order',()=>{
  for(const row of RIVER_ROWS)for(const part of [0,1])for(const x of [-6,-5,-4,0,1,2]){
    const chunk={x,z:row+part,riverStart:row};
    for(const [dx,y,dz] of [[-10,1.65,12],[32,8,32],[70,1.65,115],[14,-8,50],[50,.1,64]]){
      const viewer={x:x*BLOCK+dx,y,z:row*BLOCK+dz},before=[],after=[];
      const capture=out=>(vertices,color)=>out.push({vertices,color});
      const face=capture(before);
      originalRiverStructures(chunk,{face,box:originalBox(face,viewer)},viewer);
      drawRiverStructures(chunk,{face:capture(after)},viewer);
      assert.equal(after.length,before.length,`${x},${row},${part},${dx},${y},${dz}`);
      before.forEach((f,i)=>{
        assert.equal(after[i].color,f.color);
        assert.equal(after[i].vertices.length,f.vertices.length);
        f.vertices.forEach((p,j)=>{
          for(const axis of ['x','y','z'])assert.ok(Math.abs(after[i].vertices[j][axis]-p[axis])<1e-10,`${axis}: ${after[i].vertices[j][axis]} vs ${p[axis]}`);
        });
      });
    }
  }
});
test('railing templates share across blocks and survive other WASM generators',()=>{
  const row=RIVER_ROWS[0];
  for(const part of [0,1])for(const x of [0,1,2]){
    const chunk={x,z:row+part,riverStart:row},geometry=railingGeometry(chunk),snapshot=geometry.slice();
    assert.ok(geometry instanceof Float64Array);
    assert.strictEqual(railingGeometry({...chunk,x:x+3,z:row+part+64,riverStart:row+64}),geometry);
    geometryWasm.car_build(2,0,1);
    assert.deepEqual(geometry,snapshot);
  }
  for(const first of [0,1])for(const left of [0,1])for(const right of [0,1]){
    const count=geometryWasm.railing_build(first,left,right);
    assert.ok(count*15<=256*24,'all layouts fit shared scratch');
  }
});
test('cached bridge samples match world physics and offscreen railings submit nothing',()=>{
  const row=RIVER_ROWS[0],chunk={x:0,z:row,riverStart:row};
  const geometry=railingGeometry(chunk);
  for(let k=0;k<geometry.length;k+=15)if(geometry[k]===0&&geometry[k+1]===3&&geometry[k+3]===geometry[k+6]){
    const z=geometry[k+5];
    assert.ok(Math.abs(geometry[k+4]-bridgeHeight(row*BLOCK+z)-1.05)<1e-12);
  }
  let calls=0;
  drawRiverStructures(chunk,{face:()=>calls++,boundsVisible:()=>false},{x:0,y:1.65,z:0});
  assert.equal(calls,0);
});
