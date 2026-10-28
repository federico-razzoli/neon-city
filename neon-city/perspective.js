/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

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
      hits.push({y:a.y+(b.y-a.y)*t,depth:1/inverseDepth,
        u:((1-t)*va.u/va.z+t*vb.u/vb.z)/inverseDepth,
        v:((1-t)*va.v/va.z+t*vb.v/vb.z)/inverseDepth});
    }
    if(hits.length<2)continue;
    hits.sort((a,b)=>a.y-b.y);
    yield {x,top:hits[0],bottom:hits.at(-1)};
  }
}

export const wallFog=depth=>Math.min(.94,Math.max(0,(depth-22)/135));

export function drawWallTexture(ctx,points,vertices,texture,width,smooth=false,continuousFog=false){
  ctx.save();
  ctx.imageSmoothingEnabled=smooth;
  // Building panels partition the integer columns by pixel centre. Clipping
  // those columns to fractional panel edges would expose the background.
  if(!continuousFog){
    ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();ctx.clip();
  }
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
    if(continuousFog){
      const fog=wallFog(top.depth);
      if(fog>0){ctx.fillStyle=`rgba(15,10,30,${fog})`;ctx.fillRect(x,top.y,1,bottom.y-top.y);}
    }
  }
  ctx.restore();
}

// A tilted wall needs perspective correction in both screen directions.
// Rasterise only its visible pixels, then composite once instead of issuing a
// Canvas draw for every crossed texel. Scratch storage and texture pixels are
// reused; texture canvases are immutable after their first draw.
const texturePixels=new WeakMap();
let pitchedSurface;
export function rasterizePitchedWall(points,vertices,texture,width,height,pixels,smooth=false,continuousFog=false){
  const left=Math.max(0,Math.ceil(Math.min(...points.map(p=>p.x))-.5));
  const right=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x))-.5));
  const top=Math.max(0,Math.ceil(Math.min(...points.map(p=>p.y))-.5));
  const bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p.y))-.5));
  if(right<=left||bottom<=top)return null;
  const tw=texture.width,th=texture.height,source=texture.data;
  // These three quantities are affine across the projected wall plane.
  let plane;
  for(let i=1;i<points.length-1&&!plane;i++){
    const a=points[0],b=points[i],c=points[i+1];
    const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y,det=dx*ey-ex*dy;
    if(Math.abs(det)<1e-10)continue;
    plane=['w','u','v'].map(k=>{
      const value=j=>(k==='w'?1:vertices[j][k])/vertices[j].z;
      const va=value(0),db=value(i)-va,dc=value(i+1)-va;
      const x=(db*ey-dc*dy)/det,y=(dc*dx-db*ex)/det;
      return {x,y,c:va-x*a.x-y*a.y};
    });
  }
  if(!plane)return null;
  const [w,u,v]=plane;
  for(let y=top;y<bottom;y++){
    // Clear the whole uploaded row, including the area outside the polygon.
    pixels.fill(0,(y*width+left)*4,(y*width+right)*4);
    const sy=y+.5;let start=Infinity,end=-Infinity;
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      if(sy<Math.min(a.y,b.y)||sy>=Math.max(a.y,b.y))continue;
      const x=a.x+(b.x-a.x)*(sy-a.y)/(b.y-a.y);
      start=Math.min(start,x);end=Math.max(end,x);
    }
    start=Math.max(left,Math.ceil(start-.5));end=Math.min(right,Math.ceil(end-.5));
    let iw=w.x*(start+.5)+w.y*sy+w.c,iu=u.x*(start+.5)+u.y*sy+u.c,iv=v.x*(start+.5)+v.y*sy+v.c;
    for(let x=start;x<end;x++,iw+=w.x,iu+=u.x,iv+=v.x){
      const offset=(y*width+x)*4;
      const tx=Math.max(0,Math.min(tw-1,iu/iw-(smooth ? .5 : 0))),ty=Math.max(0,Math.min(th-1,iv/iw-(smooth ? .5 : 0)));
      const ix=Math.floor(tx),iy=Math.floor(ty),a=(iy*tw+ix)*4;
      if(!smooth){
        pixels[offset]=source[a];pixels[offset+1]=source[a+1];pixels[offset+2]=source[a+2];pixels[offset+3]=source[a+3];
      }else{
        const b=(iy*tw+Math.min(tw-1,ix+1))*4,c=(Math.min(th-1,iy+1)*tw+ix)*4,d=(Math.min(th-1,iy+1)*tw+Math.min(tw-1,ix+1))*4;
        const fx=tx-ix,fy=ty-iy,weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy],indices=[a,b,c,d];
        const alpha=indices.reduce((sum,index,i)=>sum+source[index+3]*weights[i],0);
        pixels[offset+3]=alpha;
        for(let channel=0;channel<3;channel++)pixels[offset+channel]=alpha?indices.reduce((sum,index,i)=>sum+source[index+channel]*source[index+3]*weights[i],0)/alpha:0;
      }
      if(continuousFog&&iw<1/22){
        const fog=wallFog(1/iw);
        pixels[offset]+=(15-pixels[offset])*fog;
        pixels[offset+1]+=(10-pixels[offset+1])*fog;
        pixels[offset+2]+=(30-pixels[offset+2])*fog;
      }
    }
  }
  return {left,top,width:right-left,height:bottom-top};
}

export function drawPitchedWallTexture(ctx,points,vertices,texture,width,smooth=false,continuousFog=false){
  const height=ctx.canvas.height;
  if(!pitchedSurface||pitchedSurface.frame.width!==width||pitchedSurface.frame.height!==height){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    pitchedSurface={canvas,context,frame:context.createImageData(width,height)};
  }
  if(!texturePixels.has(texture))texturePixels.set(texture,texture.getContext('2d').getImageData(0,0,texture.width,texture.height));
  const {canvas,context,frame}=pitchedSurface;
  const bounds=rasterizePitchedWall(points,vertices,texturePixels.get(texture),width,height,frame.data,smooth,continuousFog);
  if(!bounds)return;
  const {left,top,width:w,height:h}=bounds;
  // Keep the source canvas tight: browsers may upload its entire backing store
  // when drawImage follows putImageData, even if only a small region changed.
  if(canvas.width!==w)canvas.width=w;
  if(canvas.height!==h)canvas.height=h;
  context.putImageData(frame,-left,-top,left,top,w,h);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(canvas,left,top);ctx.restore();
}
