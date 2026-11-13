import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rollCubicleKnock,CubicleKnockEvent,loadCubicleKnock,KNOCK_TEXT,CHILD_TEXT,KNOCK_EXIT_TEXT,KNOCK_AUDIO_SECONDS} from '../neon-city/cubicle-knock.js';

test('child event has a separate 50 percent threshold',()=>{
  assert.equal(rollCubicleKnock(()=>0),true);assert.equal(rollCubicleKnock(()=>.499999),true);
  assert.equal(rollCubicleKnock(()=>.5),false);assert.equal(rollCubicleKnock(()=>.999),false);
});
test('knocking precedes the child subtitle; pauses freeze the sequence and the exit line is exact',()=>{
  const event=new CubicleKnockEvent();assert.equal(event.text,'');event.update(.7);assert.equal(event.text,KNOCK_TEXT);
  event.update(10,null,false);assert.equal(event.elapsed,.7);assert.equal(event.text,'KNOCK KNOCK');
  event.update(1.401);assert.equal(event.text,CHILD_TEXT);assert.equal(event.text,"MOM? I CAN'T SEE YOU... WHERE ARE YOU?");
  event.update(6);assert.equal(event.text,'');assert.equal(KNOCK_EXIT_TEXT,'WTF JUST HAPPENED!?..');
  event.dispose();const elapsed=event.elapsed;event.update(1);assert.equal(event.elapsed,elapsed);
});
test('bundled audio contains distinct knocks followed by the complete voiced line',async()=>{
  const data=await readFile(new URL('../neon-city/assets/cubicle-child-knock.wav',import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.readUInt16LE(22),1);assert.equal(data.readUInt32LE(24),22050);
  const start=data.indexOf(Buffer.from('data'))+8,rate=22050,n=(data.length-start)/2;
  assert.ok(Math.abs(n/rate-KNOCK_AUDIO_SECONDS)<.002);
  const energy=(from,to)=>{let energy=0;for(let i=Math.floor(from*rate);i<Math.floor(to*rate);i++)energy+=Math.abs(data.readInt16LE(start+i*2));return energy;};
  assert.equal(energy(0,.65),0);assert.ok(energy(.7,.95)>10000);assert.ok(energy(1.08,1.3)>10000);
  assert.equal(energy(1.4,2),0);assert.ok(energy(2.1,6.5)>100000);
});
test('voice loads once and resumes from the event offset; exit disconnects and prevents late playback',async()=>{
  const previous=globalThis.fetch;let fetched=0;globalThis.fetch=async()=>{fetched++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
  try{
    const started=[],sources=[],buffer={duration:7.005},context={state:'running',currentTime:12,destination:{},decodeAudioData:async()=>buffer,
      createBufferSource(){const source={connect(){},start(...args){started.push(args);},stop(){this.stopped=true;},disconnect(){this.disconnected=true;}};sources.push(source);return source;}};
    await loadCubicleKnock(context);await loadCubicleKnock(context);assert.equal(fetched,1);
    const event=new CubicleKnockEvent();event.update(.8,context);assert.deepEqual(started[0],[12,.8]);
    event.update(.1,context);assert.equal(started.length,1);event.update(10,context,false);
    assert.equal(sources[0].stopped,true);assert.equal(sources[0].disconnected,true);
    event.update(.1,context);assert.ok(Math.abs(started[1][1]-1)<1e-9);
    event.dispose();event.update(1,context);assert.equal(started.length,2);assert.equal(sources[1].stopped,true);assert.equal(sources[1].disconnected,true);
    const finished=new CubicleKnockEvent();finished.update(8,context);assert.equal(started.length,2);
  }finally{globalThis.fetch=previous;}
});

test('real cubicle doors roll the child event only after a banshee miss and show the reaction on exit',async()=>{
  const {runInNewContext}=await import('node:vm'),lavatory=await import('../neon-city/lavatory.js');
  const game=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const source=game.slice(game.indexOf('function useDoor(){'),game.indexOf('function enterVenue('));
  for(const [banshee,child] of [[true,true],[false,false],[false,true]]){
    let childRolls=0,screams=0;const message={textContent:''};
    const sandbox={...lavatory,insideHotel:false,insidePub:false,insideLavatory:true,insideCubicle:null,player:{x:1.4,z:5,angle:0},
      banshee:null,bansheeMisses:0,cubicleKnock:null,register:{},audioContext:null,performance:{now:()=>0},
      rollBanshee:()=>banshee,rollCubicleKnock:()=>{childRolls++;return child;},playBansheeScream:()=>screams++,CubicleKnockEvent,KNOCK_EXIT_TEXT,
      lavatoryOccupied:[false,true,true],lavatoryLife:{walker:{type:13},held:true,wait:0},keys:new Set(),shiftKeys:new Set(),
      arcadeAmbience:{mute(){}},parkBirds:{mute(){}},document:{querySelector:()=>message}};
    runInNewContext(source+'\nuseDoor();',sandbox);
    assert.equal(childRolls,banshee?0:1);assert.equal(screams,banshee?1:0);assert.equal(!!sandbox.cubicleKnock,!banshee&&child);
    if(banshee||!child)continue;
    const event=sandbox.cubicleKnock;assert.equal(sandbox.lavatoryLife.walker,null);assert.equal(sandbox.lavatoryLife.held,false);
    assert.equal(sandbox.register.PUB_PARANORMAL_ACTIVITIES,true);event.update(3);
    Object.assign(sandbox.player,{x:.75,z:.5,angle:Math.PI});runInNewContext('useDoor();',sandbox);
    assert.equal(event.disposed,true);assert.equal(sandbox.cubicleKnock,null);assert.equal(sandbox.insideLavatory,true);
    assert.equal(message.textContent,KNOCK_EXIT_TEXT);assert.equal(sandbox.noticeText,KNOCK_EXIT_TEXT);assert.equal(sandbox.notice,5);assert.equal(sandbox.lavatoryLife.wait,8);
  }
});
