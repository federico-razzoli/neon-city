import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newspaperGeometry,drawNewspaperGeometry} from '../neon-city/newspaper-geometry.js';

// Original renderer retained as an independent geometry/texture mapping reference.
function original(m,player,eye,look,texture,face){
function box(x,y,z,w,h,d,color,roof=color){
  const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
  const up=p=>({...p,y:y+h});
  if(player.z<z)face([a,b,up(b),up(a)],color);
  if(player.z>z+d)face([c,e,up(e),up(c)],color);
  if(player.x<x)face([e,a,up(a),up(e)],color);
  if(player.x>x+w)face([b,c,up(c),up(b)],color);
  if(eye>y+h+(0))face([up(a),up(b),up(c),up(e)],roof);
  if(false&&eye<y)face([e,c,b,a],color);
}
  const scale=.85,top=.08+1.45*.9*scale,front=.45*scale+.001;
  box(m.x-m.w/2,.08,m.z-m.d/2,m.w,1.45*.9*scale,m.d,...look.body);
  // The cap overhangs the front and sides, with its back flush to the wall.
  const dx=[0,0,-1,1][m.side],dz=[-1,1,0,0][m.side];
  const capW=m.w+(m.side<2?.06:.054)*scale,capD=m.d+(m.side<2?.054:.06)*scale;
  box(m.x+dx*.027*scale-capW/2,top,m.z+dz*.027*scale-capD/2,capW,.08*.9*scale,capD,...look.cap);
  // Front faces the street; texture follows the same perspective as buildings.
  const point=(u,y)=>m.side<2?{x:m.x+(m.side===0?u:-u),y,z:m.z+dz*front}:{x:m.x+dx*front,y,z:m.z+(m.side===2?-u:u)};
  face([point(-.5*scale,.08),point(.5*scale,.08),point(.5*scale,top),point(-.5*scale,top)].map((p,i)=>({...p,u:[0,160,160,0][i],v:[224,224,0,0][i]})),look.paint,texture);
}

const look={body:['body','bodyRoof'],cap:['cap','capRoof'],paint:'front'};
test('four shared typed array templates survive other orientations and positions',()=>{
  const first=newspaperGeometry({side:0,w:.85,d:.9*.85});
  const snapshot=first.slice();
  for(let side=0;side<4;side++){
    const m={side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85};
    const g=newspaperGeometry(m);
    assert.ok(g instanceof Float64Array);
    assert.equal(g.byteLength,1760);
    assert.strictEqual(g,newspaperGeometry({...m,x:999,paper:'NEON NEWS'}));
  }
  assert.deepEqual(first,snapshot);
});
test('all orientations retain text vertex order, UVs, visible faces and colours',()=>{
  const texture={width:160,height:224};
  for(let side=0;side<4;side++)for(const position of [0,14,-114,100000])for(const angle of [-2,-1,0,1,2,3])for(const eye of [.05,1,1.65,3]){
    const m={x:position,z:position+17,side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85};
    const player={x:m.x+Math.sin(angle)*3,z:m.z+Math.cos(angle)*3};
    const before=[],after=[];
    original(m,player,eye,look,texture,(vertices,color,tex=null)=>before.push({vertices,color,tex}));
    drawNewspaperGeometry(m,newspaperGeometry(m),player,eye,look,texture,(vertices,color,tex=null)=>after.push({vertices,color,tex}));
    assert.equal(after.length,before.length);
    // The textured front must match exactly, even at large/negative positions.
    assert.deepEqual(after.at(-1),before.at(-1));
    for(let f=0;f<before.length;f++){
      assert.equal(after[f].color,before[f].color);
      assert.strictEqual(after[f].tex,before[f].tex);
      for(let i=0;i<4;i++)for(const axis of ['x','y','z']){
        // Shared local box coordinates change addition grouping by at most a few ULPs.
        const a=after[f].vertices[i][axis],b=before[f].vertices[i][axis];
        assert.ok(Math.abs(a-b)<=Number.EPSILON*Math.max(1,Math.abs(b))*4,`${axis}: ${a} vs ${b}`);
      }
    }
  }
});
