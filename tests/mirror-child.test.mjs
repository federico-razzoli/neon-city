import test from 'node:test';
import assert from 'node:assert/strict';
import {LavatoryLife,LAVATORY} from '../neon-city/lavatory.js';
import {createThreeLavatoryScene} from '../neon-city/three-lavatory-scene.js';

test('sink event has a 40 percent threshold and remembers successful sightings',()=>{
  for(const [roll,expected] of [[0,true],[.3999,true],[.4,false],[.99,false]]){
    const life=new LavatoryLife(()=>roll),register={};
    assert.equal(life.triggerMirrorChild(register),expected);
    assert.equal(register.PUB_PARANORMAL_ACTIVITIES,expected?true:undefined);
  }
});
test('child walks from entrance to gents then disappears without changing occupancy',()=>{
  const life=new LavatoryLife(()=>0),occupied=[false,true,true];
  life.triggerMirrorChild({});assert.equal(life.mirrorChild.x,LAVATORY.door.x);
  life.wait=100;life.update(2.5,occupied,{},()=>false);
  assert.ok(life.mirrorChild.z>0&&life.mirrorChild.z<LAVATORY.depth);
  assert.equal(life.triggerMirrorChild({}),false);
  life.update(2.5,occupied,{},()=>false);
  assert.equal(life.mirrorChild,null);assert.equal(life.emptyGents,true);
  assert.deepEqual(occupied,[false,true,true]);
  assert.equal(life.triggerMirrorChild({}),false);
  assert.equal(new LavatoryLife(()=>0).triggerMirrorChild({}),true);
});
test('child body is visible exclusively to reflection cameras and retains geometry',()=>{
  const room=createThreeLavatoryScene({imageFor:()=>({width:24,height:48})}),life=new LavatoryLife(()=>0);
  const state={player:{...LAVATORY.spawn},eye:1.65,lavatoryOccupied:[false,true,true],lavatoryTaps:[],lavatoryLife:life,city:{chunks:new Map()},itemRoom:'lavatory'};
  room.update(state);assert.equal(room.scene.getObjectByName('lavatory-guest'),undefined);
  life.triggerMirrorChild({});room.update(state);
  const child=room.scene.getObjectByName('lavatory-guest'),geometry=child.geometry;
  assert.equal(child.position.x,LAVATORY.door.x);assert.equal(child.scale.y,1.2);
  assert.ok(child.material.map);assert.equal(room.camera.layers.test(child.layers),false);assert.equal(child.layers.mask,2);
  life.updateMirrorChild(1);room.update(state);assert.equal(child.geometry,geometry);
  life.updateMirrorChild(5);room.update(state);assert.equal(room.scene.getObjectByName('lavatory-guest'),undefined);room.dispose();
});

test('blackout is consumed by the next entered cubicle, and clears on exit',()=>{
  const life=new LavatoryLife(()=>0);life.triggerMirrorChild({});
  assert.equal(life.enterCubicle(LAVATORY.cubicles[0]),true);
  assert.equal(life.mirrorChild,null);assert.equal(life.cubicleBlackout,true);
  life.leaveCubicle();assert.equal(life.cubicleBlackout,false);
  assert.equal(life.enterCubicle(LAVATORY.cubicles[0]),false);
});
test('another cubicle or leaving the room cancels the blackout opportunity',()=>{
  for(const other of ['ladies','leave']){
    const life=new LavatoryLife(()=>0);life.triggerMirrorChild({});
    if(other==='leave')life.leaveRoom();
    else {assert.equal(life.enterCubicle(LAVATORY.cubicles[1]),false);life.leaveCubicle();}
    assert.equal(life.enterCubicle(LAVATORY.cubicles[0]),false);
  }
});

test('actual cubicle entry bypasses other scares, disables toilet use, and restores light on exit',async()=>{
  const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
  const lavatory=await import('../neon-city/lavatory.js?v=staff-room-1');
  const {createThreeLavatorySpatial}=await import('../neon-city/three-lavatory-spatial.js');
  const game=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const door=game.slice(game.indexOf('function useDoor(){'),game.indexOf('function enterVenue('));
  for(const mode of ['canvas','three']){
    const main=createThreeLavatorySpatial(),stall=createThreeLavatorySpatial('cubicle');
    try{
      let rolls=0;
      const life=new LavatoryLife(()=>0);life.triggerMirrorChild({});
      const sandbox={...lavatory,insideHotel:false,insidePub:false,insideLavatory:true,insideCubicle:null,
        player:{x:1.4,z:5,angle:0},playerSeat:null,hotelStairs:null,ladiesDoorEvent:null,cubicleKnock:null,
        lavatoryOccupied:[false,true,true],lavatoryLife:life,register:{},audioContext:null,
        rollBanshee(){rolls++;return true;},rollCubicleKnock(){rolls++;return true;},
        keys:new Set(),shiftKeys:new Set(),document:{querySelector:()=>({})},arcadeAmbience:{mute(){}},parkBirds:{mute(){}}};
      sandbox.washroomSpatial=()=>mode==='three'?(sandbox.insideCubicle?stall:main):null;
      sandbox.washroomTarget=()=>sandbox.washroomSpatial()?.target(sandbox.player);
      runInNewContext(door+'\nuseDoor();',sandbox);
      assert.equal(life.cubicleBlackout,true);assert.equal(rolls,0);
      // The toilet interaction has a direct guard, regardless of facing or renderer.
      const seatSource=game.slice(game.indexOf('function useSeat(){'),game.indexOf('\nfunction ',game.indexOf('function useSeat(){')+1));
      runInNewContext(seatSource+'\nuseSeat();',sandbox);assert.equal(sandbox.playerSeat,null);
      Object.assign(sandbox.player,{x:.75,z:.5,angle:Math.PI});runInNewContext('useDoor();',sandbox);
      assert.equal(life.cubicleBlackout,false);assert.equal(sandbox.insideLavatory,true);
      Object.assign(sandbox.player,{x:1.4,z:5,angle:0});runInNewContext('useDoor();',sandbox);
      assert.equal(life.cubicleBlackout,false);
    }finally{main.dispose();stall.dispose();}
  }
});
