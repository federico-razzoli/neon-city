import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {City,BLOCK,RIVER_ROWS,WATER_LEVEL,RIVER_WALK_HEIGHT,groundHeight,riverWalkHeight} from '../neon-city/world.js';
import {advanceRiverFall} from '../neon-city/river-fall.js';
import {createThreeRiverWalks} from '../neon-city/three-river-walks.js';
import {createThreeRailings} from '../neon-city/three-railings.js';

test('stairs descend from unchanged banks to paths 50cm above water and return on both banks',()=>{
  const city=new City(1);
  assert.equal(WATER_LEVEL,-3.9);assert.equal(RIVER_WALK_HEIGHT,-3.4);assert.ok(Math.abs(RIVER_WALK_HEIGHT-WATER_LEVEL-.5)<1e-9);
  for(const row of RIVER_ROWS)for(const [bank,dir] of [[row*BLOCK+18,1],[row*BLOCK+110,-1]])for(const cx of [-3,0,3]){
    const p={x:cx*BLOCK+15,z:bank-dir*2};
    city.move(p,0,dir*3.5);assert.equal(p.riverWalk,true);assert.equal(groundHeight(p.x,p.z,p.riverWalk),0);
    let last=0;
    for(let i=0;i<140;i++){
      city.move(p,.1,0);const height=groundHeight(p.x,p.z,p.riverWalk);
      assert.ok(height<=last+1e-9&&last-height<.29);last=height;
    }
    assert.ok(Math.abs(last-RIVER_WALK_HEIGHT)<1e-9);
    city.move(p,0,dir*3);const origin=p.x;
    city.move(p,200,0);assert.ok(Math.abs(p.x-origin-200)<1e-7,'lower path crosses chunks and passes under bridges');
    city.move(p,-200,0);city.move(p,0,-dir*3);city.move(p,-14,0);city.move(p,0,-dir*3.5);
    assert.equal(p.riverWalk,undefined);assert.equal(groundHeight(p.x,p.z),0);assert.ok((p.z-bank)*dir<0);
  }
});
test('water, retaining walls and stair sides cannot be crossed at the wrong height',()=>{
  const city=new City(1),bank=RIVER_ROWS[0]*BLOCK+18;
  const upper={x:40,z:bank-2};city.move(upper,0,6);assert.ok(upper.z<bank);assert.equal(upper.riverWalk,undefined);
  const lower={x:40,z:bank+4.5,riverWalk:true};city.move(lower,0,20);assert.ok(lower.z<bank+6);
  city.move(lower,0,-20);assert.ok(lower.z>bank);
  const beside={x:19,z:bank+4.5,riverWalk:true};city.move(beside,0,-3);assert.ok(beside.z>=bank+3,'cannot climb the side of the stairs');
  assert.equal(riverWalkHeight(19,bank+4.5),RIVER_WALK_HEIGHT);
});
test('traffic and people above the lower path do not block walking under a bridge',()=>{
  const city=new City(1),z=RIVER_ROWS[0]*BLOCK+22.5,p={x:-4,z,riverWalk:true};
  const bumped=[],bumpedCars=[];
  city.move(p,8,0,[{x:0,z}],bumped,[{x:0,z,axis:0,waiting:true}],bumpedCars);
  assert.ok(Math.abs(p.x-4)<1e-9);assert.deepEqual(bumped,[]);assert.deepEqual(bumpedCars,[]);
});
test('stair landing cannot overlap bridge railings while lower paths pass underneath',()=>{
  const city=new City(1);
  for(const row of RIVER_ROWS)for(const street of [-3,0,3])for(const [bank,dir] of [[row*BLOCK+18,1],[row*BLOCK+110,-1]]){
    const landing={x:street*BLOCK+15,z:bank+dir*1.5,riverWalk:true};
    city.move(landing,-2,0);
    assert.ok(landing.x>=street*BLOCK+14.55-1e-9,'player radius stays outside railing');
    city.move(landing,1,0);assert.ok(landing.x>street*BLOCK+15,'can retreat from railing');
    const below={x:street*BLOCK+16,z:bank+dir*4.5,riverWalk:true};
    city.move(below,-32,0);
    assert.ok(Math.abs(below.x-(street*BLOCK-16))<1e-7,'can cross beneath both bridge sides');
  }
});
test('native paths retain shared geometry, release unloaded chunks and leave upper stair entrances open',()=>{
  const scene=new THREE.Scene(),walks=createThreeRiverWalks(scene),railings=createThreeRailings(scene),row=RIVER_ROWS[0];
  walks.beginFrame();railings.beginFrame();
  for(const part of [0,1]){const chunk={x:0,z:row+part,riverStart:row,river:true};walks.draw(chunk);railings.draw(chunk);}
  walks.endFrame();railings.endFrame();
  const group=scene.getObjectByName(`river-walk:0,${row}`),slabs=group.getObjectByName('river-walk-stone'),matrix=new THREE.Matrix4();
  slabs.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[13]+matrix.elements[5]/2-RIVER_WALK_HEIGHT)<1e-6);
  assert.equal(slabs.geometry,scene.getObjectByName(`river-walk:0,${row+1}`).getObjectByName('river-walk-stone').geometry);
  for(const part of [0,1]){
    const bank=row*BLOCK+(part?110:18),dir=part?-1:1;
    const group=scene.getObjectByName(`river-walk:0,${row+part}`),stone=group.getObjectByName('river-walk-stone');
    for(let i=1;i<stone.count;i++){
      stone.getMatrixAt(i,matrix);
      assert.equal(matrix.elements[14]+dir*matrix.elements[10]/2,-bank,'stairs touch the retaining wall');
    }
    assert.equal(group.getObjectByName('river-walk-rails'),undefined);
  }
  for(const name of ['bank-railing-bases','bank-railing-top-rails']){
    const mesh=scene.getObjectByName(`bank-railings:0,${row}`).getObjectByName(name);
    for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const x=matrix.elements[12],w=matrix.elements[0];assert.ok(x+w/2<=14||x-w/2>=16);}
  }
  walks.beginFrame();walks.endFrame();assert.equal(scene.getObjectByName(`river-walk:0,${row}`),undefined);
  walks.dispose();railings.dispose();assert.equal(scene.children.length,0);
});

test('only bridge approaches have stairs, with readable tread and riser colours',()=>{
  const scene=new THREE.Scene(),walks=createThreeRiverWalks(scene),railings=createThreeRailings(scene),city=new City(1),row=RIVER_ROWS[0];
  walks.beginFrame();railings.beginFrame();
  for(const cx of [-3,-2,-1,0,1,2,3]){
    const chunk={x:cx,z:row,riverStart:row,river:true};walks.draw(chunk);railings.draw(chunk);
    const slabs=scene.getObjectByName(`river-walk:${cx},${row}`).getObjectByName('river-walk-stone');
    const bridge=cx%3===0;
    assert.equal(slabs.count,bridge?13:1,'intermediate blocks contain only the path slab');
    const p={x:cx*BLOCK+15,z:row*BLOCK+16};city.move(p,0,3.5);
    assert.equal(!!p.riverWalk,bridge,'only bridge approaches have a walkable stair entrance');
    if(bridge){
      assert.ok(slabs.material[2].color.r>slabs.material[0].color.r,'treads are lighter than risers');
      const a=new THREE.Color(),b=new THREE.Color();slabs.getColorAt(2,a);slabs.getColorAt(3,b);
      assert.notDeepEqual(a,b,'adjacent treads have subtle tonal variation');
      const matrix=new THREE.Matrix4();slabs.getMatrixAt(1,matrix);
      assert.equal(matrix.elements[12]-matrix.elements[0]/2,cx*BLOCK+14,'landing begins at bridge footway edge');
    }else{
      const mesh=scene.getObjectByName(`bank-railings:${cx},${row}`).getObjectByName('bank-railing-top-rails');
      const matrix=new THREE.Matrix4();let spansOldGate=false;
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);const x=matrix.elements[12]-cx*BLOCK,w=matrix.elements[0];
        if(x-w/2<=21&&x+w/2>=21)spansOldGate=true;
      }
      assert.ok(spansOldGate,'upper railing closes the former middle-of-block entrance');
    }
  }
  walks.dispose();railings.dispose();
});

test('three benches per inter-bridge bank span are equally spaced with backs against the wall',async()=>{
  const {riverBenches}=await import('../neon-city/world.js');
  for(const bridge of [-6,-3,0,3])for(const part of [0,1]){
    const row=RIVER_ROWS[0],chunks=[0,1,2].map(i=>({x:bridge+i,z:row+part,riverStart:row}));
    const benches=chunks.flatMap(riverBenches);assert.equal(benches.length,3);
    const left=bridge*BLOCK+14,right=(bridge+3)*BLOCK-14;
    const margin=benches[0].x-1-left,gap=benches[1].x-benches[0].x-2;
    assert.ok(Math.abs(right-benches[2].x-1-margin)<1e-9);
    assert.equal(margin,64);
    assert.equal(gap,15);
    assert.equal(benches[1].x,(benches[0].x+benches[2].x)/2);
    for(const b of benches)assert.ok(Math.abs(b.z+b.nz*.3-(row*BLOCK+(part?110:18)))<1e-9);
  }
});
test('riverside benches block walking and use the existing sit and stand interaction',async()=>{
  const {facingBench}=await import('../neon-city/parks.js');
  const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
  const source=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const useSeat=source.slice(source.indexOf('function useSeat(){'),source.indexOf('const hotelGuestScene='));
  for(const part of [0,1]){
    const city=new City(1),row=RIVER_ROWS[0],chunk=city.generate(1,row+part);city.chunks.set(`1,${row+part}`,chunk);
    const b=chunk.riverBenches[0],dir=part?-1:1;
    const player={x:b.x-.5,z:b.z+dir*1.2,angle:part?0:Math.PI,riverWalk:true},standing={x:player.x,z:player.z};
    assert.ok(facingBench(player,city.chunks.values()));
    assert.equal(facingBench({...player,riverWalk:false},city.chunks.values()),null,'upper promenade cannot target lower benches');
    const sandbox={city,player,playerSeat:null,hotelStairs:null,insideCubicle:null,insideLavatory:false,insidePub:false,insideBookshop:false,insideHotel:false,insideArcade:false,facingBench,SEATED_EYE:1.5,keys:new Set(),shiftKeys:new Set(),eye:1.65,pubTalk:null};
    runInNewContext(useSeat+'globalThis.sit=useSeat;',sandbox);
    assert.equal(sandbox.sit(),true);assert.ok(sandbox.playerSeat);assert.equal(player.riverWalk,true);
    assert.ok(Math.abs(player.z-b.z)<1e-9);assert.ok(Math.abs(Math.cos(player.angle)-dir)<1e-9,'seated player faces water');
    assert.equal(sandbox.sit(),true);assert.equal(sandbox.playerSeat,null);assert.equal(player.x,standing.x);assert.equal(player.z,standing.z);
    city.move(player,0,-dir*2);assert.ok((player.z-b.z)*dir>=.75-1e-9,'cannot walk through the bench');
  }
});

test('players fall off both stair sides, with landing remarks only above three steps',()=>{
  const city=new City(1);
  for(const [bank,dir] of [[RIVER_ROWS[0]*BLOCK+18,1],[RIVER_ROWS[0]*BLOCK+110,-1]]){
    for(const [x,expected] of [[26,null],[25,null],[24,'OUCH! MY FOOT!'],[19,'OUCH! MY FOOT!']]){
      const p={x,z:bank+dir*2.9,riverWalk:true};
      const before=groundHeight(p.x,p.z,true);
      city.move(p,0,dir*.5);
      assert.ok((p.z-bank)*dir>3,'can step off the stair side');
      assert.equal(p.riverFall.start,before);
      assert.equal(advanceRiverFall(p,.02,()=>0),null);
      assert.ok(p.riverFall.height<before&&p.riverFall.height>RIVER_WALK_HEIGHT);
      assert.equal(advanceRiverFall(p,2,()=>0),expected);
      assert.equal(p.riverFall,undefined);
      assert.equal(advanceRiverFall(p,2),null,'landing triggers once');
    }
  }
  for(const [random,text] of [[0,'OUCH! MY FOOT!'],[.4,'OUCH! MY KNEE!'],[.9,'I THINK I LOST 5 HPs!']]){
    const p={x:19,z:RIVER_ROWS[0]*BLOCK+22,riverWalk:true,riverFall:{height:0,start:0,velocity:0}};
    assert.equal(advanceRiverFall(p,2,()=>random),text);
  }
});

test('locked grates sit under bridge approaches on both banks and release their resources',()=>{
  const scene=new THREE.Scene(),walks=createThreeRiverWalks(scene),row=RIVER_ROWS[0];
  walks.beginFrame();
  for(const x of [-3,0,1,3])for(const part of [0,1])walks.draw({x,z:row+part,riverStart:row});
  walks.endFrame();
  for(const group of scene.children){
    const isBridge=!group.name.startsWith('river-walk:1,');
    const bars=group.getObjectByName('river-grate-iron');
    assert.equal(Boolean(bars),isBridge);
    if(isBridge){
      assert.ok(bars.count>40);
      assert.equal(group.getObjectByName('river-grate-lock').count,1);
      assert.equal(group.getObjectByName('river-grate-dark').count,1);
      assert.equal(group.getObjectByName('river-grate-keyhole').count,1);
      assert.equal(group.getObjectByName('river-grate-frame'),undefined);
      for(const child of group.children.filter(m=>m.name.startsWith('river-grate-'))){
        child.computeBoundingBox();
        assert.ok(child.boundingBox.min.y>=RIVER_WALK_HEIGHT-1e-6);
        assert.ok(child.boundingBox.max.y<=-1.4+1e-6,'door fits below the bridge slab');
        const bank=row*BLOCK+(group.name.endsWith(`,${row}`)?18:110),dir=bank===row*BLOCK+18?1:-1;
        const nearest=dir===1?-child.boundingBox.min.z:child.boundingBox.max.z;
        assert.ok((nearest-bank*dir)<-.02,'ironwork is recessed behind the wall');
      }
      assert.equal(group.getObjectByName('river-grate-hardware').material.color.getHexString(),'191c1c');
    }
  }
  walks.beginFrame();walks.endFrame();assert.equal(scene.children.length,0);
  walks.dispose();
});

test('grates respond only to nearby lower-path players facing the wall on either bank',async()=>{
  const {facingRiverGrate,RIVER_GRATE_MESSAGE}=await import('../neon-city/river-grates.js');
  assert.equal(RIVER_GRATE_MESSAGE,'THIS LOOKS ANCIENT, MYSTERIOUS AND SCARY...');
  for(const street of [-3,0,3])for(const [bank,dir] of [[RIVER_ROWS[0]*BLOCK+18,1],[RIVER_ROWS[0]*BLOCK+110,-1]]){
    const p={x:street*BLOCK,z:bank+dir*1.4,angle:dir===1?Math.PI:0,riverWalk:true};
    assert.equal(facingRiverGrate(p),true);
    assert.equal(facingRiverGrate({...p,riverWalk:false}),false);
    assert.equal(facingRiverGrate({...p,angle:p.angle+Math.PI}),false);
    assert.equal(facingRiverGrate({...p,x:p.x+4}),false);
    assert.equal(facingRiverGrate({...p,z:bank+dir*4}),false);
    assert.equal(facingRiverGrate({...p,riverFall:{height:0}}),false);
    assert.equal(facingRiverGrate({...p,x:p.x+BLOCK}),false);
  }
});

test('Three.js doorway rays require an actual hit, including viewing angle and height',async()=>{
  const {riverGrateTarget}=await import('../neon-city/river-grates.js');
  const p={x:0,z:RIVER_ROWS[0]*BLOCK+19.4,angle:Math.PI,riverWalk:true};
  assert.ok(riverGrateTarget(p));
  assert.equal(riverGrateTarget({...p,angle:Math.PI+.7}),null,'ray passes beside the opening');
  assert.equal(riverGrateTarget({...p,pitch:.8}),null,'ray passes over the opening');
  assert.ok(riverGrateTarget({...p,x:1.1,angle:Math.PI+.45}),'angled ray reaches the door from the side');
});

test('door clang waits three seconds, repeats at the minimum interval, and resets on lost gaze or pause',async()=>{
  const {RiverGrateClang}=await import('../neon-city/river-grates.js');
  let played=0,stopped=0;
  const clang=new RiverGrateClang(()=>{played++;return {stop(){stopped++;}};},()=>0);
  const context={state:'running'},p={x:0,z:RIVER_ROWS[0]*BLOCK+19.4,angle:Math.PI,riverWalk:true};
  clang.update(2.99,p,context);assert.equal(played,0);
  clang.update(.01,p,context);assert.equal(played,1);
  clang.update(4.99,p,context);assert.equal(played,1);
  clang.update(.01,p,context);assert.equal(played,2);
  clang.update(.01,{...p,angle:0},context);assert.equal(stopped,2);
  clang.update(2.99,p,context);assert.equal(played,2);
  clang.update(.01,p,context);assert.equal(played,3);
  clang.update(1,p,context,false);assert.equal(stopped,3);
  clang.update(2,p,context);assert.equal(played,3);
  clang.update(1,{...p,z:p.z+4},context);assert.equal(played,3);
  clang.update(2,p,context);assert.equal(played,3);
  clang.update(1,{...p,x:3*BLOCK},context);assert.equal(played,3,'switching doors restarts the delay');
  clang.update(2,{...p,x:3*BLOCK},context);assert.equal(played,4);
  clang.update(5,p,{state:'suspended'});assert.equal(played,4);
});

test('each clang randomly chooses one of three pitches with the original as the highest',async()=>{
  const {playRiverGrateClang}=await import('../neon-city/river-grates.js');
  const voices=[];
  for(const choice of [0,.5,.99,0]){
    const frequencies=[];
    const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
    const context={state:'running',currentTime:0,destination:{},
      createGain:()=>({gain:{...param},connect(){},disconnect(){}}),
      createOscillator:()=>({frequency:{setValueAtTime(f){frequencies.push(f);}},connect(){},disconnect(){},start(){},stop(){}})};
    playRiverGrateClang(context,()=>choice);voices.push(frequencies);
  }
  assert.deepEqual(voices[2],[183,307,451,709,1031,1483]);
  assert.ok(voices[0].every((f,i)=>f<voices[1][i]&&voices[1][i]<voices[2][i]));
  assert.deepEqual(voices[0],voices[3],'a fresh random choice may repeat a previous voice');
});

test('each repeat interval is freshly randomized between five and eight seconds',async()=>{
  const {RiverGrateClang}=await import('../neon-city/river-grates.js');
  const choices=[0,.5,1];let played=0;
  const clang=new RiverGrateClang(()=>{played++;return null;},()=>choices.shift());
  const p={x:0,z:RIVER_ROWS[0]*BLOCK+19.4,angle:Math.PI,riverWalk:true},context={state:'running'};
  clang.update(3,p,context);assert.equal(played,1);assert.equal(clang.remaining,5);
  clang.update(5,p,context);assert.equal(played,2);assert.equal(clang.remaining,6.5);
  clang.update(6.49,p,context);assert.equal(played,2);
  clang.update(.01,p,context);assert.equal(played,3);assert.equal(clang.remaining,8);
  clang.reset();assert.equal(clang.remaining,3);
});
