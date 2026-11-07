import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOKSHOP,facingBookshopDoor,facingBookshopExit,moveInBookshop,drawBookshopInterior,bookshopReply,facingBookseller} from '../neon-city/midnite-interior.js';
import {entranceWall} from '../neon-city/entrances.js';

test('bookshop doors work on every street orientation and exit from inside',()=>{
  for(let entranceSide=0;entranceSide<4;entranceSide++){
    const b={x:14,z:14,w:18,d:18,sign:'MIDNITE BOOKS',entranceSide},wall=entranceWall(b);
    const p={x:wall.x+wall.nx*2,z:wall.z+wall.nz*2,angle:Math.atan2(-wall.nx,-wall.nz)};
    assert.equal(facingBookshopDoor(p,[b]),b);
    assert.equal(facingBookshopDoor({...p,angle:p.angle+Math.PI},[b]),undefined);
  }
  assert.ok(facingBookshopExit({...BOOKSHOP.spawn,angle:Math.PI}));
  assert.ok(!facingBookshopExit(BOOKSHOP.spawn));
});
test('bookshop furniture blocks movement and entrance aisle reaches the back',()=>{
  const p={...BOOKSHOP.spawn};moveInBookshop(p,1.8,0);moveInBookshop(p,0,13);assert.ok(p.z>14);
  moveInBookshop(p,30,0);assert.ok(p.x<BOOKSHOP.counter.x);
  const shelf={x:3,z:8};moveInBookshop(shelf,3,0);assert.ok(shelf.x<=3.7);
  moveInBookshop(p,0,-40);assert.ok(p.z>=.3);
  assert.equal(bookshopReply({x:3.3,z:8,angle:Math.PI/2}),'MUSIC');
  assert.ok(facingBookseller({x:15.5,z:13,angle:0}));
});
test('bookshop renders finite geometry',()=>{
  let count=0;
  const check=(...args)=>{count++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));};
  drawBookshopInterior({box:check,quad:check,face:(points)=>{count++;for(const p of points)check(p.x,p.y,p.z);}});
  assert.ok(count>500);
});

test('both window shelves block movement while the entrance stays clear',()=>{
  for(const shelf of BOOKSHOP.windowShelves){
    const player={x:shelf.x+shelf.w/2,z:2};
    moveInBookshop(player,0,-4);
    assert.ok(player.z>=shelf.z+shelf.d+.3-1e-9);
  }
  const player={...BOOKSHOP.spawn};
  moveInBookshop(player,0,-4);
  assert.ok(player.z<.5);
});

test('window shelf books reply when approached along either display',()=>{
  for(const shelf of BOOKSHOP.windowShelves)for(const offset of [.5,3,5.5]){
    const player={x:shelf.x+offset,z:1.5,angle:Math.PI};
    assert.equal(bookshopReply(player),"I SHOULDN'T TAKE THESE.");
    assert.notEqual(bookshopReply({...player,angle:0}),"I SHOULDN'T TAKE THESE.");
  }
});

test('bookseller asks clients behind the desk to return to the other side',()=>{
  const player={x:15.5,z:17,angle:Math.PI};
  assert.equal(bookshopReply(player),'CLIENTS ON THE OTHER SIDE, PLEASE.');
  assert.ok(!facingBookseller(player));
  assert.notEqual(bookshopReply({...player,angle:0}),'CLIENTS ON THE OTHER SIDE, PLEASE.');
  const customer={x:15.5,z:13,angle:0};
  assert.ok(facingBookseller(customer));
  assert.notEqual(bookshopReply(customer),'CLIENTS ON THE OTHER SIDE, PLEASE.');
});

test('the till responds from both sides of the desk',()=>{
  const {till}=BOOKSHOP;
  const reply="DON'T PLAY WITH THE TILL, PLEASE.";
  assert.equal(bookshopReply({x:till.x,z:13,angle:0}),reply);
  assert.equal(bookshopReply({x:till.x,z:15.8,angle:Math.PI}),reply);
  assert.notEqual(bookshopReply({x:till.x,z:13,angle:Math.PI}),reply);
  assert.notEqual(bookshopReply({x:till.x,z:10,angle:0}),reply);
});
