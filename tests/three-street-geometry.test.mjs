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


test('river-facing bridge sidewalk corners and kerbs share a rounded outline on both banks',()=>{
  const scene=new THREE.Scene(),roads=createThreeRoads(scene),row=RIVER_ROWS[0];
  try{
    roads.beginFrame();roads.draw({x:0,z:row,riverStart:row,river:true});roads.endFrame();
    scene.updateMatrixWorld(true);
    const bridge=scene.getObjectByName(`bridge:0,${row}`);
    const approaches=bridge.children.filter(mesh=>mesh.name==='bridge-approach-pavement');
    assert.equal(approaches.length,4);
    assert.ok(approaches.every(mesh=>mesh.geometry===approaches[0].geometry),'corners reuse one geometry');
    for(const mesh of approaches){
      const positions=mesh.geometry.attributes.position,points=[];
      for(let i=0;i<positions.count;i++){
        const p=new THREE.Vector3().fromBufferAttribute(positions,i);
        assert.ok(p.x>=-1e-6&&p.x<=6&&-p.z>=-1e-6&&-p.z<=10);
        if(p.x<2&&-p.z<2)assert.ok(Math.abs(Math.hypot(p.x-2,-p.z-2)-2)<1e-5);
        points.push(p.applyMatrix4(mesh.matrixWorld));
      }
      assert.ok(points.every(p=>Math.abs(p.y-.075)<1e-6));
      assert.ok(points.some(p=>Math.abs(p.x)>8&&Math.abs(p.x)<10),'curve replaces the square road corner');
    }
    const kerbs=bridge.children.filter(mesh=>mesh.name==='riverside-kerb');
    assert.equal(kerbs.length,4);
    assert.ok(kerbs.every(mesh=>mesh.geometry.attributes.position.count>12));
  }finally{roads.dispose();}
});

test('ice cream vans occupy alternate bridge gaps on both banks, stay solid and release scene resources',async()=>{
  const {riverIceCreamVan,RIVER_ROWS,BLOCK,City}=await import('../neon-city/world.js');
  const {flowersFor}=await import('../neon-city/flowers.js');
  const {createThreeIceCreamVans}=await import('../neon-city/three-ice-cream-vans.js');
  const city=new City(42),start=RIVER_ROWS[0],chunks=[];
  for(let gap=-4;gap<=4;gap++)for(const first of [true,false]){
    const chunk={x:gap*3+1,z:start+(first?0:1),river:true,riverStart:start};
    const van=riverIceCreamVan(chunk);assert.equal(!!van,((gap%2)+2)%2===0);
    if(!van)continue;
    assert.equal(riverIceCreamVan(chunk),van);assert.equal(van.x,(gap*3+1.5)*BLOCK);
    assert.equal(city.solid(van.x,van.z+(van.first?1:-1)),true);assert.equal(city.solid(van.x+4,van.z),false);
    for(const flower of flowersFor(chunk))assert.ok(Math.abs(flower.x-van.x)>=van.w/2+.4||Math.abs(flower.z-van.z)>=van.d/2+.4);
    chunks.push(chunk);
  }
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
  const scene=new THREE.Scene(),vans=createThreeIceCreamVans(scene);
  try{
    const frame={city:{chunks:new Map(chunks.map(c=>[`${c.x},${c.z}`,c]))}};
    vans.beginFrame(frame);for(const chunk of chunks)vans.draw(chunk);
    assert.equal(scene.children.length,chunks.length*4);
    const geometry=scene.children[0].geometry;
    geometry.computeBoundingBox();assert.ok(Math.abs(geometry.boundingBox.max.y-3.7*1.2)<1e-5);
    const sign=scene.children.find(m=>m.material.map).geometry;sign.computeBoundingBox();
    assert.ok(Math.abs(sign.boundingBox.min.y-2.39)<1e-5);assert.ok(Math.abs(sign.boundingBox.max.y-2.91)<1e-5);
    assert.ok(scene.children.filter(m=>m.geometry===geometry).length===chunks.length);
    const resources=new Set(scene.children.flatMap(m=>[m.geometry,m.material,m.material.map].filter(Boolean)));
    let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
    vans.beginFrame({city:{chunks:new Map()}});assert.equal(scene.children.length,0);
    vans.dispose();vans.dispose();assert.equal(disposed,resources.size);
  }finally{vans.dispose();globalThis.document=previous;}
});

test('rear doors open into a walkable street van on either bank without allowing passage through its walls',async()=>{
  const {City,riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const {interactIceCreamVanDoor,iceCreamVanLocal,iceCreamVanFloor,ICE_CREAM_VAN}=await import('../neon-city/ice-cream-vans.js');
  for(const first of [true,false]){
    const city=new City(42),chunk={x:1,z:RIVER_ROWS[0]+(first?0:1),river:true,riverStart:RIVER_ROWS[0]};
    city.chunks.set(`${chunk.x},${chunk.z}`,chunk);
    const van=riverIceCreamVan(chunk),sign=first?1:-1;
    const player={x:van.x-4.2*sign,z:van.z,angle:sign*Math.PI/2};
    city.move(player,2*sign,0);assert.ok(iceCreamVanLocal(van,player).x<ICE_CREAM_VAN.rear);
    player.angle=-sign*Math.PI/2;assert.equal(interactIceCreamVanDoor(player,van),null);
    player.angle=sign*Math.PI/2;assert.equal(interactIceCreamVanDoor(player,van),'THE VAN DOOR IS OPEN.');
    city.move(player,3.2*sign,0);
    assert.ok(iceCreamVanLocal(van,player).x>ICE_CREAM_VAN.rear+1);
    assert.equal(player.riverWalk,undefined);assert.equal(iceCreamVanFloor(van,player),ICE_CREAM_VAN.floor);
    const x=player.x;city.move(player,0,3*sign);
    assert.ok(Math.abs(iceCreamVanLocal(van,player).z)<ICE_CREAM_VAN.halfWidth);
    assert.equal(player.x,x);
    player.z=van.z;city.move(player,-4.1*sign,0);
    assert.ok(iceCreamVanLocal(van,player).x<ICE_CREAM_VAN.rear-1);
    assert.equal(iceCreamVanFloor(van,player),0);
    assert.equal(interactIceCreamVanDoor(player,van),'THE VAN DOOR IS CLOSED.');
  }
});
