import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from '../neon-city/vendor/three/three.module.js';
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
  const {room,frame}=fixture(),mesh=room.scene.getObjectByName('pub-room'),furniture=mesh.children[0];
  const bounds=new Box3().setFromObject(mesh);assert.ok(bounds.max.x>=PUB.width);assert.ok(bounds.min.z<=-PUB.depth);assert.ok(Math.abs(bounds.max.y-PUB.height)<1e-6);
  for(const pose of [{x:9,z:10,angle:0},{x:18,z:8,angle:Math.PI/2},{x:24,z:8,angle:0}]){
    Object.assign(frame.player,pose);room.update(frame);assert.equal(mesh.children[0],furniture);assert.equal(room.camera.position.x,pose.x);
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
test('bartender changes retain the native bar pint geometry and update its liquid material',()=>{
  const {room,frame}=fixture(),bartender=room.scene.getObjectByName('pub-bartender'),beer=room.scene.getObjectByName('pub-bar-beer');
  const liquid=beer.getObjectByName('pint-liquid'),pintGeometry=liquid.geometry,amber=liquid.material;
  const staffGeometry=bartender.geometry;room.update(frame);
  assert.equal(bartender.geometry,staffGeometry);assert.equal(liquid.geometry,pintGeometry);
  let released=0;staffGeometry.addEventListener('dispose',()=>released++);
  frame.bartenderType=3;frame.currentVenue.barBeer={x:10.3,z:13.35,dark:true};room.update(frame);
  assert.notEqual(bartender.geometry,staffGeometry);assert.equal(liquid.geometry,pintGeometry);assert.equal(released,1);
  assert.notEqual(liquid.material,amber);assert.equal(beer.position.x,10.3);assert.equal(beer.position.z,-13.35);
  assert.equal(beer.getObjectByName('pint-glass').material.transparent,true);room.dispose();
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
  const {room}=fixture(),resources=new Set();room.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);if(m.map)resources.add(m.map);}}});
  let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
  room.dispose();room.dispose();assert.equal(disposed,resources.size);
});
test('Canvas room defaults preserve bartender, pint and seated patron drawing',()=>{
  const count=options=>{let n=0,actors=0;drawPubInterior({face(){n++;},quad(){n++;},box(){n++;},patrons:createPubPatrons(()=>.3),seatedPatron(){actors++;},...options});return {n,actors};};
  assert.deepEqual(count(),count({drawBartender:true,drawBarBeer:true}));assert.equal(count().actors,8);
  assert.ok(count().n>count({drawBartender:false,drawBarBeer:false}).n);
});

test('pub fixtures use native primitives, with 84 tinted glass bottles and separate occupied-seat pints',()=>{
  const {room,frame}=fixture(),furniture=room.scene.getObjectByName('pub-room');
  const allowed=new Set(['BoxGeometry','PlaneGeometry','CylinderGeometry','LatheGeometry','TorusGeometry']);let bottles=0,instances=0;
  furniture.traverse(object=>{
    if(object.geometry)assert.ok(allowed.has(object.geometry.type),object.geometry.type);
    if(object.isInstancedMesh)instances+=object.count;
    if(object.name==='pub-bottle-glass'){bottles++;assert.equal(object.material.transparent,true);assert.equal(object.material.depthWrite,false);}
  });
  assert.equal(bottles,84);assert.ok(instances>500);
  for(const name of ['structure','doors','tables','chairs','bar','backbar','taps','chandeliers'])assert.ok(furniture.getObjectByName(`pub-${name}`));
  const pint=room.scene.getObjectByName('pub-drink-0:0'),geometry=pint.getObjectByName('pint-glass').geometry;
  assert.equal(pint.visible,true);frame.pubPatrons[0][0]=null;room.update(frame);assert.equal(pint.visible,false);
  frame.pubPatrons[0][0]=8;frame.pubPatrons[0].beerSides[0]=-1;room.update(frame);assert.equal(pint.visible,true);assert.equal(pint.getObjectByName('pint-glass').geometry,geometry);
  assert.equal(pint.position.x,PUB.tables[0].x-.65);room.dispose();
});
