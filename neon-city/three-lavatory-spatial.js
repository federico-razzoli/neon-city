// SPDX-License-Identifier: AGPL-3.0-only
import {Box3,Sphere,Vector3,Line3,Raycaster,Mesh,BoxGeometry,CylinderGeometry,MeshBasicMaterial,DoubleSide} from './vendor/three/three.module.js';
import {LAVATORY,CUBICLE} from './lavatory.js?v=staff-room-1';

export function createThreeLavatorySpatial(kind='lavatory'){
  const cubicle=kind==='cubicle',layout=cubicle?CUBICLE:LAVATORY;
  const geometry=new BoxGeometry(1,1,1),cylinder=new CylinderGeometry(1,1,1,24),material=new MeshBasicMaterial({side:DoubleSide});
  const entries=[],solids=[];
  function box(b,height,type,data,solid=true){
    const mesh=new Mesh(geometry,material);mesh.position.set(b.x+b.w/2,height/2,-b.z-b.d/2);mesh.scale.set(b.w,height,b.d);mesh.updateMatrixWorld(true);
    const entry={mesh,bounds:new Box3().setFromObject(mesh),type,data};entries.push(entry);if(solid)solids.push(entry);return entry;
  }
  box({x:-.04,z:0,w:.04,d:layout.depth},layout.height);
  box({x:layout.width,z:0,w:.04,d:layout.depth},layout.height);
  box({x:0,z:-.04,w:layout.width,d:.04},layout.height);
  box({x:0,z:layout.depth,w:layout.width,d:.04},layout.height);
  function door(x,z,halfWidth,type,data){box({x:x-halfWidth,z:z-.03,w:halfWidth*2,d:.06},2.4,type,data,false);}
  door(layout.door.x,0,layout.door.halfWidth,'exit');
  if(cubicle)box(CUBICLE.toilet,.94,'toilet',CUBICLE.seat);
  else{
    LAVATORY.sinks.forEach((sink,i)=>box(sink,1.2,'sink',i));
    LAVATORY.cubicles.forEach(c=>door(c.x,LAVATORY.depth,c.halfWidth,'cubicle',c));
  }
  const walkerMesh=new Mesh(cylinder,material);walkerMesh.scale.set(.32,2.4,.32);
  const ray=new Raycaster(),body=new Sphere(new Vector3(),.18),segment=new Line3();
  function blocksPerson(start,end,person,clearance=.5){
    if(!person)return false;
    const origin=new Vector3(start.x,0,-start.z),finish=new Vector3(end.x,0,-end.z),center=new Vector3(person.x,0,-person.z);
    if(origin.distanceTo(center)<clearance&&finish.distanceTo(center)>origin.distanceTo(center))return false;
    segment.set(origin,finish);
    return segment.closestPointToPoint(center,true,new Vector3()).distanceTo(center)<clearance;
  }
  function move(player,dx,dz,walker){
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
    function clear(x,z){
      if(x<.18||z<.18||x>layout.width-.18||z>layout.depth-.18)return false;
      body.center.set(x,.6,-z);
      if(solids.some(entry=>entry.bounds.intersectsSphere(body)))return false;
      if(walker&&blocksPerson(player,{x,z},walker))return false;
      return true;
    }
    for(let i=0;i<count;i++){if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;}
  }
  function target(player,walker){
    const candidates=entries.map(e=>e.mesh),lookup=new Map(entries.map(e=>[e.mesh,e]));
    if(walker){walkerMesh.position.set(walker.x,1.2,-walker.z);walkerMesh.updateMatrixWorld(true);candidates.push(walkerMesh);}
    const hits=[];
    for(const height of [.6,1.05,1.65]){
      ray.set(new Vector3(player.x,height,-player.z),new Vector3(Math.sin(player.angle),0,-Math.cos(player.angle)));ray.far=2;
      const hit=ray.intersectObjects(candidates,false)[0],entry=hit&&lookup.get(hit.object);
      if(entry?.type)hits.push({...entry,distance:hit.distance});
    }
    hits.sort((a,b)=>a.distance-b.distance);const hit=hits[0];
    return hit?{type:hit.type,data:hit.data}:null;
  }
  return {move,target,blocksPerson,dispose(){geometry.dispose();cylinder.dispose();material.dispose();entries.length=solids.length=0;}};
}
