import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreeFingerposts} from '../neon-city/three-fingerposts.js';
import {drawFingerpost} from '../neon-city/parks.js';
import {START_SIGN,RIVER_SIGN} from '../neon-city/world.js';
const boards=[{text:'NIGHT RIVER',dx:0,dz:1,bottom:RIVER_SIGN.bottom,top:RIVER_SIGN.top}];
const frame=signs=>({city:{chunks:new Map(signs.map((sign,i)=>[i,{park:{sign}}]))}});
function textureFixture(){const images=new Map();return (text,right)=>{const key=`${text}:${right}`;if(!images.has(key))images.set(key,{width:300,height:72});return images.get(key);};}

test('matching sign assemblies share geometry and textures without per-frame uploads',()=>{
  const scene=new THREE.Scene(),signs=createThreeFingerposts(scene),a={x:20,z:30},b={x:40,z:50},state=frame([a,b]),texture=textureFixture();
  try{
    signs.beginFrame(state);signs.draw(a,boards,texture);signs.draw(b,boards,texture);
    const [first,second]=scene.children;assert.equal(first.children.length,3);
    first.children.forEach((mesh,i)=>{assert.equal(mesh.geometry,second.children[i].geometry);assert.equal(mesh.material,second.children[i].material);});
    const versions=first.children.map(m=>m.geometry.attributes.position.version);
    signs.beginFrame(state);signs.draw(a,boards,texture);assert.equal(scene.children[0],first);assert.deepEqual(first.children.map(m=>m.geometry.attributes.position.version),versions);
    assert.equal(first.position.x,20);assert.equal(first.position.z,-30);
    for(const mesh of first.children.filter(m=>m.material.map)){
      assert.equal(mesh.material.map.magFilter,THREE.LinearFilter);assert.equal(mesh.material.map.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(mesh.material.map.generateMipmaps,true);assert.equal(mesh.material.map.anisotropy,8);
    }
  }finally{signs.dispose();}
});

test('both readable arrow faces retain their geometry, texture orientation and UV coordinates',()=>{
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const scene=new THREE.Scene(),signs=createThreeFingerposts(scene),s={x:20,z:-30},texture=textureFixture(),entries=[{...boards[0],dx,dz}];
    try{
      const expected=[];drawFingerpost({...s,x:0,z:0},entries,{complete:true,signTexture:texture,face(points,color,image){if(image)expected.push({points,image});}},null);
      signs.beginFrame(frame([s]));signs.draw(s,entries,texture);
      const faces=scene.children[0].children.filter(m=>m.material.map);assert.equal(faces.length,2);
      faces.forEach((mesh,i)=>{
        assert.equal(mesh.material.map.image,expected[i].image);
        const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
        expected[i].points.forEach((point,j)=>{
          assert.ok(Math.abs(p.getX(j)-point.x)<1e-6);assert.ok(Math.abs(p.getY(j)-point.y)<1e-6);assert.ok(Math.abs(p.getZ(j)+point.z)<1e-6);
          assert.ok(Math.abs(uv.getX(j)-point.u/300)<1e-6);assert.ok(Math.abs(uv.getY(j)-(1-point.v/72))<1e-6);
        });
      });
    }finally{signs.dispose();}
  }
});

test('unloaded signs drop their groups and shared resources release once on exit',()=>{
  const scene=new THREE.Scene(),signs=createThreeFingerposts(scene),s={x:20,z:30},texture=textureFixture();
  signs.beginFrame(frame([s]));signs.draw(s,boards,texture);
  const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);if(o.material.map)resources.add(o.material.map);}});
  let released=0;for(const resource of resources)resource.addEventListener('dispose',()=>released++);
  signs.beginFrame(frame([]));assert.equal(scene.children.length,0);assert.equal(released,0);
  signs.dispose();assert.equal(released,resources.size);
});

test('start sign persists across frames and window bounds hide and restore it',()=>{
  let visible=false;const scene=new THREE.Scene(),signs=createThreeFingerposts(scene,{boundsVisible:()=>visible}),texture=textureFixture();
  try{
    signs.beginFrame(frame([]));signs.draw(START_SIGN,boards,texture);const group=scene.children[0];assert.equal(group.visible,false);
    visible=true;signs.beginFrame(frame([]));signs.draw({...START_SIGN},boards,texture);assert.equal(scene.children[0],group);assert.equal(group.visible,true);
  }finally{signs.dispose();}
});
