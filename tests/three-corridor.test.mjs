import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeCorridorScene} from '../neon-city/three-corridor-scene.js';
import {createCorridorSky} from '../neon-city/three-corridor-sky.js';
import {createThreeArtwork} from '../neon-city/three-artwork.js';
import {drawHotelCorridor,drawCorridorCasement,corridorWindowState,corridorWindowAngle,HOTEL_CORRIDOR} from '../neon-city/hotel-corridor.js';
import {hotelInteriorLook} from '../neon-city/hotel-interior.js';
import {hotelLook} from '../neon-city/hotel.js';
import {NATIVE_VIEW} from '../neon-city/render-camera.js';
import {skyDirection} from '../neon-city/sky.js';

const image={width:24,height:48},vehicleImage={width:384,height:192};
function fixture(floor=2){
  const hotel={x:14,z:14,seed:42},sky={updates:0,disposed:0,update(){this.updates++;},dispose(){this.disposed++;}};
  const room=createThreeCorridorScene(hotel,floor,{createSky:()=>sky,imageFor:()=>image,textureFor:()=>vehicleImage});
  const frame={currentHotel:hotel,hotelStairs:{floor},player:{...HOTEL_CORRIDOR.spawn},eye:1.65,time:10,
    hotelGuests:[],itemRoom:`14,14:hotel-corridor:${floor}`,city:{chunks:new Map()}};
  room.update(frame);return {room,frame,hotel,sky};
}

test('corridor retains room and casements while the shared window state animates',()=>{
  const {room,frame,hotel,sky}=fixture();
  const geometry=room.scene.getObjectByName('corridor-room').geometry;
  const leaves=['left','right'].map(side=>room.scene.getObjectByName(`corridor-window-${side}`));
  const leafGeometry=leaves.map(group=>group.children[0].geometry);
  const state=corridorWindowState(hotel,2);state.open=true;state.progress=.5;
  room.update(frame);
  assert.equal(room.scene.getObjectByName('corridor-room').geometry,geometry);
  assert.equal(leaves[0].rotation.y,corridorWindowAngle(.5));
  assert.equal(leaves[1].rotation.y,-corridorWindowAngle(.5));
  room.scene.updateMatrixWorld(true);
  for(const [side,group] of leaves.entries()){
    const mesh=group.children[0],expected=[];
    drawCorridorCasement(points=>expected.push(points),hotelInteriorLook(hotelLook(hotel)),side,.5);
    const vertices=expected[0],indices=[0,1,2,0,2,3];
    for(let i=0;i<6;i++){
      const actual=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
      const target=vertices[indices[i]];
      assert.ok(Math.abs(actual.x-target.x)<1e-5&&Math.abs(actual.y-target.y)<1e-5&&Math.abs(-actual.z-target.z)<1e-5);
    }
    assert.equal(mesh.geometry,leafGeometry[side]);
  }
  state.progress=1;frame.windowView={pitch:-.7};room.update(frame);
  assert.equal(room.camera.rotation.x,-.7);assert.equal(state.open,true);
  room.dispose();assert.equal(sky.disposed,1);
});

test('street people and cars move without rebuilding existing meshes or complete car geometry',()=>{
  const {room,frame}=fixture();
  const people=room.scene.children.filter(mesh=>mesh.userData.actorId?.startsWith('street-person:'));
  const cars=room.scene.children.filter(group=>group.name==='corridor-car');
  assert.equal(people.length,16);assert.ok(cars.length>0);
  const first=people[0],x=first.position.x,car=cars[0],carX=car.position.x;
  const geometries=car.children.map(mesh=>mesh.geometry);
  frame.time+=.01;room.update(frame);
  assert.ok(room.scene.children.includes(first));assert.notEqual(first.position.x,x);
  assert.ok(room.scene.children.includes(car));assert.notEqual(car.position.x,carX);
  assert.deepEqual(car.children.map(mesh=>mesh.geometry),geometries);
  assert.equal(first.position.y,(-6-4.675+.16)+first.scale.y/2);
  const resources=new Set();room.scene.traverse(object=>{
    if(object.geometry)resources.add(object.geometry);
    if(object.material){resources.add(object.material);if(object.material.map)resources.add(object.material.map);}
  });
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  room.dispose();assert.equal(disposed,resources.size);assert.equal(room.scene.children.length,0);
});

test('corridor floor controls numbered doors, exterior elevation and dropped-item room filtering',()=>{
  const lower=fixture(1),upper=fixture(3);
  const lowGeometry=lower.room.scene.getObjectByName('corridor-room').geometry;
  const highGeometry=upper.room.scene.getObjectByName('corridor-room').geometry;
  lowGeometry.computeBoundingBox();highGeometry.computeBoundingBox();
  assert.ok(lowGeometry.boundingBox.min.y>highGeometry.boundingBox.min.y);
  const drop={item:{id:'hotel-note'},x:2.4,z:3,ground:.015,angle:0,room:upper.frame.itemRoom};
  upper.frame.city.chunks.set('0,0',{droppedItems:[drop,{...drop,room:lower.frame.itemRoom}]});upper.room.update(upper.frame);
  assert.equal(upper.room.scene.children.filter(mesh=>mesh.name==='dropped-hotel-note').length,1);
  assert.notDeepEqual(lowGeometry.attributes.position.array,highGeometry.attributes.position.array);
  lower.room.dispose();upper.room.dispose();
});

test('shared textured artwork preserves UVs and releases shared resources once',()=>{
  const artwork=createThreeArtwork(),image={width:160,height:80};
  const points=[{x:1,y:2,z:3,u:0,v:0},{x:2,y:2,z:3,u:160,v:0},{x:2,y:3,z:3,u:160,v:80}];
  const a=artwork.mesh(points,image),b=artwork.mesh(points,image);
  assert.equal(a.material,b.material);assert.deepEqual([...a.geometry.attributes.uv.array],[0,1,1,1,1,0]);
  assert.equal(a.geometry.attributes.position.getZ(0),-3);
  let disposed=0;for(const resource of [a.geometry,b.geometry,a.material,a.material.map])resource.addEventListener('dispose',()=>disposed++);
  artwork.dispose();artwork.dispose();assert.equal(disposed,4);
});

test('sky background refreshes only when the view, starfield or shooting star changes',()=>{
  const previous=globalThis.document;let paints=0;
  globalThis.document={createElement(){return {width:0,height:0,getContext:()=>({fillRect(){paints++;}})};}};
  try{
    const scene=new THREE.Scene(),sky=createCorridorSky(scene),texture=scene.background;
    const frame={skyView:{angle:0,pitch:0,width:640,focal:NATIVE_VIEW.focal,horizon:NATIVE_VIEW.horizon},
      starfield:[skyDirection({bearing:0,elevation:.2})],shootingStars:{star:null,draw(){}}};
    sky.update(frame);const version=texture.version,count=paints;
    sky.update(frame);assert.equal(texture.version,version);assert.equal(paints,count);
    frame.skyView.pitch=.2;sky.update(frame);assert.ok(texture.version>version);
    frame.shootingStars.star={age:.3};sky.update(frame);const next=texture.version;
    frame.shootingStars.star.age=.4;sky.update(frame);assert.ok(texture.version>next);
    let disposed=0;texture.addEventListener('dispose',()=>disposed++);sky.dispose();assert.equal(disposed,1);assert.equal(scene.background,null);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('window sill has no overlapping coplanar wall cap when viewed from above',()=>{
  const boxes=[];
  drawHotelCorridor({look:hotelLook({x:14,z:14}),floor:2,casements:false,
    face(){},quad(){},box:(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color})});
  const {depth:D,window:win}=HOTEL_CORRIDOR;
  const sill=boxes.find(box=>Math.abs(box.z-(D-.22))<1e-8&&Math.abs(box.w-(win.w+.2))<1e-8);
  assert.ok(sill);
  const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1e-8&&
    Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)>1e-8;
  const competing=boxes.filter(box=>box!==sill&&Math.abs(box.y+box.h-sill.y-sill.h)<1e-8&&overlaps(box,sill));
  assert.deepEqual(competing,[],'the sill must be the only top surface in its footprint');
  const support=boxes.find(box=>Math.abs(box.z-D)<1e-8&&box.x===sill.x&&Math.abs(box.w-sill.w)<1e-8);
  assert.ok(support);assert.ok(Math.abs(support.y+support.h-sill.y)<1e-8,'wall meets the underside without a gap');
});
