import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeRiverWater} from '../neon-city/three-river-water.js';
import {drawRiverTerrain} from '../neon-city/rivers.js';
import {BLOCK,RIVER_ROWS,WATER_LEVEL} from '../neon-city/world.js';

const row=RIVER_ROWS[0],chunk=(x,part)=>({x,z:row+part,riverStart:row});
test('native water meets both banks, shares its resources, and releases unloaded chunks',()=>{
  const scene=new THREE.Scene(),water=createThreeRiverWater(scene),group=scene.getObjectByName('river-water');
  water.beginFrame({time:3});for(const part of [0,1])water.draw(chunk(0,part));water.endFrame();
  const [a,b]=group.children;
  assert.equal(a.material,b.material);assert.equal(a.geometry,b.geometry);
  assert.equal(a.position.y,WATER_LEVEL);
  const halfDepth=a.geometry.parameters.height/2;
  assert.equal(-a.position.z-a.scale.z*halfDepth,row*BLOCK+18);
  assert.equal(-a.position.z+a.scale.z*halfDepth,-b.position.z-b.scale.z*halfDepth);
  assert.equal(-b.position.z+b.scale.z*halfDepth,row*BLOCK+110);
  assert.equal(a.material.uniforms.time.value,3);
  water.beginFrame({time:4});water.draw(chunk(0,1));water.endFrame();assert.deepEqual(group.children,[b]);
  let geometryDisposed=false,materialDisposed=false;
  a.geometry.addEventListener('dispose',()=>geometryDisposed=true);a.material.addEventListener('dispose',()=>materialDisposed=true);
  water.dispose();assert.equal(scene.children.length,0);assert.ok(geometryDisposed&&materialDisposed);
});
test('native water skips legacy water tiles and ripples while preserving riverbank terrain',()=>{
  const quads=[];let faces=0;
  drawRiverTerrain(chunk(0,0),{nativeWater:true,quad:(...q)=>quads.push(q),face:()=>faces++},0);
  assert.equal(faces,0);assert.ok(quads.length>0);assert.ok(quads.every(q=>q[1]!==WATER_LEVEL));
});
