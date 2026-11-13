// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {profilePhase} from './render-profile.js';
import {NATIVE_VIEW} from './render-camera.js';
import {createThreeStorageScene} from './three-storage-scene.js';

export function createThreeStorageRenderer(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
  renderer.setPixelRatio(1);renderer.setSize(NATIVE_VIEW.width,NATIVE_VIEW.height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  let room=null,hotel=null;
  function leave(){if(!room)return;room.dispose();room=null;hotel=null;renderer.renderLists.dispose();}
  return {
    render(frame){
      if(!room||hotel!==frame.currentHotel){leave();room=profilePhase('neon:three:geometry',()=>createThreeStorageScene());hotel=frame.currentHotel;}
      profilePhase('neon:three:update',()=>room.update(frame));
      profilePhase('neon:three:render',()=>renderer.render(room.scene,room.camera));
    },
    leave,
    dispose(){leave();renderer.dispose();},
    get info(){return renderer.info;}
  };
}
