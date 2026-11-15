import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeBuildings} from '../neon-city/three-buildings.js';
import {buildingGeometry,buildingTemplate} from '../neon-city/building-geometry.js';
import {geometryWasm} from '../neon-city/geometry-wasm.js';
const frame=buildings=>({city:{chunks:new Map([['0,0',{buildings}]])}});
const viewers=b=>[{x:b.x-2,z:b.z-2},{x:b.x+b.w+2,z:b.z+b.d+2}];

test('native building walls share a WASM unit template and reproduce every wall panel, UV and outward face',()=>{
  const scene=new THREE.Scene(),walls=createThreeBuildings(scene);
  const buildings=[{x:14,z:14,w:18,d:18,h:33},{x:-70,z:22,w:17.3,d:19.7,h:12}];
  const images=buildings.map(b=>Array.from({length:4},()=>({width:160,height:b.h*9})));
  try{
    walls.beginFrame(frame(buildings));
    buildings.forEach((b,i)=>{for(const viewer of viewers(b))walls.draw(b,side=>images[i][side],viewer);});
    scene.updateMatrixWorld(true);
    for(let b=0;b<buildings.length;b++){
      const group=scene.children[b],source=buildingGeometry(buildings[b]);
      assert.equal(group.children.length,4);assert.equal(group.matrixAutoUpdate,false);
      for(const mesh of group.children){
        const side=Number(mesh.name.split(':')[1]),p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
        assert.equal(mesh.material.side,THREE.FrontSide);assert.equal(mesh.material.map.image,images[b][side]);
        assert.equal(mesh.material.map.magFilter,THREE.NearestFilter);assert.equal(mesh.material.map.generateMipmaps,false);
        if(b)assert.equal(mesh.geometry,scene.children[0].children.find(m=>m.name===mesh.name).geometry);
        const normal=[new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0)][side];
        for(let panel=0;panel<8;panel++){
          const actual=Array.from({length:6},(_,j)=>new THREE.Vector3().fromBufferAttribute(p,panel*6+j).applyMatrix4(mesh.matrixWorld));
          for(let v=0;v<4;v++){
            const k=((side*8+panel)*4+v)*5,expected=new THREE.Vector3(source[k],source[k+1],-source[k+2]);
            assert.ok(actual.some(q=>q.distanceTo(expected)<1e-6));
            assert.ok(actual.some((q,j)=>q.distanceTo(expected)<1e-6&&Math.abs(uv.getX(panel*6+j)-source[k+3]/160)<1e-7&&Math.abs(uv.getY(panel*6+j)-(1-source[k+4]))<1e-7));
          }
          assert.ok(new THREE.Vector3().subVectors(actual[1],actual[0]).cross(new THREE.Vector3().subVectors(actual[2],actual[0])).dot(normal)>0);
        }
      }
    }
    const template=buildingTemplate(),snapshot=template.slice();geometryWasm.tree_build();assert.equal(buildingTemplate(),template);assert.deepEqual(template,snapshot);
  }finally{walls.dispose();}
});

test('camera movement leaves wall buffers and transforms unchanged; dim artwork swaps reuse textures',()=>{
  const scene=new THREE.Scene(),walls=createThreeBuildings(scene),building={x:14,z:14,w:18,d:18,h:27};
  const lit=Array.from({length:4},()=>({width:160,height:243})),dim=lit.map(image=>({...image}));let useDim=false;
  const imageFor=side=>(useDim?dim:lit)[side];
  try{
    walls.beginFrame(frame([building]));walls.draw(building,imageFor,viewers(building)[0]);
    const group=scene.children[0],mesh=group.children[0],geometry=mesh.geometry,material=mesh.material,matrix=group.matrix.clone(),version=geometry.attributes.position.version;
    for(let i=0;i<20;i++){walls.beginFrame(frame([building]));walls.draw(building,imageFor,{x:10-i*.01,z:10});}
    assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(geometry.attributes.position.version,version);assert.ok(group.matrix.equals(matrix));
    useDim=true;walls.draw(building,imageFor,viewers(building)[0]);assert.notEqual(mesh.material,material);assert.equal(mesh.material.map.image,dim[0]);const dimMaterial=mesh.material;
    useDim=false;walls.draw(building,imageFor,viewers(building)[0]);assert.equal(mesh.material,material);
    useDim=true;walls.draw(building,imageFor,viewers(building)[0]);assert.equal(mesh.material,dimMaterial);
    building.x+=1;building.h+=3;walls.draw(building,imageFor,viewers(building)[0]);assert.equal(group.position.x,building.x);assert.equal(group.scale.y,building.h);assert.equal(mesh.geometry,geometry);
  }finally{walls.dispose();}
});

test('offscreen buildings stay lazy, window culling hides retained walls, and unloading frees only their artwork',()=>{
  let visible=false,requests=0;const scene=new THREE.Scene(),walls=createThreeBuildings(scene,{boundsVisible:()=>visible}),building={x:0,z:0,w:18,d:18,h:12};
  const image={width:160,height:108},imageFor=()=>{requests++;return image;};
  walls.beginFrame(frame([building]));walls.draw(building,imageFor,viewers(building)[0]);assert.equal(scene.children.length,0);assert.equal(requests,0);
  visible=true;walls.draw(building,imageFor,viewers(building)[0]);const group=scene.children[0],mesh=group.children[0];let geometryReleased=0,textureReleased=0,materialReleased=0;
  mesh.geometry.addEventListener('dispose',()=>geometryReleased++);mesh.material.map.addEventListener('dispose',()=>textureReleased++);mesh.material.addEventListener('dispose',()=>materialReleased++);
  visible=false;walls.beginFrame(frame([building]));walls.draw(building,imageFor,viewers(building)[0]);assert.equal(group.visible,false);
  visible=true;walls.draw(building,imageFor,viewers(building)[0]);assert.equal(scene.children[0],group);assert.equal(group.visible,true);
  walls.beginFrame(frame([]));assert.equal(scene.children.length,0);assert.equal(textureReleased,1);assert.equal(materialReleased,1);assert.equal(geometryReleased,0);
  walls.dispose();walls.dispose();assert.equal(geometryReleased,1);
});
