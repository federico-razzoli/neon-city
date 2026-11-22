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

import {facesEntrance} from './entrances.js';
import {facingDoorway,facingNearest,facingAcrossCounter,BARTENDER_REPLY} from './pub-interior.js';

export const BOOKSHOP={width:18,depth:18,height:4.5,door:{x:9,z:0},spawn:{x:9,z:1.8,angle:0},
  // The left and rear cases meet flush in the far-left corner.
  shelves:[{x:0,z:4,w:1.2,d:14},{x:16.8,z:4,w:1,d:9},
    {x:1.2,z:16.8,w:10.8,d:1.2},{x:4,z:6,w:1,d:7},{x:12,z:6,w:1,d:7}],
  tables:[{x:7,z:6,w:3,d:1.8},{x:7,z:11,w:3,d:1.8}],
  windowShelves:[{x:1,z:.1,w:6,d:.6},{x:11,z:.1,w:6,d:.6}],
  counter:{x:13.8,z:14,w:4.2,d:1.2},bookseller:{x:15.5,z:16,radius:.55},
  till:{x:14.525,z:14.425,radius:.2835,reach:1.5},
  deskBook:{x:16.7,z:14.55,radius:.35,reach:1.5},
  backpack:{x:17.5,z:17.5,radius:.35,reach:1.2},
  // Turn the upholstered backs into the two front corners. The outer back
  // corners sit against the side walls, clear of the window ledges.
  chairs:[{x:1.55/Math.SQRT2,z:.8+1.55/Math.SQRT2,radius:1.05,angle:Math.PI/4},
    {x:18-1.55/Math.SQRT2,z:.8+1.55/Math.SQRT2,radius:1.05,angle:-Math.PI/4}]};
// Low reading tables follow the chairs' diagonal facing directions.
BOOKSHOP.readingTables=BOOKSHOP.chairs.map(chair=>({
  x:chair.x+Math.sin(chair.angle)*1.85,z:chair.z+Math.cos(chair.angle)*1.85,radius:.45
}));
export const BOOK_TITLES=['HOW TO BUILD A ROBOT','LORD OF THE EARRINGS','NEON CITY SECRETS','REGULAR EXPRESSIONS','AUTOBIOGRAPHY OF A MAN WHO DIED ALL OF A SUDD','THE ULTIMATE GUIDE TO TIME PARADOXES','MAKE IT SO, NUMBER ONE!','LOOK OUTSIDE','HOW TO EXIT VIM',"NO, I'M NOT A HUMAN",'NEWSPEAK DICTIONARY','V FOR VINTAGE'];
export const BOOKSHOP_BOOKS=BOOKSHOP.tables.flatMap((table,i)=>Array.from({length:6},(_,j)=>({
  x:table.x+.5+(j%3)*.9,z:table.z+.425+Math.floor(j/3)*.8,
  radius:.3,reach:1.4,color:['#93634e','#ae925c','#526e60','#71617d','#a06b75','#557985'][(j+i)%6],
  ...(i*6+j<BOOK_TITLES.length?{id:`bookshop-book-${i*6+j}`,name:BOOK_TITLES[i*6+j],description:BOOK_TITLES[i*6+j],tableIndex:i,bookshopLoan:true}:{})
})));
export const BOOK_READING_INVITATION='FEEL FREE TO SIT AT ONE OF THE TABLES AND TAKE A LOOK AT THIS BOOK, BEFORE BUYING IT.';
export const BOOKSELLER_GIFTS=Object.fromEntries(BOOKSHOP_BOOKS.filter(book=>book.id).map(book=>[book.id,{answer:[BOOK_READING_INVITATION],ends:true}]));
export const BOOK_READING_REPLY='THIS BOOK IS NOT AS GOOD AS I THOUGHT.';
export const BACKPACK_WARNING='PLEASE SIR, LEAVE MY BACKPACK ALONE.';
export const BOOK_EXIT_REPLY="I CAN'T LEAVE WITH A BOOK I DIDN'T BUY.";
export const BOOK_CATEGORIES=['MATH\nSCIENCE','CYBERPUNK','HORROR','MUSIC','SCI-FI'];
export const facingBookshopDoor=(player,buildings)=>buildings.find(b=>b.sign==='MIDNITE BOOKS'&&facesEntrance(player,b,facingDoorway));
export const facingBookshopExit=player=>player.z>0&&facingDoorway(player,BOOKSHOP.door,.85);
export const facingBookshopSeat=player=>facingNearest(player,BOOKSHOP.chairs);
export const facingBookseller=player=>facingAcrossCounter(player,BOOKSHOP.counter,BOOKSHOP.bookseller);
export const booksellerTalk=({seen,taken,returned})=>[[
  {ask:'HI!',answer:['HELLO THERE!']},
  {ask:'OPEN ALL NIGHT?',answer:['STORIES DO NOT KEEP OFFICE HOURS. NEITHER DO WE.']},
  {ask:'DO YOU HAVE ANY SPARE TICKET FOR THE RADIOCOWS SHOW?',answer:['DO YOU MEAN THE RADIOACTIVE COWS?','I WAS LUVKY ENOUGH TO BUY THE LAST TICKET!'],needs:'RADIOACTIVE_COWS_TICKET_MENTIONED',unless:'BOOKSELLER_TICKET_REWARDED',next:1},
  ...(seen?[{ask:'ABOUT YOUR BACKPACK...',answer:[taken
    ?"I THINK I'VE LOST IT. IF YOU FIND IT, PLEASE, TAKE IT TO ME."
    :returned?"I'M SO HAPPY YOU'VE FOUND IT. THANK YOU, SIR!":"MY BACKPACK IS NOT FOR SALE, SIR."]}]:[]),
  {ask:'BYE!',answer:['SEE YOU LATER, SIR!'],ends:true}
],Object.assign([
  {ask:'WOULD YOU SELL IT TO ME?',answer:[{say: "I WOULDN'T SELL IT FOR A MILLION COWS. SORRY PAL.",sets:'BOOKSELLER_TICKET_REFUSED'}],unless:'BOOKSELLER_TICKET_REFUSED'},
  {ask:'I REALLY NEED THAT TICKET...',answer:[{say:'I NEED IT, TOO. SORRY PAL.',sets:'BOOKSELLER_TICKET_NEEDED'}],needs:'BOOKSELLER_TICKET_REFUSED',next:0},
  {ask:'NEVER MIND.',answer:[],next:0}
],{giveAfter:'BOOKSELLER_TICKET_NEEDED'})];
export function bookshopReply(player,life=null){
  // A clear aim at the bookseller opens his conversation, even though the
  // register is closer to the customer on the counter in front of him.
  if((!life||life.atDesk)&&facingBookseller(player)){
    const dx=BOOKSHOP.bookseller.x-player.x,dz=BOOKSHOP.bookseller.z-player.z;
    if(Math.abs(dx*Math.cos(player.angle)-dz*Math.sin(player.angle))<=BOOKSHOP.bookseller.radius)return null;
  }
  const deskTarget=facingNearest(player,[BOOKSHOP.till,BOOKSHOP.deskBook,...(!life||life.atDesk?[BOOKSHOP.bookseller]:[])]);
  if(deskTarget===BOOKSHOP.deskBook)return "A BOOK I'VE ALREADY READ.";
  if(deskTarget===BOOKSHOP.till)return "DON'T PLAY WITH THE TILL, PLEASE.";
  if((!life||life.atDesk)&&player.z>BOOKSHOP.counter.z+BOOKSHOP.counter.d&&facingNearest(player,[BOOKSHOP.bookseller]))return BARTENDER_REPLY;
  const targets=[...BOOKSHOP.shelves.map((b,i)=>({x:b.x+b.w/2,z:b.z+b.d/2,radius:.7,reach:1.7,text:BOOK_CATEGORIES[i]})),
    ...BOOKSHOP.windowShelves.map(b=>({x:Math.max(b.x,Math.min(player.x,b.x+b.w)),z:b.z+b.d,radius:.3,reach:1.7,text:"I SHOULDN'T TAKE THESE."}))];
  // Long shelves can be browsed anywhere along their accessible edge.
  BOOKSHOP.shelves.forEach((b,i)=>{targets[i].x=Math.max(b.x,Math.min(player.x,b.x+b.w));targets[i].z=Math.max(b.z,Math.min(player.z,b.z+b.d));});
  const target=facingNearest(player,targets);
  return target?target.text:null;
}
export function bookshopWalkable(x,z,r=.3,staff=BOOKSHOP.bookseller){
  return x>=r&&z>=r&&x<=BOOKSHOP.width-r&&z<=BOOKSHOP.depth-r&&
    ![...BOOKSHOP.shelves,...BOOKSHOP.windowShelves,...BOOKSHOP.tables,BOOKSHOP.counter].some(b=>x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)&&
    [...BOOKSHOP.chairs,...BOOKSHOP.readingTables,...(staff?[staff]:[])].every(b=>Math.hypot(x-b.x,z-b.z)>=r+b.radius);
}
export function moveInBookshop(player,dx,dz,staff=BOOKSHOP.bookseller,people=[]){
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));let bumpedTable=false;
  function clear(x,z){
    if(!bookshopWalkable(x,z,.3,staff)){
      if(BOOKSHOP.readingTables.some(t=>Math.hypot(x-t.x,z-t.z)<.3+t.radius))bumpedTable=true;
      return false;
    }
    return people.every(p=>Math.hypot(x-p.x,z-p.z)>=.6);
  }
  for(let i=0;i<n;i++){if(dx&&clear(player.x+dx/n,player.z))player.x+=dx/n;if(dz&&clear(player.x,player.z+dz/n))player.z+=dz/n;}
  return bumpedTable;
}
