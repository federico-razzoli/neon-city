// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {drawStreetGround} from './street-ground.js';
import {drawParkBench,drawParkBush} from './parks.js?v=rive-gauche-6';
import {drawBridgeFascias,drawRiverStructures} from './rivers.js?v=parks-4';

// Static faces retain their exact colors and custom visibility normals. Some
// shrub normals intentionally differ from geometric normals, so GPU discard
// reproduces the old visibility rule instead of changing their silhouettes.
export function createThreeStaticScenery(scene,{boundsVisible}={}){
  const chunks=new Map();let disposed=false;
  function material(detail){
    const result=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false,polygonOffset:detail,polygonOffsetFactor:detail?-1:0,polygonOffsetUnits:detail?-1:0});
    result.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec3 sceneryPoint;\nattribute vec3 sceneryNormal;\nvarying float sceneryVisible;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 worldPoint=(modelMatrix*vec4(sceneryPoint,1.0)).xyz;
        vec3 worldNormal=mat3(modelMatrix)*sceneryNormal;
        sceneryVisible=dot(sceneryNormal,sceneryNormal)==0.0||dot(cameraPosition-worldPoint,worldNormal)>0.0?1.0:0.0;`);
      shader.fragmentShader='varying float sceneryVisible;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(sceneryVisible<0.5)discard;');
    };
    result.customProgramCacheKey=()=> 'static-scenery-visibility-v1';return result;
  }
  const groundMaterial=material(false),detailMaterial=material(true);
  function build(draw,detail){
    const positions=[],colors=[],points=[],normals=[],palette=new Map();
    const face=(vertices,tint,normal=null)=>{
      if(!palette.has(tint))palette.set(tint,new THREE.Color(tint));const color=palette.get(tint),first=vertices[0];
      for(let i=1;i<vertices.length-1;i++)for(const p of [first,vertices[i],vertices[i+1]]){
        positions.push(p.x,p.y,-p.z);colors.push(color.r,color.g,color.b);
        points.push(first.x,first.y,-first.z);normals.push(normal?.x??0,normal?.y??0,-(normal?.z??0));
      }
    };
    const quad=(x,y,z,w,d,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);
    draw({face,quad});
    const geometry=new THREE.BufferGeometry();
    for(const [name,values] of [['position',positions],['color',colors],['sceneryPoint',points],['sceneryNormal',normals]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,3));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,detail?detailMaterial:groundMaterial);mesh.matrixAutoUpdate=false;scene.add(mesh);return mesh;
  }
  function release(entry){for(const mesh of entry.meshes.values()){scene.remove(mesh);mesh.geometry.dispose();}}
  function draw(chunk,kind,generate,detail=false){
    const key=`${chunk.x},${chunk.z}`;let entry=chunks.get(key);
    if(entry&&(entry.park!==chunk.park||entry.riverStart!==chunk.riverStart)){release(entry);chunks.delete(key);entry=null;}
    if(!entry){entry={park:chunk.park,riverStart:chunk.riverStart,meshes:new Map()};chunks.set(key,entry);}
    let mesh=entry.meshes.get(kind);
    if(!mesh){mesh=build(generate,detail);mesh.name=`static-${kind}:${key}`;entry.meshes.set(kind,mesh);}
    const box=mesh.geometry.boundingBox;
    mesh.visible=!box.isEmpty()&&(!boundsVisible||boundsVisible(box.min.x,box.min.y,-box.max.z,box.max.x,box.max.y,-box.min.z));
  }
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].map(c=>`${c.x},${c.z}`));
      for(const [key,entry] of chunks){if(!loaded.has(key)){release(entry);chunks.delete(key);}else for(const mesh of entry.meshes.values())mesh.visible=false;}
    },
    drawGround(chunk){draw(chunk,'ground',helpers=>drawStreetGround(chunk,{...helpers,nativeFlowers:true}));},
    drawPark(chunk){draw(chunk,'park',({face})=>{for(const bench of chunk.park.benches)drawParkBench(bench,face);for(const bush of chunk.park.bushes??[])drawParkBush(bush,face);},true);},
    drawBridges(chunk){draw(chunk,'bridge',({face})=>{const helpers={face,faceNormals:true};drawBridgeFascias(chunk,helpers,null,true);drawRiverStructures(chunk,helpers,null);});},
    dispose(){if(disposed)return;disposed=true;for(const entry of chunks.values())release(entry);chunks.clear();groundMaterial.dispose();detailMaterial.dispose();}
  };
}
