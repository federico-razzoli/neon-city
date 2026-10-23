// Flat-colour interior polygons use per-pixel depth, not average face distance.
// Interpolating inverse camera depth keeps intersecting screen projections correct.
export class DepthRenderer{
  constructor(ctx,width,height){
    this.ctx=ctx;this.width=width;this.height=height;
    this.frame=ctx.createImageData(width,height);
    this.depth=new Float64Array(width*height);this.colors=new Map();
  }
  render(faces,background='#30252a'){
    const pixels=this.frame.data,w=this.width,h=this.height;
    const rgb=color=>{
      if(!this.colors.has(color))this.colors.set(color,[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)));
      return this.colors.get(color);
    };
    const bg=rgb(background);
    this.depth.fill(0);
    for(let i=0;i<pixels.length;i+=4){pixels[i]=bg[0];pixels[i+1]=bg[1];pixels[i+2]=bg[2];pixels[i+3]=255;}
    for(const f of faces){
      const color=rgb(f.color);
      for(let j=1;j<f.ps.length-1;j++){
        const a=f.ps[0],b=f.ps[j],c=f.ps[j+1];
        const area=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
        if(Math.abs(area)<1e-10)continue;
        const left=Math.max(0,Math.ceil(Math.min(a.x,b.x,c.x)-.5)),right=Math.min(w-1,Math.floor(Math.max(a.x,b.x,c.x)-.5));
        const top=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y)-.5)),bottom=Math.min(h-1,Math.floor(Math.max(a.y,b.y,c.y)-.5));
        const za=1/f.vs[0].z,zb=1/f.vs[j].z,zc=1/f.vs[j+1].z;
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
          const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/area;
          const v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/area;
          const t=1-u-v;
          if(u< -1e-10||v< -1e-10||t< -1e-10)continue;
          const depth=u*za+v*zb+t*zc,index=y*w+x;
          if(depth<=this.depth[index])continue;
          this.depth[index]=depth;
          const offset=index*4;pixels[offset]=color[0];pixels[offset+1]=color[1];pixels[offset+2]=color[2];
        }
      }
    }
    this.ctx.putImageData(this.frame,0,0);
  }
}
