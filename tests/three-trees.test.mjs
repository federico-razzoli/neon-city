import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeTrees} from '../neon-city/three-trees.js';
import {drawTreeGeometry} from '../neon-city/tree-geometry.js';
import {drawParkStructures} from '../neon-city/parks.js';

const chunk=(x=0)=>({x,z:0,park:{trees:[{x:x*64+20,z:25,scale:1.1},{x:x*64+40,z:35,scale:.9}]}});
const frame=chunks=>({city:{chunks:new Map(chunks.map(c=>[`${c.x},${c.z}`,c]))}});

test('trees share retained GPU geometry and never rewrite instance matrices on camera frames',()=>{
  const scene=new THREE.Scene(),trees=createThreeTrees(scene),a=chunk(),b=chunk(1),state=frame([a,b]);
  try{
    trees.beginFrame(state);trees.draw(a);trees.draw(b);
    const [first,second]=scene.children;
    assert.equal(first.isInstancedMesh,true);assert.equal(first.count,2);
    assert.equal(first.geometry,second.geometry);assert.equal(first.material,second.material);
    const matrix=new THREE.Matrix4();first.getMatrixAt(0,matrix);
    assert.ok(Math.abs(matrix.elements[0]-1.1)<1e-6);assert.equal(matrix.elements[12],20);assert.equal(matrix.elements[14],-25);
    const positions=first.geometry.attributes.position,matrices=first.instanceMatrix;
    const versions=[positions.version,matrices.version];
    trees.beginFrame(state);trees.draw(a);trees.draw(b);
    assert.equal(scene.children[0],first);assert.equal(first.instanceMatrix,matrices);
    assert.deepEqual([positions.version,matrices.version],versions);
    trees.beginFrame(state);assert.equal(first.visible,false);trees.draw(a);assert.equal(first.visible,true);
  }finally{trees.dispose();}
});

test('tree instances unload with their park and release shared resources once',()=>{
  const scene=new THREE.Scene(),trees=createThreeTrees(scene),a=chunk(),b=chunk(1);
  trees.beginFrame(frame([a,b]));trees.draw(a);trees.draw(b);
  const [first,second]=scene.children;let instances=0,geometry=0,material=0;
  first.addEventListener('dispose',()=>instances++);second.addEventListener('dispose',()=>instances++);
  first.geometry.addEventListener('dispose',()=>geometry++);first.material.addEventListener('dispose',()=>material++);
  trees.beginFrame(frame([b]));assert.equal(instances,1);assert.equal(geometry,0);assert.equal(scene.children.length,1);
  trees.dispose();assert.equal(instances,2);assert.equal(geometry,1);assert.equal(material,1);assert.equal(scene.children.length,0);
});

test('GPU front faces preserve the original tree silhouette and shaded surfaces',()=>{
  const scene=new THREE.Scene(),trees=createThreeTrees(scene),c=chunk();c.park.trees=c.park.trees.slice(0,1);
  trees.beginFrame(frame([c]));trees.draw(c);
  try{
    const mesh=scene.children[0],positions=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color;
    const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);
    for(const viewer of [{x:5,y:1.65,z:5},{x:40,y:25,z:40}]){
      const eye=new THREE.Vector3(viewer.x,viewer.y,-viewer.z),actual=[],expected=[];
      for(let i=0;i<positions.count;i+=3){
        const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,i+j).applyMatrix4(matrix));
        const normal=new THREE.Vector3().subVectors(points[1],points[0]).cross(new THREE.Vector3().subVectors(points[2],points[0]));
        if(normal.dot(new THREE.Vector3().subVectors(eye,points[0]))>1e-7)actual.push({points,color:new THREE.Color().fromBufferAttribute(colors,i)});
      }
      drawTreeGeometry(c.park.trees[0],(vertices,color)=>{
        for(let i=1;i<vertices.length-1;i++)expected.push({points:[vertices[0],vertices[i],vertices[i+1]].map(p=>new THREE.Vector3(p.x,p.y,-p.z)),color:new THREE.Color(color)});
      },viewer);
      assert.equal(actual.length,expected.length);
      for(let i=0;i<actual.length;i++){
        assert.ok(actual[i].points.every(p=>expected[i].points.some(q=>p.distanceTo(q)<1e-5)));
        assert.ok(actual[i].color.toArray().every((v,j)=>Math.abs(v-expected[i].color.toArray()[j])<1e-6));
      }
    }
  }finally{trees.dispose();}
});

test('park rendering delegates trees to retained meshes without duplicating legacy faces',()=>{
  const c=chunk();Object.assign(c.park,{cones:[],benches:[],sign:null,bushes:[]});let calls=0,faces=0;
  drawParkStructures(c,{face(){faces++;},drawTrees(received){assert.equal(received,c);calls++;}},{x:0,y:1.65,z:0});
  assert.equal(calls,1);assert.equal(faces,0);
});

test('bookshop window bounds can hide tree instances without rebuilding them',()=>{
  let visible=false;const scene=new THREE.Scene(),trees=createThreeTrees(scene,{boundsVisible:()=>visible}),c=chunk();
  try{
    trees.beginFrame(frame([c]));trees.draw(c);const mesh=scene.children[0];assert.equal(mesh.visible,false);
    visible=true;trees.beginFrame(frame([c]));trees.draw(c);assert.equal(scene.children[0],mesh);assert.equal(mesh.visible,true);
  }finally{trees.dispose();}
});
