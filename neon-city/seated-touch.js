// SPDX-License-Identifier: AGPL-3.0-only
// A captured touch belongs to the seat where it began; cancel on UI/seat changes.
export function installSeatedTouch(canvas,{getSeat,canUse,look,stand}){
  let gesture=null;
  function finish(e,cancel=false){
    if(!gesture||gesture.id!==e.pointerId)return;
    const current=gesture;gesture=null;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(!cancel&&!current.dragged&&canUse()&&getSeat()===current.seat)stand();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!canUse()||!getSeat())return;
    e.preventDefault();
    if(gesture){gesture.dragged=true;return;}
    gesture={id:e.pointerId,seat:getSeat(),x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:!e.isPrimary};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    e.preventDefault();
    if(!canUse()||getSeat()!==gesture.seat){finish(e,true);return;}
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>8)gesture.dragged=true;
    if(gesture.dragged){
      const rect=canvas.getBoundingClientRect();
      look(-(e.clientX-gesture.x)/rect.width*Math.PI,(e.clientY-gesture.y)/rect.height*Math.PI/2);
    }
    gesture.x=e.clientX;gesture.y=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>finish(e));
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>finish(e,true));
}
