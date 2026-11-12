import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawFingerpost} from '../neon-city/parks.js';
import {RIVER_SIGN} from '../neon-city/world.js';
import {signBoardGeometry,signPoleGeometry} from '../neon-city/sign-geometry.js';
// Retain the original formulas as an independent reference for geometry and text.
const visible=(viewer,p,n)=>(viewer.x-p.x)*n.x+(viewer.y-p.y)*n.y+(viewer.z-p.z)*n.z>0;
// Moonlight from above and the north-east; undersides stay dark.
const LIGHT=(()=>{const l={x:.45,y:.75,z:-.5},n=Math.hypot(l.x,l.y,l.z);return {x:l.x/n,y:l.y/n,z:l.z/n};})();
const shade=(n,colors)=>{
  const t=.5*Math.max(0,n.x*LIGHT.x+n.y*LIGHT.y+n.z*LIGHT.z)+.5*(n.y*.5+.5);
  return colors[Math.min(colors.length-1,Math.floor(t*colors.length))];
};

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

const SIGN_POST=['#1d2230','#272d3d','#323a4c','#3e475b'];
const SIGN_BLUE={board:'#1f5bb5',edge:'#123a78',light:'#3d7fd6',dark:'#184a99'};
const SIGN_GREEN={board:'#278344',edge:'#14502a',light:'#4aaa68',dark:'#1b6033'};
const signPalette=text=>text==='PARK'?SIGN_GREEN:SIGN_BLUE;
const SIGN_TEXT='#ffffff';
const SIGN_TEXTURE={width:300,height:72};
function signBoard(s,{text,dx,dz,bottom,top},face,viewer,texture){
  const {start,reach,tip}=RIVER_SIGN,half=.035,{width,height:rows}=SIGN_TEXTURE,palette=signPalette(text);
  // The board outline as (along, y), anticlockwise; along runs towards the tip.
  const outline=[[start,bottom],[reach-tip,bottom],[reach,(bottom+top)/2],[reach-tip,top],[start,top]];
  const at=(a,y,side)=>({x:s.x+side*half*dz+dx*a,y,z:s.z-side*half*dx+dz*a});
  for(const side of [-1,1]){
    if(!visible(viewer,at(start,bottom,side),{x:side*dz,y:0,z:-side*dx}))continue;
    // Seen from side 1, the tip is on the viewer's right. Texture u grows rightwards.
    const tipRight=side>0;
    face(outline.map(([a,y])=>({...at(a,y,side),u:(tipRight?a-start:reach-a)/(reach-start)*width,v:(top-y)/(top-bottom)*rows})),palette.board,texture?.(text,tipRight)??null);
  }
  for(let i=0;i<outline.length;i++){
    const [a0,y0]=outline[i],[a1,y1]=outline[(i+1)%outline.length],n={x:(y1-y0)*dx,y:a0-a1,z:(y1-y0)*dz};
    if(!visible(viewer,at(a0,y0,1),n))continue;
    face([at(a0,y0,-1),at(a1,y1,-1),at(a1,y1,1),at(a0,y0,1)],palette.edge);
  }
}

// A pole, as tall as s.height or a park's, with one board per entry in boards.
function original(s,boards,{face,signTexture},viewer){
  band(face,viewer,s,0,RIVER_SIGN.pole,s.height??RIVER_SIGN.height,RIVER_SIGN.pole,SIGN_POST,{sides:6,bottom:false});
  for(const b of boards)signBoard(s,b,face,viewer,signTexture);
}


test('sign templates are shared across text and positions and retain their data',()=>{
  const b={dx:1,dz:0,bottom:RIVER_SIGN.bottom,top:RIVER_SIGN.top};
  const first=signBoardGeometry(b,RIVER_SIGN,300,72),snapshot=first.slice();
  assert.ok(first instanceof Float64Array);
  const pole=signPoleGeometry(3.75,.08);
  assert.ok(pole instanceof Float64Array);
  assert.strictEqual(pole,signPoleGeometry(3.75,.08));
  signBoardGeometry({...b,dx:0,dz:-1},RIVER_SIGN,300,72);
  assert.strictEqual(first,signBoardGeometry({...b,text:'PARK'},RIVER_SIGN,300,72));
  assert.deepEqual(first,snapshot);
});
test('both text faces, board edges, pole shading and visibility match original signs',()=>{
  for(const text of ['PARK','NIGHT RIVER'])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const height of [3.75,5.625])for(const position of [0,8.6,-114,100000])for(const angle of [-2.8,-1.9,-1.1,-.3,.3,1.1,1.9,2.8])for(const eye of [1,1.65,6]){
    const s={x:position,z:position+17,height},raise=height-3.75;
    const boards=[{text,dx,dz,bottom:RIVER_SIGN.bottom+raise,top:RIVER_SIGN.top+raise}];
    const viewer={x:s.x+Math.sin(angle)*5,y:eye,z:s.z+Math.cos(angle)*5};
    const before=[],after=[];
    const capture=out=>({face:(vertices,color,texture=null)=>out.push({vertices,color,texture}),signTexture:(t,right)=>`${t}:${right}`});
    original(s,boards,capture(before),viewer);
    drawFingerpost(s,boards,capture(after),viewer);
    assert.equal(after.length,before.length);
    for(let f=0;f<before.length;f++){
      assert.equal(after[f].color,before[f].color);
      assert.equal(after[f].texture,before[f].texture);
      assert.equal(after[f].vertices.length,before[f].vertices.length);
      for(let i=0;i<before[f].vertices.length;i++){
        const a=after[f].vertices[i],b=before[f].vertices[i];
        for(const axis of ['x','y','z'])assert.ok(Math.abs(a[axis]-b[axis])<=Number.EPSILON*Math.max(1,Math.abs(b[axis]))*4,`${axis}: ${a[axis]} vs ${b[axis]}`);
        assert.equal(a.u,b.u);
        assert.equal(a.v,b.v);
      }
    }
  }
});
