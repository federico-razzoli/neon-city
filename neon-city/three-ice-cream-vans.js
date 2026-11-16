// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {riverIceCreamVan} from './world.js';
import {ICE_CREAM_VAN,ICE_CREAM_VENDOR,iceCreamVanLocal} from './ice-cream-vans.js';
import {createThreeCharacterCards} from './three-character-cards.js';
import {createStaticInstances} from './three-static-instances.js';

// One shared model and sign per street scene; chunk instances own only transforms.
export function createThreeIceCreamVans(scene,{boundsVisible}={}){
  let parts=null,doorParts=null,cabParts=null,disposed=false;
  const cabGlass=new THREE.MeshBasicMaterial({color:'#729fa9',side:THREE.DoubleSide,toneMapped:false});
  const characters=createThreeCharacterCards();
  let viewer={x:0,z:0,angle:0};
  function assets(){
    if(parts)return parts;
    const positions=[],colors=[],glassPositions=[],transform=new THREE.Matrix4(),point=new THREE.Vector3();
    let cabShading=false,glass=false;
    function add(geometry,x,y,z,color,rotation=0){
      transform.makeRotationX(rotation);transform.setPosition(x,y,z);
      const p=geometry.attributes.position,index=geometry.index,tint=new THREE.Color(color);
      for(let i=0;i<(index?.count??p.count);i++){
        const j=index?index.getX(i):i;point.fromBufferAttribute(p,j).applyMatrix4(transform);
        if(glass){glassPositions.push(point.x,point.y,point.z);continue;}
        positions.push(point.x,point.y,point.z);const normal=geometry.attributes.normal;
        const shade=cabShading&&normal? .78+.18*Math.max(0,normal.getY(j))+.08*Math.abs(normal.getZ(j)):1;
        colors.push(tint.r*shade,tint.g*shade,tint.b*shade);
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
    // Contrasting upholstery and face shading make the small cab readable from the street.
    cabShading=true;
    box(2,.405,0,1.3,.12,2.05,'#647779');
    box(2,2.19,0,1.3,.07,2.05,'#fff1cd');
    box(2.64,1.05,0,.12,1.3,2.05,'#64c8c5');
    glass=true;box(2.66,1.88,0,.025,.5,1.67,'#274958');glass=false;
    for(const z of [-.96,.96])box(2.63,1.89,z,.09,.68,.12,'#fff1cd');
    for(const z of [-.52,.52]){
      // Cream edging, warm seat inserts, separate headrests and visible metal runners.
      box(1.93,.72,z,.57,.18,.62,'#eee0b9');
      box(1.95,.82,z,.47,.035,.48,'#ba7955');
      box(1.66,1.03,z,.14,.64,.62,'#eee0b9');
      box(1.74,1.08,z,.035,.43,.47,'#ba7955');
      for(const dz of [-.14,0,.14]){
        box(1.95,.841,z+dz,.4,.008,.012,'#e8b887');
        box(1.761,1.08,z+dz,.008,.36,.012,'#e8b887');
      }
      for(const dz of [-.12,.12])box(1.66,1.39,z+dz,.025,.19,.025,'#becdce');
      box(1.66,1.51,z,.17,.2,.4,'#c98e65');
      for(const dz of [-.22,.22])box(1.96,.55,z+dz,.48,.08,.045,'#bdcbca');
      box(1.86,.49,z,.26,.1,.38,'#354b53');
      box(2.22,.48,z,.35,.025,.49,'#273b44');
      for(const dx of [-.1,0,.1])box(2.22+dx,.497,z,.018,.009,.42,'#647779');
    }
    // A pale dashboard fascia separates instruments and controls from the footwell.
    box(2.4,1.35,0,.25,.2,1.84,'#cbd4bf');
    box(2.4,1.46,0,.29,.035,1.88,'#405c65');
    box(2.255,1.36,-.52,.025,.16,.43,'#263c49');
    for(const [z,radius] of [[-.41,.055],[-.59,.055]]){
      const dial=new THREE.CylinderGeometry(radius,radius,.014,16);dial.rotateZ(Math.PI/2);
      add(dial,2.232,1.37,z,'#f3eacb');
      box(2.222,1.385,z,.008,.042,.009,'#bf604e');
    }
    box(2.255,1.35,0,.025,.1,.2,'#304954');
    box(2.235,1.37,0,.015,.035,.14,'#a7d8bc');
    for(const z of [-.065,.065]){
      const knob=new THREE.CylinderGeometry(.02,.02,.022,8);knob.rotateZ(Math.PI/2);
      add(knob,2.23,1.32,z,'#e6d9b8');
    }
    for(const z of [-.7,.78])for(let i=0;i<3;i++)box(2.252,1.34+i*.025,z,.012,.01,.1,'#344b54');
    box(2.252,1.29,.43,.012,.012,.35,'#708a8b');
    box(2.23,1.32,.43,.04,.025,.09,'#eee0b9');
    // A thicker rim, three silver spokes and a horn distinguish the steering wheel.
    const column=new THREE.CylinderGeometry(.035,.035,.24,8);column.rotateZ(Math.PI/2);
    add(column,2.22,1.3,-.52,'#788f92');
    const wheel=new THREE.TorusGeometry(.19,.027,8,20);wheel.rotateY(Math.PI/2);
    add(wheel,2.08,1.35,-.52,'#263b46');
    for(const rotation of [0,Math.PI*2/3,Math.PI*4/3])
      add(new THREE.BoxGeometry(.025,.18,.025),2.08,1.35+Math.cos(rotation)*.085,-.52+Math.sin(rotation)*.085,'#c7d5d0',rotation);
    const horn=new THREE.CylinderGeometry(.055,.055,.035,12);horn.rotateZ(Math.PI/2);
    add(horn,2.06,1.35,-.52,'#e7d8ae');
    for(const z of [-.43,-.63])box(2.43,.65,z,.045,.06,.1,'#202e37');
    box(2.05,.49,0,.19,.07,.2,'#364e57');
    box(2.05,.7,0,.045,.4,.045,'#b4c6c3');
    add(new THREE.SphereGeometry(.065,10,8),2.05,.92,0,'#e4c99c');
    cabShading=false;
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
    for(let i=1;i<glassPositions.length;i+=3)glassPositions[i]*=ICE_CREAM_VAN.heightScale;
    const windows=new THREE.BufferGeometry();windows.setAttribute('position',new THREE.Float32BufferAttribute(glassPositions,3));windows.computeBoundingSphere();
    parts=[{geometry,material:body},{geometry:sign,material:lettering},{geometry:windows,material:cabGlass}];return parts;
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
  function cabDoorAssets(){
    if(cabParts)return cabParts;
    const positions=[],colors=[],glassPositions=[];
    let glass=false;
    function box(x,y,z,w,h,d,tint){
      const g=new THREE.BoxGeometry(w,h,d),p=g.attributes.position,index=g.index,color=new THREE.Color(tint);
      for(let i=0;i<index.count;i++){
        const j=index.getX(i);(glass?glassPositions:positions).push(p.getX(j)+x,(p.getY(j)+y)*ICE_CREAM_VAN.heightScale,p.getZ(j)+z);if(!glass)colors.push(color.r,color.g,color.b);
      }
      g.dispose();
    }
    box(-.6,1.05,0,1.2,1.3,.065,'#64c8c5');
    glass=true;box(-.6,1.89,0,.98,.48,.035,'#274958');glass=false;
    for(const x of [-1.17,-.03])box(x,1.89,0,.06,.63,.065,'#fff1cd');
    box(-.6,2.19,0,1.2,.07,.065,'#fff1cd');
    box(-.6,1.62,0,1.2,.07,.065,'#fff1cd');
    for(const z of [-.065,.065])box(-.93,1.19,z,.23,.08,.06,'#40545e');
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();
    const windows=new THREE.BufferGeometry();windows.setAttribute('position',new THREE.Float32BufferAttribute(glassPositions,3));windows.computeBoundingSphere();
    cabParts=[{geometry,material:new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false})},{geometry:windows,material:cabGlass}];return cabParts;
  }
  const cabHinge=new THREE.Matrix4();
  const cabDoors=[-1,1].map(side=>createStaticInstances(scene,{name:`ice-cream-cab-door-${side}`,boundsVisible,
    stateFor:v=>[v.x,v.z,v.first,!!v.cabDoorOpen?.[side]],keyFor:()=> 'cab-door',assetFor:cabDoorAssets,
    matrixFor(v,matrix){
      matrix.makeRotationY(v.first?0:Math.PI);matrix.setPosition(v.x,.04,-v.z);
      cabHinge.makeRotationY(v.cabDoorOpen?.[side]?side*Math.PI/2:0);cabHinge.setPosition(2.6,0,side*1.025);
      cabHinge.scale(new THREE.Vector3(1,1,side));matrix.multiply(cabHinge);
    }
  }));
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
  return {beginFrame(frame){
    const seated=Boolean(frame.playerSeat?.cabVan);
    if(cabGlass.transparent!==seated){cabGlass.transparent=seated;cabGlass.opacity=seated ? .22 : 1;cabGlass.depthWrite=!seated;cabGlass.needsUpdate=true;}
    viewer=frame.player??viewer;batches.beginFrame(frame);doors.beginFrame(frame);vendors.beginFrame(frame);for(const door of cabDoors)door.beginFrame(frame);},draw(chunk){const van=riverIceCreamVan(chunk),items=van?[van]:[];batches.draw(chunk,items);doors.draw(chunk,items);vendors.draw(chunk,items);for(const door of cabDoors)door.draw(chunk,items);},dispose(){
    if(disposed)return;disposed=true;batches.dispose();doors.dispose();vendors.dispose();characters.dispose();for(const door of cabDoors)door.dispose();
    const owned=[...(parts??[]),...(doorParts??[]),...(cabParts??[])];
    for(const part of owned)part.geometry.dispose();
    for(const material of new Set(owned.map(part=>part.material))){material.map?.dispose();material.dispose();}
    parts=doorParts=cabParts=null;
  }};
}
