import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeArcadeScene} from '../neon-city/three-arcade-scene.js';
import {ARCADE} from '../neon-city/arcade-interior.js';
import {createRendererPreferences,supportsRenderer} from '../neon-city/renderer-support.js';

test('arcade uses Three.js and rejects the retired Canvas choice',()=>{
  const preferences=createRendererPreferences();
  assert.equal(supportsRenderer('arcade','three'),true);
  assert.equal(preferences.get('arcade'),'three');
  assert.throws(()=>preferences.set('arcade','canvas'));assert.equal(preferences.get('arcade'),'three');
});

test('arcade retains its complete room, updates visitors and drops, and releases resources',()=>{
  const image={width:24,height:48},calls=[];
  const room=createThreeArcadeScene({imageFor:(...args)=>{calls.push(args);return image;}});
  const visitor={type:14,variant:.4,x:8,z:5,walkTime:.5,facingX:0,facingZ:1};
  const frame={player:{...ARCADE.spawn},eye:1.65,arcadeLife:{people:[visitor]},city:{chunks:new Map()},itemRoom:'arcade'};
  room.update(frame);
  const mesh=room.scene.getObjectByName('arcade-room'),geometry=mesh.geometry;
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.x>=ARCADE.width);
  assert.ok(geometry.boundingBox.max.y>=ARCADE.height);
  assert.ok(geometry.boundingBox.min.z<=-ARCADE.depth);
  const actor=room.scene.getObjectByName('arcade-guest');
  assert.equal(actor.position.x,visitor.x);assert.equal(actor.position.z,-visitor.z);
  assert.equal(calls[0][0],visitor.type);assert.equal(calls[0][1],3);assert.equal(calls[0][3],visitor.variant);
  visitor.x=9;visitor.z=6;frame.playerSeat={pitch:.2};frame.eye=1.1;
  const item={item:{id:'arcade-token'},x:8,z:4,ground:.015,angle:0,room:'arcade'};
  frame.city.chunks.set('0,0',{droppedItems:[item]});room.update(frame);
  assert.equal(mesh.geometry,geometry);assert.equal(actor.position.x,9);
  assert.equal(room.camera.position.y,1.1);assert.equal(room.camera.rotation.x,.2);
  const drop=room.scene.getObjectByName('dropped-arcade-token');assert.ok(drop);
  let dropDisposed=0;drop.geometry.addEventListener('dispose',()=>dropDisposed++);
  frame.arcadeLife.people=[];frame.city.chunks.clear();room.update(frame);
  assert.equal(room.scene.getObjectByName('arcade-guest'),undefined);
  assert.equal(room.scene.getObjectByName('dropped-arcade-token'),undefined);assert.equal(dropDisposed,1);
  const resources=new Set();room.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)resources.add(object.material);});
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  room.dispose();room.dispose();assert.equal(disposed,resources.size);
});
