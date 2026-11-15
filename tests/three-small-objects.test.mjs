import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../neon-city/vendor/three/three.module.js';
import {createThreePineCones} from '../neon-city/three-pine-cones.js';
import {createThreeFlowers} from '../neon-city/three-flowers.js';
import {createThreeNewspaperMachines} from '../neon-city/three-newspaper-machines.js';
import {pineConeGeometry} from '../neon-city/pine-cone-geometry.js';
import {newspaperGeometry} from '../neon-city/newspaper-geometry.js';
import {NEWSPAPER_LOOKS} from '../neon-city/newspaper-artwork.js';

const frame=chunks=>({city:{chunks:new Map(chunks.map(c=>[`${c.x},${c.z}`,c]))}});
const chunk=(x=0)=>({x,z:0,flowers:[],park:{cones:[]},newspaperMachines:[],droppedItems:[]});
function close(a,b,label){assert.ok(Math.abs(a-b)<2e-6,`${label}: ${a} vs ${b}`);}
function point(mesh,index,vertex){const matrix=new THREE.Matrix4();mesh.getMatrixAt(index,matrix);return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,vertex).applyMatrix4(matrix);}

test('cone instances share one WASM template and preserve transformed vertices, face orientation and original shading',()=>{
  const scene=new THREE.Scene(),cones=createThreePineCones(scene),c=chunk();
  try{
    for(const angle of [0,.2,1.5,3.14,5.7])for(const length of [.16,.24])for(const radius of [.055,.075]){
      const cone={x:2,z:3,ground:.085,length,radius,angle};c.park.cones=[cone];cones.beginFrame(frame([c]));cones.draw(c);
      const mesh=scene.children[0],source=pineConeGeometry(cone),geometry=mesh.geometry;
      const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
      let vertex=0;
      for(let k=0;k<source.length;k+=23){
        if(source[k+4]<0)continue;
        const normal=new THREE.Vector3().fromBufferAttribute(geometry.attributes.coneNormal,vertex).applyMatrix3(normalMatrix).normalize();
        const light=Math.max(0,normal.dot(new THREE.Vector3(.4466625002869186,.7444375004781977,.4962916669854651)));
        assert.equal(Math.min(4,Math.floor((.5*light+.25*normal.y+.25)*5)),source[k+4]);
        for(let i=1;i<source[k]-1;i++){
          const triangle=[point(mesh,0,vertex),point(mesh,0,vertex+1),point(mesh,0,vertex+2)];
          const expected=[0,i,i+1].map(j=>new THREE.Vector3(cone.x+source[k+5+j*3],cone.ground+source[k+6+j*3],-cone.z-source[k+7+j*3]));
          for(const p of triangle)assert.ok(expected.some(q=>p.distanceTo(q)<2e-6));
          assert.ok(new THREE.Vector3().subVectors(triangle[1],triangle[0]).cross(new THREE.Vector3().subVectors(triangle[2],triangle[0])).dot(normal)>0);
          vertex+=3;
        }
      }
      assert.equal(vertex,geometry.attributes.position.count);
    }
    const second=chunk(1);second.park.cones=[{...c.park.cones[0],x:65}];cones.beginFrame(frame([c,second]));cones.draw(c);cones.draw(second);
    assert.equal(scene.children[0].geometry,scene.children[1].geometry);assert.equal(scene.children[0].material.side,THREE.FrontSide);
  }finally{cones.dispose();}
});

test('flowers preserve petal colors, unscaled center height and share persistent geometry across chunks',()=>{
  const scene=new THREE.Scene(),flowers=createThreeFlowers(scene),a=chunk(),b=chunk(1);
  a.flowers=[{x:1,z:2,size:.24,color:'#aaa0d1',ground:.09,centre:true}];b.flowers=[{x:65,z:2,size:.36,color:'#d38aa9',ground:.065,centre:false}];
  try{
    flowers.beginFrame(frame([a,b]));flowers.draw(a);flowers.draw(b);
    const petals=scene.children.filter(m=>m.instanceColor),center=scene.children.find(m=>!m.instanceColor);
    assert.equal(petals.length,2);assert.equal(petals[0].geometry,petals[1].geometry);
    const color=new THREE.Color();petals[0].getColorAt(0,color);assert.equal(color.getHexString(),'aaa0d1');
    close(point(center,0,0).y,.091,'flower center height');
    const version=petals[0].instanceMatrix.version,colorVersion=petals[0].instanceColor.version;
    flowers.beginFrame(frame([a,b]));flowers.draw(a);flowers.draw(b);
    assert.equal(petals[0].instanceMatrix.version,version);assert.equal(petals[0].instanceColor.version,colorVersion);
    a.flowers[0].taken=true;flowers.beginFrame(frame([a,b]));flowers.draw(a);flowers.draw(b);assert.ok(!scene.children.includes(petals[0]));
    flowers.beginFrame(frame([b]));flowers.draw(b);assert.equal(scene.children.length,1);
  }finally{flowers.dispose();assert.equal(scene.children.length,0);}
});

test('newspaper machines instance all directions from a canonical template with preserved artwork, dimensions and colors',()=>{
  const scene=new THREE.Scene(),calls=[];const machines=createThreeNewspaperMachines(scene,{textureFor:paper=>{calls.push(paper);return {width:160,height:224};}}),c=chunk();
  try{
    c.newspaperMachines=[0,1,2,3].map(side=>({x:side*3,z:4,side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85,paper:'NEON NEWS'}));
    machines.beginFrame(frame([c]));machines.draw(c);
    assert.equal(scene.children.length,2);const body=scene.children.find(m=>!m.material.map),front=scene.children.find(m=>m.material.map);
    assert.equal(body.count,4);assert.equal(front.count,4);assert.deepEqual(calls,['NEON NEWS']);
    for(let i=0;i<4;i++){
      const machine=c.newspaperMachines[i],source=newspaperGeometry(machine);
      for(let f=0;f<11;f++)for(let v=0;v<4;v++){
        const k=(f*4+v)*5,expected=new THREE.Vector3(machine.x+source[k],source[k+1],-machine.z-source[k+2]);
        const mesh=f===10?front:body;
        assert.ok(Array.from({length:mesh.geometry.attributes.position.count},(_,j)=>point(mesh,i,j)).some(p=>p.distanceTo(expected)<2e-6),`side ${i}, face ${f}, vertex ${v}`);
      }
    }
    const color=new THREE.Color().fromBufferAttribute(body.geometry.attributes.color,0);assert.equal(color.getHexString(),new THREE.Color(NEWSPAPER_LOOKS['NEON NEWS'].body[0]).getHexString());
    const version=body.instanceMatrix.version;machines.beginFrame(frame([c]));machines.draw(c);assert.equal(body.instanceMatrix.version,version);
    const other=chunk(1);other.newspaperMachines=[{...c.newspaperMachines[0],x:66}];machines.beginFrame(frame([c,other]));machines.draw(c);machines.draw(other);
    assert.equal(scene.children.filter(m=>!m.material.map)[1].geometry,body.geometry);assert.equal(calls.length,1);
  }finally{machines.dispose();assert.equal(scene.children.length,0);}
});

test('pickups, drops, edits, culling and chunk unloading update only instance buffers and release ownership safely',()=>{
  const scene=new THREE.Scene();let visible=true;const cones=createThreePineCones(scene,{boundsVisible:()=>visible}),c=chunk();
  const cone={x:1,z:2,length:.2,radius:.06,angle:.2};c.park.cones=[cone];
  try{
    cones.beginFrame(frame([c]));cones.draw(c);const mesh=scene.children[0],geometry=mesh.geometry,version=mesh.instanceMatrix.version;
    let freed=0;geometry.addEventListener('dispose',()=>freed++);
    cones.beginFrame(frame([c]));cones.draw(c);assert.equal(mesh.instanceMatrix.version,version);
    visible=false;cones.beginFrame(frame([c]));cones.draw(c);assert.equal(mesh.visible,false);assert.equal(mesh.instanceMatrix.version,version);
    visible=true;cone.taken=true;c.droppedItems=[{...cone,item:{id:'pine-cone'},room:'street',x:10,ground:3}];
    cones.beginFrame(frame([c]));cones.draw(c);assert.equal(mesh.count,1);assert.ok(mesh.instanceMatrix.version>version);close(point(mesh,0,0).x,10+geometry.attributes.position.getX(0)*.2*Math.cos(.2)+geometry.attributes.position.getZ(0)*.06*Math.sin(.2),'dropped cone position');
    cones.beginFrame(frame([]));assert.equal(scene.children.length,0);assert.equal(freed,0);
    cones.dispose();assert.equal(freed,1);
  }finally{cones.dispose();}
});

test('indoor drops use shared instances with room filtering, no outdoor objects, and independent buffer lifetime',async()=>{
  const {createThreeInteriorScene}=await import('../neon-city/three-interior-scene.js');
  const room=createThreeInteriorScene({name:'test',actorsFor:()=>[]});
  const c=chunk();c.park.cones=[{x:0,z:0,length:1,radius:1,angle:0}];c.flowers=[{x:0,z:0,size:1}];
  const drops=[
    {item:{id:'pine-cone'},room:'room-a',x:1,z:2,length:.22,radius:.07,angle:.2,ground:3},
    {item:{id:'pine-cone'},room:'room-a',x:2,z:2,length:.16,radius:.055,angle:1.5,ground:3},
    {item:{id:'flower',color:'#aaa0d1',size:.24},room:'room-a',x:3,z:2,ground:3},
    {item:{id:'flower',color:'#d38aa9',size:.36},room:'room-a',x:4,z:2,ground:3},
    {item:{id:'pine-cone'},room:'room-b',x:9,z:9,length:1,radius:1,angle:0}
  ];c.droppedItems=drops;
  const f={...frame([c]),player:{x:1,z:0,angle:0},eye:4.65,itemRoom:'room-a'};
  try{
    room.update(f);const meshes=room.scene.children.filter(m=>m.isInstancedMesh);
    assert.equal(meshes.length,3);assert.ok(meshes.every(m=>m.count===2));assert.ok(meshes.every(m=>!m.material.polygonOffset));
    const versions=meshes.map(m=>m.instanceMatrix.version);f.player.angle=2;room.update(f);assert.deepEqual(meshes.map(m=>m.instanceMatrix.version),versions);
    const flower=meshes.find(m=>m.instanceColor),color=new THREE.Color();flower.getColorAt(0,color);assert.equal(color.getHexString(),'aaa0d1');
    const center=meshes.find(m=>m.name.startsWith('flowers:')&&!m.instanceColor);close(point(center,0,0).y,3.001,'indoor flower height');
    let released=0;for(const m of meshes)m.geometry.addEventListener('dispose',()=>released++);
    c.droppedItems=drops.slice(1);room.update(f);assert.equal(meshes.find(m=>m.name.startsWith('pine-cones:')).count,1);assert.equal(released,0);
    f.itemRoom='room-b';room.update(f);assert.equal(room.scene.children.filter(m=>m.isInstancedMesh).length,1);assert.equal(released,0);
    room.dispose();assert.equal(released,3);
  }finally{room.dispose();}
});
