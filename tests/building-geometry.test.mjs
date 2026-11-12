import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildingGeometry} from '../neon-city/building-geometry.js';

function reference(b){
  const {x,z,w,d,h}=b;
  const walls=[
    [{x,y:0,z},{x:x+w,y:0,z},{x:x+w,y:h,z},{x,y:h,z}],
    [{x:x+w,y:0,z:z+d},{x,y:0,z:z+d},{x,y:h,z:z+d},{x:x+w,y:h,z:z+d}],
    [{x,y:0,z:z+d},{x,y:0,z},{x,y:h,z},{x,y:h,z:z+d}],
    [{x:x+w,y:0,z},{x:x+w,y:0,z:z+d},{x:x+w,y:h,z:z+d},{x:x+w,y:h,z}]
  ];
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  const out=[];
  for(const points of walls)for(let s=0;s<8;s++){
    const l=s/8,r=(s+1)/8;
    const panel=[lerp(points[0],points[1],l),lerp(points[0],points[1],r),lerp(points[3],points[2],r),lerp(points[3],points[2],l)];
    panel.forEach((p,i)=>out.push(p.x,p.y,p.z,[l*160,r*160,r*160,l*160][i],[1,1,0,0][i]));
  }
  return out;
}

test('WASM geometry exactly matches the previous interpolation and panel order',()=>{
  for(const b of [
    {x:14,z:14,w:18,d:18,h:33},
    {x:-178,z:-50,w:18,d:18,h:12},
    {x:100000.125,z:-99999.375,w:17.3,d:19.7,h:27.5}
  ]){
    const geometry=buildingGeometry(b);
    assert.ok(geometry instanceof Float64Array);
    assert.equal(geometry.byteLength,5120);
    assert.deepEqual([...geometry],reference(b));
  }
});

test('cache reuses its array and survives building another geometry',()=>{
  const b={x:14,z:14,w:18,d:18,h:33};
  const first=buildingGeometry(b),snapshot=first.slice();
  const second=buildingGeometry({...b,x:-50});
  assert.notStrictEqual(first,second);
  assert.notStrictEqual(first.buffer,second.buffer);
  assert.strictEqual(buildingGeometry(b),first);
  assert.deepEqual(first,snapshot);
});
