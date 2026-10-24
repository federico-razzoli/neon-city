// Preserve the usual painter order, but use depth at the actual overlap for
// small detailed objects. Average depth can put a nearby wall over their tops.
export function orderSurfaces(faces){
  faces.sort((a,b)=>b.depth-a.depth);
  const details=[];
  const data=faces.map((f,i)=>{
    if(f.detail)details.push(i);
    if(!f.ps)return null;
    const p=f.ps;
    let plane;
    for(let j=1;j<p.length-1&&!plane;j++){
      const a=p[0],b=p[j],c=p[j+1],area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if(Math.abs(area)<1e-8)continue;
      const za=1/f.vs[0].z,zb=1/f.vs[j].z,zc=1/f.vs[j+1].z;
      const dx=((zb-za)*(c.y-a.y)-(zc-za)*(b.y-a.y))/area;
      const dy=((b.x-a.x)*(zc-za)-(c.x-a.x)*(zb-za))/area;
      plane={dx,dy,c:za-dx*a.x-dy*a.y};
    }
    return {p,plane,left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))};
  });
  const edges=faces.map(()=>[]);
  for(const i of details)for(let j=0;j<faces.length;j++){
    if(i===j||(faces[j].detail&&j<i))continue;
    const a=data[i],b=data[j];
    if(!a?.plane||!b?.plane||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top)continue;
    let overlap=a.p;
    const winding=b.p.reduce((sum,p,k)=>{const q=b.p[(k+1)%b.p.length];return sum+p.x*q.y-q.x*p.y;},0)>=0?1:-1;
    for(let k=0;k<b.p.length&&overlap.length;k++){
      const p=b.p[k],q=b.p[(k+1)%b.p.length];
      const distance=v=>winding*((q.x-p.x)*(v.y-p.y)-(q.y-p.y)*(v.x-p.x));
      const clipped=[];
      for(let n=0;n<overlap.length;n++){
        const u=overlap[n],v=overlap[(n+1)%overlap.length],du=distance(u),dv=distance(v);
        if(du>=0)clipped.push(u);
        if((du>=0)!==(dv>=0)){const t=du/(du-dv);clipped.push({x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t});}
      }
      overlap=clipped;
    }
    if(overlap.length<3)continue;
    const x=overlap.reduce((s,p)=>s+p.x,0)/overlap.length,y=overlap.reduce((s,p)=>s+p.y,0)/overlap.length;
    const delta=(a.plane.dx-b.plane.dx)*x+(a.plane.dy-b.plane.dy)*y+a.plane.c-b.plane.c;
    if(Math.abs(delta)<1e-9)continue;
    const far=delta>0?j:i,near=delta>0?i:j;
    edges[far].push(near);
  }
  const result=[],done=new Uint8Array(faces.length);
  // Visit dependencies only when needed, retaining the existing order elsewhere.
  const predecessors=faces.map(()=>[]);
  edges.forEach((targets,i)=>targets.forEach(j=>predecessors[j].push(i)));
  const visit=i=>{
    if(done[i])return;
    done[i]=1;
    for(const j of predecessors[i])visit(j);
    result.push(faces[i]);
  };
  for(let i=0;i<faces.length;i++)visit(i);
  return result;
}
// Outdoor terrain consists of horizontal planes below the camera. Wherever
// their projections overlap, the higher plane is nearer, regardless of the
// polygons' centres or the camera bearing. Keep decals above their base plane.
export function orderGroundSurfaces(faces){
  return faces.sort((a,b)=>a.elevation-b.elevation||b.depth-a.depth);
}
