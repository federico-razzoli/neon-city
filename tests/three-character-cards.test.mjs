import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Color} from '../neon-city/vendor/three/three.module.js';
import {createThreeCharacterCards} from '../neon-city/three-character-cards.js';
import {createThreeArcadeScene} from '../neon-city/three-arcade-scene.js';
import {createThreeInteriorScene} from '../neon-city/three-interior-scene.js';
import {ARCADE} from '../neon-city/arcade-interior.js';

// Recorded from the original canvas sprite generator before extracting its
// rectangle definitions. Each digest covers four frames, both views and crops.
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/character-appearance.json',import.meta.url),'utf8'));
function pixels(geometry,rows){
  const result=Array(24*rows).fill(null),p=geometry.attributes.position,c=geometry.attributes.color;
  for(let i=0;i<p.count;i+=6){
    const left=Math.round((p.getX(i)+.5)*24),right=Math.round((p.getX(i+1)+.5)*24);
    const bottom=Math.round((.5-p.getY(i))*rows),top=Math.round((.5-p.getY(i+2))*rows);
    const color='#'+new Color().setRGB(c.getX(i),c.getY(i),c.getZ(i)).getHexString();
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      assert.equal(result[y*24+x],null,'character faces must not overlap');result[y*24+x]=color;
    }
  }
  return result;
}
test('native card geometry preserves every original character pixel, outfit, view, walking frame and seated crop',()=>{
  const cards=createThreeCharacterCards();
  for(const {type,variant,sha256} of fixtures){
    const hash=createHash('sha256');
    for(let frame=0;frame<4;frame++)for(const back of [false,true])for(const rows of [48,32]){
      const geometry=cards.geometry(type,frame,back,variant,rows===32);
      hash.update(JSON.stringify(pixels(geometry,rows)));
      const z=geometry.attributes.position;for(let i=0;i<z.count;i++)assert.equal(z.getZ(i),0);
    }
    assert.equal(hash.digest('hex'),sha256,`type ${type}, variant ${variant}`);
  }
  assert.equal(cards.material.map,null);assert.equal(cards.material.vertexColors,true);cards.dispose();
});
test('cards share geometry across equivalent outfits and release cached GPU resources once',()=>{
  const cards=createThreeCharacterCards(),a=cards.geometry(4,1,false,.4),b=cards.geometry(4,1,false,.5);
  assert.equal(a,b);assert.notEqual(a,cards.geometry(4,1,false,.8));
  let disposed=0;a.addEventListener('dispose',()=>disposed++);cards.material.addEventListener('dispose',()=>disposed++);
  cards.dispose();assert.equal(disposed,2);
});
test('default interior characters use native geometry with unchanged card transforms and no canvas dependency',()=>{
  const room=createThreeArcadeScene(),visitor={type:14,variant:.8,x:8,z:5,walkTime:.5,facingX:0,facingZ:1};
  const frame={player:{...ARCADE.spawn},eye:1.65,arcadeLife:{people:[visitor]},city:{chunks:new Map()},itemRoom:'arcade'};
  room.update(frame);const actor=room.scene.getObjectByName('arcade-guest'),geometry=actor.geometry;
  assert.ok(geometry.attributes.color);assert.equal(actor.material.map,null);
  assert.equal(actor.position.x,visitor.x);assert.equal(actor.position.z,-visitor.z);
  assert.equal(actor.position.y,actor.scale.y/2);assert.equal(actor.scale.x,actor.scale.y/2);
  room.update(frame);assert.equal(actor.geometry,geometry);
  visitor.walkTime=1;room.update(frame);assert.notEqual(actor.geometry,geometry);
  frame.arcadeLife.people=[];room.update(frame);assert.equal(room.scene.getObjectByName('arcade-guest'),undefined);
  room.dispose();
});

test('native seated and reflection cards retain the original crop, scale, height and visibility',()=>{
  const guest={id:'seated',type:4,variant:.4,x:2,z:3,walkTime:0};
  const room=createThreeInteriorScene({name:'test',actorsFor:()=>[guest],actorView:()=>({seated:true,reflectionOnly:true})});
  const frame={player:{x:0,z:0,angle:.7},eye:1.65,city:{chunks:new Map()}};
  room.update(frame);const actor=room.scene.getObjectByName('test-guest');
  assert.equal(actor.scale.y,32*.0375);assert.equal(actor.scale.x,24*.0375);
  assert.equal(actor.position.y,1.87-actor.scale.y/2);assert.equal(actor.rotation.y,-.7);
  assert.equal(actor.layers.mask,2);assert.equal(room.camera.layers.test(actor.layers),false);
  assert.equal(actor.material.map,null);assert.ok(actor.geometry.attributes.color);
  const cropped=actor.geometry;room.update(frame);assert.equal(actor.geometry,cropped);room.dispose();
});
