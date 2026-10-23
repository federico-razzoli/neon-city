// Vertical walls have constant depth along each screen column. Interpolate
// reciprocal depth across the screen, then recover texture coordinates.
export function* wallColumns(points,vertices,width){
  const start=Math.max(0,Math.ceil(Math.min(...points.map(p=>p.x))-.5));
  const end=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x))-.5));
  for(let x=start;x<end;x++){
    const center=x+.5,hits=[];
    for(let i=0;i<points.length;i++){
      const j=(i+1)%points.length,a=points[i],b=points[j];
      if(center<Math.min(a.x,b.x)||center>=Math.max(a.x,b.x))continue;
      const t=(center-a.x)/(b.x-a.x),va=vertices[i],vb=vertices[j];
      const inverseDepth=(1-t)/va.z+t/vb.z;
      hits.push({y:a.y+(b.y-a.y)*t,
        u:((1-t)*va.u/va.z+t*vb.u/vb.z)/inverseDepth,
        v:((1-t)*va.v/va.z+t*vb.v/vb.z)/inverseDepth});
    }
    if(hits.length<2)continue;
    hits.sort((a,b)=>a.y-b.y);
    yield {x,top:hits[0],bottom:hits.at(-1)};
  }
}

export function drawWallTexture(ctx,points,vertices,texture,width){
  ctx.save();
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();ctx.clip();
  for(const {x,top,bottom} of wallColumns(points,vertices,width)){
    if(bottom.y<=top.y||bottom.v<=top.v)continue;
    const u=Math.max(0,Math.min(texture.width-1,top.u));
    ctx.drawImage(texture,u,top.v,1,bottom.v-top.v,x,top.y,1,bottom.y-top.y);
  }
  ctx.restore();
}
