import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCabinetGame} from '../neon-city/cabinet-loader.js';

function documentFor(create){
  const frames=[];
  return {frames,createElement(tag){
    assert.equal(tag,'iframe');
    return {contentWindow:{createCabinetGame:create},setAttribute(){},remove(){this.removed=true;}};
  },body:{append(frame){frames.push(frame);}}};
}
test('a session loads only the selected game in a fresh frame and disposes it',async()=>{
  const requested=[],doc=documentFor(async name=>{requested.push(name);return {name};});
  for(const name of ['PING','GROG','KONGY KONG','PING']){
    const before=requested.length,session=loadCabinetGame(name,doc),frame=doc.frames.at(-1);
    assert.equal(frame.hidden,true);assert.equal(requested.length,before);
    await frame.onload();assert.equal((await session.ready).name,name);
    assert.equal(frame.onload,null);session.dispose();assert.equal(frame.removed,true);
    assert.equal(frame.onerror,null);
  }
  assert.deepEqual(requested,['PING','GROG','KONGY KONG','PING']);assert.equal(new Set(doc.frames).size,4);
});
test('cancellation removes the runtime and rejects loading',async()=>{
  const doc=documentFor(()=>{throw new Error('must not load');});
  const session=loadCabinetGame('PING',doc),rejected=assert.rejects(session.ready,/Cabinet closed/);
  session.dispose();await rejected;
  assert.equal(doc.frames[0].removed,true);assert.equal(doc.frames[0].onload,null);
});
test('failed game imports remove the frame',async()=>{
  const doc=documentFor(async()=>{throw new Error('network failure');});
  const session=loadCabinetGame('PING',doc),rejected=assert.rejects(session.ready,/network failure/);
  await doc.frames[0].onload();await rejected;
  assert.equal(doc.frames[0].removed,true);
});
test('a cancelled import cannot resolve into a live game later',async()=>{
  let finish;
  const doc=documentFor(()=>new Promise(resolve=>{finish=resolve;}));
  const session=loadCabinetGame('PING',doc),rejected=assert.rejects(session.ready,/Cabinet closed/);
  const loading=doc.frames[0].onload();session.dispose();finish({name:'PING'});
  await loading;await rejected;assert.equal(doc.frames[0].removed,true);
});
