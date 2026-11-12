import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawRoadMarkings,roadMarkingGeometry} from '../neon-city/road-marking-geometry.js';

// Original street() formulas, including quad() vertex winding and colours.
function original(x,z,face){
  const quad=(x,y,z,w,d,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);
  for(let t=12;t+4<=56;t+=12){quad(x-.09,.025,z+t,.18,4,'#b09485');quad(x+t,.025,z-.09,4,.18,'#b09485');}
  for(let i=-5;i<=5;i++){quad(x+i*1.4-.325,.03,z+9.5,.65,2.7,'#81798a');quad(x+9.5,.03,z+i*1.4-.325,2.7,.65,'#81798a');}
}

test('road markings preserve layout, winding, elevation, colours and drawing order',()=>{
  for(const x of [0,64,-64,1280,-4096,640000])for(const z of [0,-128,192,640000]){
    const before=[],after=[];
    original(x,z,(vertices,color)=>before.push({vertices,color}));
    drawRoadMarkings(x,z,(vertices,color)=>after.push({vertices,color}));
    assert.equal(after.length,30);
    before.forEach((face,f)=>{
      assert.equal(after[f].color,face.color);
      assert.equal(after[f].vertices.length,4);
      face.vertices.forEach((vertex,i)=>{
        for(const axis of ['x','y','z']){
          const a=after[f].vertices[i][axis],b=vertex[axis];
          // Moving translation after template generation can change rounding.
          assert.ok(Math.abs(a-b)<=Number.EPSILON*Math.max(1,Math.abs(b))*4,`${axis}: ${a} vs ${b}`);
        }
      });
    });
  }
});

test('one typed array template is reused across every street and draw call',()=>{
  const template=roadMarkingGeometry(),snapshot=template.slice();
  assert.ok(template instanceof Float64Array);
  assert.equal(template.byteLength,2880);
  drawRoadMarkings(64,-128,vertices=>{vertices[0].x=999;});
  assert.strictEqual(roadMarkingGeometry(),template);
  assert.deepEqual(template,snapshot);
});
