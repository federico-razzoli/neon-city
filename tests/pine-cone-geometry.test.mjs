import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pineCone} from '../neon-city/parks.js';
import {pineConeGeometry} from '../neon-city/pine-cone-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';
import {originalPineCone} from './fixtures/original-pine-cone.mjs';

test('cached cones preserve shape, normals, visibility, shading and floor height',()=>{
  for(const length of [.16,.22,.24])for(const radius of [.055,.07,.075])for(const angle of [0,.2,1.5,3.14,5.7])for(const [x,z,ground] of [[0,0,undefined],[128,-64,0],[-4096,8192,4]]){
    const cone={x,z,ground,length,radius,angle};
    for(const [dx,y,dz] of [[2,3,-4],[-2,1.65,3],[2,-1,3],[-.2,.1,-.3]]){
      const viewer={x:x+dx,y,z:z+dz},before=[],after=[];
      originalPineCone(cone,(vertices,color)=>before.push({vertices,color}),viewer);
      pineCone(cone,(vertices,color)=>after.push({vertices,color}),viewer);
      assert.equal(after.length,before.length);
      before.forEach((face,f)=>{
        assert.equal(after[f].color,face.color);
        assert.equal(after[f].vertices.length,face.vertices.length);
        face.vertices.forEach((p,i)=>{
          for(const axis of ['x','y','z'])assert.ok(Math.abs(after[f].vertices[i][axis]-p[axis])<1e-10,`${axis}: ${after[f].vertices[i][axis]} vs ${p[axis]}`);
        });
      });
    }
  }
});

test('cone cache survives scratch reuse, drawing and relocation; shape changes regenerate',()=>{
  const cone={x:0,z:0,length:.22,radius:.07,angle:.3};
  const geometry=pineConeGeometry(cone),snapshot=geometry.slice();
  assert.ok(geometry instanceof Float64Array);
  assert.equal(geometry.length,19*23);
  geometryWasm.car_build(2,1,-1);
  Object.assign(cone,{x:20,z:30,ground:4,taken:true});
  pineCone(cone,v=>{v[0].x=99;},{x:0,y:5,z:0});
  assert.strictEqual(pineConeGeometry(cone),geometry);
  assert.deepEqual(geometry,snapshot);
  for(const field of ['length','radius','angle']){
    const before=pineConeGeometry(cone);cone[field]+=.01;
    assert.notStrictEqual(pineConeGeometry(cone),before);
  }
});
