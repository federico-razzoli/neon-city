// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';

export function createThreeCarriedIceCreams(scene){
  const assets=new Map(),meshes=[],material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  let count=0;
  function geometry(stage,flavour){
    const key=`${stage}:${stage==='cone'?0:flavour}`;
    if(assets.has(key))return assets.get(key);
    const positions=[],colors=[];
    function add(source,y,tint){
      const p=source.attributes.position,index=source.index,color=new THREE.Color(tint);
      for(let i=0;i<(index?.count??p.count);i++){
        const j=index?index.getX(i):i;positions.push(p.getX(j),p.getY(j)+y,p.getZ(j));colors.push(color.r,color.g,color.b);
      }
      source.dispose();
    }
    const cone=new THREE.ConeGeometry(.075,.21,10);cone.rotateX(Math.PI);add(cone,.105,'#d3a36b');
    if(stage!=='cone'){
      const tint=['#ed9eb7','#fff0cd','#78513c'][flavour%3];
      if(stage==='full')add(new THREE.SphereGeometry(.1,10,8),.24,tint);
      else{
        const scoop=new THREE.SphereGeometry(.1,10,8,0,Math.PI*2,.95,Math.PI-.95);add(scoop,.24,tint);
        const cap=new THREE.CircleGeometry(Math.sin(.95)*.1,10);cap.rotateX(-Math.PI/2);add(cap,.24+Math.cos(.95)*.1,tint);
      }
    }
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));result.computeBoundingSphere();assets.set(key,result);return result;
  }
  return {beginFrame(){count=0;},draw({position,height,width,stage,flavour=0,angle,back=false}){
    if(!stage||back)return;
    let mesh=meshes[count];
    if(!mesh){mesh=new THREE.Mesh(undefined,material);mesh.name='pedestrian-ice-cream';scene.add(mesh);meshes.push(mesh);}
    count++;mesh.geometry=geometry(stage,flavour);mesh.visible=true;
    const hand=width*.36;
    mesh.position.set(position.x+Math.cos(angle)*hand,position.y+height*.43,-position.z+Math.sin(angle)*hand);
  },endFrame(){for(let i=count;i<meshes.length;i++)meshes[i].visible=false;},dispose(){
    for(const mesh of meshes)scene.remove(mesh);meshes.length=0;
    for(const g of assets.values())g.dispose();assets.clear();material.dispose();
  }};
}
