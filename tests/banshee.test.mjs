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

import test from 'node:test';
import assert from 'node:assert/strict';
import {rollBanshee,bansheeFrame,playBansheeScream} from '../neon-city/banshee.js';
test('BANSHEE has a 25 percent chance per entry',()=>{
  assert.equal(rollBanshee(()=>0),true);
  assert.equal(rollBanshee(()=>.24999),true);
  assert.equal(rollBanshee(()=>.25),false);
  assert.equal(rollBanshee(()=>.999),false);
});
test('one second delay, one second flicker, five second apparition, two second fade then unlock',()=>{
  for(const t of [0,.5,.999])assert.deepEqual(bansheeFrame(t),{active:true,dark:false,opacity:0});
  const flicker=Array.from({length:18},(_,i)=>bansheeFrame(1+i/18));
  assert.ok(flicker.some(f=>f.dark)&&flicker.some(f=>!f.dark));
  assert.ok(flicker.every(f=>f.active&&f.opacity===0));
  for(const t of [2,3,4,6.999,7])assert.deepEqual(bansheeFrame(t),{active:true,dark:true,opacity:1});
  assert.deepEqual(bansheeFrame(8),{active:true,dark:true,opacity:.5});
  assert.equal(bansheeFrame(8.999).dark,true,'lights stay off until fully faded');
  assert.ok(bansheeFrame(8.999).opacity>0);
  assert.deepEqual(bansheeFrame(9),{active:false,dark:false,opacity:0});
});
test('scream schedules a finite five second buffer after flickering',()=>{
  const rate=8000;let samples,scheduled,disconnected=false;
  const source={connect(){},start(t){scheduled=t;},disconnect(){disconnected=true;}};
  const context={sampleRate:rate,currentTime:12,destination:{},createBuffer(ch,n,r){assert.equal(ch,1);assert.equal(n,rate*5);assert.equal(r,rate);samples=new Float32Array(n);return {getChannelData:()=>samples};},createBufferSource:()=>source};
  playBansheeScream(context,2,()=>.5);
  assert.equal(scheduled,14);assert.ok(samples.every(Number.isFinite));
  assert.ok(samples.some(v=>Math.abs(v)>.1));assert.ok(Math.abs(samples.at(-1))<.001);
  source.onended();assert.ok(disconnected);
});

test('fourth visit is guaranteed after three misses, with random chances before it',()=>{
  let misses=0;
  const visit=random=>{const happens=rollBanshee(random,misses);misses=happens?0:misses+1;return happens;};
  assert.deepEqual(Array.from({length:8},()=>visit(()=>.99)),[false,false,false,true,false,false,false,true]);
  assert.equal(visit(()=>.1),true,'still randomly happens immediately after an event');
  assert.equal(misses,0);
  assert.equal(visit(()=>.99),false);
  assert.equal(visit(()=>.1),true,'random event resets the miss streak');
  assert.equal(misses,0);
});

test('portrait draw applies 75 percent transparency and multiplies the fade',async()=>{
  const previous=globalThis.Image;
  globalThis.Image=class {complete=true;naturalWidth=100;naturalHeight=200;};
  try{
    const {drawBanshee}=await import('../neon-city/banshee.js?render-opacity-test');
    const alphas=[];
    const ctx={save(){},restore(){},drawImage(){alphas.push(this.globalAlpha);}};
    drawBanshee(ctx,640,360,3,1);
    drawBanshee(ctx,640,360,8,.5);
    drawBanshee(ctx,640,360,3,2);
    drawBanshee(ctx,640,360,9,0);
    assert.deepEqual(alphas,[.25,.125,.25]);
  }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
