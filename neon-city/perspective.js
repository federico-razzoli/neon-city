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

export function drawWallTexture(ctx,points,vertices,texture,width,smooth=false){
  ctx.save();
  ctx.imageSmoothingEnabled=smooth;
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();ctx.clip();
  const columns=[...wallColumns(points,vertices,width)];
  for(let i=0;i<columns.length;i++){
    const {x,top,bottom}=columns[i];
    if(bottom.y<=top.y||bottom.v<=top.v)continue;
    const u=Math.max(0,Math.min(texture.width-1,top.u));
    // At oblique angles a screen column covers several texture columns.
    // Filter that footprint rather than skipping letters between single texels.
    const adjacent=columns[i+1]??columns[i-1];
    const span=smooth&&adjacent?Math.max(1,Math.abs(adjacent.top.u-top.u)):1;
    const left=smooth?Math.max(0,u-span/2):u;
    const sampleWidth=Math.min(span,texture.width-left);
    ctx.drawImage(texture,left,top.v,sampleWidth,bottom.v-top.v,x,top.y,1,bottom.y-top.y);
  }
  ctx.restore();
}

// A pitched (seated) camera tilts vertical walls on screen, so one screen
// column crosses several texture columns. Along a screen column, u/z, v/z and
// 1/z stay linear in screen y; split the column where u enters a new texel
// column, and draw each run axis-aligned, which is far cheaper than skewing.
export function* pitchedWallRuns(points,vertices,width,tolerance=.5){
  const start=Math.max(0,Math.ceil(Math.min(...points.map(p=>p.x))-.5));
  const end=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x))-.5));
  for(let x=start;x<end;x++){
    const center=x+.5,hits=[];
    for(let i=0;i<points.length;i++){
      const j=(i+1)%points.length,a=points[i],b=points[j];
      if(center<Math.min(a.x,b.x)||center>=Math.max(a.x,b.x))continue;
      const t=(center-a.x)/(b.x-a.x),va=vertices[i],vb=vertices[j];
      const w=(1-t)/va.z+t/vb.z;
      hits.push({y:a.y+(b.y-a.y)*t,w,uw:(1-t)*va.u/va.z+t*vb.u/vb.z,vw:(1-t)*va.v/va.z+t*vb.v/vb.z});
    }
    if(hits.length<2)continue;
    hits.sort((a,b)=>a.y-b.y);
    const top=hits[0],bottom=hits.at(-1);
    if(bottom.y-top.y<1e-9)continue;
    const at=s=>{
      const w=top.w+(bottom.w-top.w)*s;
      return {s,y:top.y+(bottom.y-top.y)*s,u:(top.uw+(bottom.uw-top.uw)*s)/w,v:(top.vw+(bottom.vw-top.vw)*s)/w};
    };
    // Screen positions where u crosses a whole texel boundary.
    const a=at(0),b=at(1),cuts=[0];
    for(let k=Math.floor(Math.min(a.u,b.u))+1;k<Math.max(a.u,b.u);k++){
      const s=(k*top.w-top.uw)/((bottom.uw-top.uw)-k*(bottom.w-top.w));
      if(s>0&&s<1)cuts.push(s);
    }
    cuts.push(1);cuts.sort((p,q)=>p-q);
    // Within a run, v is drawn linearly; halve the run until that is accurate.
    const runs=[];
    const split=(p,q,depth)=>{
      const middle=at((p.s+q.s)/2),drawn=p.y+(q.y-p.y)*(middle.v-p.v)/((q.v-p.v)||1e-12);
      if(depth<10&&Math.abs(drawn-middle.y)>tolerance){split(p,middle,depth+1);split(middle,q,depth+1);}
      else runs.push({x,top:p,bottom:q,column:Math.floor(middle.u)});
    };
    for(let i=0;i<cuts.length-1;i++)split(at(cuts[i]),at(cuts[i+1]),0);
    yield* runs;
  }
}

export function drawPitchedWallTexture(ctx,points,vertices,texture,width,smooth=false){
  ctx.save();
  ctx.imageSmoothingEnabled=smooth;
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();ctx.clip();
  for(const {x,top,bottom,column} of pitchedWallRuns(points,vertices,width)){
    const v0=Math.min(top.v,bottom.v),v1=Math.max(top.v,bottom.v);
    if(v1<=v0||bottom.y<=top.y)continue;
    const u=Math.max(0,Math.min(texture.width-1,column));
    // Walls behind an overhead view appear upside down; mirror those runs.
    if(top.v<=bottom.v)ctx.drawImage(texture,u,v0,1,v1-v0,x,top.y,1,bottom.y-top.y);
    else{ctx.save();ctx.translate(0,top.y+bottom.y);ctx.scale(1,-1);ctx.drawImage(texture,u,v0,1,v1-v0,x,top.y,1,bottom.y-top.y);ctx.restore();}
  }
  ctx.restore();
}
