// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';

// Scene-owned artwork materials. Mesh clones can share the resulting geometry
// and materials; their owner releases these resources once on scene exit.
export function createThreeArtwork(){
  const images=new Map(),geometries=new Set();
  function material(image){
    let entry=images.get(image);
    if(!entry){
      const texture=new THREE.CanvasTexture(image);
      texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
      texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
      const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
      entry={texture,material};images.set(image,entry);
    }
    return entry.material;
  }
  function mesh(vertices,image){
    const geometry=new THREE.BufferGeometry(),indices=[];
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[p.x,p.y,-p.z]),3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap(p=>[(p.u??0)/image.width,1-(p.v??0)/image.height]),2));
    for(let i=1;i<vertices.length-1;i++)indices.push(0,i,i+1);
    geometry.setIndex(indices);geometry.computeBoundingSphere();geometries.add(geometry);
    return new THREE.Mesh(geometry,material(image));
  }
  return {mesh,dispose(){
    for(const geometry of geometries)geometry.dispose();geometries.clear();
    for(const {texture,material} of images.values()){texture.dispose();material.dispose();}images.clear();
  }};
}
