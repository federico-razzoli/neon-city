// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {entranceSide,entranceWall} from './entrances.js';
import {hotelLook} from './hotel.js?v=park-entrances-1';
import {groundHeight} from './world.js?v=start-pub-1';

// A fancy doormat before each hotel's double doors, built entirely from
// Three.js geometry in the lobby's carpet and brass. The painted door frame is
// 24 of the wall's 160 texture pixels (2.7 m on an 18 m wall); the mat matches
// it and is 1.2 m deep, lying on the pavement.
const MAT={width:2.7,depth:1.2,gap:.04,pavement:.08,layer:.004};
// Along each wall in the direction its texture runs: left to right for
// someone outside facing the doors (north, south, west, east walls).
const TANGENTS=[[1,0],[-1,0],[0,-1],[0,1]];

// One merged, vertex-coloured model per lobby look. Local axes: x across the
// doorway, y up, z out from the wall; the wall edge is at z=0.
function buildModel(look){
  const positions=[],colors=[],metal=new THREE.Color(look.metal),carpet=new THREE.Color(look.carpet);
  const rubber=new THREE.Color('#1a1120'),panel=carpet.clone().multiplyScalar(.7);
  const W=MAT.width,cz=MAT.gap+MAT.depth/2,top=MAT.pavement+.02,level=n=>top+n*MAT.layer;
  function add(geometry,color,x,y,z){
    geometry=geometry.index?geometry.toNonIndexed():geometry;geometry.translate(x,y,z);
    const p=geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));colors.push(color.r,color.g,color.b);}
    geometry.dispose();
  }
  const plane=(w,d,color,x,z,n)=>{const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);add(g,color,x,level(n),z);};
  const diamond=(r,color,x,z,n)=>{const g=new THREE.CircleGeometry(r,4);g.rotateX(-Math.PI/2);add(g,color,x,level(n),z);};
  const block=(w,h,d,color,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),color,x,y+h/2,z);
  // A commercial rubber slab with a low bevelled lip all round, a broad
  // rubber border, then brass trim and the carpet field.
  block(W,.01,MAT.depth,rubber,0,MAT.pavement,cz);
  block(W-.05,.02,MAT.depth-.05,rubber,0,MAT.pavement,cz);
  plane(W-.17,MAT.depth-.17,metal,0,cz,1);
  plane(W-.21,MAT.depth-.21,carpet,0,cz,2);
  // A darker inner panel framed by a thin brass line, with raised corner studs.
  plane(W-.41,.79,metal,0,cz,3);
  plane(W-.45,.75,panel,0,cz,4);
  for(const sx of [-(W-.41)/2,(W-.41)/2])for(const sz of [-.395,.395])block(.06,.008,.06,metal,sx,level(4),cz+sz);
  // A brass medallion bearing the hotel's H.
  diamond(.36,metal,0,cz,5);diamond(.32,rubber,0,cz,6);diamond(.29,panel.clone().lerp(carpet,.5),0,cz,7);
  for(const x of [-.075,.075])plane(.05,.3,metal,x,cz,8);
  plane(.1,.05,metal,0,cz,8);
  // Smaller diamonds either side, linked to the medallion by brass scrolls.
  for(const side of [-1,1]){
    const x=side*.62;
    diamond(.14,metal,x,cz,5);diamond(.1,carpet,x,cz,6);diamond(.035,metal,x,cz,7);
    for(let i=0;i<3;i++)plane(.02,.02,metal,side*(.385+i*.035),cz+(i%2?-.02:.02),5);
    for(let i=0;i<3;i++)plane(.03,.03,metal,side*(.79+i*.04),cz+(i%2?-.025:.025),5);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// Local mat space to world space; Three.js z is the world z negated.
function placement(building,matrix){
  const wall=entranceWall(building),[tx,tz]=TANGENTS[entranceSide(building)];
  const x=wall.x+wall.nx*(MAT.gap+MAT.depth/2),z=wall.z+wall.nz*(MAT.gap+MAT.depth/2);
  matrix.makeBasis(new THREE.Vector3(tx,0,-tz),new THREE.Vector3(0,1,0),new THREE.Vector3(wall.nx,0,-wall.nz));
  matrix.setPosition(wall.x,groundHeight(x,z),-wall.z);
  return matrix;
}

export function createThreeHotelDoormats(scene,{boundsVisible}={}){
  const models=new Map(),chunks=new Map(),matrix=new THREE.Matrix4();
  const material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
  function model(look){
    if(!models.has(look.name))models.set(look.name,buildModel(look));
    return models.get(look.name);
  }
  function release(meshes){for(const mesh of meshes){scene.remove(mesh);mesh.dispose();}}
  return {
    beginFrame(frame){
      const loaded=new Set([...frame.city.chunks.values()].map(chunk=>chunk.buildings));
      for(const [buildings,meshes] of chunks){
        if(!loaded.has(buildings)){release(meshes);chunks.delete(buildings);}
        else for(const mesh of meshes)mesh.visible=false;
      }
    },
    draw(chunk){
      const buildings=chunk.buildings;if(!buildings?.length)return;
      let meshes=chunks.get(buildings);
      if(!meshes){
        const groups=new Map();
        for(const b of buildings)if(b.sign==='HOTEL'){
          const look=hotelLook(b);
          if(!groups.has(look))groups.set(look,[]);groups.get(look).push(b);
        }
        meshes=[];
        for(const [look,group] of groups){
          const mesh=new THREE.InstancedMesh(model(look),material,group.length);
          mesh.name=`hotel-doormats:${chunk.x},${chunk.z}:${look.name}`;
          group.forEach((b,i)=>mesh.setMatrixAt(i,placement(b,matrix)));
          mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
          meshes.push(mesh);scene.add(mesh);
        }
        chunks.set(buildings,meshes);
      }
      for(const mesh of meshes){
        const box=mesh.boundingBox;
        mesh.visible=!boundsVisible||boundsVisible(box.min.x,box.min.y,-box.max.z,box.max.x,box.max.y,-box.min.z);
      }
    },
    dispose(){
      for(const meshes of chunks.values())release(meshes);chunks.clear();
      for(const geometry of models.values())geometry.dispose();models.clear();material.dispose();
    }
  };
}
