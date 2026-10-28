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

import {shopWindowLabels} from './shop-labels.js';
import {entranceSide} from './entrances.js';

// Storefront art is painted only when a building's cached texture is created.
export function drawBlueNote(g,height,building,side){
  const base=height-39,entrance=side===entranceSide(building);
  const rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,base+y,w,h);};
  let seed=(Math.imul(building.x|0,73856093)^Math.imul(building.z|0,19349663)^side)>>>0;
  const pick=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const ink='#121924',cream='#e9cf95',wood='#9c6845';
  const covers=['#c78658','#9e535a','#4e8d8e','#d6b875','#6b7390','#888956'];
  const letters={V:['101','101','101','101','010'],I:['111','010','010','010','111'],N:['101','111','111','111','101'],Y:['101','101','010','010','010'],L:['100','100','100','100','111'],J:['001','001','001','101','111'],A:['010','101','111','101','101'],Z:['111','001','010','100','111'],S:['111','100','111','001','111'],O:['111','101','101','101','111'],U:['101','101','101','101','111'],E:['111','100','110','100','111'],W:['101','101','111','111','101'],R:['110','101','110','101','101'],C:['111','100','100','100','111'],K:['101','101','110','101','101'],B:['110','101','110','101','110'],G:['111','100','101','101','111'],P:['110','101','110','100','100'],X:['101','101','010','101','101'],T:['111','010','010','010','010'],D:['110','101','101','101','110'],M:['101','111','111','101','101'],F:['111','100','110','100','100'],'&':['010','101','010','101','011']};
  const text=(word,x,y,color)=>{for(const [i,char] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(letters[char]?.[row][col]==='1')rect(color,x+i*4+col,y+row,1,1);};
  const album=(x,y,size,variant)=>{
    const color=covers[variant%covers.length];
    rect(cream,x,y,size,size);rect(color,x+1,y+1,size-2,size-2);
    // Sleeves have different artwork, rather than a repeated record icon.
    if(variant%3===0){
      rect(ink,x+2,y+2,Math.max(1,size-4),1);rect(ink,x+size-4,y+3,2,size-5);
      rect(cream,x+2,y+size-3,size-4,1);
    }else if(variant%3===1){
      for(let n=0;n<size-3;n++)rect(ink,x+1+n,y+size-3-n,2,1);
      rect('#e2ba79',x+2,y+2,2,2);
    }else{
      rect('#cfad7b',x+2,y+2,size-4,size-4);
      rect(ink,x+size/2|0,y+2,1,size-4);rect(ink,x+2,y+size-3,size-4,1);
    }
  };
  const record=(x,y)=>{
    rect(ink,x+2,y,5,1);rect(ink,x+1,y+1,7,1);rect(ink,x,y+2,9,5);
    rect(ink,x+1,y+7,7,1);rect(ink,x+2,y+8,5,1);
    rect('#4b5359',x+1,y+3,1,3);rect('#4b5359',x+2,y+1,3,1);
    rect('#d5a251',x+3,y+3,3,3);rect(cream,x+4,y+4,1,1);
  };
  const bin=(x,y,w)=>{
    // Receding trapezoidal tops hold face-on sleeves, with thin rows behind.
    for(let row=0;row<5;row++)rect(row%2?'#bd9870':'#47362e',x+4-row,y+row,w-8+row*2,1);
    for(let n=0;n<Math.floor((w-4)/7);n++)album(x+2+n*7,y+2,6,pick()%18);
    rect('#bd8752',x,y+7,w,2);rect('#70482f',x+1,y+9,w-2,4);
    rect('#372b27',x+2,y+13,2,2);rect('#372b27',x+w-4,y+13,2,2);
  };
  rect('#142d34',0,0,160,39);rect('#59848a',0,0,160,2);
  const genres=["ROCK&ROLL",'BOOGIE','SOUL','BLUES','PUNK','POLKA METAL','BEBOP','FREE JAZZ','JAZZ ROCK'];
  const titles=shopWindowLabels(building,'blue-note',genres,side,entranceSide(building),['POLKA METAL']);
  const windows=entrance?[{x:6,w:58},{x:96,w:58}]:[{x:6,w:148}];
  for(const [index,{x,w}] of windows.entries()){
    rect('#527e84',x,3,w,33);rect('#101a22',x+1,4,w-2,31);
    rect('#674b39',x+3,6,w-6,27);rect('#98734d',x+7,8,w-14,19);
    // Dark reveals, warm back wall, and a floor that recedes between the bins.
    rect('#352e2c',x+3,6,4,27);rect('#42392f',x+w-7,6,4,27);
    for(let y=27;y<34;y++)rect(y%2?'#5c4b3d':'#6c5946',x+7-(y-27)/2|0,y,w-14+(y-27),1);
    rect('#d4ae70',x+8,6,w-16,1);rect('#e9c888',x+11,7,8,1);
    text(titles[index],x+9,9,cream);
    // Dense but quiet rear racks, with jackets facing out above the spines.
    for(let px=x+9;px+6<x+w-9;px+=7){
      album(px,16,6,pick()%18);
      rect('#352e2b',px-1,22,8,1);
      for(let n=0;n<6;n++)rect(covers[pick()%6],px+n,23,1,3-n%2);
    }
    if(index===0){
      // A featured LP and its exposed black vinyl sit in the front display.
      bin(x+7,21,w>60?32:24);
      album(x+9,23,10,pick()%18);record(x+16,24);
      if(w>60)for(let bx=x+45;bx+w/10<x+w-34;bx+=30)bin(bx,23,26);
    }
    // Listening equipment beside the record displays.
    const tx=x+w-24;
    rect('#bec0ae',tx+1,24,13,3);rect(ink,tx+3,24,7,2);
    rect('#cb9c62',tx+5,24,2,1);rect(cream,tx+12,23,1,3);rect(cream,tx+10,25,3,1);
    rect('#19232a',tx+12,9,7,13);rect('#3c4c50',tx+13,13,5,6);
    rect('#101a21',tx+14,14,3,4);rect('#bea36b',tx+15,11,1,1);
    // Small highlights at the edges preserve the sense of glass.
    g.globalAlpha=.1;rect('#a2d7df',x+3,7,1,24);rect('#a2d7df',x+w-5,8,1,23);g.globalAlpha=1;
    rect('#28484e',x,34,w,2);
  }
  if(!entrance)return;
  rect('#537e83',68,2,24,37);rect('#172830',70,4,20,34);
  rect('#30464a',73,7,14,20);rect('#14232b',75,9,10,16);
  record(75,12);rect('#c9b78c',85,28,2,5);rect('#7e9894',70,37,20,2);
}
