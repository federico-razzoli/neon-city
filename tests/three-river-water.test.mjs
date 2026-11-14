import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeRiverWater} from '../neon-city/three-river-water.js';
import {drawRiverTerrain} from '../neon-city/rivers.js';
import {BLOCK,RIVER_ROWS,RIVER_WIDTH,WATER_LEVEL} from '../neon-city/world.js';

import {riverSchoolPlacements,RIVER_FISH_FORMATIONS} from '../neon-city/three-river-fish.js';

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
test('occasional submerged schools animate, stay inside their chunk, and unload',()=>{
  const scene=new THREE.Scene(),water=createThreeRiverWater(scene);
  water.beginFrame({time:0});
  for(let x=-9;x<9;x++)for(const part of [0,1])water.draw(chunk(x,part));
  water.endFrame();
  const schools=scene.children.filter(child=>child.name==='river-fish-school');
  assert.ok(schools.length>0&&schools.length<21);
  const school=schools[0],fish=school.children[0],tail=fish.children[1];
  assert.ok(school.children.length===7);
  const oldPosition=school.position.clone(),oldTail=tail.rotation.y;
  water.beginFrame({time:5});
  for(let x=-9;x<9;x++)for(const part of [0,1])water.draw(chunk(x,part));
  water.endFrame();
  assert.notDeepEqual(school.position,oldPosition);assert.notEqual(tail.rotation.y,oldTail);
  for(const school of schools){
    assert.ok(school.position.y<WATER_LEVEL);
    assert.ok(-school.position.z>row*BLOCK+18+3);
    assert.ok(-school.position.z<row*BLOCK+18+RIVER_WIDTH-3);
  }
  const material=scene.getObjectByName('river-water').children[0].material;
  assert.equal(material.transparent,true);assert.equal(material.depthWrite,false);
  water.beginFrame({time:6});water.endFrame();
  assert.equal(scene.children.filter(child=>child.name==='river-fish-school').length,0);
  water.dispose();assert.equal(scene.children.length,0);
});

test('bridge spans contain one or two randomly placed schools with three fixed formations',()=>{
  const configurations=new Set();let underBridge=false;
  for(let span=-30;span<30;span++){
    const placements=riverSchoolPlacements(12345,span,row);
    assert.ok(placements.length===1||placements.length===2);
    assert.deepEqual(placements,riverSchoolPlacements(12345,span,row));
    assert.notDeepEqual(placements,riverSchoolPlacements(54321,span,row));
    for(const p of placements){
      assert.ok(p.x>=span*3*BLOCK&&p.x<(span+1)*3*BLOCK);
      assert.ok(p.z>=row*BLOCK+25&&p.z<=row*BLOCK+18+RIVER_WIDTH-7);
      configurations.add(p.configuration);
      const offset=p.x-span*3*BLOCK;
      if(offset<14||offset>3*BLOCK-14)underBridge=true;
    }
  }
  assert.equal(configurations.size,3);assert.ok(underBridge);
  assert.deepEqual(RIVER_FISH_FORMATIONS.map(f=>f.length),[7,7,7]);
});
