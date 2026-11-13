import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createStorageCamera,updateStorageCamera,createStorageGeometryBuilder,createThreeStorageScene} from '../neon-city/three-storage-scene.js';
import {createRenderCamera,NATIVE_VIEW} from '../neon-city/render-camera.js';
import {supportsRenderer,defaultRenderer,createRendererPreferences} from '../neon-city/renderer-support.js';
import {DEBUG_DESTINATIONS} from '../neon-city/debug-menu.js';
import {profilePhase} from '../neon-city/render-profile.js';

function storageFrame(){
  const chunk={droppedItems:[]};
  return {player:{x:1.2,z:.8,angle:0},eye:1.65,currentHotel:{storageNoteTaken:false},
    itemRoom:'14,14:hotel-storage',city:{chunks:new Map([['0,0',chunk]])},hotelGuests:[]};
}

test('Three.js storage camera matches Canvas position, angle, pitch, lens, horizon and clipping',()=>{
  const camera=createStorageCamera(),canvasCamera=createRenderCamera(NATIVE_VIEW);
  assert.equal(camera.near,NATIVE_VIEW.near);assert.equal(camera.far,NATIVE_VIEW.far);
  for(const angle of [0,.4,Math.PI/2,Math.PI,4.8])for(const pitch of [-.3,0,.45,1]){
    const view={position:{x:1.2,z:.8,angle},eye:1.65,pitch};
    updateStorageCamera(camera,view);canvasCamera.set(view);
    for(let i=0;i<40;i++){
      const point={x:-12+i*.8,y:-2+i*.2,z:-3+i*.4};
      const expected=canvasCamera.project(canvasCamera.transform(point));
      const actual=new THREE.Vector3(point.x,point.y,-point.z).project(camera);
      assert.ok(Math.abs((actual.x+1)*320-expected.x)<1e-7);
      assert.ok(Math.abs((1-actual.y)*180-expected.y)<1e-7);
    }
  }
});

test('geometry adapter uses complete world-space boxes with reflected Z and the painted roof color',()=>{
  const builder=createStorageGeometryBuilder();
  const geometry=builder.build(({box})=>box(2,3,4,5,6,7,'#123456','#fedcba'));
  geometry.computeBoundingBox();
  assert.deepEqual(geometry.boundingBox.min.toArray(),[2,3,-11]);
  assert.deepEqual(geometry.boundingBox.max.toArray(),[7,9,-4]);
  assert.equal(geometry.attributes.position.count,36);
  const colors=geometry.attributes.color,color=new THREE.Color('#fedcba');
  assert.ok([...Array(colors.count).keys()].some(i=>Math.abs(colors.getX(i)-color.r)<1e-6&&Math.abs(colors.getY(i)-color.g)<1e-6));
  geometry.dispose();builder.dispose();
});

test('retained room and pinned note reuse geometry across camera movement and collection',()=>{
  const room=createThreeStorageScene(),frame=storageFrame();room.update(frame);
  const walls=room.scene.getObjectByName('storage-room'),note=room.scene.getObjectByName('storage-note');
  const geometry=walls.geometry,noteGeometry=note.geometry,version=geometry.attributes.position.version;
  for(let i=0;i<100;i++){frame.player.angle=i*.03;frame.player.z=.8+i*.01;room.update(frame);}
  assert.equal(room.scene.getObjectByName('storage-room'),walls);
  assert.equal(walls.geometry,geometry);assert.equal(geometry.attributes.position.version,version);
  frame.currentHotel.storageNoteTaken=true;room.update(frame);
  assert.equal(note.visible,false);assert.equal(note.geometry,noteGeometry);
  frame.currentHotel.storageNoteTaken=false;room.update(frame);assert.equal(note.visible,true);
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  room.dispose();room.dispose();assert.equal(disposed,1);assert.equal(room.scene.children.length,0);
});

test('all collectible dropped-object models are retained, room filtered, removed and disposed correctly',()=>{
  const room=createThreeStorageScene(),frame=storageFrame(),chunk=frame.city.chunks.get('0,0');
  const ids=['pine-cone','flower','hotel-note','ticket','arcade-token','lamp','backpack','pastis-bottle','marijuana-plant'];
  for(const [index,id] of ids.entries())chunk.droppedItems.push({item:{id},room:frame.itemRoom,x:1.2,z:1+index*.1,ground:0,angle:.2,length:.22,radius:.07});
  chunk.droppedItems.push({...chunk.droppedItems[0],room:'another room'});
  room.update(frame);
  assert.equal(room.scene.children.length,2+ids.length);
  const meshes=ids.map(id=>room.scene.getObjectByName(`dropped-${id}`));
  for(const mesh of meshes)assert.ok(mesh.geometry.attributes.position.count>0);
  assert.ok(meshes.every(mesh=>mesh.material===meshes[0].material),'compatible meshes share their unlit material');
  frame.player.angle=Math.PI;room.update(frame);
  assert.ok(meshes.every(mesh=>room.scene.children.includes(mesh)),'turning reuses complete object geometry');
  let disposed=0;for(const mesh of meshes)mesh.geometry.addEventListener('dispose',()=>disposed++);
  chunk.droppedItems.splice(0,1);room.update(frame);
  assert.equal(room.scene.getObjectByName('dropped-pine-cone'),undefined);assert.equal(disposed,1);
  room.dispose();assert.equal(disposed,ids.length);
});

test('renderer support enables the converted hotel scenes in the debug menu',()=>{
  for(const [id] of DEBUG_DESTINATIONS){
    assert.equal(supportsRenderer(id,'canvas'),true);
    assert.equal(supportsRenderer(id,'three'),['hotel','storage','stairs','corridor','arcade'].includes(id));
    assert.equal(supportsRenderer(id,'unknown'),false);
  }
});

test('profiling markers do not accumulate during play or after a failed rendering phase',()=>{
  for(let i=0;i<100;i++)assert.equal(profilePhase('test:render',()=>42),42);
  assert.throws(()=>profilePhase('test:render',()=>{throw new Error('failed');}));
  assert.equal(performance.getEntriesByName('test:render').length,0);
  assert.equal(performance.getEntriesByName('test:render:start').length,0);
  assert.equal(performance.getEntriesByName('test:render:end').length,0);
});

test('converted destinations default to Three.js and comparison overrides stay local to each destination',()=>{
  const preferences=createRendererPreferences();
  for(const [destination] of DEBUG_DESTINATIONS){
    assert.equal(defaultRenderer(destination),['hotel','storage','stairs','corridor','arcade'].includes(destination)?'three':'canvas');
    assert.equal(preferences.get(destination),defaultRenderer(destination));
  }
  preferences.set('hotel','canvas');assert.equal(preferences.get('storage'),'three');
  preferences.set('storage','canvas');preferences.set('arcade','canvas');
  assert.equal(preferences.get('storage'),'canvas');
  preferences.set('storage','three');assert.equal(preferences.get('hotel'),'canvas');
  preferences.set('hotel','three');assert.equal(preferences.get('hotel'),'three');
  preferences.set('arcade','three');assert.equal(preferences.get('arcade'),'three');
  assert.throws(()=>preferences.set('bookshop','three'));
});
