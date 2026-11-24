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
    if(gesture&&!gesture.seat&&!gesture.dragged&&now()-gesture.started>=220){
      gesture.held=true;
      gesture.mode='rotate';
    }
  }
  function finish(e,cancel=false){
    if(!gesture)return;
    if(gesture.id!==e.pointerId){
      gesture.fingers.delete(e.pointerId);
      gesture.strafe=0;
      gesture.backward=0;
      for(const finger of gesture.fingers.values()){finger.startX=finger.x;finger.startY=finger.y;}
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      return;
    }
    const current=gesture;gesture=null;
    for(const id of current.fingers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    if(!cancel&&!current.multiple&&!current.dragged&&canUse()&&getSeat()===current.seat){
      if(current.seat){
        const rect=canvas.getBoundingClientRect();
        stand(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
      }
      else if(!current.held&&now()-current.started<220){
        const rect=canvas.getBoundingClientRect();
        tap((e.clientY-rect.top)/rect.height>=2/3);
      }
    }
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!canUse())return;
    e.preventDefault();
    if(gesture){
      updateHold();
      gesture.multiple=true;
      gesture.fingers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
      for(const finger of gesture.fingers.values()){finger.startX=finger.x;finger.startY=finger.y;}
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    gesture={id:e.pointerId,fingers:new Map([[e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY}]]),strafe:0,backward:0,multiple:false,seat:getSeat(),x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:now(),held:false,dragged:!e.isPrimary};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!gesture||!gesture.fingers.has(e.pointerId))return;
    e.preventDefault();
    if(!canUse()||getSeat()!==gesture.seat){finish(e,true);return;}
    updateHold();
    const finger=gesture.fingers.get(e.pointerId);
    finger.x=e.clientX;finger.y=e.clientY;
    // Two fingers move sideways on foot, and slide across a van cab's bench.
    if((!gesture.seat||gesture.seat.cabVan)&&gesture.fingers.size>=2&&gesture.mode!=='rotate'){
      // Use the fingers' average displacement so either finger can steer.
      let displacement=0;
      for(const point of gesture.fingers.values())displacement+=point.x-point.startX;
      displacement/=gesture.fingers.size;
      const [a,b]=gesture.fingers.values();
      const contraction=Math.hypot(a.startX-b.startX,a.startY-b.startY)-Math.hypot(a.x-b.x,a.y-b.y);
      // Recognise a pinch before choosing sideways movement. Once chosen,
      // retain that gesture until release, just as with forward movement.
      if(!gesture.seat&&!gesture.mode&&contraction>12&&contraction>Math.abs(displacement)*1.5){
        gesture.mode='backward';gesture.dragged=true;
      }
      if(gesture.mode==='backward'){
        gesture.backward=contraction>12?Math.min(1,contraction/40):0;
        gesture.strafe=0;
      }else{
        gesture.strafe=Math.abs(displacement)>8?Math.max(-1,Math.min(1,-displacement/40)):0;
        if(gesture.strafe){gesture.dragged=true;gesture.mode='strafe';}
      }
      if(gesture.id===e.pointerId){gesture.x=e.clientX;gesture.y=e.clientY;}
      return;
    }
    if(gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8)gesture.dragged=true;
    if(gesture.dragged){
      gesture.mode??='rotate';
      const rect=canvas.getBoundingClientRect();
      look(-(e.clientX-gesture.x)/rect.width*Math.PI,gesture.seat?(e.clientY-gesture.y)/rect.height*Math.PI/2:0);
    }
    gesture.x=e.clientX;gesture.y=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>finish(e));
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>finish(e,true));
  return {
    get running(){return Boolean(gesture&&!gesture.seat&&(gesture.held||gesture.strafe)&&gesture.fingers.size>=2);},
    get strafe(){return gesture&&(!gesture.seat||gesture.seat.cabVan)?gesture.strafe:0;},
    get backward(){return gesture&&!gesture.seat?gesture.backward:0;},
    update(){
      if(!gesture)return false;
      if(!canUse()||getSeat()!==gesture.seat){finish({pointerId:gesture.id},true);return false;}
      updateHold();
      return !gesture.seat&&gesture.held;
    }
  };
}
