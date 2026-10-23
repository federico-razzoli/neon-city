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
  for(const chunk of city.chunks.values())for(const p of chunk.people){
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

test('blocks have zero to three stable, separated manholes entirely on sidewalks',()=>{
  const city=new City(42),counts=new Set(),sides=new Set();
  for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){
    const block=city.generate(x,z);counts.add(block.manholes.length);
    assert.ok(block.manholes.length<=3);
    for(const [i,m] of block.manholes.entries()){
      const lx=m.x-x*64,lz=m.z-z*64,r=m.radius;
      assert.ok(lx-r>=8&&lx+r<=56&&lz-r>=8&&lz+r<=56,'cover stays within pavement');
      assert.ok(lx+r<14||lx-r>49.8||lz+r<14||lz-r>49.8,'cover clears buildings');
      sides.add(lz<14?0:lx>49.8?1:lz>49.8?2:3);
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
  const {PubLife}=await import('../neon-city/pub-life.js');
  const sandbox={...pubInterior,PubLife,pubName,CoverAttempt,facingPubMenu,playCoverGrunt(){sounds++;},loadCoverGrunt(){},
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
  player.x=9;player.z=1.8;
  const streetMoves=moves;
  events.keyup(key);player.angle=Math.PI;
  tick(22340);assert.equal(element('#message').textContent,'');
  assert.equal(moves,streetMoves,'interior does not run outdoor movement');
  events.keydown(key);tick(22360);
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
    assert.ok(people.every(p=>Number.isInteger(p.type)&&p.type>=0&&p.type<7));
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
