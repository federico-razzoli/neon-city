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

test('display windows have translucent glass and genuine openings through the wall',async()=>{
  const THREE=await import('../neon-city/vendor/three/three.module.js');
  const {room}=fixture();
  try{
    room.scene.updateMatrixWorld(true);
    const wall=room.scene.getObjectByName('bookshop-room');
    for(const [i,b] of BOOKSHOP.windowShelves.entries()){
      const glass=room.scene.getObjectByName(`bookshop-window-${i}`);
      assert.ok(glass.material.transparent);assert.ok(glass.material.opacity>0&&glass.material.opacity<1);
      assert.equal(glass.material.depthWrite,false);
      const cast=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,-1),new THREE.Vector3(0,0,1),0,2).intersectObject(wall);
      assert.equal(cast(b.x+b.w/2,1.85).length,0,'no opaque panel behind the glass');
      assert.ok(cast(b.x+b.w/2,3.1).length>0,'wall above window remains solid');
      assert.ok(cast(b.x+.05,1.85).length>0,'gold side frame remains solid');
    }
  }finally{room.dispose();}
});

test('street view follows all four entrance orientations without mutating city state',async()=>{
  const THREE=await import('../neon-city/vendor/three/three.module.js');
  const {bookshopStreetView,createBookshopStreet}=await import('../neon-city/three-bookshop-street.js');
  for(const entranceSide of [0,1,2,3]){
    const venue={x:100,z:-200,w:18,d:18,entranceSide},other={x:50};
    const chunk={buildings:[venue,other]},frame={currentVenue:venue,player:{x:3,z:2,angle:.4},playerSeat:{pitch:.2},skyView:{angle:.4},city:{chunks:new Map([['shop',chunk]])}};
    const view=bookshopStreetView(frame);
    const local=new THREE.Vector3(view.frame.player.x,1.65,-view.frame.player.z).applyMatrix4(view.transform);
    assert.ok(local.distanceTo(new THREE.Vector3(3,1.65,-2))<1e-10);
    assert.deepEqual(view.frame.city.chunks.get('shop').buildings,[other]);
    assert.deepEqual(chunk.buildings,[venue,other]);assert.equal(view.frame.indoors,false);assert.equal(view.frame.skyView.pitch,.2);
    const direction=new THREE.Vector3(Math.sin(view.frame.player.angle),0,-Math.cos(view.frame.player.angle)).transformDirection(view.transform);
    assert.ok(direction.distanceTo(new THREE.Vector3(Math.sin(.4),0,-Math.cos(.4)))<1e-10);
    let calls=0,disposed=0;const exterior=new THREE.Scene(),scene=new THREE.Scene(),background=scene.background;
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial());exterior.add(ground);
    const street=createBookshopStreet(scene,{createStreet:()=>({scene:exterior,update(f){calls++;assert.equal(f.currentVenue,venue);},dispose(){disposed++;}})});
    street.update(frame);street.update(frame);assert.equal(calls,2);
    const clip=ground.material.clippingPlanes[0];
    assert.ok(clip.distanceToPoint(new THREE.Vector3(0,0,-1))<0,'interior ground is clipped');
    assert.ok(clip.distanceToPoint(new THREE.Vector3(0,0,1))>0,'outside ground remains visible');assert.equal(scene.children.length,1);
    street.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);assert.equal(scene.background,background);ground.geometry.dispose();ground.material.dispose();
  }
});

test('door edges close the reveal against the wall from oblique angles',async()=>{
  const THREE=await import('../neon-city/vendor/three/three.module.js'),{room}=fixture();
  try{
    room.scene.updateMatrixWorld(true);const wall=room.scene.getObjectByName('bookshop-room');
    for(const side of [-1,1]){
      const edge=BOOKSHOP.door.x+side*.85;
      const ray=new THREE.Raycaster(new THREE.Vector3(edge+side*.105,1.8,-.06),new THREE.Vector3(-side*2,0,1).normalize(),0,.2);
      assert.ok(ray.intersectObject(wall).length>0,'no view of the street through the door jamb');
    }
    const top=new THREE.Raycaster(new THREE.Vector3(9,3.105,-.06),new THREE.Vector3(0,-2,1).normalize(),0,.2);
    assert.ok(top.intersectObject(wall).length>0,'door top closes against the lintel');
  }finally{room.dispose();}
});
