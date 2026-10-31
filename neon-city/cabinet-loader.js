// A fresh realm gives each play session its own module map. Removing the frame
// and releasing the session lets the browser collect game code as well as state.
export function loadCabinetGame(name,doc=document){
  const frame=doc.createElement('iframe');
  frame.hidden=true;frame.title='Cabinet game runtime';frame.setAttribute('aria-hidden','true');
  let disposed=false,rejectReady;
  const remove=()=>{frame.onload=null;frame.onerror=null;frame.remove();};
  const ready=new Promise((resolve,reject)=>{
    rejectReady=reject;
    frame.onload=async()=>{
      try{
        const game=await frame.contentWindow.createCabinetGame(name);
        if(!disposed){clearTimeout(timeout);frame.onload=null;frame.onerror=null;resolve(game);}
      }catch(error){clearTimeout(timeout);disposed=true;remove();reject(error);}
    };
    frame.onerror=()=>{clearTimeout(timeout);disposed=true;remove();reject(new Error('Cabinet failed to load'));};
  });
  const timeout=setTimeout(()=>{disposed=true;remove();rejectReady(new Error('Cabinet loading timed out'));},15000);
  frame.src=new URL('./cabinet-runtime.html?v=1',import.meta.url).href;
  doc.body.append(frame);
  return {ready,dispose(){
    if(disposed)return;
    disposed=true;clearTimeout(timeout);remove();rejectReady(new Error('Cabinet closed'));
  }};
}
