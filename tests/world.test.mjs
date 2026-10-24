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
import {drawRiverTerrain,drawRiverStructures,drawRiverbankFaces} from '../neon-city/rivers.js';
import {orderGroundSurfaces} from '../neon-city/surface-order.js';

test('river ground visibility matches nearest surface from either bank and camera bearing',()=>{
  const city=new City(1);
  for(const row of RIVER_ROWS){
    const terrain=[];
    for(const part of [row,row+1])drawRiverTerrain(city.generate(0,part),{
      quad:(x,elevation,z,w,d,color)=>terrain.push({x,elevation,z,w,d,color}),face:()=>{}
    },0);
    for(const side of [0,1])for(const cameraX of [10,32,53])for(const offset of [9,13,16]){
      const camera={x:cameraX,y:1.65,z:row*BLOCK+(side?128-offset:offset)};
      for(const targetOffset of [10,12,15,17,25,60]){
        const target={x:32,y:targetOffset<18?(targetOffset<14?.06:.04):WATER_LEVEL,
          z:row*BLOCK+(side?128-targetOffset:targetOffset)};
        const dx=target.x-camera.x,dz=target.z-camera.z,length=Math.hypot(dx,dz)||1;
        const faces=terrain.map(f=>({...f,depth:((f.x+f.w/2-camera.x)*dx+(f.z+f.d/2-camera.z)*dz)/length}));
        // Intersect a viewing ray with the actual terrain, independently of
        // painter ordering, and compare the final painted surface to the nearest.
        const hits=faces.flatMap(f=>{
          const t=(f.elevation-camera.y)/(target.y-camera.y);
          const x=camera.x+t*dx,z=camera.z+t*dz;
          return t>0&&x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d?[{f,t}]:[];
        });
        assert.ok(hits.length);
        const visible=new Set(hits.map(hit=>hit.f));
        const painted=orderGroundSurfaces(faces).filter(f=>visible.has(f)).at(-1);
        assert.equal(painted.color,hits.sort((a,b)=>a.t-b.t)[0].f.color);
      }
    }
  }
});

test('only Night River remains through district 0, 4, with ordinary city blocks at the former river',()=>{
  const city=new City(42),centres=RIVER_ROWS.map(row=>(row+1)*BLOCK);
  assert.deepEqual(RIVER_ROWS,[4]);
  for(const row of [-6,-5])for(const x of [-3,0,1]){
    const chunk=city.generate(x,row);
    assert.ok(!chunk.river,'former river is ordinary city terrain');
    assert.ok(chunk.buildings.length>0||chunk.park,'city buildings or a park fill the removed river');
    assert.equal(groundHeight(x*BLOCK+11,row*BLOCK+32),0,'no remaining bridge slope');
    assert.equal(traffic(chunk,0).length,4,'ordinary streets retain traffic in both directions');
  }
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
    for(const x of [-203,-192,-181,-11,0,11,181,192,203]){
      const p={x,z:z+11};city.move(p,0,106);
      assert.ok(Math.abs(p.z-(z+117))<1e-6,'bridge remains traversable');
      city.move(p,0,-106);assert.ok(Math.abs(p.z-(z+11))<1e-6);
    }
  }
});

test('only every third side street has a bridge, including negative coordinates',()=>{
  const city=new City(1);
  for(const row of RIVER_ROWS)for(let street=-6;street<=6;street++){
    const expected=street%3===0,z=row*BLOCK+64;
    for(const offset of [-11,0,11]){
      assert.equal(city.solid(street*BLOCK+offset,z),!expected);
      assert.equal(groundHeight(street*BLOCK+offset,z),expected?BRIDGE_RISE:0);
    }
    for(const part of [row,row+1]){
      const chunk=city.generate(street,part),decks=[];
      drawRiverStructures(chunk,{face:(vertices,color)=>{
        if(color==='#292b3b'||color==='#757380')decks.push(vertices);
      },box:()=>{}});
      assert.equal(decks.some(v=>v[0].x===street*BLOCK),expected);
      assert.equal(decks.some(v=>v[0].x===street*BLOCK+56),(street+1)%3===0);
      assert.equal(traffic(chunk,0).some(car=>car.axis===0),expected);
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
    drawRiverTerrain(chunk,{quad:(...args)=>quads.push(args),face:()=>{}},0);
    drawRiverStructures(chunk,{face:(vertices,color)=>faces.push({vertices,color}),box:()=>{} });
    assert.ok(quads.some(q=>q[1]===WATER_LEVEL));
    assert.ok(quads.some(q=>q[5]==='#345841'),'grass on each bank');
    assert.ok(quads.some(q=>q[5]==='#757380'),'walking path on each bank');
    for(const {vertices,color} of faces)if(color==='#292b3b'||color==='#757380')for(const v of vertices)
      assert.ok(Math.abs(v.y-groundHeight(v.x,v.z)-.075)<1e-9,'road and path match collision elevation');
    assert.ok(faces.some(f=>f.vertices.some(v=>v.y>5)),'arched structure reaches above banks');
    const bank=part===row?row*BLOCK+18:row*BLOCK+110;
    const landViewer={z:bank+(part===row?-1:1)};
    const bankFaces=[];
    drawRiverbankFaces(chunk,{face:vertices=>bankFaces.push(vertices)},{z:bank+(part===row?1:-1)});
    assert.ok(bankFaces.length>0,'water-facing retaining walls are present');
    assert.ok(bankFaces.every(vertices=>vertices.every(v=>v.y<=0)), 'retaining walls stay below the ground pass');
    const landFaces=[];
    drawRiverbankFaces(chunk,{face:vertices=>landFaces.push(vertices)},landViewer);
    assert.ok(landFaces.every(vertices=>vertices.every(v=>v.y>WATER_LEVEL)), 'retaining wall backs cannot cover the grass from land');
  }
});

test('both halves of the next bridges stay loaded from either sidewalk',()=>{
  for(const row of RIVER_ROWS)for(const street of [-3,0,3])for(const offset of [-11,11]){
    const city=new City(1);
    city.update(street*BLOCK+offset,row*BLOCK+64);
    for(const next of [street-3,street+3])for(const x of [next-1,next])for(const z of [row,row+1]){
      assert.ok(city.chunks.has(`${x},${z}`),'adjacent bridge half is loaded');
    }
  }
});

test('nearby blocks are retained; forgotten blocks regenerate; memory is bounded',()=>{
  const c=new City(42);c.update(0,0);const original=c.chunks.get('0,0');assert.equal(c.chunks.size,25);
  c.update(64,64);assert.equal(c.chunks.get('0,0'),original);
  for(let i=0;i<200;i++){c.update(i*64,i*32);assert.ok(c.chunks.size<=85);}
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

test('river admiration requires a bridge railing, open water, and an outward view',async()=>{
  const {facingRiver,RiverLook}=await import('../neon-city/river-look.js');
  for(const row of RIVER_ROWS)for(const street of [-3,0,3])for(const side of [-1,1]){
    const player={x:street*BLOCK+side*12,z:row*BLOCK+64,angle:side*Math.PI/2};
    assert.equal(facingRiver(player),true);
    assert.equal(facingRiver({...player,angle:-player.angle}),false,'looking inwards');
    assert.equal(facingRiver({...player,angle:0}),false,'looking along the bridge');
    assert.equal(facingRiver({...player,x:street*BLOCK+side*8}),false,'too far from railing');
    assert.equal(facingRiver({...player,x:street*BLOCK+side*15}),false,'outside bridge');
    assert.equal(facingRiver({...player,x:player.x+BLOCK}),false,'street without bridge');
    for(const offset of [10,22,106,118])assert.equal(facingRiver({...player,z:row*BLOCK+offset}),false,'near bridge end');
    const look=new RiverLook();
    assert.equal(look.try(player,true),true);
    assert.equal(look.try(player,true),false,'holding Space does not repeat the message');
    assert.equal(look.try(player,false),false);
    assert.equal(look.try(player,true),true,'new press repeats');
    assert.equal(look.try(player,true,true),true,'quick taps between frames work');
  }
});

test('cars turn continuously onto either riverbank at streets without bridges',async()=>{
  const {Traffic}=await import('../neon-city/traffic.js');
  const city=new City(1);
  for(const row of RIVER_ROWS)for(const dir of [-1,1])for(const street of [-64,64]){
    const bank=(row+(dir<0?2:0))*BLOCK;
    const car={x:street+dir*3,z:bank-dir*20,axis:0,dir,color:'#e94054'};
    const simulation=new Traffic();simulation.cars=[car];
    let curved=false;
    for(let i=0;i<100;i++){
      const before={...car};simulation.advance(.04);
      curved||=!!car.turn;
      assert.ok(Math.hypot(car.x-before.x,car.z-before.z)<=.401,'turn never teleports');
      assert.ok(!city.solid(car.x,car.z,2.6),'car stays on road throughout the turn');
      assert.equal(simulation.cars[0],car,'same car survives the junction');
    }
    assert.ok(curved,'steers around a curve');
    assert.equal(car.axis,1);assert.equal(car.z,bank-dir*3);
    assert.ok((car.x-street)*dir>20,'continues along the bank');
    assert.equal(car.color,'#e94054');
  }
});

test('riverside turns wait for approaching traffic, queue, and resume after a safe gap',async()=>{
  const {Traffic}=await import('../neon-city/traffic.js');
  for(const dir of [-1,1]){
    const bank=(4+(dir<0?2:0))*BLOCK,street=64;
    const car={x:street+dir*3,z:bank-dir*9,axis:0,dir};
    const follower={...car,z:car.z-dir*12};
    const through={x:street-dir*10,z:bank-dir*3,axis:1,dir};
    const simulation=new Traffic();simulation.cars=[car,follower,through];
    simulation.advance(.04);
    assert.equal(car.waiting,true);assert.equal(car.z,bank-dir*9);
    assert.equal(car.turn,undefined,'does not enter the lane in front of a nearby car');
    for(let i=0;i<200;i++){
      simulation.advance(.04);
      assert.ok(Math.hypot(car.x-follower.x,car.z-follower.z)>7,'queued cars keep space');
      assert.ok(Math.hypot(car.x-through.x,car.z-through.z)>6,'merge clears through traffic');
    }
    assert.equal(car.axis,1);assert.equal(follower.axis,1);
    assert.ok((car.x-street)*dir>30,'waiting car eventually proceeds');
  }
});

test('persistent traffic crosses bridges and retains cars across loaded tile boundaries',async()=>{
  const {Traffic}=await import('../neon-city/traffic.js');
  const simulation=new Traffic(),car={x:3,z:4*BLOCK-10,axis:0,dir:1};
  simulation.cars=[car];simulation.advance(15);
  assert.equal(car.axis,0);assert.ok(car.z>6*BLOCK,'bridge traffic continues straight');
  const chunks=[{x:0,z:0},{x:1,z:0}];
  const crossing={x:63,z:3,axis:1,dir:-1,color:'red'};
  simulation.cars=[crossing];simulation.loaded=new Set(['0,0','1,0']);
  simulation.update(chunks,1,.04);
  assert.ok(simulation.cars.includes(crossing));
  crossing.dir=1;crossing.x=63.8;simulation.update(chunks,1.04,.04);
  assert.ok(crossing.x>64);assert.ok(simulation.cars.includes(crossing));
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
  // Sample beyond the loaded 5×5 area so even rare street characters have enough walkers.
  const sample=[];for(let x=-10;x<=10;x++)for(let z=-3;z<=3;z++)sample.push(city.generate(x,z));
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
  // A seated player's upward pitch follows the city camera too.
  const {skyHorizon}=await import('../neon-city/sky.js');
  assert.equal(skyHorizon(164,355,0),164);
  assert.ok(skyHorizon(164,355,.3)>164,'looking up lowers the horizon');
  const centred=projectSky(object,object.bearing,640,355,164,object.elevation);
  assert.ok(Math.abs(centred.x-320)<1e-9&&Math.abs(centred.y-164)<1e-9,'looking straight at a star centres it');
  assert.equal(projectSky({bearing:0,elevation:.3},0,640,355,164,1.2)?.y>projectSky({bearing:0,elevation:.6},0,640,355,164,1.2)?.y,true,'higher stars stay higher on screen');
  assert.equal(projectSky({bearing:0,elevation:1.2},0,640,355,164),null,'high stars are out of the level view');
  assert.ok(projectSky({bearing:0,elevation:1.2},0,640,355,164,1.2),'and visible when looking up');
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

test('characters have their own lines for the promenade and for park footpaths, and none elsewhere',async()=>{
  const {placeLines}=await import('../neon-city/world.js');
  const river=type=>placeLines(type,'river'),footpath=type=>placeLines(type,'footpath');
  assert.deepEqual(river(15),["I COME HERE WHEN I'M SAD.",'NIGHT RIVER ALWAYS HELPS MY MOOD.','THOSE ROBOTS SCARE ME.']);
  assert.deepEqual(river(14),['I LOVE REGULAR EXPRESSIONS.',"I'M NOT SURE YOU CAN UNDERSTAND."]);
  assert.equal(river(3).length,7);
  assert.equal(river(3)[0],"♪♫ I'M A RADIOACTIVE COW ♪");
  assert.equal(river(3).at(-1),'♫ ♫ ♫ ♫ ♫ ♫ ♫');
  assert.deepEqual(river(11),["I'M HERE TO STUDY HUMANS.",'I SUPPOSE I SHOULD STUDY YOU.','NO OFFENCE INTENDED, BUT I FIND YOU RATHER BORING.']);
  assert.deepEqual(river(5),['THIS RIVER SUCKS.']);
  assert.deepEqual(river(4),['THE GOVERNMENT SAYS THAT 2 + 2 = 5.',"I THINK IT'S 4.","YOU SEE WHY IT'S IMPORTANT TO STUDY MATH?"]);
  assert.equal(river(13).length,4);
  assert.equal(river(13).at(-1),"FUCKING RIVER! I'M STILL HERE BECAUSE OF IT.");
  assert.deepEqual(river(12),["THIS DOESN'T LOOK LIKE EGYPT.",'WHY AM I HERE?']);
  assert.deepEqual(river(8),['HAVE YOU MET NURSE JOY?','I THINK YOU TWO WOULD GET ALONG.',"CAREFUL, THOUGH. I THINK SHE'S UP TO SOMETHING."]);
  assert.deepEqual(river(7),["SORRY PAL, I'M IN HURRY."]);
  assert.deepEqual(footpath(11),['SO MANY LADYBUGS IN THIS PARK!']);
  assert.deepEqual(footpath(13),['HAVE YOU SEEN MY WIFE AROUND?',"OH, WELL. I DON'T NEED HER."]);
  assert.deepEqual(footpath(14),['DATABASE BENCHMARKING IS SUCH A FASCINATING SUBJECT!','ESPECIALLY WHEN IT COMES TO REPLICATION AND SHARDING.']);
  assert.equal(footpath(3).length,8);
  assert.equal(footpath(3)[0],'♪♫ COWS ARE COOL ♪');
  assert.equal(footpath(3).at(-1),'A SONG LIKE THIS MIGHT CHANGE THE WORLD.');
  assert.deepEqual(footpath(7),['SORRY PAL, TIME IS MONEY.']);
  assert.deepEqual(footpath(8),['I CAME HERE TO RELAX.',"IT DIDN'T WORK."]);
  assert.equal(footpath(12).length,7);
  assert.equal(footpath(12).at(-1),"I GUESS I'M A BIT HOME-SICK.");
  assert.deepEqual(footpath(4),['I LOVE THIS PARK.','I WISH IT WERE BIGGER.']);
  assert.equal(footpath(15).length,5);
  assert.equal(footpath(15).at(-1),'SEE YOU LATER.');
  assert.deepEqual(footpath(5),[]);
  for(let type=0;type<16;type++)assert.deepEqual(placeLines(type,null),[],'ordinary sidewalks have no lines');
  assert.deepEqual(river(0),[]);
  const city=new City(1),npc={x:11,z:20},bumped=[];
  assert.equal(city.move({x:11,z:19.1},0,.5,[npc],bumped),true);
  assert.deepEqual(bumped,[npc],'movement names the bumped person');
});

test('place lines come in order like a pub conversation, and restart after a long walk away',async()=>{
  const {WalkerTalk,TALK_MEMORY}=await import('../neon-city/walker-talk.js');
  const [first,second,third]=["I COME HERE WHEN I'M SAD.",'NIGHT RIVER ALWAYS HELPS MY MOOD.','THOSE ROBOTS SCARE ME.'];
  const woman={type:15},talker={walker:woman,place:'river'},other={walker:{type:0},place:'river'},talk=new WalkerTalk(()=>0);
  assert.equal(talk.update(.1,[other]),null,'characters without lines say nothing here');
  assert.equal(talk.update(.1,[{walker:woman,place:null}]),null,'nor does anyone on an ordinary sidewalk');
  assert.equal(talk.update(.1,[other,talker]),first,'the first line comes at once');
  assert.equal(talk.update(2.95,[talker]),null,'then lines follow the pub delay');
  assert.equal(talk.update(.1,[talker]),second);
  assert.equal(talk.update(1,[]),null,'nothing is said while apart');
  assert.equal(talk.update(3,[talker]),third,'a short break keeps the place');
  assert.equal(talk.update(3,[talker]),first,'lines repeat from the start');
  talk.update(TALK_MEMORY,[]);
  assert.equal(talk.update(.1,[talker]),first,'a long break starts again');
  assert.equal(talk.update(.1,[{walker:woman,place:'footpath'}]),'SO MANY RACISTS AND BIGOTS IN OUR GOVERNMENT!','another place has its own conversation');
});

test('on the promenade, a walker with river lines stays and talks while the player blocks them',async()=>{
  const {placeLines}=await import('../neon-city/world.js');
  for(const type of [15,0]){
    const city=new City(1),walker={phase:8,speed:1,type,reverse:false,variant:0,walkTime:0};
    const chunk={x:0,z:RIVER_ROWS[0],river:true,riverStart:RIVER_ROWS[0],people:[walker]};
    city.chunks.set(`0,${chunk.z}`,chunk);
    const player={x:20,z:chunk.z*BLOCK+11};
    let turns=0,heldFrames=0;
    for(let i=1;i<=500;i++){
      const reverse=walker.reverse,held=city.advancePedestrians(.02,player,i*.02);
      if(held.some(h=>h.walker===walker&&h.place==='river'))heldFrames++;
      if(walker.reverse!==reverse)turns++;
      const at=pedestrian(chunk,walker,0);
      assert.ok(Math.hypot(at.x-player.x,at.z-player.z)>=PERSON_CLEARANCE);
    }
    if(placeLines(type,'river').length){assert.equal(turns,0,'she waits to talk');assert.ok(heldFrames>400);}
    else assert.equal(turns,1,'others still turn around');
    // Leaving lets her walk on.
    if(type===15){
      player.z-=6;
      const before=pedestrian(chunk,walker,0);
      assert.deepEqual(city.advancePedestrians(.02,player,10.02),[]);
      assert.ok(pedestrian(chunk,walker,0).x>before.x);
    }
  }
  // Ordinary sidewalks are not the promenade.
  const city=new City(1),walker={phase:8,speed:1,type:15,reverse:false,variant:0,walkTime:0};
  city.chunks.set('0,0',{x:0,z:0,people:[walker]});
  let held=0;
  for(let i=1;i<=100;i++)held+=city.advancePedestrians(.02,{x:20,z:11},i*.02).length;
  assert.equal(held,0);
  assert.equal(city.pedestrians(0)[0].place,null);
});

test('bumping into a talker in their place shows their line instead of the bump notice',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {runInNewContext}=await import('node:vm');
  const {WalkerTalk,talksHere}=await import('../neon-city/walker-talk.js');
  const events={},elements=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,open:false,classList:{toggle(){}},focus(){},getContext:()=>({}),addEventListener(){}});
    return elements.get(id);
  };
  let bumpedPerson=null;
  const sandbox={WalkerTalk,talksHere,CoverAttempt:class{try(){return false;}},RiverLook:class{try(){return false;}},PubLife:class{},PubConversation:class{},
    pubLines:()=>[],pubName:()=>'',facingPubMenu:()=>false,facingBench:()=>null,facingPubDoor:()=>null,facingPubExit:()=>null,playCoverGrunt(){},loadCoverGrunt(){},
    City:class{constructor(){this.chunks=new Map();}update(){} pedestrians(){return [];}move(p,dx,dz,people,bumped){if(!bumpedPerson)return false;bumped.push(bumpedPerson);return true;}advancePedestrians(){return [];}},
    HornWarning:class{update(){return false;}},ArcadeAmbience:class{update(){}mute(){}},arcadeVolume:()=>0,ParkBirds:class{update(){}mute(){}},parkVolume:()=>0,Traffic:class{cars=[];update(){return this.cars;}},
    document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},
    window:{addEventListener(name,fn){events[name]=fn;}},matchMedia:()=>({matches:true}),
    requestAnimationFrame(){},performance:{now:()=>0}};
  const source=(await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  runInNewContext(source.replaceAll('import.meta.url',JSON.stringify('http://localhost/game.js'))+"\nrender=()=>{};globalThis.game={tick};",sandbox);
  const {tick}=sandbox.game,message=()=>element('#message').textContent;
  events.keydown({key:' ',code:'Space',repeat:false,preventDefault(){}});tick(0);
  events.keyup({key:' ',code:'Space'});
  let ms=0;
  const wait=()=>{for(const end=ms+3000;ms<end;){bumpedPerson=null;tick(ms+=20);}};
  bumpedPerson={type:15,place:null,walker:{type:15}};tick(ms+=20);
  assert.equal(message(),'HEY! WATCH OUT!','on an ordinary sidewalk she just complains');
  wait();
  bumpedPerson={type:15,place:'river',walker:{type:15}};tick(ms+=20);
  assert.equal(message(),"I COME HERE WHEN I'M SAD.");
  wait();
  bumpedPerson={type:13,place:'footpath',walker:{type:13}};tick(ms+=20);
  assert.equal(message(),'HAVE YOU SEEN MY WIFE AROUND?');
  wait();wait();
  bumpedPerson={type:5,place:'footpath',walker:{type:5}};tick(ms+=20);
  assert.equal(message(),'HEY! WATCH OUT!','the tattooed man has no footpath lines');
  bumpedPerson={type:0,place:'river',walker:{type:0}};
  for(const end=ms+5000;ms<end;)tick(ms+=20);
  assert.equal(message(),'HEY! WATCH OUT!','others still complain on the promenade');
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

test('street wall panels own every column once and share continuous depth and fog',async()=>{
  const {wallColumns,wallFog}=await import('../neon-city/perspective.js');
  const project=p=>({x:320+355*p.x/p.z,y:164-355*p.y/p.z});
  for(const reverse of [false,true]){
    const at=(u,v)=>({x:-30+60*u/160,y:38*(1-v/180)-1.65,z:reverse?85-55*u/160:30+55*u/160,u,v});
    const columns=(l,r)=>{const vs=[[l,180],[r,180],[r,0],[l,0]].map(([u,v])=>at(u,v));return [...wallColumns(vs.map(project),vs,640)];};
    const whole=columns(0,160),panels=Array.from({length:8},(_,i)=>columns(i*20,(i+1)*20)).flat();
    assert.deepEqual(panels.map(c=>c.x),whole.map(c=>c.x),'no missing or overlapping columns at fractional panel boundaries');
    for(let i=0;i<whole.length;i++){
      const a=whole[i],b=panels[i];
      for(const edge of ['top','bottom'])for(const key of ['y','u','v','depth'])assert.ok(Math.abs(a[edge][key]-b[edge][key])<1e-8);
      assert.ok(Math.abs(wallFog(a.top.depth)-wallFog(b.top.depth))<1e-10,'fog does not depend on panel subdivision');
      // Independently intersect this camera ray with z = z0 + slope * (x+30).
      const slope=(reverse?-55:55)/60,z0=reverse?85:30,rayX=(a.x+.5-320)/355;
      const depth=(z0+30*slope)/(1-slope*rayX);
      assert.ok(Math.abs(a.top.depth-depth)<1e-8);
    }
  }
  assert.equal(wallFog(10),0);assert.equal(wallFog(22),0);
  assert.equal(wallFog(89.5),.5);assert.equal(wallFog(1000),.94);
});

test('pitched wall fog and edge coverage are independent of panel subdivision',async()=>{
  const {rasterizePitchedWall}=await import('../neon-city/perspective.js');
  const texture={width:1,height:1,data:new Uint8ClampedArray([186,164,134,255])};
  for(const pitch of [0,.5,1.1]){
    const at=(u,v)=>{const x=-30+60*u,z=30+55*u,y=38*(1-v)-1.65;return {x,y:y*Math.cos(pitch)-z*Math.sin(pitch),z:z*Math.cos(pitch)+y*Math.sin(pitch),u,v};};
    const project=p=>({x:320+355*p.x/p.z,y:164-355*p.y/p.z});
    const render=count=>{
      const output=new Uint8ClampedArray(640*360*4),coverage=new Uint8Array(640*360);
      for(let part=0;part<count;part++){
        const l=part/count,r=(part+1)/count,vs=[[l,1],[r,1],[r,0],[l,0]].map(([u,v])=>at(u,v));
        const pixels=new Uint8ClampedArray(output.length);
        rasterizePitchedWall(vs.map(project),vs,texture,640,360,pixels,false,true);
        for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){coverage[i/4]++;output.set(pixels.subarray(i,i+4),i);}
      }
      assert.ok(coverage.every(n=>n<=1),'panels never apply fog twice to a pixel');
      return output;
    };
    const whole=render(1),panels=render(8);
    for(let i=0;i<whole.length;i++)assert.ok(Math.abs(whole[i]-panels[i])<=1,'fogged pixels match an unsplit wall');
  }
});

test('pitched wall textures stay perspective-correct when a seated player looks up',async()=>{
  const {rasterizePitchedWall}=await import('../neon-city/perspective.js');
  const project=p=>({x:320+355*p.x/p.z,y:164-355*p.y/p.z});
  let checked=0;
  for(const pitch of [.2,.6,1.1])for(const angle of [-.7,0,.5]){
    // The same camera as the game: turn, then pitch about the eye.
    const c=Math.cos(angle),sn=Math.sin(angle),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const camera=w=>{const dx=w.x,dz=w.z-12,y=w.y-1.5,z=dx*sn+dz*c;return {x:dx*c-dz*sn,y:y*cp-z*sp,z:z*cp+y*sp};};
    const wall=(u,v)=>({x:-4+8*u/160,y:20*(1-v/180),z:24});
    const vs=[[0,180],[160,180],[160,0],[0,0]].map(([u,v])=>({...camera(wall(u,v)),u,v}));
    if(vs.some(p=>p.z<=.15))continue;
    checked++;
    // Independently cast a camera ray through a screen point onto the wall.
    const o=camera({x:0,y:0,z:24}),eu=camera({x:1,y:0,z:24}),ev=camera({x:0,y:1,z:24});
    const ax={x:eu.x-o.x,y:eu.y-o.y,z:eu.z-o.z},ay={x:ev.x-o.x,y:ev.y-o.y,z:ev.z-o.z};
    const n={x:ax.y*ay.z-ax.z*ay.y,y:ax.z*ay.x-ax.x*ay.z,z:ax.x*ay.y-ax.y*ay.x};
    const texel=(sx,sy)=>{
      const ray={x:(sx-320)/355,y:(164-sy)/355,z:1},t=(n.x*o.x+n.y*o.y+n.z*o.z)/(n.x*ray.x+n.y*ray.y+n.z*ray.z);
      const p={x:ray.x*t-o.x,y:ray.y*t-o.y,z:ray.z*t-o.z},det=ax.x*ay.y-ax.y*ay.x;
      const wx=(p.x*ay.y-p.y*ay.x)/det,wy=(ax.x*p.y-ax.y*p.x)/det;
      return {u:(wx+4)*160/8,v:180*(1-wy/20)};
    };
    const texture={width:160,height:180,data:new Uint8ClampedArray(160*180*4)};
    for(let y=0;y<180;y++)for(let x=0;x<160;x++)texture.data.set([x,y,73,255],(y*160+x)*4);
    const pixels=new Uint8ClampedArray(640*360*4);
    const bounds=rasterizePitchedWall(vs.map(project),vs,texture,640,360,pixels);
    assert.ok(bounds&&bounds.left>=0&&bounds.top>=0&&bounds.left+bounds.width<=640&&bounds.top+bounds.height<=360);
    let samples=0;
    for(let y=0;y<360;y+=3)for(let x=0;x<640;x+=3){
      const offset=(y*640+x)*4;
      if(!pixels[offset+3])continue;
      const truth=texel(x+.5,y+.5);
      assert.ok(Math.abs(pixels[offset]-Math.max(0,Math.min(159,truth.u-.5)))<=.501,'u matches independent ray intersection');
      assert.ok(Math.abs(pixels[offset+1]-Math.max(0,Math.min(179,truth.v-.5)))<=.501,'v matches independent ray intersection');
      assert.equal(pixels[offset+2],73);samples++;
    }
    assert.ok(samples>0);

  }
  assert.ok(checked>=6,`${checked} camera setups checked`);

});

test('pitched textures clip to the viewport, clear scratch pixels, and preserve filtered alpha',async()=>{
  const {rasterizePitchedWall}=await import('../neon-city/perspective.js');
  const points=[{x:-100000,y:-100000},{x:100000,y:-100000},{x:500,y:300},{x:100,y:300}];
  const vertices=[{z:.15,u:0,v:0},{z:.15,u:2,v:0},{z:100,u:2,v:2},{z:100,u:0,v:2}];
  const texture={width:2,height:2,data:new Uint8ClampedArray([255,0,0,255,0,255,0,0,255,0,0,255,0,255,0,0])};
  const pixels=new Uint8ClampedArray(640*360*4).fill(255);
  const bounds=rasterizePitchedWall(points,vertices,texture,640,360,pixels);
  assert.deepEqual(bounds,{left:0,top:0,width:640,height:300});
  assert.equal(pixels[(299*640)*4+3],0,'scratch pixels outside the polygon are cleared');
  assert.equal(rasterizePitchedWall(points.map(p=>({x:p.x+200000,y:p.y})),vertices,texture,640,360,pixels),null);
  const square=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  const uv=[{z:1,u:0,v:0},{z:1,u:2,v:0},{z:1,u:2,v:2},{z:1,u:0,v:2}];
  const sample=new Uint8ClampedArray(4);
  rasterizePitchedWall(square,uv,texture,1,1,sample,true);
  assert.deepEqual([...sample],[255,0,0,128],'bilinear filtering uses premultiplied alpha');
});

test('pitched texture panels meet without gaps and support upside-down walls',async()=>{
  const {rasterizePitchedWall}=await import('../neon-city/perspective.js');
  const texture={width:8,height:8,data:new Uint8ClampedArray(8*8*4)};
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)texture.data.set([x*20,y*20,10,255],(y*8+x)*4);
  const coverage=new Uint8Array(64);
  for(const [left,right] of [[0,3.5],[3.5,8]]){
    const points=[{x:left,y:0},{x:right,y:0},{x:right,y:8},{x:left,y:8}];
    const vertices=points.map(p=>({z:2,u:p.x,v:8-p.y}));
    const pixels=new Uint8ClampedArray(64*4);
    rasterizePitchedWall(points,vertices,texture,8,8,pixels);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const i=y*8+x;if(!pixels[i*4+3])continue;
      coverage[i]++;
      assert.deepEqual([...pixels.slice(i*4,i*4+4)],[x*20,(7-y)*20,10,255]);
    }
  }
  assert.ok(coverage.every(n=>n===1),'each pixel belongs to exactly one panel, including shared edge pixel centres');
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
    for(let type=0;type<PEDESTRIAN_TYPES;type++)if(![4,14].includes(type))assert.equal(sprite(type,0,false,.9),sprite(type,0,false),'other characters ignore variant');
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
  const {RiverLook}=await import('../neon-city/river-look.js');
  const {facingBench}=await import('../neon-city/parks.js');
  const {WalkerTalk,talksHere}=await import('../neon-city/walker-talk.js');
  const sandbox={...pubInterior,PubLife,PubConversation,pubLines,pubName,CoverAttempt,RiverLook,WalkerTalk,talksHere,facingPubMenu,facingBench,playCoverGrunt(){sounds++;},loadCoverGrunt(){},
    City:class{constructor(){this.chunks=new Map();}update(){} pedestrians(){return [];}move(){moves++;return false;}advancePedestrians(){}},
    HornWarning:class{update(){return false;}},ArcadeAmbience:class{update(){}mute(){}},arcadeVolume:()=>0,ParkBirds:class{update(){}mute(){}},parkVolume:()=>0,Traffic:class{cars=[];update(){return this.cars;}},
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
  // Park benches use the same seated mode as pub chairs.
  events.keyup(key);
  city.chunks.set('0,0',{buildings:[],manholes:[],park:{benches:[{x:40,z:30,tx:1,tz:0,nx:0,nz:1}]}});
  player.x=39.4;player.z=28.6;player.angle=Math.PI;
  events.keydown(key);tick(ms+=20);
  assert.equal(sandbox.game.seat,null,'facing away from a bench does not sit');
  events.keyup(key);player.angle=0;
  events.keydown(key);tick(ms+=20);
  assert.ok(sandbox.game.seat,'facing a nearby bench sits down');
  assert.equal(player.x,39.5);assert.equal(player.z,30,'sits on the nearer end of the seat');
  const facing=player.angle;
  assert.ok(Math.abs(Math.cos(facing)+1)<1e-9,'seated, facing away from the backrest');
  assert.ok(Math.abs(sandbox.game.camera({x:39.5,y:1.5,z:29}).y)<1e-9,'seated eye height');
  events.keydown({key:'ArrowUp',preventDefault(){}});tick(ms+=100);
  assert.ok(Math.abs(sandbox.game.seat.pitch-.1*1.65)<1e-9,'100ms frame does not slow camera to the simulation cap');
  events.keyup({key:'ArrowUp'});events.keydown({key:'ArrowDown',preventDefault(){}});tick(ms+=100);
  events.keyup({key:'ArrowDown'});
  assert.equal(sandbox.game.seat.pitch,0);
  const benchMoves=moves;
  for(const movement of ['ArrowUp','ArrowDown','w','s','a','d']){
    events.keydown({key:movement,preventDefault(){}});tick(ms+=20);
    assert.equal(player.x,39.5);assert.equal(player.z,30,'seated movement is locked');
    events.keyup({key:movement});
  }
  assert.equal(moves,benchMoves,'no street movement while seated');
  events.keydown({key:'ArrowRight',preventDefault(){}});
  for(let i=0;i<100;i++)tick(ms+=40);
  assert.ok(Math.abs(player.angle-(facing+Math.PI/4))<1e-9,'bench turning is limited like a pub chair');
  events.keyup({key:'ArrowRight'});events.keydown({key:'ArrowLeft',preventDefault(){}});
  for(let i=0;i<100;i++)tick(ms+=40);
  assert.ok(Math.abs(player.angle-(facing-Math.PI/4))<1e-9);
  events.keyup({key:'ArrowLeft'});events.keydown({key:'ArrowUp',preventDefault(){}});
  for(let i=0;i<100;i++)tick(ms+=40);
  assert.equal(sandbox.game.seat.pitch,Math.PI/2,'look up at the pines and stars');
  events.keyup({key:'ArrowUp'});
  events.keydown({...key,repeat:true});assert.ok(sandbox.game.seat,'held Space does not stand up');
  events.keyup(key);events.keydown(key);
  assert.equal(sandbox.game.seat,null);
  assert.equal(player.x,39.4);assert.equal(player.z,28.6,'standing returns to a clear position');
  assert.equal(sandbox.game.camera({x:player.x,y:1.65,z:player.z-2}).y,0,'standing resets pitch and eye height');
  events.keyup(key);events.keydown({key:'ArrowUp',preventDefault(){}});tick(ms+=20);
  assert.ok(moves>benchMoves,'walking resumes after standing');
  let movement;
  city.move=(p,x,z)=>{movement=Math.hypot(x,z);return false;};
  const angleBefore=player.angle;
  events.keydown({key:'ArrowRight',preventDefault(){}});tick(ms+=100);
  assert.ok(Math.abs(player.angle-angleBefore-.1*1.65)<1e-9,'standing rotation also follows elapsed time');
  assert.ok(Math.abs(movement-.04*5.8)<1e-9,'movement keeps its collision-safe time cap');
  const beforeStall=player.angle;tick(ms+=2000);
  assert.ok(Math.abs(player.angle-beforeStall-.25*1.65)<1e-9,'long stalls cannot cause unbounded camera jumps');
  events.keyup({key:'ArrowRight'});events.keyup({key:'ArrowUp'});

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

test('pub beer colours are chosen per glass and persist across redraws and seat occupancy',async()=>{
  const {PUB,createPubPatrons,drawPubInterior}=await import('../neon-city/pub-interior.js');
  for(const value of [0,.2,1/3,.7]){
    const patrons=createPubPatrons(()=>value);
    assert.ok(patrons.every(seats=>seats.beerDark.every(dark=>dark===(value<1/3))));
  }
  let call=0;
  const draws=[.6,0,.2,.4,.5,.5,.5,.5,.1,.8];
  const patrons=createPubPatrons(()=>draws[call++%draws.length]);
  assert.ok(patrons.every(seats=>seats.beerDark[0]&&!seats.beerDark[1]),'two glasses on one table can differ');
  const render=()=>{
    const glasses=[];
    drawPubInterior({patrons,box(){},quad(){},face(vertices,color){
      if(['#492c22','#bd873d'].includes(color)&&vertices.every(v=>Math.abs(v.y-1.102)<1e-8))glasses.push({color,x:vertices[0].x,z:vertices[0].z});
    }});
    return glasses;
  };
  const initial=render();
  assert.equal(initial.filter(g=>g.color==='#492c22').length,PUB.tables.length);
  assert.equal(initial.filter(g=>g.color==='#bd873d').length,PUB.tables.length);
  assert.deepEqual(render(),initial,'camera-independent scene rebuild keeps each glass colour');
  const occupant=patrons[0][0];patrons[0][0]=null;
  assert.equal(render().length,initial.length-1,'empty chair has no beer');
  patrons[0][0]=occupant;
  assert.deepEqual(render(),initial,'returning to a seat keeps its glass colour');
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
  const seats=[];moveInPub(start(),1,0,patrons,null,seats);
  assert.deepEqual(seats,[chair],'reports the occupied chair once, despite several substeps');
  const empty=[];moveInPub(start(),1,0,[],null,empty);
  assert.deepEqual(empty,[],'empty chairs are not reported');
});

test('three bumps into a seated patron make them leave half the time, counted per seat',async()=>{
  const {PubLife}=await import('../neon-city/pub-life.js');
  const {PUB,pubChairs}=await import('../neon-city/pub-interior.js');
  const [a,b]=pubChairs();
  const setup=values=>{
    const patrons=PUB.tables.map(()=>[null,null]);patrons[a.tableIndex][a.seat]=5;patrons[b.tableIndex][b.seat]=7;
    const draws=[...values],life=new PubLife(()=>draws.length?draws.shift():.9);
    // One bump is a frame of contact followed by a frame without it.
    const hit=(...chairs)=>{life.bump(chairs,patrons);life.bump([],patrons);};
    return {patrons,life,hit,draws};
  };
  {
    const {patrons,life,hit}=setup([0,0,.4]);
    hit(a);
    for(let i=0;i<50;i++)life.bump([a],patrons);
    life.bump([],patrons);
    assert.equal(life.walker,null,'staying in contact is one bump');
    hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],null,'third bump with a low roll empties the seat');
    assert.equal(life.walker.type,5,'the bumped patron walks out');
    assert.deepEqual(life.walker.route.at(-1),{x:PUB.door.x,z:.4},'heading for the door');
    assert.equal(patrons[b.tableIndex][b.seat],7,'other seats are untouched');
  }
  {
    const {patrons,life,hit}=setup([0,0,.6,.4]);
    hit(a);hit(a);hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],5,'a high roll keeps them seated');
    assert.equal(life.walker,null);
    hit(a);hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],5,'the count started over');
    hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],null,'three more bumps roll again');
  }
  {
    const {patrons,life,hit}=setup([0,0,.4]);
    hit(a);hit(a);hit(b);hit(b);
    assert.equal(life.walker,null,'two bumps on each of two seats do not add up');
    hit(b);
    assert.equal(patrons[b.tableIndex][b.seat],null,'third bump on the second seat counts on its own');
    assert.equal(patrons[a.tableIndex][a.seat],5);
  }
  {
    const {patrons,life,hit,draws}=setup([0,0,.4]);
    const other={x:9,z:2,type:1,route:[{x:9,z:6}],walkTime:0};life.walker=other;
    hit(a);hit(a);hit(a);
    assert.equal(life.walker,other,'nobody leaves while someone else is walking about');
    assert.equal(patrons[a.tableIndex][a.seat],5);
    assert.deepEqual(draws,[.4],'no roll is made then');
    life.walker=null;hit(a);hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],5,'the count started over');
    hit(a);
    assert.equal(patrons[a.tableIndex][a.seat],null);
  }
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
  // Only the Muslim woman and the mummy stay out of pubs.
  const stayOut=[9,12];
  for(let type=0;type<PEDESTRIAN_TYPES;type++)if(!stayOut.includes(type))assert.equal(goesToPub(type),true,'characters default to going to the pub');
  assert.deepEqual(PUB_TYPES,Array.from({length:PEDESTRIAN_TYPES},(_,type)=>type).filter(type=>!stayOut.includes(type)));
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
  const robot=pubLines(11);
  assert.equal(robot.length,9);
  assert.equal(robot[0],'I WAS CREATED BY AN ADVANCED ALIEN CIVILISATION.');
  assert.equal(robot[3],"I'M STUDYING LADYBUGS, INSTEAD. THEY'RE MORE INTERESTING.");
  assert.deepEqual(robot.slice(-2),['I ADMIRE LADYBUGS.','I REALLY DO.']);
  const teen=pubLines(4);
  assert.equal(teen.length,6);
  assert.equal(teen[0],'MY DAD SENT ME TO THE PUB AGAIN.');
  assert.equal(teen[1],"I DON'T WANT TO GET DRUNK. I WANT TO STUDY MATH.");
  assert.equal(teen.at(-1),'SOMETIMES I REALLY FEEL ALONE.');
  const gay=pubLines(6);
  assert.equal(gay.length,5);
  assert.equal(gay[0],"DON'T TALK TO THE STUPID ROBOTS.");
  assert.equal(gay.at(-1),'THOSE ROBOTS SHOULD SEE A DOCTOR.');
  const punk=pubLines(3);
  assert.equal(punk.length,6);
  assert.equal(punk[0],'DO YOU KNOW THE RADIOACTIVE COWS?');
  assert.equal(punk[2],"THEIR DRUMMER COMPOSED ALL SEPULTURA'S SONGS.");
  assert.equal(punk.at(-1),'I PROMISE.');
  for(let type=0;type<PEDESTRIAN_TYPES;type++)if(![3,4,5,6,11,13,14,15].includes(type))assert.deepEqual(pubLines(type),[],'no lines by default');
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

test('Egyptian mummy is wrapped in bandages with glowing eyes, and never appears in pubs',async()=>{
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
    const strips=new Set();
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(12,frame,back).pixels,colors=new Set(pixels.values());
      assert.ok([...colors].every(c=>['#d8ccb0','#b5a688','#2a2228','#b8ff7a'].includes(c)),'only linen, wraps, gaps and eyes');
      assert.equal(pixels.get(8*24+10)==='#b8ff7a',!back,'eyes glow only from the front');
      for(const [x,y] of [[12,5],[12,20],[9,36],[4,30]])assert.ok(['#d8ccb0','#b5a688'].includes(pixels.get(y*24+x)),'wrapped head, body, legs and hands');
      strips.add([1,2].find(x=>pixels.get(28*24+x)==='#d8ccb0'));
    }
    assert.deepEqual([...strips].sort(),[1,2],'loose strip flutters between frames');
  }finally{globalThis.document=previous;}
  const {goesToPub,PUB_TYPES}=await import('../neon-city/world.js');
  assert.equal(goesToPub(12),false);
  assert.ok(!PUB_TYPES.includes(12));
});

test('short, fat bald man wears a Hawaiian shirt, stares wide-eyed, and talks about his family',async()=>{
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
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(13,frame,back).pixels,colors=new Set(pixels.values());
      for(const x of [8,12,16])assert.ok(['#e9b08f','#f8d6bf'].includes(pixels.get(2*24+x)),'bald crown');
      assert.equal(colors.has('#ffffff'),!back,'eyes show only from the front');
      assert.ok(colors.has('#ff5e6c')&&colors.has('#ffe066')&&colors.has('#4fc26e'),'hibiscus print front and back');
      assert.ok(['#1f9fb8','#ff5e6c','#ffe066','#4fc26e'].includes(pixels.get(24*24+3))&&['#1f9fb8','#ff5e6c','#ffe066','#4fc26e'].includes(pixels.get(24*24+20)),'belly spans the sprite');
      assert.equal(pixels.get(40*24+7),'#e9b08f','bare shins below the shorts');
      assert.ok(colors.has(SHOE_COLORS[13]),'sandals');
    }
    const front=sprite(13,0,false).pixels;
    for(const x of [8,9,10,14,15,16])for(const y of [7,8,9])assert.ok(['#ffffff','#1a1418'].includes(front.get(y*24+x)),'wide-open 3×3 eyes');
  }finally{globalThis.document=previous;}
  const {characterHeight,characterGirth,goesToPub,pubLines}=await import('../neon-city/world.js');
  assert.ok(characterHeight(13)<characterHeight(4),'shorter than the teen girl');
  assert.ok(characterHeight(13)*characterGirth(13)>characterHeight(0),'wider than an average-height character');
  for(let type=0;type<13;type++)assert.equal(characterGirth(type),1,'girth defaults to 1');
  assert.equal(goesToPub(13),true);
  assert.deepEqual(pubLines(13),['MY WIFE HAS ANOTHER MAN AND ANOTHER WOMAN.','MY DAUGHTER HAS ANOTHER DAD.',"BUT I DON'T MIND.",'FANCY ANOTHER PINT?']);
});

test('teen nerd has messy black or blonde hair, glasses and a pocket protector, and talks about Perl',async()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){
    const pixels=new Map();
    const context={fillStyle:'',fillRect(x,y,w,h){
      for(let py=Math.max(0,y);py<Math.min(48,y+h);py++)for(let px=Math.max(0,x);px<Math.min(24,x+w);px++)pixels.set(py*24+px,this.fillStyle);
    }};
    return {pixels,getContext:()=>context};
  }};
  try{
    const {sprite,outfit,NERD_HAIR,SHOE_COLORS}=await import('../neon-city/sprites.js');
    assert.deepEqual(NERD_HAIR,['#1b1820','#e6c25a'],'black, then blonde');
    assert.deepEqual([0,.3,.49,.5,.99].map(v=>outfit(14,v)),[0,0,0,1,1]);
    assert.equal(sprite(14,0,false,0),sprite(14,0,false),'variant 0 is black hair');
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const looks=NERD_HAIR.map((_,i)=>sprite(14,frame,back,(i+.5)/NERD_HAIR.length).pixels);
      for(const [i,pixels] of looks.entries()){
        const colors=new Set(pixels.values()),other=NERD_HAIR[1-i];
        assert.ok(colors.has(NERD_HAIR[i])&&!colors.has(other),'one hair colour per look');
        for(const [x,y] of [[7,1],[11,0],[15,1],[17,3]])assert.equal(pixels.get(y*24+x),NERD_HAIR[i],'messy tufts');
        assert.equal(colors.has('#cfeaf4'),!back,'lens glints only from the front');
        if(!back){
          // Big regular glasses: thin rims wider than the face, with eyes visible through clear lenses.
          for(const [x,y] of [[7,9],[11,9],[14,9],[18,9],[9,7],[16,11],[12,8],[13,8]])assert.equal(pixels.get(y*24+x),'#1d1a22','rim');
          for(const x of [9,16])assert.equal(pixels.get(9*24+x),'#241c2c','pupil behind the lens');
          for(const x of [8,10,15,17])assert.equal(pixels.get(9*24+x),'#f4f2ee','eye white behind the lens');
          for(const x of [8,9,15,16])assert.equal(pixels.get(10*24+x),'#e6ab8a','skin shows through the lens');
        }
        assert.equal(colors.has('#3f62c8'),!back,'pens in the front pocket');
        assert.ok(colors.has(SHOE_COLORS[14]),'sneakers');
        for(const [pixel,color] of pixels)if(color!==looks[0].get(pixel))assert.equal(color,NERD_HAIR[i],'only the hair colour differs');
        assert.deepEqual([...pixels.keys()].sort(),[...looks[0].keys()].sort(),'same silhouette');
      }
    }
  }finally{globalThis.document=previous;}
  const {characterHeight,goesToPub,pubLines}=await import('../neon-city/world.js');
  assert.ok(characterHeight(14)>characterHeight(4)&&characterHeight(14)<characterHeight(0),'teen height');
  assert.equal(goesToPub(14),true);
  assert.deepEqual(pubLines(14),[
    "I'M LEARNING THE PERL PROGRAMMING LANGUAGE.",
    "DO YOU KNOW THAT PERL'S AUTHOR IS A LINGUIST?",
    "A LANGUAGE IS MORE THAN GRAMMAR. IT'S A WAY OF THINKING.",
    "PITY ONE CAN'T PROGRAM ROBOTS WITH PERL.",
    'perl -e \'print "PERL IS GOOD\\n"\''
  ]);
});

test('tall Black woman has waist-length hair, a pink shirt, jeans and pink shoes, and opens up about being judged',async()=>{
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
    assert.equal(SHOE_COLORS[15],'#f06aa8','pink shoes');
    const hair=['#16121a','#3a2f3f'];
    for(const back of [false,true])for(let frame=0;frame<4;frame++){
      const pixels=sprite(15,frame,back).pixels,colors=new Set(pixels.values());
      assert.ok(colors.has('#ec6fa6')&&colors.has('#3d5f9e')&&colors.has(SHOE_COLORS[15]),'pink shirt, blue jeans, pink shoes');
      assert.equal(pixels.get(10*24+12),back?'#16121a':'#5a3322','face only from the front');
      if(!back){
        // Symmetric dark almond eyes, with no staring whites.
        for(const x of [10,11,14,15])assert.equal(pixels.get(9*24+x),'#24140e','dark eye');
        assert.ok(!colors.has('#f4ece8'),'no eye whites');
        for(const y of [6,7,8])for(const x of [9,10,11,14,15,16])assert.equal(pixels.get(y*24+x),'#6e412c','no brows or lash lines');
      }
      for(const y of [20,28])for(const x of back?[12,15]:[7,18])assert.ok(hair.includes(pixels.get(y*24+x)),'hair reaches the waist');
      if(back)assert.ok(hair.includes(pixels.get(34*24+12)),'hair falls past the waist from behind');
      else assert.equal(pixels.get(22*24+12),'#ec6fa6','shirt shows between the locks');
    }
  }finally{globalThis.document=previous;}
  const {characterHeight,goesToPub,pubLines}=await import('../neon-city/world.js');
  for(let type=0;type<15;type++)assert.ok(characterHeight(15)>characterHeight(type),'tallest character');
  assert.equal(goesToPub(15),true);
  assert.deepEqual(pubLines(15),[
    'PEOPLE KEEP JUDGING ME.',
    'MY SKIN, MY OPINION, MY... SEXUAL ORIENTATION.',
    "I KNOW THEY'RE JUST WANKERS, BUT...",
    'SOMETIMES IT HURTS.',
    "WHEN I'M SAD, I GO TO THE NIGHT RIVER.",
    "I THINK I'VE HEARD STRANGE NOISES FROM THE STAFF ROOM..."
  ]);
});

test('street characters appear in proportion to their weights, but pubs ignore weights',async()=>{
  const {streetWeight,streetType,PUB_TYPES}=await import('../neon-city/world.js');
  assert.equal(streetWeight(12),.25,'the mummy is rare');
  for(let type=0;type<12;type++)assert.equal(streetWeight(type),1,'weights default to 1');
  const total=Array.from({length:PEDESTRIAN_TYPES},(_,type)=>streetWeight(type)).reduce((a,b)=>a+b);
  const counts=new Array(PEDESTRIAN_TYPES).fill(0),steps=100000;
  for(let i=0;i<steps;i++)counts[streetType(i/steps)]++;
  for(let type=0;type<PEDESTRIAN_TYPES;type++)assert.ok(Math.abs(counts[type]/steps-streetWeight(type)/total)<1e-3,`type ${type} share matches its weight`);
  assert.equal(streetType(0),0);assert.equal(streetType(1-1e-12),PEDESTRIAN_TYPES-1);
  const city=new City(7),seen=new Array(PEDESTRIAN_TYPES).fill(0);
  for(let x=-20;x<=20;x++)for(let z=-3;z<=3;z++)for(const p of city.generate(x,z).people)seen[p.type]++;
  const average=seen.slice(0,12).reduce((a,b)=>a+b)/12;
  assert.ok(seen[12]>0&&seen[12]<average*.5,'generated streets have far fewer mummies than average');
  const {PUB,createPubPatrons}=await import('../neon-city/pub-interior.js');
  const pubCounts=new Map(PUB_TYPES.map(type=>[type,0]));
  const sweep=PUB_TYPES.length*100;
  for(let i=0;i<sweep;i++){
    // Per table: two patrons, first seat 0, both characters from the sweep, then beer sides, variants, and beer colours.
    const draws=[.6,0,(i+.5)/sweep,(i+.5)/sweep,.5,.5,.5,.5,.5,.5];let call=0;
    for(const seats of createPubPatrons(()=>draws[call++%draws.length]))for(const type of seats)pubCounts.set(type,pubCounts.get(type)+1);
  }
  assert.equal(new Set(pubCounts.values()).size,1,'pub patrons stay uniform');
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
  const city=new City(381),counts=new Set(),sides=new Set(),papers=new Set();
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
    const chunk=city.generate(x,z);city.chunks.set(`${x},${z}`,chunk);
    counts.add(chunk.newspaperMachines.length);
    for(const m of chunk.newspaperMachines){
      sides.add(m.side);papers.add(m.paper);
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
  assert.deepEqual([...papers].sort(),['DAILY BUGLE','NEON NEWS','THE RECORD'],'each machine sells one of the three papers');
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

test('bridge fascia separates buried ends and hides lower walls from the deck side',async()=>{
  const {drawBridgeFascias}=await import('../neon-city/rivers.js');
  const city=new City(1);
  for(const row of RIVER_ROWS)for(const part of [row,row+1]){
    const chunk=city.generate(0,part);
    const collect=(x,below)=>{
      const faces=[];
      drawBridgeFascias(chunk,{face:vertices=>faces.push(vertices)},{x},below);
      return faces;
    };
    const buried=collect(32,true),exposed=collect(32,false);
    assert.ok(buried.length&&exposed.length);
    assert.ok(buried.every(face=>face.every(v=>v.y<=0)),'buried ends belong before the ground pass');
    assert.ok(exposed.every(face=>face.every(v=>v.y>=0)),'later structures cannot paint buried ends over the bank');
    assert.ok(buried.some(face=>face.some(v=>v.y===0)),'crossing segments meet the ground exactly');
    for(const [x,edge] of [[11,14]]){
      assert.ok(collect(x,true).every(face=>face.every(v=>v.x!==edge)),'deck hides the lower wall on its own side');
      const ownSide=collect(x,false).filter(face=>face[0].x===edge);
      assert.ok(ownSide.length);
      assert.ok(ownSide.every(face=>face.every(v=>v.y>=bridgeHeight(v.z)+.075-1e-9)),
        'only the parapet remains above the deck');
    }
  }
});

test('bridge pavement stays behind pedestrian legs at oblique camera bearings',async()=>{
  const {orderSurfaces}=await import('../neon-city/surface-order.js');
  let corrected=0;
  for(const angle of [-1.2,-.8,-.4,.4,.8,1.2]){
    const s=Math.sin(angle),c=Math.cos(angle);
    const camera={x:11-s*10,z:1-c*10,y:1.725};
    const project=v=>{
      const dx=v.x-camera.x,dz=v.z-camera.z,z=dx*s+dz*c;
      return {z,p:{x:(dx*c-dz*s)/z,y:(camera.y-v.y)/z}};
    };
    const vertices=[{x:8,y:.075,z:0},{x:14,y:.075,z:0},{x:14,y:.075,z:2},{x:8,y:.075,z:2}].map(project);
    const deck={name:'deck',depth:vertices.reduce((sum,v)=>sum+v.z,0)/4,ps:vertices.map(v=>v.p),vs:vertices};
    // The pedestrian stands nearer one end of the panel, not at its centre.
    const feet=project({x:11,y:.075,z:1.6}),width=.09,height=.185;
    const person={name:'person',detail:true,depth:feet.z,vs:Array.from({length:4},()=>({z:feet.z})),ps:[
      {x:feet.p.x-width/2,y:feet.p.y},{x:feet.p.x+width/2,y:feet.p.y},
      {x:feet.p.x+width/2,y:feet.p.y-height},{x:feet.p.x-width/2,y:feet.p.y-height}
    ]};
    if(person.depth>deck.depth)corrected++;
    for(const faces of [[person,deck],[deck,person]])assert.deepEqual(orderSurfaces(faces).map(f=>f.name),['deck','person']);
    const rail={...person,name:'rail',detail:false,depth:feet.z-1,vs:person.vs.map(()=>({z:feet.z-1}))};
    assert.deepEqual(orderSurfaces([rail,person,deck]).map(f=>f.name),['deck','person','rail'],'foreground rail still hides pedestrians');
  }
  assert.ok(corrected>0,'covers angles where centre-distance sorting hides the legs');
});

test('one block in ten becomes a park with benches and trees in place of buildings',async()=>{
  const {PARK_CHANCE}=await import('../neon-city/world.js');
  const city=new City(7);let parks=0,total=0;
  for(let x=-40;x<40;x++)for(let z=-30;z<30;z++){
    if(RIVER_ROWS.some(row=>z===row||z===row+1))continue;
    const chunk=city.generate(x,z);total++;
    if(!chunk.park){assert.equal(chunk.buildings.length,4);continue;}
    parks++;
    assert.equal(chunk.buildings.length+chunk.newspaperMachines.length,0);
    assert.equal(chunk.park.benches.length,2);
    assert.ok(chunk.park.trees.length>=3&&chunk.park.trees.length<=5);
  }
  assert.equal(PARK_CHANCE,.1);
  assert.ok(Math.abs(parks/total-PARK_CHANCE)<.015,`park share ${parks/total}`);
  for(const row of RIVER_ROWS)assert.ok(!city.generate(0,row).park,'river blocks never become parks');
});

test('cached parks always have at least two ordinary blocks between them, diagonals included',()=>{
  for(const seed of [1,2,3,4,5]){
    const city=new City(seed);let seen=0;
    for(let i=0;i<400;i++){
      city.update(Math.sin(i*.07)*900+i*20,Math.cos(i*.05)*700-i*9);
      const parks=[...city.chunks.values()].filter(c=>c.park);
      seen+=parks.length;
      for(const a of parks)for(const b of parks)if(a!==b)
        assert.ok(Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))>=3,`parks ${a.x},${a.z} and ${b.x},${b.z}`);
    }
    assert.ok(seen>0,'parks appear while walking');
  }
});

function parkChunk(seed=11){
  const city=new City(seed);
  for(let x=0;;x++){
    const chunk=city.generate(x,0);
    if(chunk.park){city.chunks.set(`${x},0`,chunk);return {city,chunk};}
  }
}

test('the winding footpath is walkable, curves, and leaves trees and benches clear',async()=>{
  const {PARK_PATH_WIDTH,pathDistance}=await import('../neon-city/world.js');
  for(let seed=1;seed<30;seed++){
    const {city,chunk}=parkChunk(seed),{axis,path,trees,benches}=chunk.park,x=chunk.x*BLOCK,z=chunk.z*BLOCK;
    const along=p=>axis?p.z-z:p.x-x,across=p=>axis?p.x-x:p.z-z;
    assert.equal(along(path[0]),14);assert.equal(along(path.at(-1)),50);
    // The ends meet the sidewalks squarely, and the path bends in between.
    for(const [a,b] of [[path[0],path[1]],[path.at(-1),path.at(-2)]])
      assert.ok(Math.abs(across(b)-across(a))<.6*Math.abs(along(b)-along(a)),'path leaves the sidewalk squarely');
    const offsets=path.map(across);
    assert.ok(Math.max(...offsets)-Math.min(...offsets)>6,'the path is not straight');
    for(let i=1;i<path.length-1;i++){
      const a=path[i-1],b=path[i],c=path[i+1];
      const turn=Math.abs(Math.atan2(c.z-b.z,c.x-b.x)-Math.atan2(b.z-a.z,b.x-a.x));
      const radius=(Math.hypot(b.x-a.x,b.z-a.z)+Math.hypot(c.x-b.x,c.z-b.z))/2/Math.max(1e-9,Math.min(turn,2*Math.PI-turn));
      assert.ok(radius>PARK_PATH_WIDTH/2+.3,`curve radius ${radius.toFixed(2)} folds the path edge`);
    }
    assert.ok(path.every(p=>across(p)>=14+PARK_PATH_WIDTH/2&&across(p)<=50-PARK_PATH_WIDTH/2));
    // Walk the whole centre line from one sidewalk to the other.
    const walker={x:path[0].x,z:path[0].z};
    for(const point of path)city.move(walker,point.x-walker.x,point.z-walker.z);
    assert.ok(Math.hypot(walker.x-path.at(-1).x,walker.z-path.at(-1).z)<1e-6,'footpath crosses the park');
    for(const t of trees){
      assert.ok(city.solid(t.x,t.z));
      assert.ok(pathDistance(path,t.x,t.z)-t.radius-.45>=PARK_PATH_WIDTH/2,'trunks leave the path clear');
      assert.ok(t.x-x>=17&&t.x-x<=47&&t.z-z>=17&&t.z-z<=47);
      assert.ok(!city.solid(t.x+t.radius+.5,t.z)||pathDistance(path,t.x+t.radius+.5,t.z)>0,'only the trunk is solid');
    }
    for(const b of benches){
      assert.ok(city.solid(b.x,b.z));
      const gap=pathDistance(path,b.x,b.z);
      assert.ok(gap>PARK_PATH_WIDTH/2+.3&&gap<PARK_PATH_WIDTH/2+1,'benches stand beside the path');
      // The seat runs parallel to the nearest stretch of path.
      const ahead=pathDistance(path,b.x+b.tx,b.z+b.tz);
      assert.ok(Math.abs(ahead-gap)<.35);
    }
    // Unloaded blocks keep their solid footprint.
    assert.ok(city.solid(x+BLOCK*50+32,z+32));
  }
});

test('park footpath and decals always paint over the lawn from any viewpoint',async()=>{
  const {drawParkGround,PARK_LAYERS}=await import('../neon-city/parks.js');
  const inside=(poly,x,z)=>{
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)hit=!hit;
    }
    return hit;
  };
  for(let seed=1;seed<6;seed++){
    const {chunk}=parkChunk(seed),terrain=[],x=chunk.x*BLOCK,z=chunk.z*BLOCK;
    drawParkGround(chunk,{
      quad:(x,elevation,z,w,d,color)=>terrain.push({poly:[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}],elevation,color}),
      face:(vertices,color)=>terrain.push({poly:vertices,elevation:vertices[0].y,color})
    });
    assert.ok(terrain.filter(f=>f.elevation===PARK_LAYERS.path).length>20,'the path is a curved ribbon');
    assert.ok(Math.max(...terrain.filter(f=>f.elevation<PARK_LAYERS.path).map(f=>f.elevation))<PARK_LAYERS.path);
    for(const cameraX of [-20,11,32,70])for(const cameraZ of [-15,11,40,90])for(const target of chunk.park.path.slice(1,-1)){
      const camera={x:x+cameraX,y:1.65,z:z+cameraZ};
      const dx=target.x-camera.x,dz=target.z-camera.z,length=Math.hypot(dx,dz)||1;
      const faces=terrain.map(f=>{
        const c=f.poly.reduce((s,p)=>({x:s.x+p.x/f.poly.length,z:s.z+p.z/f.poly.length}),{x:0,z:0});
        return {...f,depth:((c.x-camera.x)*dx+(c.z-camera.z)*dz)/length};
      });
      const hits=faces.filter(f=>{
        const t=(f.elevation-camera.y)/(PARK_LAYERS.path-camera.y);
        return inside(f.poly,camera.x+t*dx,camera.z+t*dz);
      });
      assert.ok(hits.some(f=>f.color==='#345841'),'the ray also crosses the lawn');
      const painted=orderGroundSurfaces(faces).filter(f=>hits.includes(f)).at(-1);
      assert.ok(painted.elevation>=PARK_LAYERS.path,'footpath is never hidden by the lawn');
    }
  }
});

test('park trees are tall pines, closed and drawn only on viewer-facing sides',async()=>{
  const {drawParkStructures}=await import('../neon-city/parks.js');
  for(let seed=1;seed<8;seed++){
    const {chunk}=parkChunk(seed);
    for(const tree of chunk.park.trees){
      const all=[];
      for(const viewer of [{x:tree.x-14,y:1.65,z:tree.z},{x:tree.x+6,y:1.65,z:tree.z+6},{x:tree.x+.9,y:1.65,z:tree.z},{x:tree.x,y:30,z:tree.z-20}]){
        const faces=[];
        drawParkStructures({...chunk,park:{...chunk.park,benches:[],cones:[],trees:[tree],sign:null}},{face:v=>faces.push(v)},viewer);
        all.push(...faces);
        for(const v of faces){
          const c=v.reduce((s,p)=>({x:s.x+p.x/v.length,y:s.y+p.y/v.length,z:s.z+p.z/v.length}),{x:0,y:0,z:0});
          if(v.every(p=>Math.abs(p.y-v[0].y)<1e-9))continue;
          const a={x:v[1].x-v[0].x,y:v[1].y-v[0].y,z:v[1].z-v[0].z},b={x:v[2].x-v[0].x,y:v[2].y-v[0].y,z:v[2].z-v[0].z};
          let n={x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};
          if(n.x*(c.x-tree.x)+n.z*(c.z-tree.z)<0)n={x:-n.x,y:-n.y,z:-n.z};
          assert.ok(n.x*(viewer.x-c.x)+n.y*(viewer.y-c.y)+n.z*(viewer.z-c.z)>0,'only sides facing the viewer are drawn');
        }
        // Standing beside the trunk, the crown is overhead.
        if(viewer.y<2&&Math.hypot(viewer.x-tree.x,viewer.z-tree.z)<1)
          assert.ok(faces.some(v=>v.every(p=>p.y>viewer.y+.1)&&v.some(p=>Math.hypot(p.x-tree.x,p.z-tree.z)>1)),'crown seen from beneath');
      }
      const top=Math.max(...all.flatMap(v=>v.map(p=>p.y)));
      assert.ok(top>=16,`tree is ${top.toFixed(1)} units tall`);
      const lowestLeaves=Math.min(...all.filter(v=>v.some(p=>Math.hypot(p.x-tree.x,p.z-tree.z)>1)).flatMap(v=>v.map(p=>p.y)));
      assert.ok(lowestLeaves>2.5,'boughs clear head height');
    }
  }
  const faces=[];
  drawParkStructures({...parkChunk(3).chunk,park:{...parkChunk(3).chunk.park,trees:[],cones:[],sign:null}},{face:v=>faces.push(v)},{x:0,y:1.65,z:0});
  assert.ok(faces.length>=12,'benches have seats, backs and end supports');
});

// The first park generated in a row, scanning eastwards.
function parkInRow(row,seed){
  const city=new City(seed);
  for(let x=0;;x++){
    const chunk=city.generate(x,row);
    if(chunk.park){city.chunks.set(`${x},${row}`,chunk);return {city,chunk};}
  }
}

test('parks away from the river have a NIGHT RIVER sign pointing towards it; parks on its banks have none',async()=>{
  const {PARK_PATH_WIDTH,RIVER_SIGN,pathDistance,riverBearing}=await import('../neon-city/world.js');
  const river=RIVER_ROWS[0];
  assert.deepEqual(riverBearing(river-1),{dz:1,blocks:1});
  assert.deepEqual(riverBearing(river+2),{dz:-1,blocks:1});
  assert.deepEqual(riverBearing(river-5),{dz:1,blocks:5});
  assert.deepEqual(riverBearing(river+9),{dz:-1,blocks:8});
  for(const row of [river-1,river+2])for(let seed=1;seed<15;seed++)
    assert.equal(parkInRow(row,seed).chunk.park.sign,null,`park in row ${row} borders the river`);
  for(const row of [river-12,river-3,river-2,river+3,river+4,river+20])for(let seed=1;seed<15;seed++){
    const {city,chunk}=parkInRow(row,seed),{sign,path,trees,benches}=chunk.park,x=chunk.x*BLOCK,z=chunk.z*BLOCK;
    assert.ok(sign,`park in row ${row} has a sign`);
    // The arrow points from the park towards the river's water.
    const water=(river*BLOCK+18+river*BLOCK+110)/2;
    assert.equal(sign.dz,Math.sign(water-sign.z));
    const tip={x:sign.x,z:sign.z+sign.dz*RIVER_SIGN.reach};
    for(const p of [sign,tip])assert.ok(p.x-x>14.3&&p.x-x<49.7&&p.z-z>14.3&&p.z-z<49.7,'on the lawn');
    assert.ok(pathDistance(path,sign.x,sign.z)>=PARK_PATH_WIDTH/2+1&&pathDistance(path,tip.x,tip.z)>=PARK_PATH_WIDTH/2+.3,'clear of the path');
    assert.ok(benches.every(b=>Math.hypot(b.x-sign.x,b.z-sign.z)>=2.2));
    assert.ok(trees.every(t=>Math.hypot(t.x-sign.x,t.z-sign.z)>=t.crown+.5),'boughs leave the sign clear');
    assert.ok(city.solid(sign.x,sign.z),'the pole blocks walking');
    assert.ok(!city.solid(sign.x+RIVER_SIGN.pole+.5,sign.z)||trees.some(t=>Math.hypot(t.x-sign.x,t.z-sign.z)<2));
  }
});

test('the NIGHT RIVER arrow points to the river on screen from either side, with its words unmirrored',async()=>{
  const {RIVER_SIGN}=await import('../neon-city/world.js');
  const {drawParkStructures,RIVER_SIGN_TEXTURE}=await import('../neon-city/parks.js');
  const river=RIVER_ROWS[0];
  for(const row of [river-3,river+4]){
    const {chunk}=parkInRow(row,5),sign=chunk.park.sign,riverZ=river*BLOCK+64;
    const mid={x:sign.x,z:sign.z+sign.dz*RIVER_SIGN.reach/2};
    for(const side of [-1,1]){
      const viewer={x:mid.x+side*7,y:1.65,z:mid.z+2};
      const faces=[];
      drawParkStructures({...chunk,park:{...chunk.park,trees:[],benches:[],cones:[]}},{face:(v,color,texture)=>faces.push({v,texture}),riverSignTexture:tipRight=>({tipRight})},viewer);
      const boards=faces.filter(f=>f.texture);
      assert.equal(boards.length,1,'only the near face of the board is drawn');
      const {v,texture}=boards[0];
      // Screen right for a viewer looking at the sign.
      const f={x:mid.x-viewer.x,z:mid.z-viewer.z},right=p=>p.x*f.z-p.z*f.x;
      const tip=v.reduce((a,b)=>Math.abs(b.z-sign.z)>Math.abs(a.z-sign.z)?b:a);
      const riverRight=right({x:mid.x,z:riverZ})>right(mid);
      assert.equal(right(tip)>right(mid),riverRight,'the tip is on the river side of the screen');
      assert.equal(texture.tipRight,riverRight,'the painted outline matches the board');
      // Texture u grows to the viewer's right, so text reads forwards.
      const sorted=[...v].sort((p,q)=>right(p)-right(q));
      assert.ok(sorted[0].u<sorted.at(-1).u);
      assert.ok(v.every(p=>p.u>=0&&p.u<=RIVER_SIGN_TEXTURE.width&&p.v>=0&&p.v<=RIVER_SIGN_TEXTURE.height));
      assert.ok(Math.min(...v.map(p=>p.y))>2.8&&Math.max(...v.map(p=>p.y))<3.75,'the board hangs well above head height, below the pole top');
    }
  }
});

test('a few realistic pine cones lie on the lawn beneath the pines, off the path',async()=>{
  const {pathDistance,PARK_PATH_WIDTH}=await import('../neon-city/world.js');
  const {drawParkStructures,PARK_LAYERS}=await import('../neon-city/parks.js');
  for(let seed=1;seed<40;seed++){
    const {chunk}=parkChunk(seed),{cones,trees,path}=chunk.park,x=chunk.x*BLOCK,z=chunk.z*BLOCK;
    assert.ok(cones.length>=3&&cones.length<=2*trees.length);
    for(const c of cones){
      assert.ok(c.x-x>=15&&c.x-x<=49&&c.z-z>=15&&c.z-z<=49,'on the lawn');
      assert.ok(pathDistance(path,c.x,c.z)>=PARK_PATH_WIDTH/2+.3,'not on the path');
      assert.ok(trees.some(t=>Math.hypot(t.x-c.x,t.z-c.z)<=3.6*t.scale),'beneath the lowest boughs');
      assert.ok(c.length>=.16&&c.length<=.24&&c.radius<c.length/2,'pine-cone sized');
      const draw=viewer=>{
        const faces=[];
        drawParkStructures({...chunk,park:{...chunk.park,trees:[],benches:[],cones:[c],sign:null}},{face:v=>faces.push(v)},viewer);
        return faces;
      };
      assert.ok(draw({x:c.x+4,y:1.65,z:c.z+3}).length>=6);
      // From every side, the closed shape spans from the grass to its own height.
      const ys=[{x:c.x+4,y:1.65,z:c.z+3},{x:c.x-3,y:-5,z:c.z-2}].flatMap(draw).flat().map(p=>p.y);
      assert.ok(Math.abs(Math.min(...ys)-PARK_LAYERS.grass)<1e-9,'resting on the grass');
      assert.ok(Math.max(...ys)<=PARK_LAYERS.grass+2*c.radius+1e-9);
    }
  }
});

test('park birds are heard near parks and fade out across the street',async()=>{
  const {parkVolume,BIRD_SILENT_DISTANCE}=await import('../neon-city/park-birds.js');
  const park={x:0,z:0,park:{}},block={x:1,z:0};
  assert.equal(parkVolume({x:32,z:32},[park]),1,'on the lawn');
  assert.equal(parkVolume({x:11,z:32},[park]),1,'on the sidewalk beside it');
  const across=parkVolume({x:32,z:-6},[park]);
  assert.ok(across>0&&across<1,'across the street, quieter');
  assert.equal(parkVolume({x:32,z:14-BIRD_SILENT_DISTANCE},[park]),0);
  assert.equal(parkVolume({x:32,z:32},[block]),0,'ordinary blocks are silent');
  assert.equal(parkVolume({x:32,z:32},[park,{...park}]),1,'parks do not add up');
});

test('bird calls are varied, bounded, separated by quiet and stop on pause',async()=>{
  const {BirdSchedule,birdCallSamples,birdCallDuration,BIRD_CALLS,ParkBirds}=await import('../neon-city/park-birds.js');
  for(const value of [0,.31,.6,.85,.999]){
    const schedule=new BirdSchedule(()=>value);
    const first=.5+value*1.5;
    assert.equal(schedule.update(first-.01,true),null);
    const call=schedule.update(.02,true);
    assert.ok(BIRD_CALLS.includes(call.kind));
    const gap=birdCallDuration(call.kind)+.8+value*2.7;
    assert.ok(gap-birdCallDuration(call.kind)>=.8&&gap-birdCallDuration(call.kind)<=3.5);
    assert.equal(schedule.update(gap-.01,true),null,'calls never overlap');
    assert.ok(schedule.update(.02,true));
    schedule.update(1,false);assert.equal(schedule.update(.01,true),null,'leaving resets the timer');
  }
  const picks=new Set(Array.from({length:500},()=>new BirdSchedule().update(10,true).kind));
  assert.deepEqual([...picks].sort(),[...BIRD_CALLS].sort(),'every kind of bird is heard');
  const crossings=samples=>samples.reduce((n,v,i)=>n+(i&&(v>0)!==(samples[i-1]>0)?1:0),0)/samples.length;
  const sounds=Object.fromEntries(BIRD_CALLS.map(kind=>[kind,birdCallSamples(kind,22050,1,7)]));
  for(const [kind,samples] of Object.entries(sounds)){
    assert.equal(samples.length,Math.ceil(birdCallDuration(kind)*22050));
    assert.ok(samples.some(v=>Math.abs(v)>.04),`${kind} is audible`);
    assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<.25),`${kind} stays quiet`);
    assert.ok(Math.abs(samples[0])<1e-3&&Math.abs(samples.at(-1))<1e-3,'no clicks');
  }
  assert.ok(crossings(sounds.hoot)*5<crossings(sounds.whistle),'the owl is far lower than songbirds');
  assert.notDeepEqual(birdCallSamples('trill',8000,1,1),birdCallSamples('trill',8000,1,2),'calls vary');
  let starts=0,stops=0,lastVolume;
  const context={state:'running',sampleRate:8000,currentTime:0,destination:{},
    createGain:()=>({gain:{value:0,setTargetAtTime:v=>{lastVolume=v;}},connect(){}}),
    createBuffer:length=>({getChannelData:()=>new Float32Array(16000)}),
    createBufferSource:()=>({connect(){},disconnect(){},start(){starts++;},stop(){stops++;}})};
  const birds=new ParkBirds(()=>.5);
  birds.update(context,0,10);assert.equal(starts,0,'silent away from parks');
  birds.update(context,.8,.1);birds.update(context,.8,2);assert.equal(starts,1);assert.equal(lastVolume,.8);
  birds.mute();assert.equal(lastVolume,0);assert.equal(stops,1,'pause cuts a call short');
  birds.update(context,.8,.1);assert.equal(starts,1,'no call straight after resuming');
});

// Advance one walker on a park block as the city does when nothing blocks it.
const stepWalker=(city,chunk,p,dt)=>{
  const route=city.footpathStep(chunk,p,dt);
  p.walkTime+=dt;
  if(route){Object.assign(p,route);if(!p.detour)delete p.detour;delete p.footpathChoice;}
};
test('on a park footpath, a walker with footpath lines stays and talks while the player blocks them',async()=>{
  const {footpathJunctions}=await import('../neon-city/world.js');
  for(const type of [13,5]){
    const {city,chunk}=parkChunk(4),[j]=footpathJunctions(chunk);
    // On the park's sidewalk they are not on the footpath yet.
    const walker={phase:j.at-.2,speed:1.2,reverse:false,walkTime:0,type,variant:0,stuckTime:0};
    chunk.people=[walker];city.rng=()=>0;
    assert.equal(city.pedestrians(0)[0].place,null);
    for(let i=0;i<10;i++){stepWalker(city,chunk,walker,.02);}
    assert.ok(walker.detour);
    assert.equal(city.pedestrians(0)[0].place,'footpath');
    walker.walkTime+=8/1.2;
    const ahead=pedestrian(chunk,{...walker,walkTime:walker.walkTime+1.5/1.2},0),player={x:ahead.x,z:ahead.z};
    let time=0,heldFrames=0;
    for(let i=0;i<500;i++){
      const held=city.advancePedestrians(.02,player,time+=.02);
      if(held.some(h=>h.walker===walker&&h.place==='footpath'))heldFrames++;
    }
    const at=pedestrian(chunk,walker,time),gap=Math.hypot(at.x-player.x,at.z-player.z);
    assert.ok(gap>=PERSON_CLEARANCE-1e-9);
    if(type===13){assert.ok(walker.detour,'still on the footpath');assert.ok(heldFrames>400);assert.ok(gap<1.5,'he waits to talk');}
    else assert.ok(heldFrames<100&&gap>2.5,'others still turn back and walk away');
  }
});

test('sidewalk walkers take the footpath one time in four, then leave left or right at random',async()=>{
  const {footpathJunctions,FOOTPATH_CHANCE}=await import('../neon-city/world.js');
  assert.equal(FOOTPATH_CHANCE,.25);
  for(let seed=1;seed<12;seed++){
    const {city,chunk}=parkChunk(seed),{path}=chunk.park;
    const junctions=footpathJunctions(chunk);
    // Each junction is the sidewalk point level with that end of the footpath.
    for(const j of junctions){
      const at=pedestrian(chunk,{phase:j.at,speed:1,reverse:false,walkTime:0,type:0,variant:0},0);
      const end=j.end?path.at(-1):path[0];
      assert.ok(Math.hypot(at.x-end.x,at.z-end.z)-3<1e-9,'three units from the lawn edge, across the sidewalk');
      assert.ok(Math.abs(at.x-end.x)<1e-9||Math.abs(at.z-end.z)<1e-9);
    }
    for(const reverse of [false,true])for(const j of junctions){
      // Approach the junction, then cross it with chosen random draws.
      const walk=(draws,steps)=>{
        const p={phase:0,speed:1.2,reverse,walkTime:0,type:0,variant:0},dir=reverse?-1:1;
        p.phase=j.at-.5*dir;
        city.rng=()=>draws.length?draws.shift():.9;
        const trace=[pedestrian(chunk,p,0)];
        for(let i=0;i<steps;i++){stepWalker(city,chunk,p,.02);trace.push(pedestrian(chunk,p,0));}
        return {p,trace};
      };
      assert.ok(!walk([FOOTPATH_CHANCE],40).p.detour,'a draw of 1/4 or more keeps to the sidewalk');
      const {p,trace}=walk([FOOTPATH_CHANCE-1e-6],30);
      assert.ok(p.detour,'a draw below 1/4 takes the footpath');
      // Walk the whole footpath; the walker never jumps and avoids trees and benches.
      const left=walk([0,.2],3000),right=walk([0,.7],3000);
      for(const {p,trace} of [left,right]){
        assert.ok(!p.detour,'back on the sidewalk after the footpath');
        for(let i=1;i<trace.length;i++)assert.ok(Math.hypot(trace[i].x-trace[i-1].x,trace[i].z-trace[i-1].z)<=.02*1.2+1e-6,'continuous walking');
        assert.ok(trace.every(q=>!city.solid(q.x,q.z,.3)),'footpath walkers avoid trees and benches');
        const far=trace.findIndex(q=>{const e=j.end?path[0]:path.at(-1);return Math.hypot(q.x-e.x,q.z-e.z)<.05;});
        assert.ok(far>0,'walks the whole footpath to its other end');
      }
      assert.equal(left.p.reverse,true);assert.equal(right.p.reverse,false,'either direction afterwards');
    }
  }
});

test('footpath walkers do not decide again on leaving, and can turn back when blocked',async()=>{
  const {footpathJunctions}=await import('../neon-city/world.js');
  const {city,chunk}=parkChunk(4),[j]=footpathJunctions(chunk);
  const p={phase:j.at-.3,speed:1.5,reverse:false,walkTime:0,type:0,variant:0};
  let draws=0;city.rng=()=>{draws++;return 0;};
  for(let i=0;i<20;i++){stepWalker(city,chunk,p,.02);}
  assert.ok(p.detour);assert.equal(draws,1);
  for(let i=0;i<4000&&p.detour;i++){stepWalker(city,chunk,p,.02);}
  assert.ok(!p.detour);
  const decided=draws;
  for(let i=0;i<20;i++){stepWalker(city,chunk,p,.02);}
  assert.equal(draws,decided,'no new decision on stepping off the footpath');
  // Block a walker mid-footpath with the player: they wait, then turn back.
  const walker={phase:j.at-.2,speed:1.2,reverse:false,walkTime:0,type:0,variant:0,stuckTime:0};
  chunk.people=[walker];city.rng=()=>0;
  for(let i=0;i<10;i++){stepWalker(city,chunk,walker,.02);}
  assert.ok(walker.detour);
  walker.walkTime+=8/1.2;
  const ahead=pedestrian(chunk,{...walker,walkTime:walker.walkTime+1.5/1.2},0),player={x:ahead.x,z:ahead.z};
  let time=0,positions=[];
  for(let i=0;i<200;i++){city.advancePedestrians(.02,player,time+=.02);positions.push(pedestrian(chunk,walker,time));}
  for(let i=1;i<positions.length;i++)assert.ok(Math.hypot(positions[i].x-positions[i-1].x,positions[i].z-positions[i-1].z)<.05,'no teleporting');
  assert.ok(positions.every(q=>Math.hypot(q.x-player.x,q.z-player.z)>=PERSON_CLEARANCE-1e-9),'never walks through the player');
  const last=positions.at(-1);
  assert.ok(walker.detour,'still on the footpath');
  assert.ok(Math.hypot(last.x-player.x,last.z-player.z)>2.5,'turned back along the footpath');
});
