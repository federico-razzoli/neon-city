import test from 'node:test';
import assert from 'node:assert/strict';
import {createThreeLavatoryScene,createThreeCubicleScene} from '../neon-city/three-lavatory-scene.js';
import {LAVATORY,CUBICLE,drawLavatory,drawCubicle} from '../neon-city/lavatory.js';
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
  assert.equal([0,1].filter(i=>room.scene.getObjectByName(`lavatory-water-stream-${i}`).visible).length,0);
  const mirror=room.scene.getObjectByName('lavatory-mirror-0'),mirrorGeometry=mirror.geometry;
  state.player={x:6,z:2.35,angle:Math.PI/2};state.lavatoryTaps=[true,true];state.lavatoryOccupied[0]=true;room.update(state);
  assert.equal(room.scene.getObjectByName('lavatory-flag-0-engaged').visible,true);
  assert.equal([0,1].filter(i=>room.scene.getObjectByName(`lavatory-water-stream-${i}`).visible).length,2);
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
  const count=options=>{let boxes=0;drawLavatory({face(){boxes++;},quad(){},box(){boxes++;},...options});return boxes;};
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

test('sink water aligns with the taps, animates retained meshes and settles independently after shutoff',async()=>{
  const {createThreeSinkWater}=await import('../neon-city/three-sink-water.js');
  const {tapStream}=await import('../neon-city/lavatory.js');
  const water=createThreeSinkWater(LAVATORY.sinks),stream=water.group.getObjectByName('lavatory-water-stream-0'),basin=water.group.getObjectByName('lavatory-water-basin-0');
  const streamGeometry=stream.geometry,basinGeometry=basin.geometry,flow=tapStream(LAVATORY.sinks[0]);
  water.update([true,false],0);assert.equal(stream.visible,true);assert.equal(stream.position.x,flow.x);assert.equal(stream.position.z,-flow.z);
  assert.ok(Math.abs(stream.position.y+stream.scale.y/2-flow.top)<1e-9);
  assert.equal(stream.material.transparent,true);assert.equal(stream.material.depthWrite,false);assert.equal(basin.material.uniforms.activity.value,1);
  const second=water.group.getObjectByName('lavatory-water-basin-1');assert.equal(second.material.uniforms.activity.value,0);
  water.update([true,false],.4);assert.ok(stream.material.uniforms.time.value>0);assert.equal(stream.geometry,streamGeometry);assert.equal(basin.geometry,basinGeometry);
  const drop=water.group.getObjectByName('lavatory-water-drop-0-0');assert.equal(drop.visible,true);
  assert.ok(drop.position.y>.942&&drop.position.y<1.08);
  water.update([false,true],.5);assert.equal(stream.visible,false);assert.ok(basin.material.uniforms.activity.value>0&&basin.material.uniforms.activity.value<1);
  water.update([false,true],1.1);assert.equal(drop.visible,false);assert.ok(basin.material.uniforms.activity.value>0);
  const activity=basin.material.uniforms.activity.value,time=basin.material.uniforms.time.value;
  water.update([false,true],20,false);assert.equal(basin.material.uniforms.activity.value,activity);assert.equal(basin.material.uniforms.time.value,time);
  water.update([false,true],22);assert.equal(basin.material.uniforms.activity.value,0);assert.equal(second.material.uniforms.activity.value,1);
  assert.equal(basin.visible,true);assert.equal(stream.geometry,streamGeometry);water.dispose();
});

test('every lavatory and cubicle doorway has full coverage without overlapping wall or decoration faces',()=>{
  for(const [draw,doors] of [
    [drawLavatory,[LAVATORY.door,...LAVATORY.cubicles.map(c=>({...c,z:LAVATORY.depth}))]],
    [drawCubicle,[CUBICLE.door]]
  ]){
    const faces=[];draw({face:points=>faces.push(points),quad(){},box(){}});
    for(const door of doors){
      const left=door.x-door.halfWidth-.08,right=door.x+door.halfWidth+.08;
      const panels=faces.filter(ps=>ps.every(p=>Math.abs(p.z-door.z)<1e-10)).map(ps=>({
        x0:Math.max(left,Math.min(...ps.map(p=>p.x))),x1:Math.min(right,Math.max(...ps.map(p=>p.x))),
        y0:Math.max(0,Math.min(...ps.map(p=>p.y))),y1:Math.min(2.3,Math.max(...ps.map(p=>p.y)))
      })).filter(p=>p.x1-p.x0>1e-10&&p.y1-p.y0>1e-10);
      const area=panels.reduce((sum,p)=>sum+(p.x1-p.x0)*(p.y1-p.y0),0);
      assert.ok(Math.abs(area-(right-left)*2.3)<1e-9,`door at ${door.x},${door.z} must fill its opening once`);
      for(let i=0;i<panels.length;i++)for(const b of panels.slice(i+1)){
        const a=panels[i];
        assert.ok(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)<1e-10||Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)<1e-10,'wall, frame, leaf and markings must not overlap');
      }
    }
  }
});
