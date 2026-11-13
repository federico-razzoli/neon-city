// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {profilePhase} from './render-profile.js';
import {NATIVE_VIEW} from './render-camera.js';
import {createThreeStorageScene} from './three-storage-scene.js';
import {createThreeStairwellScene} from './three-stairwell-scene.js';
import {createThreeCorridorScene} from './three-corridor-scene.js';
import {createThreeArcadeScene} from './three-arcade-scene.js';
import {createThreeHallScene} from './three-hall-scene.js';

function createScene(destination,hotel,floor){
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
  let room=null,hotel=null,destination=null,floor=null;
  function leave(){if(!room)return;room.dispose();room=null;hotel=null;destination=null;floor=null;renderer.renderLists.dispose();}
  return {
    render(frame){
      const nextDestination=frame.insideArcade?'arcade':frame.hotelCorridor?'corridor':frame.hotelStorage?'storage':frame.hotelStairs?'stairs':'hotel';
      const nextHotel=nextDestination==='arcade'?frame.currentVenue:frame.currentHotel;
      const nextFloor=nextDestination==='corridor'?frame.hotelStairs.floor:null;
      if(!room||hotel!==nextHotel||destination!==nextDestination||floor!==nextFloor){
        leave();
        room=profilePhase('neon:three:geometry',()=>createScene(nextDestination,nextHotel,nextFloor));
        hotel=nextHotel;destination=nextDestination;floor=nextFloor;
      }
      profilePhase('neon:three:update',()=>room.update(frame));
      profilePhase('neon:three:render',()=>renderer.render(room.scene,room.camera));
    },
    leave,
    dispose(){leave();renderer.dispose();},
    get info(){return renderer.info;}
  };
}
