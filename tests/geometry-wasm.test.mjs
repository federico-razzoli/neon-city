import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometryWasm as wasm} from '../neon-city/geometry-wasm.js';
import {buildingGeometry} from '../neon-city/building-geometry.js';
import {manholeGeometry} from '../neon-city/manhole-geometry.js';
import {newspaperGeometry} from '../neon-city/newspaper-geometry.js';
import {signBoardGeometry,signPoleGeometry} from '../neon-city/sign-geometry.js';
import {carGeometry} from '../neon-city/car-geometry.js';
import {roadMarkingGeometry} from '../neon-city/road-marking-geometry.js';

test('shared WASM scratch memory preserves every generator cache',()=>{
  const building={x:23,z:-45,w:18,d:20,h:12},machine={side:2,w:1,d:.8};
  const board={dx:1,dz:0,bottom:3,top:3.5},dimensions={start:.1,reach:2,tip:.3};
  const getters=[()=>buildingGeometry(building),()=>manholeGeometry(.65),
    ()=>newspaperGeometry(machine),()=>signBoardGeometry(board,dimensions,300,72),()=>signPoleGeometry(3.75,.08),roadMarkingGeometry,()=>carGeometry({type:'mercedes',axis:1,dir:-1})];
  const cached=getters.map(get=>get()),snapshots=cached.map(data=>data.slice());
  const builds=[()=>wasm.building_build(0,0,1,1,1),()=>wasm.manhole_build(.9),
    ()=>wasm.newspaper_build(0,2,1),()=>wasm.sign_board(0,1,1,2,.1,2,.3,300,72),()=>wasm.sign_pole(5,.1),()=>wasm.road_marking_build(),()=>wasm.car_build(3,0,1)];
  const scratch=new Float64Array(wasm.memory.buffer,wasm.output(),256*24);
  for(const build of builds){
    scratch.fill(NaN);build();
    assert.ok(Number.isFinite(scratch[0]),'generator writes to common output');
    getters.forEach((get,i)=>{assert.strictEqual(get(),cached[i]);assert.deepEqual(get(),snapshots[i]);});
  }
});
