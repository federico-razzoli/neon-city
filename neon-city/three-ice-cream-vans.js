// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {riverIceCreamVan} from './world.js';
import {ICE_CREAM_VAN,ICE_CREAM_VENDOR,iceCreamVanLocal} from './ice-cream-vans.js';
import {createThreeCharacterCards} from './three-character-cards.js';
import {createStaticInstances} from './three-static-instances.js';

// One shared model and sign per street scene; chunk instances own only transforms.
export function createThreeIceCreamVans(scene,{boundsVisible}={}){
  let parts=null,doorParts=null,disposed=false;
  const characters=createThreeCharacterCards();
  let viewer={x:0,z:0,angle:0};
  function assets(){
    if(parts)return parts;
    const positions=[],colors=[],transform=new THREE.Matrix4(),point=new THREE.Vector3();
    function add(geometry,x,y,z,color,rotation=0){
      transform.makeRotationX(rotation);transform.setPosition(x,y,z);
      const p=geometry.attributes.position,index=geometry.index,tint=new THREE.Color(color);
      for(let i=0;i<(index?.count??p.count);i++){
        const j=index?index.getX(i):i;point.fromBufferAttribute(p,j).applyMatrix4(transform);
        positions.push(point.x,point.y,point.z);colors.push(tint.r,tint.g,tint.b);
      }
      geometry.dispose();
    }
    const box=(x,y,z,w,h,d,color)=>add(new THREE.BoxGeometry(w,h,d),x,y,z,color);
    // Cream body, pink lower panels, turquoise cab, and an open serving hatch.
    // A hollow shell, with a genuine rear doorway and serving hatch.
    box(-.55,.345,0,4.2,.12,2.1,'#aaa995');
    box(-.55,2.5,0,4.2,.11,2.1,'#fff1cd');
    box(-.55,1.43,-1.01,4.2,2.05,.08,'#fff1cd');
    box(-.55,.66,-1.06,4.2,.48,.04,'#e88da8');
    box(-.55,.74,1.01,4.2,.67,.08,'#fff1cd');
    box(-.55,.66,1.06,4.2,.48,.04,'#e88da8');
    for(const x of [-2.36,1.06])box(x,1.7,1.01,.58,1.4,.08,'#fff1cd');
    box(-.55,2.34,1.01,4.2,.23,.08,'#fff1cd');
    for(const z of [-.935,.935])box(-2.61,1.43,z,.08,2.05,.23,'#fff1cd');
    box(-2.61,2.49,0,.08,.1,1.65,'#fff1cd');
    box(1.49,1.43,0,.12,2.05,2.1,'#fff1cd');
    // Worktop, storage cabinet and pale inner wall remain in the street scene.
    box(.65,.8,.8,1.5,.78,.35,'#b8dcd5');
    box(.65,1.22,.77,1.55,.08,.42,'#fff4d8');
    box(-.7,1.7,-.955,2.4,.5,.04,'#badbd6');
    box(2,1.08,0,1.35,1.35,2.05,'#64c8c5');
    box(2,1.85,0,1.3,.75,1.98,'#fff1cd');
    box(2.66,1.88,0,.025,.5,1.67,'#274958');
    for(const side of [-1,1]){
      box(2,1.89,side*1.001,.98,.48,.025,'#274958');
      box(2.35,1.04,side*1.04,.22,.08,.04,'#f2dba9');
    }
    box(-.65,1.12,1.1,3.05,.13,.85,'#fff4d8');
    // Striped projecting awning, supported at its outside corners.
    for(let i=0;i<10;i++){
      box(-2.14+i*.33,2.32,1.28,.33,.08,.7,i%2?'#fff4d8':'#e9799c');
      box(-2.14+i*.33,2.23,1.62,.33,.18,.04,i%2?'#fff4d8':'#e9799c');
    }
    for(const x of [-2.3,1])box(x,1.74,1.53,.045,1.08,.045,'#f2dfbc');
    for(const x of [-1.75,1.85])for(const side of [-1,1]){
      add(new THREE.CylinderGeometry(.39,.39,.22,16),x,.43,side*1.06,'#202331',Math.PI/2);
      add(new THREE.CylinderGeometry(.19,.19,.235,16),x,.43,side*1.06,'#b7c5ce',Math.PI/2);
    }
    for(const z of [-.7,.7])box(2.7,.88,z,.06,.25,.32,'#ffe6a2');
    box(2.73,.5,0,.12,.16,1.95,'#bbc7cc');
    for(const z of [-.94,.94])box(-2.7,.5,z,.1,.16,.2,'#bbc7cc');
    // Open metal tubs and scoops sit in the hatch, visible from both sides.
    for(const [x,tint] of [[-1.65,'#ef9fb8'],[-1.05,'#fff0c9'],[-.45,'#76503e']]){
      box(x,1.23,1.02,.51,.1,.54,'#a5b5bc');
      box(x,1.287,1.02,.43,.025,.46,tint);
      for(const dx of [-.12,.1])for(const dz of [-.12,.1])add(new THREE.SphereGeometry(.105,10,6),x+dx,1.29,1.02+dz,tint);
      for(const side of [-1,1])box(x,1.305,1.02+side*.27,.53,.035,.025,'#d8e3df');
    }
    // Cone rack, nested waffle cones, and two ready-to-serve ice creams.
    box(.55,1.22,1.18,.72,.08,.35,'#8b9fa6');
    for(const [x,tint] of [[.3,'#ef9fb8'],[.55,'#fff0c9'],[.8,null]]){
      add(new THREE.ConeGeometry(.105,.32,10),x,1.42,1.18,'#d0a167',Math.PI);
      for(let i=0;i<3;i++)add(new THREE.CylinderGeometry(.11,.11,.018,10),x,1.55-i*.045,1.18,'#e4bc80');
      if(tint)add(new THREE.SphereGeometry(.14,10,8),x,1.66,1.18,tint);
    }
    // Freezer, cupboard doors, utensils, shelving, tubs and a tiled splashback.
    box(-1.6,.76,-.75,1.4,.71,.4,'#e4e6d7');
    box(-1.6,1.14,-.75,1.44,.07,.43,'#a3c2c1');
    for(const x of [-1.94,-1.28])box(x,.82,-.539,.07,.15,.035,'#647c82');
    for(const x of [-1.8,-1.4,-1,-.6,-.2])for(const y of [1.5,1.72,1.94])box(x,y,-.925,.38,.2,.025,'#e3e5d9');
    box(-1.1,2.12,-.8,2.45,.07,.35,'#839e9d');
    for(const [x,tint] of [[-1.9,'#e8a4b7'],[-1.4,'#d9c39b'],[-.9,'#a2cec0']]){
      add(new THREE.CylinderGeometry(.13,.12,.23,12),x,2.27,-.8,tint);
      add(new THREE.CylinderGeometry(.14,.14,.04,12),x,2.4,-.8,'#f6efda');
    }
    add(new THREE.CylinderGeometry(.09,.08,.2,12),1.06,1.36,.77,'#bbc9cc');
    for(const x of [1.02,1.08])box(x,1.57,.77,.025,.27,.025,'#657e87');
    // Giant roof cone.
    add(new THREE.ConeGeometry(.27,.65,12),-1.45,2.9,0,'#cf995d',Math.PI);
    add(new THREE.SphereGeometry(.34,12,8),-1.45,3.36,0,'#f4a2bb');
    const ramp=new THREE.BufferGeometry();
    ramp.setAttribute('position',new THREE.Float32BufferAttribute([
      -3.85,0,-.82,-2.65,.405,.82,-2.65,.405,-.82,
      -3.85,0,-.82,-3.85,0,.82,-2.65,.405,.82
    ],3));
    add(ramp,0,0,0,'#8f9b9c');
    for(let i=1;i<positions.length;i+=3)positions[i]*=ICE_CREAM_VAN.heightScale;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();
    const body=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff1cd';ctx.fillRect(0,0,512,80);
    ctx.fillStyle='#c74779';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText('ICE CREAM',256,58);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.PlaneGeometry(3.3,.52);sign.translate(-.55,2.65,1.68);
    const lettering=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
    parts=[{geometry,material:body},{geometry:sign,material:lettering}];return parts;
  }
  function doorAssets(){
    if(doorParts)return doorParts;
    const material=new THREE.MeshBasicMaterial({color:'#f7e8be',toneMapped:false});
    const geometry=new THREE.BoxGeometry(.08,2.05*ICE_CREAM_VAN.heightScale,ICE_CREAM_VAN.doorHalf*2);
    geometry.translate(0,1.43*ICE_CREAM_VAN.heightScale,ICE_CREAM_VAN.doorHalf);
    const handle=new THREE.BoxGeometry(.18,.28,.14);
    handle.translate(-.075,1.4*ICE_CREAM_VAN.heightScale,1.4);
    const insideHandle=handle.clone();insideHandle.translate(.15,0,0);
    const grip=new THREE.MeshBasicMaterial({color:'#40545e',toneMapped:false});
    doorParts=[{geometry,material},{geometry:handle,material:grip},{geometry:insideHandle,material:grip}];
    return doorParts;
  }
  const vendorBack=van=>iceCreamVanLocal(van,viewer).z<ICE_CREAM_VENDOR.z;
  const vendors=createStaticInstances(scene,{name:'ice-cream-vendor',boundsVisible,
    stateFor:v=>[v.x,v.z,v.first,viewer.angle,vendorBack(v)],keyFor:v=>`${vendorBack(v)}`,
    assetFor:v=>[{geometry:characters.geometry(ICE_CREAM_VENDOR.type,1,vendorBack(v)),material:characters.material}],
    matrixFor(v,matrix){
      const sign=v.first?1:-1,height=ICE_CREAM_VENDOR.height;
      matrix.makeRotationY(-viewer.angle);matrix.scale(new THREE.Vector3(height/2,height,1));
      matrix.setPosition(v.x+sign*ICE_CREAM_VENDOR.x,ICE_CREAM_VAN.floor+height/2,-v.z+sign*ICE_CREAM_VENDOR.z);
    }
  });
  const hinge=new THREE.Matrix4();
  const doors=createStaticInstances(scene,{name:'ice-cream-van-door',boundsVisible,
    stateFor:v=>[v.x,v.z,v.first,!!v.doorOpen],keyFor:()=> 'rear-door',assetFor:doorAssets,
    matrixFor(v,matrix){
      matrix.makeRotationY(v.first?0:Math.PI);matrix.setPosition(v.x,.04,-v.z);
      hinge.makeRotationY(v.doorOpen?-Math.PI/2:0);hinge.setPosition(ICE_CREAM_VAN.rear,0,-ICE_CREAM_VAN.doorHalf);
      matrix.multiply(hinge);
    }
  });
  const batches=createStaticInstances(scene,{name:'ice-cream-van',boundsVisible,
    stateFor:v=>[v.x,v.z,v.first],keyFor:()=> 'van',assetFor:assets,
    matrixFor(v,matrix){matrix.makeRotationY(v.first?0:Math.PI);matrix.setPosition(v.x,.04,-v.z);}
  });
  return {beginFrame(frame){viewer=frame.player??viewer;batches.beginFrame(frame);doors.beginFrame(frame);vendors.beginFrame(frame);},draw(chunk){const van=riverIceCreamVan(chunk),items=van?[van]:[];batches.draw(chunk,items);doors.draw(chunk,items);vendors.draw(chunk,items);},dispose(){
    if(disposed)return;disposed=true;batches.dispose();doors.dispose();vendors.dispose();characters.dispose();
    const owned=[...(parts??[]),...(doorParts??[])];
    for(const part of owned)part.geometry.dispose();
    for(const material of new Set(owned.map(part=>part.material))){material.map?.dispose();material.dispose();}
    parts=doorParts=null;
  }};
}
