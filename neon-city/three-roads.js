// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WIDTH,BRIDGE_RISE,bridgeHeight,hasBridge,RIVER_STAIRS} from './world.js';

// All exterior road surfaces and paint use Three.js plane geometry.
// World Z is reflected here, just as it is in the street geometry adapter.
export function createThreeRoads(scene){
  const plane=new THREE.PlaneGeometry(1,1);
  plane.rotateX(-Math.PI/2);
  // One segmented plane covers the complete arch, so the deck has shared
  // vertices rather than independent pieces meeting at its crest.
  const arch=new THREE.PlaneGeometry(1,RIVER_WIDTH,1,RIVER_WIDTH/2);
  arch.rotateX(-Math.PI/2);
  const vertices=arch.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const t=(RIVER_WIDTH/2-vertices.getZ(i))/RIVER_WIDTH;
    vertices.setY(i,.075+(t>0&&t<1?BRIDGE_RISE*Math.sin(Math.PI*t):0));
  }
  vertices.needsUpdate=true;arch.computeVertexNormals();
  const material=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
  const asphalt=material('#252233'),pavement=material('#757380'),grass=material('#345841');
  const paint=color=>new THREE.MeshBasicMaterial({color,toneMapped:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const dashes=paint('#b09485'),crossings=paint('#81798a'),bridgePaint=paint('#c4af8c');
  const parts=new Map(),matrix=new THREE.Matrix4();
  function rectangle(mesh,index,x,y,z,w,d){
    matrix.makeScale(w,1,d);matrix.setPosition(x+w/2,y,-z-d/2);
    mesh.setMatrixAt(index,matrix);
  }
  function surface(group,name,x,z,w,d,y0,y1,mat){
    const mesh=new THREE.Mesh(plane,mat);
    mesh.name=name;
    mesh.scale.set(w,1,Math.hypot(d,y1-y0));
    mesh.rotation.x=Math.atan2(y1-y0,d);
    mesh.position.set(x+w/2,(y0+y1)/2,-z-d/2);
    group.add(mesh);
  }
  function kerb(group,x,z,w,height,first){
    const mesh=new THREE.Mesh(plane,pavement);mesh.name='riverside-kerb';
    mesh.scale.set(w,1,height);mesh.rotation.x=first?Math.PI/2:-Math.PI/2;
    mesh.position.set(x+w/2,height/2,-z);group.add(mesh);
  }
  function markings(group,name,mat,rectangles){
    const mesh=new THREE.InstancedMesh(plane,mat,rectangles.length);
    mesh.name=name;
    for(let i=0;i<rectangles.length;i++)rectangle(mesh,i,...rectangles[i]);
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  function street(group,x,z){
    surface(group,'street-asphalt',x,z,BLOCK,BLOCK,0,0,asphalt);
    const lanes=[],stripes=[];
    for(let t=12;t+4<=56;t+=12){
      lanes.push([x-.09,.025,z+t,.18,4],[x+t,.025,z-.09,4,.18]);
    }
    for(let i=-5;i<=5;i++){
      stripes.push([x+i*1.4-.325,.03,z+9.5,.65,2.7],[x+9.5,.03,z+i*1.4-.325,2.7,.65]);
    }
    markings(group,'street-lane-dashes',dashes,lanes);
    markings(group,'street-crossings',crossings,stripes);
  }
  function bank(group,chunk){
    const x=chunk.x*BLOCK,start=chunk.riverStart*BLOCK;
    const first=chunk.z===chunk.riverStart,z=first?start:start+120;
    // Match the adjoining ordinary street's y=0 surface. The former .015
    // elevation left a discontinuity down the middle of the riverside road.
    surface(group,'riverside-asphalt',x,z,BLOCK,8,0,0,asphalt);
    const lanes=[];
    for(let t=16;t<52;t+=12)lanes.push([x+t,.025,first?z+.1:z+7.8,4,.18]);
    markings(group,'riverside-lane-dashes',dashes,lanes);
    const bankZ=first?start+8:start+110;
    // Leave the full bridge corridor open: asphalt occupies its middle 16m,
    // and the two 6m footways belong to the bridge approach itself.
    const left=hasBridge(chunk.x)?14:0,right=hasBridge(chunk.x+1)?50:BLOCK;
    const grassLeft=hasBridge(chunk.x)?RIVER_STAIRS.start:left;
    surface(group,'riverside-grass',x+grassLeft,bankZ,right-grassLeft,10,.04,.04,grass);
    surface(group,'riverside-pavement',x+grassLeft,first?bankZ:bankZ+4,right-grassLeft,6,.06,.06,pavement);
    // Join the bridge footway at its actual .075m elevation, tapering down
    // across the access strip to meet the .06m riverside pavement seamlessly.
    if(hasBridge(chunk.x)){
      const width=RIVER_STAIRS.start-left;
      surface(group,'riverside-stair-access',x+left,bankZ,width,10,.0675,.0675,pavement);
      const access=group.children.at(-1);
      access.scale.x=Math.hypot(width,.015);access.rotation.z=Math.atan2(-.015,width);
    }
    kerb(group,x+left,first?bankZ:bankZ+10,right-left,.06,first);
  }
  function bridge(group,streetIndex,riverRow){
    const x=streetIndex*BLOCK,start=riverRow*BLOCK;
    const batches=new Map(),transform=new THREE.Object3D();
    function add(name,x,z,w,d,y0,y1,mat){
      transform.scale.set(w,1,Math.hypot(d,y1-y0));
      transform.rotation.x=Math.atan2(y1-y0,d);
      transform.position.set(x+w/2,(y0+y1)/2,-z-d/2);transform.updateMatrix();
      if(!batches.has(name))batches.set(name,{mat,matrices:[]});
      batches.get(name).matrices.push(transform.matrix.clone());
    }
    // One full-width deck spans both chunk halves, with a shared curve and
    // material. The approaches meet the bank road and the arch exactly.
    for(const [z,y0,y1] of [[start+8,0,.075],[start+110,.075,0]]){
      add('bridge-approach',x-8,z,16,10,y0,y1,asphalt);
      for(const dx of [-14,8]){
        add('bridge-approach-pavement',x+dx,z,6,10,.075,.075,pavement);
        kerb(group,x+dx,y0===0?z:z+10,6,.075,y0===0);
      }
    }
    const deck=new THREE.Mesh(arch,asphalt);deck.name='bridge-asphalt';
    deck.scale.x=16;deck.position.set(x,0,-start-64);group.add(deck);
    for(const dx of [-11,11]){
      const walk=new THREE.Mesh(arch,pavement);walk.name='bridge-pavement';
      walk.scale.x=6;walk.position.set(x+dx,0,-start-64);group.add(walk);
    }
    for(let z=start+18;z<start+110;z+=2){
      const y0=bridgeHeight(z),y1=bridgeHeight(z+2);
      if(Math.floor((z-start)/4)%3===0)
        add('bridge-lane-dash',x,z,.15,2,y0+.085,y1+.085,bridgePaint);
    }
    for(const [name,{mat,matrices}] of batches){
      const mesh=new THREE.InstancedMesh(plane,mat,matrices.length);mesh.name=name;
      for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i]);
      mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
    }
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
      if(chunk.river){
        use(`riverside:${chunk.x},${chunk.z}`,group=>bank(group,chunk));
        // Either neighbouring chunk can keep the shared bridge alive.
        for(const streetIndex of [chunk.x,chunk.x+1])if(hasBridge(streetIndex))
          use(`bridge:${streetIndex},${chunk.riverStart}`,group=>bridge(group,streetIndex,chunk.riverStart));
      }else use(`street:${chunk.x},${chunk.z}`,group=>street(group,chunk.x*BLOCK,chunk.z*BLOCK));
    },
    endFrame(){for(const [key,part] of parts)if(!part.seen){release(part);parts.delete(key);}},
    dispose(){
      for(const part of parts.values())release(part);parts.clear();plane.dispose();arch.dispose();
      for(const mat of [asphalt,pavement,grass,dashes,crossings,bridgePaint])mat.dispose();
    }
  };
}
