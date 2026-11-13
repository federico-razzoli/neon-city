// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawMoneyNote} from './money.js?v=hotel-cash-1';

// Preserve source UVs and the software renderer's compensation for the hotel
// overlay, so the banknote retains the same colors as its outdoor counterpart.
export function createThreeMoneyNote(note){
  let vertices,artwork;
  drawMoneyNote({...note,taken:false},(points,color,texture)=>{vertices=points;artwork=texture;});
  const canvas=document.createElement('canvas');canvas.width=artwork.width;canvas.height=artwork.height;
  const context=canvas.getContext('2d');context.drawImage(artwork,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),shade=[9,7,21],alpha=.2;
  for(let i=0;i<pixels.data.length;i+=4)for(let channel=0;channel<3;channel++){
    pixels.data[i+channel]=(pixels.data[i+channel]-alpha*shade[channel])/(1-alpha);
  }
  context.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
  texture.generateMipmaps=false;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.x,p.y,-p.z]),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.u/artwork.width,1-p.v/artwork.height]),2));
  geometry.setIndex([0,1,2,0,2,3]);geometry.computeBoundingSphere();
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='stairs-money';
  return {mesh,dispose(){geometry.dispose();material.dispose();texture.dispose();}};
}
