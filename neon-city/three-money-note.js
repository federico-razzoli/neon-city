// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {moneyNoteVertices,moneyNoteImage,MONEY_NOTE_TEXTURE,MONEY_NOTE_WIDTH,MONEY_NOTE_HEIGHT} from './money.js?v=hotel-cash-1';

// Reuse the decoded startup image while keeping texture disposal per mesh.
function noteTexture(url){
  const image=moneyNoteImage();
  if(image?.complete&&image.naturalWidth){
    const texture=new THREE.Texture(image);texture.needsUpdate=true;return texture;
  }
  return new THREE.TextureLoader().load(url);
}

// Street and stairwell notes share the original PNG artwork.
export function createThreeMoneyNote(note,{hotelTint=true,textureFor=noteTexture}={}){
  const vertices=moneyNoteVertices(note);
  const texture=textureFor(MONEY_NOTE_TEXTURE);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.x,p.y,-p.z]),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.u/MONEY_NOTE_WIDTH,1-p.v/MONEY_NOTE_HEIGHT]),2));
  geometry.setIndex([0,1,2,0,2,3]);geometry.computeBoundingSphere();
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false,
    polygonOffset:!hotelTint,polygonOffsetFactor:hotelTint?0:-1,polygonOffsetUnits:hotelTint?0:-1});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=hotelTint?'stairs-money':'street-money';
  let disposed=false;
  return {mesh,dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();texture.dispose();}};
}
