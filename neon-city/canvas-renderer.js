/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

import {createRenderCamera,NATIVE_VIEW} from './render-camera.js';
import {DepthRenderer} from './depth-renderer.js?v=coverage-reuse-1';
import {drawWallTexture,drawPitchedWallTexture} from './perspective.js?v=wasm-columns-1';
import {orderSurfaces,orderGroundSurfaces} from './surface-order.js';
import {projectSky,skyHorizon,starProjector} from './sky.js?v=stars-2';
import {drawBanshee} from './banshee.js?v=6';

// Scene builders submit world coordinates. Projected faces and Canvas callbacks
// are private to this backend; a second backend can implement the same operations.
export function createCanvasRenderer(canvas,options=NATIVE_VIEW){
  const {width:W,height:H,focal:F,horizon,near,far}={...NATIVE_VIEW,...options};
  const ctx=canvas.getContext('2d',{alpha:false}),camera=createRenderCamera({...NATIVE_VIEW,...options});
  ctx.imageSmoothingEnabled=false;
  let view,queue=[],style={},interiorRenderer;
  function beginFrame(cameraView){
    view=cameraView;camera.set(view);beginSurface(1);beginPass();
  }
  function beginSurface(scale){
    if(canvas.width!==W*scale||canvas.height!==H*scale){
      canvas.width=W*scale;canvas.height=H*scale;ctx.imageSmoothingEnabled=scale>1;
    }
    ctx.setTransform(scale,0,0,scale,0,0);
  }
  function beginPass(){queue=[];}
  function withStyle(options,draw){
    const previous=style;style={...style,...options};
    try{return draw();}finally{style=previous;}
  }
  function face(vertices,color,texture=null,smooth=false,buildingWall=false){
    queueFace(vertices.map(camera.transform),vertices[0].y,color,texture,smooth,buildingWall);
  }
  function quad(x,y,z,w,d,color){face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);}
  function box(x,y,z,w,h,d,color,roof=color){
    const {position:player,eye,indoors}=view;
    const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
    const up=p=>({...p,y:y+h});
    if(player.z<z)face([a,b,up(b),up(a)],color);
    if(player.z>z+d)face([c,e,up(e),up(c)],color);
    if(player.x<x)face([e,a,up(a),up(e)],color);
    if(player.x>x+w)face([b,c,up(c),up(b)],color);
    if(eye>y+h)face([up(a),up(b),up(c),up(e)],roof);
    if(indoors&&eye<y)face([e,c,b,a],color);
  }
  function queueFace(vs,elevation,color,texture,smooth,buildingWall){
    const depth=vs.reduce((s,p)=>s+p.z,0)/vs.length;
    if(depth>far||vs.every(p=>p.z<near))return;
    const clipped=camera.clip(vs);if(clipped.length<3)return;
    const ps=clipped.map(camera.project);
    if(ps.every(p=>p.x<0)||ps.every(p=>p.x>W)||ps.every(p=>p.y<0)||ps.every(p=>p.y>H))return;
    queue.push({ps,vs:clipped,depth,elevation,color,texture,smooth,buildingWall,...style});
  }
  function drawFace(f){
    // Opaque building textures own complete pixels at panel edges and carry
    // their own continuous fog. A polygon underlay/overlay would add seams.
    if(!f.buildingWall){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}
    if(f.texture&&(f.groundTexture||view.pitch))drawPitchedWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth,f.buildingWall);
    else if(f.texture)drawWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth,f.buildingWall);
    if(f.buildingWall)return;
    const fog=Math.min(.94,Math.max(0,(f.depth-22)/135));
    if(fog>0){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgba(15,10,30,${fog})`;ctx.fill();}
  }
  function billboard(sprite){
    const {position:foot,height:worldHeight,width:worldWidth,image,getImage,opacity=1}=sprite,v=camera.transform(foot);if(v.z<.3||v.z>105)return;
    const head=camera.transform({...foot,y:foot.y+worldHeight});if(head.z<.3)return;
    const pos=camera.project(v),height=pos.y-camera.project(head).y,width=worldWidth*F/v.z;if(height<=0)return;
    if(pos.x+width<0||pos.x-width>W)return;
    queue.push({detail:true,depth:v.z,ps:[{x:pos.x-width/2,y:pos.y},{x:pos.x+width/2,y:pos.y},{x:pos.x+width/2,y:pos.y-height},{x:pos.x-width/2,y:pos.y-height}],vs:Array.from({length:4},()=>({z:v.z})),draw(){ctx.globalAlpha=opacity*Math.max(.15,1-Math.max(0,v.z-30)/120);ctx.drawImage(image??getImage(),Math.round(pos.x-width/2),Math.round(pos.y-height),Math.ceil(width),Math.ceil(height));ctx.globalAlpha=1;}});
  }
  function drawStarfield(starfield,depth=null){
    const {position:player,pitch=0}=view;
    const project=starProjector(player.angle,W,F,horizon,pitch);
    for(const star of starfield){
      const p=project(star);
      if(!p)continue;
      const x=Math.floor(p.x),y=Math.floor(p.y);
      if(y>=H||(depth&&depth[y*W+x]>0))continue;
      ctx.fillStyle=star.color??'#3b344e';ctx.fillRect(x,y,1,1);
    }
  }
  function drawSky({starfield,moon,shootingStars,skyView},depth=null){
    if(!depth)clear('#0f0a1e');
    drawStarfield(starfield,depth);
    if(moon){
      const pos=projectSky(moon,view.position.angle,W,F,horizon,view.pitch??0);
      if(pos){
        ctx.fillStyle='#c4aacb';
        [5,9,11,11,13,13,13,13,13,11,11,9,5].forEach((width,row)=>ctx.fillRect(pos.x-(width-1)/2,pos.y-6+row,width,1));
      }
    }
    shootingStars.draw(ctx,skyView,depth);
    if(!depth){
      const ground=skyHorizon(horizon,F,view.pitch??0);
      ctx.fillStyle='#252233';if(ground<H)ctx.fillRect(0,ground,W,H-ground);
    }
  }
  function clear(color){ctx.fillStyle=color;ctx.fillRect(0,0,W,H);}
  function endPass(order){
    if(order==='ground')orderGroundSurfaces(queue);
    else if(order==='depth')queue.sort((a,b)=>b.depth-a.depth);
    const pass=queue;queue=[];return pass;
  }
  function drawPass(pass,{elevation}={}){
    for(const face of pass){
      if(elevation==='below'&&face.elevation>=0||elevation==='above'&&face.elevation<0)continue;
      face.draw?face.draw():drawFace(face);
    }
  }
  function drawInterior(background){
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue,background);queue=[];
    return interiorRenderer.depth;
  }
  function finishStreet({reduced,shake,time,steps,running}){
    queue=orderSurfaces(queue);
    ctx.save();if(!reduced)ctx.translate(shake?Math.sin(time*85)*shake:0,running?Math.sin(steps)*.65:0);
    drawPass(queue);ctx.restore();queue=[];
    const vignette=ctx.createRadialGradient(320,180,110,320,180,390);
    vignette.addColorStop(0,'#05031000');vignette.addColorStop(1,'#050310aa');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }
  function overlay({kind,seconds,frame}){
    if(kind!=='banshee')throw new Error(`Unknown Canvas overlay: ${kind}`);
    if(frame.dark)clear('#000');
    if(frame.opacity)drawBanshee(ctx,W,H,seconds,frame.opacity);
  }
  function cabinet(game,running){
    const scale=(game.kind==='byker'||game.kind==='pinball')?Math.min(3,Math.max(1,Math.ceil(canvas.clientWidth*(window.devicePixelRatio||1)/W))):1;
    beginSurface(scale);
    if(game.loading){
      clear('#000');ctx.fillStyle='#fff';ctx.font='18px monospace';ctx.textAlign='center';
      ctx.fillText('LOADING...',W/2,H/2);ctx.textAlign='start';return;
    }
    game.syncInput?.(canvas,running);game.draw(ctx);
  }
  return {beginFrame,beginPass,face,quad,box,billboard,withStyle,boundsVisible:camera.boundsVisible,
    endPass,drawPass,drawInterior,drawSky,finishStreet,overlay,cabinet};
}
