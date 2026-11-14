import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeManholes} from '../neon-city/three-manholes.js';
import {manholeGeometry} from '../neon-city/manhole-geometry.js';
const chunk=(x=0)=>({x,z:0,manholes:[{x:x*64+10,z:12,radius:.65},{x:x*64+20,z:25,radius:.65}]});
const frame=chunks=>({city:{chunks:new Map(chunks.map(c=>[c.x,c]))}});

test('covers share radius geometry and retain unchanged GPU buffers across frames',()=>{
  const scene=new THREE.Scene(),covers=createThreeManholes(scene),a=chunk(),b=chunk(1),state=frame([a,b]);
  try{
    covers.beginFrame(state);covers.draw(a);covers.draw(b);const [first,second]=scene.children;
    assert.equal(first.isInstancedMesh,true);assert.equal(first.count,2);assert.equal(first.geometry,second.geometry);assert.equal(first.material,second.material);
    const matrix=new THREE.Matrix4();first.getMatrixAt(1,matrix);assert.equal(matrix.elements[12],20);assert.equal(matrix.elements[14],-25);
    const position=first.geometry.attributes.position,instances=first.instanceMatrix,versions=[position.version,instances.version];
    covers.beginFrame(state);assert.equal(first.visible,false);covers.draw(a);covers.draw(b);
    assert.equal(scene.children[0],first);assert.equal(first.visible,true);assert.deepEqual([position.version,instances.version],versions);
  }finally{covers.dispose();}
});

test('retained geometry preserves all three disks, slots, elevations and colours',()=>{
  const scene=new THREE.Scene(),covers=createThreeManholes(scene),c=chunk();c.manholes.push({x:30,z:20,radius:.8});
  covers.beginFrame(frame([c]));covers.draw(c);
  try{
    assert.equal(scene.children.length,2,'different radii use separate shared models');
    for(const mesh of scene.children){
      const radius=Number(mesh.name.split(':').at(-1)),source=manholeGeometry(radius),expected=[],rgb=[];
      function face(points,tint){const color=new THREE.Color(tint);for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){expected.push(...p);rgb.push(color.r,color.g,color.b);}}
      for(const [layer,y,color] of [[0,.09,'#171923'],[1,.091,'#777482'],[2,.092,'#343541']])face(Array.from({length:16},(_,i)=>[source[layer*32+i*2],y,-source[layer*32+i*2+1]]),color);
      for(let i=0;i<3;i++){const z=(i-1)*.25-.025,len=source[96+i];face([[-len/2,.093,-z],[len/2,.093,-z],[len/2,.093,-z-.05],[-len/2,.093,-z-.05]],'#161923');}
      const actual=mesh.geometry.attributes.position.array,colors=mesh.geometry.attributes.color.array;
      assert.equal(actual.length,expected.length);assert.equal(actual.length,48*3*3);
      expected.forEach((v,i)=>assert.ok(Math.abs(actual[i]-v)<1e-6));rgb.forEach((v,i)=>assert.ok(Math.abs(colors[i]-v)<1e-6));
    }
  }finally{covers.dispose();}
});

test('chunk unload releases instances while shared geometry lives until scene disposal',()=>{
  const scene=new THREE.Scene(),covers=createThreeManholes(scene),a=chunk(),b=chunk(1);covers.beginFrame(frame([a,b]));covers.draw(a);covers.draw(b);
  const [first,second]=scene.children;let instances=0,geometry=0,material=0;
  for(const mesh of [first,second])mesh.addEventListener('dispose',()=>instances++);
  first.geometry.addEventListener('dispose',()=>geometry++);first.material.addEventListener('dispose',()=>material++);
  covers.beginFrame(frame([b]));assert.equal(instances,1);assert.equal(geometry,0);assert.equal(scene.children.length,1);
  covers.dispose();assert.equal(instances,2);assert.equal(geometry,1);assert.equal(material,1);assert.equal(scene.children.length,0);
});

test('window culling hides and restores retained covers without rebuilding',()=>{
  let visible=false;const scene=new THREE.Scene(),covers=createThreeManholes(scene,{boundsVisible:()=>visible}),c=chunk();
  try{
    covers.beginFrame(frame([c]));covers.draw(c);const mesh=scene.children[0];assert.equal(mesh.visible,false);
    visible=true;covers.beginFrame(frame([c]));covers.draw(c);assert.equal(scene.children[0],mesh);assert.equal(mesh.visible,true);
  }finally{covers.dispose();}
});
