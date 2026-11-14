import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeBookshopSpatial} from '../neon-city/three-bookshop-spatial.js';
import {BOOKSHOP,BOOKSHOP_BOOKS} from '../neon-city/midnite-interior.js';
import {BookshopLife} from '../neon-city/midnite-life.js';
import {Inventory} from '../neon-city/inventory.js';

test('Three.js bookshop movement blocks furniture, boundaries and moving people without tunnelling',()=>{
  const spatial=createThreeBookshopSpatial();
  const p={x:8,z:4};spatial.move(p,0,10,null,[]);assert.ok(p.z<6);
  const q={x:9,z:2};spatial.move(q,0,2,null,[{x:9,z:3}]);assert.ok(q.z<2.5);
  const r={x:9,z:2};spatial.move(r,0,-20,null,[]);assert.ok(r.z>=.3);
  spatial.dispose();
});
test('rays select exit, shelf categories and visible display books',()=>{
  const spatial=createThreeBookshopSpatial(),life=new BookshopLife(()=>.5);
  assert.equal(spatial.target({...BOOKSHOP.spawn,angle:Math.PI},life).type,'exit');
  const shelf=spatial.target({x:3,z:8,angle:Math.PI/2},life);
  assert.equal(shelf.type,'reply');assert.equal(shelf.data,'MUSIC');
  const book=BOOKSHOP_BOOKS[0],player={x:book.x,z:5.5,angle:0};
  const hit=spatial.target(player,life);assert.equal(hit.type,'book');assert.equal(hit.data,book);
  life.books[0].state='carried';assert.notEqual(spatial.target(player,life)?.data,book);
  spatial.dispose();
});
test('spatial targets preserve two-step borrowing and null targets cannot use legacy aim',()=>{
  const life=new BookshopLife(()=>.5),inventory=new Inventory(),p={x:7.5,z:5.5,angle:0};
  assert.equal(life.interact(p,inventory,null),null);
  const target={type:'book',data:BOOKSHOP_BOOKS[0]};
  assert.match(life.interact(p,inventory,target),/should I read/);
  assert.equal(life.interact(p,inventory,target),'TAKEN');
  assert.equal(life.books[0].state,'carried');
});
test('counter targets and backpack follow seller and collection state',()=>{
  const spatial=createThreeBookshopSpatial(),life=new BookshopLife(()=>.5);
  assert.equal(spatial.target({x:15.5,z:13.5,angle:0},life)?.type,'seller');
  assert.equal(spatial.target({x:17.5,z:16.5,angle:0},life)?.type,'backpack');
  life.backpack.taken=true;
  assert.notEqual(spatial.target({x:17.5,z:16.5,angle:0},life)?.type,'backpack');
  life.seller={x:8,z:9};life.state='returning';
  assert.equal(spatial.target({x:8,z:8.2,angle:0},life)?.type,'seller');
  // A tall shelf hides the bookseller at every targeting height.
  life.seller={x:5.7,z:9};
  assert.equal(spatial.target({x:3,z:9,angle:Math.PI/2},life)?.type,'reply');
  spatial.dispose();
});

test('both movement backends report bumps only against the small reading tables',async()=>{
  const {moveInBookshop}=await import('../neon-city/midnite-interior.js');
  const spatial=createThreeBookshopSpatial();
  for(const move of [moveInBookshop,spatial.move]){
    for(const t of BOOKSHOP.readingTables){
      const p={x:t.x,z:t.z+1};
      assert.equal(move(p,0,-.5,null,[]),true);
      assert.ok(p.z>=t.z+t.radius+.3-1e-10);
      assert.equal(move(p,0,.3,null,[]),false);
      assert.equal(move(p,0,0,null,[]),false);
    }
    assert.equal(move({x:8,z:5.5},0,.5,null,[]),false);
    assert.equal(move({x:9,z:2},0,.1,null,[]),false);
  }
  spatial.dispose();
});
