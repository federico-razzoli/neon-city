import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeStairwellScene} from '../neon-city/three-stairwell-scene.js';
import {createThreeMoneyNote} from '../neon-city/three-money-note.js';
import {HOTEL_STAIRWELL,stairwellHeight,stairwellNote} from '../neon-city/hotel-stairwell.js';

function cashFixture(note){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.64,.32),new THREE.MeshBasicMaterial());
  mesh.name='stairs-money';
  return {mesh,dispose(){mesh.geometry.dispose();mesh.material.dispose();}};
}
function frameFor(hotel){return {player:{...HOTEL_STAIRWELL.spawn},eye:1.65,currentHotel:hotel,
  hotelStairs:{floor:1,flight:null},hotelGuests:[],itemRoom:'14,14:hotel-stairs',city:{chunks:new Map()}};}

test('stairwell retains all three floors while camera height follows both flights',()=>{
  const hotel={x:14,z:14},room=createThreeStairwellScene(hotel,{createCashNote:cashFixture}),frame=frameFor(hotel);
  const walls=room.scene.getObjectByName('stairs-room'),geometry=walls.geometry;
  geometry.computeBoundingBox();
  assert.ok(Math.abs(geometry.boundingBox.max.y-HOTEL_STAIRWELL.rise*3)<1e-5);
  assert.ok(geometry.boundingBox.min.z<=-HOTEL_STAIRWELL.depth);
  for(const [floor,flight,z] of [[1,null,1.2],[1,1,8],[2,null,14],[2,2,8],[3,null,1.2]]){
    Object.assign(frame.hotelStairs,{floor,flight});frame.player.z=z;frame.eye=1.65+stairwellHeight(frame.player,frame.hotelStairs);
    room.update(frame);
    assert.equal(room.camera.position.y,frame.eye);
    assert.equal(room.scene.getObjectByName('stairs-room'),walls);
    assert.equal(walls.geometry,geometry);
  }
  room.dispose();
});

test('cash note uses the hotel pickup state, remains collected on re-entry and disposes with the room',()=>{
  const hotel={x:14,z:14},frame=frameFor(hotel);
  const room=createThreeStairwellScene(hotel,{createCashNote:cashFixture});room.update(frame);
  const cash=room.scene.getObjectByName('stairs-money');assert.equal(cash.visible,true);
  let disposed=0;cash.geometry.addEventListener('dispose',()=>disposed++);
  stairwellNote(hotel).taken=true;room.update(frame);assert.equal(cash.visible,false);
  room.dispose();room.dispose();assert.equal(disposed,1);
  const revisit=createThreeStairwellScene(hotel,{createCashNote:cashFixture});revisit.update(frame);
  assert.equal(revisit.scene.getObjectByName('stairs-money').visible,false);revisit.dispose();
});

test('dropped items retain their tread height and are filtered by room, not current floor',()=>{
  const hotel={x:14,z:14},room=createThreeStairwellScene(hotel,{createCashNote:cashFixture}),frame=frameFor(hotel);
  const item={item:{id:'hotel-note'},x:6.5,z:8,angle:0,ground:2.4,room:frame.itemRoom};
  frame.city.chunks.set('0,0',{droppedItems:[item,{...item,room:'storage'}]});room.update(frame);
  const mesh=room.scene.getObjectByName('dropped-hotel-note');mesh.geometry.computeBoundingBox();
  assert.ok(mesh.geometry.boundingBox.min.y>=2.4);
  frame.hotelStairs.floor=3;room.update(frame);
  assert.equal(room.scene.getObjectByName('dropped-hotel-note'),mesh);
  assert.equal(room.scene.children.filter(object=>object.name==='dropped-hotel-note').length,1);
  room.dispose();
});

test('banknote preserves world position and source texture orientation, corrects hotel tint, and releases resources',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const canvas={width:0,height:0,pixels:null};
    const context={fillRect(){},strokeRect(){},beginPath(){},ellipse(){},fill(){},fillText(){},drawImage(){},
      getImageData(){const data=new Uint8ClampedArray(canvas.width*canvas.height*4);for(let i=0;i<data.length;i+=4)data.set([120,140,160,255],i);return {data};},
      putImageData(pixels){canvas.pixels=pixels.data;}};
    canvas.getContext=()=>context;return canvas;
  }};
  try{
    const cash=createThreeMoneyNote({x:6.5,z:14.5,ground:0,taken:false});
    const geometry=cash.mesh.geometry,material=cash.mesh.material,texture=material.map;
    assert.deepEqual(Array.from(geometry.attributes.uv.array),[0,1,1,1,1,0,0,0]);
    assert.ok(Math.abs(geometry.attributes.position.getY(0)-.012)<1e-8);
    assert.ok(geometry.attributes.position.getZ(0)<-14);
    assert.deepEqual(Array.from(texture.image.pixels.slice(0,4)),[148,173,195,255]);
    let disposed=0;for(const resource of [geometry,material,texture])resource.addEventListener('dispose',()=>disposed++);
    cash.dispose();assert.equal(disposed,3);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
