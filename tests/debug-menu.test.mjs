import test from 'node:test';
import assert from 'node:assert/strict';
import {DEBUG_MODE,DEBUG_DESTINATIONS,DEBUG_RIVERSIDE_SPAWN,parseEvents,walletPence} from '../neon-city/debug-menu.js';

test('debug destinations cover implemented scenes and debug mode defaults on',()=>{
  assert.equal(DEBUG_MODE,true);
  assert.equal(new Set(DEBUG_DESTINATIONS.map(([id])=>id)).size,11);
});
test('wallet edits preserve exact pence and reject invalid balances',()=>{
  assert.equal(walletPence('123.45'),12345);
  assert.equal(walletPence('0'),0);
  for(const value of ['-1','1.001','Infinity','1e3','','9007199254740992'])assert.throws(()=>walletPence(value));
});
test('event edits preserve JSON types and validate before application',()=>{
  const events={flag:true,count:2,label:'hello',empty:null,values:[false,3],nested:{value:'x'}};
  assert.deepEqual(parseEvents(JSON.stringify(events)),events);
  assert.deepEqual(parseEvents('{}'),{});
  for(const value of ['{','null','[]','true','{"count":1e999}','{"__proto__":{}}','{"nested":{"constructor":true}}'])assert.throws(()=>parseEvents(value));
});

test('riverside debug spawn is clear and permits walking in every direction',async()=>{
  const {City}=await import('../neon-city/world.js');
  const city=new City(123);
  city.update(DEBUG_RIVERSIDE_SPAWN.x,DEBUG_RIVERSIDE_SPAWN.z);
  assert.equal(city.solid(DEBUG_RIVERSIDE_SPAWN.x,DEBUG_RIVERSIDE_SPAWN.z),false);
  for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
    const player={...DEBUG_RIVERSIDE_SPAWN};
    city.move(player,dx,dz,[]);
    assert.equal(player.x,DEBUG_RIVERSIDE_SPAWN.x+dx);
    assert.equal(player.z,DEBUG_RIVERSIDE_SPAWN.z+dz);
  }
});
