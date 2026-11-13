import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeBookshopScene} from '../neon-city/three-bookshop-scene.js';
import {BOOKSHOP,BOOKSHOP_BOOKS,drawBookshopInterior} from '../neon-city/midnite-interior.js';
import {BookshopLife,bookshopVisitorShowsBack} from '../neon-city/midnite-life.js';
import {createRendererPreferences} from '../neon-city/renderer-support.js';

function fixture(){
  const calls=[],room=createThreeBookshopScene({imageFor:(...args)=>{calls.push(args);return {width:24,height:48};}});
  const life=new BookshopLife(()=>.5),frame={player:{...BOOKSHOP.spawn},eye:1.65,bookshopLife:life,city:{chunks:new Map()},itemRoom:'bookshop'};
  room.update(frame);return {room,life,frame,calls};
}
test('Midnite Books defaults to Three.js and retains room geometry as staff move',()=>{
  assert.equal(createRendererPreferences().get('bookshop'),'three');
  const {room,life,frame}=fixture(),mesh=room.scene.getObjectByName('bookshop-room'),geometry=mesh.geometry;
  geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.x>=BOOKSHOP.width);assert.equal(geometry.boundingBox.min.z,-BOOKSHOP.depth);
  life.seller={x:8,z:7};life.sellerAngle=.7;frame.playerSeat={pitch:.3};frame.eye=1.1;room.update(frame);
  const seller=room.scene.getObjectByName('bookshop-bookseller');assert.equal(seller.position.x,8);assert.equal(seller.position.z,-7);assert.equal(seller.rotation.y,Math.PI-.7);
  assert.equal(mesh.geometry,geometry);assert.equal(room.camera.position.y,1.1);assert.equal(room.camera.rotation.x,.3);room.dispose();
});
test('loans move from display to reading table to seller, and backpack collection persists',()=>{
  const {room,life,frame}=fixture(),loan=life.books[0],original=BOOKSHOP_BOOKS.find(b=>b.id===loan.id);
  const display=room.scene.getObjectByName(`bookshop-book-${loan.id}`),geometry=display.geometry;
  loan.state='reading';loan.seat=0;life.backpack.taken=true;room.update(frame);
  assert.equal(display.visible,false);assert.equal(room.scene.getObjectByName('bookshop-backpack').visible,false);
  const reading=room.scene.children.find(m=>m.name===display.name&&m!==display);
  assert.equal(reading.position.x,BOOKSHOP.readingTables[0].x);assert.equal(reading.position.y,.68);assert.equal(reading.geometry,geometry);
  loan.state='returning';life.returning=loan;life.seller={x:7,z:8};life.sellerAngle=0;room.update(frame);
  assert.equal(reading.position.z,-8.35);assert.equal(reading.position.y,1.1);
  loan.state='display';life.returning=null;room.update(frame);assert.equal(display.visible,true);assert.equal(display.position.x,original.x);assert.ok(!room.scene.children.includes(reading));room.dispose();
});
test('visitors sit with cropped sprites, carry books, stand and leave without rebuilding room',()=>{
  const {room,life,frame,calls}=fixture();
  const person={id:'reader',type:4,variant:.2,x:8,z:5,walkTime:.5,angle:0,state:'to-table',seat:0,book:{id:'visitor-test',color:'#93634e'}};
  life.people=[person];room.update(frame);
  const actor=room.scene.getObjectByName('bookshop-guest'),walkingGeometry=actor.geometry;
  const book=room.scene.getObjectByName('bookshop-book-visitor-test');assert.equal(book.position.x,8.43);assert.equal(book.scale.x,.7);
  person.state='reading';room.update(frame);
  assert.notEqual(actor.geometry,walkingGeometry);assert.equal(actor.scale.y,1.2);assert.equal(actor.position.y,1.27);
  assert.equal(calls.at(-1)[1],1);assert.equal(calls.at(-1)[2],bookshopVisitorShowsBack(person,frame.player));
  const uv=actor.geometry.attributes.uv;assert.ok(Math.abs(uv.getY(2)-1/3)<1e-6);
  assert.equal(book.position.y,.68);assert.equal(book.scale.x,1);
  person.state='leaving';person.book=null;room.update(frame);assert.equal(actor.geometry,walkingGeometry);assert.ok(!room.scene.children.includes(book));
  life.people=[];room.update(frame);assert.equal(room.scene.getObjectByName('bookshop-guest'),undefined);room.dispose();
});
test('scene-owned geometry, materials and textures are disposed exactly once',()=>{
  const {room}=fixture(),resources=new Set();room.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  room.dispose();room.dispose();assert.equal(disposed,resources.size);
});
test('Canvas defaults still include all movable contents',()=>{
  const count=options=>{let n=0;drawBookshopInterior({face(){n++;},box(){n++;},quad(){n++;}},null,options);return n;};
  assert.equal(count(),count({dynamic:true}));assert.ok(count()>count({dynamic:false}));
});
