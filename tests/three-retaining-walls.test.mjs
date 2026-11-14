import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeRetainingWalls} from '../neon-city/three-retaining-walls.js';
import {drawCachedRiverbankFaces} from '../neon-city/riverbank-geometry.js';
import {BLOCK,RIVER_ROWS} from '../neon-city/world.js';
const chunk=(x,part=0,row=RIVER_ROWS[0])=>({x,z:row+part,riverStart:row,river:true});
const frame=chunks=>({city:{chunks:new Map(chunks.map(c=>[`${c.x},${c.z}`,c]))}});
const waterSide=c=>({z:c.riverStart*BLOCK+(c.z===c.riverStart?19:109)});

test('retained wall panels match legacy colours and doorway cutouts on both banks',()=>{
  const scene=new THREE.Scene(),walls=createThreeRetainingWalls(scene);
  try{
    for(const row of RIVER_ROWS)for(const part of [0,1])for(const x of [-3,-2,-1,0,1,2,3]){
      const c=chunk(x,part,row);walls.beginFrame(frame([c]));walls.draw(c,waterSide(c));
      const mesh=scene.children[0];mesh.updateMatrixWorld(true);
      const expected=[],rgb=[];
      drawCachedRiverbankFaces(c,(points,tint)=>{
        const color=new THREE.Color(tint);
        for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){expected.push(p.x,p.y,-p.z);rgb.push(color.r,color.g,color.b);}
      },true);
      const p=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color.array;
      assert.equal(p.count*3,expected.length);
      for(let i=0;i<p.count;i++){
        const actual=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray();
        actual.forEach((v,j)=>assert.ok(Math.abs(v-expected[i*3+j])<1e-5));
      }
      rgb.forEach((v,i)=>assert.ok(Math.abs(v-colors[i])<1e-6));
    }
  }finally{walls.dispose();}
});

test('matching layouts share GPU geometry and camera movement does not upload it again',()=>{
  const scene=new THREE.Scene(),walls=createThreeRetainingWalls(scene),a=chunk(0),b=chunk(3);
  const state=frame([a,b]);
  try{
    walls.beginFrame(state);walls.draw(a,waterSide(a));walls.draw(b,waterSide(b));
    const [first,second]=scene.children;assert.equal(first.geometry,second.geometry);assert.equal(first.material,second.material);
    const position=first.geometry.attributes.position,version=position.version,matrix=first.matrix.clone();
    walls.beginFrame(state);walls.draw({...a},waterSide(a));walls.draw(b,waterSide(b));
    assert.equal(scene.children[0],first);assert.equal(first.geometry.attributes.position,position);assert.equal(position.version,version);assert.deepEqual(first.matrix,matrix);
    walls.beginFrame(state);walls.draw(a,{z:a.riverStart*BLOCK+17});assert.equal(first.visible,false,'hidden from the land side');
  }finally{walls.dispose();}
});

test('wall instances unload while shared meshes persist until scene disposal',()=>{
  const scene=new THREE.Scene(),walls=createThreeRetainingWalls(scene),a=chunk(0),b=chunk(3);
  walls.beginFrame(frame([a,b]));walls.draw(a,waterSide(a));walls.draw(b,waterSide(b));
  const geometry=scene.children[0].geometry,material=scene.children[0].material;let geometries=0,materials=0;
  geometry.addEventListener('dispose',()=>geometries++);material.addEventListener('dispose',()=>materials++);
  walls.beginFrame(frame([b]));assert.equal(scene.children.length,1);assert.equal(geometries,0);
  walls.dispose();assert.equal(scene.children.length,0);assert.equal(geometries,1);assert.equal(materials,1);
});

test('bookshop window culling hides and restores retained walls',()=>{
  let visible=false;const scene=new THREE.Scene(),walls=createThreeRetainingWalls(scene,{boundsVisible:()=>visible}),c=chunk(0,1);
  try{
    walls.beginFrame(frame([c]));walls.draw(c,waterSide(c));const mesh=scene.children[0];assert.equal(mesh.visible,false);
    visible=true;walls.beginFrame(frame([c]));walls.draw(c,waterSide(c));assert.equal(scene.children[0],mesh);assert.equal(mesh.visible,true);
    walls.beginFrame(frame([c]));walls.draw(c,{z:c.riverStart*BLOCK+111});assert.equal(mesh.visible,false,'south bank hidden from land too');
  }finally{walls.dispose();}
});
