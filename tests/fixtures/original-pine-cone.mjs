/* SPDX-License-Identifier: AGPL-3.0-only */
// Original renderer retained for geometry, lighting and visibility comparisons.
const visible=(viewer,p,n)=>(viewer.x-p.x)*n.x+(viewer.y-p.y)*n.y+(viewer.z-p.z)*n.z>0;
const l=Math.hypot(.45,.75,-.5),LIGHT={x:.45/l,y:.75/l,z:-.5/l};
const shade=(n,colors)=>{const t=.5*Math.max(0,n.x*LIGHT.x+n.y*LIGHT.y+n.z*LIGHT.z)+.5*(n.y*.5+.5);return colors[Math.min(colors.length-1,Math.floor(t*colors.length))];};
const PARK_LAYERS={grass:.085};
const CONE=['#2b1d17','#3b291e','#4f3626','#654530','#7a5739'];
// A fallen cone: an egg-shaped spindle lying on the lawn, wide near its stalk
// and pointed at the tip, with overlapping scales suggested by faceted shading.
export function originalPineCone(c,face,viewer){
  // Its widest ring has a flat facet underneath, which rests on the grass.
  const ax=Math.cos(c.angle),az=Math.sin(c.angle),y=(c.ground??PARK_LAYERS.grass)+c.radius*Math.cos(Math.PI/6),sides=6;
  const rings=[[-.5,.45],[-.25,1],[.15,.8],[.5,0]].map(([u,scale])=>Array.from({length:sides},(_,i)=>{
    const a=i*2*Math.PI/sides,r=c.radius*scale;
    // Across the cone axis: one horizontal direction and up.
    return {x:c.x+ax*u*c.length-az*Math.cos(a)*r,y:y+Math.sin(a)*r,z:c.z+az*u*c.length+ax*Math.cos(a)*r};
  }));
  const polys=[rings[0].slice().reverse()];
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<sides;i++){
    const n=(i+1)%sides,a=rings[k],b=rings[k+1];
    polys.push(k===rings.length-2?[a[i],a[n],b[i]]:[a[i],a[n],b[n],b[i]]);
  }
  const centre={x:c.x,y,z:c.z};
  for(const v of polys){
    const e1={x:v[1].x-v[0].x,y:v[1].y-v[0].y,z:v[1].z-v[0].z},e2={x:v[2].x-v[0].x,y:v[2].y-v[0].y,z:v[2].z-v[0].z};
    let n={x:e1.y*e2.z-e1.z*e2.y,y:e1.z*e2.x-e1.x*e2.z,z:e1.x*e2.y-e1.y*e2.x};
    const m=v.reduce((s,p)=>({x:s.x+p.x/v.length,y:s.y+p.y/v.length,z:s.z+p.z/v.length}),{x:0,y:0,z:0});
    if(n.x*(m.x-centre.x)+n.y*(m.y-centre.y)+n.z*(m.z-centre.z)<0)n={x:-n.x,y:-n.y,z:-n.z};
    const length=Math.hypot(n.x,n.y,n.z);
    if(length<1e-12||!visible(viewer,v[0],n))continue;
    face(v,shade({x:n.x/length,y:n.y/length,z:n.z/length},CONE));
  }
}

