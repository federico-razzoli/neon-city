// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {buildingTemplate} from './building-geometry.js';

// Artwork differs by building, while all wall sides share four unit meshes.
// The GPU handles projection and back-face culling; transforms and vertex/UV
// buffers are retained until the building unloads or the street scene closes.
export function createThreeBuildings(scene,{boundsVisible}={}){
  const models=new Map(),buildings=new Map();let disposed=false;
  function geometry(side){
    if(models.has(side))return models.get(side);
    const source=buildingTemplate(),positions=[],uvs=[];
    const normal=[new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1),new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0)][side];
    for(let panel=0;panel<8;panel++){
      const points=Array.from({length:4},(_,i)=>{const k=((side*8+panel)*4+i)*5;return new THREE.Vector3(source[k],source[k+1],-source[k+2]);});
      for(let i=1;i<3;i++){
        const indices=[0,i,i+1];
        if(new THREE.Vector3().subVectors(points[i],points[0]).cross(new THREE.Vector3().subVectors(points[i+1],points[0])).dot(normal)<0)[indices[1],indices[2]]=[indices[2],indices[1]];
        for(const index of indices){const p=points[index],k=((side*8+panel)*4+index)*5;positions.push(p.x,p.y,p.z);uvs.push(source[k+3]/160,1-source[k+4]);}
      }
    }
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    result.computeBoundingSphere();models.set(side,result);return result;
  }
  function release(entry){scene.remove(entry.group);for(const {texture,material} of entry.artwork.values()){texture.dispose();material.dispose();}}
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].flatMap(chunk=>chunk.buildings??[]));
      for(const [building,entry] of buildings){if(!loaded.has(building)){release(entry);buildings.delete(building);}else entry.group.visible=false;}
    },
    draw(building,imageFor,viewer){
      const {x,z,w,d,h}=building;
      // Redundant: world-scene.js already applies the same bounds check before calling draw.
      // if(boundsVisible&&!boundsVisible(x,0,z,x+w,h,z+d))return;
      let entry=buildings.get(building);
      if(!entry){
        const group=new THREE.Group();group.name=`building:${x},${z}`;group.matrixAutoUpdate=false;scene.add(group);
        entry={group,walls:new Map(),artwork:new Map(),transform:null};buildings.set(building,entry);
      }
      const transform=[x,z,w,d,h];
      if(!entry.transform||transform.some((value,i)=>value!==entry.transform[i])){
        entry.group.position.set(x,0,-z);entry.group.scale.set(w,h,d);entry.group.updateMatrix();entry.transform=transform;
      }
      entry.group.visible=true;
      // Keep side-level visibility checks to avoid empty draw calls and lazy
      // artwork requests. Individual panels stay on the GPU for face culling.
      const visible=[viewer.z<z,viewer.z>z+d,viewer.x<x,viewer.x>x+w];
      for(const [side,mesh] of entry.walls)mesh.visible=visible[side];
      for(let side=0;side<4;side++)if(visible[side]){
        const image=imageFor(side);let artwork=entry.artwork.get(image);
        if(!artwork){
          const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
          const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.05,toneMapped:false});
          artwork={texture,material};entry.artwork.set(image,artwork);
        }
        let mesh=entry.walls.get(side);
        if(!mesh){mesh=new THREE.Mesh(geometry(side),artwork.material);mesh.name=`building-wall:${side}`;mesh.matrixAutoUpdate=false;entry.walls.set(side,mesh);entry.group.add(mesh);}
        mesh.material=artwork.material;mesh.visible=true;
      }
    },
    dispose(){
      if(disposed)return;disposed=true;
      for(const entry of buildings.values())release(entry);buildings.clear();for(const model of models.values())model.dispose();models.clear();
    }
  };
}
