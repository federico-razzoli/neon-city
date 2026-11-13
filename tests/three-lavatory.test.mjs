import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeLavatoryScene,createThreeCubicleScene} from '../neon-city/three-lavatory-scene.js';
import {LAVATORY,CUBICLE,drawLavatory} from '../neon-city/lavatory.js';
import {createRendererPreferences} from '../neon-city/renderer-support.js';
import {DEBUG_DESTINATIONS} from '../neon-city/debug-menu.js';

function frame(){return {player:{...LAVATORY.spawn},eye:1.65,lavatoryOccupied:[false,true,true],lavatoryTaps:[false,false],lavatoryLife:{walker:null},city:{chunks:new Map()},itemRoom:'lavatory'};}
test('lavatory and cubicles default to Three.js and both appear in the debug menu',()=>{
  const preferences=createRendererPreferences();
  for(const name of ['lavatory','cubicle']){assert.equal(preferences.get(name),'three');assert.ok(DEBUG_DESTINATIONS.some(([id])=>id===name));}
});
test('lavatory retains its room, water and reflection geometry as flags, taps and viewpoint change',()=>{
  const room=createThreeLavatoryScene(),state=frame();room.update(state);
  const staticMesh=room.scene.getObjectByName('lavatory-room'),geometry=staticMesh.geometry;
  assert.equal(room.scene.getObjectByName('lavatory-flag-0-vacant').visible,true);
  assert.equal(room.scene.getObjectByName('lavatory-flag-1-engaged').visible,true);
  assert.equal(room.scene.children.filter(o=>o.name.startsWith('lavatory-water')&&o.visible).length,0);
  const mirror=room.scene.getObjectByName('lavatory-mirror-0'),mirrorGeometry=mirror.geometry;
  state.player={x:6,z:2.35,angle:Math.PI/2};state.lavatoryTaps=[true,true];state.lavatoryOccupied[0]=true;room.update(state);
  assert.equal(room.scene.getObjectByName('lavatory-flag-0-engaged').visible,true);
  assert.equal(room.scene.children.filter(o=>o.name.startsWith('lavatory-water')&&o.visible).length,2);
  assert.equal(mirror.isReflector,true);assert.equal(mirror.geometry,mirrorGeometry);assert.equal(staticMesh.geometry,geometry);
  state.player.z=5;room.update(state);assert.equal(mirror.geometry,mirrorGeometry);room.dispose();
});
test('lavatory walker and dropped items use shared depth and are removed on departure',()=>{
  const room=createThreeLavatoryScene({imageFor:()=>({width:24,height:48})}),state=frame();
  state.lavatoryLife.walker={x:3,z:4,type:13,variant:0,walkTime:.5,facingX:0,facingZ:-1};
  state.city.chunks.set('0,0',{droppedItems:[{item:{id:'hotel-note'},x:3,z:4,ground:.015,angle:0,room:state.itemRoom}]});room.update(state);
  assert.ok(room.scene.getObjectByName('lavatory-guest'));assert.ok(room.scene.getObjectByName('dropped-hotel-note'));
  state.lavatoryLife.walker=null;state.city.chunks.clear();room.update(state);
  assert.equal(room.scene.getObjectByName('lavatory-guest'),undefined);assert.equal(room.scene.getObjectByName('dropped-hotel-note'),undefined);room.dispose();
});
test('cubicle retains toilet geometry with the seated camera and releases scene resources',()=>{
  const room=createThreeCubicleScene(),state={...frame(),player:{...CUBICLE.spawn},itemRoom:'cubicle'};
  room.update(state);const mesh=room.scene.getObjectByName('cubicle-room'),geometry=mesh.geometry;
  state.eye=CUBICLE.seat.eye;state.playerSeat={pitch:.3};room.update(state);assert.equal(room.camera.position.y,state.eye);assert.equal(room.camera.rotation.x,.3);assert.equal(mesh.geometry,geometry);
  for(const current of [room,createThreeLavatoryScene()]){
    const resources=new Set();current.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});let disposed=0;
    for(const r of resources)r.addEventListener('dispose',()=>disposed++);
    current.dispose();current.dispose();assert.equal(disposed,resources.size);
  }
});
test('banshee overlay preserves renderer clear state and disposes its resources',()=>{
  const prior=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},fillRect(){}})})};
  try{
    const room=createThreeCubicleScene(),resources=new Set(),renderer={autoClear:true,render(scene){assert.equal(this.autoClear,false);scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);resources.add(o.material.map);}});}};
    room.renderOverlay(renderer,{banshee:{started:performance.now()-3000}});assert.equal(renderer.autoClear,true);
    let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);room.dispose();room.dispose();assert.equal(disposed,resources.size);
  }finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
test('Canvas defaults retain occupancy indicators',()=>{
  const count=options=>{let boxes=0;drawLavatory({face(){},quad(){},box(){boxes++;},...options});return boxes;};
  assert.equal(count(),count({drawIndicators:true}));assert.equal(count()-count({drawIndicators:false}),LAVATORY.cubicles.length);
  assert.equal(count()-count({drawMirrorGlass:false}),LAVATORY.sinks.length);
});

test('Reflector mirrors the camera through the glass and shows the player only in reflections',()=>{
  const room=createThreeLavatoryScene(),state=frame();state.player={x:6,z:2.35,angle:Math.PI/2};room.update(state);room.scene.updateMatrixWorld(true);
  const mirror=room.scene.getObjectByName('lavatory-mirror-0'),other=room.scene.getObjectByName('lavatory-mirror-1');
  const body=room.scene.getObjectByName('lavatory-player-silhouette'),geometry=body.children[0].geometry;
  let renders=0,target=null;
  const renderer={xr:{enabled:false},shadowMap:{autoUpdate:true},autoClear:true,state:{buffers:{depth:{setMask(){}}}},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},
    render(scene,camera){renders++;assert.equal(other.visible,false);assert.equal(mirror.visible,false);assert.ok(camera.layers.test(body.children[0].layers));assert.equal(scene,room.scene);}};
  assert.equal(room.camera.layers.test(body.children[0].layers),false);
  mirror.onBeforeRender(renderer,room.scene,room.camera);
  const reflected=mirror.getReflectionCamera(room.camera);
  assert.ok(Math.abs(reflected.position.x-(2*mirror.position.x-state.player.x))<1e-6);
  assert.ok(Math.abs(reflected.position.z+state.player.z)<1e-6);assert.equal(renders,1);assert.equal(other.visible,true);assert.equal(mirror.visible,true);assert.equal(target,null);
  state.player={x:5,z:2.7,angle:1};room.update(state);room.scene.updateMatrixWorld(true);mirror.onBeforeRender(renderer,room.scene,room.camera);
  assert.ok(Math.abs(reflected.position.x-(2*mirror.position.x-5))<1e-6);assert.ok(Math.abs(reflected.position.z+2.7)<1e-6);assert.equal(body.position.x,5);assert.equal(body.rotation.y,-1);assert.equal(body.children[0].geometry,geometry);
  let released=0;for(const current of [mirror,other])current.getRenderTarget().addEventListener('dispose',()=>released++);
  room.dispose();room.dispose();assert.equal(released,2);
});
