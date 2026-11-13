import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasRenderer} from '../neon-city/canvas-renderer.js';
import {createRenderCamera,NATIVE_VIEW} from '../neon-city/render-camera.js';
import {createWorldScene} from '../neon-city/world-scene.js';
import {HOTEL_STORAGE} from '../neon-city/hotel-storage.js';

function canvasFixture(){
  const draws=[],transforms=[];
  const ctx={setTransform(...args){transforms.push(args);},drawImage(...args){draws.push(args);}};
  const canvas={width:640,height:360,clientWidth:1280,getContext:()=>ctx};
  return {canvas,ctx,draws,transforms};
}

test('Canvas projects and clips world-space submissions without mutating source points or UVs',()=>{
  const {canvas}=canvasFixture();
  const renderer=createCanvasRenderer(canvas,{width:32,height:20,focal:16,horizon:10,near:1,far:100});
  renderer.beginFrame({position:{x:10,z:20,angle:0},eye:2});
  const points=[{x:9,y:1,z:20.5,u:0,v:0},{x:11,y:1,z:22,u:8,v:0},
    {x:11,y:3,z:22,u:8,v:8},{x:9,y:3,z:20.5,u:0,v:8}];
  const original=structuredClone(points),texture={width:8,height:8};
  renderer.face(points,'#fff000',texture);
  const [face]=renderer.endPass();
  assert.deepEqual(points,original);
  assert.equal(face.texture,texture);
  assert.ok(face.vs.every(point=>point.z>=1));
  assert.ok(face.vs.some(point=>point.z===1&&Math.abs(point.u-8/3)<1e-12));
  assert.ok(face.ps.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
  renderer.beginFrame({position:{x:10,z:20,angle:Math.PI},eye:2});
  renderer.face(points,'#fff000',texture);
  assert.deepEqual(renderer.endPass(),[],'geometry behind the new camera is culled only by the backend');
});

test('submission styles are scoped, including after errors and across passes',()=>{
  const {canvas}=canvasFixture(),renderer=createCanvasRenderer(canvas);
  renderer.beginFrame({position:{x:0,z:0,angle:0},eye:1.65});
  const draw=()=>renderer.quad(-1,0,3,2,2,'#ffffff');
  renderer.withStyle({detail:true},()=>{
    draw();
    renderer.withStyle({textureSmooth:true},draw);
    draw();
  });
  assert.throws(()=>renderer.withStyle({groundTexture:true},()=>{throw new Error('failed scene');}));
  draw();
  const faces=renderer.endPass();
  assert.deepEqual(faces.map(f=>[!!f.detail,!!f.textureSmooth,!!f.groundTexture]),
    [[true,false,false],[true,true,false],[true,false,false],[false,false,false]]);
  assert.deepEqual(renderer.endPass(),[]);
});

test('world-space sprite operations reach Canvas drawing with the legacy dimensions and opacity',()=>{
  const {canvas,ctx,draws}=canvasFixture(),renderer=createCanvasRenderer(canvas);
  renderer.beginFrame({position:{x:0,z:0,angle:0},eye:1.65});
  const image={};
  renderer.billboard({position:{x:0,y:0,z:10},height:2,width:1,image});
  renderer.drawPass(renderer.endPass());
  assert.deepEqual(draws,[[image,302,152,36,71]]);
  assert.equal(ctx.globalAlpha,1);
  let resolved=0;
  renderer.billboard({position:{x:0,y:0,z:-10},height:2,width:1,getImage(){resolved++;return image;}});
  renderer.drawPass(renderer.endPass());
  assert.equal(resolved,0,'offscreen sprites do not generate artwork');
  renderer.billboard({position:{x:0,y:0,z:10},height:2,width:1,getImage(){resolved++;return image;}});
  assert.equal(resolved,0,'artwork resolution stays deferred until drawing');
  renderer.drawPass(renderer.endPass());
  assert.equal(resolved,1);
});

test('cabinet display scaling returns to the native world viewport',()=>{
  const {canvas,ctx,transforms}=canvasFixture(),renderer=createCanvasRenderer(canvas);
  const previous=globalThis.window;globalThis.window={devicePixelRatio:1};
  try{
    let drawn=false,synced=false;
    renderer.cabinet({kind:'byker',syncInput(surface,running){assert.equal(surface,canvas);assert.equal(running,true);synced=true;},draw(context){assert.equal(context,ctx);drawn=true;}},true);
    assert.equal(drawn&&synced,true);
    assert.equal(canvas.width,1280);assert.equal(canvas.height,720);
    renderer.beginFrame({position:{x:0,z:0,angle:0},eye:1.65});
    assert.equal(canvas.width,NATIVE_VIEW.width);assert.equal(canvas.height,NATIVE_VIEW.height);
    assert.equal(ctx.imageSmoothingEnabled,false);
    assert.deepEqual(transforms.at(-1),[1,0,0,1,0,0]);
  }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

function recordingBackend(){
  const commands=[];let style={};
  const backend={
    commands,beginFrame(view){commands.length=0;commands.push({kind:'camera',view});},beginPass(){},boundsVisible:()=>true,
    face(vertices,color,texture,smooth=false,buildingWall=false){commands.push({kind:'face',vertices:structuredClone(vertices),color,texture,smooth,buildingWall,...style});},
    quad(...args){commands.push({kind:'quad',args,...style});},box(...args){commands.push({kind:'box',args,...style});},
    withStyle(options,draw){const before=style;style={...style,...options};try{return draw();}finally{style=before;}},
    drawInterior(background){commands.push({kind:'interior',background});}
  };
  return backend;
}

test('storage construction works with a non-Canvas backend and includes shared state and dropped objects before clipping',()=>{
  const renderer=recordingBackend(),scene=createWorldScene(renderer,{seatedTexturePrewarmer:{add(){}}});
  const hotel={storageNoteTaken:false},player={...HOTEL_STORAGE.spawn};
  const room='14,14:hotel-storage',chunk={droppedItems:[]};
  const frame={player,eye:1.65,indoors:true,insideHotel:true,hotelStorage:true,currentHotel:hotel,
    hotelGuests:[],city:{chunks:new Map([['0,0',chunk]])},itemRoom:room};
  scene.render(frame);
  const initial=structuredClone(renderer.commands);
  assert.deepEqual(initial[0].view,{position:player,eye:1.65,pitch:0,indoors:true});
  assert.ok(initial.some(c=>c.kind==='face'&&c.vertices.some(v=>v.x===-40&&v.y===-20)),
    'offscreen window scenery reaches the backend in world coordinates');
  assert.ok(initial.some(c=>c.kind==='box'),'box dimensions are submitted without Canvas face culling');
  chunk.droppedItems.push({room,item:{id:'hotel-note'},x:1.2,z:-.5,ground:0,angle:0});
  chunk.droppedItems.push({room:'another room',item:{id:'hotel-note'},x:1.2,z:2,ground:0,angle:0});
  scene.render(frame);
  const dropped=renderer.commands.filter(c=>c.detail);
  assert.equal(dropped.length,5,'only the note in this room is submitted, even behind the camera');
  assert.ok(dropped.every(c=>c.vertices.every(v=>v.z<0)));
  hotel.storageNoteTaken=true;scene.render(frame);
  assert.equal(renderer.commands.length,initial.length+5-7,'collecting the wall note updates the same scene state');
  assert.deepEqual(player,HOTEL_STORAGE.spawn,'scene construction does not move the player');
});

test('near-plane clipping interpolates both UV coordinates and keeps input data intact',()=>{
  const camera=createRenderCamera({...NATIVE_VIEW,near:1});
  const points=[{x:-1,y:0,z:0,u:0,v:2},{x:1,y:0,z:2,u:8,v:6},{x:1,y:2,z:2,u:8,v:10}];
  const copy=structuredClone(points),clipped=camera.clip(points);
  assert.deepEqual(points,copy);
  assert.ok(clipped.some(v=>v.z===1&&v.u===4&&v.v===4));
  assert.ok(clipped.some(v=>v.z===1&&v.u===4&&v.v===6));
});
