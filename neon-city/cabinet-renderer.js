// SPDX-License-Identifier: AGPL-3.0-only
import {NATIVE_VIEW,OVERLAY_DIM} from './render-camera.js';

// Arcade games retain their Canvas 2D display independently of world rendering.
export function createCabinetRenderer(canvas,options=NATIVE_VIEW){
  const {width:W,height:H}={...NATIVE_VIEW,...options};
  const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
  const dimColor=alpha=>`rgb(${OVERLAY_DIM.color>>16} ${OVERLAY_DIM.color>>8&255} ${OVERLAY_DIM.color&255} / ${alpha})`;
  function dim(){
    const fade=ctx.createLinearGradient(0,0,W,0);
    fade.addColorStop(0,dimColor(OVERLAY_DIM.left));fade.addColorStop(1,dimColor(OVERLAY_DIM.right));
    ctx.fillStyle=fade;ctx.fillRect(0,0,W,H);
  }
  return {draw(game,running,dimmed=false){
    const scale=(game.kind==='byker'||game.kind==='pinball')?Math.min(3,Math.max(1,Math.ceil(canvas.clientWidth*(window.devicePixelRatio||1)/W))):1;
    if(canvas.width!==W*scale||canvas.height!==H*scale){
      canvas.width=W*scale;canvas.height=H*scale;ctx.imageSmoothingEnabled=scale>1;
    }
    ctx.setTransform(scale,0,0,scale,0,0);
    if(game.loading){
      ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='18px monospace';ctx.textAlign='center';
      ctx.fillText('LOADING...',W/2,H/2);ctx.textAlign='start';if(dimmed)dim();return;
    }
    game.syncInput?.(canvas,running);game.draw(ctx);
    if(dimmed){ctx.save();ctx.setTransform(scale,0,0,scale,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';dim();ctx.restore();}
  }};
}
