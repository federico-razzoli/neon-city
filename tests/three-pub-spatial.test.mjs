import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreePubSpatial} from '../neon-city/three-pub-spatial.js';
import {PUB,pubChairs} from '../neon-city/pub-interior.js';
const empty=()=>PUB.tables.map(()=>[null,null]);
function fixture(t){const spatial=createThreePubSpatial();t.after(()=>spatial.dispose());return spatial;}
test('Three.js pub body cannot tunnel through a dividing wall or room boundary',t=>{
  const s=fixture(t),player={x:17,z:3};s.move(player,4,0,empty());assert.ok(player.x<17.8);assert.ok(player.x>17);
  player.x=20;player.z=7;s.move(player,2,0,empty());assert.ok(player.x>21.9);
  player.x=29;player.z=7;s.move(player,20,0,empty());assert.ok(player.x<30);
});
test('native pub body fits closer to furniture and slides along its edge',t=>{
  const s=fixture(t),player={x:9,z:12};s.move(player,1,2,empty());assert.ok(player.z<13);assert.ok(player.z>12.7);assert.ok(player.x>9.9);
});
test('exact door rays require hitting the doorway and stop at the partition',t=>{
  const s=fixture(t),p={x:9,z:1,angle:Math.PI};assert.equal(s.target(p,empty())?.type,'exit');
  p.angle=Math.PI+.9;assert.notEqual(s.target(p,empty())?.type,'exit');
  assert.equal(s.target({x:24.5,z:16.5,angle:0},empty())?.type,'toilet');
  assert.equal(s.target({x:16.4,z:16.5,angle:0},empty())?.type,'staff');
});
test('chairs use direct rays and reject occupied and reserved seats',t=>{
  const s=fixture(t),chair=pubChairs()[0],p={x:chair.x+.4,z:chair.z-1,angle:0},patrons=empty();
  assert.equal(s.target(p,patrons)?.type,'chair');assert.equal(s.target(p,patrons)?.chair.tableIndex,0);
  assert.equal(s.target(p,patrons,{x:12,z:8,chair}),null);
  patrons[0][0]=2;assert.notEqual(s.target(p,patrons)?.type,'chair');
  p.angle=.8;assert.notEqual(s.target(p,empty())?.type,'chair');
});
test('bar rays select the pint, taps and bartender without a facing cone',t=>{
  const s=fixture(t);
  assert.equal(s.target({x:7.1,z:12.3,angle:0},empty(),null,PUB.barBeer)?.type,'beer');
  assert.equal(s.target({x:5,z:12.3,angle:0},empty())?.type,'tap');
  assert.equal(s.target({x:9,z:14.8,angle:0},empty())?.type,'bartender');
  assert.equal(s.target({x:3,z:16.5,angle:0},empty())?.type,'bottles');
});
test('moving patrons block the body and occupied chair bumps identify the seat',t=>{
  const s=fixture(t),p={x:10,z:7};assert.equal(s.move(p,0,1,empty(),{x:10,z:8}),true);assert.ok(p.z<7.6);
  const c=pubChairs()[0],patrons=empty(),bumps=[];patrons[0][0]=2;
  p.x=c.x+.4;p.z=c.z-.5;assert.equal(s.move(p,0,1,patrons,null,bumps),true);assert.ok(bumps.some(b=>b.tableIndex===0&&b.seat===0));
});
test('small bar objects allow slightly off-centre aim without catching distant aim',t=>{
  const s=fixture(t),patrons=empty();
  for(const offset of [-.28,.28]){
    assert.equal(s.target({x:7.1+offset,z:12.3,angle:0},patrons,null,PUB.barBeer)?.type,'beer');
    assert.equal(s.target({x:5+offset,z:12.3,angle:0},patrons)?.type,'tap');
  }
  assert.notEqual(s.target({x:7.8,z:12.3,angle:0},patrons,null,PUB.barBeer)?.type,'beer');
  assert.notEqual(s.target({x:4.3,z:12.3,angle:0},patrons)?.type,'tap');
  assert.equal(s.target({x:6.1,z:12.3,angle:0},patrons,null,PUB.barBeer)?.type,'tap');
  assert.notEqual(s.target({x:7.1,z:10.5,angle:0},patrons,null,PUB.barBeer)?.type,'beer');
});
test('table edge beside a chair targets that chair even when the ray misses its frame',t=>{
  const s=fixture(t),patrons=empty();
  for(const [z,angle,seat] of [[1.8,0,0],[6.2,Math.PI,1]]){
    const hit=s.target({x:4.8,z,angle},patrons);
    assert.equal(hit?.type,'chair');assert.equal(hit.chair.tableIndex,0);assert.equal(hit.chair.seat,seat);
  }
  assert.notEqual(s.target({x:6,z:4,angle:-Math.PI/2},patrons)?.type,'chair');
  patrons[0][0]=2;
  assert.equal(s.target({x:4.8,z:1.8,angle:0},patrons),null);
  assert.equal(s.target({x:4.8,z:6.2,angle:Math.PI},patrons)?.chair.seat,1);
  assert.equal(s.target({x:4.8,z:6.2,angle:Math.PI},patrons,{x:12,z:8,chair:pubChairs()[1]}),null);
});
test('colliding with the table edge near an occupied seat bumps its character',t=>{
  const s=fixture(t),patrons=empty();patrons[0][0]=2;
  const p={x:4.8,z:1.8},bumps=[];
  assert.equal(s.move(p,0,1,patrons,null,bumps),true);
  assert.equal(bumps.length,1);assert.equal(bumps[0].tableIndex,0);assert.equal(bumps[0].seat,0);assert.ok(p.z<2.7);
  const side={x:6,z:4},sideBumps=[];
  assert.equal(s.move(side,-1,0,patrons,null,sideBumps),false);assert.equal(sideBumps.length,0);
  const opposite={x:4.8,z:6.2},oppositeBumps=[];
  assert.equal(s.move(opposite,0,-1,patrons,null,oppositeBumps),false);assert.equal(oppositeBumps.length,0);
  const vacant={x:4.8,z:1.8};assert.equal(s.move(vacant,0,1,empty()),false);
});
