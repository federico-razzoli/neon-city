// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeLavatorySpatial} from './three-lavatory-spatial.js';
import {createThreeBookshopSpatial} from './three-bookshop-spatial.js';
import {createThreePubSpatial} from './three-pub-spatial.js';
import {profilePhase} from './render-profile.js';
import {NATIVE_VIEW} from './render-camera.js';
import {createThreeStorageScene} from './three-storage-scene.js';
import {createThreeStairwellScene} from './three-stairwell-scene.js';
import {createThreeCorridorScene} from './three-corridor-scene.js';
import {createThreeArcadeScene} from './three-arcade-scene.js';
import {createThreeBookshopScene} from './three-bookshop-scene.js';
import {createThreePubScene} from './three-pub-scene.js';
import {createThreeLavatoryScene,createThreeCubicleScene} from './three-lavatory-scene.js';
import {createThreeHallScene} from './three-hall-scene.js';

function createScene(destination,hotel,floor){
  if(destination==='lavatory')return createThreeLavatoryScene();
  if(destination==='cubicle')return createThreeCubicleScene();
  if(destination==='pub')return createThreePubScene();
  if(destination==='bookshop')return createThreeBookshopScene();
  if(destination==='arcade')return createThreeArcadeScene();
  if(destination==='hotel')return createThreeHallScene(hotel);
  if(destination==='corridor')return createThreeCorridorScene(hotel,floor);
  if(destination==='storage')return createThreeStorageScene();
  return createThreeStairwellScene(hotel);
}

export function createThreeHotelRenderer(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
  renderer.setPixelRatio(1);renderer.setSize(NATIVE_VIEW.width,NATIVE_VIEW.height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  let bookshopSpatial=null,pubSpatial=null,lavatorySpatial=null,cubicleSpatial=null;
  let room=null,hotel=null,destination=null,floor=null;
  function leave(){bookshopSpatial?.dispose();bookshopSpatial=null;pubSpatial?.dispose();lavatorySpatial?.dispose();cubicleSpatial?.dispose();pubSpatial=lavatorySpatial=cubicleSpatial=null;if(!room)return;room.dispose();room=null;hotel=null;destination=null;floor=null;renderer.renderLists.dispose();}
  return {
    get lavatorySpatial(){return lavatorySpatial??=createThreeLavatorySpatial();},
    get cubicleSpatial(){return cubicleSpatial??=createThreeLavatorySpatial('cubicle');},
    get bookshopSpatial(){return bookshopSpatial??=createThreeBookshopSpatial();},
    get pubSpatial(){return pubSpatial??=createThreePubSpatial();},
    render(frame){
      const nextDestination=frame.insideCubicle?'cubicle':frame.insideLavatory?'lavatory':frame.insidePub?'pub':frame.insideBookshop?'bookshop':frame.insideArcade?'arcade':frame.hotelCorridor?'corridor':frame.hotelStorage?'storage':frame.hotelStairs?'stairs':'hotel';
      const nextHotel=['arcade','bookshop','pub','lavatory','cubicle'].includes(nextDestination)?frame.currentVenue:frame.currentHotel;
      const nextFloor=nextDestination==='corridor'?frame.hotelStairs.floor:null;
      if(!room||hotel!==nextHotel||destination!==nextDestination||floor!==nextFloor){
        leave();
        room=profilePhase('neon:three:geometry',()=>createScene(nextDestination,nextHotel,nextFloor));
        hotel=nextHotel;destination=nextDestination;floor=nextFloor;
      }
      profilePhase('neon:three:update',()=>room.update(frame));
      profilePhase('neon:three:render',()=>{
        renderer.render(room.scene,room.camera);room.renderOverlay?.(renderer,frame);
      });
    },
    leave,
    dispose(){leave();renderer.dispose();},
    get info(){return renderer.info;}
  };
}
