import {City, pedestrian, pedestrianShowsBack, traffic, mod} from './world.js?v=pedestrian-facing-1';
import {projectSky} from './sky.js';
import {HornWarning,playHorn} from './horn.js';

const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d',{alpha:false});
const overlay=document.querySelector('#overlay'),start=document.querySelector('#start');
const city=new City(),player={x:10,z:4,angle:.12},keys=new Set(),shiftKeys=new Set();
const W=640,H=360,F=355,eye=1.65,horizon=164;
// Generate a fixed sky around the entire world, rather than wrapping the screen.
const stars=Array.from({length:300},()=>({bearing:Math.random()*Math.PI*2,elevation:.1+Math.random()*.35}));
const moon={bearing:.33,elevation:.31};
let running=false,time=0,last=0,queue=[],shake=0,hitCooldown=0,notice=0,steps=0,painted=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
ctx.imageSmoothingEnabled=false;

let audioContext,ouchBuffer,ouchLoading;
const hornWarning=new HornWarning();
function enableSound(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    audioContext??=new AudioContext();
    audioContext.resume().catch(()=>{});
    ouchLoading??=fetch(new URL('./assets/ouch-short.wav',import.meta.url))
      .then(response=>{if(!response.ok)throw new Error('Sound unavailable');return response.arrayBuffer();})
      .then(data=>audioContext.decodeAudioData(data))
      .then(buffer=>{ouchBuffer=buffer;})
      .catch(()=>{ouchLoading=null;});
  }catch{ /* Audio support is optional; movement must still work. */ }
}
function playOuch(){
  if(!ouchBuffer||audioContext?.state!=='running')return;
  const source=audioContext.createBufferSource();
  source.buffer=ouchBuffer;source.connect(audioContext.destination);source.start();
  source.onended=()=>source.disconnect();
}


function camera(v){const dx=v.x-player.x,dz=v.z-player.z,c=Math.cos(player.angle),s=Math.sin(player.angle);return {x:dx*c-dz*s,y:v.y-eye,z:dx*s+dz*c,u:v.u||0,v:v.v||0};}
function project(v){return {x:W/2+v.x*F/v.z,y:horizon-v.y*F/v.z};}
function clip(vertices){const out=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],ai=a.z>=.15,bi=b.z>=.15;if(ai)out.push(a);if(ai!==bi){const t=(.15-a.z)/(b.z-a.z),v={};for(const k of ['x','y','z','u','v'])v[k]=a[k]+(b[k]-a[k])*t;out.push(v);}}return out;}
function face(vertices,color,texture=null){
  const vs=vertices.map(camera),depth=vs.reduce((s,p)=>s+p.z,0)/vs.length;
  if(depth>150||vs.every(p=>p.z<.15))return;
  const clipped=clip(vs);if(clipped.length<3)return;
  const ps=clipped.map(project);
  if(ps.every(p=>p.x<0)||ps.every(p=>p.x>W)||ps.every(p=>p.y<0)||ps.every(p=>p.y>H))return;
  queue.push({ps,vs:clipped,depth,color,texture});
}
function quad(x,y,z,w,d,color){face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);}
function box(x,y,z,w,h,d,color,roof=color){
  const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
  const up=p=>({...p,y:y+h});
  if(player.z<z)face([a,b,up(b),up(a)],color);
  if(player.z>z+d)face([c,e,up(e),up(c)],color);
  if(player.x<x)face([e,a,up(a),up(e)],color);
  if(player.x>x+w)face([b,c,up(c),up(b)],color);
  if(eye>y+h)face([up(a),up(b),up(c),up(e)],roof);
}
function wallTexture(b,side){
  b.textures??=[];if(b.textures[side])return b.textures[side];
  const c=document.createElement('canvas');c.width=160;c.height=b.h*9;const g=c.getContext('2d');
  g.fillStyle=b.color;g.fillRect(0,0,c.width,c.height);
  for(let y=8;y<c.height-42;y+=26)for(let x=9;x<155;x+=25){const lit=mod(x*17+y*13+b.seed,11)>4;g.fillStyle=lit?(mod(x+y+b.seed,3)?'#777086':'#b2968b'):'#14172a';g.fillRect(x,y,12,15);g.fillStyle='#252238';g.fillRect(x+5,y,2,15);g.fillRect(x,y+7,12,2);}
  g.fillStyle='#0e101e';g.fillRect(0,c.height-39,160,39);g.fillStyle='#54415d';g.fillRect(0,c.height-40,160,2);
  for(let x=8;x<160;x+=50){g.fillStyle='#253046';g.fillRect(x,c.height-28,37,26);g.fillStyle='#121525';g.fillRect(x+2,c.height-26,33,22);g.fillStyle=b.neon;g.globalAlpha=.3;g.fillRect(x+3,c.height-25,31,2);g.globalAlpha=1;}
  g.fillStyle='#100a20';g.fillRect(3,c.height-65,154,23);g.strokeStyle=b.neon;g.lineWidth=1;g.strokeRect(3,c.height-65,154,23);g.font='bold 16px monospace';g.textAlign='center';g.shadowColor=b.neon;g.shadowBlur=5;g.fillStyle=b.neon;g.fillText(b.sign,80,c.height-48,146);g.shadowBlur=0;
  // One conspicuous vertical hotel sign gives the street an old adventure-game silhouette.
  if(b.sign==='HOTEL'){g.fillStyle='#160c24';g.fillRect(132,c.height-137,24,72);g.fillStyle=b.neon;g.font='bold 12px monospace';for(let i=0;i<5;i++)g.fillText('HOTEL'[i],144,c.height-124+i*13);}
  b.textures[side]=c;return c;
}
function building(b){
  const x=b.x,z=b.z,w=b.w,d=b.d,h=b.h;
  function wall(points,side){
    const tex=wallTexture(b,side);
    // Narrow panels reduce affine texture distortion and improve depth ordering.
    const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
    for(let s=0;s<8;s++){
      const l=s/8,r=(s+1)/8;
      const panel=[lerp(points[0],points[1],l),lerp(points[0],points[1],r),lerp(points[3],points[2],r),lerp(points[3],points[2],l)];
      face(panel.map((p,i)=>({...p,u:[l*160,r*160,r*160,l*160][i],v:[tex.height,tex.height,0,0][i]})),b.color,tex);
    }
  }
  if(player.z<z)wall([{x,y:0,z},{x:x+w,y:0,z},{x:x+w,y:h,z},{x,y:h,z}],0);
  if(player.z>z+d)wall([{x:x+w,y:0,z:z+d},{x,y:0,z:z+d},{x,y:h,z:z+d},{x:x+w,y:h,z:z+d}],1);
  if(player.x<x)wall([{x,y:0,z:z+d},{x,y:0,z},{x,y:h,z},{x,y:h,z:z+d}],2);
  if(player.x>x+w)wall([{x:x+w,y:0,z},{x:x+w,y:0,z:z+d},{x:x+w,y:h,z:z+d},{x:x+w,y:h,z}],3);
}
function texturedTriangle(p,a,tex){
  const [v0,v1,v2]=a,[p0,p1,p2]=p;
  const u1=v1.u-v0.u,v1d=v1.v-v0.v,u2=v2.u-v0.u,v2d=v2.v-v0.v,det=u1*v2d-u2*v1d;
  if(Math.abs(det)<.0001)return;
  const x1=p1.x-p0.x,x2=p2.x-p0.x,y1=p1.y-p0.y,y2=p2.y-p0.y;
  const aa=(x1*v2d-x2*v1d)/det,bb=(y1*v2d-y2*v1d)/det,cc=(x2*u1-x1*u2)/det,dd=(y2*u1-y1*u2)/det;
  ctx.save();ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,p0.x-aa*v0.u-cc*v0.v,p0.y-bb*v0.u-dd*v0.v);ctx.drawImage(tex,0,0);ctx.restore();
}
function drawFace(f){
  ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();
  if(f.texture)for(let i=1;i<f.ps.length-1;i++)texturedTriangle([f.ps[0],f.ps[i],f.ps[i+1]],[f.vs[0],f.vs[i],f.vs[i+1]],f.texture);
  const fog=Math.min(.94,Math.max(0,(f.depth-22)/135));
  if(fog>0){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgba(15,10,30,${fog})`;ctx.fill();}
}
const sprites=[];
function sprite(type,frame,back=false){
  const key=(back?12:0)+type*4+frame;if(sprites[key])return sprites[key];
  const c=document.createElement('canvas');c.width=24;c.height=48;const g=c.getContext('2d');
  const rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const stride=[-2,0,2,0][frame],skin=type===2?'#94624e':'#e2a282';
  if(type===1){ // Adult clubgoer: big hair, magenta minidress, fishnets and heels.
    rect('#b96d40',7,1,11,16);rect(skin,9,5,7,8);rect('#f7bd5b',7,1,11,5);rect('#ef4c99',8,15,10,15);rect(skin,5,16,3,15);rect(skin,18,16,3,15);rect('#ec849a',8,30,4,13+stride);rect('#ec849a',14,30,4,13-stride);
    for(let y=31;y<43;y+=3)for(let x=8;x<18;x++)if(x<12||x>=14)if((x+y)%2)rect('#43283e',x,y,1,1);
    rect('#170f28',7,43+stride,6,2);rect('#170f28',14,43-stride,7,2);rect('#170f28',8,45+stride,1,2);rect('#170f28',15,45-stride,1,2);
  }else{
    rect(type===2?'#171422':'#503e43',8,2,10,6);rect(skin,8,6,10,8);rect(type===2?'#1e1e2b':'#67bac5',5,15,16,17);rect(type===2?'#b2b0aa':'#efb9c4',10,16,6,14);rect(skin,3,19,3,13);rect(skin,21,19,3,13);rect('#21283f',7,32,6,12+stride);rect('#21283f',15,32,5,12-stride);rect('#b8a7ac',5,44+stride,8,3);rect('#b8a7ac',15,44-stride,8,3);
    if(type===0){rect('#101225',7,7,12,3);rect('#99dfeb',8,7,3,1);}else{rect('#d7b352',10,17,1,6);rect('#d7b352',15,17,1,6);rect('#d7b352',11,23,4,1);rect('#281e26',10,12,7,2);}
  }
  if(back){
    if(type===1){
      // Long hair covers the face and shoulders from behind.
      rect('#b96d40',7,1,11,18);rect('#f7bd5b',8,2,3,14);rect('#905235',16,6,2,13);
      rect('#b72e76',12,20,1,10);rect('#ff79b5',8,28,10,2);
    }else{
      // Back of the head and a closed jacket: no face, glasses, shirt or chain.
      rect(type===2?'#171422':'#503e43',8,2,10,11);
      rect(skin,10,13,6,2);
      rect(type===2?'#1e1e2b':'#67bac5',5,15,16,17);
      rect(type===2?'#414052':'#438d9b',6,18,14,1);
      rect(type===2?'#11121e':'#438d9b',12,20,1,11);
      rect('#687080',7,34,4,2);rect('#687080',16,34,3,2);
      rect('#655e70',5,44+stride,8,3);rect('#655e70',15,44-stride,8,3);
    }
  }
  sprites[key]=c;return c;
}
function person(p){
  const v=camera({x:p.x,y:0,z:p.z});if(v.z<.3||v.z>105)return;const pos=project(v),height=1.85*F/v.z,width=height/2;
  if(pos.x+width<0||pos.x-width>W)return;
  queue.push({depth:v.z,draw(){ctx.globalAlpha=Math.max(.15,1-Math.max(0,v.z-30)/120);ctx.drawImage(sprite(p.type,p.frame,pedestrianShowsBack(p,player)),Math.round(pos.x-width/2),Math.round(pos.y-height),Math.ceil(width),Math.ceil(height));ctx.globalAlpha=1;}});
}
function car(c){
  const w=c.axis?4.7:2.1,d=c.axis?2.1:4.7,x=c.x-w/2,z=c.z-d/2;
  box(x,.25,z,w,.65,d,c.color);box(x+(c.axis?1:.15),.9,z+(c.axis?.15:1),c.axis?2.5:1.8,.6,c.axis?1.8:2.5,'#34445d','#657187');
  if(c.axis){for(const side of [-1,1])for(const offset of [.8,3.5])box(x+offset,.12,c.z+side*1.05-.1,.7,.55,.2,'#10101b');}
  else{for(const side of [-1,1])for(const offset of [.8,3.5])box(c.x+side*1.05-.1,.12,z+offset,.2,.55,.7,'#10101b');}
  const frontX=c.x+(c.axis?c.dir*2.36:0),frontZ=c.z+(c.axis?0:c.dir*2.36);
  for(const side of [-1,1])box(frontX+(c.axis?-.04:side*.7-.2),.52,frontZ+(c.axis?side*.7-.2:-.04),c.axis?.08:.4,.2,c.axis?.4:.08,'#fff0b8');
}
function street(chunk){
  const x=chunk.x*64,z=chunk.z*64;
  quad(x+8,.04,z+8,48,48,'#414052');quad(x+8,.06,z+8,48,.25,'#777185');quad(x+8,.06,z+8,.25,48,'#777185');
  // Keep each entire dash between the intersections, which begin at offset 56.
  for(let t=12;t+4<=56;t+=12){quad(x-.09,.025,z+t,.18,4,'#b09485');quad(x+t,.025,z-.09,4,.18,'#b09485');}
  for(let i=-3;i<=3;i++){quad(x+i*1.4,.03,z+7,.65,2.7,'#81798a');quad(x+7,.03,z+i*1.4,2.7,.65,'#81798a');}
  // Pavement seams and a pool of neon light outside each storefront.
  for(let i=10;i<56;i+=6){quad(x+i,.07,z+8,.06,6,'#272739');quad(x+8,.07,z+i,6,.06,'#272739');}
  quad(x+16,.08,z+9,12,3,'#57354f');quad(x+9,.08,z+35,3,10,'#294755');
}
function render(){
  ctx.fillStyle='#0f0a1e';ctx.fillRect(0,0,W,H);ctx.fillStyle='#24213a';
  for(const star of stars){const p=projectSky(star,player.angle,W,F,horizon);if(p)ctx.fillRect(Math.floor(p.x),Math.floor(p.y),1,1);}
  const moonPosition=projectSky(moon,player.angle,W,F,horizon);
  if(moonPosition){ctx.fillStyle='#c4aacb';ctx.fillRect(moonPosition.x-6,moonPosition.y-6,13,13);}
  ctx.fillStyle='#252233';ctx.fillRect(0,horizon,W,H-horizon);queue=[];
  const visible=[...city.chunks.values()].filter(chunk=>Math.hypot(chunk.x*64+32-player.x,chunk.z*64+32-player.z)<=170);
  for(const chunk of visible)street(chunk);
  queue.sort((a,b)=>b.depth-a.depth);
  for(const f of queue)drawFace(f);
  queue=[];
  for(const chunk of visible){
    for(const b of chunk.buildings)building(b);
    for(const p of chunk.people)person(pedestrian(chunk,p,time));
    for(const c of traffic(chunk,time))car(c);
  }
  queue.sort((a,b)=>b.depth-a.depth);
  ctx.save();if(!reduced)ctx.translate(shake?Math.sin(time*85)*shake:0,running?Math.sin(steps)*.65:0);
  for(const f of queue)f.draw?f.draw():drawFace(f);ctx.restore();
  const vignette=ctx.createRadialGradient(320,180,110,320,180,390);vignette.addColorStop(0,'#05031000');vignette.addColorStop(1,'#050310aa');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function pause(){running=false;keys.clear();shiftKeys.clear();document.querySelector('#pace').hidden=true;overlay.hidden=false;start.innerHTML='BACK TO THE NIGHT <span>→</span>';document.querySelector('#description').textContent='The night can wait.';start.focus();}
function play(){enableSound();running=true;overlay.hidden=true;keys.clear();shiftKeys.clear();canvas.focus();last=performance.now();}
start.addEventListener('click',play);document.querySelector('#pause').addEventListener('click',()=>running?pause():play());
const valid=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift','Escape']);
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(!valid.has(k))return;if(k==='Escape'){if(running)pause();return;}if(running){e.preventDefault();keys.add(k);syncShift(e);}});
function syncShift(e){
  if(e.key==='Shift'){if(e.type==='keydown')shiftKeys.add(e.code);else shiftKeys.delete(e.code);}
  if(e.shiftKey||shiftKeys.size)keys.add('Shift');else keys.delete('Shift');
}
window.addEventListener('keyup',e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);if(running)syncShift(e);});
window.addEventListener('blur',()=>{if(running)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause();});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
function tick(now){
  const dt=Math.min((now-last)/1000,.04);last=now;
  if(running){
    time+=dt;hitCooldown=Math.max(0,hitCooldown-dt);shake=Math.max(0,shake-dt*12);notice=Math.max(0,notice-dt);
    const pace=keys.has('Shift')?3:1;
    document.querySelector('#pace').hidden=pace===1;
    player.angle+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.65*pace;
    const forward=Number(keys.has('ArrowUp')||keys.has('w'))-Number(keys.has('ArrowDown')||keys.has('s')),side=Number(keys.has('d'))-Number(keys.has('a')),speed=dt*5.8*pace/Math.max(1,Math.hypot(forward,side));
    const people=city.pedestrians(time-dt);
    city.move(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,people);
    if(forward||side)steps+=dt*10*pace;
    city.update(player.x,player.z);
    const cars=[...city.chunks.values()].flatMap(chunk=>traffic(chunk,time));
    if(hornWarning.update(dt,player,cars))playHorn(audioContext);
    collision: if(!hitCooldown)for(const c of cars){
      if(Math.abs(player.x-c.x)<(c.axis?2.8:1.5)&&Math.abs(player.z-c.z)<(c.axis?1.5:2.8)){
        const side=c.axis?(player.z>=c.z?1:-1):(player.x>=c.x?1:-1);
        city.move(player,c.axis?c.dir*2.5:side*7,c.axis?side*7:c.dir*2.5,people);shake=7;notice=2.5;hitCooldown=1.5;playOuch();
        break collision;
      }
    }
    city.advancePedestrians(dt,player,time);
    document.querySelector('#message').textContent=notice?'HEY! WATCH THE TRAFFIC.':'';
    document.querySelector('#location').textContent=`MIDNIGHT DISTRICT / ${Math.floor(player.x/64)}, ${Math.floor(player.z/64)}`;
  }
  if(running||!painted){render();painted=true;}
  requestAnimationFrame(tick);
}
city.update(player.x,player.z);requestAnimationFrame(tick);
