// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {PUB,pubChairs,PUB_DOOR_LETTERING} from './pub-interior.js?v=bar-taps-1';

const glassVertex=`
  varying vec3 vNormal;varying vec3 vEye;
  void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vEye=-p.xyz;gl_Position=projectionMatrix*p;}
`;
const glassFragment=`
  uniform vec3 tint;varying vec3 vNormal;varying vec3 vEye;
  void main(){
    vec3 n=normalize(vNormal),eye=normalize(vEye);
    float rim=pow(1.0-abs(dot(n,eye)),2.5);
    float shine=pow(max(0.0,dot(reflect(-normalize(vec3(-.4,.8,1.0)),n),eye)),28.0);
    gl_FragColor=vec4(mix(tint,vec3(1.0),rim*.45+shine*.7),.16+rim*.26+shine*.35);
    #include <colorspace_fragment>
  }
`;

// All room surfaces, furniture and drinks use native Three.js primitives.
// Opaque repeated parts are instanced; glass meshes remain individually sorted.
export function createThreePubObjects(){
  const group=new THREE.Group(),resources=new Set(),geometries=new Map(),materials=new Map(),batches=new Map(),categories=new Map();
  const own=value=>{resources.add(value);return value;};
  const geometry=(key,create)=>{if(!geometries.has(key))geometries.set(key,own(create()));return geometries.get(key);};
  const paint=color=>{if(!materials.has(color))materials.set(color,own(new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false})));return materials.get(color);};
  const category=name=>{if(!categories.has(name)){const node=new THREE.Group();node.name=`pub-${name}`;categories.set(name,node);group.add(node);}return categories.get(name);};
  const point=(x,y,z)=>new THREE.Vector3(x,y,-z),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  function add(kind,geo,material,matrix){
    const key=`${kind}:${geo.uuid}:${Array.isArray(material)?material.map(m=>m.uuid).join(','):material.uuid}`;
    if(!batches.has(key))batches.set(key,{kind,geo,material,matrices:[]});batches.get(key).matrices.push(matrix);
  }
  function box(kind,x,y,z,w,h,d,color,roof=color){
    const geo=geometry('box',()=>new THREE.BoxGeometry(1,1,1)),side=paint(color),top=paint(roof);
    add(kind,geo,color===roof?side:[side,side,top,side,side,side],new THREE.Matrix4().compose(point(x+w/2,y+h/2,z+d/2),rotation.identity(),scale.set(w,h,d)));
  }
  function plane(kind,x,y,z,w,h,color,yaw=0){
    const geo=geometry('plane',()=>new THREE.PlaneGeometry(1,1));
    rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    add(kind,geo,paint(color),new THREE.Matrix4().compose(point(x,y,z),rotation,scale.set(w,h,1)));
  }
  function floor(kind,x,y,z,w,d,color){
    const geo=geometry('plane',()=>new THREE.PlaneGeometry(1,1));rotation.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
    add(kind,geo,paint(color),new THREE.Matrix4().compose(point(x+w/2,y,z+d/2),rotation,scale.set(w,d,1)));
  }
  function cylinder(kind,x,y,z,r,h,color,roof=color,top=r){
    const ratio=top/r,geo=geometry(`cylinder:${ratio}`,()=>new THREE.CylinderGeometry(ratio,1,1,16,1));
    add(kind,geo,color===roof?paint(color):[paint(color),paint(roof),paint(color)],new THREE.Matrix4().compose(point(x,y+h/2,z),rotation.identity(),scale.set(r,h,r)));
  }
  function rod(kind,a,b,r,color){
    const start=point(a.x,a.y,a.z),end=point(b.x,b.y,b.z),direction=end.clone().sub(start);
    const geo=geometry('rod',()=>new THREE.CylinderGeometry(1,1,1,8));
    rotation.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
    add(kind,geo,paint(color),new THREE.Matrix4().compose(start.add(end).multiplyScalar(.5),rotation,scale.set(r,direction.length(),r)));
  }
  // Floor, ceiling, perimeter walls, and the open arch between bar and lounge.
  floor('structure',0,0,0,PUB.width,PUB.depth,'#70513c');floor('structure',0,PUB.height,0,PUB.width,PUB.depth,'#31262a');
  const wall=(x,z,w,yaw=0)=>{plane('structure',x,.5,z,w,1,'#51362e',yaw);plane('structure',x,3,z,w,4,'#876b53',yaw);};
  wall(4.15,0,8.3);wall(19.85,0,20.3);wall(15,18,30);wall(0,9,18,Math.PI/2);wall(30,9,18,Math.PI/2);
  for(const b of PUB.walls){box('structure',b.x,0,b.z,b.w,1,b.d,'#51362e');box('structure',b.x,1,b.z,b.w,4,b.d,'#876b53');}
  box('structure',17.8,3.2,6,.4,1.8,4,'#51362e');
  plane('doors',9,1.45,.005,1.4,2.9,'#38262a');plane('doors',9,3.95,0,1.4,2.1,'#876b53');box('doors',9.45,1,.012,.12,.18,.025,'#e9c47e');
  for(const [door,words] of [[PUB.staffDoor,['STAFF','ONLY']],[PUB.toiletDoor,['TOILET']]]){
    box('doors',door.x-.78,0,door.z-.035,1.56,3,.035,'#a08057');box('doors',door.x-.7,0,door.z-.06,1.4,2.9,.025,'#49332d');
    box('doors',door.x+.48,1.05,door.z-.12,.12,.18,.06,'#d9b671');box('doors',door.x-.25,2.065,door.z-.08,.5,.32,.02,'#24232b');
    words.forEach((word,line)=>{
      const size=word.length>5?.0125:.0145,left=door.x-(word.length*6-1)*size/2;
      [...word].forEach((char,letter)=>PUB_DOOR_LETTERING[char].forEach((row,j)=>[...row].forEach((cell,k)=>{
        if(cell==='1')plane('doors',left+(letter*6+k+.5)*size,(words.length===1?2.27:2.336)-line*.133-(j+.5)*size,door.z-.085,size,size,'#eee0bb');
      })));
    });
  }
  for(const b of PUB.tables){
    cylinder('tables',b.x,0,b.z,.65,.12,'#3c2a21');cylinder('tables',b.x,.12,b.z,.18,.8,'#674531','#876443');
    cylinder('tables',b.x,.92,b.z,b.radius,.17,'#755133','#b78b5c');cylinder('tables',b.x,1.09,b.z,b.radius-.08,.012,'#a7794e');
  }
  for(const chair of pubChairs()){
    const {x,z,w,d,side}=chair;
    for(const dx of [.06,w-.14])for(const dz of [.06,d-.14])box('chairs',x+dx,0,z+dz,.08,.6,.08,'#51382b');
    box('chairs',x,.55,z,w,.12,d,'#805b3b','#a47a4e');const back=z+(side<0?0:d-.08);
    for(const dx of [.04,w-.12])box('chairs',x+dx,.6,back,.08,.75,.08,'#67472e');box('chairs',x+.04,1.05,back,w-.08,.22,.08,'#805b3b');
  }
  const b=PUB.bar;box('bar',b.x,0,b.z,b.w,1.15,b.d,'#61412e');
  const margin=.15,gap=.15,count=Math.round(b.w/1.1),panelWidth=(b.w-2*margin-(count-1)*gap)/count;
  for(let i=0;i<count;i++){const x=b.x+margin+i*(panelWidth+gap);box('bar',x,.15,b.z-.015,panelWidth,.78,.035,'#95653e');box('bar',x+.08,.23,b.z-.04,panelWidth-.16,.62,.04,'#6a4531');}
  box('bar',b.x,1.15,b.z-.1,b.w+.1,.15,b.d+.2,'#9e7047','#cea16c');box('bar',b.x,.2,b.z-.3,b.w,.07,.07,'#bca26b');
  for(const x of [2,6.3,10.6,14.8])box('backbar',x,.5,17.35,.15,2.8,.55,'#65452f');
  const glass=tint=>own(new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(tint)}},vertexShader:glassVertex,fragmentShader:glassFragment,transparent:true,depthWrite:false,toneMapped:false}));
  const bottleGlass=['#6f9b77','#b18a5b','#729a99'].map(glass),pintGlass=glass('#d0e5e4');
  for(const y of [.8,1.65,2.5]){
    box('backbar',PUB.shelves.x,y,PUB.shelves.z,PUB.shelves.w,.12,PUB.shelves.d,'#9c704b','#c09564');
    for(let i=0;i<28;i++){
      const x=2.35+i*.44,z=17.55,base=y+.12,r=.095+(i%2)*.015,h=.27+(i%3)*.025;
      const geo=geometry(`bottle:${i%6}`,()=>new THREE.LatheGeometry([[r*.9,0],[r,.025],[r,h],[.04,h+.075],[.04,h+.2]].map(([x,y])=>new THREE.Vector2(x,y)),12));
      const shell=new THREE.Mesh(geo,bottleGlass[i%3]);shell.name='pub-bottle-glass';shell.position.copy(point(x,base,z));category('bottles').add(shell);
      cylinder('bottles',x,base+.015,z,r-.009,h*.83,['#314735','#624020','#314b46'][i%3]);
      cylinder('bottles',x,base+h+.2,z,.045,.035,'#bda477');
      const label=geometry(`bottle-label:${r}`,()=>new THREE.CylinderGeometry(r+.003,r+.003,.11,12,1,true));
      add('bottles',label,paint('#d6c7a0'),new THREE.Matrix4().makeTranslation(x,base+.145,-z));
      box('bottles',x-.015,base+.1,z-r-.008,.03,.07,.009,'#8a4b38');
    }
  }
  for(const {x} of PUB.taps){
    box('taps',x-.24,1.3,13.7,.48,.025,.55,'#44484a','#a7a9a7');
    for(let i=0;i<5;i++)box('taps',x+.175-i*.09,1.325,13.74,.025,.01,.48,'#363a3a');
    cylinder('taps',x,1.3,13.65,.14,.07,'#c4a76b');cylinder('taps',x,1.37,13.65,.065,.48,'#ba995d','#e0cb95');
    box('taps',x-.06,1.76,13.63,.12,.12,.35,'#d4bd83');cylinder('taps',x,1.67,13.98,.045,.12,'#d4bd83');
    cylinder('taps',x,1.88,13.9,.035,.14,'#c7a973');cylinder('taps',x,2.02,13.9,.065,.2,'#312a2a','#6a513a');
  }
  for(const {x,z} of PUB.chandeliers){
    const base=PUB.height-1.35,brass='#96713d',highlight='#c09a59';cylinder('chandeliers',x,PUB.height-.09,z,.22,.09,brass);
    for(let y=base+.45;y<PUB.height-.12;y+=.13){
      const alongX=Math.round(y*100)%2===0,points=Array.from({length:8},(_,i)=>({x:x+(alongX?Math.cos(i*Math.PI/4)*.055:0),y:y+Math.sin(i*Math.PI/4)*.085,z:z+(alongX?0:Math.cos(i*Math.PI/4)*.055)}));
      for(let i=0;i<8;i++)rod('chandeliers',points[i],points[(i+1)%8],.014,highlight);
    }
    cylinder('chandeliers',x,base-.18,z,.1,.18,brass,highlight,.2);cylinder('chandeliers',x,base,z,.23,.2,brass,highlight,.12);cylinder('chandeliers',x,base+.2,z,.07,.3,brass);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,at=(r,y)=>({x:x+Math.cos(a)*r,y:base+y,z:z+Math.sin(a)*r}),curve=[[.1,.08],[.35,-.06],[.65,-.1],[.85,-.03],[1,.15],[1,.3]];
      for(let j=1;j<curve.length;j++)rod('chandeliers',at(...curve[j-1]),at(...curve[j]),.035,brass);
      const tip=at(1,.3);cylinder('chandeliers',tip.x,tip.y,tip.z,.16,.05,brass,highlight);cylinder('chandeliers',tip.x,tip.y+.05,tip.z,.065,.26,'#dfcda4','#f2e2bb');cylinder('chandeliers',tip.x,tip.y+.31,tip.z,.055,.13,'#f4bb64','#ffe5aa',0);
    }
  }
  for(const {kind,geo,material,matrices} of batches.values()){
    const mesh=own(new THREE.InstancedMesh(geo,material,matrices.length));mesh.name=`pub-native-${kind}`;
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();category(kind).add(mesh);
  }
  const liquid=[paint('#bd873d'),paint('#492c22')],foam=paint('#eee0b0');
  const pintShape=geometry('pint',()=>new THREE.LatheGeometry([[.1,0],[.103,.04],[.13,.315]].map(([x,y])=>new THREE.Vector2(x,y)),12));
  const beerShape=geometry('beer',()=>new THREE.CylinderGeometry(.12,.094,.25,12));
  const foamShape=geometry('foam',()=>new THREE.CylinderGeometry(.115,.119,.025,12));
  const rimShape=geometry('glass-rim',()=>new THREE.TorusGeometry(.13,.004,4,12));
  const baseShape=geometry('glass-base',()=>new THREE.CylinderGeometry(.1,.1,.008,12));
  const bubbleShape=geometry('foam-bubble',()=>new THREE.TorusGeometry(.008,.0015,3,6));
  function createPint(name){
    const node=new THREE.Group();node.name=name;
    const shell=new THREE.Mesh(pintShape,pintGlass);shell.name='pint-glass';node.add(shell);
    const beer=new THREE.Mesh(beerShape,liquid[0]);beer.name='pint-liquid';beer.position.y=.14;node.add(beer);
    const head=new THREE.Mesh(foamShape,foam);head.name='pint-foam';head.position.y=.2775;node.add(head);
    for(const [shape,y] of [[rimShape,.315],[baseShape,.004]]){const mesh=new THREE.Mesh(shape,pintGlass);mesh.position.y=y;if(shape===rimShape)mesh.rotation.x=Math.PI/2;node.add(mesh);}
    for(let i=0;i<3;i++){const mesh=new THREE.Mesh(bubbleShape,paint('#f8ebc9'));mesh.rotation.x=-Math.PI/2;mesh.position.set((i-1)*.03,.2905,(i%2)*.025-.01);node.add(mesh);}
    return {group:node,set(x,y,z,dark){node.position.set(x,y,-z);beer.material=liquid[dark?1:0];}};
  }
  let disposed=false;
  return {group,createPint,dispose(){if(disposed)return;disposed=true;for(const resource of resources)resource.dispose();resources.clear();group.clear();}};
}
