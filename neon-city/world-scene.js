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

import {profilePhase} from './render-profile.js';
import {buildingGeometry} from './building-geometry.js';
import {manholeGeometry} from './manhole-geometry.js';
import {drawRoadMarkings} from './road-marking-geometry.js';
import {drawCarGeometry} from './car-geometry.js';
import {vehicleTexture as carTexture} from './vehicle-textures.js';
import {newspaperGeometry,drawNewspaperGeometry} from './newspaper-geometry.js';
import {hotelStreetLife} from './hotel-street.js?v=1';
import {corridorWindowState,drawHotelCorridor} from './hotel-corridor.js?v=businessman-door-1';
import {drawMoneyNote} from './money.js?v=hotel-cash-1';
import {drawDroppedObject} from './dropped-object.js';
import {stairwellNote,drawHotelStairwell} from './hotel-stairwell.js?v=hotel-guests-3';
import {drawHotelStorage} from './hotel-storage.js?v=hotel-note-3';
import {drawArcadeInterior} from './arcade-interior.js?v=pinball-9';
import {bansheeFrame} from './banshee.js?v=6';
import {sprite,outfit} from './sprites.js?v=bumps-1';
import {pedestrian,pedestrianShowsBack,mod,RIVER_VIEW_DISTANCE,groundHeight,characterHeight,characterGirth,START_SIGN,RIVE_GAUCHE_SIGNS} from './world.js?v=start-pub-1';
import {drawRiverTerrain,drawRiverStructures,drawRiverbankFaces,drawBridgeFascias} from './rivers.js?v=visibility-reuse-1';
import {drawParkGround,drawParkStructures,drawFingerpost,paintSign,SIGN_TEXTURE} from './parks.js?v=rive-gauche-6';
import {drawRiveGaucheSign,paintRiveGauche,RIVE_GAUCHE_TEXTURE} from './rive-gauche.js?v=5';
import {drawArcade,arcadeName} from './arcade.js?v=park-entrances-1';
import {drawBookshopInterior} from './midnite-interior.js';
import {bookshopVisitorShowsBack} from './midnite-life.js';
import {drawMidniteBooks} from './midnite-books.js?v=unique-labels-4';
import {drawBlueNote} from './blue-note.js?v=unique-labels-4';
import {drawPub,pubName} from './pub.js?v=park-entrances-1';
import {drawPubInterior} from './pub-interior.js?v=bar-taps-1';
import {drawLavatory,drawCubicle} from './lavatory.js?v=staff-room-1';
import {hotelReceptionistPosition,drawHotelInterior} from './hotel-interior.js?v=receptionist-lamp-2';
import {hotelHIsDim,dimHotelH,drawHotel,hotelLook} from './hotel.js?v=park-entrances-1';

// Build world geometry and named drawing operations from a frame of game state.
// Projection, clipping, raster queues and the output Canvas context belong to
// the backend. Local Canvas contexts below generate reusable artwork only.
// The backend consumes world-space points and source-pixel UVs synchronously;
// generators may reuse scratch arrays once face() returns.
export function createWorldScene(renderer,{seatedTexturePrewarmer,reduced=false}){
  const {boundsVisible,quad,box}=renderer;
  let player,eye,windowView,playerSeat,running,time,
    insideBookshop,bookshopLife,insideArcade,arcadeLife,
    insideHotel,hotelCorridor,hotelStairs,hotelStorage,currentHotel,
    insideCubicle,insideLavatory,insidePub,lavatoryOccupied,lavatoryTaps,lavatoryLife,
    pubPatrons,bartenderType,currentVenue,pubLife,city,roadTraffic,wallet,
    banshee,shake,steps,starfield,moon,shootingStars,skyView,hotelGuests,itemRoom,indoors;
  let vehicleSurface=null,vehicleTurn=null;
  function face(vertices,color,texture=null,smooth=false,buildingWall=false){
    // Include textures above and beside the current view: they can become visible
    // when a seated player looks up or turns. Reuse the normal scene traversal.
    if(texture&&playerSeat&&!indoors&&running)seatedTexturePrewarmer.add(texture);
    if(vehicleSurface)vertices=vertices.map(v=>({...v,y:v.y+vehicleSurface(v.z)}));
    if(vehicleTurn){
      const {x,z,angle}=vehicleTurn,c=Math.cos(angle),s=Math.sin(angle);
      vertices=vertices.map(v=>({...v,x:x+(v.x-x)*c+(v.z-z)*s,z:z-(v.x-x)*s+(v.z-z)*c}));
    }
    renderer.face(vertices,color,texture,smooth,buildingWall);
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
    if(b.sign==='BLUE NOTE')drawBlueNote(g,c.height,b,side);
    if(b.sign==='MIDNITE BOOKS')drawMidniteBooks(g,c.height,b,side);
    if(b.sign==='HOTEL')drawHotel(g,c.height,b,side);
    g.fillStyle='#100a20';g.fillRect(3,c.height-65,154,23);g.strokeStyle=b.neon;g.lineWidth=1;g.strokeRect(3,c.height-65,154,23);g.font='bold 16px monospace';g.textAlign='center';g.shadowColor=b.neon;g.shadowBlur=5;g.fillStyle=b.neon;g.fillText(b.sign==='ARCADE'?arcadeName(b):b.sign==='NEON PUB'?pubName(b):b.sign,80,c.height-48,146);g.shadowBlur=0;
    // The vertical hotel sign must fit entirely below the roofline.
    if(b.sign==='HOTEL'&&c.height>=137){g.fillStyle='#160c24';g.fillRect(132,c.height-137,24,72);g.fillStyle=b.neon;g.font='bold 12px monospace';for(let i=0;i<5;i++)g.fillText('HOTEL'[i],144,c.height-124+i*13);}
    textures[side]=c;return c;
  }
  function building(b){
    const x=b.x,z=b.z,w=b.w,d=b.d,h=b.h;
    if(!boundsVisible(x,0,z,x+w,h,z+d)){
      // Seated players can turn toward these walls: keep their textures warm
      // without constructing, transforming or clipping offscreen wall panels.
      if(playerSeat&&!indoors&&running){
        if(player.z<z)seatedTexturePrewarmer.add(wallTexture(b,0));
        if(player.z>z+d)seatedTexturePrewarmer.add(wallTexture(b,1));
        if(player.x<x)seatedTexturePrewarmer.add(wallTexture(b,2));
        if(player.x>x+w)seatedTexturePrewarmer.add(wallTexture(b,3));
      }
      return;
    }
    const panels=buildingGeometry(b);
    function wall(side){
      const tex=wallTexture(b,side);
      if(playerSeat&&!indoors&&running)seatedTexturePrewarmer.add(tex);
      // Panels retain fine-grained depth ordering against cars and pedestrians.
      for(let s=0;s<8;s++){
        const vertices=[];
        for(let i=0;i<4;i++){
          const k=((side*8+s)*4+i)*5;
          vertices.push({x:panels[k],y:panels[k+1],z:panels[k+2],u:panels[k+3],v:panels[k+4]*tex.height});
        }
        renderer.withStyle({elevation:0},()=>face(vertices,b.color,tex,false,true));
      }
    }
    if(player.z<z)wall(0);
    if(player.z>z+d)wall(1);
    if(player.x<x)wall(2);
    if(player.x>x+w)wall(3);
  }
  function person(p){
    renderer.billboard({position:{x:p.x,y:groundHeight(p.x,p.z)+.075,z:p.z},
      height:characterHeight(p.type),width:characterHeight(p.type)*characterGirth(p.type)/2,
      getImage:()=>sprite(p.type,p.frame,pedestrianShowsBack(p,player),p.variant)});
  }
  function car(c,groundOverride){
    vehicleTurn=c.turn?{x:c.x,z:c.z,angle:c.turn.angle}:null;
    const base=groundOverride??groundHeight(c.x,c.z),slope=groundOverride!=null||c.axis?0:(groundHeight(c.x,c.z+.1)-groundHeight(c.x,c.z-.1))/.2;
    vehicleSurface=z=>base+(z-c.z)*slope;
    drawCarGeometry(c,{player,eye,base,slope,indoors:indoors,face,texture:carTexture});
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
    const paper=m.paper??'DAILY BUGLE',look=NEWSPAPER_LOOKS[paper]??NEWSPAPER_LOOKS['DAILY BUGLE'];
    if(!newspaperTextures[paper]){
      const c=document.createElement('canvas');c.width=160;c.height=224;
      const g=c.getContext('2d');
      g.fillStyle=look.paint;g.fillRect(0,0,160,224);
      g.fillStyle='#eee1bd';g.fillRect(7,9,146,38);
      g.fillStyle=look.masthead;g.textAlign='center';g.font='bold 20px serif';g.fillText(paper,80,35,140);
      g.fillStyle=look.frame;g.fillRect(9,56,142,130);
      g.fillStyle='#829395';g.fillRect(13,60,134,122);
      g.fillStyle='#e2d8b9';g.fillRect(22,69,106,103);
      g.fillStyle='#292636';g.font='bold 15px serif';g.fillText(paper,75,86,100);
      g.font='bold 14px monospace';g.fillText(look.subtitle??'CITY NEWS',75,104,100);
      g.fillStyle='#41414d';g.fillRect(29,113,43,31);
      for(let y=114;y<165;y+=6){g.fillRect(79,y,40,2);if(y>143)g.fillRect(29,y,43,2);}
      g.fillStyle='#e2d8b9';g.fillRect(133,98,8,36);
      g.fillStyle='#beb9ac';g.fillRect(15,195,33,19);
      g.fillStyle='#232231';g.fillRect(20,202,23,4);
      g.fillStyle=look.price;g.font='bold 18px monospace';g.fillText('25¢',113,212);
      newspaperTextures[paper]=c;
    }
    renderer.withStyle({detail:true,textureSmooth:true},()=>drawNewspaperGeometry(m,newspaperGeometry(m),player,eye,look,newspaperTextures[paper],face));
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
  let riveGaucheCanvas=null;
  function riveGaucheTexture(){
    if(!riveGaucheCanvas){
      riveGaucheCanvas=document.createElement('canvas');
      riveGaucheCanvas.width=RIVE_GAUCHE_TEXTURE.width;riveGaucheCanvas.height=RIVE_GAUCHE_TEXTURE.height;
      paintRiveGauche(riveGaucheCanvas.getContext('2d'));
    }
    return riveGaucheCanvas;
  }
  function street(chunk){
    const x=chunk.x*64,z=chunk.z*64;
    if(renderer.drawRoad)renderer.drawRoad(chunk);
    if(chunk.river){drawRiverTerrain(chunk,{quad,face,boundsVisible,nativeRoads:!!renderer.drawRoad},time);return;}
    // Asphalt needs geometry to occlude the recessed river at street approaches.
    // The screen background alone cannot hide water projected over the road.
    if(!renderer.drawRoad)quad(x,0,z,64,64,'#252233');
    quad(x+8,.04,z+8,48,48,'#414052');quad(x+8,.06,z+8,48,.25,'#777185');quad(x+8,.06,z+8,.25,48,'#777185');
    if(!renderer.drawRoad)drawRoadMarkings(x,z,face);
    // Pavement seams and a pool of neon light outside each storefront.
    for(let i=10;i<56;i+=6){quad(x+i,.07,z+8,.06,6,'#272739');quad(x+8,.07,z+i,6,.06,'#272739');}
    if(chunk.park){drawParkGround(chunk,{quad,face});return;}
    quad(x+16,.08,z+9,12,3,'#57354f');quad(x+9,.08,z+35,3,10,'#294755');
  }
  function manhole(m){
    // Flat circular iron covers, projected with the same camera as the pavement.
    const geometry=manholeGeometry(m.radius);
    const disk=(layer,y,color)=>face(Array.from({length:16},(_,i)=>{
      const k=layer*32+i*2;
      return {x:m.x+geometry[k],y,z:m.z+geometry[k+1]};
    }),color);
    disk(0,.09,'#171923');
    disk(1,.091,'#777482');
    disk(2,.092,'#343541');
    for(let i=0;i<3;i++){
      const offset=(i-1)*.25,length=geometry[96+i];
      quad(m.x-length/2,.093,m.z+offset-.025,length,.05,'#161923');
    }
  }
  const seatedPixels=new Map();
  function seatedPatron(p,walking=false,height=48*.05,backView=null){
    const back=backView??(walking?pedestrianShowsBack(p,player):(player.z-p.z)*p.side>0);
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
  function drawDroppedItems(chunks){
    const room=itemRoom;
    for(const chunk of chunks)for(const item of chunk.droppedItems??[]){
      if(item.room!==room)continue;
      renderer.withStyle({detail:true},()=>{
        drawDroppedObject(item,{face,quad,box},{x:player.x,y:eye,z:player.z});
      });
    }
  }
  function renderScene(){
    renderer.beginFrame({position:player,eye,pitch:windowView?.pitch??playerSeat?.pitch??0,indoors});
    if(insideBookshop){
      renderer.beginPass();drawBookshopInterior({face,quad,box},bookshopLife);
      for(const p of bookshopLife.people)seatedPatron(p,p.state!=='reading',characterHeight(p.type),bookshopVisitorShowsBack(p,player));
      drawDroppedItems(city.chunks.values());
      renderer.drawInterior('#302c26');return;
    }
    if(insideArcade){
      renderer.beginPass();drawArcadeInterior({face,quad,box});
      for(const p of arcadeLife?.people??[])seatedPatron(p,true,characterHeight(p.type));
      drawDroppedItems(city.chunks.values());
      renderer.drawInterior('#17172b');return;
    }
    if(insideHotel){
      renderer.beginPass();
      if(hotelCorridor){
        drawHotelCorridor({face,quad,box,look:hotelLook(currentHotel),floor:hotelStairs.floor,windowState:corridorWindowState(currentHotel,hotelStairs.floor)});
        const street=hotelStreetLife(currentHotel.seed,time,hotelStairs.floor);
        for(const c of street.cars)car(c,c.y);
        for(const p of street.people)seatedPatron(p,true,characterHeight(p.type));
      }
      else if(hotelStorage)profilePhase('neon:canvas:geometry',()=>drawHotelStorage({face,quad,box,noteTaken:currentHotel.storageNoteTaken}));
      else if(hotelStairs){
        drawHotelStairwell({face,quad,box,look:hotelLook(currentHotel)});
        renderer.withStyle({textureSmooth:true,textureOverlay:{color:[9,7,21],alpha:.2}},()=>drawMoneyNote(stairwellNote(currentHotel),face));
      }
      else drawHotelInterior({face,quad,box,look:hotelLook(currentHotel),receptionist:currentHotel.receptionist,lampOn:currentHotel.lampOn,lampTaken:currentHotel.lampTaken,receptionistPosition:hotelReceptionistPosition(currentHotel)});
      // Guests share the player's interior and keep their feet at the route's height.
      for(const guest of hotelGuests)seatedPatron(guest,true,characterHeight(guest.type));
      drawDroppedItems(city.chunks.values());
      const depth=renderer.drawInterior(hotelCorridor?'#000000':'#3a2d36');
      if(hotelCorridor){
        renderer.drawSky({starfield,shootingStars,skyView},depth);
      }
      return;
    }
    if(insideCubicle){
      renderer.beginPass();drawCubicle({face,quad,box});
      drawDroppedItems(city.chunks.values());
      renderer.drawInterior();
      if(banshee){
        const seconds=(performance.now()-banshee.started)/1000,frame=bansheeFrame(seconds);
        renderer.overlay({kind:'banshee',seconds,frame});
      }
      return;
    }
    if(insideLavatory){
      renderer.beginPass();drawLavatory({face,quad,box,occupied:lavatoryOccupied,viewer:{x:player.x,z:player.z,eye,angle:player.angle},taps:lavatoryTaps,time:performance.now()/1000});
      // The lavatory is built to true size, unlike the pub, so the robot is too.
      if(lavatoryLife?.walker)seatedPatron(lavatoryLife.walker,true,characterHeight(lavatoryLife.walker.type));
      drawDroppedItems(city.chunks.values());
      renderer.drawInterior();return;
    }
    if(insidePub){
      renderer.beginPass();drawPubInterior({face,quad,box,patrons:pubPatrons,seatedPatron,bartenderType,barBeer:currentVenue.barBeer});
      if(pubLife?.walker)seatedPatron(pubLife.walker,true);
      drawDroppedItems(city.chunks.values());
      renderer.drawInterior();return;
    }
    renderer.drawSky({starfield,moon,shootingStars,skyView});
    renderer.beginPass();
    const visible=[...city.chunks.values()].filter(chunk=>Math.hypot(chunk.x*64+32-player.x,chunk.z*64+32-player.z)<=(chunk.river?RIVER_VIEW_DISTANCE:170));
    for(const chunk of visible)street(chunk);
    const terrain=renderer.endPass('ground');
    renderer.drawPass(terrain,{elevation:'below'});
    renderer.beginPass();
    for(const chunk of visible)if(chunk.river){
      drawRiverbankFaces(chunk,{face,boundsVisible},player);
      drawBridgeFascias(chunk,{face,boundsVisible},player,true);
    }
    renderer.drawPass(renderer.endPass('depth'));
    renderer.drawPass(terrain,{elevation:'above'});
    // Ground details go over the pavement, before people and buildings.
    renderer.beginPass();
    for(const chunk of visible)for(const m of chunk.manholes)manhole(m);
    renderer.drawPass(renderer.endPass());
    renderer.beginPass();
    for(const chunk of visible){
      if(chunk.river){
        renderer.drawRailings?.(chunk);
        drawRiverStructures(chunk,{face,boundsVisible,nativeRoads:!!renderer.drawRoad,nativeRailings:!!renderer.drawRailings},{x:player.x,y:eye,z:player.z});
      }
      for(const b of chunk.buildings)building(b);
      for(const m of chunk.newspaperMachines??[])newspaperMachine(m);
      if(chunk.park){
        // Benches and trees are small, layered objects; order them at real overlaps.
        renderer.withStyle({detail:true,textureSmooth:true},()=>drawParkStructures(chunk,{face,signTexture},{x:player.x,y:eye,z:player.z}));
      }
      for(const p of chunk.people)person(pedestrian(chunk,p,time));
    }
    drawDroppedItems(visible);
    renderer.withStyle({detail:true,textureSmooth:true,groundTexture:true},()=>drawMoneyNote(wallet.note,face));
    renderer.withStyle({detail:true,textureSmooth:true},()=>drawFingerpost(START_SIGN,city.startSignBoards,{face,signTexture},{x:player.x,y:eye,z:player.z}));
    renderer.withStyle({detail:true,textureSmooth:true},()=>{
      for(const s of RIVE_GAUCHE_SIGNS)drawRiveGaucheSign(s,{face},{x:player.x,y:eye,z:player.z},riveGaucheTexture());
    });
    for(const c of roadTraffic.cars)if(Math.hypot(c.x-player.x,c.z-player.z)<RIVER_VIEW_DISTANCE)car(c);
    renderer.finishStreet({reduced,shake,time,steps,running});
  }
  return {render(frame){
    ({player,eye,windowView,playerSeat,running,time,
      insideBookshop,bookshopLife,insideArcade,arcadeLife,
      insideHotel,hotelCorridor,hotelStairs,hotelStorage,currentHotel,
      insideCubicle,insideLavatory,insidePub,lavatoryOccupied,lavatoryTaps,lavatoryLife,
      pubPatrons,bartenderType,currentVenue,pubLife,city,roadTraffic,wallet,
      banshee,shake,steps,starfield,moon,shootingStars,skyView,hotelGuests,itemRoom,indoors}=frame);
    renderScene();
  }};
}
