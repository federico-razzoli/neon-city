import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {LadiesDoorEvent,LADIES_DOOR_TEXT,LADIES_DOOR_SECONDS,loadLadiesDoorVoice} from '../neon-city/ladies-door.js';
import * as lavatory from '../neon-city/lavatory.js';
import {createThreeLavatorySpatial} from '../neon-city/three-lavatory-spatial.js';

test('ladies event uses 75 percent on the first attempt and 50 percent thereafter',()=>{
  for(const [draw,expected] of [[.74999,true],[.75,false]]){
    const event=new LadiesDoorEvent(()=>draw);
    assert.equal(event.try([false,true,true],{}, {},null,1),expected);
    event.cancel();
  }
  const event=new LadiesDoorEvent(()=>.6);
  assert.equal(event.try([false,true,true],{}, {},null,1),true);
  event.cancel();
  assert.equal(event.try([false,true,true],{}, {},null,1),false);
  event.random=()=>.49999;
  assert.equal(event.try([false,true,true],{}, {},null,1),true);
  assert.equal(event.attempts,3);
  event.try([false,true,true],{}, {},null,1);assert.equal(event.attempts,3,'active event cannot reroll');
});

test('voice finishes before the lock turns green, and a robot never leaves the haunted cubicle',()=>{
  const occupied=[false,true,true],life=new lavatory.LavatoryLife(()=>0),register={};
  const event=new LadiesDoorEvent(()=>0);
  assert.equal(event.try(occupied,life,register,null,1),true);
  assert.equal(register.PUB_PARANORMAL_ACTIVITIES,true);assert.equal(event.text,LADIES_DOOR_TEXT);
  life.wait=0;life.update(.1,occupied,{x:9,z:1});assert.equal(life.walker,null);assert.equal(occupied[1],true);
  event.update(3,null);assert.equal(occupied[1],true);
  event.update(10,null,true,false);assert.equal(occupied[1],true,'pause freezes the sequence');
  event.update(.25,null);assert.equal(occupied[1],false);assert.equal(life.emptyLadies,true);
  assert.equal(life.hauntedLadiesPending,undefined);assert.equal(event.text,'');
  life.wait=0;life.update(.1,occupied,{x:9,z:1});assert.equal(life.walker,null);
});

test('leaving cancels the voice without unlocking the old room or resetting attempt history',()=>{
  const event=new LadiesDoorEvent(()=>0),occupied=[false,true,true],life={};
  event.try(occupied,life,{},null,1);event.update(1,null);event.update(10,null,false);
  assert.equal(event.active,null);assert.equal(occupied[1],true);assert.equal(life.hauntedLadiesPending,undefined);
  assert.equal(event.attempts,1);
});

test('bundled female voice has the expected duration and audible content',async()=>{
  const data=await readFile(new URL('../neon-city/assets/ladies-danny.wav',import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt16LE(22),1);
  const offset=data.indexOf(Buffer.from('data'))+8,rate=data.readUInt32LE(24);
  assert.ok(Math.abs((data.length-offset)/2/rate-LADIES_DOOR_SECONDS)<.002);
  let energy=0;for(let i=offset;i<data.length;i+=2)energy+=Math.abs(data.readInt16LE(i));
  assert.ok(energy>100000);
});

test('both renderers trigger on the red ladies door and enter the empty cubicle afterward',async t=>{
  const main=createThreeLavatorySpatial();t.after(()=>main.dispose());
  const game=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const source=game.slice(game.indexOf('function useDoor(){'),game.indexOf('function enterVenue('));
  for(const mode of ['canvas','three']){
    let rolls=0;
    const sandbox={...lavatory,insideHotel:false,insidePub:false,insideLavatory:true,insideCubicle:null,
      player:{x:3.6,z:5,angle:0},ladiesDoorEvent:new LadiesDoorEvent(()=>0),LADIES_DOOR_TEXT,
      lavatoryOccupied:[false,true,true],lavatoryLife:new lavatory.LavatoryLife(()=>0),register:{},audioContext:null,
      enableSound(){},rollBanshee(){rolls++;return true;},rollCubicleKnock(){rolls++;return true;},
      keys:new Set(),shiftKeys:new Set(),document:{querySelector:()=>({})},arcadeAmbience:{mute(){}},parkBirds:{mute(){}}};
    sandbox.washroomSpatial=()=>mode==='three'?main:null;
    sandbox.washroomTarget=()=>main.target(sandbox.player);
    runInNewContext(source+'\nuseDoor();',sandbox);
    assert.equal(sandbox.register.PUB_PARANORMAL_ACTIVITIES,true);
    assert.equal(sandbox.insideLavatory,true);assert.equal(sandbox.lavatoryOccupied[1],true);
    sandbox.ladiesDoorEvent.update(LADIES_DOOR_SECONDS,null);
    runInNewContext('useDoor();',sandbox);
    assert.equal(sandbox.insideCubicle.icon,'ladies');assert.equal(rolls,0,'empty cubicle suppresses banshee and child scares');
  }
});

test('voice decoding is cached and pause stops playback before resuming at its offset',async()=>{
  const original=globalThis.fetch;let fetched=0;const sources=[];
  globalThis.fetch=async()=>{fetched++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
  const context={state:'running',currentTime:10,destination:{},decodeAudioData:async()=>({duration:LADIES_DOOR_SECONDS}),
    createBufferSource(){const source={connect(){},start(...args){this.started=args;},stop(){this.stopped=true;},disconnect(){}};sources.push(source);return source;}};
  try{
    await loadLadiesDoorVoice(context);await loadLadiesDoorVoice(context);assert.equal(fetched,1);
    const event=new LadiesDoorEvent(()=>0),occupied=[false,true,true];event.try(occupied,{}, {},context,1);
    await Promise.resolve();event.update(.1,context);assert.deepEqual(sources[0].started,[10,.1]);
    event.update(1,context,true,false);assert.equal(sources[0].stopped,true);
    event.update(.1,context);assert.deepEqual(sources[1].started,[10,.2]);
    event.cancel();assert.equal(sources[1].stopped,true);assert.equal(occupied[1],true);
  }finally{globalThis.fetch=original;}
});
