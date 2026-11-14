// SPDX-License-Identifier: AGPL-3.0-only
// An arcade visit owns this realm. Removing it and dropping the renderer lets
// its module map and Canvas context references be collected after leaving.
export function loadCabinetDisplay(canvas,options,doc=document){
  const frame=doc.createElement('iframe');
  frame.hidden=true;frame.title='Arcade display runtime';frame.setAttribute('aria-hidden','true');
  let disposed=false,rejectReady;
  const remove=()=>{frame.onload=null;frame.onerror=null;frame.remove();};
  const ready=new Promise((resolve,reject)=>{
    rejectReady=reject;
    frame.onload=async()=>{
      if(disposed)return;
      try{
        const renderer=await frame.contentWindow.createCabinetDisplay(canvas,options);
        if(disposed)return;
        clearTimeout(timeout);frame.onload=null;frame.onerror=null;resolve(renderer);
      }catch(error){clearTimeout(timeout);disposed=true;remove();reject(error);}
    };
    frame.onerror=()=>{clearTimeout(timeout);disposed=true;remove();reject(new Error('Arcade display failed to load'));};
  });
  const timeout=setTimeout(()=>{disposed=true;remove();rejectReady(new Error('Arcade display loading timed out'));},15000);
  frame.src=new URL('./cabinet-display-runtime.html',import.meta.url).href;
  doc.body.append(frame);
  return {ready,dispose(){
    if(disposed)return;
    disposed=true;clearTimeout(timeout);remove();rejectReady(new Error('Arcade closed'));
  }};
}
