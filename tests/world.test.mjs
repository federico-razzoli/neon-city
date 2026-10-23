import test from 'node:test';
import assert from 'node:assert/strict';
import {City,pedestrian,traffic,PERSON_CLEARANCE,PEDESTRIAN_MIN_SPEED,PEDESTRIAN_MAX_SPEED} from '../neon-city/world.js';

test('nearby blocks are retained; forgotten blocks regenerate; memory is bounded',()=>{
  const c=new City(42);c.update(0,0);const original=c.chunks.get('0,0');assert.equal(c.chunks.size,25);
  c.update(64,64);assert.equal(c.chunks.get('0,0'),original);
  for(let i=0;i<200;i++){c.update(i*64,i*32);assert.ok(c.chunks.size<=49);}
  assert.ok(!c.chunks.has('0,0'));c.update(0,0);assert.notDeepEqual(c.chunks.get('0,0').buildings,original.buildings);
});
test('solid buildings stop walking and high-speed knockback, including negative coordinates',()=>{
  const c=new City(1);
  for(const origin of [0,-64]){const p={x:origin+10,z:origin+20};c.move(p,100,0);assert.ok(p.x<origin+14);assert.ok(!c.solid(p.x,p.z));c.move(p,0,20);assert.ok(p.z>origin+39);}
});
test('pedestrian loops remain on sidewalks',()=>{
  const c=new City(3);c.update(-64,-64);for(const chunk of c.chunks.values())for(const p of chunk.people)for(const t of [0,100,9999]){const pos=pedestrian(chunk,p,t);assert.ok(!c.solid(pos.x,pos.z));assert.ok(pos.type>=0&&pos.type<=2);}
});
test('traffic moves, stays in roads and continues in neighboring blocks',()=>{
  const a=traffic({x:0,z:0},10),b=traffic({x:0,z:1},10),next=traffic({x:0,z:0},10.1);
  assert.equal(a.length,4);assert.notEqual(a[0].z,next[0].z);assert.equal(b[0].z-a[0].z,64);
  const colors=new Set();for(let i=-5;i<5;i++)for(const car of traffic({x:i,z:i},123)){colors.add(car.color);assert.ok(!new City(1).solid(car.x,car.z));}assert.equal(colors.size,4);
});

test('pedestrians block walking, 3x running and large knockback without tunneling',()=>{
  const c=new City(1);
  for(const offset of [0,-64])for(const distance of [.116,.348,20]){
    const p={x:offset+11,z:offset+18},npc={x:offset+11,z:offset+20};
    for(let i=0;i<60;i++)c.move(p,0,distance,[npc]);
    assert.ok(p.z<npc.z);
    assert.ok(Math.hypot(p.x-npc.x,p.z-npc.z)>=PERSON_CLEARANCE);
    const stopped=p.z;
    c.move(p,0,-1,[npc]);assert.ok(p.z<stopped,'can back away');
  }
});

test('player can slide around a pedestrian without entering a building',()=>{
  const c=new City(1),p={x:11,z:18},npc={x:11,z:20};
  for(let i=0;i<20;i++){
    c.move(p,.08,.12,[npc]);
    assert.ok(Math.hypot(p.x-npc.x,p.z-npc.z)>=PERSON_CLEARANCE);
    assert.ok(!c.solid(p.x,p.z));
  }
  assert.ok(p.x>12);assert.ok(p.z>20);
});

test('NPC approaching a stationary player waits and resumes when the path clears',()=>{
  const c=new City(1),npc={phase:8,speed:1,type:0,reverse:false,variant:0};
  const chunk={x:0,z:0,people:[npc]};c.chunks.set('0,0',chunk);
  const p={x:20,z:11};
  for(let i=1;i<=200;i++){
    c.advancePedestrians(.02,p,i*.02);
    const pos=pedestrian(chunk,npc,i*.02);
    assert.ok(Math.hypot(pos.x-p.x,pos.z-p.z)>=PERSON_CLEARANCE);
  }
  const stopped=pedestrian(chunk,npc,4).x;
  assert.ok(stopped<20);
  p.z=9;
  c.advancePedestrians(.02,p,4.02);
  assert.ok(pedestrian(chunk,npc,4.02).x>stopped);
});

function crowd(specs){
  const city=new City(1),people=specs.map(spec=>({speed:1,type:0,reverse:false,variant:0,walkTime:0,...spec}));
  const chunk={x:0,z:0,people};city.chunks.set('0,0',chunk);
  return {city,people,chunk};
}
function separated(chunk){
  const positions=chunk.people.map(p=>pedestrian(chunk,p,0));
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
    assert.ok(Math.hypot(positions[i].x-positions[j].x,positions[i].z-positions[j].z)>=PERSON_CLEARANCE-1e-9);
  }
}
test('opposing pedestrians step aside, pass, return and resume in either update order',()=>{
  for(const reverseOrder of [false,true])for(const phase of [10,40,82,124]){
    const specs=[{phase},{phase:phase+4,reverse:true}];
    if(reverseOrder)specs.reverse();
    const {city,people,chunk}=crowd(specs);
    const yielding=people.find(p=>!p.reverse),passing=people.find(p=>p.reverse);
    let anchor,returned=false,sawWait=false;
    for(let i=1;i<=400;i++){
      city.advancePedestrians(.04,{x:0,z:0},i*.04);separated(chunk);
      for(const p of people){const pos=pedestrian(chunk,p,0);assert.ok(!city.solid(pos.x,pos.z));}
      if(yielding.yielding){
        anchor??=yielding.walkTime;
        assert.equal(yielding.walkTime,anchor,'route position stays fixed while yielding');
        if(yielding.yielding.stage==='wait')sawWait=true;
      }else if(anchor!==undefined)returned=true;
    }
    assert.ok(sawWait&&returned,'steps aside and returns');
    assert.ok(yielding.walkTime>anchor+1,'resumes walking');
    assert.ok(passing.walkTime>8,'other pedestrian passes');
  }
});
test('followers queue behind a player-blocked pedestrian, then resume',()=>{
  for(const reverseOrder of [false,true]){
    const specs=[{phase:8},{phase:6,speed:1.2},{phase:4,speed:1.5}];
    if(reverseOrder)specs.reverse();
    const {city,people,chunk}=crowd(specs),player={x:20,z:11};
    for(let i=1;i<=200;i++){city.advancePedestrians(.04,player,i*.04);separated(chunk);}
    const stopped=people.map(p=>p.walkTime);
    for(let i=201;i<=225;i++)city.advancePedestrians(.04,player,i*.04);
    assert.deepEqual(people.map(p=>p.walkTime),stopped);
    player.z=8;
    for(let i=226;i<=275;i++){city.advancePedestrians(.04,player,i*.04);separated(chunk);}
    assert.ok(people.every((p,i)=>p.walkTime>stopped[i]));
  }
});
test('faster follower yields without stopping the leader',()=>{
  const {city,people,chunk}=crowd([{phase:8,speed:.9},{phase:6,speed:1.5}]);
  for(let i=1;i<=200;i++){city.advancePedestrians(.04,{x:0,z:0},i*.04);separated(chunk);}
  assert.ok(Math.abs(people[0].walkTime-8)<1e-8);
  assert.ok(people[1].walkTime<people[0].walkTime);
});
test('pedestrians stop around corners, and generated crowds start separated even late in the game',()=>{
  const {city,chunk}=crowd([{phase:40},{phase:44,reverse:true}]);
  for(let i=1;i<=200;i++){city.advancePedestrians(.04,{x:0,z:0},i*.04);separated(chunk);}
  const generated=new City(42);generated.update(6400,-6400);
  for(const block of generated.chunks.values())separated(block);
  generated.advancePedestrians(.04,{x:6400,z:-6400},10000);
  for(const block of generated.chunks.values())separated(block);
});

test('a player blocking the sidestep makes pedestrians wait, then yield when clear',()=>{
  const {city,people,chunk}=crowd([{phase:10},{phase:14,reverse:true}]);
  const player={x:22.4,z:9.9};
  for(let i=1;i<=150;i++){
    city.advancePedestrians(.04,player,i*.04);separated(chunk);
    for(const p of city.pedestrians(0))assert.ok(Math.hypot(p.x-player.x,p.z-player.z)>=PERSON_CLEARANCE);
  }
  assert.ok(people.every(p=>!p.yielding),'does not sidestep through the player');
  player.z=0;
  for(let i=151;i<=450;i++){city.advancePedestrians(.04,player,i*.04);separated(chunk);}
  assert.ok(people.every(p=>!p.yielding&&p.walkTime>5),'both resume after clearance');
});


test('individual pedestrian speeds stay within 1–2x and do not depend on appearance',()=>{
  const city=new City(42);city.update(0,0);
  const byType=[new Set(),new Set(),new Set()];
  for(const chunk of city.chunks.values())for(const p of chunk.people){
    assert.ok(p.speed>=PEDESTRIAN_MIN_SPEED&&p.speed<=PEDESTRIAN_MAX_SPEED);
    byType[p.type].add(p.speed);
    const original=pedestrian(chunk,{...p,walkTime:2},0);
    const changed=pedestrian(chunk,{...p,type:(p.type+1)%3,variant:.123,walkTime:2},0);
    assert.equal(original.x,changed.x);assert.equal(original.z,changed.z);
  }
  assert.equal(PEDESTRIAN_MAX_SPEED/PEDESTRIAN_MIN_SPEED,2);
  assert.ok(byType.every(speeds=>speeds.size>10));
  const people=[...city.chunks.values()].flatMap(chunk=>chunk.people),speeds=people.map(p=>p.speed);
  for(let i=1;i<=100;i++)city.advancePedestrians(.04,{x:0,z:0},i*.04);
  assert.deepEqual(people.map(p=>p.speed),speeds);
});

test('sky stays at world bearings, matches city perspective and repeats only after a full turn',async()=>{
  const {projectSky}=await import('../neon-city/sky.js');
  const object={bearing:.3,elevation:.2};
  const initial=projectSky(object,0,640,355,164);
  const turned=projectSky(object,.2,640,355,164);
  assert.ok(turned.x<initial.x,'turning right moves the sky left');
  const dx=Math.sin(object.bearing),dz=Math.cos(object.bearing),angle=.2;
  const depth=dx*Math.sin(angle)+dz*Math.cos(angle);
  assert.ok(Math.abs(turned.x-(320+355*(dx*Math.cos(angle)-dz*Math.sin(angle))/depth))<1e-9);
  assert.ok(Math.abs(turned.y-(164-355*Math.tan(object.elevation)/depth))<1e-9);
  assert.equal(projectSky(object,Math.PI,640,355,164),null,'moon is behind the viewer');
  assert.equal(projectSky(object,1.5,640,355,164),null,'offscreen objects do not wrap');
  for(const angle of [-2*Math.PI,2*Math.PI]){
    const returned=projectSky(object,angle,640,355,164);
    assert.ok(Math.abs(returned.x-initial.x)<1e-9);
    assert.ok(Math.abs(returned.y-initial.y)<1e-9);
  }
});

test('car horns warn before contact in either orientation and respect cooldown',async()=>{
  const {HornWarning,distanceToCar}=await import('../neon-city/horn.js');
  for(const axis of [0,1]){
    const car={x:10,z:10,axis},warning=new HornWarning();
    const near=axis?{x:10,z:12.5}:{x:12.5,z:10};
    assert.ok(distanceToCar(near,car)>0,'warning starts before impact');
    assert.equal(warning.update(.04,{x:20,z:20},[car]),false);
    assert.equal(warning.update(.04,near,[car,car]),true);
    assert.equal(warning.update(.04,near,[car]),false);
    assert.equal(warning.update(2,near,[car]),false);
    assert.equal(warning.update(.5,near,[car]),true);
    assert.equal(warning.update(3,near,[]),false);
    assert.equal(warning.update(.04,{x:car.x+10,z:car.z+10},[car]),false);
  }
});

test('cars in the same lane have varied colours that persist across tile crossings',()=>{
  for(const axis of [0,1])for(const dir of [-1,1]){
    const pick=(chunk,time)=>traffic(chunk,time).find(c=>c.axis===axis&&c.dir===dir);
    const colours=new Set();
    for(let i=-10;i<=10;i++)colours.add(pick({x:axis?i:0,z:axis?0:i},10).color);
    assert.equal(colours.size,4);
    for(const tile of [-3,0,3]){
      const chunk={x:axis?tile:0,z:axis?0:tile};
      const next={x:chunk.x+(axis?dir:0),z:chunk.z+(axis?0:dir)};
      const before=pick(chunk,62.69),after=pick(next,62.71);
      assert.equal(before.color,after.color,'same car keeps its colour across the boundary');
      assert.ok(Math.abs(Math.hypot(after.x-before.x,after.z-before.z)-.2)<1e-9);
      assert.equal(pick(chunk,10).color,pick(chunk,10.01).color);
    }
  }
});

test('pedestrian front and back follow walking direction on every side of the block',async()=>{
  const {pedestrianShowsBack}=await import('../neon-city/world.js');
  const chunk={x:-1,z:2};
  for(const reverse of [false,true])for(let side=0;side<4;side++){
    const p={phase:side*42+10,speed:1,reverse,type:0,walkTime:0};
    const pos=pedestrian(chunk,p,0),next=pedestrian(chunk,{...p,walkTime:.1},0);
    assert.ok((next.x-pos.x)*pos.facingX+(next.z-pos.z)*pos.facingZ>0);
    const front={x:pos.x+pos.facingX*5,z:pos.z+pos.facingZ*5};
    const back={x:pos.x-pos.facingX*5,z:pos.z-pos.facingZ*5};
    assert.equal(pedestrianShowsBack(pos,front),false);
    assert.equal(pedestrianShowsBack(pos,back),true);
    assert.deepEqual(pedestrian(chunk,p,100),pos,'waiting keeps the same facing');
    const yielding=pedestrian(chunk,{...p,yielding:{dx:1,dz:0,offset:1.3}},0);
    assert.equal(yielding.facingX,pos.facingX);assert.equal(yielding.facingZ,pos.facingZ);
  }
  const before=pedestrian(chunk,{phase:41.9,speed:1,walkTime:0},0);
  const after=pedestrian(chunk,{phase:41.9,speed:1,walkTime:.2},0);
  assert.equal(before.facingX,1);assert.equal(after.facingZ,1);
});

test('movement reports pedestrian bumps but not idle, clear movement or building collisions',()=>{
  const city=new City(1),npc={x:11,z:20};
  for(const distance of [.1,.348,20]){
    const player={x:11,z:19.1};
    assert.equal(city.move(player,0,distance,[npc]),true);
    assert.ok(Math.hypot(player.x-npc.x,player.z-npc.z)>=PERSON_CLEARANCE);
    assert.equal(city.move(player,0,0,[npc]),false);
    assert.equal(city.move(player,0,-.2,[npc]),false);
  }
  assert.equal(city.move({x:11,z:10},0,.1,[npc]),false);
  assert.equal(city.move({x:13,z:20},2,0,[]),false);
  assert.equal(city.move({x:10.5,z:19.2},.1,.2,[npc]),true,'sliding contact also reports a bump');
});

test('arcade ambience fades with distance and only comes from arcade buildings',async()=>{
  const {arcadeVolume}=await import('../neon-city/arcade.js');
  const b={x:14,z:14,w:17.8,d:17.8,sign:'ARCADE'};
  assert.equal(arcadeVolume({x:20,z:12},[b]),1);
  assert.equal(arcadeVolume({x:20,z:7},[b]),.5);
  assert.equal(arcadeVolume({x:20,z:2},[b]),0);
  assert.equal(arcadeVolume({x:20,z:12},[{...b,sign:'HOTEL'}]),0);
  assert.equal(arcadeVolume({x:20,z:12},[]),0);
  assert.equal(arcadeVolume({x:20,z:12},[b,b]),1,'multiple arcades do not multiply volume');
  const city=new City(1);
  for(const [player,dx,dz] of [[{x:22,z:12},0,10],[{x:12,z:22},10,0],[{x:52,z:22},-10,0],[{x:22,z:52},0,-10]]){
    city.move(player,dx,dz);
    assert.equal(city.solid(player.x,player.z),false,'closed storefront cannot be entered');
  }
});

test('arcade audio reuses one quiet loop and mutes on pause',async()=>{
  const {ArcadeAmbience}=await import('../neon-city/arcade.js');
  let starts=0,lastVolume,buffer;
  const context={state:'running',sampleRate:8000,currentTime:0,destination:{},
    createGain:()=>({gain:{value:0,setTargetAtTime:v=>{lastVolume=v;}},connect(){}}),
    createBuffer:(_,length)=>{buffer=new Float32Array(length);return {getChannelData:()=>buffer};},
    createBufferSource:()=>({connect(){},start(){starts++;}})};
  const sound=new ArcadeAmbience();sound.update(context,0);assert.equal(starts,0);
  sound.update(context,1);sound.update(context,.5);assert.equal(starts,1);assert.equal(lastVolume,.5);
  assert.ok(buffer.some(x=>x!==0));assert.ok(buffer.every(x=>Number.isFinite(x)&&Math.abs(x)<.1));
  sound.mute();assert.equal(lastVolume,0);
  sound.update(context,1);assert.equal(starts,1);assert.equal(lastVolume,1);
});

test('arcade effects have 1–2 second durations and 3–6 second silent intervals',async()=>{
  const {ArcadeEffectSchedule,arcadeEffectSamples}=await import('../neon-city/arcade.js');
  for(const value of [0,.5,.999999]){
    const schedule=new ArcadeEffectSchedule(()=>value),gap=3+value*3;
    assert.equal(schedule.update(gap-.01,true),null);
    const effect=schedule.update(.02,true);
    assert.ok(effect.duration>=1&&effect.duration<=2);
    assert.equal(effect.kind,['laser','crash','pinball'][Math.floor(value*3)]);
    assert.equal(schedule.update(effect.duration+gap-.01,true),null);
    assert.ok(schedule.update(.02,true));
    schedule.update(100,false);assert.equal(schedule.update(.01,true),null,'re-entering does not immediately fire');
    schedule.reset();assert.equal(schedule.update(.01,true),null,'pause resets the effect timer');
  }
  const sounds=['laser','crash','pinball'].map(kind=>arcadeEffectSamples(kind,1.5,8000));
  for(const samples of sounds){
    assert.equal(samples.length,12000);
    assert.ok(samples.some(x=>Math.abs(x)>.03));
    assert.ok(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<.3));
    assert.equal(samples[0],0);assert.ok(Math.abs(samples.at(-1))<.001);
  }
  assert.notDeepEqual(sounds[0],sounds[1]);assert.notDeepEqual(sounds[1],sounds[2]);
});
