import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeStaticScenery} from '../neon-city/three-static-scenery.js';
import {drawStreetGround} from '../neon-city/street-ground.js';
import {drawParkGround,drawParkBench,drawParkBush,drawParkStructures} from '../neon-city/parks.js';
import {drawBridgeFascias,drawRiverStructures} from '../neon-city/rivers.js';

const frame=chunks=>({city:{chunks:new Map(chunks.map(c=>[`${c.x},${c.z}`,c]))}});
function park(x=0,z=0){return {x,z,park:{path:[{x:x*64+16,z:z*64+25},{x:x*64+32,z:z*64+29},{x:x*64+48,z:z*64+36}],
  benches:[{x:x*64+26,z:z*64+25,tx:Math.SQRT1_2,tz:Math.SQRT1_2,nx:-Math.SQRT1_2,nz:Math.SQRT1_2}],
  bushes:[{x:x*64+35,z:z*64+34,radius:2}],cones:[],trees:[],sign:null}};}
function legacy(draw){
  const triangles=[];
  const face=(v,color)=>{for(let i=1;i<v.length-1;i++)triangles.push({points:[v[0],v[i],v[i+1]].map(p=>[p.x,p.y,-p.z]),color:new THREE.Color(color).toArray()});};
  const quad=(x,y,z,w,d,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);
  draw({face,quad});return triangles;
}
function retained(mesh,viewer){
  const {position:p,color:c,sceneryPoint:q,sceneryNormal:n}=mesh.geometry.attributes,result=[];
  for(let i=0;i<p.count;i+=3){
    if(n.getX(i)||n.getY(i)||n.getZ(i)){
      const dot=(viewer.x-q.getX(i))*n.getX(i)+(viewer.y-q.getY(i))*n.getY(i)+(-viewer.z-q.getZ(i))*n.getZ(i);
      if(dot<=0)continue;
    }
    result.push({points:[i,i+1,i+2].map(j=>[p.getX(j),p.getY(j),p.getZ(j)]),color:[c.getX(i),c.getY(i),c.getZ(i)]});
  }
  return result;
}
function same(actual,expected){
  assert.equal(actual.length,expected.length);
  actual.forEach((triangle,i)=>{
    triangle.points.forEach((p,v)=>p.forEach((value,a)=>assert.ok(Math.abs(value-expected[i].points[v][a])<3e-5)));
    triangle.color.forEach((value,c)=>assert.ok(Math.abs(value-expected[i].color[c])<1e-6));
  });
}

test('retained park benches and bushes reproduce custom face visibility, colors and vertices from all sides',()=>{
  for(const c of [park(),park(-2,1)]){
    const scene=new THREE.Scene(),scenery=createThreeStaticScenery(scene);
    try{
      scenery.beginFrame(frame([c]));scenery.drawPark(c);const mesh=scene.children[0];
      for(const offset of [[10,1.65,10],[55,1.65,55],[35,-.5,30],[24,.7,40]]){
        const viewer={x:c.x*64+offset[0],y:offset[1],z:c.z*64+offset[2]};
        same(retained(mesh,viewer),legacy(({face})=>{for(const b of c.park.benches)drawParkBench(b,face,viewer);for(const b of c.park.bushes)drawParkBush(b,face,viewer);}));
      }
      assert.equal(mesh.material.polygonOffset,true);
    }finally{scenery.dispose();}
  }
});

test('retained ordinary ground and park paths preserve pavement, kerbs, grass details and elevations without flowers',()=>{
  const chunks=[{x:1,z:-1},park(-1,2)],scene=new THREE.Scene(),scenery=createThreeStaticScenery(scene);
  try{
    scenery.beginFrame(frame(chunks));
    chunks.forEach(c=>{
      scenery.drawGround(c);const mesh=scene.getObjectByName(`static-ground:${c.x},${c.z}`);
      same(retained(mesh,{x:0,y:1.65,z:0}),legacy(h=>drawStreetGround(c,{...h,nativeFlowers:true})));
      assert.equal(mesh.material.polygonOffset,false);
    });
    // Independently preserve the original street detail formulas, not just the
    // extracted helper: all seams and storefront patches retain their extents.
    const expected=legacy(({quad})=>{
      const x=64,z=-64;quad(x+8,.04,z+8,48,48,'#414052');quad(x+8,.06,z+8,48,.25,'#777185');quad(x+8,.06,z+8,.25,48,'#777185');
      for(let i=10;i<56;i+=6){quad(x+i,.07,z+8,.06,6,'#272739');quad(x+8,.07,z+i,6,.06,'#272739');}
      quad(x+16,.08,z+9,12,3,'#57354f');quad(x+9,.08,z+35,3,10,'#294755');
    });
    same(retained(scene.getObjectByName('static-ground:1,-1'),{x:0,y:0,z:0}),expected);
  }finally{scenery.dispose();}
});

test('retained bridge fascias and undersides preserve lower clipping and water-facing rules on both river halves',()=>{
  const scene=new THREE.Scene(),scenery=createThreeStaticScenery(scene);
  try{
    const chunks=[0,-1,1].flatMap(x=>[4,5].map(z=>({x,z,river:true,riverStart:4})));
    scenery.beginFrame(frame(chunks));
    for(const c of chunks){
      scenery.drawBridges(c);const mesh=scene.getObjectByName(`static-bridge:${c.x},${c.z}`);
      for(const x of [c.x*64+5,c.x*64+32,c.x*64+60]){
        const viewer={x,y:1.65,z:c.z*64+32};
        same(retained(mesh,viewer),legacy(({face})=>{drawBridgeFascias(c,{face},viewer,true);drawRiverStructures(c,{face},viewer);}));
      }
    }
  }finally{scenery.dispose();}
});

test('static buffers survive camera changes, hidden frames and interaction state; unloading releases geometry exactly once',()=>{
  let visible=true;const scene=new THREE.Scene(),scenery=createThreeStaticScenery(scene,{boundsVisible:()=>visible}),c=park(),state=frame([c]);
  scenery.beginFrame(state);scenery.drawGround(c);scenery.drawPark(c);
  const meshes=[...scene.children],snapshots=meshes.map(m=>[m.geometry,m.geometry.attributes.position.version,m.geometry.attributes.sceneryNormal.version]);
  let released=0;for(const mesh of meshes)mesh.geometry.addEventListener('dispose',()=>released++);
  for(let i=0;i<20;i++){
    visible=i%2===0;c.park.bushes[0].stage=i%3;scenery.beginFrame(state);scenery.drawGround({...c});scenery.drawPark({...c});
    meshes.forEach((mesh,j)=>{assert.equal(mesh.visible,visible);assert.equal(mesh.geometry,snapshots[j][0]);assert.equal(mesh.geometry.attributes.position.version,snapshots[j][1]);assert.equal(mesh.geometry.attributes.sceneryNormal.version,snapshots[j][2]);});
  }
  assert.equal(released,0);scenery.beginFrame(frame([]));assert.equal(scene.children.length,0);assert.equal(released,2);
  scenery.dispose();scenery.dispose();assert.equal(released,2);
});

test('park delegation skips legacy bench and bush emission while leaving other native hooks intact',()=>{
  const c=park();let calls=0,faces=0;
  drawParkStructures(c,{face(){faces++;},drawParkScenery(received){assert.equal(received,c);calls++;},drawTrees(){},nativeCones:true},{x:0,y:1.65,z:0});
  assert.equal(calls,1);assert.equal(faces,0);
});
