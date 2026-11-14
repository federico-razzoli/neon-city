// SPDX-License-Identifier: AGPL-3.0-only
import {Box3,Vector3,Raycaster,Mesh,BoxGeometry,CylinderGeometry,MeshBasicMaterial,DoubleSide,Sphere} from './vendor/three/three.module.js';
import {PUB,pubChairs} from './pub-interior.js?v=bar-taps-1';

// Gameplay coordinates have +Z forward; Three.js has reflected Z.
// Solid volumes describe furniture rather than the old expanded clearance zones.
export function createThreePubSpatial(){
  const geometry=new BoxGeometry(1,1,1),cylinder=new CylinderGeometry(1,1,1,32),material=new MeshBasicMaterial({side:DoubleSide});
  const fixed=[],targets=[],dynamic=[],people=new Map();
  function box(list,b,height,type,data){
    const mesh=new Mesh(geometry,material);mesh.position.set(b.x+b.w/2,height/2,-b.z-b.d/2);mesh.scale.set(b.w,height,b.d);mesh.updateMatrixWorld(true);
    const entry={mesh,type,data,bounds:new Box3().setFromObject(mesh)};list.push(entry);return entry;
  }
  function round(list,x,z,r,height,type,data){
    const mesh=new Mesh(cylinder,material);mesh.position.set(x,height/2,-z);mesh.scale.set(r,height,r);mesh.updateMatrixWorld(true);
    const entry={mesh,type,data,center:new Vector3(x,0,-z),radius:r};list.push(entry);return entry;
  }
  for(const b of PUB.walls)box(fixed,b,PUB.height);
  box(fixed,PUB.bar,1.3);box(fixed,PUB.shelves,3,'bottles');
  PUB.tables.forEach((t,index)=>round(fixed,t.x,t.z,t.radius,1.1,'table',index));
  const chairs=pubChairs();for(const chair of chairs)box(fixed,chair,1.35,'chair',chair);
  for(const [type,door] of [['exit',PUB.door],['toilet',PUB.toiletDoor],['staff',PUB.staffDoor]])box(targets,{x:door.x-.7,z:door.z-.03,w:1.4,d:.06},2.8,type);
  // The table edge beside a seat belongs to that seat for use and bump replies.
  // The middle and opposite edge of the table do not inherit the seat.
  function tableChair(entry,point){
    if(entry.type!=='table')return null;
    let nearest=null,distance=1.4375;
    for(const chair of chairs){
      if(chair.tableIndex!==entry.data)continue;
      const gap=Math.hypot(point.x-chair.x-chair.w/2,-point.z-chair.z-chair.d/2);
      if(gap<distance){nearest=chair;distance=gap;}
    }
    return nearest;
  }
  const ray=new Raycaster(),sphere=new Sphere(),personSphere=new Sphere(),position=new Vector3();
  function sync(patrons,walker,beer=PUB.barBeer){
    dynamic.length=0;
    function person(key,x,z,r,height,type,data,y=height/2){
      let entry=people.get(key);
      if(!entry){entry=round([],x,z,r,height,type,data);people.set(key,entry);}
      entry.data=data;entry.center.set(x,0,-z);entry.mesh.position.set(x,y,-z);entry.mesh.updateMatrixWorld(true);dynamic.push(entry);
    }
    person('bartender',PUB.bartender.x,PUB.bartender.z,.32,2.4,'bartender');
    for(const chair of chairs)if(patrons[chair.tableIndex]?.[chair.seat]!=null)person(`seat-${chair.tableIndex}-${chair.seat}`,chair.x+.4,chair.z+.4,.32,1.9,'patron',chair);
    if(walker)person('walker',walker.x,walker.z,.32,2.4,'walker');
    // Small counter objects have wider interaction volumes for forgiving aim.
    // These are targeting proxies only; movement colliders stay unchanged.
    person('beer',beer.x,beer.z,beer.radius+.18,.32,'beer',null,1.46);
    PUB.taps.forEach((tap,i)=>person(`tap-${i}`,tap.x,tap.z,tap.radius+.2,.6,'tap',null,1.6));
  }
  function move(player,dx,dz,patrons,walker,bumpedSeats=[]){
    sync(patrons,walker);let bumped=false;
    const solids=[...fixed,...dynamic.filter(e=>['bartender','patron','walker'].includes(e.type))];
    // A compact body, with substeps shorter than its radius to prevent tunnelling.
    const radius=.18,count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
    function clear(x,z){
      if(x<radius||z<radius||x>PUB.width-radius||z>PUB.depth-radius)return false;
      position.set(x,.8,-z);sphere.set(position,radius);
      for(const entry of solids){
        const hit=entry.bounds?entry.bounds.intersectsSphere(sphere):sphere.intersectsSphere(personSphere.set(personSphere.center.set(entry.center.x,.8,entry.center.z),entry.radius));
        if(!hit)continue;
        if(!entry.bounds&&Math.hypot(player.x-entry.center.x,player.z+entry.center.z)<radius+entry.radius&&Math.hypot(x-entry.center.x,z+entry.center.z)>Math.hypot(player.x-entry.center.x,player.z+entry.center.z))continue;
        const nearby=entry.type==='chair'?entry.data:tableChair(entry,position);
        const chair=nearby&&patrons[nearby.tableIndex]?.[nearby.seat]!=null?nearby:entry.type==='patron'?entry.data:null;
        if(chair&&!bumpedSeats.includes(chair))bumpedSeats.push(chair);
        if(chair||entry.type==='bartender'||entry.type==='walker')bumped=true;
        return false;
      }return true;
    }
    for(let i=0;i<count;i++){if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;}
    return bumped;
  }
  function target(player,patrons,walker,beer){
    sync(patrons,walker,beer);
    const entries=[...fixed,...targets,...dynamic],lookup=new Map(entries.map(e=>[e.mesh,e]));
    const hits=[];
    // Hand/seat and eye rays hit object volumes; taps and beer include aim padding.
    for(const height of [.6,1.45,1.65]){
      ray.set(new Vector3(player.x,height,-player.z),new Vector3(Math.sin(player.angle),0,-Math.cos(player.angle)));ray.far=height===1.65?3.5:2;
      const hit=ray.intersectObjects(entries.map(e=>e.mesh),false)[0];
      if(hit){
        const entry=lookup.get(hit.object),chair=tableChair(entry,hit.point);
        if(entry.type&&(entry.type==='bartender'||hit.distance<=2))hits.push({...entry,...(chair?{type:'chair',data:chair}:{}),distance:hit.distance});
      }
    }
    hits.sort((a,b)=>a.distance-b.distance);
    const hit=hits[0];
    if(hit?.type==='chair'&&(patrons[hit.data.tableIndex]?.[hit.data.seat]!=null||(walker?.chair?.tableIndex===hit.data.tableIndex&&walker?.chair?.seat===hit.data.seat)))return null;
    return hit?{type:hit.type,chair:hit.data}:null;
  }
  return {move,target,dispose(){geometry.dispose();cylinder.dispose();material.dispose();fixed.length=targets.length=dynamic.length=0;people.clear();}};
}
