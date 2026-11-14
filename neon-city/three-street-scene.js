// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeTraffic} from './three-cars.js';
import {createThreeRailings} from './three-railings.js';
import {createThreeRoads} from './three-roads.js';
import {createThreeRiverWater} from './three-river-water.js';
import {createWorldScene} from './world-scene.js';
import {createInteriorCamera,updateInteriorCamera} from './three-interior-scene.js';
import {createCorridorSky} from './three-corridor-sky.js';
import {createRenderCamera} from './render-camera.js';

// The shared street traversal submits world coordinates directly to WebGL.
// Batch faces by artwork/color and retain GPU buffers across frames.
export function createThreeStreetScene(){
  const scene=new THREE.Scene(),camera=createInteriorCamera(),culling=createRenderCamera();
  scene.fog=new THREE.Fog('#0f0a1e',22,170);
  const sky=createCorridorSky(scene),roads=createThreeRoads(scene),railings=createThreeRailings(scene),traffic=createThreeTraffic(scene),batches=new Map();
  const water=createThreeRiverWater(scene);
  let style={},view;
  function batch(color,image,smooth){
    const key=image??color;
    let value=batches.get(key);
    if(!value){
      const texture=image?new THREE.CanvasTexture(image):null;
      if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=smooth?THREE.LinearFilter:THREE.NearestFilter;texture.minFilter=smooth?THREE.LinearMipmapLinearFilter:THREE.NearestFilter;texture.generateMipmaps=!!smooth;}
      const material=new THREE.MeshBasicMaterial({color:image?'#ffffff':color,map:texture,side:THREE.DoubleSide,alphaTest:image?0.05:0,toneMapped:false,polygonOffset:!!style.detail,polygonOffsetFactor:style.detail?-1:0,polygonOffsetUnits:style.detail?-1:0});
      const geometry=new THREE.BufferGeometry(),mesh=new THREE.Mesh(geometry,material);
      mesh.frustumCulled=false;scene.add(mesh);
      value={geometry,material,texture,positions:[],uvs:[],mesh};batches.set(key,value);
    }
    return value;
  }
  function face(vertices,color,image,smooth=false){
    if(vertices.length<3)return;
    const b=batch(color,image,smooth||style.textureSmooth);
    for(let i=1;i<vertices.length-1;i++)for(const p of [vertices[0],vertices[i],vertices[i+1]]){
      b.positions.push(p.x,p.y,-p.z);
      b.uvs.push(image?(p.u??0)/image.width:0,image?1-(p.v??0)/image.height:0);
    }
  }
  function quad(x,y,z,w,d,color){face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);}
  function box(x,y,z,w,h,d,color,roof=color){
    const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d},up=p=>({...p,y:y+h});
    face([a,b,up(b),up(a)],color);face([c,e,up(e),up(c)],color);
    face([e,a,up(a),up(e)],color);face([b,c,up(c),up(b)],color);
    face([up(a),up(b),up(c),up(e)],roof);face([e,c,b,a],color);
  }
  const backend={face,quad,box,drawWater:chunk=>water.draw(chunk),drawCar:(car,surface)=>traffic.draw(car,surface),drawRoad:chunk=>roads.draw(chunk),drawRailings:chunk=>railings.draw(chunk),boundsVisible:(...args)=>culling.boundsVisible(...args),
    beginFrame(next){view=next;culling.set(next);updateInteriorCamera(camera,next);for(const b of batches.values()){b.positions.length=0;b.uvs.length=0;}},
    withStyle(next,draw){const old=style;style={...style,...next};try{return draw();}finally{style=old;}},
    beginPass(){},endPass(){return [];},drawPass(){},drawSky(){},finishStreet(){},
    billboard({position:p,height,width,image,getImage}){
      const v=culling.transform(p);if(v.z<.3||v.z>105)return;
      image??=getImage();
      const dx=Math.cos(view.position.angle)*width/2,dz=-Math.sin(view.position.angle)*width/2;
      face([{x:p.x-dx,y:p.y,z:p.z-dz,u:0,v:image.height},{x:p.x+dx,y:p.y,z:p.z+dz,u:image.width,v:image.height},{x:p.x+dx,y:p.y+height,z:p.z+dz,u:image.width,v:0},{x:p.x-dx,y:p.y+height,z:p.z-dz,u:0,v:0}],'#ffffff',image);
    }
  };
  const world=createWorldScene(backend);
  function upload(geometry,name,values,size){
    let attribute=geometry.getAttribute(name);
    if(!attribute||attribute.array.length<values.length){
      geometry.dispose();
      const capacity=Math.ceil(Math.max(values.length,attribute?.array.length*2||256)/size)*size;
      attribute=new THREE.BufferAttribute(new Float32Array(capacity),size);
      attribute.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,attribute);
    }
    attribute.array.set(values);attribute.needsUpdate=true;
  }
  return {scene,camera,update(frame){
    water.beginFrame(frame);roads.beginFrame();railings.beginFrame();traffic.beginFrame();sky.update(frame);world.render(frame);roads.endFrame();railings.endFrame();traffic.endFrame();water.endFrame();
    for(const [key,b] of batches){
      if(!b.positions.length){scene.remove(b.mesh);b.geometry.dispose();b.material.dispose();b.texture?.dispose();batches.delete(key);continue;}
      upload(b.geometry,'position',b.positions,3);upload(b.geometry,'uv',b.uvs,2);
      b.geometry.setDrawRange(0,b.positions.length/3);
    }
  },dispose(){water.dispose();traffic.dispose();roads.dispose();railings.dispose();sky.dispose();for(const b of batches.values()){b.geometry.dispose();b.material.dispose();b.texture?.dispose();}batches.clear();scene.clear();}};
}
