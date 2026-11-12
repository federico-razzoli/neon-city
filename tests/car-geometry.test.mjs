import {test} from 'node:test';
import assert from 'node:assert/strict';
import {carGeometry,drawCarGeometry} from '../neon-city/car-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';
import {originalCar} from './fixtures/original-car.mjs';

function render(car,player,eye,base,slope,inside,original,groundOverride=false){
  const faces=[];
  const face=(vertices,color,texture=null)=>faces.push({vertices,color,texture});
  const texture=id=>['','van:front','van:rear','van:side','mercedes','taxi'][id];
  if(original){
    originalCar(car,{player,eye,groundHeight:(x,z)=>base+(z-car.z)*slope,indoors:()=>inside,face,
      vanTexture:side=>`van:${side}`,mercedesGrille:()=>texture(4),taxiSign:()=>texture(5)},groundOverride?base:undefined);
  }else{
    const groundHeight=(x,z)=>base+(z-car.z)*slope;
    const carSlope=groundOverride||car.axis?0:(groundHeight(car.x,car.z+.1)-groundHeight(car.x,car.z-.1))/.2;
    drawCarGeometry(car,{player,eye,base,slope:carSlope,indoors:inside,texture,
      face(vertices,color,tex){
        vertices=vertices.map(v=>({...v,y:v.y+base+(v.z-car.z)*carSlope}));
        if(car.turn){
          const co=Math.cos(car.turn.angle),si=Math.sin(car.turn.angle);
          vertices=vertices.map(v=>({...v,x:car.x+(v.x-car.x)*co+(v.z-car.z)*si,z:car.z-(v.x-car.x)*si+(v.z-car.z)*co}));
        }
        face(vertices,color,tex);
      }});
  }
  return faces;
}

test('whole car templates preserve all models, faces, materials, textures, turns and slopes',()=>{
  for(const type of [undefined,'hippie-van','mercedes','taxi'])for(const axis of [0,1])for(const dir of [-1,1]){
    for(const [x,z] of [[0,0],[128,-64],[-4096,8192]])for(const [base,slope] of [[0,0],[-1,.18],[2,-.23]]){
      for(const groundOverride of [false,true])for(const [dx,dz,eye,inside,angle] of [[-8,-8,1.65,false,0],[8,8,6,false,.7],[-8,8,.1,true,-1.2],[8,-8,1.2,false,0]]){
        const car={type,axis,dir,x,z,color:'#123456',turn:angle?{angle}:null};
        const player={x:x+dx,z:z+dz};
        const before=render(car,player,eye,base,slope,inside,true,groundOverride),after=render(car,player,eye,base,slope,inside,false,groundOverride);
        assert.equal(after.length,before.length,`${type}/${axis}/${dir} ${x},${z} base=${base} slope=${slope} eye=${eye} view=${dx},${dz}: face count`);
        before.forEach((face,f)=>{
          const actual=after[f];
          assert.equal(actual.color,face.color);
          assert.equal(actual.texture,face.texture);
          assert.equal(actual.vertices.length,face.vertices.length);
          face.vertices.forEach((vertex,i)=>{
            assert.equal(actual.vertices[i].u,vertex.u);
            assert.equal(actual.vertices[i].v,vertex.v);
            for(const a of ['x','y','z']){
              const value=actual.vertices[i][a],expected=vertex[a];
              // Local template translation and the bridge finite difference can
              // change the last few bits relative to per-frame world arithmetic.
              assert.ok(Math.abs(value-expected)<1e-10,`${type}/${axis}/${dir} face ${f} ${a}: ${value} vs ${expected}`);
            }
          });
        });
      }
    }
  }
});

test('complete car templates are shared across positions, colours, turns and slopes',()=>{
  for(const type of [undefined,'hippie-van','mercedes','taxi'])for(const axis of [0,1])for(const dir of [-1,1]){
    const car={type,axis,dir,x:0,z:0,color:'#112233'},geometry=carGeometry(car),snapshot=geometry.slice();
    assert.ok(geometry instanceof Float64Array);
    assert.ok(geometry.length<=256*24);
    const count=geometryWasm.car_build(type==='hippie-van'?1:type==='mercedes'?2:type==='taxi'?3:0,axis,dir);
    assert.ok(count<=256);
    assert.equal(geometry.length,count*24);
    assert.strictEqual(carGeometry({...car,x:500,z:-700,color:'#ff0000',turn:{angle:1}}),geometry);
    geometryWasm.building_build(1,2,3,4,5);
    geometryWasm.car_build(3,1,1);
    assert.deepEqual(geometry,snapshot);
    assert.strictEqual(carGeometry(car),geometry);
  }
});
