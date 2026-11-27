import {createThreeCarriedIceCreams} from './three-carried-ice-creams.js';
// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {isSignArtwork} from './sign-artwork.js';
import {sharpenSignSampling} from './sign-texture-filter.js';
import {createThreeMoneyNote} from './three-money-note.js';
import {createThreeSeatedCharacters} from './three-seated-characters.js';
import {createThreeCharacterCards} from './three-character-cards.js';
import {createThreeFingerposts} from './three-fingerposts.js';
import {createThreeRetainingWalls} from './three-retaining-walls.js';
import {createThreeManholes} from './three-manholes.js';
import {createThreeHotelDoormats} from './three-hotel-doormats.js';
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
import {createThreeRiverWisps} from './three-river-wisps.js';
import {createWorldScene} from './world-scene.js';
import {createInteriorCamera,updateInteriorCamera} from './three-interior-scene.js';
import {createCorridorSky} from './three-corridor-sky.js';
import {createRenderCamera} from './render-camera.js';
import {RIVER_ROWS} from './world.js';

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
  const doormats=createThreeHotelDoormats(scene,{boundsVisible:exteriorVisible});
  const scenery=createThreeStaticScenery(scene,{boundsVisible:exteriorVisible});
  const buildings=createThreeBuildings(scene,{boundsVisible:exteriorVisible});
  const cones=createThreePineCones(scene,{boundsVisible:exteriorVisible}),flowers=createThreeFlowers(scene,{boundsVisible:exteriorVisible}),newspapers=createThreeNewspaperMachines(scene,{boundsVisible:exteriorVisible});
  const iceCreamVans=createThreeIceCreamVans(scene,{boundsVisible:exteriorVisible});
  const water=createThreeRiverWater(scene),riverWalks=createThreeRiverWalks(scene),riverWisps=createThreeRiverWisps(scene);
  const cards=createThreeCharacterCards(),cardMeshes=[],carriedIceCreams=createThreeCarriedIceCreams(scene);
  const seatedCharacters=createThreeSeatedCharacters(),benchLegMeshes=[];
  let benchLegCount=0,benchFace=null;
  const faceRay=new THREE.Raycaster();
  const shape=new THREE.Shape();
  shape.moveTo(0,-.30);
  shape.bezierCurveTo(-.10,-.18,-.35,-.02,-.35,.14);
  shape.bezierCurveTo(-.35,.33,-.10,.36,0,.19);
  shape.bezierCurveTo(.10,.36,.35,.33,.35,.14);
  shape.bezierCurveTo(.35,-.02,.10,-.18,0,-.30);
  const heart=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xff3868,depthTest:false,depthWrite:false}));
  heart.name='bench-dialogue-heart';
  const heartOverlay=new THREE.Scene(),faceAnchor=new THREE.Group();
  faceAnchor.matrixAutoUpdate=false;
  heartOverlay.add(faceAnchor);faceAnchor.add(heart);
  heart.position.set(.035,.20,.025);
  let heartStarted=null;
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
drawFingerpost:(s,boards,texture)=>fingerposts.draw(s,boards,texture),drawRetainingWalls:(chunk,viewer)=>retainingWalls.draw(chunk,viewer),drawManholes:chunk=>manholes.draw(chunk),drawHotelDoormats:chunk=>doormats.draw(chunk),drawTrees:chunk=>trees.draw(chunk),drawWater:chunk=>{water.draw(chunk);riverWalks.draw(chunk);},drawCar:(car,surface)=>{
    if(!exteriorVisible||exteriorVisible(car.x-4,surface.base-2,car.z-4,car.x+4,surface.base+4,car.z+4))traffic.draw(car,surface);
  },drawRoad:chunk=>roads.draw(chunk),drawRailings:chunk=>railings.draw(chunk),boundsVisible:(...args)=>culling.boundsVisible(...args)&&(!exteriorVisible||exteriorVisible(...args)),
    beginFrame(next){carriedIceCreams.beginFrame();cardCount=0;benchLegCount=0;benchFace=null;view=next;culling.set(next);updateInteriorCamera(camera,next);for(const b of batches.values()){b.positions.length=0;b.uvs.length=0;}},
    withStyle(next,draw){const old=style;style={...style,...next};try{return draw();}finally{style=old;}},
    beginPass(){},endPass(){return [];},drawPass(){},drawSky(){},finishStreet(){},
    drawBenchLegs(person,girth){
      const geometry=seatedCharacters.geometry(person.type,person.variant,-1,.24);
      let mesh=benchLegMeshes[benchLegCount++];
      if(!mesh){
        mesh=new THREE.Mesh(geometry,seatedCharacters.material);
        mesh.name='bench-seated-legs';benchLegMeshes.push(mesh);scene.add(mesh);
      }
      mesh.geometry=geometry;mesh.visible=true;
      mesh.position.set(person.x,person.ground,-person.z);
      mesh.rotation.y=-Math.atan2(person.facingX,person.facingZ);
      // The bench seat is .5 high. The chair model's thighs start at .52.
      mesh.scale.set(girth,.5/.52,1);
    },
    drawCharacterCard({position:p,height,width,type,frame,back,variant,seated=false,iceCreamStage,iceCreamFlavour}){
      if(exteriorVisible&&!exteriorVisible(p.x-width/2,p.y,p.z-width/2,p.x+width/2,p.y+height,p.z+width/2))return;
      const v=culling.transform(p);if(v.z<.3||v.z>105)return;
      let mesh=cardMeshes[cardCount];
      const geometry=cards.geometry(type,frame,back,variant,seated);
      if(!mesh){mesh=new THREE.Mesh(geometry,cards.material);mesh.name='street-character-card';cardMeshes.push(mesh);scene.add(mesh);}
      cardCount++;mesh.visible=true;mesh.geometry=geometry;
      mesh.position.set(p.x,p.y+height/2,-p.z);mesh.scale.set(width,height,1);mesh.rotation.y=-view.position.angle;
      if(seated&&!back)benchFace=mesh;
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
  function hitsBenchFace(x,y){
    if(!benchFace)return false;
    faceRay.setFromCamera({x,y},camera);
    const hit=faceRay.intersectObject(benchFace,false)[0];
    if(!hit)return false;
    // Locate the face in the shared 24-column, 32-row seated character card.
    const point=benchFace.worldToLocal(hit.point);
    const column=(point.x+.5)*24,row=(.5-point.y)*32;
    return column>=8&&column<18&&row>=4&&row<15;
  }
  // Compile the river and ice cream van shader programs when the street scene
  // is created; otherwise they all compile on the frame the first river row
  // arrives. The placeholder chunks are not in the loaded city, so the next
  // frame's begin and end passes remove them before anything is drawn.
  function warmRiverShaders(renderer){
    const row=RIVER_ROWS[0];
    // Street 0 has a bridge, with stairs and grates; chunk 1 on the first bank has a van.
    const chunks=[[0,row],[1,row],[0,row+1]].map(([x,z])=>({x,z,river:true,riverStart:row,buildings:[],people:[],manholes:[],newspaperMachines:[]}));
    for(const chunk of chunks){water.draw(chunk);riverWalks.draw(chunk);railings.draw(chunk);roads.draw(chunk);retainingWalls.draw(chunk);iceCreamVans.draw(chunk);}
    // compileAsync collects the materials synchronously, so the fish can go at once.
    const removeFish=water.warmFish();
    renderer.compileAsync(scene,camera);removeFish();
  }
  return {scene,camera,hitsBenchFace,setBoundsVisible(filter){exteriorFilter=filter;},prepare(renderer){warmRiverShaders(renderer);},update(frame){
    if(cash)cash.mesh.visible=false;
    iceCreamVans.beginFrame(frame);scenery.beginFrame(frame);buildings.beginFrame(frame);cones.beginFrame(frame);flowers.beginFrame(frame);newspapers.beginFrame(frame);
    fingerposts.beginFrame(frame);retainingWalls.beginFrame(frame);manholes.beginFrame(frame);doormats.beginFrame(frame);trees.beginFrame(frame);water.beginFrame(frame);riverWalks.beginFrame();roads.beginFrame();railings.beginFrame();traffic.beginFrame();sky.update(frame);world.render(frame);
    if(frame.benchHeart){
      heartStarted??=frame.time;
      const progress=Math.min(1,(frame.time-heartStarted)/.8);
      heart.scale.setScalar(.12+.88*progress*(2-progress));
    }else heartStarted=null;
    carriedIceCreams.endFrame();
    for(let i=benchLegCount;i<benchLegMeshes.length;i++)benchLegMeshes[i].visible=false;
    for(let i=cardCount;i<cardMeshes.length;i++)cardMeshes[i].visible=false;
    roads.endFrame();railings.endFrame();traffic.endFrame();water.endFrame();riverWalks.endFrame();
    riverWisps.update(frame.riverWisps);
    for(const [key,b] of batches){
      if(!b.positions.length){scene.remove(b.mesh);b.geometry.dispose();b.material.dispose();b.texture?.dispose();batches.delete(key);continue;}
      upload(b.geometry,'position',b.positions,3);upload(b.geometry,'uv',b.uvs,2);
      b.geometry.setDrawRange(0,b.positions.length/3);
    }
  },renderOverlay(renderer){
    if(heartStarted===null||!benchFace)return;
    faceAnchor.matrix.copy(benchFace.matrixWorld);
    faceAnchor.matrixWorldNeedsUpdate=true;
    const autoClear=renderer.autoClear;
    renderer.autoClear=false;
    try{renderer.render(heartOverlay,camera);}finally{renderer.autoClear=autoClear;}
  },dispose(){heart.geometry.dispose();heart.material.dispose();cash?.dispose();cash=null;cashNote=null;iceCreamVans.dispose();scenery.dispose();buildings.dispose();cones.dispose();flowers.dispose();newspapers.dispose();carriedIceCreams.dispose();cards.dispose();cardMeshes.length=0;seatedCharacters.dispose();benchLegMeshes.length=0;fingerposts.dispose();retainingWalls.dispose();manholes.dispose();doormats.dispose();trees.dispose();riverWalks.dispose();riverWisps.dispose();water.dispose();traffic.dispose();roads.dispose();railings.dispose();sky.dispose();for(const b of batches.values()){b.geometry.dispose();b.material.dispose();b.texture?.dispose();}batches.clear();scene.clear();}};
}
