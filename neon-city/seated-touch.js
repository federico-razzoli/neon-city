// SPDX-License-Identifier: AGPL-3.0-only
// Keep each gesture in its starting walking/seated mode; cancel on UI/seat changes.
export function installSeatedTouch(canvas,{getSeat,canUse,look,stand,tap=()=>{},now=()=>performance.now()}){
  let gesture=null;
  // Some mobile browsers still open a long-press menu with touch-action:none.
  // Cancel native touch defaults as well as pointer defaults to retain capture.
  for(const event of ['touchstart','touchmove'])canvas.addEventListener(event,e=>{
    if(canUse())e.preventDefault();
  },{passive:false});
  canvas.addEventListener('contextmenu',e=>{
    if(canUse()||gesture)e.preventDefault();
  });
  function updateHold(){
    // Latch walking only if the hold threshold is reached before a drag.
    // Once walking starts, dragging steers without cancelling it.
    if(gesture&&!gesture.seat&&!gesture.dragged&&now()-gesture.started>=220)gesture.held=true;
  }
  function finish(e,cancel=false){
    if(!gesture||gesture.id!==e.pointerId)return;
    const current=gesture;gesture=null;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(!cancel&&!current.dragged&&canUse()&&getSeat()===current.seat){
      if(current.seat)stand();
      else if(!current.held&&now()-current.started<220){
        const rect=canvas.getBoundingClientRect();
        tap((e.clientY-rect.top)/rect.height>=2/3);
      }
    }
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!canUse())return;
    e.preventDefault();
    if(gesture){gesture.dragged=true;return;}
    gesture={id:e.pointerId,seat:getSeat(),x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:now(),held:false,dragged:!e.isPrimary};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    e.preventDefault();
    if(!canUse()||getSeat()!==gesture.seat){finish(e,true);return;}
    updateHold();
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8)gesture.dragged=true;
    if(gesture.dragged){
      const rect=canvas.getBoundingClientRect();
      look(-(e.clientX-gesture.x)/rect.width*Math.PI,gesture.seat?(e.clientY-gesture.y)/rect.height*Math.PI/2:0);
    }
    gesture.x=e.clientX;gesture.y=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>finish(e));
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>finish(e,true));
  return {
    update(){
      if(!gesture)return false;
      if(!canUse()||getSeat()!==gesture.seat){finish({pointerId:gesture.id},true);return false;}
      updateHold();
      return !gesture.seat&&gesture.held;
    }
  };
}
