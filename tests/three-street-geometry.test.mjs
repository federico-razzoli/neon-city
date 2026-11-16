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
    const van=riverIceCreamVan(chunk);assert.equal(!!van,((gap%2)+2)%2===(first?0:1));
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
    assert.equal(scene.children.length,chunks.length*8);
    const geometry=scene.children[0].geometry;
    geometry.computeBoundingBox();assert.ok(Math.abs(geometry.boundingBox.max.y-3.7*1.2)<1e-5);
    const sign=scene.children.find(m=>m.material.map).geometry;sign.computeBoundingBox();
    assert.ok(Math.abs(sign.boundingBox.min.y-2.39)<1e-5);assert.ok(Math.abs(sign.boundingBox.max.y-2.91)<1e-5);
    assert.ok(scene.children.filter(m=>m.geometry===geometry).length===chunks.length);
    const vendor=scene.children.find(m=>m.name.startsWith('ice-cream-vendor:'));
    vendor.geometry.computeBoundingBox();assert.equal(vendor.geometry.boundingBox.min.z,0);assert.equal(vendor.geometry.boundingBox.max.z,0);
    const skin=new THREE.Color('#6e412c'),rgb=vendor.geometry.attributes.color;
    assert.ok(Array.from({length:rgb.count},(_,i)=>i).some(i=>Math.abs(rgb.getX(i)-skin.r)<1e-6&&Math.abs(rgb.getY(i)-skin.g)<1e-6&&Math.abs(rgb.getZ(i)-skin.b)<1e-6));
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
    const city=new City(42),chunk={x:first?1:4,z:RIVER_ROWS[0]+(first?0:1),river:true,riverStart:RIVER_ROWS[0]};
    city.chunks.set(`${chunk.x},${chunk.z}`,chunk);
    const van=riverIceCreamVan(chunk),sign=first?1:-1;
    const player={x:van.x-4.2*sign,z:van.z,angle:sign*Math.PI/2};
    city.move(player,2*sign,0);assert.ok(iceCreamVanLocal(van,player).x<ICE_CREAM_VAN.rear);
    player.angle=-sign*Math.PI/2;assert.equal(interactIceCreamVanDoor(player,van),null);
    player.angle=sign*Math.PI/2;assert.equal(interactIceCreamVanDoor(player,van),'');
    city.move(player,3.2*sign,0);
    assert.ok(iceCreamVanLocal(van,player).x>ICE_CREAM_VAN.rear+1);
    assert.equal(player.riverWalk,undefined);assert.equal(iceCreamVanFloor(van,player),ICE_CREAM_VAN.floor);
    const x=player.x;city.move(player,0,3*sign);
    assert.ok(Math.abs(iceCreamVanLocal(van,player).z)<ICE_CREAM_VAN.halfWidth);
    assert.equal(player.x,x);
    player.z=van.z;city.move(player,-4.1*sign,0);
    assert.ok(iceCreamVanLocal(van,player).x<ICE_CREAM_VAN.rear-1);
    assert.equal(iceCreamVanFloor(van,player),0);
    assert.equal(interactIceCreamVanDoor(player,van),'');
  }
});

test('ice cream vendor redirects players inside the van on both banks, only when facing him',async()=>{
  const {riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const {interactIceCreamVendor,ICE_CREAM_VENDOR}=await import('../neon-city/ice-cream-vans.js');
  for(const first of [true,false]){
    const van=riverIceCreamVan({x:first?1:4,z:RIVER_ROWS[0]+(first?0:1),riverStart:RIVER_ROWS[0],river:true}),s=first?1:-1;
    const p={x:van.x-.8*s,z:van.z,angle:Math.atan2(s,-ICE_CREAM_VENDOR.z*s)};
    assert.equal(interactIceCreamVendor(p,van),'CLIENTS ON THE OTHER SIDE, PLEASE.');
    p.angle+=Math.PI;assert.equal(interactIceCreamVendor(p,van),null);
    p.angle-=Math.PI;p.riverWalk=true;assert.equal(interactIceCreamVendor(p,van),null);
    delete p.riverWalk;p.z=van.z-2*s;assert.equal(interactIceCreamVendor(p,van),null);
    p.z=van.z;p.x=van.x-3.8*s;assert.equal(interactIceCreamVendor(p,van),null);
  }
});

test('van door can close and reopen from the nearest walkable inside position on either bank',async()=>{
  const {City,riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const {interactIceCreamVan,iceCreamVanFloor,ICE_CREAM_VAN}=await import('../neon-city/ice-cream-vans.js');
  for(const first of [true,false]){
    const city=new City(42),chunk={x:first?1:4,z:RIVER_ROWS[0]+(first?0:1),river:true,riverStart:RIVER_ROWS[0]};
    city.chunks.set(`${chunk.x},${chunk.z}`,chunk);
    const van=riverIceCreamVan(chunk),s=first?1:-1;van.doorOpen=true;
    const p={x:van.x-.8*s,z:van.z,angle:-s*Math.PI/2};
    // Move exactly to the closed door's collision clearance, as normal walking does.
    city.move(p,(-2.2+.8)*s,0);
    assert.equal(interactIceCreamVan(p,van),'');assert.equal(van.doorOpen,false);
    assert.equal(iceCreamVanFloor(van,p),ICE_CREAM_VAN.floor);
    assert.equal(interactIceCreamVan(p,van),'');assert.equal(van.doorOpen,true);
  }
});

test('aiming at van trays, cones and freezer returns the warning while the vendor keeps his own reply',async()=>{
  const {riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const {interactIceCreamVan}=await import('../neon-city/ice-cream-vans.js');
  for(const first of [true,false]){
    const van=riverIceCreamVan({x:first?1:4,z:RIVER_ROWS[0]+(first?0:1),riverStart:RIVER_ROWS[0],river:true}),s=first?1:-1;
    const aim=(x,z,tx,tz)=>({x:van.x+x*s,z:van.z-z*s,angle:Math.atan2((tx-x)*s,-(tz-z)*s)});
    for(const tray of [-1.65,-1.05,-.45])assert.equal(interactIceCreamVan(aim(-1.1,0,tray,1.02),van),'DO NOT TOUCH, PLEASE.');
    assert.equal(interactIceCreamVan(aim(.55,2.2,.55,1.18),van),null);
    for(const tray of [-1.65,-1.05,-.45])assert.equal(interactIceCreamVan(aim(tray,2.2,tray,1.02),van),null);
    assert.equal(interactIceCreamVan(aim(-1.6,0,-1.6,-.75),van),'DO NOT TOUCH, PLEASE.');
    assert.equal(interactIceCreamVan(aim(-.8,0,.2,.65),van),'CLIENTS ON THE OTHER SIDE, PLEASE.');
    assert.equal(interactIceCreamVan({...aim(-1.6,0,-1.6,-.75),riverWalk:true},van),null);
    assert.equal(interactIceCreamVan(aim(-.5,0,-.5,-3),van),null);
  }
});

test('carried ice creams show a full scoop, a cut-down scoop, then a bare cone and release resources',async()=>{
  const {createThreeCarriedIceCreams}=await import('../neon-city/three-carried-ice-creams.js');
  const scene=new THREE.Scene(),iceCreams=createThreeCarriedIceCreams(scene),geometries=[];
  for(const stage of ['full','bitten','cone']){
    iceCreams.beginFrame();iceCreams.draw({position:{x:10,y:.075,z:20},height:1.85,width:.925,stage,flavour:0,angle:0});iceCreams.endFrame();
    const mesh=scene.children[0];mesh.geometry.computeBoundingBox();geometries.push(mesh.geometry);
    assert.equal(mesh.visible,true);assert.ok(mesh.position.x>10);assert.ok(mesh.position.y>0);
  }
  assert.ok(geometries[0].boundingBox.max.y>geometries[1].boundingBox.max.y);
  assert.ok(geometries[1].boundingBox.max.y>geometries[2].boundingBox.max.y);
  iceCreams.beginFrame();iceCreams.draw({position:{x:10,y:.075,z:20},height:1.85,width:.925,stage:'full',flavour:0,angle:0,back:true});iceCreams.endFrame();assert.equal(scene.children[0].visible,false);
  iceCreams.beginFrame();iceCreams.endFrame();assert.equal(scene.children[0].visible,false);
  let disposed=0;for(const g of geometries)g.addEventListener('dispose',()=>disposed++);
  iceCreams.dispose();assert.equal(disposed,3);assert.equal(scene.children.length,0);
});

test('cab doors toggle silently on both banks and both sides while the cab stays inaccessible',async()=>{
  const {City,riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const {interactIceCreamVan,iceCreamVanLocal}=await import('../neon-city/ice-cream-vans.js');
  for(const first of [true,false])for(const side of [-1,1]){
    const city=new City(42),chunk={x:first?1:4,z:RIVER_ROWS[0]+(first?0:1),river:true,riverStart:RIVER_ROWS[0]};
    city.chunks.set(`${chunk.x},${chunk.z}`,chunk);const van=riverIceCreamVan(chunk),s=first?1:-1;
    const p={x:van.x+2*s,z:van.z-2.6*side*s,angle:side*s>0?0:Math.PI};
    assert.equal(interactIceCreamVan(p,van),'');assert.equal(van.cabDoorOpen[side],true);
    assert.equal(van.doorOpen,undefined);assert.equal(van.cabDoorOpen[-side],undefined);
    city.move(p,0,2.6*side*s);assert.ok(Math.abs(iceCreamVanLocal(van,p).z)>=1.6-1e-7);
    assert.equal(interactIceCreamVan(p,van),'');assert.equal(van.cabDoorOpen[side],false);
  }
});

test('opening a cab door exposes a real opening without rebuilding the van model',async()=>{
  const {createThreeIceCreamVans}=await import('../neon-city/three-ice-cream-vans.js');
  const {riverIceCreamVan,RIVER_ROWS}=await import('../neon-city/world.js');
  const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
  const scene=new THREE.Scene(),vans=createThreeIceCreamVans(scene),chunk={x:1,z:RIVER_ROWS[0],river:true,riverStart:RIVER_ROWS[0]},van=riverIceCreamVan(chunk);
  const frame={city:{chunks:new Map([['van',chunk]])}};
  try{
    vans.beginFrame(frame);vans.draw(chunk);scene.updateMatrixWorld(true);
    const door=scene.children.find(m=>m.name.startsWith('ice-cream-cab-door-1:'));
    const body=scene.children.find(m=>m.name.startsWith('ice-cream-van:')),geometry=body.geometry;
    const ray=new THREE.Raycaster(new THREE.Vector3(van.x+2.4,1.35*1.2+.04,-van.z+3),new THREE.Vector3(0,0,-1),0,3);
    assert.ok(ray.intersectObject(door).length>0);
    van.cabDoorOpen={1:true};vans.beginFrame(frame);vans.draw(chunk);scene.updateMatrixWorld(true);
    assert.equal(ray.intersectObject(door).length,0);assert.equal(body.geometry,geometry);
    assert.ok(ray.intersectObject(body).length>0,'seats or dashboard are visible through the doorway');
  }finally{vans.dispose();globalThis.document=previous;}
});
