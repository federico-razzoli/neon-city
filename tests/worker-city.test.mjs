import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {WorkerCity} from '../neon-city/worker-city.js';
import {City} from '../neon-city/world.js';

function realWorker(){
  const url=new URL('../neon-city/chunk-worker.js',import.meta.url).href;
  const worker=new NodeWorker(new URL('data:text/javascript,'+encodeURIComponent(`
    import {parentPort} from 'node:worker_threads';
    globalThis.self={postMessage:data=>parentPort.postMessage(data)};
    await import(${JSON.stringify(url)});
    parentPort.on('message',data=>self.onmessage({data}));
  `)));
  const adapter={postMessage:data=>worker.postMessage(data),terminate:()=>worker.terminate()};
  worker.on('message',data=>adapter.onmessage?.({data}));
  worker.on('error',error=>adapter.onerror?.(error));
  return adapter;
}

test('real worker generates initial world and preserves live objects across crossings',async()=>{
  const city=new WorkerCity(42,realWorker);
  try{
    city.generate=()=>{throw new Error("Generation ran on the main thread");};
    const ready=city.update(32,32);assert.equal(city.chunks.size,0);await ready;
    const direct=new City(42);direct.update(32,32);
    assert.deepEqual([...city.chunks],[...direct.chunks]);
    const original=city.chunks.get('0,0');original.droppedItems=[{name:'test'}];
    original.people[0].walkTime=123;
    await city.update(65,32);
    assert.equal(city.chunks.get('0,0'),original);
    assert.equal(original.people[0].walkTime,123);
    assert.deepEqual(original.droppedItems,[{name:'test'}]);
    assert.ok(city.chunks.has('3,0'));
    await city.update(64,256);
    assert.ok([...city.chunks.values()].some(chunk=>chunk.river&&chunk.people.length));
    await city.update(6400,-6400);
    assert.equal(city.chunks.has('0,0'),false);
    assert.ok(city.chunks.size<=85);
  }finally{city.dispose();}
});

test('deduplicates requests and ignores stale chunks after teleport',async()=>{
  const sent=[],worker={postMessage:data=>sent.push(data),terminate(){}};
  const city=new WorkerCity(42,()=>worker);
  const first=city.update(0,0);assert.equal(city.update(1,1),first);
  assert.equal(sent.length,2);
  const second=city.update(6400,6400);
  const original=new City(42).generate(0,0);
  city.receive({id:1,chunks:[original]});await first;
  assert.equal(city.chunks.size,0);
  city.receive({id:2,chunks:[new City(42).generate(100,100)]});await second;
  assert.ok(city.chunks.has('100,100'));city.dispose();
});

test('worker failure rejects waiting callers without synchronous generation',async()=>{
  const worker={postMessage(){},terminate(){this.stopped=true;}};
  const city=new WorkerCity(42,()=>worker),ready=city.update(0,0);
  worker.onerror({message:'Worker failed'});
  await assert.rejects(ready,/Worker failed/);
  assert.equal(worker.stopped,true);assert.equal(city.chunks.size,0);
  await assert.rejects(city.update(64,0),/Worker failed/);
});

test('worker entry queues startup messages while its world module is loading',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {runInNewContext}=await import('node:vm');
  let resolveWorld;const world=new Promise(resolve=>{resolveWorld=resolve;}),replies=[];
  const source=(await readFile(new URL('../neon-city/chunk-worker.js',import.meta.url),'utf8'))
    .replace("import('./world.js')",'loadWorld()');
  const context={loadWorld:()=>world,self:{postMessage:data=>replies.push(data)}};
  runInNewContext(source,context);
  assert.equal(typeof context.self.onmessage,'function');
  context.self.onmessage({data:{type:'init',seed:42}});
  context.self.onmessage({data:{type:'update',id:1,x:32,z:32,known:[]}});
  await Promise.resolve();assert.equal(replies.length,0);
  resolveWorld({City});await runInNewContext('queue',context);
  assert.equal(replies.length,1);assert.equal(replies[0].id,1);
  assert.equal(replies[0].chunks.length,25);
});
