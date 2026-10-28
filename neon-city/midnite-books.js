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

import {shopLabels} from './shop-labels.js';
import {entranceSide} from './entrances.js';

// Painted into the usual cached facade; the bookshop adds no per-frame geometry.
export function drawMidniteBooks(g,height,building,side){
  const base=height-39,entrance=side===entranceSide(building);
  const rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,base+y,w,h);};
  let seed=(Math.imul(building.x|0,73856093)^Math.imul(building.z|0,19349663)^side)>>>0;
  const pick=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>8;};
  const paper='#e3cd9a',wood='#99704b',shadow='#28272b';
  const colors=['#91604e','#b29560','#586e62','#6b637d','#a16d71','#58717d','#c0a372'];
  const book=(x,y,w,h,color)=>{
    rect(color,x,y,w,h);rect('#c4af80',x+1,y+1,Math.max(1,w-2),1);
    if(w>3){rect(paper,x+1,y+3,w-2,1);rect('#514b44',x+1,y+h-2,w-2,1);}
  };
  const spineRow=(x,y,w)=>{
    for(let px=x;px<x+w-2;){
      const bw=2+pick()%3,bh=4+pick()%4;
      if(px+bw>x+w)break;
      rect(colors[pick()%colors.length],px,y-bh,bw,bh);
      rect(paper,px,y-bh+1,1,1);
      if(bw>2)rect('#c1aa7c',px+1,y-2,bw-2,1);
      px+=bw+1;
    }
  };
  const letters={
    B:['110','101','110','101','110'],E:['111','100','110','100','111'],S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    L:['100','100','100','100','111'],R:['110','101','110','101','101'],F:['111','100','110','100','100'],I:['111','010','010','010','111'],
    C:['111','100','100','100','111'],O:['111','101','101','101','111'],N:['101','111','111','111','101'],Y:['101','101','010','010','010'],
    P:['110','101','110','100','100'],U:['101','101','101','101','111'],K:['101','101','110','101','101'],
    H:['101','101','111','101','101'],M:['101','111','111','101','101'],A:['010','101','111','101','101'],
    V:['101','101','101','101','010'],'-':['000','000','111','000','000']
  };
  const label=(word,x,y)=>{for(const [i,c] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(letters[c]?.[row][col]==='1')rect(paper,x+i*4+col,y+row,1,1);};
  rect('#263b35',0,0,160,39);rect('#7c8566',0,0,160,2);
  const categories=['FICTION','CYBERPUNK','HORROR','MUSIC','SCI-FI','TRAVELS'];
  const titles=shopLabels(building,'midnite-books',categories);
  const windows=entrance?[{x:6,w:58,title:titles[0]},{x:96,w:58,title:titles[1]}]:[{x:6,w:148,title:'BEST SELLERS'}];
  for(const {x,w,title} of windows){
    rect('#9d936e',x,3,w,33);rect('#182825',x+1,4,w-2,31);
    rect('#4c4035',x+3,6,w-6,28);rect('#766047',x+7,8,w-14,20);
    rect('#302f2a',x+3,6,4,28);rect('#39382e',x+w-7,6,4,28);
    // Warm ceiling lights and timber floor establish the depth of the room.
    rect('#c9a46d',x+8,6,w-16,1);rect('#f2d899',x+11,7,7,1);
    for(let y=28;y<34;y++)rect(y%2?'#65503e':'#735c45',x+7-(y-28)/2|0,y,w-14+(y-28),1);
    // Tall bookcases: three shelves of individually sized and coloured spines.
    for(const shelf of [16,25]){
      rect('#39322c',x+8,shelf-8,w-16,8);
      spineRow(x+9,shelf-1,w-18);
      rect(wood,x+7,shelf,w-14,1);rect('#b18b5a',x+7,shelf+1,w-14,1);
    }
    for(let px=x+7;px<x+w-7;px+=23)rect('#493a2f',px,8,1,19);
    // Face-out books and stacked paperbacks form the street-facing display.
    for(let px=x+7;px+8<x+w-6;px+=13){
      const bh=8+pick()%3;
      rect(shadow,px+1,32,9,1);
      book(px,32-bh,7,bh,colors[pick()%colors.length]);
      if((px-x)%2){
        rect(colors[pick()%colors.length],px+7,30,5,2);
        rect(paper,px+7,29,5,1);rect(colors[pick()%colors.length],px+8,27,4,2);
      }
    }
    rect('#b19366',x+3,33,w-6,1);
    // Restrained gold lettering is painted on the upper glass.
    const titleWidth=title.length*4-1,left=x+Math.floor((w-titleWidth)/2);
    rect('#263b35',left-3,7,titleWidth+6,7);label(title,left,8);
    g.globalAlpha=.1;rect('#b6d4bd',x+3,7,1,24);rect('#b6d4bd',x+w-5,8,1,23);g.globalAlpha=1;
    rect('#58644c',x,34,w,2);
  }
  if(!entrance)return;
  rect('#9d936e',68,2,24,37);rect('#263b35',70,4,20,34);
  rect('#152923',73,7,14,19);rect('#496152',74,8,1,17);
  // A cream open-book emblem hangs in the glazed door.
  rect('#bba876',75,14,10,7);rect(paper,76,13,3,7);rect(paper,80,13,3,7);
  rect('#615b45',79,14,1,7);rect('#aa936c',77,15,1,3);rect('#aa936c',81,15,1,3);
  rect('#dbca91',85,28,2,5);rect('#938d69',70,37,20,2);
}
