import {createThreeCarriedIceCreams} from './three-carried-ice-creams.js';
// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {isSignArtwork} from './sign-artwork.js';
import {sharpenSignSampling} from './sign-texture-filter.js';
import {createThreeMoneyNote} from './three-money-note.js';
import {createThreeCharacterCards} from './three-character-cards.js';
import {createThreeFingerposts} from './three-fingerposts.js';
import {createThreeRetainingWalls} from './three-retaining-walls.js';
import {createThreeManholes} from './three-manholes.js';
import {createThreePineCones} from './three-pine-cones.js';
import {createThreeFlowers} from './three-flowers.js';
import {createThreeIceCreamVans} from './three-ice-cream-vans.js';
import {createThreeNewspaperMachines} from './three-newspaper-machines.js';
import {createThreeStaticScenery} from './three-static-scenery.js';
import {createThreeBuildings} from './three-buildings.js';
import {createThreeTrees} from './three-trees.js';
import {createThreeTraffic} from './three-cars.js';
import {createThreeRailings} from './three-railings.js';
import {createThreeRoads} from './three-roads.js';
import {createThreeRiverWater} from './three-river-water.js';
import {createThreeRiverWalks} from './three-river-walks.js';
import {createWorldScene} from './world-scene.js';
import {createInteriorCamera,updateInteriorCamera} from './three-interior-scene.js';
import {createCorridorSky} from './three-corridor-sky.js';
import {createRenderCamera} from './render-camera.js';

// The shared street traversal submits world coordinates directly to WebGL.
// Batch faces by artwork/color and retain GPU buffers across frames.
export function createThreeStreetScene({boundsVisible:exteriorVisible}={}){
  let exteriorFilter=exteriorVisible;
  exteriorVisible=(...bounds)=>!exteriorFilter||exteriorFilter(...bounds);
  const scene=new THREE.Scene(),camera=createInteriorCamera(),culling=createRenderCamera();
  scene.fog=new THREE.Fog('#0f0a1e',22,170);
  const sky=createCorridorSky(scene),roads=createThreeRoads(scene),railings=createThreeRailings(scene),traffic=createThreeTraffic(scene),batches=new Map();
  const fingerposts=createThreeFingerposts(scene,{boundsVisible:exteriorVisible});
  const retainingWalls=createThreeRetainingWalls(scene,{boundsVisible:exteriorVisible});
  const trees=createThreeTrees(scene,{boundsVisible:exteriorVisible}),manholes=createThreeManholes(scene,{boundsVisible:exteriorVisible});
  const scenery=createThreeStaticScenery(scene,{boundsVisible:exteriorVisible});
  const buildings=createThreeBuildings(scene,{boundsVisible:exteriorVisible});
  const cones=createThreePineCones(scene,{boundsVisible:exteriorVisible}),flowers=createThreeFlowers(scene,{boundsVisible:exteriorVisible}),newspapers=createThreeNewspaperMachines(scene,{boundsVisible:exteriorVisible});
  const iceCreamVans=createThreeIceCreamVans(scene,{boundsVisible:exteriorVisible});
  const water=createThreeRiverWater(scene),riverWalks=createThreeRiverWalks(scene);
  const cards=createThreeCharacterCards(),cardMeshes=[],carriedIceCreams=createThreeCarriedIceCreams(scene);
  let cash,cashNote;
  let cardCount=0;
  let style={},view;
  function batch(color,image,smooth){
    const key=image??color;
    let value=batches.get(key);
    if(!value){
      const texture=image?new THREE.Texture(image):null;
      if(texture)texture.needsUpdate=true;
      if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=smooth?THREE.LinearFilter:THREE.NearestFilter;texture.minFilter=smooth?THREE.LinearMipmapLinearFilter:THREE.NearestFilter;texture.generateMipmaps=!!smooth;texture.anisotropy=smooth?8:1;}
      const material=new THREE.MeshBasicMaterial({color:image?'#ffffff':color,map:texture,side:THREE.DoubleSide,alphaTest:image?0.05:0,toneMapped:false,polygonOffset:!!style.detail,polygonOffsetFactor:style.detail?-1:0,polygonOffsetUnits:style.detail?-1:0});
      if(image&&isSignArtwork(image))sharpenSignSampling(material);
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
  const backend={face,quad,box,
    drawMoneyNote(note){
      if(note.taken){if(cash)cash.mesh.visible=false;return;}
      if(cashNote!==note){
        if(cash){scene.remove(cash.mesh);cash.dispose();}
        cash=createThreeMoneyNote(note,{hotelTint:false});cashNote=note;scene.add(cash.mesh);
      }
      cash.mesh.visible=true;
    },drawStaticGround:chunk=>scenery.drawGround(chunk),drawParkScenery:chunk=>scenery.drawPark(chunk),drawStaticBridges:chunk=>scenery.drawBridges(chunk),drawBuilding:(building,imageFor,viewer)=>buildings.draw(building,imageFor,viewer),
    drawCollectibles(chunk){cones.draw(chunk);flowers.draw(chunk);iceCreamVans.draw(chunk);},
    drawNewspaperMachines:chunk=>newspapers.draw(chunk),
    nativeDroppedCollectibles:true,
drawFingerpost:(s,boards,texture)=>fingerposts.draw(s,boards,texture),drawRetainingWalls:(chunk,viewer)=>retainingWalls.draw(chunk,viewer),drawManholes:chunk=>manholes.draw(chunk),drawTrees:chunk=>trees.draw(chunk),drawWater:chunk=>{water.draw(chunk);riverWalks.draw(chunk);},drawCar:(car,surface)=>{
    if(!exteriorVisible||exteriorVisible(car.x-4,surface.base-2,car.z-4,car.x+4,surface.base+4,car.z+4))traffic.draw(car,surface);
  },drawRoad:chunk=>roads.draw(chunk),drawRailings:chunk=>railings.draw(chunk),boundsVisible:(...args)=>culling.boundsVisible(...args)&&(!exteriorVisible||exteriorVisible(...args)),
    beginFrame(next){carriedIceCreams.beginFrame();cardCount=0;view=next;culling.set(next);updateInteriorCamera(camera,next);for(const b of batches.values()){b.positions.length=0;b.uvs.length=0;}},
    withStyle(next,draw){const old=style;style={...style,...next};try{return draw();}finally{style=old;}},
    beginPass(){},endPass(){return [];},drawPass(){},drawSky(){},finishStreet(){},
    drawCharacterCard({position:p,height,width,type,frame,back,variant,seated=false,iceCreamStage,iceCreamFlavour}){
      if(exteriorVisible&&!exteriorVisible(p.x-width/2,p.y,p.z-width/2,p.x+width/2,p.y+height,p.z+width/2))return;
      const v=culling.transform(p);if(v.z<.3||v.z>105)return;
      let mesh=cardMeshes[cardCount];
      const geometry=cards.geometry(type,frame,back,variant,seated);
      if(!mesh){mesh=new THREE.Mesh(geometry,cards.material);mesh.name='street-character-card';cardMeshes.push(mesh);scene.add(mesh);}
      cardCount++;mesh.visible=true;mesh.geometry=geometry;
      mesh.position.set(p.x,p.y+height/2,-p.z);mesh.scale.set(width,height,1);mesh.rotation.y=-view.position.angle;
      carriedIceCreams.draw({position:p,height,width,stage:iceCreamStage,flavour:iceCreamFlavour,angle:view.position.angle,back});
    },
    billboard({position:p,height,width,image,getImage}){
      if(exteriorVisible&&!exteriorVisible(p.x-width/2,p.y,p.z-width/2,p.x+width/2,p.y+height,p.z+width/2))return;
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
  return {scene,camera,setBoundsVisible(filter){exteriorFilter=filter;},update(frame){
    if(cash)cash.mesh.visible=false;
    iceCreamVans.beginFrame(frame);scenery.beginFrame(frame);buildings.beginFrame(frame);cones.beginFrame(frame);flowers.beginFrame(frame);newspapers.beginFrame(frame);
    fingerposts.beginFrame(frame);retainingWalls.beginFrame(frame);manholes.beginFrame(frame);trees.beginFrame(frame);water.beginFrame(frame);riverWalks.beginFrame();roads.beginFrame();railings.beginFrame();traffic.beginFrame();sky.update(frame);world.render(frame);
    carriedIceCreams.endFrame();
    for(let i=cardCount;i<cardMeshes.length;i++)cardMeshes[i].visible=false;
    roads.endFrame();railings.endFrame();traffic.endFrame();water.endFrame();riverWalks.endFrame();
    for(const [key,b] of batches){
      if(!b.positions.length){scene.remove(b.mesh);b.geometry.dispose();b.material.dispose();b.texture?.dispose();batches.delete(key);continue;}
      upload(b.geometry,'position',b.positions,3);upload(b.geometry,'uv',b.uvs,2);
      b.geometry.setDrawRange(0,b.positions.length/3);
    }
  },dispose(){cash?.dispose();cash=null;cashNote=null;iceCreamVans.dispose();scenery.dispose();buildings.dispose();cones.dispose();flowers.dispose();newspapers.dispose();carriedIceCreams.dispose();cards.dispose();cardMeshes.length=0;fingerposts.dispose();retainingWalls.dispose();manholes.dispose();trees.dispose();riverWalks.dispose();water.dispose();traffic.dispose();roads.dispose();railings.dispose();sky.dispose();for(const b of batches.values()){b.geometry.dispose();b.material.dispose();b.texture?.dispose();}batches.clear();scene.clear();}};
}
