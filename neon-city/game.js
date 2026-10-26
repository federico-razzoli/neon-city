import {Wallet,drawMoneyNote} from './money.js?v=oblique-1';
import {followupFor} from './npc-dialogue.js?v=punk-girl-1';
import {drawFlower} from './flowers.js';
import {Inventory,takeOutdoorItem,dropItem,takeDroppedItem} from './inventory.js?v=hotel-note-1';
import {HOTEL_STAIRWELL,createHotelStairwell,stairwellHeight,stairwellDropSpot,facingStairwellExit,facingHotelCorridor,facingStorageDoor,STORAGE_EXIT,interactStairwellLight,moveInHotelStairwell,drawHotelStairwell} from './hotel-stairwell.js?v=drop-spot-1';
import {HOTEL_STORAGE,facingStorageExit,interactStorage,moveInHotelStorage,drawHotelStorage,drawDroppedNote} from './hotel-storage.js?v=hotel-note-3';
import {ARCADE,arcadeReply,facingArcadeDoor,facingArcadeExit,facingArcadeSeat,moveInArcade,drawArcadeInterior} from './arcade-interior.js?v=door-centred-1';
import {rollBanshee,bansheeFrame,playBansheeScream,drawBanshee} from './banshee.js?v=6';
import {register} from './register.js';
import {PubLife,PubConversation} from './pub-life.js?v=npc-followup-1';
import {DepthRenderer} from './depth-renderer.js';
import {CoverAttempt,loadCoverGrunt,playCoverGrunt} from './manholes.js?v=reach-4';
import {sprite,outfit} from './sprites.js?v=bumps-1';
import {City, pedestrian, pedestrianShowsBack, mod, RIVER_VIEW_DISTANCE, groundHeight, characterHeight, characterGirth, pubLines, START, START_SIGN} from './world.js?v=park-entrances-1';
import {Traffic} from './traffic.js?v=crosswalk-yield-1';
import {RiverLook} from './river-look.js?v=parks-4';
import {drawRiverTerrain,drawRiverStructures,drawRiverbankFaces,drawBridgeFascias} from './rivers.js?v=flowers-1';
import {drawParkGround,drawParkStructures,drawFingerpost,facingBench,pineCone,treeReply,signReply,paintSign,SIGN_TEXTURE} from './parks.js?v=flowers-1';
import {WalkerTalk,talksHere} from './walker-talk.js?v=punk-girl-1';
import {ParkBirds,parkVolume} from './park-birds.js?v=parks-4';
import {drawArcade,arcadeName,arcadeVolume,ArcadeAmbience} from './arcade.js?v=park-entrances-1';
import {drawPub,pubName} from './pub.js?v=park-entrances-1';
import {PUB,BOTTLES_REPLY,BARTENDER_TALK,BARTENDER_REPLY,POKE_BALL_REPLY,BAR_BEER_REPLY,StaffTalk,facingPokeBall,hasPokeBall,facingBartender,facingBartenderAcrossBar,facingPubChair,createPubPatrons,facingToiletDoor,facingStaffDoor,facingBottles,facingPubDoor,facingPubExit,moveInPub,drawPubInterior} from './pub-interior.js?v=punk-girl-1';
import {LAVATORY,CUBICLE,LavatoryLife,facingLavatoryExit,facingSink,tapVolume,facingVacantCubicle,facingCubicleExit,facingToilet,outsideCubicle,rollOccupancy,lavatoryReply,moveInLavatory,moveInCubicle,drawLavatory,drawCubicle} from './lavatory.js?v=staff-room-1';
import {playFlush} from './flush.js?v=toilet-2';
import {TapWater} from './water.js?v=taps-1';
import {LobbyMusic,LOBBY_MUSIC,LOBBY_PIECES} from './lobby-music.js?v=pub-music-2';
import {PubMusic,PUB_PIECES,pubMusicHeard} from './pub-music.js?v=pub-music-4';
import {HOTEL,HOTEL_STAIR_DOOR,hotelDropSpot,facingHotelStairDoor,RECEPTIONISTS,RECEPTIONIST_TALK,RECEPTIONIST_GIFTS,ROBOT_TALK,BELL_ANSWER,HotelLife,facingHotelRobot,facingHotelDoor,facingHotelExit,facingHotelBell,facingHotelLamp,facingHotelSeat,facingReceptionistAcrossDesk,hotelFloorHeight,hotelReply,moveInHotel,switchHotelLamp,drawHotelInterior} from './hotel-interior.js?v=court-shoes-1';
import {playDeskBell} from './desk-bell.js?v=bell-2';
import {facingPubMenu} from './pub-menu.js?v=park-entrances-1';
import {ShootingStars,onRiverWalk} from './shooting-stars.js?v=1';
import {projectSky,skyHorizon,URSA_MAJOR} from './sky.js?v=bench-1';
import {orderSurfaces,orderGroundSurfaces} from './surface-order.js';
import {drawWallTexture,drawPitchedWallTexture} from './perspective.js?v=street-1';
import {hotelHIsDim,dimHotelH,drawHotel,hotelLook} from './hotel.js?v=park-entrances-1';
import {HornWarning,playHorn} from './horn.js';

const canvas=document.querySelector('#view'),ctx=canvas.getContext('2d',{alpha:false});
const overlay=document.querySelector('#overlay'),start=document.querySelector('#start');
const inventory=new Inventory(),inventoryBox=document.querySelector('#inventory');
const wallet=new Wallet(),moneyDisplay=document.querySelector('#money');
moneyDisplay.textContent=wallet.balance;
const pubMenu=document.querySelector('#pub-menu'),talkBox=document.querySelector('#staff-talk');
let insideArcade=false,currentArcadeName='',insidePub=false,insideHotel=false,insideLavatory=false,insideCubicle=null,lavatoryOccupied=[],lavatoryLife=null,lavatoryTaps=[],currentHotel=null,hotelLife=null,streetPosition=null,pubPatrons=[],bartenderType=1,currentPubName='',playerSeat=null,pubLife=null,pubTalk=null;
let hotelStairs=null,hotelStorage=false,currentVenue=null;
let banshee=null,bansheeMisses=0,staffTalk=null;
const pubBuildings=()=>[...city.chunks.values()].flatMap(chunk=>chunk.buildings);
const indoors=()=>insideArcade||insidePub||insideHotel||insideLavatory||insideCubicle!=null;
// Space at a pub or hotel door goes in or, from inside, back out to the street.
// The pub's TOILET door leads to its lavatory, where a free cubicle opens.
function useDoor(){
  if(insideHotel&&hotelStorage){
    if(!facingStorageExit(player))return false;
    Object.assign(player,STORAGE_EXIT);hotelStorage=false;
  }else if(insideHotel&&hotelStairs&&facingStorageDoor(player,hotelStairs)){
    Object.assign(player,HOTEL_STORAGE.spawn);hotelStorage=true;
  }else if(insideHotel&&hotelStairs){
    if(!facingStairwellExit(player,hotelStairs))return false;
    Object.assign(player,{x:HOTEL_STAIR_DOOR.x,z:HOTEL_STAIR_DOOR.z-.9,angle:Math.PI});hotelStairs=null;
  }else if(insideHotel&&facingHotelStairDoor(player)){
    hotelStairs=createHotelStairwell();Object.assign(player,HOTEL_STAIRWELL.spawn);
  }else if(insidePub&&facingToiletDoor(player)){Object.assign(player,LAVATORY.spawn);insidePub=false;insideLavatory=true;lavatoryOccupied=rollOccupancy();lavatoryLife=new LavatoryLife();lavatoryTaps=LAVATORY.sinks.map(()=>false);}
  else if(insideLavatory){
    const cubicle=facingVacantCubicle(player,lavatoryOccupied);
    if(cubicle){Object.assign(player,CUBICLE.spawn);insideLavatory=false;insideCubicle=cubicle;if(rollBanshee(Math.random,bansheeMisses)){bansheeMisses=0;banshee={started:performance.now()};register.PUB_PARANORMAL_ACTIVITIES=true;playBansheeScream(audioContext,2);}else bansheeMisses++;}
    else if(facingLavatoryExit(player)){Object.assign(player,{x:PUB.toiletDoor.x,z:PUB.toiletDoor.z-.9,angle:Math.PI});insideLavatory=false;insidePub=true;}
    else return false;
  }else if(insideCubicle){
    if(!facingCubicleExit(player))return false;
    Object.assign(player,outsideCubicle(insideCubicle));insideCubicle=null;insideLavatory=true;
  }else if(indoors()){
    if(!(insideArcade?facingArcadeExit(player):insidePub?facingPubExit(player):facingHotelExit(player)))return false;
    Object.assign(player,streetPosition);insideArcade=insidePub=insideHotel=false;
  }else{
    const pub=facingPubDoor(player,pubBuildings()),hotel=!pub&&facingHotelDoor(player,pubBuildings());
    const arcade=!pub&&!hotel&&facingArcadeDoor(player,pubBuildings());
    if(!pub&&!hotel&&!arcade)return false;
    currentVenue=pub||hotel||arcade;
    streetPosition={...player,angle:player.angle+Math.PI};
    if(pub){pubLife=pub.pubLife??=new PubLife();currentPubName=pubName(pub);bartenderType=pub.bartenderType??=Math.floor(Math.random()*4);pubPatrons=pub.pubPatrons??=createPubPatrons();pubMusic.choose(PUB_PIECES[Math.floor(Math.random()*PUB_PIECES.length)]);Object.assign(player,PUB.spawn);insidePub=true;}
    // Each hotel keeps the receptionist first seen on duty there.
    else if(arcade){Object.assign(player,ARCADE.spawn);insideArcade=true;currentArcadeName=arcadeName(arcade);}
    else{currentHotel=hotel;hotel.receptionist??=RECEPTIONISTS[Math.floor(Math.random()*RECEPTIONISTS.length)];Object.assign(player,HOTEL.spawn);insideHotel=true;hotelLife=new HotelLife();lobbyMusic.choose(LOBBY_PIECES[Math.floor(Math.random()*LOBBY_PIECES.length)]);}
  }
  keys.clear();shiftKeys.clear();coverPressed=false;startSpaceHeld=true;notice=0;shake=0;steps=0;arcadeAmbience.mute();parkBirds.mute();
  return true;
}
// Pub chairs, park benches, arcade bridge chairs and the toilet share one seated mode: locked
// position, limited turning, and looking up or down, until Space returns the
// player to their feet. Getting up from the toilet flushes it.
const SEATED_EYE=1.5;
function useSeat(){
  if(hotelStairs)return false;
  let greet=false;
  if(playerSeat){
    // Return to the clear position from which the player sat down.
    player.x=playerSeat.standing.x;player.z=playerSeat.standing.z;
    if(playerSeat.toilet)playFlush(audioContext);
    playerSeat=null;eye=1.65;pubTalk=null;
  }else if(insideCubicle){
    const seat=facingToilet(player);
    if(!seat)return false;
    playerSeat={toilet:true,standing:{x:player.x,z:player.z},angle:seat.angle,pitch:0};
    player.x=seat.x;player.z=seat.z;player.angle=seat.angle;eye=seat.eye;
  }else if(insideLavatory)return false;
  else if(!insidePub){
    // Park benches outside; the sofa in a hotel lobby; the arcade's bridge chairs.
    const seat=insideHotel?facingHotelSeat(player):insideArcade?facingArcadeSeat(player):facingBench(player,city.chunks.values());
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
    pubTalk=greet?new PubConversation(pubLines(partner),Math.random,undefined,followupFor(partner,'pub')):null;
  }
  keys.clear();shiftKeys.clear();startSpaceHeld=true;notice=greet?2.5:0;steps=0;
  if(greet)noticeText='HI THERE!';
  return true;
}
function itemRoom(){
  if(!indoors())return 'street';
  const room=insideCubicle?`cubicle:${insideCubicle.x},${insideCubicle.z}`:insideLavatory?'lavatory':insidePub?'pub':insideArcade?'arcade':hotelStorage?'hotel-storage':hotelStairs?'hotel-stairs':'hotel';
  return `${currentVenue.x},${currentVenue.z}:${room}`;
}
// Where something dropped here comes to rest, and the height it rests at.
function dropSpot(){
  if(!indoors())return {x:player.x,z:player.z,ground:groundHeight(player.x,player.z)+.085};
  if(insideHotel&&!hotelStorage)return hotelStairs?stairwellDropSpot(player,hotelStairs):hotelDropSpot(player);
  return {x:player.x,z:player.z,ground:0};
}
const itemGround=()=>dropSpot().ground;
function dropSelectedItem(){
  if(playerSeat){document.querySelector('#inventory-description').textContent="I NEED TO STAND UP FIRST.";return;}
  const position=indoors()?currentVenue:player;
  const chunk=city.chunks.get(`${Math.floor(position.x/64)},${Math.floor(position.z/64)}`);
  const {x,z,ground}=dropSpot();
  const dropped=dropItem(inventory,{...player,x,z},chunk,itemRoom(),ground);
  showInventory();
  if(dropped)document.querySelector('#inventory-description').textContent='DROPPED';
}
function drawDroppedItems(chunks){
  const room=itemRoom();
  for(const chunk of chunks)for(const item of chunk.droppedItems??[]){
    if(item.room!==room)continue;
    const first=queue.length;
    if(item.item.id==='flower')drawFlower({...item.item,...item},quad);
    else if(item.item.id==='hotel-note')drawDroppedNote(item,face);
    else pineCone(item,face,{x:player.x,y:eye,z:player.z});
    for(let i=first;i<queue.length;i++)queue[i].detail=true;
  }
}
function showInventory(){
  const list=document.querySelector('#inventory-items');
  list.innerHTML=inventory.items.map((item,i)=>`<li${i===inventory.selected?' aria-current="true"':''}>${item.name}</li>`).join('');
  document.querySelector('#inventory-empty').hidden=inventory.items.length>0;
  document.querySelector('#inventory-description').textContent=inventory.description?(inventory.current?.description??''):'';
  list.querySelector('[aria-current]')?.scrollIntoView({block:'nearest'});
}
function toggleInventory(){
  keys.clear();shiftKeys.clear();coverPressed=false;
  if(inventoryBox.open){inventoryBox.close();canvas.focus();}
  else{
    inventory.description=false;showInventory();inventoryBox.showModal();
    arcadeAmbience.mute();parkBirds.mute();tapWater.mute();lobbyMusic.mute();pubMusic.mute();
    document.querySelector('#pace').hidden=true;
  }
}
inventoryBox.addEventListener('cancel',e=>{e.preventDefault();toggleInventory();});
const nearPubMenu=()=>!indoors()&&pubBuildings().find(b=>facingPubMenu(player,[b]));
function togglePubMenu(){
  keys.clear();shiftKeys.clear();coverPressed=false;
  if(pubMenu.open){pubMenu.close();startSpaceHeld=true;canvas.focus();}
  else{const pub=nearPubMenu();if(!pub)return;document.querySelector('#pub-menu .menu-eyebrow').textContent=`${pubName(pub)} · DRINKS`;pubMenu.showModal();arcadeAmbience.mute();parkBirds.mute();document.querySelector('#pace').hidden=true;}
}
pubMenu.addEventListener('cancel',e=>e.preventDefault());
// Talking to the bartender, the receptionist or a hotel robot holds the room
// still, as the drinks menu holds the street.
function talkToStaff(script,label,gifts={}){
  keys.clear();shiftKeys.clear();coverPressed=false;notice=0;
  staffTalk=new StaffTalk(script,undefined,inventory,gifts);talkBox.ariaLabel=label;document.querySelector('#pace').hidden=true;showStaffTalk();
}
function passiveConversation(){
  return insidePub?pubTalk:insideLavatory?lavatoryTalk.apart===0?lavatoryTalk.conversation:null:!indoors()&&walkerTalk.apart===0?walkerTalk.conversation:null;
}
function startFollowup(){
  const conversation=passiveConversation();
  if(!conversation?.ready||conversation.opened)return false;
  conversation.opened=true;
  const {script,label,gifts}=conversation.followup;
  talkToStaff(script,label,gifts);
  return true;
}
function answerStaff(choice){
  staffTalk.confirm(choice);
  if(staffTalk.over){staffTalk=null;canvas.focus();}
  showStaffTalk();
}
function showStaffTalk(){
  const talk=staffTalk;
  talkBox.hidden=!talk;document.querySelector('#touch').hidden=!!talk;
  document.querySelector('#message').textContent='';
  if(!talk)return;
  // The answer takes the place of the choices, in the same box.
  talkBox.innerHTML=talk.line?`<p class="talk-answer">${talk.line}</p>`:
    `${talk.giving?'<p class="give-prompt">SELECT AN OBJECT TO GIVE</p>':''}<ol>${talk.script.map((option,i)=>`<li${option.separator?' class="talk-separator"':''}><button type="button" data-choice="${i}"${i===talk.selected?' aria-current="true"':''}>${option.ask}</button></li>`).join('')}</ol>`;
}
// A tap on a choice says it; a tap anywhere on an answer moves the chat on.
talkBox.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!staffTalk||!button&&!staffTalk.line)return;
  canvas.focus();
  answerStaff(button?.dataset.choice==null?undefined:Number(button.dataset.choice));
});
const city=new City(),player={...START},keys=new Set(),shiftKeys=new Set();
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
const shootingStars=new ShootingStars();
const skyView=()=>({angle:player.angle,width:W,focal:F,horizon,pitch:playerSeat?.pitch??0});
let running=false,time=0,last=0,queue=[],shake=0,hitCooldown=0,notice=0,steps=0,painted=false;
let noticeText='',coverPressed=false,startSpaceHeld=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
ctx.imageSmoothingEnabled=false;

let audioContext,ouchBuffer,ouchLoading;
const hornWarning=new HornWarning();
const coverAttempt=new CoverAttempt();
const riverLook=new RiverLook();
const walkerTalk=new WalkerTalk(),lavatoryTalk=new WalkerTalk();
const arcadeAmbience=new ArcadeAmbience();
const parkBirds=new ParkBirds();
const tapWater=new TapWater();
const lobbyMusic=new LobbyMusic(),pubMusic=new PubMusic();
function enableSound(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    audioContext??=new AudioContext();
    audioContext.resume().catch(()=>{});
    loadCoverGrunt(audioContext);
    lobbyMusic.prepare(audioContext);pubMusic.prepare(audioContext);
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
function face(vertices,color,texture=null,smooth=false,buildingWall=false){
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
  queue.push({ps,vs:clipped,depth,elevation:vertices[0].y,color,texture,smooth,buildingWall});
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
  if(indoors()&&eye<y)face([e,c,b,a],color);
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
  if(b.sign==='HOTEL')drawHotel(g,c.height,b,side);
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
      face(panel.map((p,i)=>({...p,u:[l*160,r*160,r*160,l*160][i],v:[tex.height,tex.height,0,0][i]})),b.color,tex,false,true);
    }
  }
  if(player.z<z)wall([{x,y:0,z},{x:x+w,y:0,z},{x:x+w,y:h,z},{x,y:h,z}],0);
  if(player.z>z+d)wall([{x:x+w,y:0,z:z+d},{x,y:0,z:z+d},{x,y:h,z:z+d},{x:x+w,y:h,z:z+d}],1);
  if(player.x<x)wall([{x,y:0,z:z+d},{x,y:0,z},{x,y:h,z},{x,y:h,z:z+d}],2);
  if(player.x>x+w)wall([{x:x+w,y:0,z},{x:x+w,y:0,z:z+d},{x:x+w,y:h,z:z+d},{x:x+w,y:h,z}],3);
}
function drawFace(f){
  // Opaque building textures own complete pixels at panel edges and carry
  // their own continuous fog. A polygon underlay/overlay would add seams.
  if(!f.buildingWall){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}
  if(f.texture&&(f.groundTexture||playerSeat?.pitch))drawPitchedWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth,f.buildingWall);
  else if(f.texture)drawWallTexture(ctx,f.ps,f.vs,f.texture,W,f.textureSmooth,f.buildingWall);
  if(f.buildingWall)return;
  const fog=Math.min(.94,Math.max(0,(f.depth-22)/135));
  if(fog>0){ctx.beginPath();f.ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=`rgba(15,10,30,${fog})`;ctx.fill();}
}
function person(p){
  // Anchor feet on the pavement and sort overlapping deck panels by local depth.
  // Project the head too, so a seated player's pitched view keeps true heights.
  const foot={x:p.x,y:groundHeight(p.x,p.z)+.075,z:p.z},v=camera(foot);if(v.z<.3||v.z>105)return;
  const head=camera({...foot,y:foot.y+characterHeight(p.type)});if(head.z<.3)return;
  const pos=project(v),height=pos.y-project(head).y,width=characterHeight(p.type)*characterGirth(p.type)*F/v.z/2;if(height<=0)return;
  if(pos.x+width<0||pos.x-width>W)return;
  queue.push({detail:true,depth:v.z,ps:[{x:pos.x-width/2,y:pos.y},{x:pos.x+width/2,y:pos.y},{x:pos.x+width/2,y:pos.y-height},{x:pos.x-width/2,y:pos.y-height}],vs:Array.from({length:4},()=>({z:v.z})),draw(){ctx.globalAlpha=Math.max(.15,1-Math.max(0,v.z-30)/120);ctx.drawImage(sprite(p.type,p.frame,pedestrianShowsBack(p,player),p.variant),Math.round(pos.x-width/2),Math.round(pos.y-height),Math.ceil(width),Math.ceil(height));ctx.globalAlpha=1;}});
}
let taxiSignTexture=null;
function taxiSign(){
  if(!taxiSignTexture){
    taxiSignTexture=document.createElement('canvas');
    taxiSignTexture.width=160;taxiSignTexture.height=56;
    const g=taxiSignTexture.getContext('2d');
    g.fillStyle='#ffcb57';g.fillRect(0,0,160,56);
    g.fillStyle='#171820';g.font='bold 44px sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText('TAXI',80,30);
  }
  return taxiSignTexture;
}
const vanTextures={};
function vanTexture(side){
  if(vanTextures[side])return vanTextures[side];
  const canvas=document.createElement('canvas');canvas.width=side==='side'?384:192;canvas.height=192;
  const g=canvas.getContext('2d'),w=canvas.width;
  g.fillStyle='#29a99c';g.fillRect(0,0,w,192);
  g.fillStyle='#f3e5bc';g.fillRect(0,0,w,86);
  g.fillStyle='#344d65';
  if(side==='front'){
    // Classic split windshield and cream V-shaped nose.
    g.fillRect(12,12,78,60);g.fillRect(102,12,78,60);
    g.fillStyle='#f3e5bc';g.beginPath();g.moveTo(0,82);g.lineTo(96,142);g.lineTo(192,82);g.fill();
    g.strokeStyle='#f3e5bc';g.lineWidth=4;g.beginPath();g.arc(96,137,20,0,Math.PI*2);g.stroke();
    g.font='bold 23px sans-serif';g.textAlign='center';g.fillText('VW',96,145);
    for(const x of [28,164]){g.fillStyle='#d6d8cc';g.beginPath();g.arc(x,155,15,0,Math.PI*2);g.fill();g.fillStyle='#fff0b8';g.beginPath();g.arc(x,155,11,0,Math.PI*2);g.fill();}
  }else if(side==='side'){
    for(let i=0;i<4;i++)g.fillRect(12+i*94,12,78,60);
    // Painted rainbow, flowers, and a peace symbol.
    for(const [i,color] of ['#f56392','#ffab54','#ffe475'].entries()){
      g.strokeStyle=color;g.lineWidth=8;g.beginPath();g.arc(182,180,69-i*10,Math.PI,Math.PI*2);g.stroke();
    }
    for(const [x,y,color] of [[40,126,'#ff77be'],[329,131,'#ffce59'],[286,166,'#ed8bea']]){
      g.fillStyle=color;
      for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.arc(x+Math.cos(a)*13,y+Math.sin(a)*13,9,0,Math.PI*2);g.fill();}
      g.fillStyle='#fff0b8';g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='#fff0b8';g.lineWidth=4;g.beginPath();g.arc(94,132,23,0,Math.PI*2);g.moveTo(94,109);g.lineTo(94,155);g.moveTo(94,132);g.lineTo(78,148);g.moveTo(94,132);g.lineTo(110,148);g.stroke();
  }else{
    g.fillRect(28,12,136,60);
    g.fillStyle='#e65a57';g.fillRect(14,145,14,25);g.fillRect(164,145,14,25);
    g.fillStyle='#e9dbb8';g.fillRect(67,152,58,18);
  }
  return vanTextures[side]=canvas;
}
let mercedesGrilleTexture=null;
function mercedesGrille(){
  if(mercedesGrilleTexture)return mercedesGrilleTexture;
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=96;
  const g=canvas.getContext('2d');
  g.fillStyle='#c9d0d6';g.fillRect(0,0,192,96);
  g.fillStyle='#252c36';g.fillRect(6,6,180,84);
  g.strokeStyle='#aebbc7';g.lineWidth=4;
  for(const y of [22,39,56,73]){g.beginPath();g.moveTo(10,y);g.lineTo(182,y);g.stroke();}
  g.beginPath();g.moveTo(96,6);g.lineTo(96,90);g.stroke();
  return mercedesGrilleTexture=canvas;
}
function car(c){
  vehicleTurn=c.turn?{x:c.x,z:c.z,angle:c.turn.angle}:null;
  const base=groundHeight(c.x,c.z),slope=c.axis?0:(groundHeight(c.x,c.z+.1)-groundHeight(c.x,c.z-.1))/.2;
  vehicleSurface=z=>base+(z-c.z)*slope;
  const w=c.axis?4.7:2.1,d=c.axis?2.1:4.7,x=c.x-w/2,z=c.z-d/2;
  // Local coordinates shared by the special vehicle bodies.
  const part=(across,along,y,width,length,height,color,roof=color)=>{
      const px=c.x+(c.axis?along*c.dir:across),pz=c.z+(c.axis?across:along*c.dir);
      box(px-(c.axis?length:width)/2,y,pz-(c.axis?width:length)/2,c.axis?length:width,height,c.axis?width:length,color,roof);
    };
  if(c.type==='hippie-van'){
    part(0,0,.25,2.1,4.7,1.85,'#29a99c','#f3e5bc');
    part(0,0,2.1,2.02,4.58,.18,'#f3e5bc','#fff1cf');
    const point=(across,along,y,u,v)=>({x:c.x+(c.axis?along*c.dir:across),z:c.z+(c.axis?across:along*c.dir),y,u,v});
    for(const side of [-1,1]){
      const left=side*c.dir*(c.axis?-1:1)*1.05,along=side*2.351;
      face([point(left,along,.25,0,192),point(-left,along,.25,192,192),point(-left,along,2.1,192,0),point(left,along,2.1,0,0)],'#29a99c',vanTexture(side===1?'front':'rear'));
      const a=side*1.051,start=side*(c.axis?-1:1)*2.35;
      face([point(a,start,.25,0,192),point(a,-start,.25,384,192),point(a,-start,2.1,384,0),point(a,start,2.1,0,0)],'#29a99c',vanTexture('side'));
      part(0,side*2.38,.29,2.1,.12,.14,'#deded1');
    }
  }else if(c.type==='mercedes'){
    // Low white saloon with a long bonnet, dark glass, and chrome trim.
    part(0,0,.25,2.1,4.7,.65,'#e5e9ee','#ffffff');
    part(0,-.3,.9,1.82,2.55,.56,'#354653','#e8edf3');
    part(0,-.3,1.46,1.86,2.58,.09,'#f1f3f6','#ffffff');
    for(const side of [-1,1]){
      for(const along of [-1.54,-.35,.94])part(side*.92,along,.9,.07,.09,.57,'#edf0f4');
      part(side*1.055,0,.73,.04,4.25,.055,'#bcc9d4');
      for(const along of [-.85,.45])part(side*.94,along,.85,.055,.23,.045,'#d8e2e9');
      part(side*.98,.85,1.01,.22,.26,.13,'#f4f5f7');
      part(side*.73,-2.37,.53,.46,.06,.22,'#c63448');
    }
    for(const along of [-2.38,2.38])part(0,along,.3,2.02,.1,.12,'#aebbc7');
    const left=c.dir*(c.axis?-1:1)*.5;
    const point=(across,y,u,v)=>({x:c.x+(c.axis?2.401*c.dir:across),z:c.z+(c.axis?across:2.401*c.dir),y,u,v});
    face([point(left,.43,0,96),point(-left,.43,192,96),point(-left,.86,192,0),point(left,.86,0,0)],'#c9d0d6',mercedesGrille());
    // Freestanding chrome ring and star mounted above the front of the bonnet.
    part(0,2.16,.9,.14,.14,.035,'#bdcad5');
    part(0,2.16,.935,.035,.035,.1,'#e4edf5');
    const ornamentPoint=(across,y,along)=>({
      x:c.x+(c.axis?along*c.dir:across),
      z:c.z+(c.axis?across:along*c.dir),y
    });
    const radius=.15,inner=.127,centre=1.18;
    for(const along of [2.14,2.18]){
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
        face([[radius,a],[radius,b],[inner,b],[inner,a]].map(([r,t])=>
          ornamentPoint(Math.cos(t)*r,centre+Math.sin(t)*r,along)),'#e4edf5');
      }
      for(let i=0;i<3;i++){
        const a=Math.PI/2+i*Math.PI*2/3,dx=Math.cos(a),dy=Math.sin(a),half=.012;
        face([[0,-half],[inner,-half],[inner,half],[0,half]].map(([length,offset])=>
          ornamentPoint(dx*length-dy*offset,centre+dy*length+dx*offset,along)),'#e4edf5');
      }
    }
    // Give the ring depth so the upright ornament also reads from the side.
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      face([[a,2.14],[b,2.14],[b,2.18],[a,2.18]].map(([t,along])=>
        ornamentPoint(Math.cos(t)*radius,centre+Math.sin(t)*radius,along)),'#aebfcd');
    }
  }else if(c.type==='taxi'){
    part(0,0,.25,2.1,4.7,.78,'#14151c','#242630');
    part(0,-.3,1.03,1.85,2.9,.8,'#455765','#171820');
    part(0,-.3,1.83,1.98,3.05,.16,'#171820','#30313a');
    // Window pillars, raised wheel arches, and chrome door handles.
    for(const side of [-1,1]){
      for(const along of [-1.7,-.3,1.1])part(side*.94,along,1.02,.1,.13,.82,'#191a22');
      for(const along of [-1.55,1.5])part(side*1.03,along,.55,.16,1.05,.28,'#252630');
      for(const along of [-.8,.5])part(side*.96,along,.91,.08,.28,.06,'#b8bdc5');
    }
    part(0,2.36,.42,1.02,.08,.48,'#a4aab3');
    for(const across of [-.36,-.18,0,.18,.36])part(across,2.41,.47,.055,.03,.37,'#34343d');
    for(const along of [-2.38,2.38])part(0,along,.29,1.95,.12,.12,'#a4aab3');
    part(0,.5,1.99,.82,.36,.28,'#ffcb57','#ffe29a');
    // Letter both faces; face() applies the same bridge slope and turn as the cab.
    for(const side of [-1,1]){
      const along=.5+side*.181,left=side*c.dir*(c.axis?-1:1)*.41;
      const point=(across,y,u,v)=>({
        x:c.x+(c.axis?along*c.dir:across),
        z:c.z+(c.axis?across:along*c.dir),y,u,v
      });
      face([point(left,1.99,0,56),point(-left,1.99,160,56),
        point(-left,2.27,160,0),point(left,2.27,0,0)],'#ffcb57',taxiSign());
    }
  }else{
    box(x,.25,z,w,.65,d,c.color);box(x+(c.axis?1:.15),.9,z+(c.axis?.15:1),c.axis?2.5:1.8,.6,c.axis?1.8:2.5,'#34445d','#657187');
  }
  if(c.axis){for(const side of [-1,1])for(const offset of [.8,3.5])box(x+offset,.12,c.z+side*1.05-.1,.7,.55,.2,'#10101b');}
  else{for(const side of [-1,1])for(const offset of [.8,3.5])box(c.x+side*1.05-.1,.12,z+offset,.2,.55,.7,'#10101b');}
  const frontX=c.x+(c.axis?c.dir*2.36:0),frontZ=c.z+(c.axis?0:c.dir*2.36);
  if(c.type!=='hippie-van')for(const side of [-1,1])box(frontX+(c.axis?-.04:side*.7-.2),.52,frontZ+(c.axis?side*.7-.2:-.04),c.axis?.08:.4,.2,c.axis?.4:.08,'#fff0b8');
  vehicleSurface=null;vehicleTurn=null;
}
// Cabinet colours per paper; any paper without an entry uses the Bugle's.
// Papers without a subtitle print CITY NEWS.
const NEWSPAPER_LOOKS={
  'DAILY BUGLE':{paint:'#a93242',masthead:'#311d29',frame:'#501e30',price:'#f1d6b5',body:['#862c3d','#c44c55'],cap:['#ba4351','#d25b60']},
  'NEON NEWS':{subtitle:'NIGHT EDITION',paint:'#2f8a4a',masthead:'#14301d',frame:'#1b4a2b',price:'#d8f2c6',body:['#246b3a','#43a35d'],cap:['#36994f','#58bd70']},
  'THE RECORD':{subtitle:'2 + 2 = 5',paint:'#2f5aa3',masthead:'#15223f',frame:'#1b3262',price:'#d3e1f6',body:['#25488a','#4a74c0'],cap:['#3962ad','#5a86cc']}
};
const newspaperTextures={};
function newspaperMachine(m){
  const firstFace=queue.length,paper=m.paper??'DAILY BUGLE',look=NEWSPAPER_LOOKS[paper]??NEWSPAPER_LOOKS['DAILY BUGLE'];
  if(!newspaperTextures[paper]){
    const c=document.createElement('canvas');c.width=160;c.height=224;
    const g=c.getContext('2d');
    g.fillStyle=look.paint;g.fillRect(0,0,160,224);
    g.fillStyle='#eee1bd';g.fillRect(7,9,146,38);
    g.fillStyle=look.masthead;g.textAlign='center';g.font='bold 20px serif';g.fillText(paper,80,35,140);
    g.fillStyle=look.frame;g.fillRect(9,56,142,130);
    g.fillStyle='#829395';g.fillRect(13,60,134,122);
    g.fillStyle='#e2d8b9';g.fillRect(22,69,106,103);
    g.fillStyle='#292636';g.font='bold 13px serif';g.fillText(paper,75,85,100);
    g.font='bold 10px monospace';g.fillText(look.subtitle??'CITY NEWS',75,101);
    g.fillStyle='#626272';g.fillRect(29,109,43,31);
    for(let y=110;y<161;y+=6){g.fillRect(79,y,40,2);if(y>143)g.fillRect(29,y,43,2);}
    g.fillStyle='#e2d8b9';g.fillRect(133,98,8,36);
    g.fillStyle='#beb9ac';g.fillRect(15,195,33,19);
    g.fillStyle='#232231';g.fillRect(20,202,23,4);
    g.fillStyle=look.price;g.font='bold 12px monospace';g.fillText('25¢',113,210);
    newspaperTextures[paper]=c;
  }
  const scale=.85,top=.08+1.45*.9*scale,front=.45*scale+.001;
  box(m.x-m.w/2,.08,m.z-m.d/2,m.w,1.45*.9*scale,m.d,...look.body);
  // The cap overhangs the front and sides, with its back flush to the wall.
  const dx=[0,0,-1,1][m.side],dz=[-1,1,0,0][m.side];
  const capW=m.w+(m.side<2?.06:.054)*scale,capD=m.d+(m.side<2?.054:.06)*scale;
  box(m.x+dx*.027*scale-capW/2,top,m.z+dz*.027*scale-capD/2,capW,.08*.9*scale,capD,...look.cap);
  // Front faces the street; texture follows the same perspective as buildings.
  const point=(u,y)=>m.side<2?{x:m.x+(m.side===0?u:-u),y,z:m.z+dz*front}:{x:m.x+dx*front,y,z:m.z+(m.side===2?-u:u)};
  face([point(-.5*scale,.08),point(.5*scale,.08),point(.5*scale,top),point(-.5*scale,top)].map((p,i)=>({...p,u:[0,160,160,0][i],v:[224,224,0,0][i]})),look.paint,newspaperTextures[paper]);
  for(let i=firstFace;i<queue.length;i++){queue[i].detail=true;queue[i].textureSmooth=true;}
}
// One texture per board text and direction the arrow can point on screen.
const signTextures=new Map();
function signTexture(text,tipRight){
  const key=`${text}|${tipRight}`;
  if(!signTextures.has(key)){
    const c=document.createElement('canvas');c.width=SIGN_TEXTURE.width;c.height=SIGN_TEXTURE.height;
    paintSign(c.getContext('2d'),text,tipRight);signTextures.set(key,c);
  }
  return signTextures.get(key);
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
function seatedPatron(p,walking=false,height=48*.05){
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
  // Standing patrons use the pub's larger scale, with their feet on the floor
  // (y above it, for a walker on the hotel stairs).
  const scale=walking?height/48:.0375,headHeight=walking?height+(p.y??0):1.87;
  for(const run of seatedPixels.get(key)){
    const girth=characterGirth(p.type),left=(run.x-12)*scale*girth,right=(run.end-12)*scale*girth,top=headHeight-run.y*scale,bottom=top-scale;
    const point=(offset,y)=>({x:p.x+Math.cos(player.angle)*offset,y,z:p.z-Math.sin(player.angle)*offset});
    face([point(left,bottom),point(right,bottom),point(right,top),point(left,top)],run.color);
  }
}
let interiorRenderer;
function render(){
  if(!indoors())eye=(playerSeat?SEATED_EYE:1.65)+groundHeight(player.x,player.z);
  else if(!playerSeat)eye=1.65+(insideHotel&&!hotelStorage?(hotelStairs?stairwellHeight(player,hotelStairs):hotelFloorHeight(player.x,player.z)):0);
  document.querySelector('.scanlines').classList.toggle('pub-shade',insidePub||insideLavatory||insideCubicle!=null);
  document.querySelector('.scanlines').classList.toggle('hotel-shade',insideHotel);
  if(insideArcade){
    queue=[];drawArcadeInterior({face,quad,box});
    drawDroppedItems(city.chunks.values());
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue,'#17172b');return;
  }
  if(insideHotel){
    queue=[];
    if(hotelStorage)drawHotelStorage({face,quad,box,noteTaken:currentHotel.storageNoteTaken});
    else if(hotelStairs)drawHotelStairwell({face,quad,box,look:hotelLook(currentHotel)});
    else drawHotelInterior({face,quad,box,look:hotelLook(currentHotel),receptionist:currentHotel.receptionist,lampOn:currentHotel.lampOn});
    // The lobby is built to true size, so the robot is too, on the stairs as well.
    if(!hotelStairs&&hotelLife?.walker)seatedPatron(hotelLife.walker,true,characterHeight(hotelLife.walker.type));
    drawDroppedItems(city.chunks.values());
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue,'#3a2d36');return;
  }
  if(insideCubicle){
    queue=[];drawCubicle({face,quad,box});
    drawDroppedItems(city.chunks.values());
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue);
    if(banshee){
      const seconds=(performance.now()-banshee.started)/1000,frame=bansheeFrame(seconds);
      if(frame.dark){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);}
      if(frame.opacity)drawBanshee(ctx,W,H,seconds,frame.opacity);
    }
    return;
  }
  if(insideLavatory){
    queue=[];drawLavatory({face,quad,box,occupied:lavatoryOccupied,viewer:{x:player.x,z:player.z,eye,angle:player.angle},taps:lavatoryTaps,time:performance.now()/1000});
    // The lavatory is built to true size, unlike the pub, so the robot is too.
    if(lavatoryLife?.walker)seatedPatron(lavatoryLife.walker,true,characterHeight(lavatoryLife.walker.type));
    drawDroppedItems(city.chunks.values());
    interiorRenderer??=new DepthRenderer(ctx,W,H);
    interiorRenderer.render(queue);return;
  }
  if(insidePub){
    queue=[];drawPubInterior({face,quad,box,patrons:pubPatrons,seatedPatron,bartenderType});
    if(pubLife?.walker)seatedPatron(pubLife.walker,true);
    drawDroppedItems(city.chunks.values());
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
  shootingStars.draw(ctx,skyView());
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
      drawParkStructures(chunk,{face,signTexture},{x:player.x,y:eye,z:player.z});
      for(let i=first;i<queue.length;i++){queue[i].detail=true;if(queue[i].texture)queue[i].textureSmooth=true;}
    }
    for(const p of chunk.people)person(pedestrian(chunk,p,time));
  }
  drawDroppedItems(visible);
  const firstMoneyFace=queue.length;
  drawMoneyNote(wallet.note,face);
  for(let i=firstMoneyFace;i<queue.length;i++){queue[i].detail=true;queue[i].textureSmooth=true;queue[i].groundTexture=true;}
  const firstSignFace=queue.length;
  drawFingerpost(START_SIGN,city.startSignBoards,{face,signTexture},{x:player.x,y:eye,z:player.z});
  for(let i=firstSignFace;i<queue.length;i++){queue[i].detail=true;if(queue[i].texture)queue[i].textureSmooth=true;}
  for(const c of roadTraffic.cars)if(Math.hypot(c.x-player.x,c.z-player.z)<RIVER_VIEW_DISTANCE)car(c);
  queue=orderSurfaces(queue);
  ctx.save();if(!reduced)ctx.translate(shake?Math.sin(time*85)*shake:0,running?Math.sin(steps)*.65:0);
  for(const f of queue)f.draw?f.draw():drawFace(f);ctx.restore();
  const vignette=ctx.createRadialGradient(320,180,110,320,180,390);vignette.addColorStop(0,'#05031000');vignette.addColorStop(1,'#050310aa');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function pause(){if(banshee||pubMenu.open||inventoryBox.open||staffTalk)return;startSpaceHeld=false;running=false;arcadeAmbience.mute();parkBirds.mute();tapWater.mute();lobbyMusic.mute();pubMusic.mute();keys.clear();shiftKeys.clear();coverPressed=false;document.querySelector('#pace').hidden=true;overlay.hidden=false;start.innerHTML='BACK TO THE NIGHT <span>→</span>';document.querySelector('#description').textContent='The night can wait.';start.focus();}
function play(){if(pubMenu.open||inventoryBox.open||staffTalk)return;enableSound();running=true;overlay.hidden=true;keys.clear();shiftKeys.clear();coverPressed=false;canvas.focus();last=performance.now();}
start.addEventListener('click',play);document.querySelector('#pause').addEventListener('click',()=>running?pause():play());
const valid=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift','Escape',' ']);
window.addEventListener('keydown',e=>{if(banshee){e.preventDefault();return;}const k=e.code==='Space'||e.key==='Enter'?' ':e.key.length===1?e.key.toLowerCase():e.key;if(pubMenu.open){e.preventDefault();if(k===' '&&!e.repeat)togglePubMenu();return;}
if(inventoryBox.open){
  e.preventDefault();
  if(k==='i'||k==='Escape'){if(!e.repeat)toggleInventory();}
  else if(k==='d'){if(!e.repeat)dropSelectedItem();}
  else if(k===' '){if(!e.repeat){inventory.description=true;showInventory();}}
  else{const step={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[k];if(step){inventory.move(step);showInventory();}}
  return;
}
if(k==='i'&&running&&!staffTalk){e.preventDefault();if(!e.repeat)toggleInventory();return;}
if(staffTalk){
  e.preventDefault();
  if(e.repeat)return;
  if(k==='Escape'){staffTalk=null;canvas.focus();showStaffTalk();}
  else if(k===' '){answerStaff();startSpaceHeld=!staffTalk;}
  else if(/^[1-9]$/.test(k)&&!staffTalk.line&&k<=staffTalk.script.length)answerStaff(Number(k)-1);
  else{const step={ArrowUp:-1,w:-1,ArrowDown:1,s:1}[k];if(step){staffTalk.move(step);showStaffTalk();}}
  return;
}if(!valid.has(k))return;if(k==='Escape'){if(running)pause();return;}
if(k===' '&&!running){
  e.preventDefault();
  if(!e.repeat){play();startSpaceHeld=true;}
  return;
}
if(k===' '&&startSpaceHeld){e.preventDefault();return;}
if(running){
  e.preventDefault();
  if(k===' '&&!e.repeat&&!indoors()){
    const line=walkerTalk.interact(player,city.pedestrians(time));
    if(startFollowup())return;
    if(line){notice=2.5;noticeText=line;document.querySelector('#message').textContent=line;return;}
  }
  if(k===' '&&!e.repeat&&insideHotel&&hotelStorage){
    const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());
    if(pickedUp){notice=2.5;noticeText=pickedUp;return;}
    if(useDoor())return;
    const reply=interactStorage(player,currentHotel,inventory);
    if(reply){notice=2.5;noticeText=reply;document.querySelector('#message').textContent=reply;}
    return;
  }
  if(k===' '&&!e.repeat&&insideHotel&&hotelStairs){
    const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());
    if(pickedUp){notice=2.5;noticeText=pickedUp;return;}
    if(useDoor())return;
    const lightReply=interactStairwellLight(player,hotelStairs);
    if(lightReply){notice=4.5;noticeText=lightReply;document.querySelector('#message').textContent=lightReply;}
    else if(facingHotelCorridor(player,hotelStairs)){notice=2.5;noticeText="IT'S LOCKED...";document.querySelector('#message').textContent=noticeText;}
    return;
  }
  const conversation=passiveConversation();
  if(e.key==='Enter'&&conversation?.lines.length){
    if(!e.repeat){
      const line=conversation.advance();
      if(startFollowup())return;
      if(line){notice=2.5;noticeText=line;document.querySelector('#message').textContent=line;}
    }
    return;
  }
  if(k===' '&&!e.repeat){const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());if(pickedUp){notice=2.5;noticeText=pickedUp;return;}if(insideHotel&&hotelLife.held&&facingHotelRobot(player,hotelLife.walker)){talkToStaff(ROBOT_TALK,'Talk to the robot');return;}if(useSeat())return;if(useDoor())return;if(insideArcade){const reply=arcadeReply(player);if(reply){notice=2.5;noticeText=reply;}return;}if(insideHotel){if(hasPokeBall(currentHotel.receptionist)&&facingPokeBall(player,HOTEL.pokeBall)){notice=2.5;noticeText=POKE_BALL_REPLY;return;}if(facingHotelLamp(player)){const complaint=switchHotelLamp(currentHotel);if(complaint){notice=2.5;noticeText=complaint;}return;}if(facingHotelBell(player)){playDeskBell(audioContext);notice=2.5;noticeText=BELL_ANSWER;return;}const reply=hotelReply(player);if(reply){notice=2.5;noticeText=reply;}else if(facingReceptionistAcrossDesk(player))talkToStaff(RECEPTIONIST_TALK,'Talk to the receptionist',RECEPTIONIST_GIFTS);return;}if(insideLavatory){const reply=lavatoryReply(player,lavatoryOccupied);if(reply){notice=2.5;noticeText=reply;return;}const sink=facingSink(player);if(sink!=null){enableSound();lavatoryTaps[sink]=!lavatoryTaps[sink];}return;}if(insideCubicle)return;if(insidePub){if(facingStaffDoor(player)){notice=2.5;noticeText="IT'S LOCKED...";}else if(hasPokeBall(bartenderType)&&facingPokeBall(player,PUB.pokeBall)){notice=2.5;noticeText=POKE_BALL_REPLY;}else if(facingPokeBall(player,PUB.barBeer)){notice=2.5;noticeText=BAR_BEER_REPLY;}else if(facingBartender(player)){notice=2.5;noticeText=BARTENDER_REPLY;}else if(facingBartenderAcrossBar(player))talkToStaff(BARTENDER_TALK,'Talk to the bartender');else if(facingBottles(player)){notice=2.5;noticeText=BOTTLES_REPLY;}return;}if(nearPubMenu()){togglePubMenu();return;}const cash=wallet.takeNote(player);if(cash){moneyDisplay.textContent=wallet.balance;notice=2.5;noticeText=cash;return;}const reply=takeOutdoorItem(player,city.chunks.values(),inventory)??treeReply(player,city.chunks.values())??signReply(player,city.chunks.values());if(reply){notice=2.5;noticeText=reply;return;}coverPressed=true;enableSound();}
  keys.add(k);syncShift(e);
}});
function syncShift(e){
  if(e.key==='Shift'){if(e.type==='keydown')shiftKeys.add(e.code);else shiftKeys.delete(e.code);}
  if(e.shiftKey||shiftKeys.size)keys.add('Shift');else keys.delete('Shift');
}
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' '||e.key==='Enter')startSpaceHeld=false;keys.delete(e.code==='Space'||e.key==='Enter'?' ':e.key.length===1?e.key.toLowerCase():e.key);if(running&&!pubMenu.open&&!inventoryBox.open&&!banshee&&!staffTalk)syncShift(e);});
window.addEventListener('blur',()=>{if(running)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause();});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(!running||pubMenu.open||inventoryBox.open||banshee||staffTalk)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
function tick(now){
  // Camera input follows elapsed time through ordinary slow frames. Bound long
  // stalls, while retaining the smaller simulation step for safe movement.
  const elapsed=Math.max(0,(now-last)/1000),cameraDt=Math.min(elapsed,.25),dt=Math.min(elapsed,.04);last=now;
  if(banshee){
    keys.clear();shiftKeys.clear();coverPressed=false;
    document.querySelector('#pace').hidden=true;
    document.querySelector('#message').textContent='';
    if(!bansheeFrame((now-banshee.started)/1000).active){banshee=null;notice=3.5;noticeText='WTF WAS THAT??...';}
  }
  if(running&&!pubMenu.open&&!inventoryBox.open&&!banshee&&!staffTalk){
    shootingStars.update(cameraDt,!indoors()&&onRiverWalk(player),skyView());
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
      const bumpedSeats=[];
      const bumpedPerson=!playerSeat&&moveInPub(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,pubPatrons,pubLife?.walker,bumpedSeats);
      pubLife?.bump(bumpedSeats,pubPatrons);
      if(bumpedPerson){notice=2.5;noticeText='HEY! WATCH OUT!';}
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / ${player.x<18?'BAR ROOM':'LOUNGE'}`;
    }else if(insideLavatory){
      // The pub waits, as it was, for the player to come back through.
      lavatoryLife.update(dt,lavatoryOccupied,player);
      // A robot the player keeps waiting talks, as walkers outside do.
      const line=lavatoryTalk.update(dt,lavatoryLife.held?[{walker:lavatoryLife.walker,place:'lavatory'}]:[]);
      if(line){notice=2.5;noticeText=line;}
      moveInLavatory(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,lavatoryLife.walker);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / LAVATORY`;
    }else if(insideCubicle){
      if(!playerSeat)moveInCubicle(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / ${insideCubicle.icon.toUpperCase()}`;
    }else if(insideArcade){
      if(!playerSeat)moveInArcade(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed);
      arcadeAmbience.update(audioContext,1,dt);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=currentArcadeName;
    }else if(insideHotel){
      if(hotelStorage)moveInHotelStorage(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed);
      else if(hotelStairs)moveInHotelStairwell(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,hotelStairs);
      else hotelLife.update(dt,player);
      if(!hotelStairs&&!playerSeat)moveInHotel(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,hotelLife.walker);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=hotelStorage?'HOTEL / FLOOR 2 / STORAGE':hotelStairs?`HOTEL / FLOOR ${hotelStairs.floor} / STAIRWELL`:'HOTEL / LOBBY';
    }else{
    const people=city.pedestrians(time-dt);
    const bumped=[];
    const bumpedPedestrian=!playerSeat&&city.move(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,people,bumped);
    // On the promenade or a footpath, someone with lines for it answers a bump with them instead.
    if(bumpedPedestrian&&!bumped.some(talksHere)){notice=2.5;noticeText='HEY! WATCH OUT!';}
    if(!playerSeat&&(forward||side))steps+=dt*10*pace;
    city.update(player.x,player.z);
    arcadeAmbience.update(audioContext,arcadeVolume(player,[...city.chunks.values()].flatMap(chunk=>chunk.buildings)),dt);
    parkBirds.update(audioContext,parkVolume(player,city.chunks.values()),dt);
    const cars=roadTraffic.update(city.chunks.values(),time,dt,player);
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
    const held=city.advancePedestrians(dt,player,time,walkerTalk.apart===0?walkerTalk.walker:null)??[];
    const line=walkerTalk.update(dt,[...bumped,...held]);
    if(line){notice=2.5;noticeText=line;}
    document.querySelector('#message').textContent=notice?noticeText:'';
    document.querySelector('#location').textContent=`MIDNIGHT DISTRICT / ${Math.floor(player.x/64)}, ${Math.floor(player.z/64)}`;
    }
  }
  if(running&&!staffTalk&&!inventoryBox.open&&!pubMenu.open&&!banshee)startFollowup();
  // Running taps are heard only in the lavatory, louder nearer the sinks.
  if(running&&!pubMenu.open&&!inventoryBox.open)tapWater.update(audioContext,insideLavatory?tapVolume(player,lavatoryTaps):0);
  // Ambient music plays throughout the hotel lobby, and boogie-woogie in the
  // pub, heard faintly from the lavatory but not from inside a cubicle.
  if(running&&!inventoryBox.open){
    lobbyMusic.update(audioContext,insideHotel?LOBBY_MUSIC.volume:0);
    const pubHeard=pubMusicHeard(insidePub?'pub':insideLavatory?'lavatory':insideCubicle?'cubicle':'street');
    pubMusic.update(audioContext,pubHeard.volume,pubHeard.lowpass);
  }
  if(running||!painted){render();painted=true;}
  requestAnimationFrame(tick);
}
city.update(player.x,player.z);requestAnimationFrame(tick);
