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

import {NATIVE_VIEW} from './render-camera.js';
import {createCanvasRenderer} from './canvas-renderer.js';
import {createWorldScene} from './world-scene.js';
import {supportsRenderer,createRendererPreferences} from './renderer-support.js';
import {startPhase,endPhase,profilePhase} from './render-profile.js';
import {createDebugMenu,DEBUG_MODE,DEBUG_RIVERSIDE_SPAWN} from './debug-menu.js';
import {entranceWall} from './entrances.js';
import {loadCabinetGame} from './cabinet-loader.js?v=pinball-9';
import {createTexturePrewarmer} from './texture-pixels.js';
import {HOTEL_CORRIDOR,corridorWindowView,corridorWindowState,interactCorridorWindow,advanceCorridorWindow,facingCorridorExit,corridorReply,moveInHotelCorridor} from './hotel-corridor.js?v=businessman-door-1';
import {Wallet} from './money.js?v=hotel-cash-1';
import {followupFor} from './npc-dialogue.js?v=punk-girl-1';
import {drawFlower} from './flowers.js';
import {Inventory,inventoryImage,takeOutdoorItem,dropItem,takeDroppedItem,drawDroppedToken} from './inventory.js?v=backpack-reward-1';
import {HOTEL_STAIRWELL,stairwellNote,createHotelStairwell,stairwellHeight,stairwellDropSpot,facingStairwellExit,facingHotelCorridor,facingStorageDoor,STORAGE_EXIT,interactStairwellLight,moveInHotelStairwell} from './hotel-stairwell.js?v=hotel-guests-3';
import {HOTEL_STORAGE,facingStorageExit,interactStorage,moveInHotelStorage,drawDroppedNote} from './hotel-storage.js?v=hotel-note-3';
import {ARCADE,facingArcadeGame,tryArcadeGame,arcadeTalk,facingArcadeAttendant,arcadeReply,facingArcadeDoor,facingArcadeExit,facingArcadeSeat,moveInArcade} from './arcade-interior.js?v=pinball-9';
import {ArcadeLife} from './arcade-life.js?v=arcade-visitors-4';
import {CubicleKnockEvent,rollCubicleKnock,loadCubicleKnock,KNOCK_EXIT_TEXT} from './cubicle-knock.js';
import {rollBanshee,bansheeFrame,playBansheeScream} from './banshee.js?v=6';
import {register} from './register.js';
import {PubLife,PubConversation} from './pub-life.js?v=npc-followup-1';
import {CoverAttempt,loadCoverGrunt,playCoverGrunt} from './manholes.js?v=reach-4';
import {City,groundHeight,pubLines,START} from './world.js?v=start-pub-1';
import {Traffic} from './traffic.js?v=junction-priority-2';
import {RiverLook} from './river-look.js?v=parks-4';
import {facingBench,pineCone,treeReply,bushReply,signReply} from './parks.js?v=rive-gauche-6';
import {WalkerTalk,talksHere} from './walker-talk.js?v=punk-girl-1';
import {ParkBirds,parkVolume} from './park-birds.js?v=parks-4';
import {arcadeName,arcadeVolume,ArcadeAmbience} from './arcade.js?v=park-entrances-1';
import {BOOKSHOP,facingBookshopDoor,facingBookshopExit,facingBookshopSeat,facingBookseller,booksellerTalk,BOOK_EXIT_REPLY,bookshopReply,moveInBookshop,drawBookshopBook} from './midnite-interior.js';
import {BookshopLife} from './midnite-life.js';
import {drawBackpack} from './backpack.js';
import {drawPastisBottle,drawMarijuanaPlant} from './backpack-contents.js';
import {pubName} from './pub.js?v=park-entrances-1';
import {PUB,BOTTLES_REPLY,BARTENDER_TALK,BARTENDER_REPLY,BAR_BEER_REPLY,pubBarBeer,pubTapReply,StaffTalk,facingCounterObject,facingBartender,facingBartenderAcrossBar,facingPubChair,createPubPatrons,facingToiletDoor,facingStaffDoor,facingBottles,facingPubDoor,facingClosedShopDoor,facingPubExit,moveInPub} from './pub-interior.js?v=bar-taps-1';
import {LAVATORY,CUBICLE,CUBICLE_REPLIES,LavatoryLife,facingLavatoryExit,facingSink,tapVolume,facingVacantCubicle,facingCubicleExit,facingToilet,outsideCubicle,rollOccupancy,lavatoryReply,moveInLavatory,moveInCubicle} from './lavatory.js?v=staff-room-1';
import {playFlush} from './flush.js?v=toilet-2';
import {TapWater} from './water.js?v=taps-1';
import {LobbyMusic,LOBBY_MUSIC,LOBBY_PIECES} from './lobby-music.js?v=visit-buffer-1';
import {PubMusic,PUB_PIECES,pubMusicHeard} from './pub-music.js?v=visit-buffer-1';
import {HOTEL,HOTEL_STAIR_DOOR,hotelDropSpot,facingHotelStairDoor,RECEPTIONISTS,RECEPTIONIST_TALK,RECEPTIONIST_GIFTS,ROBOT_TALK,BUSINESSMAN_TALK,BUSINESSWOMAN_TALK,COMPANION_TALK,BELL_ANSWER,HotelLife,facingHotelRobot,facingHotelDoor,facingHotelExit,facingHotelBell,facingHotelLamp,facingHotelSeat,facingReceptionistAcrossDesk,hotelFloorHeight,hotelReply,moveInHotel,switchHotelLamp,advanceHotelReceptionist,drawHotelLamp} from './hotel-interior.js?v=receptionist-lamp-2';
import {playDeskBell} from './desk-bell.js?v=bell-2';
import {facingPubMenu} from './pub-menu.js?v=park-entrances-1';
import {ShootingStars,onRiverWalk} from './shooting-stars.js?v=window-2';
import {URSA_MAJOR,skyDirection} from './sky.js?v=stars-2';
import {HornWarning,playHorn} from './horn.js?v=junction-priority-1';

const canvas=document.querySelector('#view');
const overlay=document.querySelector('#overlay'),start=document.querySelector('#start');
const inventory=new Inventory(),inventoryBox=document.querySelector('#inventory');
const inventoryDetail=document.querySelector('#inventory-detail');
const inventoryMessage=document.querySelector('#inventory-message');
let examinedItem=null,itemAction=0,browserFocused=true;
const wallet=new Wallet(),moneyDisplay=document.querySelector('#money');
moneyDisplay.textContent=wallet.balance;
const pubMenu=document.querySelector('#pub-menu'),talkBox=document.querySelector('#staff-talk');
const bookshopBackpack={seen:false,taken:false,returned:false};
let insideBookshop=false,bookshopLife=null;
let insideArcade=false,currentArcadeName='',insidePub=false,insideHotel=false,insideLavatory=false,insideCubicle=null,lavatoryOccupied=[],lavatoryLife=null,lavatoryTaps=[],currentHotel=null,hotelLife=null,streetPosition=null,pubPatrons=[],bartenderType=1,currentPubName='',playerSeat=null,pubLife=null,pubTalk=null;
let windowView=null;
let hotelStairs=null,hotelStorage=false,hotelCorridor=false,currentVenue=null;
let ping=null,cabinetSession=null,arcadeLife=null,arcadePlayerMachine=null;
function closeCabinet(){
  arcadePlayerMachine=null;
  ping?.dispose?.();
  document.querySelector('#game').classList.toggle('amigos',false);
  document.querySelector('#game').classList.toggle('punch',false);
  document.querySelector('#game').classList.toggle('ghost',false);
  document.querySelector('#game').classList.toggle('byker',false);
  document.querySelector('#game').classList.toggle('pinball',false);
  document.querySelector('#game').classList.toggle('amigos-pointer',false);
  ping=null;
  cabinetSession?.dispose();cabinetSession=null;
  keys.clear();shiftKeys.clear();
}
async function playCabinet(name,machine){
  arcadePlayerMachine=machine;
  enableSound();
  keys.clear();shiftKeys.clear();coverPressed=false;notice=0;
  document.querySelector('#message').textContent='';document.querySelector('#pace').hidden=true;
  ping={loading:true,update(){}};
  const session=loadCabinetGame(name);cabinetSession=session;
  try{
    const game=await session.ready;
    if(cabinetSession!==session)return;
    const reply=tryArcadeGame(machine,inventory);
    if(reply!==name){closeCabinet();notice=3.5;noticeText=reply;return;}
    game.audioContext=audioContext;
    ping=game;document.querySelector('#game').classList.toggle('pinball',game.kind==='pinball');document.querySelector('#game').classList.toggle('byker',game.kind==='byker');document.querySelector('#game').classList.toggle('ghost',game.kind==='ghost');document.querySelector('#game').classList.toggle('punch',game.kind==='punch');document.querySelector('#game').classList.toggle('amigos',game.kind==='amigos');keys.clear();canvas.focus();
  }catch(error){
    if(cabinetSession!==session)return;
    closeCabinet();notice=3.5;noticeText='THIS GAME COULD NOT BE LOADED. PLEASE TRY AGAIN.';
  }
}
let banshee=null,bansheeMisses=0,staffTalk=null,cubicleKnock=null;
const pubBuildings=()=>[...city.chunks.values()].flatMap(chunk=>chunk.buildings);
const indoors=()=>insideBookshop||insideArcade||insidePub||insideHotel||insideLavatory||insideCubicle!=null;
// Space at a pub or hotel door goes in or, from inside, back out to the street.
// The pub's TOILET door leads to its lavatory, where a free cubicle opens.
function bookshopSpatial(){return rendererPreferences.get('bookshop')==='three'?threeRenderer?.bookshopSpatial:null;}
function bookshopTarget(){return bookshopSpatial()?.target(player,bookshopLife);}
function pubSpatial(){return rendererPreferences.get('pub')==='three'?threeRenderer?.pubSpatial:null;}
function pubTarget(){return pubSpatial()?.target(player,pubPatrons,pubLife?.walker,currentVenue.barBeer??PUB.barBeer);}
function pubFacing(type,legacy){return pubSpatial()?pubTarget()?.type===type:legacy(player);}
function washroomSpatial(){const id=insideCubicle?'cubicle':'lavatory';return rendererPreferences.get(id)==='three'?threeRenderer?.[`${id}Spatial`]:null;}
function washroomTarget(){return washroomSpatial()?.target(player,insideLavatory?lavatoryLife?.walker:null);}
function useDoor(){
  let exitReaction='';
  if(insideHotel&&hotelCorridor){
    if(!facingCorridorExit(player))return false;
    Object.assign(player,{x:4,z:HOTEL_STAIRWELL.depth-1.2,angle:Math.PI});hotelCorridor=false;
  }else if(insideHotel&&hotelStairs&&!hotelStorage&&facingHotelCorridor(player,hotelStairs)){
    Object.assign(player,HOTEL_CORRIDOR.spawn);hotelCorridor=true;
  }else if(insideHotel&&hotelStorage){
    if(!facingStorageExit(player))return false;
    Object.assign(player,STORAGE_EXIT);hotelStorage=false;
  }else if(insideHotel&&hotelStairs&&facingStorageDoor(player,hotelStairs)){
    Object.assign(player,HOTEL_STORAGE.spawn);hotelStorage=true;
  }else if(insideHotel&&hotelStairs){
    if(!facingStairwellExit(player,hotelStairs))return false;
    Object.assign(player,{x:HOTEL_STAIR_DOOR.x,z:HOTEL_STAIR_DOOR.z-.9,angle:Math.PI});hotelStairs=null;
  }else if(insideHotel&&facingHotelStairDoor(player)){
    hotelStairs=createHotelStairwell();Object.assign(player,HOTEL_STAIRWELL.spawn);
  }else if(insidePub&&pubFacing('toilet',facingToiletDoor)){Object.assign(player,LAVATORY.spawn);insidePub=false;insideLavatory=true;lavatoryOccupied=rollOccupancy();lavatoryLife=new LavatoryLife();lavatoryTaps=LAVATORY.sinks.map(()=>false);}
  else if(insideLavatory){
    const target=washroomSpatial()?washroomTarget():null;
    const cubicle=washroomSpatial()?(target?.type==='cubicle'&&lavatoryOccupied[LAVATORY.cubicles.indexOf(target.data)]===false?target.data:null):facingVacantCubicle(player,lavatoryOccupied);
    if(cubicle){
      Object.assign(player,CUBICLE.spawn);insideLavatory=false;insideCubicle=cubicle;
      if(rollBanshee(Math.random,bansheeMisses)){
        bansheeMisses=0;banshee={started:performance.now()};register.PUB_PARANORMAL_ACTIVITIES=true;playBansheeScream(audioContext,2);
      }else{
        bansheeMisses++;
        if(rollCubicleKnock()){
          cubicleKnock=new CubicleKnockEvent();register.PUB_PARANORMAL_ACTIVITIES=true;
          // No visible source for the voice, including a waiting lavatory robot.
          lavatoryLife.walker=null;lavatoryLife.held=false;
        }
      }
    }
    else if(washroomSpatial()?target?.type==='exit':facingLavatoryExit(player)){Object.assign(player,{x:PUB.toiletDoor.x,z:PUB.toiletDoor.z-.9,angle:Math.PI});insideLavatory=false;insidePub=true;}
    else return false;
  }else if(insideCubicle){
    if(!(washroomSpatial()?washroomTarget()?.type==='exit':facingCubicleExit(player)))return false;
    if(cubicleKnock){
      cubicleKnock.dispose();cubicleKnock=null;exitReaction=KNOCK_EXIT_TEXT;
      lavatoryLife.wait=Math.max(lavatoryLife.wait,8);
    }
    Object.assign(player,outsideCubicle(insideCubicle));insideCubicle=null;insideLavatory=true;
  }else if(indoors()){
    if(!(insideBookshop?(bookshopSpatial()?bookshopTarget()?.type==='exit':facingBookshopExit(player)):insideArcade?facingArcadeExit(player):insidePub?pubFacing('exit',facingPubExit):facingHotelExit(player)))return false;
    if(insideBookshop&&bookshopLife?.carried(inventory)){
      notice=4.5;noticeText=BOOK_EXIT_REPLY;keys.clear();shiftKeys.clear();startSpaceHeld=true;
      document.querySelector('#message').textContent=noticeText;return true;
    }
    Object.assign(player,streetPosition);insideBookshop=insideArcade=insidePub=insideHotel=false;
    lobbyMusic.choose(null);pubMusic.choose(null);
  }else{
    if(facingClosedShopDoor(player,pubBuildings())){
      notice=4.5;noticeText='NOT YET AVAILABLE. TRY ANOTHER VENUE.';
      document.querySelector('#message').textContent=noticeText;
      coverPressed=false;return true;
    }
    const pub=facingPubDoor(player,pubBuildings()),hotel=!pub&&facingHotelDoor(player,pubBuildings());
    const arcade=!pub&&!hotel&&facingArcadeDoor(player,pubBuildings());
    const bookshop=!pub&&!hotel&&!arcade&&facingBookshopDoor(player,pubBuildings());
    if(!pub&&!hotel&&!arcade&&!bookshop)return false;
    enterVenue(pub||hotel||arcade||bookshop);
  }
  keys.clear();shiftKeys.clear();coverPressed=false;startSpaceHeld=true;notice=exitReaction?5:0;shake=0;steps=0;
  if(exitReaction){noticeText=exitReaction;document.querySelector('#message').textContent=exitReaction;}
  arcadeAmbience.mute();parkBirds.mute();
  return true;
}
function enterVenue(venue){
  const pub=venue.sign==='NEON PUB'&&venue,hotel=venue.sign==='HOTEL'&&venue,arcade=venue.sign==='ARCADE'&&venue,bookshop=venue.sign==='MIDNITE BOOKS'&&venue;
  currentVenue=pub||hotel||arcade||bookshop;
  streetPosition={...player,angle:player.angle+Math.PI};
  if(pub){pubBarBeer(pub);pubLife=pub.pubLife??=new PubLife();currentPubName=pubName(pub);bartenderType=pub.bartenderType??=Math.floor(Math.random()*4);pubPatrons=pub.pubPatrons??=createPubPatrons();pubMusic.choose(PUB_PIECES[Math.floor(Math.random()*PUB_PIECES.length)]);Object.assign(player,PUB.spawn);insidePub=true;}
  // Each hotel keeps the receptionist first seen on duty there.
  else if(bookshop){bookshopLife=bookshop.bookshopLife??=new BookshopLife(Math.random,bookshopBackpack);bookshopLife.enter();Object.assign(player,BOOKSHOP.spawn);insideBookshop=true;}
  else if(arcade){Object.assign(player,ARCADE.spawn);insideArcade=true;arcadeLife=new ArcadeLife();currentArcadeName=arcadeName(arcade);}
  else{currentHotel=hotel;hotel.receptionist??=RECEPTIONISTS[Math.floor(Math.random()*RECEPTIONISTS.length)];Object.assign(player,HOTEL.spawn);insideHotel=true;hotelLife=new HotelLife(Math.random,hotel);lobbyMusic.choose(LOBBY_PIECES[Math.floor(Math.random()*LOBBY_PIECES.length)]);}
}
// Pub chairs, park benches, arcade bridge chairs and the toilet share one seated mode: locked
// position, limited turning, and looking up or down, until Space returns the
// player to their feet. Getting up from the toilet flushes it.
const SEATED_EYE=1.5;
const seatedTexturePrewarmer=createTexturePrewarmer();
function useSeat(){
  if(hotelStairs)return false;
  let greet=false,seatReply=null;
  if(playerSeat){
    seatedTexturePrewarmer.cancel();
    // Return to the clear position from which the player sat down.
    player.x=playerSeat.standing.x;player.z=playerSeat.standing.z;
    if(playerSeat.toilet)playFlush(audioContext);
    if(playerSeat.bookshopChair)bookshopLife.stand(playerSeat.bookshopChair,inventory);
    playerSeat=null;eye=1.65;pubTalk=null;
  }else if(insideCubicle){
    const target=washroomSpatial()?washroomTarget():null;
    const seat=washroomSpatial()?(target?.type==='toilet'?target.data:null):facingToilet(player);
    if(!seat)return false;
    playerSeat={toilet:true,standing:{x:player.x,z:player.z},angle:seat.angle,pitch:0};
    player.x=seat.x;player.z=seat.z;player.angle=seat.angle;eye=seat.eye;
  }else if(insideLavatory)return false;
  else if(!insidePub){
    // Park benches outside; the sofa in a hotel lobby; the arcade's bridge chairs.
    const seat=insideBookshop?(bookshopSpatial()?(bookshopTarget()?.type==='chair'?bookshopTarget().data:null):facingBookshopSeat(player)):insideHotel?facingHotelSeat(player):insideArcade?facingArcadeSeat(player):facingBench(player,city.chunks.values());
    if(!seat)return false;
    if(insideBookshop&&bookshopLife.occupied(BOOKSHOP.chairs.indexOf(seat))){notice=2.5;noticeText='THIS TABLE IS OCCUPIED.';return true;}
    playerSeat={bench:seat.bench,standing:{x:player.x,z:player.z},angle:seat.angle,pitch:0};
    if(insideBookshop){playerSeat.bookshopChair=seat;seatReply=bookshopLife.sit(seat,inventory);}
    player.x=seat.x;player.z=seat.z;player.angle=seat.angle;eye=SEATED_EYE;
  }else{
    const target=pubSpatial()?pubTarget():null;
    const chair=pubSpatial()?(target?.type==='chair'?target.chair:null):facingPubChair(player,pubPatrons,pubLife?.walker?.chair);
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
  if(seatReply){notice=4;noticeText=seatReply;}
  return true;
}
const hotelGuestScene=()=>hotelStorage?'storage':hotelCorridor?`corridor:${hotelStairs.floor}`:hotelStairs?'stairs':'lobby';
const hotelGuests=()=>hotelLife?.guests(hotelGuestScene())??[];
const hotelGuest=()=>hotelGuests()[0];
function canSeeHotelGuest(guest){
  // Corridors have an unobstructed view along their length. Looking out of
  // the window faces away from the guest closing it inside.
  if(windowView)return false;
  const dx=guest.x-player.x,dz=guest.z-player.z,sin=Math.sin(player.angle),cos=Math.cos(player.angle);
  const depth=dx*sin+dz*cos,side=dx*cos-dz*sin;
  return depth>.3&&Math.abs(side)<depth*W/(2*F);
}
function talkToHotelGuest(){
  const ground=hotelStairs&&!hotelCorridor?stairwellHeight(player,hotelStairs):hotelFloorHeight(player.x,player.z);
  const guest=hotelGuests().filter(g=>Math.abs(g.y-ground)<1.5&&facingHotelRobot(player,g))
    .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
  if(!guest)return false;
  if(!guest.companion&&![7,8].includes(guest.type)&&!hotelLife.held)return false;
  const business=guest.companion||[7,8].includes(guest.type);
  talkToStaff(guest.companion?COMPANION_TALK:guest.type===8?BUSINESSWOMAN_TALK:business?BUSINESSMAN_TALK:ROBOT_TALK,guest.companion?'Talk to the sexy woman':business?`Talk to the ${guest.type===8?'businesswoman':'businessman'}`:'Talk to the robot',{},business?null:inventory);
  return true;
}
function itemRoom(){
  if(!indoors())return 'street';
  const room=insideCubicle?`cubicle:${insideCubicle.x},${insideCubicle.z}`:insideLavatory?'lavatory':insidePub?'pub':insideArcade?'arcade':insideBookshop?'bookshop':hotelStorage?'hotel-storage':hotelCorridor?`hotel-corridor:${hotelStairs.floor}`:hotelStairs?'hotel-stairs':'hotel';
  return `${currentVenue.x},${currentVenue.z}:${room}`;
}
// Where something dropped here comes to rest, and the height it rests at.
function dropSpot(){
  if(!indoors())return {x:player.x,z:player.z,ground:groundHeight(player.x,player.z)+.085};
  if(hotelCorridor)return {x:player.x,z:player.z,ground:.015};
  if(insideHotel&&!hotelStorage)return hotelStairs?stairwellDropSpot(player,hotelStairs):hotelDropSpot(player);
  return {x:player.x,z:player.z,ground:0};
}
const itemGround=()=>dropSpot().ground;
function dropSelectedItem(){
  if(insideBookshop&&inventory.current?.id==='backpack')return 'NOT HERE!';
  if(playerSeat)return "I NEED TO STAND UP FIRST.";
  if(inventory.current?.bookshopLoan)return 'I SHOULD LEAVE THIS BOOK ON A READING TABLE.';
  const position=indoors()?currentVenue:player;
  const chunk=city.chunks.get(`${Math.floor(position.x/64)},${Math.floor(position.z/64)}`);
  const {x,z,ground}=dropSpot();
  const dropped=dropItem(inventory,{...player,x,z},chunk,itemRoom(),ground);
  return dropped?(dropped.lost?'LOST':'DROPPED'):null;
}
function showInventory(){
  const list=document.querySelector('#inventory-items');
  list.innerHTML=inventory.items.map((item,i)=>`<li${i===inventory.selected?' aria-current="true"':''}>${item.name}</li>`).join('');
  document.querySelector('#inventory-empty').hidden=inventory.items.length>0;
  document.querySelector('#inventory-description').textContent=inventory.description?(inventory.current?.description??''):'';
  list.querySelector('[aria-current]')?.scrollIntoView({block:'nearest'});
}
function inventoryItemActions(){return ['BACK',...(inventory.current===examinedItem?inventory.actions:[])];}
const inventoryConePreview={x:0,z:0,ground:0,angle:0,length:.22,radius:.07};
function drawInventoryObject(item,{face,quad,box}){
  const position={x:0,z:0,ground:0,angle:0};
  if(item.id==='flower')drawFlower({...item,...position},quad);
  else if(['hotel-note','ticket'].includes(item.id))drawDroppedNote(position,face);
  else if(item.id==='arcade-token')drawDroppedToken(position,face);
  else if(item.id==='lamp')drawHotelLamp(0,0,0,box);
  else if(item.id==='backpack')drawBackpack(position,box,face);
  else if(item.id==='pastis-bottle')drawPastisBottle(position,box,face);
  else if(item.id==='marijuana-plant')drawMarijuanaPlant(position,box,face);
  else if(item.bookshopLoan)drawBookshopBook(box,item,0,0,0);
  else if(item.id==='pine-cone')pineCone(inventoryConePreview,face,{x:2,y:3,z:-4});
}
function showItemActions(){
  const actions=inventoryItemActions();
  if(examinedItem)document.querySelector('#inventory-detail-title').textContent=examinedItem.name;
  itemAction=Math.min(itemAction,Math.max(0,actions.length-1));
  document.querySelector('#inventory-actions').innerHTML=actions.map((action,i)=>`<button type="button" data-action="${action}"${i===itemAction?' aria-current="true"':''}>${action}</button>`).join('');
}
function openInventoryItem(){
  if(!inventory.current)return;
  examinedItem=inventory.current;itemAction=0;
  document.querySelector('#inventory-detail-title').textContent=examinedItem.name;
  document.querySelector('#inventory-item-description').textContent=examinedItem.description??'';
  const image=document.querySelector('#inventory-image');
  const preview=inventoryImage(examinedItem,drawInventoryObject);
  image.hidden=!preview;image.alt=examinedItem.name;
  if(preview)image.src=preview;
  showItemActions();inventoryDetail.showModal();
  document.querySelector('#inventory-actions').querySelector('button')?.focus();
}
function closeInventoryItem(){
  inventoryDetail.close();examinedItem=null;showInventory();inventoryBox.focus();
}
function closeInventoryMessage(){
  inventoryMessage.close();inventoryBox.focus();
}
function useInventoryAction(action){
  if(action==='BACK'){closeInventoryItem();return;}
  if(inventory.current!==examinedItem)return;
  const reply=action==='DROP'?dropSelectedItem():inventory.act(action,{inBookshop:insideBookshop});
  closeInventoryItem();
  if(reply){
    inventoryMessage.textContent=reply;
    inventoryMessage.showModal();inventoryMessage.focus();
  }
}
inventoryMessage.addEventListener('cancel',e=>{e.preventDefault();closeInventoryMessage();});
inventoryMessage.addEventListener('click',closeInventoryMessage);
inventoryDetail.addEventListener('cancel',e=>{e.preventDefault();closeInventoryItem();});
document.querySelector('#inventory-actions').addEventListener('click',e=>{
  const action=e.target.closest('button[data-action]')?.dataset.action;
  if(action)useInventoryAction(action);
});
function toggleInventory(){
  keys.clear();shiftKeys.clear();coverPressed=false;
  if(inventoryBox.open){if(inventoryMessage.open)closeInventoryMessage();if(inventoryDetail.open)closeInventoryItem();inventoryBox.close();canvas.focus();}
  else{
    inventory.description=false;showInventory();inventoryBox.showModal();
    arcadeAmbience.mute();parkBirds.mute();tapWater.mute();
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
function talkToStaff(script,label,gifts={},carried=inventory){
  keys.clear();shiftKeys.clear();coverPressed=false;notice=0;
  staffTalk=new StaffTalk(script,undefined,carried,gifts);talkBox.ariaLabel=label;document.querySelector('#pace').hidden=true;showStaffTalk();
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
  moneyDisplay.textContent=wallet.balance;
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
const {width:W,focal:F,horizon}=NATIVE_VIEW;
let eye=1.65;
// Generate a fixed sky around the entire world, rather than wrapping the screen.
const starColors=['#211e33','#27233a','#2d2840','#332d46'];
const stars=Array.from({length:300},()=>({bearing:Math.random()*Math.PI*2,elevation:.1+Math.random()*.35,color:starColors[Math.floor(Math.random()*starColors.length)]}));
// Higher stars are above the level view; they appear when a seated player looks up.
// Uniform over the upper sky, so they do not crowd around the zenith.
for(let i=0;i<700;i++)stars.push({bearing:Math.random()*Math.PI*2,elevation:Math.asin(Math.sin(.45)+Math.random()*(1-Math.sin(.45))),color:starColors[Math.floor(Math.random()*starColors.length)]});
const starfield=[...stars,...URSA_MAJOR].map(skyDirection);
const moon={bearing:.33,elevation:.31};
const shootingStars=new ShootingStars();
const skyView=()=>({angle:player.angle,width:W,focal:F,horizon,pitch:windowView?.pitch??playerSeat?.pitch??0});
let running=false,time=0,last=0,shake=0,hitCooldown=0,notice=0,steps=0,painted=false;
let noticeText='',coverPressed=false,startSpaceHeld=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    loadCubicleKnock(audioContext);
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


let worldScene,canvasRenderer,threeRenderer,threeCanvas,threeRendererLoading;
const rendererPreferences=createRendererPreferences();
async function prepareThreeRenderer(){
  if(threeRenderer)return;
  threeRendererLoading??=(async()=>{
    const {createThreeHotelRenderer}=await import('./three-hotel-renderer.js');
    const surface=document.createElement('canvas');surface.id='three-view';surface.hidden=true;
    surface.setAttribute('aria-hidden','true');
    try{threeRenderer=createThreeHotelRenderer(surface);}
    catch(error){surface.remove();throw new Error(`Three.js could not start: ${error.message}. Canvas/WASM is still available.`);}
    canvas.after(surface);threeCanvas=surface;
  })();
  try{await threeRendererLoading;}finally{threeRendererLoading=null;}
}
function useCanvasFallback(){
  for(const id of ['hotel','storage','stairs','corridor','arcade','bookshop','pub','lavatory','cubicle'])rendererPreferences.set(id,'canvas');
}
async function prepareRendererAtStartup(){
  try{await prepareThreeRenderer();}
  catch{
    useCanvasFallback();
    document.querySelector('#description').textContent='3D rendering could not start. You can still explore the city.';
  }finally{
    start.innerHTML='STEP INTO THE NIGHT <span>→</span>';
    start.disabled=false;start.removeAttribute('aria-busy');
  }
}
async function selectDebugDestination(id,park,renderer=rendererPreferences.get(id)){
  if(!supportsRenderer(id,renderer))throw new Error('This renderer is not available for that destination.');
  if(renderer==='three')await prepareThreeRenderer();
  debugTravel(id,park);rendererPreferences.set(id,renderer);painted=false;
}
function selectRenderSurface(useThree){
  if(threeCanvas)threeCanvas.hidden=!useThree;
  canvas.classList.toggle('webgl-active',useThree);
  if(!useThree)threeRenderer?.leave();
}
function render(){
  canvasRenderer??=createCanvasRenderer(canvas,NATIVE_VIEW);
  worldScene??=createWorldScene(canvasRenderer,{seatedTexturePrewarmer,reduced});
  document.querySelector('#game').classList.toggle('amigos-pointer',Boolean(ping?.kind==='amigos'&&ping.pointerColor&&ping.pointerVisible&&!ping.over));
  if(ping){selectRenderSurface(false);canvasRenderer.cabinet(ping,running);return;}
  if(!indoors())eye=(playerSeat?SEATED_EYE:1.65)+groundHeight(player.x,player.z);
  else if(!playerSeat)eye=1.65+(insideHotel&&!hotelStorage&&!hotelCorridor?(hotelStairs?stairwellHeight(player,hotelStairs):hotelFloorHeight(player.x,player.z)):0);
  document.querySelector('.scanlines').classList.toggle('pub-shade',insidePub||insideLavatory||insideCubicle!=null);
  document.querySelector('.scanlines').classList.toggle('hotel-shade',insideHotel);
  const frame={
    player,eye,windowView,playerSeat,running,time,
    insideBookshop,bookshopLife,insideArcade,arcadeLife,
    insideHotel,hotelCorridor,hotelStairs,hotelStorage,currentHotel,
    insideCubicle,insideLavatory,insidePub,lavatoryOccupied,lavatoryTaps,lavatoryLife,
    pubPatrons,bartenderType,currentVenue,pubLife,city,roadTraffic,wallet,
    banshee,shake,steps,starfield,moon,shootingStars,skyView:skyView(),hotelGuests:hotelGuests(),itemRoom:itemRoom(),indoors:indoors()
  };
  const destination=debugScene(),rendererChoice=rendererPreferences.get(destination);
  if(supportsRenderer(destination,'three')&&rendererChoice==='three'&&!threeRenderer&&!threeRendererLoading){
    prepareThreeRenderer().then(()=>{painted=false;}).catch(error=>{
      useCanvasFallback();painted=false;
      if(supportsRenderer(debugScene(),'three')){notice=5;noticeText=error.message;}
    });
  }
  const useThree=Boolean(supportsRenderer(destination,'three')&&rendererChoice==='three'&&threeRenderer);
  selectRenderSurface(useThree);
  if(useThree)profilePhase('neon:three:frame',()=>threeRenderer.render(frame));
  else profilePhase('neon:canvas:frame',()=>worldScene.render(frame));
}
// Debug travel shares venue initialization with ordinary door entry.
function debugScene(){return insideBookshop?'bookshop':insideArcade?'arcade':insideHotel?(hotelStorage?'storage':hotelCorridor?'corridor':hotelStairs?'stairs':'hotel'):insideCubicle?'cubicle':insideLavatory?'lavatory':insidePub?'pub':'street';}
function debugTravel(id,park){
  if(id===debugScene()||id==='initial'&&!indoors()&&player.x===START.x&&player.z===START.z)return;
  cubicleKnock?.dispose();cubicleKnock=null;
  const origin=indoors()?streetPosition:player;
  const signs={pub:'NEON PUB',lavatory:'NEON PUB',cubicle:'NEON PUB',hotel:'HOTEL',stairs:'HOTEL',storage:'HOTEL',corridor:'HOTEL',arcade:'ARCADE',bookshop:'MIDNITE BOOKS'};
  let venue;
  if(signs[id]){
    city.update(origin.x,origin.z);
    venue=[...city.chunks.values()].flatMap(c=>c.buildings).filter(b=>b.sign===signs[id]).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z))[0];
    if(!venue)throw new Error('No matching venue nearby. Explore more streets and try again.');
  }
  if(playerSeat?.bookshopChair)bookshopLife.stand(playerSeat.bookshopChair,inventory);
  playerSeat=null;windowView=null;pubTalk=null;eye=1.65;
  insideBookshop=insideArcade=insideHotel=insidePub=insideLavatory=false;insideCubicle=null;hotelStorage=hotelCorridor=false;hotelStairs=null;
  lobbyMusic.choose(null);pubMusic.choose(null);
  if(venue){
    const wall=entranceWall(venue);
    Object.assign(player,{x:wall.x+wall.nx,z:wall.z+wall.nz,angle:Math.atan2(-wall.nx,-wall.nz)});
    enterVenue(venue);
    if(['stairs','storage','corridor'].includes(id)){
      hotelStairs=createHotelStairwell();Object.assign(player,HOTEL_STAIRWELL.spawn);
      if(id==='storage'){hotelStairs.floor=2;hotelStorage=true;Object.assign(player,HOTEL_STORAGE.spawn);}
      if(id==='corridor'){hotelCorridor=true;Object.assign(player,HOTEL_CORRIDOR.spawn);}
    }
    if(['lavatory','cubicle'].includes(id)){
      insidePub=false;insideLavatory=true;lavatoryOccupied=rollOccupancy();lavatoryLife=new LavatoryLife();lavatoryTaps=LAVATORY.sinks.map(()=>false);Object.assign(player,LAVATORY.spawn);
      if(id==='cubicle'){insideLavatory=false;insideCubicle=LAVATORY.cubicles[0];lavatoryOccupied[0]=false;Object.assign(player,CUBICLE.spawn);}
    }
  }else{
    Object.assign(player,id==='initial'?START:id==='river'?DEBUG_RIVERSIDE_SPAWN:park);
    city.update(player.x,player.z);
  }
  notice=shake=steps=0;painted=false;
}
const debugMenu=DEBUG_MODE?createDebugMenu({
  canOpen:()=>running&&!ping&&!cabinetSession&&!banshee&&!pubMenu.open&&!inventoryBox.open&&!staffTalk,
  pause:()=>{running=false;keys.clear();shiftKeys.clear();coverPressed=startSpaceHeld=false;seatedTexturePrewarmer.cancel();arcadeAmbience.mute();parkBirds.mute();tapWater.mute();muteBackgroundMusic();document.querySelector('#pace').hidden=true;},
  resume:()=>{running=true;last=performance.now();canvas.focus();},
  nearestPark:()=>{
    const origin=indoors()?streetPosition:player;
    const parks=[...city.parkBlocks].map(key=>key.split(',').map(Number));
    parks.sort((a,b)=>Math.hypot(a[0]*64+32-origin.x,a[1]*64+32-origin.z)-Math.hypot(b[0]*64+32-origin.x,b[1]*64+32-origin.z));
    const [x,z]=parks[0];const chunk=city.chunks.get(`${x},${z}`);
    const path=chunk?.park?.path;
    return path?{...path[0],angle:Math.atan2(path[1].x-path[0].x,path[1].z-path[0].z)}:{x:x*64+12,z:z*64+32,angle:Math.PI/2};
  },travel:selectDebugDestination,wallet,inventory,register,updateMoney:()=>{moneyDisplay.textContent=wallet.balance;}
}):null;
function pause(){if(banshee||pubMenu.open||inventoryBox.open||staffTalk)return;cubicleKnock?.stopAudio();seatedTexturePrewarmer.cancel();startSpaceHeld=false;running=false;ping?.syncInput?.(canvas,false);arcadeAmbience.mute();parkBirds.mute();tapWater.mute();lobbyMusic.mute();pubMusic.mute();keys.clear();shiftKeys.clear();coverPressed=false;document.querySelector('#pace').hidden=true;overlay.hidden=false;start.innerHTML='BACK TO THE NIGHT <span>→</span>';document.querySelector('#description').textContent='The night can wait.';start.focus();}
function play(){if(start.disabled||debugMenu?.open)return;if(pubMenu.open||inventoryBox.open||staffTalk)return;enableSound();running=true;overlay.hidden=true;keys.clear();shiftKeys.clear();coverPressed=false;canvas.focus();last=performance.now();}
start.addEventListener('click',play);document.querySelector('#pause').addEventListener('click',()=>running?pause():play());
let hotelEventPresses=0,hotelEventKey=null;
const valid=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift','Escape',' ']);
window.addEventListener('keydown',e=>{if(debugMenu?.open||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;if(debugMenu?.handleKey(e))return;if(banshee){e.preventDefault();return;}const k=e.code==='Space'||e.key==='Enter'?' ':e.key.length===1?e.key.toLowerCase():e.key;
if(running&&insideHotel&&!pubMenu.open&&!inventoryBox.open&&!staffTalk&&!windowView&&['h','x'].includes(k)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  e.preventDefault();
  if(!e.repeat){
    if(hotelEventKey!==k){hotelEventKey=k;hotelEventPresses=0;}
    if(++hotelEventPresses===3){
      hotelEventPresses=0;
      hotelLife.skipEvent(player,hotelGuestScene(),hotelStairs&&!hotelCorridor?stairwellHeight(player,hotelStairs):hotelFloorHeight(player.x,player.z));
    }
  }
  return;
}
hotelEventPresses=0;hotelEventKey=null;
if(pubMenu.open){e.preventDefault();if(k===' '&&!e.repeat)togglePubMenu();return;}
if(ping){
  if(ping.kind==='byker'&&ping.intro&&running){
    ping.skipIntro();keys.clear();
    if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['F5','F12','Tab'].includes(k))e.preventDefault();
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(ping.kind==='ghost'){
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','s','a','d',' ','Escape'].includes(k))return;
    e.preventDefault();
    if(k==='Escape'||ping.over&&k===' '&&!e.repeat){closeCabinet();startSpaceHeld=k===' ';canvas.focus();}
    else if(running&&!e.repeat)ping.keyDown(k);
    return;
  }
  if(ping.kind==='punch'){
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','s','a','d','z','x',' ','Escape'].includes(k))return;
    e.preventDefault();
    if(k==='Escape'||ping.over&&k===' '&&!e.repeat){closeCabinet();startSpaceHeld=k===' ';canvas.focus();}
    else if(running){if(!e.repeat)ping.keyDown(k);keys.add(k);}
    return;
  }
  if(ping.kind==='pinball'&&(k==='a'||k==='d')){e.preventDefault();if(running&&!e.repeat)ping.nudge(k==='a'?-1:1);return;}
  if(ping.kind==='pinball'&&ping.over&&k==='Enter'){e.preventDefault();closeCabinet();canvas.focus();return;}
  const controls=ping.kind?['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','s','a','d',' ','Escape']:['ArrowUp','ArrowDown','w','s',' ','Escape'];
  if(!controls.includes(k)&&!(ping.crossed&&k.length===1))return;
  e.preventDefault();
  if(ping.crossed){if(!e.repeat&&running){ping.continueCrossing();keys.clear();}return;}
  if(ping.won&&k!=='Escape')return;
  if(k==='Escape'||ping.over&&k===' '&&!e.repeat){closeCabinet();startSpaceHeld=k===' ';canvas.focus();}
  else if(!ping.loading&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','s','a','d',' '].includes(k))keys.add(k);
  return;
}
if(inventoryBox.open){
  // Only consume inventory controls; leave browser shortcuts and focus keys alone.
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','i','Escape',' '].includes(k))return;
  e.preventDefault();
  if(inventoryMessage.open){
    if(k==='i'){if(!e.repeat)toggleInventory();}
    else if([' ','Escape'].includes(k)&&!e.repeat)closeInventoryMessage();
  }else if(inventoryDetail.open){
    if(k==='Escape'){if(!e.repeat)closeInventoryItem();}
    else if(k==='i'){if(!e.repeat)toggleInventory();}
    else if(k===' '&&!e.repeat){
      const focused=document.activeElement;
      useInventoryAction(focused?.dataset?.action??inventoryItemActions()[itemAction]);
    }else{
      const step={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[k];
      if(step){
        const actions=inventoryItemActions();
        itemAction=(itemAction+step+actions.length)%actions.length;
        showItemActions();
        document.querySelector('#inventory-actions').querySelector(`[data-action="${inventoryItemActions()[itemAction]}"]`)?.focus();
      }
    }
  }else if(k==='i'||k==='Escape'){if(!e.repeat)toggleInventory();}
  else if(k===' '){if(!e.repeat)openInventoryItem();}
  else{const step={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[k];if(step){inventory.move(step);showInventory();}}
  return;
}
if(windowView&&running&&k!=='Escape'){
  e.preventDefault();
  if(k===' '&&!e.repeat){Object.assign(player,windowView.standing);windowView=null;keys.clear();shiftKeys.clear();startSpaceHeld=true;}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(k))keys.add(k);
  return;
}
if(k==='i'&&running&&!staffTalk){e.preventDefault();if(!e.repeat)toggleInventory();return;}
if(staffTalk){
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const choice=/^[1-9]$/.test(k)&&!staffTalk.line&&Number(k)<=staffTalk.script.length;
  if(!['Escape',' ','ArrowUp','ArrowDown','w','s'].includes(k)&&!choice)return;
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
  if(k===' '&&!e.repeat&&insideHotel&&talkToHotelGuest())return;
  if(k===' '&&!e.repeat&&insideHotel&&hotelCorridor){
    const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());
    if(pickedUp){bookshopLife?.resetBookInteraction();notice=2.5;noticeText=pickedUp;return;}
    if(useDoor())return;
    if(interactCorridorWindow(player,corridorWindowState(currentHotel,hotelStairs.floor))){notice=0;return;}
    const reply=corridorReply(player,hotelStairs.floor,hotelLife.walker?.type===7?{}:currentHotel);
    if(reply){notice=2.5;noticeText=reply;document.querySelector('#message').textContent=reply;}
    return;
  }
  if(k===' '&&!e.repeat&&insideHotel&&hotelStorage){
    const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());
    if(pickedUp){bookshopLife?.resetBookInteraction();notice=2.5;noticeText=pickedUp;return;}
    if(useDoor())return;
    const reply=interactStorage(player,currentHotel,inventory);
    if(reply){notice=2.5;noticeText=reply;document.querySelector('#message').textContent=reply;}
    return;
  }
  if(k===' '&&!e.repeat&&insideHotel&&hotelStairs){
    const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());
    if(pickedUp){bookshopLife?.resetBookInteraction();notice=2.5;noticeText=pickedUp;return;}
    if(hotelStairs.floor===1&&hotelStairs.flight===null){
      const cash=wallet.takeNote(player,stairwellNote(currentHotel));
      if(cash){moneyDisplay.textContent=wallet.balance;notice=2.5;noticeText=cash;return;}
    }
    if(useDoor())return;
    const lightReply=interactStairwellLight(player,hotelStairs);
    if(lightReply){notice=4.5;noticeText=lightReply;document.querySelector('#message').textContent=lightReply;}
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
  if(k===' '&&!e.repeat){const pickedUp=takeDroppedItem(player,city.chunks.values(),inventory,itemRoom(),itemGround());if(pickedUp){bookshopLife?.resetBookInteraction();notice=2.5;noticeText=pickedUp;return;}if(insideArcade){const machine=facingArcadeGame(player);if(machine){if(arcadeLife?.occupied(machine)){notice=2.5;noticeText='SOMEONE IS ALREADY PLAYING THIS CABINET.';return;}const reply=tryArcadeGame(machine,inventory,false);if(reply==='PINBALL'||reply==='BYKER'||reply==='GHOST'||reply==='PUNCH'||reply==='PING'||reply==='GROG'||reply==='KONGY KONG'||reply==='AMIGOS'||reply==='METEORS'||reply==='SUPER'){playCabinet(reply,machine);}else{notice=3.5;noticeText=reply;}return;}}if(useSeat()){bookshopLife?.resetBookInteraction();return;}if(useDoor()){bookshopLife?.resetBookInteraction();return;}if(insideBookshop){const target=bookshopSpatial()?bookshopTarget():undefined;const reply=bookshopLife.interact(player,inventory,target)??(target===undefined?bookshopReply(player,bookshopLife):target?.type==='reply'?target.data:null);if(reply){notice=4;noticeText=reply;}else if(bookshopLife.atDesk&&(target===undefined?facingBookseller(player):target?.type==='seller'))talkToStaff(booksellerTalk(bookshopLife.backpack),'Talk to the bookseller',bookshopLife.booksellerGifts(inventory));return;}if(insideArcade){const reply=arcadeReply(player);if(reply){notice=2.5;noticeText=reply;}else if(!arcadeLife?.deskBusy&&facingArcadeAttendant(player))talkToStaff(arcadeTalk(wallet,inventory),'Talk to the arcade desk lady',{},null);return;}if(insideHotel){if(facingHotelLamp(player,currentHotel)){const complaint=switchHotelLamp(currentHotel,inventory);if(complaint){notice=2.5;noticeText=complaint;}return;}if(facingHotelBell(player)){playDeskBell(audioContext);notice=2.5;noticeText=BELL_ANSWER;return;}const reply=hotelReply(player,hotelLife.guest()?.receptionWait>0,currentHotel);if(reply){notice=2.5;noticeText=reply;}else if(!(hotelLife.guest()?.receptionWait>0)&&facingReceptionistAcrossDesk(player,currentHotel))talkToStaff(RECEPTIONIST_TALK,'Talk to the receptionist',RECEPTIONIST_GIFTS);return;}if(insideLavatory){if(washroomSpatial()){
      const target=washroomTarget();
      if(target?.type==='cubicle'&&lavatoryOccupied[LAVATORY.cubicles.indexOf(target.data)]!==false){notice=2.5;noticeText=CUBICLE_REPLIES[Math.floor(Math.random()*CUBICLE_REPLIES.length)];}
      else if(target?.type==='sink'){enableSound();lavatoryTaps[target.data]=!lavatoryTaps[target.data];}
      return;
    }const reply=lavatoryReply(player,lavatoryOccupied);if(reply){notice=2.5;noticeText=reply;return;}const sink=facingSink(player);if(sink!=null){enableSound();lavatoryTaps[sink]=!lavatoryTaps[sink];}return;}if(insideCubicle)return;if(insidePub){if(pubSpatial()){
      const target=pubTarget();
      if(target?.type==='bartender'){
        if(player.z>PUB.bar.z+PUB.bar.d){notice=2.5;noticeText=BARTENDER_REPLY;}
        else talkToStaff(BARTENDER_TALK,'Talk to the bartender');
      }else{
        const reply=target?.type==='staff'?"IT'S LOCKED...":target?.type==='beer'?BAR_BEER_REPLY:target?.type==='bottles'?BOTTLES_REPLY:target?.type==='tap'?(player.z<PUB.bar.z?"I CAN'T REACH IT.":"HEY! YOU CAN'T SERVE YOURSELF!"):null;
        if(reply){notice=2.5;noticeText=reply;}
      }return;
    }const tapReply=pubTapReply(player);if(facingStaffDoor(player)){notice=2.5;noticeText="IT'S LOCKED...";}else if(facingCounterObject(player,currentVenue.barBeer??PUB.barBeer)){notice=2.5;noticeText=BAR_BEER_REPLY;}else if(tapReply){notice=2.5;noticeText=tapReply;}else if(facingBartender(player)){notice=2.5;noticeText=BARTENDER_REPLY;}else if(facingBartenderAcrossBar(player))talkToStaff(BARTENDER_TALK,'Talk to the bartender');else if(facingBottles(player)){notice=2.5;noticeText=BOTTLES_REPLY;}return;}if(nearPubMenu()){togglePubMenu();return;}const cash=wallet.takeNote(player);if(cash){moneyDisplay.textContent=wallet.balance;notice=2.5;noticeText=cash;return;}const bush=bushReply(player,city.chunks.values(),inventory);if(bush){notice=6;noticeText=bush;return;}const reply=takeOutdoorItem(player,city.chunks.values(),inventory)??treeReply(player,city.chunks.values())??signReply(player,city.chunks.values());if(reply){notice=2.5;noticeText=reply;return;}coverPressed=true;enableSound();}
  keys.add(k);syncShift(e);
}});
function syncShift(e){
  if(e.key==='Shift'){if(e.type==='keydown')shiftKeys.add(e.code);else shiftKeys.delete(e.code);}
  if(e.shiftKey||shiftKeys.size)keys.add('Shift');else keys.delete('Shift');
}
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' '||e.key==='Enter')startSpaceHeld=false;keys.delete(e.code==='Space'||e.key==='Enter'?' ':e.key.length===1?e.key.toLowerCase():e.key);if(running&&!pubMenu.open&&!inventoryBox.open&&!banshee&&!staffTalk)syncShift(e);});
function muteBackgroundMusic(){lobbyMusic.mute();pubMusic.mute();}
window.addEventListener('blur',()=>{browserFocused=false;muteBackgroundMusic();if(running)pause();});
window.addEventListener('focus',()=>{browserFocused=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){muteBackgroundMusic();if(running)pause();}});
// Capture taps across the whole screen before movement buttons handle them.
window.addEventListener('pointerdown',e=>{
  if(running&&ping?.kind==='byker'&&ping.intro){e.preventDefault();e.stopImmediatePropagation();ping.skipIntro();keys.clear();return;}
  if(!running||ping?.kind!=='frog')return;
  e.preventDefault();e.stopImmediatePropagation();
  keys.clear();
  if(ping.over)closeCabinet();else ping.tap();
},{capture:true,passive:false});
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(!running||pubMenu.open||inventoryBox.open||banshee||staffTalk)return;e.preventDefault();button.setPointerCapture(e.pointerId);if(ping?.crossed){ping.continueCrossing();keys.clear();return;}keys.add(button.dataset.key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
function amigosPointer(e,type){
  if(!running||ping?.kind!=='amigos')return false;
  e.preventDefault();
  const r=canvas.getBoundingClientRect();
  if(type==='down'){if(ping.over){closeCabinet();return true;}canvas.setPointerCapture(e.pointerId);}
  ping.pointer(type,(e.clientX-r.left)*640/r.width,(e.clientY-r.top)*360/r.height);
  if(ping.exitRequested)closeCabinet();
  return true;
}
function cabinetPointer(e,type){
  if(!running||!['punch','ghost','pinball'].includes(ping?.kind))return;
  e.preventDefault();
  if(type==='down'){
    if(ping.over){closeCabinet();return;}
    canvas.setPointerCapture(e.pointerId);
  }
  const r=canvas.getBoundingClientRect();
  ping.pointer(type,(e.clientX-r.left)*640/r.width,(e.clientY-r.top)*360/r.height,e.pointerId);
}
for(const [event,type] of [['pointerdown','down'],['pointerup','up'],['pointercancel','cancel']])canvas.addEventListener(event,e=>cabinetPointer(e,type));
canvas.addEventListener('pointermove',e=>amigosPointer(e,'move'));
canvas.addEventListener('pointercancel',e=>amigosPointer(e,'cancel'));
canvas.addEventListener('pointerup',e=>amigosPointer(e,'up'));
canvas.addEventListener('contextmenu',e=>{if(ping?.kind==='amigos'){e.preventDefault();ping.menu=!ping.menu;}});
canvas.addEventListener('pointerdown',e=>{if(amigosPointer(e,'down'))return;if(!running)return;if(ping?.crossed){ping.continueCrossing();keys.clear();}else if(ping?.kind==='kong')keys.add(' ');});
for(const event of ['pointerup','pointercancel','pointerleave'])canvas.addEventListener(event,()=>keys.delete(' '));
function tick(now){
  startPhase('neon:simulation');
  // Camera input follows elapsed time through ordinary slow frames. Bound long
  // stalls, while retaining the smaller simulation step for safe movement.
  const elapsed=Math.max(0,(now-last)/1000),cameraDt=Math.min(elapsed,.25),dt=Math.min(elapsed,.04);last=now;
  if(banshee){
    keys.clear();shiftKeys.clear();coverPressed=false;
    document.querySelector('#pace').hidden=true;
    document.querySelector('#message').textContent='';
    if(!bansheeFrame((now-banshee.started)/1000).active){banshee=null;notice=3.5;noticeText='WTF WAS THAT??...';}
  }
  cubicleKnock?.update(elapsed,audioContext,Boolean(running&&insideCubicle&&!pubMenu.open&&!inventoryBox.open&&!staffTalk&&!debugMenu?.open&&browserFocused));
  if(running&&insideArcade)arcadeLife?.update(cameraDt,player,arcadePlayerMachine,Boolean(staffTalk));
  if(running&&ping)ping.update(ping.kind==='amigos'?elapsed:cameraDt,(ping.kind==='pinball'?(keys.has('ArrowDown')?1:0):(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0)),(ping.kind==='punch'||ping.kind==='frog'||ping.kind==='kong'||ping.kind==='meteors'||ping.kind==='byker')?(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0):0,ping.kind==='punch'?false:keys.has(' '),keys.has('ArrowLeft')||keys.has('a'),keys.has('ArrowRight')||keys.has('d'));
  if(ping?.crossed||ping?.won)keys.clear();
  if(running&&!ping&&!pubMenu.open&&!inventoryBox.open&&!banshee&&!staffTalk){
    shootingStars.update(cameraDt,Boolean(hotelCorridor&&windowView)||!indoors()&&onRiverWalk(player),skyView());
    time+=dt;hitCooldown=Math.max(0,hitCooldown-dt);shake=Math.max(0,shake-dt*12);notice=Math.max(0,notice-dt);
    if(hotelCorridor&&!windowView&&keys.has('ArrowUp')){
      windowView=corridorWindowView(player,corridorWindowState(currentHotel,hotelStairs.floor));
      if(windowView){Object.assign(player,{x:windowView.x,z:windowView.z,angle:windowView.angle});keys.clear();shiftKeys.clear();coverPressed=false;notice=0;shake=0;steps=0;}
    }
    const pace=!windowView&&!playerSeat&&keys.has('Shift')?3:1;
    document.querySelector('#pace').hidden=pace===1;
    player.angle+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*cameraDt*1.65*pace;
    if(windowView){
      player.angle=Math.max(windowView.angle-Math.PI/4,Math.min(windowView.angle+Math.PI/4,player.angle));
      const tilt=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
      windowView.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,windowView.pitch+tilt*cameraDt*1.65));
    }
    if(playerSeat){
      player.angle=Math.max(playerSeat.angle-Math.PI/4,Math.min(playerSeat.angle+Math.PI/4,player.angle));
      const tilt=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
      playerSeat.pitch=Math.max(0,Math.min(Math.PI/2,playerSeat.pitch+tilt*cameraDt*1.65));
    }
    const forward=Number(keys.has('ArrowUp')||keys.has('w'))-Number(keys.has('ArrowDown')||keys.has('s')),side=Number(keys.has('d'))-Number(keys.has('a')),speed=dt*5.8*pace/Math.max(1,Math.hypot(forward,side));
    if(indoors())hornWarning.update(dt,null,[]);
    if(insidePub){
      pubLife?.update(dt,pubPatrons,playerSeat,player);
      const line=pubTalk?.update(dt);
      if(line){notice=2.5;noticeText=line;}
      const bumpedSeats=[];
      const bumpedPerson=!playerSeat&&(pubSpatial()?.move??moveInPub)(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,pubPatrons,pubLife?.walker,bumpedSeats);
      pubLife?.bump(bumpedSeats,pubPatrons);
      if(bumpedPerson){notice=2.5;noticeText='HEY! WATCH OUT!';}
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / ${player.x<18?'BAR ROOM':'LOUNGE'}`;
    }else if(insideLavatory){
      // The pub waits, as it was, for the player to come back through.
      lavatoryLife.update(dt,lavatoryOccupied,player,washroomSpatial()?.blocksPerson);
      // A robot the player keeps waiting talks, as walkers outside do.
      const line=lavatoryTalk.update(dt,lavatoryLife.held?[{walker:lavatoryLife.walker,place:'lavatory'}]:[]);
      if(line){notice=2.5;noticeText=line;}
      (washroomSpatial()?.move??moveInLavatory)(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,lavatoryLife.walker);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=`${currentPubName} / LAVATORY`;
    }else if(insideCubicle){
      if(!playerSeat)(washroomSpatial()?.move??moveInCubicle)(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed);
      document.querySelector('#message').textContent=cubicleKnock?.text||(notice?noticeText:'');
      document.querySelector('#location').textContent=`${currentPubName} / ${insideCubicle.icon.toUpperCase()}`;
    }else if(insideBookshop){
      bookshopLife.update(dt,player,playerSeat?.bookshopChair);
      if(!playerSeat)(bookshopSpatial()?.move??moveInBookshop)(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,bookshopLife.seller,bookshopLife.people);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent='MIDNITE BOOKS';
    }else if(insideArcade){
      if(!playerSeat)moveInArcade(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,arcadeLife?.people??[]);
      arcadeAmbience.update(audioContext,1,dt);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=currentArcadeName;
    }else if(insideHotel){
      advanceHotelReceptionist(currentHotel,dt);
      hotelLife.update(dt,player,hotelGuestScene(),hotelStairs&&!hotelCorridor?stairwellHeight(player,hotelStairs):hotelFloorHeight(player.x,player.z),canSeeHotelGuest);
      if(hotelCorridor)advanceCorridorWindow(corridorWindowState(currentHotel,hotelStairs.floor),dt);
      if(hotelCorridor){if(!windowView)moveInHotelCorridor(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,hotelGuests());
      }else if(hotelStorage)moveInHotelStorage(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed);
      else if(hotelStairs)moveInHotelStairwell(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,hotelStairs,hotelGuests());

      if(!hotelStairs&&!playerSeat)moveInHotel(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,hotelGuests(),currentHotel);
      document.querySelector('#message').textContent=notice?noticeText:'';
      document.querySelector('#location').textContent=hotelCorridor?`HOTEL / FLOOR ${hotelStairs.floor} / CORRIDOR`:hotelStorage?'HOTEL / FLOOR 2 / STORAGE':hotelStairs?`HOTEL / FLOOR ${hotelStairs.floor} / STAIRWELL`:'HOTEL / LOBBY';
    }else{
    const people=city.pedestrians(time-dt);
    const bumped=[],bumpedCars=[];
    const bumpedPedestrian=!playerSeat&&city.move(player,(Math.sin(player.angle)*forward+Math.cos(player.angle)*side)*speed,(Math.cos(player.angle)*forward-Math.sin(player.angle)*side)*speed,people,bumped,roadTraffic.cars,bumpedCars);
    // On the promenade or a footpath, someone with lines for it answers a bump with them instead.
    if(bumpedPedestrian&&!bumped.some(talksHere)){notice=2.5;noticeText='HEY! WATCH OUT!';}
    if(!playerSeat&&(forward||side))steps+=dt*10*pace;
    city.update(player.x,player.z);
    arcadeAmbience.update(audioContext,arcadeVolume(player,[...city.chunks.values()].flatMap(chunk=>chunk.buildings)),dt);
    parkBirds.update(audioContext,parkVolume(player,city.chunks.values()),dt);
    const cars=roadTraffic.update(city.chunks.values(),time,dt,player,city.crossingPeople?.()??[]);
    if(hornWarning.update(dt,player,cars))playHorn(audioContext);
    // Waiting cars remain solid even while their warning is on cooldown.
    for(const c of cars)if(c.waiting){
      const dx=player.x-c.x,dz=player.z-c.z,hx=c.axis?2.8:1.5,hz=c.axis?1.5:2.8;
      const overlapping=Math.abs(dx)<hx&&Math.abs(dz)<hz;
      if(overlapping){
        if(hx-Math.abs(dx)<hz-Math.abs(dz))player.x=c.x+(dx>=0?hx:-hx);
        else player.z=c.z+(dz>=0?hz:-hz);
      }
      if((overlapping||bumpedCars.includes(c))&&!hitCooldown){
        playHorn(audioContext);notice=2.5;noticeText='HEY! STAY OFF MY CAR!';hitCooldown=1.5;
      }
    }
    collision: if(!hitCooldown)for(const c of cars){
      if(c.waiting)continue;
      if(Math.abs(player.x-c.x)<(c.axis?2.8:1.5)&&Math.abs(player.z-c.z)<(c.axis?1.5:2.8)){
        const side=c.axis?(player.z>=c.z?1:-1):(player.x>=c.x?1:-1);
        city.move(player,c.axis?c.dir*2.5:side*7,c.axis?side*7:c.dir*2.5,people,[],cars);shake=7;notice=2.5;noticeText='HEY! WATCH THE TRAFFIC.';hitCooldown=1.5;playOuch();
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
    const held=city.advancePedestrians(dt,player,time,walkerTalk.apart===0?walkerTalk.walker:null,roadTraffic)??[];
    const line=walkerTalk.update(dt,[...bumped,...held]);
    if(line){notice=2.5;noticeText=line;}
    document.querySelector('#message').textContent=notice?noticeText:'';
    document.querySelector('#location').textContent=`MIDNIGHT DISTRICT / ${Math.floor(player.x/64)}, ${Math.floor(player.z/64)}`;
    }
  }
  if(running&&!ping&&!staffTalk&&!inventoryBox.open&&!pubMenu.open&&!banshee)startFollowup();
  // Running taps are heard only in the lavatory, louder nearer the sinks.
  if(running&&!pubMenu.open&&!inventoryBox.open)tapWater.update(audioContext,insideLavatory?tapVolume(player,lavatoryTaps):0);
  // Ambient music plays throughout the hotel lobby, and boogie-woogie in the
  // pub, heard faintly from the lavatory but not from inside a cubicle.
  if(running&&browserFocused&&!document.hidden){
    lobbyMusic.update(audioContext,insideHotel?LOBBY_MUSIC.volume:0);
    const pubHeard=pubMusicHeard(insidePub?'pub':insideLavatory?'lavatory':insideCubicle?'cubicle':'street');
    pubMusic.update(audioContext,pubHeard.volume,pubHeard.lowpass);
  }
  endPhase('neon:simulation');
  if(running||!painted){render();painted=true;}
  requestAnimationFrame(tick);
}
// The initially disabled start button keeps click/Space input on the title
// screen until the shared engine is ready. No venue scene is constructed here.
if(start.disabled)prepareRendererAtStartup();
city.update(player.x,player.z);requestAnimationFrame(tick);
