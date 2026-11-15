// SPDX-License-Identifier: AGPL-3.0-only
import {City,BLOCK,KEEP_RADIUS,RIVER_LOAD_RADIUS} from './world.js';
import {orientEntrances} from './entrances.js';

// Keep live gameplay objects on the main thread. Only new chunks cross back
// from the worker; later responses must never replace pedestrians or dropped items.
export class WorkerCity extends City {
  constructor(seed=Date.now(),createWorker=()=>new Worker(new URL('./chunk-worker.js',import.meta.url),{type:'module'})){
    super(seed);
    this.worker=createWorker();this.requests=new Map();this.requestId=0;
    this.worker.onmessage=({data})=>this.receive(data);
    this.worker.onerror=event=>this.fail(new Error(event.message||'Chunk generation worker failed.'));
    this.worker.onmessageerror=()=>this.fail(new Error('Unable to receive generated chunks.'));
    this.worker.postMessage({type:'init',seed});
  }
  update(x,z){
    const cx=Math.floor(x/BLOCK),cz=Math.floor(z/BLOCK);
    if(this.failure)return Promise.reject(this.failure);
    if(this.center?.x===cx&&this.center?.z===cz)return this.ready;
    this.center={x:cx,z:cz};
    for(const [key,chunk] of this.chunks)if(!this.retained(chunk))this.chunks.delete(key);
    const id=++this.requestId;
    this.ready=new Promise((resolve,reject)=>this.requests.set(id,{resolve,reject}));
    // Frame updates do not await this promise; startup and debug travel do.
    this.ready.catch(()=>{});
    this.worker.postMessage({type:'update',id,x,z,known:[...this.chunks.keys()]});
    return this.ready;
  }
  retained(chunk){
    return Math.max(Math.abs(chunk.x-this.center.x),Math.abs(chunk.z-this.center.z))<=(chunk.river?RIVER_LOAD_RADIUS:KEEP_RADIUS);
  }
  receive({id,chunks,error}){
    const request=this.requests.get(id);if(!request)return;
    if(error){this.fail(new Error(error));return;}
    for(const chunk of chunks){
      if(!this.retained(chunk))continue;
      const key=`${chunk.x},${chunk.z}`;
      if(this.chunks.has(key))continue;
      this.chunks.set(key,chunk);
      if(chunk.park)this.parkBlocks.add(key);else this.parkBlocks.delete(key);
    }
    for(const chunk of this.chunks.values())orientEntrances(chunk,this.parkBlocks);
    this.requests.delete(id);request.resolve();
  }
  fail(error){
    this.failure=error;
    for(const request of this.requests.values())request.reject(error);
    this.requests.clear();this.worker.terminate();
  }
  dispose(){this.fail(new Error('Chunk generation worker stopped.'));}
}
