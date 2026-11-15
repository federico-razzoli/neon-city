// SPDX-License-Identifier: AGPL-3.0-only
// Register the listener before importing world.js: its WASM dependency uses
// top-level await. Browser workers can otherwise discard startup messages while
// that import is pending, leaving the first chunk request unanswered.
const world=import('./world.js');
let city,queue=Promise.resolve();
self.onmessage=({data})=>{
  queue=queue.then(async()=>{
    try{
      const {City}=await world;
      if(data.type==='init'){city=new City(data.seed);return;}
      city.update(data.x,data.z);
      const known=new Set(data.known);
      self.postMessage({id:data.id,chunks:[...city.chunks].filter(([key])=>!known.has(key)).map(([,chunk])=>chunk)});
    }catch(error){self.postMessage({id:data.id,error:error.message});}
  });
};
