import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeCarModels,createThreeTraffic} from '../neon-city/three-cars.js';
import {createThreeRoads} from '../neon-city/three-roads.js';
import {createThreeRailings} from '../neon-city/three-railings.js';
import {RIVER_ROWS,bridgeHeight,hasBridge} from '../neon-city/world.js';

const textureFor=()=>({width:160,height:80});
test('native vehicle models cover all types and directions and reuse their geometry',()=>{
  const models=createThreeCarModels({textureFor});
  try{
    for(const type of ['car','hippie-van','mercedes','taxi'])for(const axis of [0,1])for(const dir of [-1,1]){
      const car={type,axis,dir,color:'#123456'},asset=models.get(car);
      assert.equal(models.get({...car,x:100,z:-200,turn:{angle:.5}}).group,asset.group);
      const solid=asset.group.children.find(mesh=>mesh.geometry.attributes.color);
      assert.ok(solid.geometry.attributes.position.count>100);
      for(const mesh of asset.group.children){
        const vertices=mesh.geometry.attributes.position.array;
        assert.ok(vertices.every(Number.isFinite));
      }
      assert.ok(new THREE.Box3().setFromObject(asset.group).getSize(new THREE.Vector3()).y>1);
    }
  }finally{models.dispose();}
});

test('native traffic retains models across bridge slopes and turns and removes departed cars',()=>{
  const scene=new THREE.Scene(),traffic=createThreeTraffic(scene,{textureFor});
  const car={type:'taxi',axis:0,dir:1,color:'#123456',x:12,z:34};
  try{
    traffic.beginFrame();traffic.draw(car,{base:2,slope:.2});traffic.endFrame();
    const actor=scene.getObjectByName('street-car'),geometry=actor.children[0].geometry;
    car.turn={angle:.5};car.x=15;
    traffic.beginFrame();traffic.draw(car,{base:3,slope:.1});traffic.endFrame();
    assert.equal(scene.getObjectByName('street-car'),actor);assert.equal(actor.children[0].geometry,geometry);
    assert.equal(actor.matrix.elements[12],15);assert.equal(actor.matrix.elements[13],3);assert.equal(actor.matrix.elements[14],-34);
    traffic.beginFrame();traffic.endFrame();assert.equal(scene.children.length,0);
  }finally{traffic.dispose();}
});

test('native roads and railings own shared bridge meshes and retain them between frames',()=>{
  for(const x of [-3,-1,0,1,2,3]){
    const scene=new THREE.Scene(),roads=createThreeRoads(scene),railings=createThreeRailings(scene),row=RIVER_ROWS[0];
    const draw=part=>{const chunk={x,z:row+part,riverStart:row,river:true};roads.draw(chunk);railings.draw(chunk);};
    try{
      roads.beginFrame();railings.beginFrame();draw(0);draw(1);roads.endFrame();railings.endFrame();
      const bank=scene.getObjectByName(`riverside:${x},${row}`);
      assert.ok(bank.getObjectByName('riverside-grass'));assert.ok(bank.getObjectByName('riverside-pavement'));
      for(const street of [x,x+1]){
        const bridge=scene.getObjectByName(`bridge:${street},${row}`),railing=scene.getObjectByName(`bridge-railings:${street},${row}`);
        assert.equal(!!bridge,hasBridge(street));assert.equal(!!railing,hasBridge(street));
        if(!bridge)continue;
        const deck=bridge.getObjectByName('bridge-asphalt');scene.updateMatrixWorld(true);
        const p=deck.geometry.attributes.position;
        for(let i=0;i<p.count;i++){
          const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(deck.matrixWorld);
          assert.ok(Math.abs(v.y-bridgeHeight(-v.z)-.075)<1e-5);
        }
        assert.ok(bridge.getObjectByName('bridge-lane-dash').isInstancedMesh);
      }
      roads.beginFrame();railings.beginFrame();draw(0);roads.endFrame();railings.endFrame();
      assert.equal(scene.getObjectByName(`riverside:${x},${row}`),bank);
      roads.beginFrame();railings.beginFrame();roads.endFrame();railings.endFrame();assert.equal(scene.children.length,0);
    }finally{roads.dispose();railings.dispose();}
  }
});

test('ordinary streets retain native lane markings and crossing stripes',()=>{
  const scene=new THREE.Scene(),roads=createThreeRoads(scene);
  try{
    roads.beginFrame();roads.draw({x:0,z:0});roads.endFrame();
    const street=scene.getObjectByName('street:0,0');
    const paint=street.children.filter(mesh=>mesh.isInstancedMesh);
    assert.ok(paint.length>=2);assert.ok(paint.every(mesh=>mesh.count>0));
    const snapshots=paint.map(mesh=>mesh.geometry);
    roads.beginFrame();roads.draw({x:0,z:0});roads.endFrame();
    assert.deepEqual(paint.map(mesh=>mesh.geometry),snapshots);
  }finally{roads.dispose();}
});
