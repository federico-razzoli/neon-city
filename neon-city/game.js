import {PubLife,PubConversation} from './pub-life.js?v=beer-1';
import {DepthRenderer} from './depth-renderer.js';
import {CoverAttempt,loadCoverGrunt,playCoverGrunt} from './manholes.js?v=reach-4';
import {sprite,outfit} from './sprites.js?v=characters-12';
import {City, pedestrian, pedestrianShowsBack, mod, RIVER_VIEW_DISTANCE, groundHeight, characterHeight, pubLines} from './world.js?v=parks-4';
import {Traffic} from './traffic.js?v=parks-4';
import {RiverLook} from './river-look.js?v=parks-4';
import {drawRiverTerrain,drawRiverStructures,drawRiverbankFaces,drawBridgeFascias} from './rivers.js?v=parks-4';
import {drawParkGround,drawParkStructures,facingBench} from './parks.js?v=parks-4';
import {ParkBirds,parkVolume} from './park-birds.js?v=parks-4';
import {drawArcade,arcadeName,arcadeVolume,ArcadeAmbience} from './arcade.js?v=names-1';
import {drawPub,pubName} from './pub.js?v=names-1';
import {PUB,facingPubChair,createPubPatrons,facingToiletDoor,facingStaffDoor,facingPubDoor,facingPubExit,moveInPub,drawPubInterior} from './pub-interior.js?v=beer-1';
import {facingPubMenu} from './pub-menu.js';
import {projectSky,skyHorizon,URSA_MAJOR} from './sky.js?v=bench-1';
import {orderSurfaces,orderGroundSurfaces} from './surface-order.js';
import {drawWallTexture,drawPitchedWallTexture} from './perspective.js?v=raster-1';
import {hotelHIsDim,dimHotelH} from './hotel.js';
import {HornWarning,playHorn} from './horn.js';

const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d',{alpha:false});
const overlay=document.querySelector('#overlay'),start=document.querySelector('#start');
const pubMenu=document.querySelector('#pub-menu');
let insidePub=false,streetPosition=null,pubPatrons=[],bartenderType=1,currentPubName='',playerSeat=null,pubLife=null,pubTalk=null;
const pubBuildings=()=>[...city.chunks.values()].flatMap(chunk=>chunk.buildings);
const nearPubDoor=()=>insidePub?facingPubExit(player):facingPubDoor(player,pubBuildings());
function usePubDoor(){
  const door=nearPubDoor();
  if(!door)return false;
  if(insidePub){Object.assign(player,streetPosition);insidePub=false;}
  else{pubLife=door.pubLife??=new PubLife();currentPubName=pubName(door);bartenderType=door.bartenderType??=Math.floor(Math.random()*4);pubPatrons=door.pubPatrons??=createPubPatrons();streetPosition={...player,angle:player.angle+Math.PI};Object.assign(player,PUB.spawn);insidePub=true;}
  keys.clear();shiftKeys.clear();coverPressed=false;startSpaceHeld=true;notice=0;shake=0;steps=0;arcadeAmbience.mute();parkBirds.mute();
  return true;
}
// Pub chairs and park benches share one seated mode: locked position, limited
// turning, and looking up or down, until Space returns the player to their feet.
const SEATED_EYE=1.5;
function useSeat(){
  let greet=false;
  if(playerSeat){
    // Return to the clear position from which the player sat down.
    player.x=playerSeat.standing.x;player.z=playerSeat.standing.z;
    playerSeat=null;eye=1.65;pubTalk=null;
  }else if(!insidePub){
    const seat=facingBench(player,city.chunks.values());
    if(!seat)return false;
    playerSeat={bench:seat.bench,standing:{x:player.x,z:player.z},angle:seat.angle,pitch:0};
    player.x=seat.x;player.z=seat.z;player.angle=seat.angle;eye=SEATED_EYE;
  }else{
    const chair=facingPubChair(player,pubPatrons,pubLife?.walker?.chair);
    if(!chair)return false;
    const angle=chair.side<0?0:Math.PI;
    playerSeat={tableIndex:chair.tableIndex,seat:chair.seat,standing:{x:player.x,z:player.z},angle,pitch:0};
    player.x=chair.x+chair.w/2;player.z=chair.z+chair.d/2;player.angle=angle;
    eye=SEATED_EYE;
    const partner=pubPatrons[chair.tableIndex]?.[1-chair.seat];
    greet=partner!=null;
    pubTalk=greet?new PubConversation(pubLines(partner)):null;
  }
  keys.clear();shiftKeys.clear();startSpaceHeld=true;notice=greet?2.5:0;steps=0;
  if(greet)noticeText='HI THERE!';
  return true;
}
const nearPubMenu=()=>!insidePub&&pubBuildings().find(b=>facingPubMenu(player,[b]));
function togglePubMenu(){
  keys.clear();shiftKeys.clear();coverPressed=false;
  if(pubMenu.open){pubMenu.close();startSpaceHeld=true;canvas.focus();}
  else{const pub=nearPubMenu();if(!pub)return;document.querySelector('#pub-menu .menu-eyebrow').textContent=`${pubName(pub)} · DRINKS`;pubMenu.showModal();arcadeAmbience.mute();parkBirds.mute();document.querySelector('#pace').hidden=true;}
}
pubMenu.addEventListener('cancel',e=>e.preventDefault());
const city=new City(),player={x:10,z:4,angle:.12},keys=new Set(),shiftKeys=new Set();
const roadTraffic=new Traffic();
const W=640,H=360,F=355,horizon=164;
let eye=1.65;
// Generate a fixed sky around the entire world, rather than wrapping the screen.
const starColors=['#211e33','#27233a','#2d2840','#332d46'];
const stars=Array.from({length:300},()=>({bearing:Math.random()*Math.PI*2,elevation:.1+Math.random()*.35,color:starColors[Math.floor(Math.random()*starColors.length)]}));
// Higher stars are above the level view; they appear when a seated player looks up.
// Uniform over the upper sky, so they do not crowd around the zenith.
for(let i=0;i<700;i++)stars.push({bearing:Math.random()*Math.PI*2,elevation:Math.asin(Math.sin(.45)+Math.random()*(1-Math.sin(.45))),color:starColors[Math.floor(Math.random()*starColors.length)]});
const moon={bearing:.33,elevation:.31};
let running=false,time=0,last=0,queue=[],shake=0,hitCooldown=0,notice=0,steps=0,painted=false;
let noticeText='',coverPressed=false,startSpaceHeld=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
ctx.imageSmoothingEnabled=false;

let audioContext,ouchBuffer,ouchLoading;
const hornWarning=new HornWarning();
const coverAttempt=new CoverAttempt();
const riverLook=new RiverLook();
const arcadeAmbience=new ArcadeAmbience();
const parkBirds=new ParkBirds();
function enableSound(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    audioContext??=new AudioContext();
    audioContext.resume().catch(()=>{});
    loadCoverGrunt(audioContext);
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


function camera(v){
  const dx=v.x-player.x,dz=v.z-player.z,c=Math.cos(player.angle),s=Math.sin(player.angle);
  const y=v.y-eye,z=dx*s+dz*c,pitch=playerSeat?.pitch??0,cp=Math.cos(pitch),sp=Math.sin(pitch);
  return {x:dx*c-dz*s,y:y*cp-z*sp,z:z*cp+y*sp,u:v.u||0,v:v.v||0};
}
function project(v){return {x:W/2+v.x*F/v.z,y:horizon-v.y*F/v.z};}
function clip(vertices){const out=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],ai=a.z>=.15,bi=b.z>=.15;if(ai)out.push(a);if(ai!==bi){const t=(.15-a.z)/(b.z-a.z),v={};for(const k of ['x','y','z','u','v'])v[k]=a[k]+(b[k]-a[k])*t;out.push(v);}}return out;}
let vehicleSurface=null,vehicleTurn=null;
function face(vertices,color,texture=null,smooth=false){
  if(vehicleSurface)vertices=vertices.map(v=>({...v,y:v.y+vehicleSurface(v.z)}));
  if(vehicleTurn){
    const {x,z,angle}=vehicleTurn,c=Math.cos(angle),s=Math.sin(angle);
    vertices=vertices.map(v=>({...v,x:x+(v.x-x)*c+(v.z-z)*s,z:z-(v.x-x)*s+(v.z-z)*c}));
  }
  const vs=vertices.map(camera),depth=vs.reduce((s,p)=>s+p.z,0)/vs.length;
  if(depth>RIVER_VIEW_DISTANCE||vs.every(p=>p.z<.15))return;
  const clipped=clip(vs);if(clipped.length<3)return;
  const ps=clipped.map(project);
  if(ps.every(p=>p.x<0)||ps.every(p=>p.x>W)||ps.every(p=>p.y<0)||ps.every(p=>p.y>H))return;
  queue.push({ps,vs:clipped,depth,elevation:vertices[0].y,color,texture,smooth});
}
function quad(x,y,z,w,d,color){face([{x,y,z},{x:x+w,y,z},{x:x+w,y,z:z+d},{x,y,z:z+d}],color);}
function box(x,y,z,w,h,d,color,roof=color){
  const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
  const up=p=>({...p,y:y+h});
  if(player.z<z)face([a,b,up(b),up(a)],color);
  if(player.z>z+d)face([c,e,up(e),up(c)],color);
  if(player.x<x)face([e,a,up(a),up(e)],color);
  if(player.x>x+w)face([b,c,up(c),up(b)],color);
  if(eye>y+h+(vehicleSurface?vehicleSurface(z+d/2):0))face([up(a),up(b),up(c),up(e)],roof);
  if(insidePub&&eye<y)face([e,c,b,a],color);
}
function wallTexture(b,side,dim=hotelHIsDim(b,time)){
  // Separate immutable textures keep the pitched renderer's pixel cache valid.
  const textures=dim?(b.dimTextures??=[]):(b.textures??=[]);
  if(textures[side])return textures[side];
  if(dim){
    const lit=wallTexture(b,side,false),c=document.createElement('canvas');
    c.width=lit.width;c.height=lit.height;const g=c.getContext('2d');
    g.drawImage(lit,0,0);dimHotelH(g,c.height);
    textures[side]=c;return c;
  }
  const c=document.createElement('canvas');c.width=160;c.height=b.h*9;const g=c.getContext('2d');
  g.fillStyle=b.color;g.fillRect(0,0,c.width,c.height);
  for(let y=8;y<c.height-42;y+=26)for(let x=9;x<155;x+=25){const lit=mod(x*17+y*13+b.seed,11)>4;g.fillStyle=lit?(mod(x+y+b.seed,3)?'#777086':'#b2968b'):'#14172a';g.fillRect(x,y,12,15);g.fillStyle='#252238';g.fillRect(x+5,y,2,15);g.fillRect(x,y+7,12,2);}
  g.fillStyle='#0e101e';g.fillRect(0,c.height-39,160,39);g.fillStyle='#54415d';g.fillRect(0,c.height-40,160,2);
  for(let x=8;x<160;x+=50){g.fillStyle='#253046';g.fillRect(x,c.height-28,37,26);g.fillStyle='#121525';g.fillRect(x+2,c.height-26,33,22);g.fillStyle=b.neon;g.globalAlpha=.3;g.fillRect(x+3,c.height-25,31,2);g.globalAlpha=1;}
  if(b.sign==='ARCADE')drawArcade(g,c.height,b,side);
  if(b.sign==='NEON PUB')drawPub(g,c.height,b,side);
  g.fillStyle='#100a20';g.fillRect(3,c.height-65,154,23);g.strokeStyle=b.neon;g.lineWidth=1;g.strokeRect(3,c.height-65,154,23);g.font='bold 16px monospace';g.textAlign='center';g.shadowColor=b.neon;g.shadowBlur=5;g.fillStyle=b.neon;g.fillText(b.sign==='ARCADE'?arcadeName(b):b.sign==='NEON PUB'?pubName(b):b.sign,80,c.height-48,146);g.shadowBlur=0;
  // The vertical hotel sign must fit entirely below the roofline.
  if(b.sign==='HOTEL'&&c.height>=137){g.fillStyle='#160c24';g.fillRect(132,c.height-137,24,72);g.fillStyle=b.neon;g.font='bold 12px monospace';for(let i=0;i<5;i++)g.fillText('HOTEL'[i],144,c.height-124+i*13);}
  textures[side]=c;return c;
}
function building(b){
  const x=b.x,z=b.z,w=b.w,d=b.d,h=b.h;
  function wall(points,side){
    const tex=wallTexture(b,side);
    // Panels retain fine-grained depth ordering against cars and pedestrians.
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
function drawFace(f){
  ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();
  if(f.texture&&playerSeat?.pitch)drawPitchedWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth);
  else if(f.texture)drawWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth);
  const fog=Math.min(.94,Math.max(0,(f.depth-22)/135));
  if(fog>0){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgba(15,10,30,${fog})`;ctx.fill();}
}
function person(p){
  // Anchor feet on the pavement and sort overlapping deck panels by local depth.
  // Project the head too, so a seated player's pitched view keeps true heights.
  const foot={x:p.x,y:groundHeight(p.x,p.z)+.075,z:p.z},v=camera(foot);if(v.z<.3||v.z>105)return;
  const head=camera({...foot,y:foot.y+characterHeight(p.type)});if(head.z<.3)return;
  const pos=project(v),height=pos.y-project(head).y,width=characterHeight(p.type)*F/v.z/2;if(height<=0)return;
  if(pos.x+width<0||pos.x-width>W)return;
  queue.push({detail:true,depth:v.z,ps:[{x:pos.x-width/2,y:pos.y},{x:pos.x+width/2,y:pos.y},{x:pos.x+width/2,y:pos.y-height},{x:pos.x-width/2,y:pos.y-height}],vs:Array.from({length:4},()=>({z:v.z})),draw(){ctx.globalAlpha=Math.max(.15,1-Math.max(0,v.z-30)/120);ctx.drawImage(sprite(p.type,p.frame,pedestrianShowsBack(p,player),p.variant),Math.round(pos.x-width/2),Math.round(pos.y-height),Math.ceil(width),Math.ceil(height));ctx.globalAlpha=1;}});
}
function car(c){
  vehicleTurn=c.turn?{x:c.x,z:c.z,angle:c.turn.angle}:null;
  const base=groundHeight(c.x,c.z),slope=c.axis?0:(groundHeight(c.x,c.z+.1)-groundHeight(c.x,c.z-.1))/.2;
  vehicleSurface=z=>base+(z-c.z)*slope;
  const w=c.axis?4.7:2.1,d=c.axis?2.1:4.7,x=c.x-w/2,z=c.z-d/2;
  box(x,.25,z,w,.65,d,c.color);box(x+(c.axis?1:.15),.9,z+(c.axis?.15:1),c.axis?2.5:1.8,.6,c.axis?1.8:2.5,'#34445d','#657187');
  if(c.axis){for(const side of [-1,1])for(const offset of [.8,3.5])box(x+offset,.12,c.z+side*1.05-.1,.7,.55,.2,'#10101b');}
  else{for(const side of [-1,1])for(const offset of [.8,3.5])box(c.x+side*1.05-.1,.12,z+offset,.2,.55,.7,'#10101b');}
  const frontX=c.x+(c.axis?c.dir*2.36:0),frontZ=c.z+(c.axis?0:c.dir*2.36);
  for(const side of [-1,1])box(frontX+(c.axis?-.04:side*.7-.2),.52,frontZ+(c.axis?side*.7-.2:-.04),c.axis?.08:.4,.2,c.axis?.4:.08,'#fff0b8');
  vehicleSurface=null;vehicleTurn=null;
}
let newspaperTexture;
function newspaperMachine(m){
  const firstFace=queue.length;
  if(!newspaperTexture){
    const c=document.createElement('canvas');c.width=160;c.height=224;
    const g=c.getContext('2d');
    g.fillStyle='#a93242';g.fillRect(0,0,160,224);
    g.fillStyle='#eee1bd';g.fillRect(7,9,146,38);
    g.fillStyle='#311d29';g.textAlign='center';g.font='bold 20px serif';g.fillText('DAILY BUGLE',80,35,140);
    g.fillStyle='#501e30';g.fillRect(9,56,142,130);
    g.fillStyle='#829395';g.fillRect(13,60,134,122);
    g.fillStyle='#e2d8b9';g.fillRect(22,69,106,103);
    g.fillStyle='#292636';g.font='bold 13px serif';g.fillText('DAILY BUGLE',75,85,100);
    g.font='bold 10px monospace';g.fillText('CITY NEWS',75,101);
    g.fillStyle='#626272';g.fillRect(29,109,43,31);
    for(let y=110;y<161;y+=6){g.fillRect(79,y,40,2);if(y>143)g.fillRect(29,y,43,2);}
    g.fillStyle='#e2d8b9';g.fillRect(133,98,8,36);
    g.fillStyle='#beb9ac';g.fillRect(15,195,33,19);
    g.fillStyle='#232231';g.fillRect(20,202,23,4);
    g.fillStyle='#f1d6b5';g.font='bold 12px monospace';g.fillText('25¢',113,210);
    newspaperTexture=c;
  }
  const scale=.85,top=.08+1.45*.9*scale,front=.45*scale+.001;
  box(m.x-m.w/2,.08,m.z-m.d/2,m.w,1.45*.9*scale,m.d,'#862c3d','#c44c55');
  // The cap overhangs the front and sides, with its back flush to the wall.
  const dx=[0,0,-1,1][m.side],dz=[-1,1,0,0][m.side];
  const capW=m.w+(m.side<2?.06:.054)*scale,capD=m.d+(m.side<2?.054:.06)*scale;
  box(m.x+dx*.027*scale-capW/2,top,m.z+dz*.027*scale-capD/2,capW,.08*.9*scale,capD,'#ba4351','#d25b60');
  // Front faces the street; texture follows the same perspective as buildings.
  const point=(u,y)=>m.side<2?{x:m.x+(m.side===0?u:-u),y,z:m.z+dz*front}:{x:m.x+dx*front,y,z:m.z+(m.side===2?-u:u)};
  face([point(-.5*scale,.08),point(.5*scale,.08),point(.5*scale,top),point(-.5*scale,top)].map((p,i)=>({...p,u:[0,160,160,0][i],v:[224,224,0,0][i]})),'#a93242',newspaperTexture);
  for(let i=firstFace;i<queue.length;i++){queue[i].detail=true;queue[i].textureSmooth=true;}
}
function street(chunk){
  const x=chunk.x*64,z=chunk.z*64;
  if(chunk.river){drawRiverTerrain(chunk,{quad,face},time);return;}
  // Asphalt needs geometry to occlude the recessed river at street approaches.
  // The screen background alone cannot hide water projected over the road.
  quad(x,0,z,64,64,'#252233');
  quad(x+8,.04,z+8,48,48,'#414052');quad(x+8,.06,z+8,48,.25,'#777185');quad(x+8,.06,z+8,.25,48,'#777185');
  // Keep each entire dash between the intersections, which begin at offset 56.
  for(let t=12;t+4<=56;t+=12){quad(x-.09,.025,z+t,.18,4,'#b09485');quad(x+t,.025,z-.09,4,.18,'#b09485');}
  for(let i=-3;i<=3;i++){quad(x+i*1.4,.03,z+7,.65,2.7,'#81798a');quad(x+7,.03,z+i*1.4,2.7,.65,'#81798a');}
  // Pavement seams and a pool of neon light outside each storefront.
  for(let i=10;i<56;i+=6){quad(x+i,.07,z+8,.06,6,'#272739');quad(x+8,.07,z+i,6,.06,'#272739');}
  if(chunk.park){drawParkGround(chunk,{quad,face});return;}
  quad(x+16,.08,z+9,12,3,'#57354f');quad(x+9,.08,z+35,3,10,'#294755');
}
function manhole(m){
  // Flat circular iron covers, projected with the same camera as the pavement.
  const disk=(radius,y,color)=>face(Array.from({length:16},(_,i)=>{
    const angle=i*Math.PI/8;
    return {x:m.x+Math.cos(angle)*radius,y,z:m.z+Math.sin(angle)*radius};
  }),color);
  disk(m.radius,.09,'#171923');
  disk(m.radius-.08,.091,'#777482');
  disk(m.radius-.14,.092,'#343541');
  for(const offset of [-.25,0,.25]){
    const length=2*Math.sqrt((m.radius-.2)**2-offset**2);
    quad(m.x-length/2,.093,m.z+offset-.025,length,.05,'#161923');
  }
}
const seatedPixels=new Map();
function seatedPatron(p,walking=false){
  const back=walking?pedestrianShowsBack(p,player):(player.z-p.z)*p.side>0;
  const frame=walking?Math.floor(p.walkTime*6)%4:1,rows=walking?48:32,key=`${p.type}:${outfit(p.type,p.variant)}:${back}:${frame}:${rows}`;
  if(!seatedPixels.has(key)){
    // Reuse the pedestrians' actual heads, hair, clothing and accessories.
    const data=sprite(p.type,frame,back,p.variant).getContext('2d').getImageData(0,0,24,rows).data,runs=[];
    for(let y=0;y<rows;y++)for(let x=0;x<24;){
      const offset=(y*24+x)*4;
      if(!data[offset+3]){x++;continue;}
      const color='#'+Array.from(data.slice(offset,offset+3),v=>v.toString(16).padStart(2,'0')).join('');
      let end=x+1;
      while(end<24&&[0,1,2,3].every(c=>data[(y*24+end)*4+c]===data[offset+c]))end++;
      runs.push({x,y,end,color});x=end;
    }
    seatedPixels.set(key,runs);
  }
  // Standing patrons use the pub's larger scale, with their feet on the floor.
  const scale=walking?.05:.0375,headHeight=walking?48*scale:1.87;
  for(const run of seatedPixels.get(key)){
    const left=(run.x-12)*scale,right=(run.end-12)*scale,top=headHeight-run.y*scale,bottom=top-scale;
    const point=(offset,y)=>({x:p.x+Math.cos(player.angle)*offset,y,z:p.z-Math.sin(player.angle)*offset});
    face([point(left,bottom),point(right,bottom),point(right,top),point(left,top)],run.color);
  }
}
let interiorRenderer;
function render(){
  if(!insidePub)eye=(playerSeat?SEATED_EYE:1.65)+groundHeight(player.x,player.z);
  else if(!playerSeat)eye=1.65;
  document.querySelector('.scanlines').classList.toggle('pub-shade',insidePub);
  if(insidePub){
    queue=[];drawPubInterior({face,quad,box,patrons:pubPatrons,seatedPatron,bartenderType});
    if(pubLife?.walker)seatedPatron(pubLife.walker,true);
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue);return;
  }
  ctx.fillStyle='#0f0a1e';ctx.fillRect(0,0,W,H);
  const pitch=playerSeat?.pitch??0;
  for(const star of stars){const p=projectSky(star,player.angle,W,F,horizon,pitch);if(p){ctx.fillStyle=star.color;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),1,1);}}
  ctx.fillStyle='#3b344e';
  for(const star of URSA_MAJOR){
    const p=projectSky(star,player.angle,W,F,horizon,pitch);
    if(p)ctx.fillRect(Math.floor(p.x),Math.floor(p.y),1,1);
  }
  const moonPosition=projectSky(moon,player.angle,W,F,horizon,pitch);
  if(moonPosition){
    ctx.fillStyle='#c4aacb';
    const widths=[5,9,11,11,13,13,13,13,13,11,11,9,5];
    widths.forEach((width,row)=>ctx.fillRect(moonPosition.x-(width-1)/2,moonPosition.y-6+row,width,1));
  }
  const ground=skyHorizon(horizon,F,pitch);
  ctx.fillStyle='#252233';if(ground<H)ctx.fillRect(0,ground,W,H-ground);queue=[];
  const visible=[...city.chunks.values()].filter(chunk=>Math.hypot(chunk.x*64+32-player.x,chunk.z*64+32-player.z)<=(chunk.river?RIVER_VIEW_DISTANCE:170));
  for(const chunk of visible)street(chunk);
  orderGroundSurfaces(queue);
  const terrain=queue;
  for(const f of terrain)if(f.elevation<0)drawFace(f);
  queue=[];
  for(const chunk of visible)if(chunk.river){
    drawRiverbankFaces(chunk,{face},player);
    drawBridgeFascias(chunk,{face},player,true);
  }
  queue.sort((a,b)=>b.depth-a.depth);
  for(const f of queue)drawFace(f);
  for(const f of terrain)if(f.elevation>=0)drawFace(f);
  // Ground details go over the pavement, before people and buildings.
  queue=[];
  for(const chunk of visible)for(const m of chunk.manholes)manhole(m);
  for(const f of queue)drawFace(f);
  queue=[];
  for(const chunk of visible){
    if(chunk.river)drawRiverStructures(chunk,{face,box},player);
    for(const b of chunk.buildings)building(b);
    for(const m of chunk.newspaperMachines??[])newspaperMachine(m);
    if(chunk.park){
      // Benches and trees are small, layered objects; order them at real overlaps.
      const first=queue.length;
      drawParkStructures(chunk,{face},{x:player.x,y:eye,z:player.z});
      for(let i=first;i<queue.length;i++)queue[i].detail=true;
    }
    for(const p of chunk.people)person(pedestrian(chunk,p,time));
  }
  for(const c of roadTraffic.cars)if(Math.hypot(c.x-player.x,c.z-player.z)<RIVER_VIEW_DISTANCE)car(c);
  queue=orderSurfaces(queue);
  ctx.save();if(!reduced)ctx.translate(shake?Math.sin(time*85)*shake:0,running?Math.sin(steps)*.65:0);
  for(const f of queue)f.draw?f.draw():drawFace(f);ctx.restore();
  const vignette=ctx.createRadialGradient(320,180,110,320,180,390);vignette.addColorStop(0,'#05031000');vignette.addColorStop(1,'#050310aa');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function pause(){if(pubMenu.open)return;startSpaceHeld=false;running=false;arcadeAmbience.mute();parkBirds.mute();keys.clear();shiftKeys.clear();coverPressed=false;document.querySelector('#pace').hidden=true;overlay.hidden=false;start.innerHTML='BACK TO THE NIGHT <span>→</span>';document.querySelector('#description').textContent='The night can wait.';start.focus();}
function play(){if(pubMenu.open)return;enableSound();running=true;overlay.hidden=true;keys.clear();shiftKeys.clear();coverPressed=false;canvas.focus();last=performance.now();}
start.addEventListener('click',play);document.querySelector('#pause').addEventListener('click',()=>running?pause():play());
const valid=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift','Escape',' ']);
window.addEventListener('keydown',e=>{const k=e.code==='Space'?' ':e.key.length===1?e.key.toLowerCase():e.key;if(pubMenu.open){e.preventDefault();if(k===' '&&!e.repeat)togglePubMenu();return;}if(!valid.has(k))return;if(k==='Escape'){if(running)pause();return;}
if(k===' '&&!running){
  e.preventDefault();
  if(!e.repeat){play();startSpaceHeld=true;}
  return;
}
if(k===' '&&startSpaceHeld){e.preventDefault();return;}
if(running){
  e.preventDefault();
  if(k===' '&&!e.repeat){if(useSeat())return;if(usePubDoor())return;if(insidePub){if(facingStaffDoor(player)){notice=2.5;noticeText="IT'S LOCKED...";}else if(facingToiletDoor(player)){notice=2.5;noticeText="SOMEONE'S IN!";}return;}if(nearPubMenu()){togglePubMenu();return;}coverPressed=true;enableSound();}
  keys.add(k);syncShift(e);
}});
function syncShift(e){
  if(e.key==='Shift'){if(e.type==='keydown')shiftKeys.add(e.code);else shiftKeys.delete(e.code);}
  if(e.shiftKey||shiftKeys.size)keys.add('Shift');else keys.delete('Shift');
}
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' ')startSpaceHeld=false;keys.delete(e.code==='Space'?' ':e.key.length===1?e.key.toLowerCase():e.key);if(running&&!pubMenu.open)syncShift(e);});
window.addEventListener('blur',()=>{if(running)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause();});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(!running||pubMenu.open)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
function tick(now){
  // Camera input follows elapsed time through ordinary slow frames. Bound long
  // stalls, while retaining the smaller simulation step for safe movement.
  const elapsed=Math.max(0,(now-last)/1000),cameraDt=Math.min(elapsed,.25),dt=Math.min(elapsed,.04);last=now;
  if(running&&!pubMenu.open){
    time+=dt;hitCooldown=Math.max(0,hitCooldown-dt);shake=Math.max(0,shake-dt*12);notice=Math.max(0,notice-dt);
    const pace=!playerSeat&&keys.has('Shift')?3:1;
    document.querySelector('#pace').hidden=pace===1;
    player.angle+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*cameraDt*1.65*pace;
    if(playerSeat){
      player.angle=Math.max(playerSeat.angle-Math.PI/4,Math.min(playerSeat.angle+Math.PI/4,player.angle));
      const tilt=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
      playerSeat.pitch=Math.max(0,Math.min(Math.PI/2,playerSeat.pitch+tilt*cameraDt*1.65));
    }
    const forward=Number(keys.has('ArrowUp')||keys.has('w'))-Number(keys.has('ArrowDown')||keys.has('s')),side=Number(keys.has('d'))-Number(keys.has('a')),speed=dt*5.8*pace/Math.max(1,Math.hypot(forward,side));
    if(insidePub){
      pubLife?.update(dt,pubPatrons,playerSeat,player);
      const line=pubTalk?.update(dt);
      if(line){notice=2.5;noticeText=line;}
      const bumpedPerson=!playerSeat&&moveInPub(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,pubPatrons,pubLife?.walker);
      if(bumpedPerson){notice=2.5;noticeText='HEY! WATCH OUT!';}
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / ${player.x<18?'BAR ROOM':'LOUNGE'}`;
    }else{
    const people=city.pedestrians(time-dt);
    const bumpedPedestrian=!playerSeat&&city.move(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,people);
    if(bumpedPedestrian){notice=2.5;noticeText='HEY! WATCH OUT!';}
    if(!playerSeat&&(forward||side))steps+=dt*10*pace;
    city.update(player.x,player.z);
    arcadeAmbience.update(audioContext,arcadeVolume(player,[...city.chunks.values()].flatMap(chunk=>chunk.buildings)),dt);
    parkBirds.update(audioContext,parkVolume(player,city.chunks.values()),dt);
    const cars=roadTraffic.update(city.chunks.values(),time,dt);
    if(hornWarning.update(dt,player,cars))playHorn(audioContext);
    collision: if(!hitCooldown)for(const c of cars){
      if(Math.abs(player.x-c.x)<(c.axis?2.8:1.5)&&Math.abs(player.z-c.z)<(c.axis?1.5:2.8)){
        const side=c.axis?(player.z>=c.z?1:-1):(player.x>=c.x?1:-1);
        city.move(player,c.axis?c.dir*2.5:side*7,c.axis?side*7:c.dir*2.5,people);shake=7;notice=2.5;noticeText='HEY! WATCH THE TRAFFIC.';hitCooldown=1.5;playOuch();
        break collision;
      }
    }
    if(riverLook.try(player,coverPressed||keys.has(' '),coverPressed)){
      notice=4.5;noticeText="THIS IS NIGHT RIVER. IT'S BEAUTIFUL...";
    }else if((coverPressed||keys.has(' '))&&coverAttempt.try(player,city.chunks.values(),time,!coverPressed)){
      notice=2.5;noticeText="IT'S TOO HEAVY.";
      playCoverGrunt(audioContext);
    }
    coverPressed=false;
    city.advancePedestrians(dt,player,time);
    document.querySelector('#message').textContent=nearPubMenu()?'SPACE — READ DRINKS MENU':notice?noticeText:'';
    document.querySelector('#location').textContent=`MIDNIGHT DISTRICT / ${Math.floor(player.x/64)}, ${Math.floor(player.z/64)}`;
    }
  }
  if(running||!painted){render();painted=true;}
  requestAnimationFrame(tick);
}
city.update(player.x,player.z);requestAnimationFrame(tick);
