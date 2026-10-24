import {BLOCK,PARK_PATH_WIDTH,RIVER_SIGN,mod,pathDistance} from './world.js?v=talk-13';

// Ground terrain is painted in order of elevation, so each layer sits above
// the one it must cover: the footpath always paints over the lawn and its decals.
export const PARK_LAYERS={grass:.085,decal:.09,path:.1,pathEdge:.105};

// A ribbon following the footpath, between two signed offsets from its centre.
function ribbon(path,face,inner,outer,y,color){
  const side=path.map((p,i)=>{
    const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z);
    const nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
    return [{x:p.x+nx*inner,y,z:p.z+nz*inner},{x:p.x+nx*outer,y,z:p.z+nz*outer}];
  });
  for(let i=1;i<side.length;i++)face([side[i-1][0],side[i][0],side[i][1],side[i-1][1]],color);
}

export function drawParkGround(chunk,{quad,face}){
  const {path}=chunk.park,x=chunk.x*BLOCK,z=chunk.z*BLOCK,half=PARK_PATH_WIDTH/2;
  quad(x+14,PARK_LAYERS.grass,z+14,36,36,'#345841');
  // A low kerb frames the lawn.
  for(const edge of [14,49.7]){
    quad(x+14,PARK_LAYERS.decal,z+edge,36,.3,'#5b5867');
    quad(x+edge,PARK_LAYERS.decal,z+14,.3,36,'#5b5867');
  }
  // Address-based tufts and flowers stay fixed while the block is cached.
  const scatter=n=>mod(Math.sin(chunk.x*127.1+chunk.z*311.7+n*74.7)*43758.5453,1);
  const petals=['#d38aa9','#d9c47b','#aaa0d1','#d9d3c5'];
  for(let i=0;i<40;i++){
    const fx=x+15.5+scatter(i*3)*33,fz=z+15.5+scatter(i*3+1)*33;
    if(pathDistance(path,fx,fz)<half+.8)continue;
    if(i%3){quad(fx,PARK_LAYERS.decal,fz,.9,.3,i%2?'#2b4b37':'#3e6649');continue;}
    const size=.24+scatter(i*3+2)*.12,color=petals[i%petals.length];
    quad(fx-size/2,PARK_LAYERS.decal,fz-size/6,size,size/3,color);
    quad(fx-size/6,PARK_LAYERS.decal,fz-size/2,size/3,size,color);
  }
  ribbon(path,face,-half,half,PARK_LAYERS.path,'#93704f');
  for(const s of [-1,1])ribbon(path,face,s*(half-.18),s*half,PARK_LAYERS.pathEdge,'#634a38');
}

const visible=(viewer,p,n)=>(viewer.x-p.x)*n.x+(viewer.y-p.y)*n.y+(viewer.z-p.z)*n.z>0;
// Moonlight from above and the north-east; undersides stay dark.
const LIGHT=(()=>{const l={x:.45,y:.75,z:-.5},n=Math.hypot(l.x,l.y,l.z);return {x:l.x/n,y:l.y/n,z:l.z/n};})();
const shade=(n,colors)=>{
  const t=.5*Math.max(0,n.x*LIGHT.x+n.y*LIGHT.y+n.z*LIGHT.z)+.5*(n.y*.5+.5);
  return colors[Math.min(colors.length-1,Math.floor(t*colors.length))];
};

// Tapered prism between two rings; each side is drawn only while it faces the
// viewer, so a closed shape never shows its far side.
function band(face,viewer,t,y0,r0,y1,r1,colors,{sides=8,bottom=true,top=true}={}){
  const ring=(y,r,a)=>({x:t.x+Math.cos(a)*r,y,z:t.z+Math.sin(a)*r});
  for(let i=0;i<sides;i++){
    const a0=i*2*Math.PI/sides,a1=a0+2*Math.PI/sides,mid=(a0+a1)/2;
    const p0=ring(y0,r0,a0),p1=ring(y0,r0,a1),p2=ring(y1,r1,a1),p3=ring(y1,r1,a0);
    const n={x:Math.cos(mid)*(y1-y0),y:(r0-r1)*Math.cos(Math.PI/sides),z:Math.sin(mid)*(y1-y0)},length=Math.hypot(n.x,n.y,n.z);
    if(!visible(viewer,p0,n))continue;
    face(r1?[p0,p1,p2,p3]:[p0,p1,p2],shade({x:n.x/length,y:n.y/length,z:n.z/length},colors));
  }
  const cap=(y,r,color)=>face(Array.from({length:sides},(_,i)=>ring(y,r,i*2*Math.PI/sides)),color);
  if(bottom&&viewer.y<y0)cap(y0,r0,colors[0]);
  if(top&&r1&&viewer.y>y1)cap(y1,r1,colors.at(-1));
}

const BARK=['#2a1f27','#35272c','#423133','#4d3a39'];
const PINE=['#122a24','#163228','#1b3a2d','#214432','#284e38'];
// Stacked, non-intersecting tiers, each narrower than the one below.
const TIERS=[[3,3.6,6.6,1.5],[6.6,3,10,1.2],[10,2.4,13.2,.9],[13.2,1.8,16,.6],[16,1.15,18,0]];

function tree(t,face,viewer){
  const s=t.scale;
  band(face,viewer,t,0,t.radius,TIERS[0][0]*s,.3*s,BARK,{sides:6,top:false});
  for(const [y0,r0,y1,r1] of TIERS)band(face,viewer,t,y0*s,r0*s,y1*s,r1*s,PINE);
}

// A box aligned with the bench: u runs along the seat, v towards its back.
function benchBox(face,viewer,b,u0,u1,v0,v1,y0,y1,color,top=color){
  const p=(u,v,y)=>({x:b.x+b.tx*u+b.nx*v,y,z:b.z+b.tz*u+b.nz*v});
  const sides=[
    [[u0,v0],[u0,v1],{x:-b.tx,z:-b.tz}],[[u1,v1],[u1,v0],{x:b.tx,z:b.tz}],
    [[u1,v0],[u0,v0],{x:-b.nx,z:-b.nz}],[[u0,v1],[u1,v1],{x:b.nx,z:b.nz}]
  ];
  for(const [[ua,va],[ub,vb],n] of sides){
    const a=p(ua,va,y0);
    if(!visible(viewer,a,{x:n.x,y:0,z:n.z}))continue;
    face([a,p(ub,vb,y0),p(ub,vb,y1),p(ua,va,y1)],color);
  }
  if(viewer.y>y1)face([p(u0,v0,y1),p(u1,v0,y1),p(u1,v1,y1),p(u0,v1,y1)],top);
}

function bench(b,face,viewer){
  benchBox(face,viewer,b,-1,1,-.3,.3,.42,.5,'#6b4a3f','#80594a');
  benchBox(face,viewer,b,-1,1,.2,.3,.56,.98,'#6b4a3f','#80594a');
  for(const end of [-1.08,1]){
    benchBox(face,viewer,b,end,end+.08,-.3,.3,0,.5,'#232230');
    benchBox(face,viewer,b,end,end+.08,.2,.3,.5,.98,'#232230');
  }
}

const CONE=['#2b1d17','#3b291e','#4f3626','#654530','#7a5739'];
// A fallen cone: an egg-shaped spindle lying on the lawn, wide near its stalk
// and pointed at the tip, with overlapping scales suggested by faceted shading.
function pineCone(c,face,viewer){
  // Its widest ring has a flat facet underneath, which rests on the grass.
  const ax=Math.cos(c.angle),az=Math.sin(c.angle),y=PARK_LAYERS.grass+c.radius*Math.cos(Math.PI/6),sides=6;
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

const SIGN_POST=['#1d2230','#272d3d','#323a4c','#3e475b'];
const SIGN_BOARD='#1f5bb5',SIGN_EDGE='#123a78',SIGN_TEXT='#ffffff';
export const RIVER_SIGN_TEXTURE={width:300,height:72};
// One face of the board: white on glossy blue. The tip is on the right or the
// left, so the words read forwards from either side of the sign.
export function paintRiverSign(g,tipRight){
  const {width:w,height:h}=RIVER_SIGN_TEXTURE,tip=w*RIVER_SIGN.tip/(RIVER_SIGN.reach-RIVER_SIGN.start);
  // Enamel catches the moonlight near the top and darkens towards the bottom.
  const enamel=g.createLinearGradient(0,0,0,h);
  enamel.addColorStop(0,'#3d7fd6');enamel.addColorStop(.45,SIGN_BOARD);enamel.addColorStop(1,'#184a99');
  g.fillStyle=enamel;g.fillRect(0,0,w,h);
  // A faint diagonal sheen crosses the board.
  const sheen=g.createLinearGradient(w*.25,0,w*.45,h);
  for(const [at,alpha] of [[0,0],[.45,.16],[.55,.16],[1,0]])sheen.addColorStop(at,`rgba(255,255,255,${alpha})`);
  g.fillStyle=sheen;g.fillRect(0,0,w,h);
  g.save();
  if(!tipRight){g.translate(w,0);g.scale(-1,1);}
  g.beginPath();g.moveTo(6,6);g.lineTo(w-tip,6);g.lineTo(w-9,h/2);g.lineTo(w-tip,h-6);g.lineTo(6,h-6);g.closePath();
  g.strokeStyle=SIGN_TEXT;g.lineWidth=3;g.stroke();
  g.restore();
  g.font='bold 32px monospace';g.textAlign='center';g.textBaseline='middle';g.fillStyle=SIGN_TEXT;
  g.fillText('NIGHT RIVER',tipRight?(w-tip)/2+3:tip+(w-tip)/2-3,h/2+1,w-tip-20);
}

// A pole with an arrow-shaped board pointing along z, at s.dz, to the river.
function riverSign(s,face,viewer,texture){
  const {pole,height,start,reach,tip,bottom,top}=RIVER_SIGN,half=.035,{width,height:rows}=RIVER_SIGN_TEXTURE;
  band(face,viewer,s,0,pole,height,pole,SIGN_POST,{sides:6,bottom:false});
  // The board outline as (along, y), anticlockwise; along runs towards the river.
  const outline=[[start,bottom],[reach-tip,bottom],[reach,(bottom+top)/2],[reach-tip,top],[start,top]];
  const at=(a,y,side)=>({x:s.x+side*half,y,z:s.z+s.dz*a});
  for(const side of [-1,1]){
    if(!visible(viewer,at(start,bottom,side),{x:side,y:0,z:0}))continue;
    // Seen from +x, +z is on the viewer's right. Texture u grows rightwards.
    const tipRight=side*s.dz>0;
    face(outline.map(([a,y])=>({...at(a,y,side),u:(tipRight?a-start:reach-a)/(reach-start)*width,v:(top-y)/(top-bottom)*rows})),SIGN_BOARD,texture?.(tipRight)??null);
  }
  for(let i=0;i<outline.length;i++){
    const [a0,y0]=outline[i],[a1,y1]=outline[(i+1)%outline.length],n={x:0,y:a0-a1,z:(y1-y0)*s.dz};
    if(!visible(viewer,at(a0,y0,1),n))continue;
    face([at(a0,y0,-1),at(a1,y1,-1),at(a1,y1,1),at(a0,y0,1)],SIGN_EDGE);
  }
}

export function drawParkStructures(chunk,{face,riverSignTexture},viewer){
  for(const c of chunk.park.cones)pineCone(c,face,viewer);
  for(const b of chunk.park.benches)bench(b,face,viewer);
  if(chunk.park.sign)riverSign(chunk.park.sign,face,viewer,riverSignTexture);
  for(const t of chunk.park.trees)tree(t,face,viewer);
}

// Each bench seats one person at either end. Seated, they face the path.
export const benchSeats=b=>[-.5,.5].map(u=>({x:b.x+b.tx*u,z:b.z+b.tz*u,bench:b,angle:Math.atan2(-b.nx,-b.nz)}));
// The same reach and viewing cone as a pub chair.
export function facingBench(player,chunks){
  let nearest=null,distance=1.5;
  for(const chunk of chunks)for(const b of chunk.park?.benches??[])for(const seat of benchSeats(b)){
    const dx=seat.x-player.x,dz=seat.z-player.z,gap=Math.hypot(dx,dz);
    if(gap>distance)continue;
    const radius=.45,halfAngle=.45+Math.asin(Math.min(1,radius/Math.max(gap,.001)));
    if(gap>radius&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/gap<Math.cos(halfAngle))continue;
    nearest=seat;distance=gap;
  }
  return nearest;
}
