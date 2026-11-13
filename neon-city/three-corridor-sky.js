// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {NATIVE_VIEW} from './render-camera.js';
import {starProjector} from './sky.js?v=stars-2';

// Reuse the pixel sky artwork as a scene background. All world geometry stays
// in WebGL, so walls, casements and street objects naturally occlude this image.
export function createCorridorSky(scene){
  const canvas=document.createElement('canvas');canvas.width=NATIVE_VIEW.width;canvas.height=NATIVE_VIEW.height;
  const context=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;scene.background=texture;
  let previousKey,previousField,previousStar;
  return {
    update(frame){
      const view=frame.skyView,star=frame.shootingStars.star;
      const key=`${view.angle}:${view.pitch}:${star?.age}`;
      if(key===previousKey&&frame.starfield===previousField&&star===previousStar)return;
      previousKey=key;previousField=frame.starfield;previousStar=star;
      context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
      const project=starProjector(view.angle,view.width,view.focal,view.horizon,view.pitch);
      for(const star of frame.starfield){
        const point=project(star);if(!point)continue;
        context.fillStyle=star.color??'#3b344e';context.fillRect(Math.floor(point.x),Math.floor(point.y),1,1);
      }
      frame.shootingStars.draw(context,view);texture.needsUpdate=true;
    },
    dispose(){scene.background=null;texture.dispose();}
  };
}
