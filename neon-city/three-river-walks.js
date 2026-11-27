// SPDX-License-Identifier: AGPL-3.0-only
import {RIVER_GRATE} from './river-grates.js';
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WALK_HEIGHT,RIVER_WALK_WIDTH,RIVER_STAIRS,hasRiverStairs,riverBenches} from './world.js';

export function createThreeRiverWalks(scene){
  const cube=new THREE.BoxGeometry(1,1,1),revealGeometry=new THREE.PlaneGeometry(1,1);
  const revealMaterial=new THREE.MeshBasicMaterial({color:'#343a46',side:THREE.DoubleSide,toneMapped:false});
  // Lighter treads and darker risers make the profile legible in the same
  // cool stone palette. Small per-step variations avoid a single flat shape.
  const stone=['#4e5563','#555d6c','#788091','#424957','#606878','#606878']
    .map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  const shades=['#ffffff','#e5e8ef','#f2f4f8'].map(color=>new THREE.Color(color));
  const wood=new THREE.MeshBasicMaterial({color:'#80594a',toneMapped:false}),metal=new THREE.MeshBasicMaterial({color:'#232230',toneMapped:false});
  const iron=new THREE.MeshBasicMaterial({color:'#252827',toneMapped:false}),frameIron=new THREE.MeshBasicMaterial({color:'#191c1c',toneMapped:false}),dark=new THREE.MeshBasicMaterial({color:'#020204',toneMapped:false}),lock=new THREE.MeshBasicMaterial({color:'#343735',toneMapped:false});
  // World-space mottling follows the forged metal across segment boundaries.
  for(const material of [iron,frameIron,lock])material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 forgedPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      forgedPosition=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader='varying vec3 forgedPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=forgedPosition;
      float grain=fract(sin(dot(floor(p*190.0),vec3(12.9898,78.233,37.719)))*43758.5453);
      float scale=sin(p.x*49.0+sin(p.y*31.0))*sin(p.y*67.0+p.z*43.0);
      float pits=smoothstep(0.65,0.91,grain);
      diffuseColor.rgb*=0.55+0.30*grain+0.30*scale;
      diffuseColor.rgb*=1.0-0.55*pits;`);
  };
  const keyholeShape=new THREE.Shape();
  keyholeShape.moveTo(.027,.008);
  keyholeShape.absarc(0,.035,.038,-Math.PI/4,Math.PI*1.25,false);
  keyholeShape.lineTo(-.025,-.075);keyholeShape.lineTo(.025,-.075);keyholeShape.closePath();
  const keyholeGeometry=new THREE.ShapeGeometry(keyholeShape,12);
  // The two banks face opposite directions.
  dark.side=THREE.DoubleSide;
  const parts=new Map(),transform=new THREE.Object3D(),templates=new Map();
  // Bank-local matrices: x runs along the block from its west edge, z is 0 on
  // the bank face and grows towards the water by dir. Meshes are positioned
  // at the chunk, so one template serves every chunk on the same bank side.
  function collect(){
    const values=[];
    return {values,
      push(){transform.updateMatrix();values.push(...transform.matrix.elements);},
      box(dir,px,y,d,w,h,depth,shift=0){
        transform.position.set(px+w/2,y+h/2,-dir*(d+depth/2)+shift);
        transform.rotation.set(0,0,0);transform.scale.set(w,h,depth);this.push();
      },
      array(){return new Float32Array(values);}
    };
  }
  function template(first){
    let result=templates.get(first);if(result)return result;
    const dir=first?1:-1;
    const plain=collect();plain.box(dir,0,RIVER_WALK_HEIGHT-.2,0,BLOCK,.2,RIVER_WALK_WIDTH);
    const stairs=collect();stairs.values.push(...plain.values);
    stairs.box(dir,RIVER_STAIRS.landing,RIVER_WALK_HEIGHT,0,2,-RIVER_WALK_HEIGHT,RIVER_STAIRS.width);
    const tread=(RIVER_STAIRS.end-RIVER_STAIRS.start)/RIVER_STAIRS.steps;
    for(let step=0;step<RIVER_STAIRS.steps;step++){
      const top=RIVER_WALK_HEIGHT*(step+1)/RIVER_STAIRS.steps;
      if(top>RIVER_WALK_HEIGHT)stairs.box(dir,RIVER_STAIRS.start+step*tread,RIVER_WALK_HEIGHT,0,tread,top-RIVER_WALK_HEIGHT,RIVER_STAIRS.width);
    }
    const {width,height,depth}=RIVER_GRATE,left=-width/2,bottom=RIVER_WALK_HEIGHT;
    const reveal=collect();
    for(let side=0;side<2;side++){
      transform.position.set(left+side*width,bottom+height/2,dir*.16);
      transform.rotation.set(0,Math.PI/2,0);transform.scale.set(.32,height,1);reveal.push();
    }
    transform.position.set(0,bottom+height,dir*.16);
    transform.rotation.set(Math.PI/2,0,0);transform.scale.set(width,.32,1);reveal.push();
    // All ironwork sits inside the cut opening, with clearance from the wall.
    const shift=dir*.34;
    const recess=collect(),grate=collect(),aged=collect(),locks=collect(),rivets=collect(),keyholes=collect();
    // The leaf fits from the lower path to the bridge slab's underside.
    // Hinges fasten directly to the wall, without an outer door frame.
    recess.box(dir,left,bottom,.025,width,height,.025,shift);
    const leafLeft=left,leafWidth=width;
    const leafBottom=bottom+.02,leafHeight=height-.04;
    for(const edge of [leafLeft,leafLeft+leafWidth-.075])
      grate.box(dir,edge,leafBottom,depth,.075,leafHeight,.085,shift);
    for(const y of [0,.42,1.48,leafHeight-.075])
      grate.box(dir,leafLeft,leafBottom+y,depth,leafWidth,.075,.085,shift);
    for(let i=1;i<=5;i++){
      const length=leafHeight-.15,segments=8;
      for(let j=0;j<segments;j++){
        const t=j/segments,next=(j+1)/segments;
        const bend=t=>Math.sin(t*Math.PI)*(i%2?1:-1)*(.025+i*.004);
        const px=leafLeft+i*leafWidth/6-.024+Math.sin(i*8.1)*.025;
        const ax=px+bend(t),bx=px+bend(next),h=length/segments;
        transform.position.set((ax+bx)/2,leafBottom+.075+(j+.5)*h,-dir*(depth+.035)+shift);
        transform.rotation.set(0,0,-Math.atan2(bx-ax,h));
        transform.scale.set(.047+Math.sin(i*13+j*7)*.007,Math.hypot(h,bx-ax)+.004,.06);
        grate.push();
      }
    }
    // Long hinge straps attach the leaf directly to the wall.
    for(const y of [.43,1.49]){
      // Tapered strap ends and proud rivet heads resemble blacksmith work.
      for(let n=0;n<5;n++)aged.box(dir,leafLeft-.055+n*.105,leafBottom+y-.04+n*.006,.215,.108,.12-n*.013,.045,shift);
      grate.box(dir,leafLeft-.065,leafBottom+y-.075,.21,.07,.19,.10,shift);
      for(const dx of [.08,.32])rivets.box(dir,leafLeft+dx,leafBottom+y-.006,.275,.055,.055,.03,shift);
    }
    for(const rail of [.42,1.48])for(let i=1;i<=5;i++)
      rivets.box(dir,leafLeft+i*leafWidth/6-.022,leafBottom+rail+.015,.211,.045,.045,.025,shift);
    // A mortise lock plate belongs to the closing stile; no hanging padlock.
    const plateX=leafLeft+leafWidth-.28;
    locks.box(dir,plateX,leafBottom+1.02,.215,.25,.34,.045,shift);
    aged.box(dir,leafLeft+leafWidth+.015,leafBottom+1.12,.10,.055,.16,.10,shift);
    // A round key entrance above a narrow tapered slot, inset in the plate.
    transform.position.set(plateX+.125,leafBottom+1.23,-dir*.263+shift);
    transform.rotation.set(0,0,0);transform.scale.setScalar(1);keyholes.push();
    result={plain:plain.array(),stairs:stairs.array(),reveal:reveal.array(),grate:[
      ['river-grate-dark',cube,dark,recess.array()],['river-grate-iron',cube,iron,grate.array()],
      ['river-grate-hardware',cube,frameIron,aged.array()],['river-grate-lock',cube,lock,locks.array()],
      ['river-grate-rivets',cube,frameIron,rivets.array()],['river-grate-keyhole',keyholeGeometry,dark,keyholes.array()]
    ]};
    templates.set(first,result);return result;
  }
  function instances(group,name,geometry,material,count,x,bank){
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;
    mesh.position.set(x,0,-bank);group.add(mesh);return mesh;
  }
  function copy(group,name,geometry,material,array,x,bank){
    const mesh=instances(group,name,geometry,material,array.length/16,x,bank);
    mesh.instanceMatrix.array.set(array);mesh.instanceMatrix.needsUpdate=true;return mesh;
  }
  function place(mesh,i,dir,px,y,d,w,h,depth){
    transform.position.set(px+w/2,y+h/2,-dir*(d+depth/2));
    transform.rotation.set(0,0,0);transform.scale.set(w,h,depth);transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);
  }
  function build(chunk){
    const group=new THREE.Group();group.name=`river-walk:${chunk.x},${chunk.z}`;
    const x=chunk.x*BLOCK,first=chunk.z===chunk.riverStart,bank=chunk.riverStart*BLOCK+(first?18:110),dir=first?1:-1;
    const shapes=template(first),stairs=hasRiverStairs(x);
    if(stairs){
      copy(group,'river-door-reveal',revealGeometry,revealMaterial,shapes.reveal,x,bank);
      for(const [name,geometry,material,array] of shapes.grate)copy(group,name,geometry,material,array,x,bank);
    }
    const mesh=copy(group,'river-walk-stone',cube,stone,stairs?shapes.stairs:shapes.plain,x,bank);
    for(let i=0;i<mesh.count;i++)mesh.setColorAt(i,shades[i<2?0:(i-2)%shades.length]);
    const benches=chunk.riverBenches??riverBenches(chunk);
    if(benches.length){
      const timber=instances(group,'river-bench-wood',cube,wood,benches.length*2,x,bank);
      const legs=instances(group,'river-bench-metal',cube,metal,benches.length*4,x,bank);
      let t=0,l=0;
      for(const bench of benches){
        const bx=bench.x-x;
        place(timber,t++,dir,bx-1,RIVER_WALK_HEIGHT+.42,0,2,.08,.6);
        place(timber,t++,dir,bx-1,RIVER_WALK_HEIGHT+.56,0,2,.42,.1);
        for(const end of [-.9,.82]){
          place(legs,l++,dir,bx+end,RIVER_WALK_HEIGHT,0,.08,.5,.6);
          place(legs,l++,dir,bx+end,RIVER_WALK_HEIGHT+.5,0,.08,.48,.1);
        }
      }
      timber.instanceMatrix.needsUpdate=true;legs.instanceMatrix.needsUpdate=true;
    }
    // Walks never move: compose each matrix once instead of every frame.
    group.matrixAutoUpdate=false;
    for(const mesh of group.children){mesh.matrixAutoUpdate=false;mesh.updateMatrix();}
    scene.add(group);return group;
  }
  const release=part=>{scene.remove(part.group);for(const mesh of part.group.children)mesh.dispose();};
  return {
    beginFrame(){for(const part of parts.values())part.seen=false;},
    draw(chunk){const key=`${chunk.x},${chunk.z}`;let part=parts.get(key);if(!part){part={group:build(chunk),seen:true};parts.set(key,part);}part.seen=true;},
    endFrame(){for(const [key,part] of parts)if(!part.seen){release(part);parts.delete(key);}},
    dispose(){for(const part of parts.values())release(part);parts.clear();cube.dispose();revealGeometry.dispose();revealMaterial.dispose();for(const material of stone)material.dispose();wood.dispose();metal.dispose();iron.dispose();frameIron.dispose();dark.dispose();lock.dispose();keyholeGeometry.dispose();}
  };
}
