import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeHallScene} from '../neon-city/three-hall-scene.js';
import {HOTEL,RECEPTIONISTS,hotelFloorHeight,switchHotelLamp,advanceHotelReceptionist,drawHotelInterior} from '../neon-city/hotel-interior.js';
import {hotelLook} from '../neon-city/hotel.js';
import {Inventory} from '../neon-city/inventory.js';

function fixture(){
  const hotel={x:14,z:14,receptionist:RECEPTIONISTS[0]},image={width:24,height:48};
  const room=createThreeHallScene(hotel,{imageFor:()=>image});
  const frame={currentHotel:hotel,player:{...HOTEL.spawn},eye:1.65,hotelGuests:[],city:{chunks:new Map()},itemRoom:'14,14:hotel'};
  room.update(frame);return {room,frame,hotel};
}

test('hall retains its furniture and staircase geometry while the camera climbs to the landing',()=>{
  const {room,frame}=fixture(),mesh=room.scene.getObjectByName('hall-room'),geometry=mesh.geometry;
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.x>=HOTEL.width);
  assert.ok(geometry.boundingBox.max.y>=HOTEL.height);
  assert.ok(geometry.boundingBox.min.z<=-HOTEL.depth);
  for(const z of [3,5,9,12,15]){
    Object.assign(frame.player,{x:18.2,z});frame.eye=1.65+hotelFloorHeight(frame.player.x,z);room.update(frame);
    assert.equal(room.camera.position.y,frame.eye);assert.equal(mesh.geometry,geometry);
  }
  room.dispose();
});

test('lamp switches and receptionist trips update retained objects using the shared game state',()=>{
  const {room,frame,hotel}=fixture();
  const staff=room.scene.getObjectByName('hall-receptionist'),staffGeometry=staff.geometry;
  const on=room.scene.getObjectByName('hall-lamp-on'),off=room.scene.getObjectByName('hall-lamp-off'),glow=room.scene.getObjectByName('hall-lamp-glow');
  const lampGeometry=on.geometry;
  assert.equal(off.visible,true);assert.equal(on.visible,false);assert.equal(glow.visible,false);
  switchHotelLamp(hotel);room.update(frame);
  assert.equal(off.visible,false);assert.equal(on.visible,true);assert.equal(glow.visible,true);
  advanceHotelReceptionist(hotel,3.3);room.update(frame);
  assert.ok(staff.position.x<HOTEL.receptionist.x);assert.equal(staff.geometry,staffGeometry);
  advanceHotelReceptionist(hotel,30);room.update(frame);
  assert.equal(hotel.lampOn,false);assert.equal(hotel.lampShutoffs,1);
  assert.equal(staff.position.x,HOTEL.receptionist.x);assert.equal(staff.position.z,-HOTEL.receptionist.z);
  assert.equal(on.geometry,lampGeometry);assert.equal(off.visible,true);assert.equal(glow.visible,false);
  room.dispose();
});

test('taking the lamp removes the lamp and glow, and the state persists on returning to the hall',()=>{
  const {room,frame,hotel}=fixture(),inventory=new Inventory();hotel.lampShutoffs=5;
  switchHotelLamp(hotel,inventory);switchHotelLamp(hotel,inventory);room.update(frame);
  assert.equal(hotel.lampTaken,true);assert.equal(inventory.current.id,'lamp');
  for(const name of ['hall-lamp-on','hall-lamp-off','hall-lamp-glow'])assert.equal(room.scene.getObjectByName(name).visible,false);
  room.dispose();
  const revisit=createThreeHallScene(hotel);revisit.update(frame);
  assert.equal(revisit.scene.getObjectByName('hall-lamp-off').visible,false);revisit.dispose();
});

test('both receptionists use their existing models, follow their positions and dispose replaced geometry',()=>{
  const {room,frame,hotel}=fixture(),staff=room.scene.getObjectByName('hall-receptionist');
  let disposed=0;staff.geometry.addEventListener('dispose',()=>disposed++);
  hotel.receptionist=RECEPTIONISTS[1];hotel.receptionistPosition={x:2,z:13.5};room.update(frame);
  assert.equal(disposed,1);assert.equal(staff.position.x,2);assert.equal(staff.position.z,-13.5);
  const resources=new Set();room.scene.traverse(object=>{
    if(object.geometry)resources.add(object.geometry);if(object.material)resources.add(object.material);
  });
  let released=0;for(const resource of resources)resource.addEventListener('dispose',()=>released++);
  room.dispose();room.dispose();assert.equal(released,resources.size);
});

test('hall guests and dropped items retain their floor and landing elevations',()=>{
  const {room,frame}=fixture();
  const guest={type:1,x:18,z:13,y:4,walkTime:1,variant:0,facingX:0,facingZ:-1};frame.hotelGuests=[guest];
  frame.city.chunks.set('0,0',{droppedItems:[{item:{id:'hotel-note'},x:18,z:13,ground:4.015,angle:0,room:frame.itemRoom}]});room.update(frame);
  const actor=room.scene.getObjectByName('hall-guest'),drop=room.scene.getObjectByName('dropped-hotel-note');
  assert.equal(actor.position.y,4+actor.scale.y/2);drop.geometry.computeBoundingBox();assert.ok(drop.geometry.boundingBox.min.y>4);
  guest.y=2;guest.z=7;room.update(frame);assert.equal(room.scene.getObjectByName('hall-guest'),actor);assert.equal(actor.position.y,2+actor.scale.y/2);
  room.dispose();
});

test('static hall drawing can omit receptionist and lamp without altering the Canvas defaults',()=>{
  function count(options){let faces=0,boxes=0;drawHotelInterior({look:hotelLook({x:14,z:14}),quad(){},face(){faces++;},box(){boxes++;},...options});return {faces,boxes};}
  const original=count({}),staticHall=count({drawReceptionist:false,lampTaken:true});
  assert.ok(original.faces>staticHall.faces);assert.ok(original.boxes>staticHall.boxes);
  assert.deepEqual(original,count({drawReceptionist:true,lampTaken:false}));
});
