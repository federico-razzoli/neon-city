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
import {facingDoorway,facingNearest,facingAcrossCounter,drawStaff,drawCylinder,BARTENDER_REPLY} from './pub-interior.js';

export const BOOKSHOP={width:18,depth:18,height:4.5,door:{x:9,z:0},spawn:{x:9,z:1.8,angle:0},
  // The left and rear cases meet flush in the far-left corner.
  shelves:[{x:0,z:4,w:1.2,d:14},{x:16.8,z:4,w:1,d:9},
    {x:1.2,z:16.8,w:10.8,d:1.2},{x:4,z:6,w:1,d:7},{x:12,z:6,w:1,d:7}],
  tables:[{x:7,z:6,w:3,d:1.8},{x:7,z:11,w:3,d:1.8}],
  windowShelves:[{x:1,z:.1,w:6,d:.6},{x:11,z:.1,w:6,d:.6}],
  counter:{x:13.8,z:14,w:3.6,d:1.2},bookseller:{x:15.5,z:16,radius:.55},
  till:{x:14.525,z:14.425,radius:.2835,reach:1.5},
  deskBook:{x:16.7,z:14.55,radius:.35,reach:1.5},
  // Turn the upholstered backs into the two front corners. The outer back
  // corners touch both walls while the seats face into the room.
  chairs:[{x:1.55/Math.SQRT2,z:1.55/Math.SQRT2,radius:1.05,angle:Math.PI/4},
    {x:18-1.55/Math.SQRT2,z:1.55/Math.SQRT2,radius:1.05,angle:-Math.PI/4}]};
// Low reading tables follow the chairs' diagonal facing directions.
BOOKSHOP.readingTables=BOOKSHOP.chairs.map(chair=>({
  x:chair.x+Math.sin(chair.angle)*1.85,z:chair.z+Math.cos(chair.angle)*1.85,radius:.45
}));
export const BOOK_CATEGORIES=['MATH\nSCIENCE','CYBERPUNK','HORROR','MUSIC','SCI-FI'];
export const facingBookshopDoor=(player,buildings)=>buildings.find(b=>b.sign==='MIDNITE BOOKS'&&facesEntrance(player,b,facingDoorway));
export const facingBookshopExit=player=>player.z>0&&facingDoorway(player,BOOKSHOP.door,.85);
export const facingBookshopSeat=player=>facingNearest(player,BOOKSHOP.chairs);
export const facingBookseller=player=>facingAcrossCounter(player,BOOKSHOP.counter,BOOKSHOP.bookseller);
export const BOOKSELLER_TALK=[[
  {ask:'WHAT DO YOU RECOMMEND?',answer:['TRY THE CYBERPUNK SHELF. THE FUTURE LOOKS FAMILIAR.','OR TAKE A CHANCE ON SOMETHING YOU HAVE NEVER HEARD OF.']},
  {ask:'OPEN ALL NIGHT?',answer:['STORIES DO NOT KEEP OFFICE HOURS. NEITHER DO WE.']},
  {ask:'JUST BROWSING.',answer:['TAKE YOUR TIME. THAT IS WHAT BOOKSHOPS ARE FOR.'],ends:true}
]];
export function bookshopReply(player){
  const deskTarget=facingNearest(player,[BOOKSHOP.till,BOOKSHOP.deskBook,BOOKSHOP.bookseller]);
  if(deskTarget===BOOKSHOP.deskBook)return "A BOOK I'VE ALREADY READ.";
  if(deskTarget===BOOKSHOP.till)return "DON'T PLAY WITH THE TILL, PLEASE.";
  if(player.z>BOOKSHOP.counter.z+BOOKSHOP.counter.d&&facingNearest(player,[BOOKSHOP.bookseller]))return BARTENDER_REPLY;
  const targets=[...BOOKSHOP.shelves.map((b,i)=>({x:b.x+b.w/2,z:b.z+b.d/2,radius:.7,reach:1.7,text:BOOK_CATEGORIES[i]})),
    ...BOOKSHOP.tables.map(b=>({x:b.x+b.w/2,z:b.z+b.d/2,radius:1.5,text:'STAFF PICKS: STRANGE CITIES, LATE NIGHTS AND SECOND CHANCES.'})),
    ...BOOKSHOP.windowShelves.map(b=>({x:Math.max(b.x,Math.min(player.x,b.x+b.w)),z:b.z+b.d,radius:.3,reach:1.7,text:"I SHOULDN'T TAKE THESE."}))];
  // Long shelves can be browsed anywhere along their accessible edge.
  BOOKSHOP.shelves.forEach((b,i)=>{targets[i].x=Math.max(b.x,Math.min(player.x,b.x+b.w));targets[i].z=Math.max(b.z,Math.min(player.z,b.z+b.d));});
  const target=facingNearest(player,targets);
  return target?target.text:null;
}
export function moveInBookshop(player,dx,dz){
  const r=.3,obstacles=[...BOOKSHOP.shelves,...BOOKSHOP.windowShelves,...BOOKSHOP.tables,BOOKSHOP.counter];
  const clear=(x,z)=>x>=r&&z>=r&&x<=BOOKSHOP.width-r&&z<=BOOKSHOP.depth-r&&
    !obstacles.some(b=>x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)&&
    [...BOOKSHOP.chairs,...BOOKSHOP.readingTables,BOOKSHOP.bookseller].every(b=>Math.hypot(x-b.x,z-b.z)>=r+b.radius);
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<n;i++){if(clear(player.x+dx/n,player.z))player.x+=dx/n;if(clear(player.x,player.z+dz/n))player.z+=dz/n;}
}
export function drawBookshopInterior({face,quad,box}){
  const panel=(x,y,z,w,h,c,smooth=false)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y:y+h,z},{x,y:y+h,z}],c,null,smooth);
  const glyphs={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['111','100','100','100','111'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],I:['111','010','010','010','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['111','101','101','101','111'],R:['110','101','110','101','101'],S:['111','100','111','001','111'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],P:['110','101','110','100','100'],H:['101','101','111','101','101'],'-':['000','000','111','000','000']};
  const label=(word,x,y,z,scale,reverse=false)=>{for(const [i,c] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyphs[c]?.[row][col]==='1')panel(x+(reverse?-1:1)*(i*4+col)*scale,y+(4-row)*scale,z,(reverse?-1:1)*scale,scale,'#302c26',true);};
  const {width,depth,height,door,counter,chairs}=BOOKSHOP;
  for(let x=0;x<width;x++)for(let z=0;z<depth;z+=3){quad(x,0,z,1,3,(x+z)%3?'#72543e':'#816047');}
  quad(0,height,0,width,depth,'#414337');
  panel(0,0,depth,width,height,'#344b3e');panel(0,0,0,door.x-.85,height,'#344b3e');panel(door.x+.85,0,0,width-door.x-.85,height,'#344b3e');
  for(const x of [0,width])face([{x,y:0,z:0},{x,y:0,z:depth},{x,y:height,z:depth},{x,y:height,z:0}],'#344b3e');
  panel(door.x-.85,0,.01,1.7,3,'#203c32');panel(door.x-.85,3,0,1.7,1.5,'#344b3e');
  box(door.x+.55,1.1,.05,.1,.3,.1,'#ddc38a');
  panel(door.x-.6,3.25,.03,1.2,.4,'#d5c494');label('EXIT',door.x+.45,3.3,.04,.055,true);
  // Street-facing display windows, with gold frames and a dark night beyond.
  for(const b of BOOKSHOP.windowShelves){panel(b.x,.8,.02,b.w,2.1,'#a68b5e');panel(b.x+.12,.95,.04,b.w-.24,1.8,'#152d2c');box(b.x,.7,b.z,b.w,.15,b.d,'#9b754e');}
  const colors=['#93634e','#ae925c','#526e60','#71617d','#a06b75','#557985'];
  // Stock both window ledges with groups of upright books and low stacks.
  for(const {x} of BOOKSHOP.windowShelves){
    for(let j=0;j<16;j++){
      const bx=x+.3+j*.24,h=.42+(j*7%5)*.055,c=colors[j%colors.length];
      box(bx,.85,.22,.19,h,.38,c);
      box(bx+.025,.94,.605,.14,.025,.012,'#d9c99e');
    }
    for(let j=0;j<3;j++){
      box(x+4.55,.85+j*.095,.2,.85,.09,.42,colors[(j+3)%colors.length]);
      box(x+4.59,.87+j*.095,.625,.77,.045,.012,'#dccca5');
    }
  }
  for(const [i,b] of BOOKSHOP.shelves.entries()){
    const long=b.d>b.w,len=long?b.d:b.w;
    // Open shelves expose the spines from both sides of each browsing aisle.
    if(long){
      box(b.x+b.w/2-.06,0,b.z,.12,3.2,b.d,'#3d3029');
      for(const z of [b.z,b.z+b.d-.1])box(b.x,0,z,b.w,3.2,.1,'#79583b');
    }else{
      box(b.x,0,b.z+b.d-.1,b.w,3.2,.1,'#3d3029');
      for(const x of [b.x,b.x+b.w-.1])box(x,0,b.z,.1,3.2,b.d,'#79583b');
    }
    for(const y of [.25,1,1.75,2.5]){
      box(b.x,y,b.z,b.w,.1,b.d,'#ac8457');
      for(let j=0;j<Math.floor((len-.2)/.22);j++){
        const h=.42+((j*7+i)%5)*.045,c=colors[(j+i)%colors.length];
        const x=long?b.x+.07:b.x+.1+j*.22,z=long?b.z+.1+j*.22:b.z+.07;
        box(x,y+.1,z,long?b.w-.14:.17,h,long?.17:b.d-.14,c);
      }
    }
    box(b.x,3.2,b.z,b.w,.14,b.d,'#ac8457');
    // Cream category plaques above each bookcase.
    const lines=BOOK_CATEGORIES[i].split('\n'),plaqueHeight=lines.length*.15;
    box(b.x,3.13-plaqueHeight,b.z-.015,b.w,plaqueHeight,.03,'#d9c99e');
    const scale=Math.min(.025,(b.w-.1)/(Math.max(...lines.map(line=>line.length))*4));
    lines.forEach((line,row)=>label(line,b.x+.05,3-row*.15,b.z-.02,scale));
  }
  for(const [i,b] of BOOKSHOP.tables.entries()){
    for(const x of [b.x+.15,b.x+b.w-.3])for(const z of [b.z+.15,b.z+b.d-.3])box(x,0,z,.15,.85,.15,'#49372d');
    box(b.x,.85,b.z,b.w,.15,b.d,'#a57b51');
    for(let j=0;j<6;j++){const x=b.x+.2+(j%3)*.9,z=b.z+.15+Math.floor(j/3)*.8;box(x,1,z,.6,.08,.55,colors[(j+i)%6]);box(x+.04,1.08,z+.04,.52,.015,.47,'#dccca5');}
  }
  box(counter.x,0,counter.z,counter.w,1.15,counter.d,'#614733');box(counter.x-.08,1.15,counter.z-.08,counter.w+.16,.13,counter.d+.16,'#ad8756');
  const till=BOOKSHOP.till,tx=till.x-.45,tz=till.z-.35;
  const tillScale=.81;
  const tillX=x=>till.x+(x-till.x)*tillScale,tillY=y=>1.28+(y-1.28)*tillScale,tillZ=z=>till.z+(z-till.z)*tillScale;
  const tillBox=(x,y,z,w,h,d,color)=>box(tillX(x),tillY(y),tillZ(z),w*tillScale,h*tillScale,d*tillScale,color);
  const tillPanel=(x,y,z,w,h,color)=>panel(tillX(x),tillY(y),tillZ(z),w*tillScale,h*tillScale,color);
  // A broad cash drawer, raised display, keypad and receipt roll distinguish
  // the register from the books stacked beside it.
  tillBox(tx,1.28,tz,.9,.18,.7,'#bcc0b4');
  tillBox(tx+.05,1.3,tz-.015,.8,.105,.025,'#424a45');
  tillBox(tx+.37,1.33,tz-.035,.16,.035,.025,'#e0d8b5');
  tillBox(tx+.05,1.46,tz+.07,.8,.12,.55,'#78877b');
  tillBox(tx+.08,1.58,tz+.08,.35,.16,.4,'#a9b2a0');
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)tillBox(tx+.11+col*.095,1.74,tz+.1+row*.085,.065,.025,.055,(row===3&&col===2)?'#b07b53':'#e6dfc9');
  tillBox(tx+.07,1.58,tz+.52,.56,.4,.12,'#424e48');
  for(const z of [tz+.51,tz+.645]){
    tillPanel(tx+.12,1.65,z,.46,.23,'#132e29');
    // Three green seven-segment zeroes, visible from either side.
    for(let digit=0;digit<3;digit++){
      const x=tx+.17+digit*.13;
      for(const y of [1.69,1.8])tillPanel(x,y,z-.002,.075,.018,'#9ee5a0');
      for(const xx of [x,x+.058])tillPanel(xx,1.69,z-.002,.017,.128,'#9ee5a0');
    }
  }
  tillBox(tx+.55,1.58,tz+.15,.23,.16,.28,'#d2cbb8');
  tillBox(tx+.59,1.74,tz+.2,.15,.16,.025,'#f4ead1');
  box(BOOKSHOP.deskBook.x-.325,1.28,BOOKSHOP.deskBook.z-.225,.65,.15,.45,'#8e6178');
  drawStaff({face,box},BOOKSHOP.bookseller,0,counter);
  for(const chair of chairs){
    const transform=(x,y,z)=>({x:chair.x+x*Math.cos(chair.angle)+z*Math.sin(chair.angle),y,z:chair.z-x*Math.sin(chair.angle)+z*Math.cos(chair.angle)});
    const upholsteredBox=(x,y,z,w,h,d,color)=>{
      const a=transform(x,y,z),b=transform(x+w,y,z),c=transform(x+w,y,z+d),e=transform(x,y,z+d);
      const top=p=>({...p,y:y+h});
      face([a,b,top(b),top(a)],color);face([b,c,top(c),top(b)],color);
      face([c,e,top(e),top(c)],color);face([e,a,top(a),top(e)],color);
      face([top(a),top(b),top(c),top(e)],color);
    };
    // Deep padded seat, full-height cushioned back and broad fabric arms.
    upholsteredBox(-.8,.12,-.75,1.6,.35,1.5,'#674e48');
    upholsteredBox(-.56,.47,-.4,1.12,.2,1.05,'#b18a76');
    upholsteredBox(-.8,.47,-.75,1.6,.95,.3,'#98735f');
    upholsteredBox(-.56,.7,-.435,1.12,.58,.12,'#b18a76');
    for(const x of [-.8,.56])upholsteredBox(x,.47,-.45,.24,.4,1.2,'#98735f');
  }
  for(const table of BOOKSHOP.readingTables){
    drawCylinder(face,table.x,0,table.z,.27,.08,'#49372d');
    drawCylinder(face,table.x,.08,table.z,.07,.51,'#614733');
    drawCylinder(face,table.x,.59,table.z,table.radius,.09,'#79583b','#ad8756');
  }
  // Warm pendant lights above the displays and reading nook.
  for(const [x,z] of [[8.5,6.9],[8.5,11.9],...chairs.map(c=>[c.x,c.z])]){box(x-.035,3.55,z-.035,.07,.95,.07,'#3a322c');box(x-.45,3.4,z-.35,.9,.18,.7,'#c8a56b');quad(x-.35,3.39,z-.25,.7,.5,'#ffe1a0');}
}
