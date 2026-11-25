// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {carriedIceCreamStage} from './carried-ice-cream.js';
import {createThreeCarriedIceCreams} from './three-carried-ice-creams.js';
import {createThreeLavatorySpatial} from './three-lavatory-spatial.js';
import {createThreeBookshopSpatial} from './three-bookshop-spatial.js';
import {createThreePubSpatial} from './three-pub-spatial.js';
import {profilePhase} from './render-profile.js';
import {NATIVE_VIEW,OVERLAY_DIM} from './render-camera.js';
import {createThreeStorageScene} from './three-storage-scene.js';
import {createThreeStairwellScene} from './three-stairwell-scene.js';
import {createThreeCorridorScene} from './three-corridor-scene.js';
import {createThreeArcadeScene} from './three-arcade-scene.js';
import {createThreeBookshopScene} from './three-bookshop-scene.js';
import {createThreePubScene} from './three-pub-scene.js';
import {createThreeLavatoryScene,createThreeCubicleScene} from './three-lavatory-scene.js';
import {createThreeHallScene} from './three-hall-scene.js';

import {createThreeStreetScene} from './three-street-scene.js';

// Venues opt into one-way street ownership by registering their scene factory.
const streetWindowVenues=new Map([['bookshop',createThreeBookshopScene]]);

function createScene(destination,hotel,floor,streetScene){
  const windowVenue=streetWindowVenues.get(destination);
  if(windowVenue)return windowVenue({streetScene});
  if(destination==='street')return createThreeStreetScene();
  if(destination==='lavatory')return createThreeLavatoryScene();
  if(destination==='cubicle')return createThreeCubicleScene();
  if(destination==='pub')return createThreePubScene();
  if(destination==='arcade')return createThreeArcadeScene();
  if(destination==='hotel')return createThreeHallScene(hotel);
  if(destination==='corridor')return createThreeCorridorScene(hotel,floor);
  if(destination==='storage')return createThreeStorageScene();
  return createThreeStairwellScene(hotel);
}

export function createThreeHotelRenderer(canvas,{createRenderer=options=>new THREE.WebGLRenderer(options),sceneFor=createScene}={}){
  const renderer=createRenderer({canvas,antialias:false,alpha:false});
  renderer.localClippingEnabled=true;
  renderer.setPixelRatio(1);renderer.setSize(NATIVE_VIEW.width,NATIVE_VIEW.height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  // Composite the former CSS hotel shade over the completed 3D view.
  const shadeScene=new THREE.Scene();
  const shadeCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);shadeCamera.position.z=1;
  const shadeGeometry=new THREE.PlaneGeometry(2,2);
  const shadeMaterial=new THREE.MeshBasicMaterial({color:0x090715,opacity:.2,transparent:true,
    depthTest:false,depthWrite:false,toneMapped:false});
  const shade=new THREE.Mesh(shadeGeometry,shadeMaterial);shade.name='hotel-shade';shadeScene.add(shade);
  // Title and pause screens dim the frozen view with a left-to-right fade.
  const dimScene=new THREE.Scene();
  const dimGeometry=new THREE.PlaneGeometry(2,2);
  const edges=dimGeometry.attributes.position.array;
  dimGeometry.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:edges.length/3},(_,i)=>[1,1,1,edges[i*3]<0?OVERLAY_DIM.left:OVERLAY_DIM.right]).flat(),4));
  const dimMaterial=new THREE.MeshBasicMaterial({color:OVERLAY_DIM.color,vertexColors:true,transparent:true,
    depthTest:false,depthWrite:false,toneMapped:false});
  const dim=new THREE.Mesh(dimGeometry,dimMaterial);dim.name='overlay-dim';dimScene.add(dim);
  const heldScene=new THREE.Scene(),heldCones=createThreeCarriedIceCreams(heldScene);
  const aspect=NATIVE_VIEW.width/NATIVE_VIEW.height;
  const heldCamera=new THREE.OrthographicCamera(-aspect/2,aspect/2,.5,-.5,.01,2);
  heldCamera.position.z=1;
  function composite(scene,camera=shadeCamera){
    const autoClear=renderer.autoClear;renderer.autoClear=false;
    try{renderer.render(scene,camera);}finally{renderer.autoClear=autoClear;}
  }
  let bookshopSpatial=null,pubSpatial=null,lavatorySpatial=null,cubicleSpatial=null;
  let room=null,hotel=null,destination=null,floor=null;
  function leave(){bookshopSpatial?.dispose();bookshopSpatial=null;pubSpatial?.dispose();lavatorySpatial?.dispose();cubicleSpatial?.dispose();pubSpatial=lavatorySpatial=cubicleSpatial=null;if(!room)return;room.dispose();room=null;hotel=null;destination=null;floor=null;renderer.renderLists.dispose();}
  return {
    get lavatorySpatial(){return lavatorySpatial??=createThreeLavatorySpatial();},
    get cubicleSpatial(){return cubicleSpatial??=createThreeLavatorySpatial('cubicle');},
    get bookshopSpatial(){return bookshopSpatial??=createThreeBookshopSpatial();},
    get pubSpatial(){return pubSpatial??=createThreePubSpatial();},
    hitsBenchFace(x,y){return destination==='street'&&room.hitsBenchFace(x,y);},
    render(frame){
      const nextDestination=!frame.indoors?'street':frame.insideCubicle?'cubicle':frame.insideLavatory?'lavatory':frame.insidePub?'pub':frame.insideBookshop?'bookshop':frame.insideArcade?'arcade':frame.hotelCorridor?'corridor':frame.hotelStorage?'storage':frame.hotelStairs?'stairs':'hotel';
      const nextHotel=nextDestination==='street'?null:['arcade','bookshop','pub','lavatory','cubicle'].includes(nextDestination)?frame.currentVenue:frame.currentHotel;
      const nextFloor=nextDestination==='corridor'?frame.hotelStairs.floor:null;
      if(!room||hotel!==nextHotel||destination!==nextDestination||floor!==nextFloor){
        // Registered window venues inherit outdoor resources. Their extras
        // dispose them with the interior on departure; nothing flows back.
        const streetScene=destination==='street'&&streetWindowVenues.has(nextDestination)?room:null;
        if(streetScene)room=null;
        leave();
        room=profilePhase('neon:three:geometry',()=>sceneFor(nextDestination,nextHotel,nextFloor,streetScene));
        hotel=nextHotel;destination=nextDestination;floor=nextFloor;
        room.prepare?.(renderer,frame);
      }
      profilePhase('neon:three:update',()=>room.update(frame));
      profilePhase('neon:three:render',()=>{
        renderer.render(room.scene,room.camera);room.renderOverlay?.(renderer,frame);
        const stage=carriedIceCreamStage(frame.player.iceCream);
        if(stage){
          heldCones.beginFrame();
          heldCones.drawHeld(stage,frame.player.iceCream.flavour);
          renderer.clearDepth();
          composite(heldScene,heldCamera);
        }
        if(['hotel','stairs','corridor','storage'].includes(destination))composite(shadeScene);
        if(frame.dimmed)composite(dimScene);
      });
    },
    leave,
    dispose(){leave();heldCones.dispose();shadeGeometry.dispose();shadeMaterial.dispose();dimGeometry.dispose();dimMaterial.dispose();renderer.dispose();},
    get info(){return renderer.info;}
  };
}
