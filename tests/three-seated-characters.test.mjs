import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from '../neon-city/vendor/three/three.module.js';
import {createThreeCharacterCards} from '../neon-city/three-character-cards.js';
import {createThreeSeatedCharacters} from '../neon-city/three-seated-characters.js';
import {createThreeBookshopScene} from '../neon-city/three-bookshop-scene.js';
import {BOOKSHOP} from '../neon-city/midnite-interior.js';

function fixture(people){
  const room=createThreeBookshopScene(),life={people,books:[],visitorBooks:[],onDisplay:()=>false};
  const frame={player:{...BOOKSHOP.spawn},eye:1.65,bookshopLife:life,city:{chunks:new Map()},itemRoom:'bookshop'};
  room.update(frame);return {room,life,frame};
}

test('bookshop readers have shared thighs, shins and shoes aligned with their chairs, removed on standing or leaving',()=>{
  const people=BOOKSHOP.chairs.map((chair,seat)=>({...chair,seat,id:`reader-${seat}`,type:4,variant:.4,walkTime:0,state:'reading'}));
  const {room,frame,life}=fixture(people);
  try{
    const legs=room.scene.children.filter(m=>m.name==='bookshop-seated-legs');
    assert.equal(legs.length,people.length);assert.equal(legs[0].geometry,legs[1].geometry);
    legs.forEach((mesh,i)=>{
      assert.equal(mesh.position.x,people[i].x);assert.equal(mesh.position.z,-people[i].z);
      assert.equal(mesh.rotation.y,-people[i].angle);
      mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox;
      assert.ok(bounds.min.y<.1,'shoes reach the floor');assert.ok(bounds.max.y>=.68,'thighs join the torso');
      assert.ok(-bounds.min.z>.8,'knees and shoes extend beyond the deep chair cushion');
      const scale=new Vector3();new Box3().setFromObject(mesh).getSize(scale);assert.ok(scale.y>.6);
    });
    const shared=legs[0].geometry;let released=0;shared.addEventListener('dispose',()=>released++);
    people[0].state='leaving';room.update(frame);
    assert.ok(!room.scene.children.includes(legs[0]));assert.ok(room.scene.children.includes(legs[1]));assert.equal(released,0);
    people[1].state='to-table';room.update(frame);assert.equal(room.scene.getObjectByName('bookshop-seated-legs'),undefined);
    people[0].state='reading';room.update(frame);assert.equal(room.scene.getObjectByName('bookshop-seated-legs').geometry,shared);
    life.people=[];room.update(frame);assert.equal(room.scene.getObjectByName('bookshop-seated-legs'),undefined);assert.equal(released,0);
    room.dispose();assert.equal(released,1);
  }finally{room.dispose();}
});

test('seated upper and lower geometry is shared across scenes and survives until the final owner leaves',()=>{
  const person={...BOOKSHOP.chairs[0],seat:0,id:'reader',type:14,variant:.8,walkTime:0,state:'reading'};
  const a=fixture([person]),b=fixture([{...person}]);
  try{
    const topA=a.room.scene.getObjectByName('bookshop-guest'),topB=b.room.scene.getObjectByName('bookshop-guest');
    const legsA=a.room.scene.getObjectByName('bookshop-seated-legs'),legsB=b.room.scene.getObjectByName('bookshop-seated-legs');
    assert.equal(topA.geometry,topB.geometry);assert.equal(legsA.geometry,legsB.geometry);
    assert.notEqual(topA.material,topB.material,'scene clipping stays independent');
    let released=0;for(const geometry of [topA.geometry,legsA.geometry])geometry.addEventListener('dispose',()=>released++);
    a.room.dispose();assert.equal(released,0);b.room.update(b.frame);assert.equal(legsB.geometry,legsA.geometry);
    b.room.dispose();assert.equal(released,2);
  }finally{a.room.dispose();b.room.dispose();}
});

test('equivalent outfits share seated geometry while different outfits, directions and chair depths remain distinct',()=>{
  const a=createThreeSeatedCharacters(),b=createThreeSeatedCharacters(),cardsA=createThreeCharacterCards(),cardsB=createThreeCharacterCards();
  try{
    const original=a.geometry(4,.4,-1),matching=b.geometry(4,.5,-1);
    assert.equal(original,matching);assert.notEqual(original,b.geometry(4,.8,-1));
    assert.notEqual(original,b.geometry(4,.4,1));assert.notEqual(original,b.geometry(4,.4,-1,.5));
    assert.equal(cardsA.geometry(4,1,false,.4,true),cardsB.geometry(4,1,false,.5,true));
    let released=0;original.addEventListener('dispose',()=>released++);
    a.dispose();assert.equal(released,0);b.dispose();assert.equal(released,1);
  }finally{a.dispose();b.dispose();cardsA.dispose();cardsB.dispose();}
});
