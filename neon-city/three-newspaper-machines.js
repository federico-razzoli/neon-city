// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {newspaperGeometry} from './newspaper-geometry.js';
import {NEWSPAPER_LOOKS,newspaperTexture} from './newspaper-artwork.js';
import {createStaticInstances} from './three-static-instances.js';

export function createThreeNewspaperMachines(scene,{boundsVisible,textureFor=newspaperTexture}={}){
  let disposed=false;
  const models=new Map(),artwork=new Map();
  const dimensions=m=>m.side<2?[m.w,m.d]:[m.d,m.w];
  const keyFor=m=>`${dimensions(m).join(':')}:${m.paper??'DAILY BUGLE'}`;
  function assetFor(machine){
    const key=keyFor(machine);if(models.has(key))return models.get(key);
    const [w,d]=dimensions(machine),source=newspaperGeometry({side:0,w,d}),paper=machine.paper??'DAILY BUGLE';
    const look=NEWSPAPER_LOOKS[paper]??NEWSPAPER_LOOKS['DAILY BUGLE'];
    function build(first,last){
      const positions=[],colors=[],uvs=[];
      for(let face=first;face<last;face++){
        const points=Array.from({length:4},(_,i)=>{const k=(face*4+i)*5;return new THREE.Vector3(source[k],source[k+1],-source[k+2]);});
        const normal=face===10?new THREE.Vector3(0,0,1):[new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)][face%5];
        const tint=new THREE.Color(face<5?look.body[face%5===4?1:0]:look.cap[face%5===4?1:0]);
        for(let i=1;i<3;i++){
          const indices=[0,i,i+1];
          if(new THREE.Vector3().subVectors(points[i],points[0]).cross(new THREE.Vector3().subVectors(points[i+1],points[0])).dot(normal)<0)[indices[1],indices[2]]=[indices[2],indices[1]];
          for(const index of indices){const p=points[index],k=(face*4+index)*5;positions.push(p.x,p.y,p.z);colors.push(tint.r,tint.g,tint.b);uvs.push(source[k+3]/160,1-source[k+4]/224);}
        }
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      if(first===10)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));else geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geometry.computeBoundingSphere();return geometry;
    }
    let front=artwork.get(paper);
    if(!front){
      const texture=new THREE.CanvasTexture(textureFor(paper));texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
      const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.05,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});front={texture,material};artwork.set(paper,front);
    }
    const body=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const parts=[{geometry:build(0,10),material:body},{geometry:build(10,11),material:front.material}];models.set(key,parts);return parts;
  }
  const batches=createStaticInstances(scene,{name:'newspaper-machines',boundsVisible,
    stateFor:m=>[m.x,m.z,m.w,m.d,m.side,m.paper],keyFor,assetFor,
    matrixFor(m,matrix){matrix.makeRotationY([0,Math.PI,-Math.PI/2,Math.PI/2][m.side]);matrix.setPosition(m.x,0,-m.z);}
  });
  return {beginFrame:frame=>batches.beginFrame(frame),draw:chunk=>batches.draw(chunk,chunk.newspaperMachines??[]),dispose(){
    if(disposed)return;disposed=true;
    batches.dispose();for(const parts of models.values()){for(const part of parts)part.geometry.dispose();parts[0].material.dispose();}models.clear();
    for(const {texture,material} of artwork.values()){texture.dispose();material.dispose();}artwork.clear();
  }};
}
