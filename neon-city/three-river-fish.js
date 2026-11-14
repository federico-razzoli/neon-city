// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WIDTH,WATER_LEVEL} from './world.js';

// Shared, tapered minnow geometry: nose along +X, a dark back and pale belly.
export function createRiverFishResources(){
  const body=new THREE.SphereGeometry(1,12,8);
  const positions=body.getAttribute('position'),colors=[];
  const back=new THREE.Color('#334b48'),silver=new THREE.Color('#809b91'),belly=new THREE.Color('#acb8a1');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i);
    positions.setXYZ(i,x*.31,y*.075*(.8+.2*x),positions.getZ(i)*.06*(.75+.25*x));
    const color=y>0?silver.clone().lerp(back,y):silver.clone().lerp(belly,-y);
    colors.push(color.r,color.g,color.b);
  }
  body.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));body.computeVertexNormals();
  const fin=new THREE.BufferGeometry();
  fin.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.18,.11,0,-.13,0,0,0,0,0,-.13,0,0,-.18,-.11,0],3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
  const finMaterial=new THREE.MeshBasicMaterial({color:'#657e70',side:THREE.DoubleSide,toneMapped:false});
  return {body,fin,material,finMaterial,seed:Math.floor(Math.random()*4294967296),dispose(){body.dispose();fin.dispose();material.dispose();finMaterial.dispose();}};
}

// Seven fish in three distinct, equally sized formations: staggered, chevron, loose cluster.
export const RIVER_FISH_FORMATIONS=[
  [[1.2,0],[.3,-.7],[.3,.7],[-.6,-1.05],[-.6,0],[-.6,1.05],[-1.5,.4]],
  [[1.4,0],[.6,-.5],[.6,.5],[-.2,-1],[-.2,1],[-1,-1.5],[-1,1.5]],
  [[1.1,.3],[.5,-.8],[-.1,.1],[-.4,1.2],[-1.2,-.6],[1,1.1],[-1.4,.6]]
];

// A session seed randomizes each bridge span while keeping it stable on chunk reload.
// Bridges lie at multiples of three blocks; the whole span includes their footprints.
export function riverSchoolPlacements(seed,span,row){
  let state=(seed^Math.imul(span,73856093)^Math.imul(row,19349663))>>>0;
  const random=()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
  const count=1+Math.floor(random()*2),placements=[];
  for(let i=0;i<count;i++)placements.push({
    x:(span*3)*BLOCK+random()*3*BLOCK,
    z:row*BLOCK+18+7+random()*(RIVER_WIDTH-14),
    configuration:Math.floor(random()*3),phase:random()*Math.PI*2
  });
  return placements;
}

export function createRiverSchool(resources,placement){
  const {x:cx,z,configuration,phase}=placement,cz=-z;
  const formation=RIVER_FISH_FORMATIONS[configuration];
  const group=new THREE.Group();group.name='river-fish-school';
  group.userData.configuration=configuration;
  const fish=[];
  for(let i=0;i<formation.length;i++){
    const pivot=new THREE.Group(),body=new THREE.Mesh(resources.body,resources.material);
    const tail=new THREE.Mesh(resources.fin,resources.finMaterial);tail.position.x=-.27;
    pivot.add(body,tail);
    // Paired pectoral fins and a small dorsal fin break the spindle silhouette.
    for(const side of [-1,1]){
      const fin=new THREE.Mesh(resources.fin,resources.finMaterial);
      fin.position.set(.03,-.025,side*.045);fin.rotation.x=side*1.05;fin.scale.set(.38,.48,.48);pivot.add(fin);
    }
    const dorsal=new THREE.Mesh(resources.fin,resources.finMaterial);
    dorsal.position.set(-.04,.045,0);dorsal.scale.set(.5,.6,.6);pivot.add(dorsal);
    const size=.7+(i*0.173%0.6);pivot.scale.setScalar(size);
    group.add(pivot);fish.push({pivot,tail,phase:i*2.399,size});
  }
  return {group,update(time){
    const angle=time*.12+phase;
    group.position.set(cx+Math.cos(angle)*5,WATER_LEVEL-.32,cz+Math.sin(angle)*3);
    group.rotation.y=Math.atan2(-3*Math.cos(angle),-5*Math.sin(angle));
    for(let i=0;i<fish.length;i++){
      const {pivot,tail,phase:p}=fish[i];
      pivot.position.set(formation[i][0]+Math.sin(time*.9+p)*.15,-(i%3)*.09,formation[i][1]+Math.sin(time*.7+p)*.12);
      pivot.rotation.y=Math.sin(time*1.4+p)*.06;
      pivot.rotation.z=Math.sin(time*.8+p)*.025;
      tail.rotation.y=Math.sin(time*(9+i*.23)+p)*.48;
    }
  }};
}
