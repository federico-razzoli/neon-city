// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WIDTH,BRIDGE_RISE,bridgeHeight,hasBridge,RIVER_STAIRS} from './world.js';

// Native Three.js geometry for every bank and bridge railing. Shared geometry
// and instancing keep the static railings on the GPU between frames.
export function createThreeRailings(scene){
  const cube=new THREE.BoxGeometry(1,1,1);
  const colors=['#89929d','#9ba6ab','#6e7d8a','#b0bac0','#8f9eab','#8594a2'];
  const materials=colors.map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  materials[4].side=THREE.DoubleSide;
  const upper=new THREE.BoxGeometry(.2,.14,RIVER_WIDTH,1,1,RIVER_WIDTH/2);
  const lower=new THREE.PlaneGeometry(.3,RIVER_WIDTH,1,RIVER_WIDTH/2);
  lower.rotateX(-Math.PI/2);
  for(const [geometry,elevation] of [[upper,1.12],[lower,.25]]){
    const vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const t=(RIVER_WIDTH/2-vertices.getZ(i))/RIVER_WIDTH;
      vertices.setY(i,vertices.getY(i)+elevation+(t>0&&t<1?BRIDGE_RISE*Math.sin(Math.PI*t):0));
    }
    vertices.needsUpdate=true;geometry.computeVertexNormals();
  }
  const parts=new Map(),transform=new THREE.Object3D();
  function boxes(group,name,color,items){
    const mesh=new THREE.InstancedMesh(cube,materials[color],items.length);mesh.name=name;
    for(let i=0;i<items.length;i++){
      const [x,y,z,w,h,d]=items[i];
      transform.position.set(x+w/2,y+h/2,-z-d/2);transform.scale.set(w,h,d);transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  function bank(group,chunk){
    const x=chunk.x*BLOCK,start=chunk.riverStart*BLOCK;
    const z=start+(chunk.z===chunk.riverStart?18:110);
    const left=hasBridge(chunk.x)?14:0,right=hasBridge(chunk.x+1)?50:BLOCK;
    const bases=[],rails=[],posts=[];
    const spans=hasBridge(chunk.x)?[[left,RIVER_STAIRS.landing],[RIVER_STAIRS.start,right]]:[[left,right]];
    for(const [from,to] of spans)for(let a=from;a<to;a+=6){
      const w=Math.min(6,to-a);
      bases.push([x+a,.06,z-.22,w,.2,.44]);
      rails.push([x+a,1.05,z-.09,w,.12,.18]);
      posts.push([x+a,.1,z-.1,.18,1,.2]);
    }
    boxes(group,'bank-railing-bases',0,bases);
    boxes(group,'bank-railing-top-rails',1,rails);
    boxes(group,'bank-railing-posts',2,posts);
  }
  function bridge(group,streetIndex,riverRow){
    const x=streetIndex*BLOCK,start=riverRow*BLOCK,posts=[];
    for(const dx of [-14,14]){
      for(const [geometry,color,name] of [[upper,3,'bridge-railing-top-rail'],[lower,4,'bridge-railing-lower-rail']]){
        const mesh=new THREE.Mesh(geometry,materials[color]);mesh.name=name;
        mesh.position.set(x+dx,0,-start-64);group.add(mesh);
      }
      for(let a=start+18;a<start+110;a+=4)
        posts.push([x+dx-.1,bridgeHeight(a)+.2,a,.2,1,.2]);
    }
    boxes(group,'bridge-railing-posts',5,posts);
  }
  function use(key,build){
    let entry=parts.get(key);
    if(!entry){
      const group=new THREE.Group();group.name=key;build(group);scene.add(group);
      entry={group,seen:true};parts.set(key,entry);
    }
    entry.seen=true;
  }
  function release(entry){
    scene.remove(entry.group);
    for(const mesh of entry.group.children)if(mesh.isInstancedMesh)mesh.dispose();
  }
  return {
    beginFrame(){for(const part of parts.values())part.seen=false;},
    draw(chunk){
      if(!chunk.river)return;
      use(`bank-railings:${chunk.x},${chunk.z}`,group=>bank(group,chunk));
      for(const streetIndex of [chunk.x,chunk.x+1])if(hasBridge(streetIndex))
        use(`bridge-railings:${streetIndex},${chunk.riverStart}`,group=>bridge(group,streetIndex,chunk.riverStart));
    },
    endFrame(){for(const [key,part] of parts)if(!part.seen){release(part);parts.delete(key);}},
    dispose(){
      for(const part of parts.values())release(part);parts.clear();
      cube.dispose();upper.dispose();lower.dispose();for(const material of materials)material.dispose();
    }
  };
}
