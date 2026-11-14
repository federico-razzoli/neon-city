// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {vehicleTexture} from './vehicle-textures.js';

const palette=[null,'#34445d','#657187','#10101b','#29a99c','#f3e5bc','#fff1cf','#deded1',
  '#e5e9ee','#ffffff','#354653','#e8edf3','#f1f3f6','#edf0f4','#bcc9d4','#d8e2e9',
  '#f4f5f7','#c63448','#aebbc7','#c9d0d6','#bdcad5','#e4edf5','#aebfcd','#14151c',
  '#242630','#455765','#171820','#30313a','#191a22','#252630','#b8bdc5','#a4aab3',
  '#34343d','#ffcb57','#ffe29a','#fff0b8'];

// Scene-owned native car models. All solid parts originate in Three.js
// primitives; their triangles are combined so each car needs few draw calls.
export function createThreeCarModels({textureFor=vehicleTexture}={}){
  const cube=new THREE.BoxGeometry(1,1,1),ring=new THREE.RingGeometry(.127,.15,24);
  const rim=new THREE.CylinderGeometry(.15,.15,.04,24,1,true);
  const models=new Map(),textures=new Map(),colors=new Map();
  const solid=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false});
  function textureMaterial(id){
    if(!textures.has(id)){
      const image=textureFor(id),texture=new THREE.CanvasTexture(image);
      texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
      texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
      const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false,
        polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      textures.set(id,{image,texture,material});
    }
    return textures.get(id);
  }
  function get(car){
    const type=['hippie-van','mercedes','taxi'].includes(car.type)?car.type:'car';
    const axis=car.axis?1:0,dir=car.dir>0?1:-1,key=`${type}:${axis}:${dir}:${car.color}`;
    if(models.has(key))return {key,group:models.get(key).group};
    const group=new THREE.Group(),positions=[],rgb=[],owned=[];
    const tint=index=>{
      const color=palette[index]??car.color;
      if(!colors.has(color))colors.set(color,new THREE.Color(color));
      return colors.get(color);
    };
    function emit(geometry,map,color,roof=color){
      const p=geometry.attributes.position,n=geometry.attributes.normal,indices=geometry.index;
      for(let t=0;t<indices.count;t+=3)for(const offset of [0,2,1]){
        const i=indices.getX(t+offset),v=map(p.getX(i),p.getY(i),p.getZ(i));
        positions.push(v.x,v.y,-v.z);
        const c=tint(n.getY(i)>.99?roof:color);rgb.push(c.r,c.g,c.b);
      }
    }
    const point=(across,along,y)=>({x:axis?along*dir:across,y,z:axis?across:along*dir});
    function box(x,y,z,w,h,d,color,roof=color){
      emit(cube,(a,b,c)=>({x:x+(a+.5)*w,y:y+(b+.5)*h,z:z+(c+.5)*d}),color,roof);
    }
    function part(across,along,y,w,l,h,color,roof=color){
      const px=axis?along*dir:across,pz=axis?across:along*dir,width=axis?l:w,depth=axis?w:l;
      box(px-width/2,y,pz-depth/2,width,h,depth,color,roof);
    }
    function artwork(points,id,uvs){
      const {image,material}=textureMaterial(id),geometry=new THREE.PlaneGeometry(1,1);
      // PlaneGeometry orders vertices top-left, top-right, bottom-left, bottom-right.
      const order=[3,2,0,1],p=geometry.attributes.position,uv=geometry.attributes.uv;
      order.forEach((source,i)=>{const v=points[source];p.setXYZ(i,v.x,v.y,-v.z);uv.setXY(i,uvs[source][0]/image.width,1-uvs[source][1]/image.height);});
      geometry.computeBoundingSphere();owned.push(geometry);group.add(new THREE.Mesh(geometry,material));
    }
    function panel(left,along,bottom,right,top,id,width,height){
      artwork([point(left,along,bottom),point(right,along,bottom),point(right,along,top),point(left,along,top)],id,[[0,height],[width,height],[width,0],[0,0]]);
    }
    const w=axis?4.7:2.1,d=axis?2.1:4.7,x=-w/2,z=-d/2;
    if(type==='hippie-van'){
      part(0,0,.25,2.1,4.7,1.85,4,5);part(0,0,2.1,2.02,4.58,.18,5,6);
      for(const side of [-1,1]){
        const left=side*dir*(axis?-1:1)*1.05,along=side*2.351;
        panel(left,along,.25,-left,2.1,side===1?1:2,192,192);
        const a=side*1.051,start=side*(axis?-1:1)*2.35;
        artwork([point(a,start,.25),point(a,-start,.25),point(a,-start,2.1),point(a,start,2.1)],3,[[0,192],[384,192],[384,0],[0,0]]);
        part(0,side*2.38,.29,2.1,.12,.14,7);
      }
    }else if(type==='mercedes'){
      part(0,0,.25,2.1,4.7,.65,8,9);part(0,-.3,.9,1.82,2.55,.56,10,11);part(0,-.3,1.46,1.86,2.58,.09,12,9);
      for(const side of [-1,1]){
        for(const a of [-1.54,-.35,.94])part(side*.92,a,.9,.07,.09,.57,13);
        part(side*1.055,0,.73,.04,4.25,.055,14);
        part(side*.94,-.85,.85,.055,.23,.045,15);part(side*.94,.45,.85,.055,.23,.045,15);
        part(side*.98,.85,1.01,.22,.26,.13,16);part(side*.73,-2.37,.53,.46,.06,.22,17);
      }
      part(0,-2.38,.3,2.02,.1,.12,18);part(0,2.38,.3,2.02,.1,.12,18);
      const left=dir*(axis?-1:1)*.5;panel(left,2.401,.43,-left,.86,4,192,96);
      part(0,2.16,.9,.14,.14,.035,20);part(0,2.16,.935,.035,.035,.1,21);
      for(const along of [2.14,2.18]){
        emit(ring,(a,b)=>point(a,along,1.18+b),21);
        for(let i=0;i<3;i++){
          const angle=Math.PI/2+i*Math.PI*2/3,dx=Math.cos(angle),dy=Math.sin(angle);
          // A thin box makes each of the three emblem spokes a native solid.
          emit(cube,(a,b,c)=>point(dx*(a+.5)*.127-dy*b*.024,along+c*.002,1.18+dy*(a+.5)*.127+dx*b*.024),21);
        }
      }
      emit(rim,(a,b,c)=>point(a,2.16+b,1.18+c),22);
    }else if(type==='taxi'){
      part(0,0,.25,2.1,4.7,.78,23,24);part(0,-.3,1.03,1.85,2.9,.8,25,26);part(0,-.3,1.83,1.98,3.05,.16,26,27);
      for(const side of [-1,1]){
        for(const a of [-1.7,-.3,1.1])part(side*.94,a,1.02,.1,.13,.82,28);
        part(side*1.03,-1.55,.55,.16,1.05,.28,29);part(side*1.03,1.5,.55,.16,1.05,.28,29);
        part(side*.96,-.8,.91,.08,.28,.06,30);part(side*.96,.5,.91,.08,.28,.06,30);
      }
      part(0,2.36,.42,1.02,.08,.48,31);
      for(const a of [-.36,-.18,0,.18,.36])part(a,2.41,.47,.055,.03,.37,32);
      part(0,-2.38,.29,1.95,.12,.12,31);part(0,2.38,.29,1.95,.12,.12,31);
      part(0,.5,1.99,.82,.36,.28,33,34);
      for(const side of [-1,1]){const left=side*dir*(axis?-1:1)*.41;panel(left,.5+side*.181,1.99,-left,2.27,5,160,56);}
    }else{
      box(x,.25,z,w,.65,d,0);box(x+(axis?1:.15),.9,z+(axis?.15:1),axis?2.5:1.8,.6,axis?1.8:2.5,1,2);
    }
    for(const side of [-1,1])for(const offset of [.8,3.5]){
      if(axis)box(x+offset,.12,side*1.05-.1,.7,.55,.2,3);
      else box(side*1.05-.1,.12,z+offset,.2,.55,.7,3);
    }
    const frontX=axis?dir*2.36:0,frontZ=axis?0:dir*2.36;
    if(type!=='hippie-van')for(const side of [-1,1])box(frontX+(axis?-.04:side*.7-.2),.52,frontZ+(axis?side*.7-.2:-.04),axis?.08:.4,.2,axis?.4:.08,35);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));geometry.computeBoundingSphere();
    owned.push(geometry);group.add(new THREE.Mesh(geometry,solid));
    models.set(key,{group,geometries:owned});return {key,group};
  }
  return {get,dispose(){
    for(const {geometries} of models.values())for(const geometry of geometries)geometry.dispose();models.clear();
    for(const {texture,material} of textures.values()){texture.dispose();material.dispose();}textures.clear();
    cube.dispose();ring.dispose();rim.dispose();solid.dispose();
  }};
}

export function createThreeTraffic(scene,options){
  const models=createThreeCarModels(options),actors=new Map();
  return {
    beginFrame(){for(const actor of actors.values())actor.seen=false;},
    draw(car,{base,slope}){
      const asset=models.get(car);let actor=actors.get(car);
      if(!actor||actor.key!==asset.key){
        if(actor)scene.remove(actor.group);
        const group=asset.group.clone(true);group.matrixAutoUpdate=false;group.name='street-car';
        actor={key:asset.key,group,seen:true};actors.set(car,actor);scene.add(group);
      }
      const angle=car.turn?.angle??0,c=Math.cos(angle),s=Math.sin(angle);
      // Preserve the game's bridge-height shear followed by its junction turn.
      actor.group.matrix.set(c,0,-s,car.x,0,1,-slope,base,s,0,c,-car.z,0,0,0,1);
      actor.group.matrixWorldNeedsUpdate=true;actor.seen=true;
    },
    endFrame(){for(const [car,actor] of actors)if(!actor.seen){scene.remove(actor.group);actors.delete(car);}},
    dispose(){for(const actor of actors.values())scene.remove(actor.group);actors.clear();models.dispose();}
  };
}
