import test from 'node:test';
import assert from 'node:assert/strict';
import {drawArcade} from '../neon-city/arcade.js';

test('arcade windows and sides vary while retaining their layout on redraw',()=>{
  const render=(building,side)=>{
    const positions=[];
    const g={fillRect(){},beginPath(){},moveTo(x){positions.push(x);},lineTo(){},closePath(){},fill(){}};
    drawArcade(g,160,building,side);
    assert.equal(positions.length,2,'one pinball in each window');
    return positions.map((x,i)=>(x-[13,103][i])/17);
  };
  const layouts=new Set();
  for(let n=-30;n<30;n++){
    const building={x:14+n*64,z:32-n*64};
    const sides=Array.from({length:4},(_,side)=>render(building,side));
    for(const pair of sides){
      assert.ok(pair.every(slot=>Number.isInteger(slot)&&slot>=0&&slot<3));
      assert.notEqual(pair[0],pair[1],'paired windows have different pinball positions');
    }
    assert.equal(new Set(sides.map(JSON.stringify)).size,4,'each side has a distinct pair');
    for(const side of [3,1,0,2])assert.deepEqual(render({...building},side),sides[side]);
    layouts.add(JSON.stringify(sides));
  }
  assert.ok(layouts.size>1,'different addresses vary');
});
import {City,pedestrian,traffic,PEDESTRIAN_TYPES,PERSON_CLEARANCE,PEDESTRIAN_MIN_SPEED,PEDESTRIAN_MAX_SPEED} from '../neon-city/world.js';
import {RIVER_ROWS,BLOCK,RIVER_WIDTH,WATER_LEVEL,BRIDGE_RISE,groundHeight,bridgeHeight} from '../neon-city/world.js';
import {drawRiverTerrain,drawRiverStructures} from '../neon-city/rivers.js';

test('wide parallel rivers flank spawn four to six streets away and eight to twelve blocks apart',()=>{
  const city=new City(42),centres=RIVER_ROWS.map(row=>(row+1)*BLOCK);
  assert.equal(centres.length,2);
  assert.ok(centres[0]<4&&centres[1]>4);
  assert.ok((centres[1]-centres[0])/BLOCK>=8&&(centres[1]-centres[0])/BLOCK<=12);
  assert.ok(RIVER_WIDTH>BLOCK);
  assert.ok(WATER_LEVEL<=-5);
  for(const centre of centres)assert.ok(Math.abs(centre-4)/BLOCK>=4&&Math.abs(centre-4)/BLOCK<=6);
  for(const row of RIVER_ROWS)for(const part of [row,row+1])for(const x of [-3,0,7]){
    const chunk=city.generate(x,part);
    assert.ok(chunk.river);
    assert.equal(chunk.buildings.length+chunk.manholes.length+chunk.newspaperMachines.length,0);
    for(const p of chunk.people)for(let t=0;t<400;t++){
      const pos=pedestrian(chunk,{...p,walkTime:t},t);
      assert.ok(!city.solid(pos.x,pos.z),'bank and bridge pedestrian routes stay dry');
    }
    for(let t=0;t<20;t+=.1)for(const car of traffic(chunk,t))assert.ok(!city.solid(car.x,car.z,1.5),'traffic crosses on bridges or follows bank roads');
    if(part===row+1)assert.ok(traffic(chunk,0).every(c=>c.axis===0),'no cross traffic on water');
  }
});

test('water blocks walking and knockback while bridge sidewalks cross both wide rivers',()=>{
  const city=new City(1);
  for(const row of RIVER_ROWS){
    const z=row*BLOCK;
    for(const [from,direction] of [[11,1],[117,-1]]){
      const bank={x:32,z:z+from};city.move(bank,0,direction*150);
      assert.ok(direction>0?bank.z<z+18:bank.z>z+110);
    }
    for(let t=19;t<110;t++)assert.ok(city.solid(32,z+t));
    for(const x of [-11,0,11,53,64,75]){
      const p={x,z:z+11};city.move(p,0,106);
      assert.ok(Math.abs(p.z-(z+117))<1e-6,'bridge remains traversable');
      city.move(p,0,-106);assert.ok(Math.abs(p.z-(z+11))<1e-6);
    }
  }
});

test('bridge elevations meet the banks, rise smoothly, and remain symmetric across chunk seams',()=>{
  for(const row of RIVER_ROWS){
    const z=row*BLOCK;
    assert.equal(bridgeHeight(z+18),0);assert.equal(bridgeHeight(z+110),0);
    assert.equal(groundHeight(0,z+64),BRIDGE_RISE);
    assert.equal(groundHeight(32,z+64),0);
    for(let t=18;t<110;t+=.25){
      assert.ok(Math.abs(bridgeHeight(z+t)-bridgeHeight(z+128-t))<1e-10);
      assert.ok(Math.abs(bridgeHeight(z+t+.25)-bridgeHeight(z+t))<.06);
      assert.equal(groundHeight(11,z+t),groundHeight(3,z+t),'sidewalk and road follow the same arch');
    }
  }
});

test('river geometry has recessed water, grassy banks, and elevated bridge decks matching physics',()=>{
  const city=new City(1);
  for(const row of RIVER_ROWS)for(const part of [row,row+1]){
    const chunk=city.generate(0,part),quads=[],faces=[];
    drawRiverTerrain(chunk,{quad:(...args)=>quads.push(args)},0);
    drawRiverStructures(chunk,{face:(vertices,color)=>faces.push({vertices,color}),box:()=>{} });
    assert.ok(quads.some(q=>q[1]===WATER_LEVEL));
    assert.ok(quads.some(q=>q[5]==='#345841'),'grass on each bank');
    assert.ok(quads.some(q=>q[5]==='#757380'),'walking path on each bank');
    for(const {vertices,color} of faces)if(color==='#292b3b'||color==='#757380')for(const v of vertices)
      assert.ok(Math.abs(v.y-groundHeight(v.x,v.z)-.075)<1e-9,'road and path match collision elevation');
    assert.ok(faces.some(f=>f.vertices.some(v=>v.y>5)),'arched structure reaches above banks');
    const bank=part===row?row*BLOCK+18:row*BLOCK+110;
    const landViewer={z:bank+(part===row?-1:1)};
    const landFaces=[];
    drawRiverStructures(chunk,{face:vertices=>landFaces.push(vertices),box:()=>{}},landViewer);
    assert.ok(landFaces.every(vertices=>vertices.every(v=>v.y>WATER_LEVEL)), 'retaining wall backs cannot cover the grass from land');
  }
});

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
  const c=new City(3);c.update(-64,-64);for(const chunk of c.chunks.values())for(const p of chunk.people)for(const t of [0,100,9999]){const pos=pedestrian(chunk,p,t);assert.ok(!c.solid(pos.x,pos.z));assert.ok(pos.type>=0&&pos.type<PEDESTRIAN_TYPES);}
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

test('a pedestrian blocked by the player turns around and walks away without teleporting',()=>{
  for(const reverse of [false,true]){
    const {city,people,chunk}=crowd([{phase:reverse?10:8,reverse}]);
    const npc=people[0],player={x:20,z:11};
    let turns=0,previousDirection=reverse;
    for(let i=1;i<=200;i++){
      const before=pedestrian(chunk,npc,0);
      city.advancePedestrians(.02,player,i*.02);
      const pos=pedestrian(chunk,npc,0);
      assert.ok(Math.hypot(pos.x-player.x,pos.z-player.z)>=PERSON_CLEARANCE);
      assert.ok(Math.hypot(pos.x-before.x,pos.z-before.z)<=.021);
      if(npc.reverse!==previousDirection){turns++;previousDirection=npc.reverse;}
    }
    assert.equal(turns,1);
    const before=pedestrian(chunk,npc,0);
    city.advancePedestrians(.02,player,4.02);
    const after=pedestrian(chunk,npc,0);
    assert.ok(Math.hypot(after.x-player.x,after.z-player.z)>Math.hypot(before.x-player.x,before.z-player.z));
  }
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
test('a queue blocked by the player unwinds safely without the player moving',()=>{
  for(const reverseOrder of [false,true]){
    const specs=[{phase:8},{phase:6,speed:1.2},{phase:4,speed:1.5}];
    if(reverseOrder)specs.reverse();
    const {city,people,chunk}=crowd(specs),player={x:20,z:11};
    for(let i=1;i<=200;i++){city.advancePedestrians(.04,player,i*.04);separated(chunk);}
    const stopped=people.map(p=>p.walkTime);
    for(let i=201;i<=225;i++)city.advancePedestrians(.04,player,i*.04);
    assert.ok(people.every(p=>p.reverse),'all walkers turn away from the player');
    assert.ok(people.some((p,i)=>p.walkTime>stopped[i]));
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

test('a blocked sidestep on a straight sidewalk triggers the turnaround fallback',()=>{
  const {city,people,chunk}=crowd([{phase:10},{phase:14,reverse:true}]);
  const player={x:22.4,z:9.9};
  for(let i=1;i<=150;i++){
    city.advancePedestrians(.04,player,i*.04);separated(chunk);
    for(const p of city.pedestrians(0))assert.ok(Math.hypot(p.x-player.x,p.z-player.z)>=PERSON_CLEARANCE);
  }
  assert.ok(people.every(p=>!p.yielding),'does not sidestep through the player');
  assert.equal(people[0].reverse,people[1].reverse,'one turns around even away from corners');
  assert.ok(people.every(p=>p.walkTime>2),'both move again without waiting for the player to leave');
  player.z=0;
  for(let i=151;i<=450;i++){city.advancePedestrians(.04,player,i*.04);separated(chunk);}
  assert.ok(people.every(p=>!p.yielding&&p.walkTime>5),'both resume after clearance');
});


test('individual pedestrian speeds stay within 1–2x and do not depend on appearance',()=>{
  const city=new City(42);city.update(0,0);
  const byType=Array.from({length:PEDESTRIAN_TYPES},()=>new Set());
  // Sample beyond the loaded 5×5 area so every character type has enough walkers.
  const sample=[];for(let x=-4;x<=4;x++)for(let z=-3;z<=3;z++)sample.push(city.generate(x,z));
  for(const chunk of sample)for(const p of chunk.people){
    assert.ok(p.speed>=PEDESTRIAN_MIN_SPEED&&p.speed<=PEDESTRIAN_MAX_SPEED);
    byType[p.type].add(p.speed);
    const original=pedestrian(chunk,{...p,walkTime:2},0);
    const changed=pedestrian(chunk,{...p,type:(p.type+1)%PEDESTRIAN_TYPES,variant:.123,walkTime:2},0);
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

test('corner deadlocks resolve by turning one pedestrian without teleporting',()=>{
  for(const reverseOrder of [false,true])for(let corner=0;corner<4;corner++){
    const specs=[{phase:41.35+42*corner},{phase:42.65+42*corner,reverse:true}];
    if(reverseOrder)specs.reverse();
    const {city,people,chunk}=crowd(specs),player={x:52.35,z:9.6};
    for(let turn=0;turn<corner;turn++){const x=player.x;player.x=64-player.z;player.z=x;}
    const directions=people.map(p=>p.reverse);
    let turns=0;
    for(let i=1;i<=250;i++){
      const before=people.map(p=>pedestrian(chunk,p,0));
      city.advancePedestrians(.04,player,i*.04);separated(chunk);
      people.forEach((p,j)=>{
        const after=pedestrian(chunk,p,0);
        assert.ok(Math.hypot(after.x-before[j].x,after.z-before[j].z)<=.073,'no teleport on reversal');
        assert.ok(Math.hypot(after.x-player.x,after.z-player.z)>=PERSON_CLEARANCE);
        if(p.reverse!==directions[j]){turns++;directions[j]=p.reverse;}
      });
    }
    assert.equal(turns,1,'only one pedestrian turns');
    assert.ok(people.every(p=>p.walkTime>5),'both resume walking');
  }
});

test('stale same-direction sidesteps recover without teleporting or overlapping',()=>{
  for(const stage of ['out','wait','back'])for(const reverseOrder of [false,true]){
    const {city,people,chunk}=crowd([{phase:10},{phase:11.1}]);
    const yielding=people[0],partner=people[1];
    yielding.yielding={dx:0,dz:-1,offset:stage==='out'?.4:1.3,stage,partner,partnerTime:100,passDistance:2};
    // The player prevents completion of either an outward or return step.
    const player=stage==='out'?{x:21,z:9.7}:{x:21,z:11};
    if(reverseOrder)people.reverse();
    for(let i=1;i<=500;i++){
      const before=people.map(p=>pedestrian(chunk,p,0));
      city.advancePedestrians(.04,player,i*.04);separated(chunk);
      people.forEach((p,j)=>{
        const pos=pedestrian(chunk,p,0);
        assert.ok(Math.hypot(pos.x-before[j].x,pos.z-before[j].z)<=.073,'recovery moves continuously');
        assert.ok(Math.hypot(pos.x-player.x,pos.z-player.z)>=PERSON_CLEARANCE-1e-9);
        assert.ok(!city.solid(pos.x,pos.z));
      });
    }
    assert.equal(yielding.yielding,undefined,'returns from the sidestep');
    assert.ok(yielding.walkTime>5,'resumes route progress');
  }
});

test('wall texture lines follow perspective through left and right turns and near clipping',async()=>{
  const {wallColumns}=await import('../neon-city/perspective.js');
  const project=p=>({x:320+355*p.x/p.z,y:164-355*p.y/p.z});
  for(const angle of [-1,-.6,0,.6,1]){
    const camera=(x,y)=>({x:x*Math.cos(angle)-8*Math.sin(angle),y,z:x*Math.sin(angle)+8*Math.cos(angle)});
    const left=camera(-6,0),right=camera(6,0);
    let lo=0,hi=1;
    if(left.z<.15)lo=(.15-left.z)/(right.z-left.z);
    if(right.z<.15)hi=(.15-left.z)/(right.z-left.z);
    const vertex=(t,y,v)=>({x:left.x+(right.x-left.x)*t,y,z:left.z+(right.z-left.z)*t,u:160*t,v});
    const vs=[vertex(lo,-1.65,200),vertex(hi,-1.65,200),vertex(hi,10,0),vertex(lo,10,0)];
    const columns=[...wallColumns(vs.map(project),vs,640)];
    assert.ok(columns.length>0);
    for(const {x,top,bottom} of columns){
      // Independently intersect a camera ray with the original wall plane.
      const ray=(x+.5-320)/355;
      const t=(ray*left.z-left.x)/((right.x-left.x)-ray*(right.z-left.z));
      assert.ok(Math.abs(top.u-160*t)<1e-8,'texture columns use perspective-correct u');
      assert.ok(Math.abs(bottom.u-top.u)<1e-8);
      for(const fraction of [.1,.45,.8]){
        const expected=project(vertex(t,10-11.65*fraction,200*fraction));
        const actual=top.y+(bottom.y-top.y)*(200*fraction-top.v)/(bottom.v-top.v);
        assert.ok(Math.abs(actual-expected.y)<1e-8,'horizontal texture lines stay straight');
      }
    }
  }
});

test('all pedestrian types have distinct cached front/back sprites and walking frames',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      assert.ok([x,y,w,h].every(Number.isFinite));
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite}=await import('../neon-city/sprites.js');
    const canvases=new Set(),pictures=new Set();
    for(let type=0;type<PEDESTRIAN_TYPES;type++)for(const back of [false,true]){
      for(let frame=0;frame<4;frame++){
        const canvas=sprite(type,frame,back);
        assert.equal(sprite(type,frame,back),canvas);
        assert.ok(!canvases.has(canvas),'cache entries never collide');canvases.add(canvas);
      }
      const picture=JSON.stringify([...sprite(type,0,back).pixels].sort((a,b)=>a[0]-b[0]));
      assert.ok(!pictures.has(picture),'each character and facing has a unique appearance');pictures.add(picture);
      assert.notDeepEqual(sprite(type,0,back).pixels,sprite(type,2,back).pixels,'legs animate');
    }
    assert.equal(canvases.size,PEDESTRIAN_TYPES*8);
    for(let frame=0;frame<4;frame++){
      assert.equal(sprite(6,frame,false).pixels.get(12*24+6),'#f2d477','right-ear hoop faces viewer left');
      assert.equal(sprite(6,frame,true).pixels.get(12*24+18),'#f2d477','right-ear hoop faces viewer right from behind');
    }
  }finally{globalThis.document=previous;}
});

test('the Black teen girl has three outfits that change only shirt and shoe colours',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite,outfit,TEEN_OUTFITS}=await import('../neon-city/sprites.js');
    assert.equal(TEEN_OUTFITS.length,3);
    assert.deepEqual([0,.2,.34,.5,.67,.99].map(v=>outfit(4,v)),[0,0,1,1,2,2]);
    for(let type=0;type<PEDESTRIAN_TYPES;type++)if(type!==4)assert.equal(sprite(type,0,false,.9),sprite(type,0,false),'other characters ignore variant');
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const looks=TEEN_OUTFITS.map((_,i)=>sprite(4,frame,back,(i+.5)/TEEN_OUTFITS.length).pixels);
      assert.equal(sprite(4,frame,back,0),sprite(4,frame,back),'variant 0 is the original outfit');
      const allowed=new Set(TEEN_OUTFITS.flatMap(o=>Object.values(o)));
      for(const [i,pixels] of looks.entries()){
        assert.deepEqual([...pixels.keys()].sort(),[...looks[0].keys()].sort(),'same silhouette');
        assert.ok([...pixels.values()].includes(TEEN_OUTFITS[i].shirt));
        assert.ok([...pixels.values()].includes(TEEN_OUTFITS[i].shoes));
        for(const [pixel,color] of pixels)if(color!==looks[0].get(pixel))assert.ok(allowed.has(color),'only outfit colours differ');
      }
      assert.equal(new Set(looks.map(p=>JSON.stringify([...p]))).size,3,'outfits look distinct');
    }
  }finally{globalThis.document=previous;}
});

test('blocks have zero to three stable, separated manholes entirely on sidewalks',()=>{
  const city=new City(42),counts=new Set(),sides=new Set();
  for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){
    const block=city.generate(x,z);counts.add(block.manholes.length);
    assert.ok(block.manholes.length<=3);
    for(const [i,m] of block.manholes.entries()){
      const lx=m.x-x*64,lz=m.z-z*64,r=m.radius;
      assert.ok(lx-r>=8&&lx+r<=56&&lz-r>=8&&lz+r<=56,'cover stays within pavement');
      assert.ok(lx+r<14||lx-r>50||lz+r<14||lz-r>50,'cover clears buildings');
      sides.add(lz<14?0:lx>50?1:lz>50?2:3);
      for(const other of block.manholes.slice(i+1))assert.ok(Math.hypot(m.x-other.x,m.z-other.z)>r+other.radius);
    }
  }
  assert.deepEqual([...counts].sort(),[0,1,2,3]);assert.equal(sides.size,4);
  city.update(0,0);
  const covers=city.chunks.get('0,0').manholes,original=structuredClone(covers);
  city.update(64,0);city.update(0,0);
  assert.equal(city.chunks.get('0,0').manholes,covers);assert.deepEqual(covers,original);
});

test('manhole interaction tolerates standing near a cover, including negative coordinates',async()=>{
  const {onManhole}=await import('../neon-city/manholes.js');
  for(const origin of [-64,0,64]){
    const cover={x:origin+11,z:origin+20,radius:.65};
    const chunks=[{manholes:[]},{manholes:[cover]}];
    assert.equal(onManhole(cover,chunks.values()),true);
    assert.equal(onManhole({x:cover.x+.6,z:cover.z},chunks.values()),true);
    assert.equal(onManhole({x:cover.x+2.85,z:cover.z},chunks.values()),true);
    assert.equal(onManhole({x:cover.x+2.91,z:cover.z},chunks.values()),false);
    assert.equal(onManhole({x:cover.x+.5,z:cover.z+.5},chunks.values()),true);
    assert.equal(onManhole({x:cover.x+2.1,z:cover.z+2.1},chunks.values()),false);
  }
  assert.equal(onManhole({x:0,z:0},[]),false);
});

test('effort grunt loads once and creates fresh playback on every attempt',async()=>{
  const {loadCoverGrunt,playCoverGrunt}=await import('../neon-city/manholes.js');
  const {readFile}=await import('node:fs/promises');
  const wav=await readFile(new URL('../neon-city/assets/effort-grunt.wav',import.meta.url));
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.readUInt16LE(22),1,'mono');
  assert.ok(wav.length>10000&&wav.length<100000,'short recording');
  const previous=globalThis.fetch;let loads=0,decodes=0,starts=0,disconnects=0;
  const sources=[],buffer={};
  globalThis.fetch=async()=>{loads++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
  const context={state:'running',destination:{},decodeAudioData:async()=>{decodes++;return buffer;},
    createBufferSource(){const source={connect(){},start(){starts++;},disconnect(){disconnects++;}};sources.push(source);return source;}};
  try{
    await loadCoverGrunt(context);
    await playCoverGrunt(context);await playCoverGrunt(context);await playCoverGrunt(context);
    assert.equal(loads,1);assert.equal(decodes,1);assert.equal(starts,3);
    for(const source of sources){assert.equal(source.buffer,buffer);source.onended();}
    assert.equal(disconnects,3);
    context.state='suspended';await playCoverGrunt(context);assert.equal(starts,3);
  }finally{globalThis.fetch=previous;}
});

test('cover attempts work on repeated presses and held Space without relying on keyup',async()=>{
  const {CoverAttempt}=await import('../neon-city/manholes.js');
  const action=new CoverAttempt(),player={x:11,z:20},chunks=[{manholes:[{...player,radius:.65}]}];
  assert.equal(action.try(player,chunks,0),true);
  assert.equal(action.try(player,chunks,.2),true,'a new press always retries');
  assert.equal(action.try(player,chunks,.3,true),false,'held key does not flood audio');
  assert.equal(action.try(player,chunks,1.5,true),true,'holding Space retries');
  assert.equal(action.try(player,chunks,2.8,true),true,'continued holding retries again');
  assert.equal(action.try({x:20,z:20},chunks,4,true),false,'out of reach');
  assert.equal(action.try(player,chunks,4.1,true),true,'walking back in range works while held');
});

test('game input replays manhole feedback on separate presses and held Space without repeat events',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {runInNewContext}=await import('node:vm');
  const {CoverAttempt}=await import('../neon-city/manholes.js');
  const {facingPubMenu}=await import('../neon-city/pub-menu.js');
  const events={},elements=new Map();let sounds=0,moves=0;
  const element=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',open:false,showModal(){this.open=true;},close(){this.open=false;},focus(){},getContext:()=>({}),addEventListener(name,fn){events[id+name]=fn;}});
    return elements.get(id);
  };
  const pubInterior=await import('../neon-city/pub-interior.js');
  const {pubName}=await import('../neon-city/pub.js');
  const {PubLife,PubConversation}=await import('../neon-city/pub-life.js');
  const {pubLines}=await import('../neon-city/world.js');
  const sandbox={...pubInterior,PubLife,PubConversation,pubLines,pubName,CoverAttempt,facingPubMenu,playCoverGrunt(){sounds++;},loadCoverGrunt(){},
    City:class{constructor(){this.chunks=new Map();}update(){} pedestrians(){return [];}move(){moves++;return false;}advancePedestrians(){}},
    HornWarning:class{update(){return false;}},ArcadeAmbience:class{update(){}mute(){}},arcadeVolume:()=>0,traffic:()=>[],
    document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},
    window:{addEventListener(name,fn){events[name]=fn;}},matchMedia:()=>({matches:true}),
    requestAnimationFrame(){},performance:{now:()=>0}};
  const source=(await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  runInNewContext(source.replaceAll('import.meta.url',JSON.stringify('http://localhost/game.js'))+"\nrender=()=>{};globalThis.game={player,city,tick,camera,get seat(){return playerSeat;}};",sandbox);
  const {player,city,tick}=sandbox.game;
  city.chunks.set('0,0',{buildings:[],manholes:[{x:player.x+2,z:player.z,radius:.65}]});
  const key={key:' ',code:'Space',repeat:false,preventDefault(){}};
  events.keydown(key);tick(0);
  assert.equal(element('#overlay').hidden,true,'Space starts the game');
  events.keydown({...key,repeat:true});tick(0);
  assert.equal(sounds,0,'starting Space does not also lift a cover');
  events.keyup(key);
  events.keydown(key);events.keyup(key);tick(20);
  assert.equal(sounds,1);assert.equal(element('#message').textContent,"IT'S TOO HEAVY.");
  events.keydown(key);events.keyup(key);tick(40);assert.equal(sounds,2,'second tap works even between frames');
  events.keydown(key);tick(60);assert.equal(sounds,3);
  for(let ms=80;ms<=3060;ms+=20)tick(ms);
  assert.equal(sounds,5,'holding repeats with no more keyboard events');
  events.keyup(key);
  for(let ms=3080;ms<=6060;ms+=20)tick(ms);
  assert.equal(sounds,5,'release stops repeats');
  assert.equal(element('#message').textContent,'','notice expires normally');
  events.keydown(key);tick(6080);assert.equal(sounds,6,'can retry after message expires');
  assert.equal(element('#message').textContent,"IT'S TOO HEAVY.");
  events.keyup(key);
  events.keydown({key:'Escape',code:'Escape'});
  assert.equal(element('#overlay').hidden,false);
  events.keydown(key);tick(6100);
  assert.equal(element('#overlay').hidden,true,'Space resumes after pausing');
  assert.equal(sounds,6,'resume does not trigger the cover');
  events.keyup(key);events.keydown(key);tick(6120);
  assert.equal(sounds,7,'next Space press interacts normally');
  events.keyup(key);
  city.chunks.get('0,0').buildings=[{x:12,z:-5,w:18,d:18,j:0,sign:'NEON PUB'}];
  player.x=10;player.z=4;player.angle=Math.PI/2;
  events.keydown({key:'ArrowUp',code:'ArrowUp',preventDefault(){}});
  events.keydown(key);
  assert.equal(element('#pub-menu').open,true);
  assert.equal(element('#pub-menu .menu-eyebrow').textContent,`${pubName(city.chunks.get('0,0').buildings[0])} · DRINKS`);
  const previousMoves=moves,previousAngle=player.angle;
  events.keydown({...key,repeat:true});
  assert.equal(element('#pub-menu').open,true,'holding Space keeps the menu open');
  events.keydown({key:'ArrowRight',code:'ArrowRight',preventDefault(){}});
  events.keydown({key:'Escape',code:'Escape',preventDefault(){}});
  tick(6140);tick(6160);
  assert.equal(moves,previousMoves,'menu freezes world updates and movement');
  assert.equal(player.angle,previousAngle);
  assert.equal(sounds,7,'menu does not lift a nearby cover');
  events.keyup(key);events.keydown(key);
  assert.equal(element('#pub-menu').open,false);
  events.keydown({...key,repeat:true});tick(6180);
  assert.equal(sounds,7,'closing Space does not lift a cover');
  assert.equal(player.angle,previousAngle,'turn input while reading is discarded');
  assert.ok(moves>previousMoves,'normal world updates resume');
  events.keyup(key);
  city.chunks.get('0,0').buildings[0].pubPatrons=[[null,0]];
  player.x=21;player.z=-7;player.angle=0;
  events.keydown(key);tick(6200);
  assert.equal(player.x,9);assert.equal(player.z,1.8);
  assert.match(element('#location').textContent,/BAR ROOM/);
  events.keydown({...key,repeat:true});tick(6220);
  assert.equal(player.z,1.8,'held entry press does not exit');
  events.keyup(key);
  player.x=4;player.z=.9;player.angle=0;
  events.keydown(key);tick(6240);
  assert.equal(player.x,4);assert.ok(Math.abs(player.z-1.95)<1e-9);
  assert.equal(player.angle,0,'sitting faces the opposite seat');
  assert.equal(element('#message').textContent,'HI THERE!');
  const seatedZ=player.z;
  for(const movement of ['ArrowUp','ArrowDown','w','s','a','d']){
    events.keydown({key:movement,preventDefault(){}});tick(6260);
    assert.equal(player.x,4);assert.equal(player.z,seatedZ,'seated movement is locked');
    events.keyup({key:movement});
  }
  events.keydown({key:'ArrowRight',preventDefault(){}});
  for(let i=0;i<100;i++)tick(6300+i*40);
  assert.equal(player.angle,Math.PI/4);
  assert.equal(element('#message').textContent,'','greeting expires without a standing prompt');
  events.keyup({key:'ArrowRight'});events.keydown({key:'ArrowLeft',preventDefault(){}});
  for(let i=0;i<100;i++)tick(10300+i*40);
  assert.equal(player.angle,-Math.PI/4);
  events.keyup({key:'ArrowLeft'});
  events.keydown({key:'ArrowUp',preventDefault(){}});
  for(let i=0;i<100;i++)tick(14300+i*40);
  assert.equal(sandbox.game.seat.pitch,Math.PI/2,'up stops directly overhead');
  assert.equal(player.x,4);assert.equal(player.z,seatedZ);
  const overhead=sandbox.game.camera({x:player.x,y:3.5,z:player.z});
  assert.ok(Math.abs(overhead.y)<1e-9&&Math.abs(overhead.z-2)<1e-9,'overhead point is centered in the pitched view');
  events.keyup({key:'ArrowUp'});events.keydown({key:'ArrowDown',preventDefault(){}});
  for(let i=0;i<100;i++)tick(18300+i*40);
  assert.equal(sandbox.game.seat.pitch,0,'down stops at the original view');
  events.keyup({key:'ArrowDown'});
  events.keydown({key:'ArrowUp',preventDefault(){}});tick(22300);
  assert.ok(sandbox.game.seat.pitch>0);
  events.keyup({key:'ArrowUp'});
  events.keydown({...key,repeat:true});assert.equal(player.z,seatedZ);
  events.keyup(key);events.keydown(key);
  assert.equal(player.x,4);assert.equal(player.z,.9,'standing returns to a clear position');
  assert.equal(sandbox.game.seat,null);
  assert.equal(sandbox.game.camera({x:player.x,y:1.65,z:player.z+2}).y,0,'standing resets pitch');
  city.chunks.get('0,0').buildings[0].pubPatrons[0][1]=null;
  player.angle=0;events.keyup(key);events.keydown(key);tick(22320);
  assert.ok(sandbox.game.seat);
  assert.equal(element('#message').textContent,'','empty table has no greeting or standing prompt');
  events.keyup(key);events.keydown(key);
  // A partner with lines talks after the greeting and falls silent when the player stands.
  city.chunks.get('0,0').buildings[0].pubPatrons[0][1]=5;
  player.x=4;player.z=.9;player.angle=0;events.keyup(key);events.keydown(key);
  let ms=22400;tick(ms);
  assert.equal(element('#message').textContent,'HI THERE!');
  const heard=[];
  for(let i=0;i<600;i++){tick(ms+=20);const text=element('#message').textContent;if(text&&text!==heard.at(-1))heard.push(text);}
  assert.deepEqual(heard.slice(0,3),['HI THERE!','THIS BEER SUCKS.','THIS PUB SUCKS.']);
  events.keyup(key);events.keydown(key);assert.equal(sandbox.game.seat,null);
  for(let i=0;i<600;i++){tick(ms+=20);if(i>=150)assert.equal(element('#message').textContent,'','no more lines after standing');}
  player.x=9;player.z=1.8;
  const streetMoves=moves;
  events.keyup(key);player.angle=Math.PI;
  tick(ms+=20);assert.equal(element('#message').textContent,'');
  assert.equal(moves,streetMoves,'interior does not run outdoor movement');
  events.keydown(key);tick(ms+=20);
  assert.equal(player.x,21);assert.equal(player.z,-7);
  assert.equal(player.angle,Math.PI,'exit faces away from the pub');
  assert.equal(sounds,7,'door use never lifts a manhole');

});

test('Ursa Major has a fixed seven-star pattern that follows camera rotation',async()=>{
  const {URSA_MAJOR,projectSky}=await import('../neon-city/sky.js');
  assert.equal(URSA_MAJOR.length,7);
  assert.equal(new Set(URSA_MAJOR.map(star=>star.name)).size,7);
  assert.ok(Object.isFrozen(URSA_MAJOR)&&URSA_MAJOR.every(Object.isFrozen));
  for(const star of URSA_MAJOR){
    const initial=projectSky(star,-.49,640,355,164);
    assert.ok(initial,'entire constellation is visible when facing it');
    const turned=projectSky(star,-.39,640,355,164);
    assert.ok(turned.x<initial.x);
    assert.equal(projectSky(star,-.49+Math.PI,640,355,164),null);
    const fullTurn=projectSky(star,-.49+2*Math.PI,640,355,164);
    assert.ok(Math.abs(fullTurn.x-initial.x)<1e-9);
    assert.ok(Math.abs(fullTurn.y-initial.y)<1e-9);
  }
});

test('pub menus require proximity and facing a menu wall, never the door',async()=>{
  const {facingPubMenu}=await import('../neon-city/pub-menu.js');
  for(const j of [0,1]){
    const b={x:14,z:14,w:18,d:18,j,sign:'NEON PUB'};
    const views=[
      {x:23,z:12,angle:0},
      {x:23,z:34,angle:Math.PI},
      {x:12,z:23,angle:Math.PI/2},
      {x:34,z:23,angle:-Math.PI/2},
    ];
    for(const [side,p] of views.entries()){
      assert.equal(facingPubMenu(p,[b]),side!==(j===1?1:0));
      assert.equal(facingPubMenu({...p,angle:p.angle+Math.PI},[b]),false);
      assert.equal(facingPubMenu({...p,angle:p.angle+.5},[b]),false);
      assert.equal(facingPubMenu(p,[{...b,sign:'ARCADE'}]),false);
    }
    assert.equal(facingPubMenu({x:9,z:23,angle:Math.PI/2},[b]),false);
    assert.equal(facingPubMenu({x:16,z:23,angle:-Math.PI/2},[b]),false);
    assert.equal(facingPubMenu({x:12,z:18,angle:Math.PI/2},[b]),false);
  }
});

test('pub entrances require facing the correct exterior door',async()=>{
  const {facingPubDoor,facingPubExit}=await import('../neon-city/pub-interior.js');
  for(const j of [0,1]){
    const b={sign:'NEON PUB',x:14,z:14,w:18,d:18,j};
    const p={x:23,z:j?34:12,angle:j?Math.PI:0};
    assert.equal(facingPubDoor(p,[b]),b);
    assert.equal(facingPubDoor({...p,angle:p.angle+Math.PI},[b]),undefined);
    assert.equal(facingPubDoor({...p,x:18},[b]),undefined);
    assert.equal(facingPubDoor({...p,z:j?30:16},[b]),undefined);
  }
  assert.equal(facingPubExit({x:9,z:1.8,angle:Math.PI}),true);
  assert.equal(facingPubExit({x:9,z:1.8,angle:0}),false);
});

test('pub furniture and walls block running while the passage connects both rooms',async()=>{
  const {PUB,moveInPub}=await import('../neon-city/pub-interior.js');
  const player={...PUB.spawn};
  moveInPub(player,0,6.2);moveInPub(player,12,0);assert.ok(player.x>20,'right passage connects rooms');
  moveInPub(player,-12,0);assert.ok(Math.abs(player.x-9)<1e-8,'passage works both ways');
  for(const b of [PUB.bar,PUB.shelves,...PUB.walls]){
    const p={x:b.x+b.w/2,z:b.z-1};moveInPub(p,0,5);
    assert.ok(p.z<=b.z-.3+1e-8,'cannot tunnel through an obstacle');
  }
  for(const b of PUB.tables){
    const p={x:b.x,z:b.z-b.radius-1};moveInPub(p,0,5);
    assert.ok(p.z<=b.z-b.radius-.3+1e-8,'round tables block running');
    const corner={x:b.x+b.radius*.85,z:b.z-b.radius-.4};
    moveInPub(corner,0,.6);
    assert.ok(corner.z>b.z-b.radius+.19,'rounded corner has no invisible square barrier');
    const edge={x:b.x+b.radius+.31,z:b.z-1};moveInPub(edge,0,2);
    assert.ok(edge.z>b.z+.9,'can walk around the curved edge');
  }
  moveInPub(player,-100,0);assert.ok(player.x>=.3);
  moveInPub(player,0,-100);assert.ok(player.z>=.3);
});

test('interior depth rendering keeps overlapping details visible regardless of submission order',async()=>{
  const {DepthRenderer}=await import('../neon-city/depth-renderer.js');
  let frame;
  const renderer=new DepthRenderer({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:f=>{frame=f;}},20,20);
  const polygon=(color,depths)=>({color,ps:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],vs:depths.map(z=>({z}))});
  const wall=polygon('#876b53',[10,2,2,10]);
  const detail=polygon('#e9c47e',[4.1,4.1,4.1,4.1]);
  renderer.render([wall,detail]);const first=Array.from(frame.data);
  renderer.render([detail,wall]);assert.deepEqual(Array.from(frame.data),first);
  const pixel=(x,y)=>Array.from(frame.data.slice((y*20+x)*4,(y*20+x)*4+3));
  assert.deepEqual(pixel(2,10),[233,196,126],'near detail covers the far end of a slanted face');
  assert.deepEqual(pixel(17,10),[135,107,83],'near end of slanted face covers the detail');
  renderer.render([detail]);assert.deepEqual(pixel(17,10),[233,196,126],'depth clears between frames');
});

test('door interaction remains available when approaching off-centre on either side',async()=>{
  const {facingPubDoor,facingPubExit}=await import('../neon-city/pub-interior.js');
  for(const j of [0,1]){
    const b={sign:'NEON PUB',x:14,z:14,w:18,d:18,j};
    for(const offset of [-.6,.6])for(const distance of [2,1,.5,.3,.01]){
      const p={x:23+offset,z:j?32+distance:14-distance,angle:j?Math.PI:0};
      assert.equal(facingPubDoor(p,[b]),b,`exterior remains usable at ${distance}`);
      assert.equal(facingPubExit({x:9+offset,z:distance,angle:Math.PI}),true,`interior remains usable at ${distance}`);
    }
  }
  assert.equal(facingPubExit({x:9,z:4,angle:Math.PI}),false,'too far away');
  assert.equal(facingPubExit({x:10.5,z:.3,angle:Math.PI}),false,'looking at adjacent wall');
  assert.equal(facingPubExit({x:9.5,z:.3,angle:0}),false,'looking away');
});

test('bar meets the left wall, retains right access and fits its front panels',async()=>{
  const {PUB,moveInPub,drawPubInterior}=await import('../neon-city/pub-interior.js');
  const left={x:.31,z:12};moveInPub(left,0,4);
  assert.ok(left.z<=PUB.bar.z-.3,'no passage along the left wall');
  const right={x:16,z:12};moveInPub(right,0,4);
  assert.ok(right.z>15.9,'right passage still reaches behind the bar');
  const panels=[];
  drawPubInterior({face(){},quad(){},box(x,y,z,w,h,d,color){if(y===.15&&z===PUB.bar.z-.015&&d===.035)panels.push({x,w});}});
  assert.ok(panels.length>0);
  const first=panels[0],last=panels.at(-1);
  assert.ok(Math.abs((first.x-PUB.bar.x)-(PUB.bar.x+PUB.bar.w-last.x-last.w))<1e-9,'matching end margins');
  for(const p of panels)assert.ok(p.x>=PUB.bar.x&&p.x+p.w<=PUB.bar.x+PUB.bar.w,'panels stay within the bar');
});

test('pub seats zero to two patrons per table with exactly one beer per occupied chair',async()=>{
  const {PUB,createPubPatrons,pubChairs,drawPubInterior,moveInPub}=await import('../neon-city/pub-interior.js');
  const chairs=pubChairs();assert.equal(chairs.length,PUB.tables.length*2);
  for(const chair of chairs){
    const p={x:chair.x+chair.w/2,z:chair.z-.5};moveInPub(p,0,.8);
    assert.ok(p.z<=chair.z-.3+1e-8,'chairs block movement even when empty');
  }
  for(const [random,count] of [[()=>0,0],[()=>.099,0],[()=>.1,1],[()=>.5,1],[()=>.55,2],[()=>.99,2]]){
    const patrons=createPubPatrons(random);
    for(const seats of patrons){assert.equal(seats.length,2);assert.equal(seats.filter(p=>p!=null).length,count);}
    const people=[],beerFoam=[];
    drawPubInterior({patrons,seatedPatron:p=>people.push(p),box(){},quad(){},face(vertices,color){
      if(color==='#eee0b0'&&vertices.every(v=>Math.abs(v.y-1.417)<1e-8))beerFoam.push(vertices);
    }});
    assert.equal(people.length,PUB.tables.length*count);
    assert.equal(beerFoam.length,people.length,'one glass per seated patron, no beer on empty tables');
    assert.ok(people.every(p=>Number.isInteger(p.type)&&p.type>=0&&p.type<PEDESTRIAN_TYPES));
  }
});

test('pub collisions report seated patrons and bartender but not empty furniture or standing still',async()=>{
  const {PUB,pubChairs,moveInPub}=await import('../neon-city/pub-interior.js');
  const chair=pubChairs()[0],patrons=PUB.tables.map(()=>[null,null]);patrons[0][0]=0;
  const start=()=>({x:chair.x-.5,z:chair.z+.4});
  assert.equal(moveInPub(start(),1,0,patrons),true,'occupied chair reports a person');
  assert.equal(moveInPub(start(),1,0),false,'empty chair is silent');
  assert.equal(moveInPub(start(),0,0,patrons),false,'no movement is not a bump');
  const b=PUB.bartender,p={x:b.x-1,z:b.z};
  assert.equal(moveInPub(p,2,0,patrons),true);
  assert.ok(p.x<=b.x-b.radius-.3+1e-8,'bartender stays solid');
  assert.equal(moveInPub({x:8,z:12},0,2,patrons),false,'bar blocks approach before bartender');
});

test('staff door is reachable beside shelves, stays solid and requires facing it nearby',async()=>{
  const {PUB,facingStaffDoor,moveInPub}=await import('../neon-city/pub-interior.js');
  const p={x:PUB.staffDoor.x,z:12,angle:0};
  assert.equal(facingStaffDoor(p),false);
  moveInPub(p,0,4);assert.ok(p.z>15.9,'right passage reaches staff door');
  assert.equal(facingStaffDoor(p),true);
  moveInPub(p,0,5);assert.ok(p.z<=17.7+1e-8,'door remains solid');
  assert.equal(facingStaffDoor(p),true,'works close to door');
  assert.equal(facingStaffDoor({...p,angle:Math.PI}),false);
  assert.equal(facingStaffDoor({...p,x:14}),false,'shelves are not the door');
});

test('small sign strokes retain coverage between pixels and respect foreground occlusion',async()=>{
  const {DepthRenderer}=await import('../neon-city/depth-renderer.js');
  let frame;const renderer=new DepthRenderer({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:f=>frame=f},8,8);
  const rect=(x,w,z,smooth,color)=>({color,smooth,ps:[{x,y:0},{x:x+w,y:0},{x:x+w,y:8},{x,y:8}],vs:Array.from({length:4},()=>({z}))});
  for(const x of [2,2.25,2.5,2.75]){
    const ink=rect(x,.25,2,true,'#ffffff');
    renderer.render([ink],'#000000');
    assert.ok(frame.data.some((v,i)=>i%4!==3&&v>0),'thin letter survives subpixel movement');
    renderer.render([ink,rect(0,8,1,false,'#000000')],'#000000');
    assert.ok(frame.data.every((v,i)=>i%4===3||v===0),'foreground still hides lettering');
  }
});

test('toilet door is reachable between lounge tables and requires looking at it',async()=>{
  const {PUB,facingToiletDoor,moveInPub}=await import('../neon-city/pub-interior.js');
  const p={x:PUB.toiletDoor.x,z:12,angle:0};
  assert.equal(facingToiletDoor(p),false);
  moveInPub(p,0,4);assert.ok(p.z>15.9);
  assert.equal(facingToiletDoor(p),true);
  moveInPub(p,0,5);assert.ok(p.z<=17.7+1e-8);
  assert.equal(facingToiletDoor(p),true);
  assert.equal(facingToiletDoor({...p,angle:Math.PI}),false);
  assert.equal(facingToiletDoor({...p,x:PUB.staffDoor.x}),false);
});

 test('pub names use the requested list and stay consistent per address',async()=>{
  const {PUB_NAMES,pubName}=await import('../neon-city/pub.js');
  assert.deepEqual(PUB_NAMES,["THE CLANSMAN","HARRY'S PUB","PUBLIC HOUSE","JOIN TABLES","THE LEPRECHAUN","OLD RIVER","APACHE PUB"]);
  const seen=new Set();
  for(let x=-20;x<=20;x++)for(let z=-20;z<=20;z++){
    const building={x:x*64+14,z:z*64+14};
    const name=pubName(building);
    assert.ok(PUB_NAMES.includes(name));
    assert.equal(pubName({...building,seed:999}),name);
    seen.add(name);
  }
  assert.equal(seen.size,PUB_NAMES.length);
});

test('only nearby empty chairs in the viewing direction can be used',async()=>{
  const {pubChairs,facingPubChair}=await import('../neon-city/pub-interior.js');
  for(const chair of pubChairs()){
    const player={x:chair.x+1.4,z:chair.z+.4,angle:-Math.PI/2};
    assert.deepEqual(facingPubChair(player),chair);
    assert.equal(facingPubChair({...player,angle:player.angle+Math.PI}),null);
    assert.notDeepEqual(facingPubChair({...player,x:player.x+3}),chair);
    const patrons=[];patrons[chair.tableIndex]=[];patrons[chair.tableIndex][chair.seat]=0;
    assert.notDeepEqual(facingPubChair(player,patrons),chair,'occupied chair cannot be selected');
  }
});

test('approaching the edge of a chair keeps it available for sitting',async()=>{
  const {pubChairs,facingPubChair}=await import('../neon-city/pub-interior.js');
  const chair=pubChairs()[0],x=chair.x+chair.w/2,z=chair.z+chair.d/2;
  // Walk towards one edge while looking straight ahead, rather than tracking
  // the centre as its angle grows at close range.
  for(const distance of [1.4,1,.8,.7]){
    assert.deepEqual(facingPubChair({x:x+.35,z:z-distance,angle:0}),chair);
  }
  assert.deepEqual(facingPubChair({x,z,angle:0}),chair,'no minimum-distance dead zone');
});

test('pub walkers can route from the entrance to every chair and back',async()=>{
  const {pubRoute}=await import('../neon-city/pub-life.js');
  const {PUB,pubChairs}=await import('../neon-city/pub-interior.js');
  const entry={x:PUB.door.x,z:.4};
  for(const chair of pubChairs()){
    const seat={x:chair.x+.4,z:chair.z+.4};
    assert.ok(pubRoute(entry,seat,chair),`arrival at ${chair.tableIndex}:${chair.seat}`);
    assert.ok(pubRoute(seat,entry,chair),`departure at ${chair.tableIndex}:${chair.seat}`);
  }
});

test('pub arrivals reserve seats, serialize walkers and leave full pubs',async()=>{
  const {PubLife}=await import('../neon-city/pub-life.js');
  const {PUB,pubChairs,facingPubChair}=await import('../neon-city/pub-interior.js');
  const patrons=PUB.tables.map(()=>[null,null]),life=new PubLife(()=>0);
  const playerSeat={tableIndex:0,seat:0};
  life.update(29,patrons,playerSeat);assert.equal(life.walker,null);
  life.update(1,patrons,playerSeat);
  const walker=life.walker;assert.ok(walker);assert.equal(walker.chair.seat,1);
  const chair=walker.chair;
  assert.notDeepEqual(facingPubChair({x:chair.x+1.4,z:chair.z+.4,angle:-Math.PI/2},patrons,chair),chair);
  life.update(.1,patrons,playerSeat);assert.equal(life.walker,walker,'no simultaneous departure');
  for(let i=0;i<1000&&life.walker;i++)life.update(.1,patrons,playerSeat);
  assert.equal(life.walker,null);assert.equal(patrons[0][1],0);assert.equal(patrons[0][0],null);
  life.arrival=60;life.departure=0;life.update(.1,patrons,playerSeat);
  assert.equal(life.walker,null,'player table is protected');
  life.departure=0;life.update(.1,patrons,null);
  assert.ok(life.walker);assert.equal(patrons[0][1],null);
  for(let i=0;i<1000&&life.walker;i++)life.update(.1,patrons,null);
  assert.equal(life.walker,null);
  const full=PUB.tables.map(()=>[0,1]);life.arrival=0;life.departure=60;
  life.update(.1,full,null);assert.ok(life.walker);assert.equal(life.walker.chair,undefined);
  for(let i=0;i<100&&life.walker;i++)life.update(.1,full,null);
  assert.equal(life.walker,null);assert.ok(full.every(seats=>seats[0]===0&&seats[1]===1));
  assert.equal(new PubLife(()=>1).arrival,60);
});

test('pub patrons keep their outfit variant when seated, arriving and leaving',async()=>{
  const {PubLife}=await import('../neon-city/pub-life.js');
  const {PUB,pubChairs,createPubPatrons,drawPubInterior}=await import('../neon-city/pub-interior.js');
  const {SHOE_COLORS,TEEN_OUTFITS}=await import('../neon-city/sprites.js');
  assert.ok(createPubPatrons(()=>.7).every(seats=>seats.variants.every(v=>v===.7)));
  const seated=variants=>{
    const patrons=PUB.tables.map(()=>[null,null]);patrons[0]=Object.assign([4,null],variants&&{variants});
    const people=[],colors=new Set();
    drawPubInterior({patrons,seatedPatron:p=>people.push(p),box:(...args)=>colors.add(args[6]),quad(){},face(){}});
    return {people,colors};
  };
  const teal=seated([.5,0]);
  assert.equal(teal.people[0].variant,.5);
  assert.ok(teal.colors.has(TEEN_OUTFITS[1].shoes),'seated shoes match the outfit');
  assert.ok(!teal.colors.has(SHOE_COLORS[4]));
  const plain=seated();
  assert.equal(plain.people[0].variant,0,'seats without variants keep the original outfit');
  assert.ok(plain.colors.has(SHOE_COLORS[4]));

  const chair=pubChairs()[0],centre={x:chair.x+chair.w/2,z:chair.z+chair.d/2};
  const patrons=PUB.tables.map(()=>[null,null]),life=new PubLife(()=>0);
  life.walker={...centre,type:4,variant:.9,chair,route:[centre],walkTime:0,facingX:0,facingZ:1};
  life.update(.1,patrons,null);
  assert.equal(life.walker,null);
  assert.equal(patrons[chair.tableIndex][chair.seat],4);
  assert.equal(patrons[chair.tableIndex].variants[chair.seat],.9,'arrival stores the variant');
  life.arrival=60;life.departure=0;life.update(.1,patrons,null);
  assert.equal(life.walker.type,4);
  assert.equal(life.walker.variant,.9,'departure carries the variant');
});

test('smartly dressed man wears a tie and woman wears heels, standing and seated',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite,SHOE_COLORS}=await import('../neon-city/sprites.js');
    assert.equal(SHOE_COLORS.length,PEDESTRIAN_TYPES);
    for(let frame=0;frame<4;frame++){
      const man=sprite(7,frame,false).pixels,woman=sprite(8,frame,false).pixels;
      assert.equal(man.get(20*24+12),'#c03a48','tie down the shirt front');
      assert.ok(![...sprite(7,frame,true).pixels.values()].includes('#c03a48'),'no tie from behind');
      const stride=[-2,0,2,0][frame];
      for(const [legX,offset] of [[9,stride],[15,-stride]]){
        const heelY=45+offset;
        if(heelY<48)assert.equal(woman.get(heelY*24+legX),SHOE_COLORS[8],'slim heel');
        assert.equal(woman.get(heelY*24+legX+2),undefined,'gap in front of the heel');
      }
    }
  }finally{globalThis.document=previous;}
  const {PUB,pubChairs,drawPubInterior}=await import('../neon-city/pub-interior.js');
  const chair=pubChairs().find(c=>c.tableIndex===0&&c.seat===0);
  const seatedBoxes=type=>{
    const patrons=PUB.tables.map(()=>[null,null]);patrons[0][0]=type;
    const boxes=[];
    drawPubInterior({patrons,box:(x,y,z,w,h,d,color)=>boxes.push({x,y,z,w,h,d,color}),quad(){},face(){}});
    // Leg geometry sits in front of the seat cushion, between its two side posts.
    return boxes.filter(b=>b.x>=chair.x+.1&&b.x+b.w<=chair.x+chair.w-.1&&b.y<.75&&!['#805b3b','#51382b'].includes(b.color));
  };
  const front=chair.side<0?(b=>b.z+b.d):(b=>-b.z);
  const man=seatedBoxes(7);
  assert.equal(man.filter(b=>b.color==='#3a3d4c').length,4,'suit trousers on both thighs and shins');
  assert.equal(man.filter(b=>b.color==='#121018').length,2,'one flat polished shoe per foot');
  const woman=seatedBoxes(8);
  const skirt=woman.filter(b=>b.color==='#2a2638'),knees=woman.filter(b=>b.color==='#d39c80'&&b.y>.5);
  assert.equal(skirt.length,1);assert.equal(knees.length,2);
  assert.ok(skirt[0].x<=chair.x+.15&&skirt[0].x+skirt[0].w>=chair.x+.65,'skirt wraps both thighs');
  for(const knee of knees)assert.ok(front(knee)>front(skirt[0]),'knees show past the hem');
  assert.equal(woman.filter(b=>b.color==='#d39c80'&&b.y<.5).length,2,'tights on both shins');
  const heels=woman.filter(b=>b.color==='#151320');
  assert.equal(heels.length,4,'raised sole and slim heel on each foot');
  assert.ok(heels.some(b=>b.y>=.1)&&heels.some(b=>b.w<.05));
});

test('Muslim woman wears a hijab and long abaya, and never appears in pubs',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite}=await import('../neon-city/sprites.js');
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(9,frame,back).pixels;
      for(const [x,y] of [[12,2],[7,8],[18,8],[8,14],[17,14]])assert.equal(pixels.get(y*24+x),'#2f6170','hijab covers hair, ears and neck');
      for(const x of [3,21])assert.equal(pixels.get(25*24+x),'#5a3d5c','long sleeves');
      assert.ok([5,10,15,20].every(x=>['#5a3d5c','#47304a','#8a6a8c'].includes(pixels.get(43*24+x))),'abaya reaches the ankles');
    }
  }finally{globalThis.document=previous;}
  const {goesToPub,PUB_TYPES}=await import('../neon-city/world.js');
  assert.equal(goesToPub(9),false);
  for(let type=0;type<PEDESTRIAN_TYPES;type++)if(type!==9)assert.equal(goesToPub(type),true,'characters default to going to the pub');
  assert.deepEqual(PUB_TYPES,Array.from({length:PEDESTRIAN_TYPES},(_,type)=>type).filter(type=>type!==9));
  const {PubLife}=await import('../neon-city/pub-life.js');
  const {PUB,createPubPatrons}=await import('../neon-city/pub-interior.js');
  const seen=new Set();
  for(let i=0;i<1000;i++){
    const value=i/1000;
    for(const seats of createPubPatrons(()=>value))for(const type of seats)if(type!=null)seen.add(type);
    // Walkers plan routes, so a coarser sweep keeps this fast while still reaching every type.
    if(i%10)continue;
    const life=new PubLife(()=>value);life.arrival=0;life.departure=60;
    life.update(.1,PUB.tables.map(()=>[null,null]),null);
    if(life.walker)seen.add(life.walker.type);
  }
  assert.deepEqual([...seen].sort((a,b)=>a-b),PUB_TYPES,'every pub-going character appears, and only they do');
});

test('Sikh man wears a turban, beard and kara, and sits in jeans and sneakers',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite}=await import('../neon-city/sprites.js');
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(10,frame,back).pixels;
      assert.ok([[12,0],[7,2],[18,2],[12,5]].every(([x,y])=>['#e08a2c','#b86a1e'].includes(pixels.get(y*24+x))),'turban wraps the whole crown');
      assert.equal(pixels.get(30*24+(back?21:4)),'#c9ccd4','kara on his right wrist');
      assert.notEqual(pixels.get(30*24+(back?4:21)),'#c9ccd4');
    }
    const rear=sprite(10,0,true).pixels;
    for(const [x,y] of [[12,10],[9,12],[16,12]])assert.equal(rear.get(y*24+x),'#1d1719','hair shows below the turban at the back');
    const front=sprite(10,0,false).pixels;
    assert.equal(front.get(14*24+12),'#1d1719','full beard');
    assert.equal(front.get(12*24+12),'#7a4a3c','mouth shows through the beard');
  }finally{globalThis.document=previous;}
  const {goesToPub,characterHeight}=await import('../neon-city/world.js');
  assert.equal(goesToPub(10),true);
  assert.ok(characterHeight(10)<characterHeight(0)&&characterHeight(10)>characterHeight(4),'slightly shorter than average');
  assert.equal(characterHeight(0),1.85);assert.equal(characterHeight(4),1.68);
  const {PUB,pubChairs,drawPubInterior}=await import('../neon-city/pub-interior.js');
  const chair=pubChairs().find(c=>c.tableIndex===0&&c.seat===0),patrons=PUB.tables.map(()=>[null,null]);patrons[0][0]=10;
  const boxes=[];
  drawPubInterior({patrons,box:(x,y,z,w,h,d,color)=>boxes.push({x,color}),quad(){},face(){}});
  const legs=boxes.filter(b=>b.x>=chair.x&&b.x<chair.x+chair.w);
  assert.equal(legs.filter(b=>b.color==='#2f3e5e').length,4,'jeans on both thighs and shins');
  assert.equal(legs.filter(b=>b.color==='#e6e2dc').length,2,'white sneakers');
});

test('old-style robot has an antenna, glowing eyes and pincers, with a wind-up key behind',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite}=await import('../neon-city/sprites.js');
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(11,frame,back).pixels,colors=new Set(pixels.values());
      assert.equal(pixels.get(12),'#ff5a4a','antenna tip');
      for(const x of [2,5,20,23])assert.equal(pixels.get(32*24+x),'#6b717a','pincer prongs');
      assert.equal(pixels.get(8*24+10)==='#ffcf4a',!back,'eyes glow only from the front');
      assert.equal(colors.has('#c9a13a'),back,'wind-up key only from behind');
      assert.ok(!['#e2a282','#94624e','#875235','#c68b68'].some(skin=>colors.has(skin)),'no skin, only metal');
    }
  }finally{globalThis.document=previous;}
  const {PUB,pubChairs,drawPubInterior}=await import('../neon-city/pub-interior.js');
  const chair=pubChairs().find(c=>c.tableIndex===0&&c.seat===0),patrons=PUB.tables.map(()=>[null,null]);patrons[0][0]=11;
  const boxes=[];
  drawPubInterior({patrons,box:(x,y,z,w,h,d,color)=>boxes.push({x,color}),quad(){},face(){}});
  const legs=boxes.filter(b=>b.x>=chair.x&&b.x<chair.x+chair.w);
  assert.equal(legs.filter(b=>b.color==='#9aa0a8').length,4,'metal thighs and shins');
  assert.equal(legs.filter(b=>b.color==='#585e68').length,2,'block feet');
});

test('table partners say their lines in order every 3 to 5 seconds, looping',async()=>{
  const {PubConversation}=await import('../neon-city/pub-life.js');
  const {pubLines}=await import('../neon-city/world.js');
  const lines=pubLines(5);
  assert.deepEqual(lines,['THIS BEER SUCKS.','THIS PUB SUCKS.','LIFE SUCKS.','THIS CONVERSATION SUCKS.']);
  for(let type=0;type<PEDESTRIAN_TYPES;type++)if(type!==5)assert.deepEqual(pubLines(type),[],'no lines by default');
  const values=[0,1,.5,.25,.75,0,1,.5,.1],random=()=>values.shift()??.5;
  const talk=new PubConversation(lines,random),said=[],gaps=[];
  let since=0;
  for(let i=0;i<4000;i++){
    since+=.01;
    const line=talk.update(.01);
    if(line){said.push(line);gaps.push(since);since=0;}
  }
  assert.deepEqual(said.slice(0,9),[...lines,...lines,lines[0]],'restarts after the last line');
  for(const gap of gaps)assert.ok(gap>=3-1e-9&&gap<=5+.011,`gap ${gap} within 3–5 s`);
  assert.ok(Math.abs(gaps[0]-3)<.011&&Math.abs(gaps[1]-5)<.011,'each gap is randomised separately');
  const quiet=new PubConversation([]);
  for(let i=0;i<100;i++)assert.equal(quiet.update(1),null,'characters without lines stay silent');
});

test('pub walkers wait for standing or seated players without admitting another walker',async()=>{
  const {PubLife}=await import('../neon-city/pub-life.js');
  const {PUB,moveInPub,pubPersonBlocks}=await import('../neon-city/pub-interior.js');
  for(const seat of [null,{tableIndex:0,seat:0}]){
    const patrons=PUB.tables.map(()=>[0,null]),life=new PubLife(()=>0);
    const walker={x:9,z:2,type:1,route:[{x:9,z:6}],walkTime:0};
    life.walker=walker;
    const player={x:9,z:4};
    life.update(10,patrons,seat,player);
    assert.equal(life.walker,walker);
    assert.ok(walker.z<=3.15&&walker.z>3,'stops at personal clearance');
    const stopped={x:walker.x,z:walker.z,walkTime:walker.walkTime},before=JSON.stringify(patrons);
    for(let i=0;i<120;i++)life.update(1,patrons,seat,player);
    assert.equal(life.walker,walker,'expired timers cannot start another walker');
    assert.equal(JSON.stringify(patrons),before,'nobody stands up or arrives while blocked');
    assert.deepEqual({x:walker.x,z:walker.z,walkTime:walker.walkTime},stopped,'walking animation freezes too');
    player.x=12;life.update(10,patrons,seat,player);
    assert.equal(life.walker,null,'walker completes after the player clears the path');
  }
  const player={x:9,z:4},walker={x:9,z:2};
  assert.equal(moveInPub(player,0,-4,[],walker),true);
  assert.ok(player.z>=2.85,'player cannot walk through the stopped patron either');
  assert.equal(pubPersonBlocks({x:9,z:2},{x:9,z:8},{x:9,z:4}),true,'large steps cannot tunnel through player');
  const life=new PubLife(()=>0);life.arrival=0;life.departure=60;
  life.update(.1,[],null,{x:PUB.door.x,z:.4});
  assert.equal(life.walker,null,'arrival waits if player occupies entrance');
});

test('newspaper machines vary by street, leave doors clear and block running',()=>{
  const city=new City(381),counts=new Set(),sides=new Set();
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
    const chunk=city.generate(x,z);city.chunks.set(`${x},${z}`,chunk);
    counts.add(chunk.newspaperMachines.length);
    for(const m of chunk.newspaperMachines){
      sides.add(m.side);
      assert.equal(city.solid(m.x,m.z),true);
      const along=m.side<2?m.x:m.z;
      const [a,b]=[[0,2],[1,3],[0,1],[2,3]][m.side].map(i=>chunk.buildings[i]);
      assert.notEqual(a.sign,b.sign,'machines only separate different venues');
      const end=m.side<2?a.x+a.w:a.z+a.d,start=m.side<2?b.x:b.z;
      assert.ok(Math.abs(along-(end+start)/2)<1e-8,'cabinet is centered on the shared seam');
      // Pub/arcade frames extend closest to the edge: six of 160 texture pixels.
      const halfCap=1.06*.85/2;
      assert.ok(along-halfCap>end-(m.side<2?a.w:a.d)*6/160,'cap clears the left venue window frame');
      assert.ok(along+halfCap<start+(m.side<2?b.w:b.d)*6/160,'cap clears the right venue window frame');
      for(const b of chunk.buildings){
        const center=m.side<2?b.x+b.w/2:b.z+b.d/2;
        assert.ok(Math.abs(along-center)>3,'cabinet and player clearance stay outside doorway approaches');
      }
      const dx=[0,0,-1,1][m.side],dz=[-1,1,0,0][m.side];
      assert.equal(m.side<2?m.d:m.w,.9*.85,'cabinet retains its reduced depth at the smaller scale');
      const back=m.side<2?m.z-dz*m.d/2:m.x-dx*m.w/2;
      const wall=(m.side<2?z:x)*64+(m.side===0||m.side===2?14:50);
      assert.ok(Math.abs(back-wall)<1e-8,'back touches the building on every side');
      const player={x:m.x+dx*3,z:m.z+dz*3};
      assert.equal(city.move(player,-dx*6,-dz*6),false,'cabinet is not a pedestrian interaction');
      assert.ok(Math.hypot(player.x-m.x,player.z-m.z)>=.9*.85/2+.45-1e-8,'running cannot tunnel through cabinet');
      assert.equal(city.solid(m.x+dx*1.1,m.z+dz*1.1),false,'street-facing approach remains walkable');
    }
  }
  assert.ok(counts.has(0)&&counts.size>1,'only some streets have machines');
  assert.equal(sides.size,4);
});

test('machine surfaces use overlap depth so slanted walls cannot erase tops or labels',async()=>{
  const {orderSurfaces}=await import('../neon-city/surface-order.js');
  const panel=(name,left,right,depths,detail=false)=>({name,detail,depth:depths.reduce((a,b)=>a+b)/4,ps:[{x:left,y:0},{x:right,y:0},{x:right,y:10},{x:left,y:10}],vs:depths.map(z=>({z}))});
  const wall=panel('wall',0,10,[20,2,2,20]);
  const top=panel('top',0,2,[7,7,7,7],true);
  const label=panel('label',0,2,[6.99,6.99,6.99,6.99],true);
  const pedestrian=panel('pedestrian',0,2,[3,3,3,3]);
  const foreground=panel('foreground',8,10,[3,3,3,3],true);
  for(const input of [[wall,top,label,pedestrian,foreground],[foreground,pedestrian,label,top,wall]]){
    const order=orderSurfaces(input).map(f=>f.name);
    assert.ok(order.indexOf('wall')<order.indexOf('top'),'far portion of wall stays behind top');
    assert.ok(order.indexOf('top')<order.indexOf('label'),'label remains above cabinet');
    assert.ok(order.indexOf('label')<order.indexOf('pedestrian'),'nearby pedestrian still occludes cabinet');
    assert.ok(order.indexOf('foreground')<order.indexOf('wall'),'near end of wall still occludes objects behind it');
  }
});


test('adjacent venues share walls without gaps and collision matches the outer walls',()=>{
  const city=new City(52);
  for(const [x,z] of [[0,0],[-2,3],[4,-4]]){
    const {buildings:b}=city.generate(x,z);
    for(const [left,right] of [[b[0],b[2]],[b[1],b[3]]])assert.equal(left.x+left.w,right.x);
    for(const [front,back] of [[b[0],b[1]],[b[2],b[3]]])assert.equal(front.z+front.d,back.z);
    assert.equal(city.solid(x*64+49.99,z*64+30,0),true);
    assert.equal(city.solid(x*64+30,z*64+49.99,0),true);
    assert.equal(city.solid(x*64+50.01,z*64+30,0),false);
    assert.equal(city.solid(x*64+30,z*64+50.01,0),false);
  }
});
