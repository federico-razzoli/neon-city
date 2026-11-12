import {test} from 'node:test';
import assert from 'node:assert/strict';
import {band,drawParkStructures} from '../neon-city/parks.js';
import {treeGeometry,drawTreeGeometry} from '../neon-city/tree-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';

// Original tree() formulas. band() remains the original renderer used by other
// park objects, including its trigonometry, lighting and visibility tests.
const BARK=['#2a1f27','#35272c','#423133','#4d3a39'];
const PINE=['#122a24','#163228','#1b3a2d','#214432','#284e38'];
const TIERS=[[3,3.6,6.6,1.5],[6.6,3,10,1.2],[10,2.4,13.2,.9],[13.2,1.8,16,.6],[16,1.15,18,0]];
function original(t,face,viewer){
  const s=t.scale;
  band(face,viewer,t,0,t.radius,TIERS[0][0]*s,.3*s,BARK,{sides:6,top:false});
  for(const [y0,r0,y1,r1] of TIERS)band(face,viewer,t,y0*s,r0*s,y1*s,r1*s,PINE);
}

test('whole tree template preserves trunk, tiers, caps, shading, winding and visibility',()=>{
  for(const scale of [.9,.937246,1,1.08372,1.2])for(const [x,z] of [[0,0],[128,-64],[-4096,8192],[640000,-640000]]){
    const tree={x,z,scale,radius:.45*scale};
    for(const angle of [-2.8,-1.9,-1.1,-.3,.3,1.1,1.9,2.8])for(const eye of [-1,0,1.65,3*scale,6.6*scale,10*scale,13.2*scale,16*scale,18*scale,25])for(const distance of [.2,6,30]){
      const viewer={x:x+Math.sin(angle)*distance,y:eye,z:z+Math.cos(angle)*distance};
      const before=[],after=[];
      original(tree,(vertices,color)=>before.push({vertices,color}),viewer);
      drawTreeGeometry(tree,(vertices,color)=>after.push({vertices,color}),viewer);
      assert.equal(after.length,before.length,`scale ${scale}, eye ${eye}, angle ${angle}`);
      before.forEach((face,f)=>{
        assert.equal(after[f].color,face.color,`face ${f}: shade`);
        assert.equal(after[f].vertices.length,face.vertices.length,`face ${f}: count`);
        face.vertices.forEach((vertex,i)=>{
          for(const axis of ['x','y','z']){
            const a=after[f].vertices[i][axis],b=vertex[axis];
            assert.ok(Math.abs(a-b)<=Number.EPSILON*Math.max(1,Math.abs(b))*8,`${axis}: ${a} vs ${b}`);
          }
        });
      });
    }
  }
});

test('all tree scales share one template that survives scratch reuse and drawing',()=>{
  const geometry=treeGeometry(),snapshot=geometry.slice();
  assert.ok(geometry instanceof Float64Array);
  assert.equal(geometry.length,56*29);
  assert.equal(geometryWasm.tree_build(),56);
  geometryWasm.car_build(2,0,1);
  for(const scale of [.9,1,1.2]){
    drawTreeGeometry({x:10,z:20,scale,radius:.45*scale},v=>{v[0].x=999;},{x:0,y:1.65,z:0});
    assert.strictEqual(treeGeometry(),geometry);
    assert.deepEqual(geometry,snapshot);
  }
});

test('park rendering uses the complete cached tree',()=>{
  const tree={x:32,z:32,scale:1.1,radius:.45*1.1},viewer={x:20,y:1.65,z:20};
  const before=[],after=[];
  original(tree,(vertices,color)=>before.push({vertices,color}),viewer);
  drawParkStructures({park:{cones:[],benches:[],sign:null,trees:[tree],bushes:[]}},
    {face:(vertices,color)=>after.push({vertices,color})},viewer);
  assert.equal(after.length,before.length);
  after.forEach((face,i)=>assert.equal(face.color,before[i].color));
});
