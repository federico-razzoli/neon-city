import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreePubScene} from '../neon-city/three-pub-scene.js';
import {PUB,pubChairs,createPubPatrons,drawPubInterior} from '../neon-city/pub-interior.js';
import {createRendererPreferences} from '../neon-city/renderer-support.js';

function fixture(){
  const image={width:24,height:48},calls=[];
  const room=createThreePubScene({imageFor:(...args)=>{calls.push(args);return image;}});
  const frame={player:{...PUB.spawn},eye:1.65,pubPatrons:createPubPatrons(()=>.3),bartenderType:1,currentVenue:{barBeer:{...PUB.barBeer}},pubLife:{walker:null},city:{chunks:new Map()},itemRoom:'pub'};
  room.update(frame);return {room,frame,calls};
}
test('pub bar and lounge default to Three.js and retain connected room geometry',()=>{
  assert.equal(createRendererPreferences().get('pub'),'three');
  const {room,frame}=fixture(),mesh=room.scene.getObjectByName('pub-room'),geometry=mesh.geometry;
  geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.x>=PUB.width);assert.ok(geometry.boundingBox.min.z<=-PUB.depth);assert.equal(geometry.boundingBox.max.y,PUB.height);
  for(const pose of [{x:9,z:10,angle:0},{x:18,z:8,angle:Math.PI/2},{x:24,z:8,angle:0}]){
    Object.assign(frame.player,pose);room.update(frame);assert.equal(mesh.geometry,geometry);assert.equal(room.camera.position.x,pose.x);
  }
  room.dispose();
});
test('seated patrons retain legs and drinks, use cropped sprites and leave cleanly',()=>{
  const {room,frame,calls}=fixture(),chair=pubChairs().find(c=>c.tableIndex===0&&c.seat===0);
  const seat=room.scene.getObjectByName('pub-seat-0:0'),geometry=seat.geometry;
  const actor=room.scene.children.find(o=>o.userData.actorId==='pub-seat-0:0');assert.ok(actor);
  assert.equal(actor.position.x,chair.x+.4);assert.equal(actor.position.z,-(chair.z+.4));assert.equal(actor.scale.y,1.2);
  assert.equal(calls[0][1],1);assert.equal(calls[0][2],(frame.player.z-chair.z-.4)*chair.side>0);
  room.update(frame);assert.equal(seat.geometry,geometry);
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  frame.pubPatrons[0][0]=null;room.update(frame);
  assert.equal(room.scene.getObjectByName('pub-seat-0:0'),undefined);assert.ok(!room.scene.children.includes(actor));assert.equal(disposed,1);
  frame.pubPatrons[0][0]=8;frame.pubPatrons[0].variants[0]=.9;room.update(frame);
  assert.ok(room.scene.getObjectByName('pub-seat-0:0'));room.dispose();
});
test('bartender and bar pint rebuild only when their appearance changes',()=>{
  const {room,frame}=fixture(),bartender=room.scene.getObjectByName('pub-bartender'),beer=room.scene.getObjectByName('pub-bar-beer');
  const staffGeometry=bartender.geometry,pintGeometry=beer.geometry;room.update(frame);
  assert.equal(bartender.geometry,staffGeometry);assert.equal(beer.geometry,pintGeometry);
  let released=0;staffGeometry.addEventListener('dispose',()=>released++);pintGeometry.addEventListener('dispose',()=>released++);
  frame.bartenderType=3;frame.currentVenue.barBeer={x:10.3,z:13.35,dark:true};room.update(frame);
  assert.notEqual(bartender.geometry,staffGeometry);assert.notEqual(beer.geometry,pintGeometry);assert.equal(released,2);
  beer.geometry.computeBoundingBox();assert.ok(beer.geometry.boundingBox.min.x>10);room.dispose();
});
test('walking patrons, seated camera and dropped objects share the room',()=>{
  const {room,frame}=fixture();frame.pubLife.walker={x:18,z:8,type:4,variant:.3,walkTime:1,facingX:1,facingZ:0};
  frame.playerSeat={pitch:.2};
  frame.eye=1.1;
  frame.city.chunks.set('0,0',{droppedItems:[{item:{id:'hotel-note'},x:24,z:8,ground:.015,angle:0,room:'pub'}]});room.update(frame);
  const walker=room.scene.children.find(o=>o.name==='pub-guest'&&!o.userData.actorId);
  assert.ok(walker);assert.equal(walker.scale.y,2.4);assert.equal(walker.position.x,18);
  assert.equal(room.camera.position.y,1.1);assert.equal(room.camera.rotation.x,.2);assert.ok(room.scene.getObjectByName('dropped-hotel-note'));
  frame.pubLife.walker=null;room.update(frame);assert.ok(!room.scene.children.includes(walker));room.dispose();
});
test('pub releases all visible geometry, materials and textures exactly once',()=>{
  const {room}=fixture(),resources=new Set();room.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);if(o.material.map)resources.add(o.material.map);}});
  let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
  room.dispose();room.dispose();assert.equal(disposed,resources.size);
});
test('Canvas room defaults preserve bartender, pint and seated patron drawing',()=>{
  const count=options=>{let n=0,actors=0;drawPubInterior({face(){n++;},quad(){n++;},box(){n++;},patrons:createPubPatrons(()=>.3),seatedPatron(){actors++;},...options});return {n,actors};};
  assert.deepEqual(count(),count({drawBartender:true,drawBarBeer:true}));assert.equal(count().actors,8);
  assert.ok(count().n>count({drawBartender:false,drawBarBeer:false}).n);
});
