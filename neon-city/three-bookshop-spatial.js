// SPDX-License-Identifier: AGPL-3.0-only
import {Box3,Vector3,Sphere,Raycaster,Mesh,BoxGeometry,CylinderGeometry,MeshBasicMaterial,DoubleSide} from './vendor/three/three.module.js';
import {BARTENDER_REPLY} from './pub-interior.js';
import {BOOKSHOP as B,BOOKSHOP_BOOKS,BOOK_CATEGORIES} from './midnite-interior.js';

// Gameplay +Z is reflected into Three.js -Z, as in the rendered room.
export function createThreeBookshopSpatial(){
  const cube=new BoxGeometry(1,1,1),cylinder=new CylinderGeometry(1,1,1,32),material=new MeshBasicMaterial({side:DoubleSide});
  const fixed=[],dynamic=[];
  function box(list,b,height,type,data,y=height/2){
    const mesh=new Mesh(cube,material);mesh.position.set(b.x+b.w/2,y,-b.z-b.d/2);mesh.scale.set(b.w,height,b.d);mesh.updateMatrixWorld(true);
    list.push({mesh,type,data,bounds:new Box3().setFromObject(mesh)});
  }
  function round(list,b,height,type,data,y=height/2,solid=true){
    const mesh=new Mesh(cylinder,material);mesh.position.set(b.x,y,-b.z);mesh.scale.set(b.radius,height,b.radius);mesh.updateMatrixWorld(true);
    list.push({mesh,type,data,center:new Vector3(b.x,0,-b.z),radius:b.radius,solid});
  }
  B.shelves.forEach((b,i)=>box(fixed,b,3.34,'reply',BOOK_CATEGORIES[i]));
  B.windowShelves.forEach(b=>box(fixed,b,1.35,'reply',"I SHOULDN'T TAKE THESE."));
  B.tables.forEach(b=>box(fixed,b,1));box(fixed,B.counter,1.28);
  B.chairs.forEach(b=>round(fixed,b,1.42,'chair',b));
  B.readingTables.forEach(b=>round(fixed,b,.68,undefined,b));
  box(fixed,{x:B.door.x-.85,z:0,w:1.7,d:.04},3,'exit');
  round(fixed,B.till,.65,'reply',"DON'T PLAY WITH THE TILL, PLEASE.",1.65,false);
  round(fixed,B.deskBook,.2,'reply',"A BOOK I'VE ALREADY READ.",1.4,false);
  function sync(life){
    dynamic.length=0;
    round(dynamic,{...B.bookseller,...life?.seller},2.4,'seller',null);
    for(const p of life?.people??[])round(dynamic,{...p,radius:.3},p.state==='reading'?1.9:2.4,p.book?'visitor':null,p);
    if(!life?.backpackTaken)round(dynamic,B.backpack,.8,'backpack',null,.4,false);
    for(const b of BOOKSHOP_BOOKS)if(!life||life.onDisplay(b))round(dynamic,b,.16,'book',b,1.08,false);
    for(const b of life?.visitorBooks??[])if(b.state==='reading')round(dynamic,{...B.readingTables[b.seat],radius:.3},.16,'leftBook',b,.76,false);
  }
  const position=new Vector3(),sphere=new Sphere(),other=new Sphere(),ray=new Raycaster();
  function move(player,dx,dz,staff=B.bookseller,people=[]){
    sync({seller:staff,people,backpackTaken:true,onDisplay:()=>false});
    const solids=[...fixed,...dynamic].filter(e=>e.solid!==false&&e.type!=='exit');
    let bumpedTable=false;
    const radius=.3,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    function clear(x,z){
      if(x<radius||z<radius||x>B.width-radius||z>B.depth-radius)return false;
      sphere.set(position.set(x,.5,-z),radius);
      return solids.every(e=>{
        if(e.bounds)return !e.bounds.intersectsSphere(sphere);
        other.set(other.center.set(e.center.x,.5,e.center.z),e.radius);
        if(!sphere.intersectsSphere(other))return true;
        if(B.readingTables.includes(e.data))bumpedTable=true;
        // Allow separation when a moving visitor has overlapped the player.
        return dynamic.includes(e)&&Math.hypot(x-e.center.x,z+e.center.z)>Math.hypot(player.x-e.center.x,player.z+e.center.z);
      });
    }
    for(let i=0;i<n;i++){if(dx&&clear(player.x+dx/n,player.z))player.x+=dx/n;if(dz&&clear(player.x,player.z+dz/n))player.z+=dz/n;}
    return bumpedTable;
  }
  function target(player,life){
    sync(life);
    const entries=[...fixed,...dynamic],lookup=new Map(entries.map(e=>[e.mesh,e])),meshes=entries.map(e=>e.mesh),hits=[];
    for(const height of [.6,1.08,1.4,1.65]){
      ray.set(position.set(player.x,height,-player.z),new Vector3(Math.sin(player.angle),0,-Math.cos(player.angle)));ray.near=0;ray.far=3.5;
      const hit=ray.intersectObjects(meshes,false)[0];
      if(!hit)continue;
      const e=lookup.get(hit.object),reach=e.type==='seller'?3.5:e.type==='exit'?1.8:e.type==='chair'?2:1.7;
      if(e.type&&hit.distance<=reach)hits.push({type:e.type,data:e.data,distance:hit.distance});
    }
    hits.sort((a,b)=>a.distance-b.distance);
    const hit=hits[0]??null;
    if(hit?.type==='seller'&&player.z>B.counter.z+B.counter.d)return {type:'reply',data:BARTENDER_REPLY};
    return hit;
  }
  return {move,target,dispose(){cube.dispose();cylinder.dispose();material.dispose();fixed.length=dynamic.length=0;}};
}
