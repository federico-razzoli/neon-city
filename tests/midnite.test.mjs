import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOKSHOP,facingBookshopDoor,facingBookshopExit,moveInBookshop,drawBookshopInterior,bookshopReply,facingBookseller} from '../neon-city/midnite-interior.js';
import {entranceWall} from '../neon-city/entrances.js';

test('bookshop doors work on every street orientation and exit from inside',()=>{
  for(let entranceSide=0;entranceSide<4;entranceSide++){
    const b={x:14,z:14,w:18,d:18,sign:'MIDNITE BOOKS',entranceSide},wall=entranceWall(b);
    const p={x:wall.x+wall.nx*2,z:wall.z+wall.nz*2,angle:Math.atan2(-wall.nx,-wall.nz)};
    assert.equal(facingBookshopDoor(p,[b]),b);
    assert.equal(facingBookshopDoor({...p,angle:p.angle+Math.PI},[b]),undefined);
  }
  assert.ok(facingBookshopExit({...BOOKSHOP.spawn,angle:Math.PI}));
  assert.ok(!facingBookshopExit(BOOKSHOP.spawn));
});
test('bookshop furniture blocks movement and entrance aisle reaches the back',()=>{
  const p={...BOOKSHOP.spawn};moveInBookshop(p,1.8,0);moveInBookshop(p,0,13);assert.ok(p.z>14);
  moveInBookshop(p,30,0);assert.ok(p.x<BOOKSHOP.counter.x);
  const shelf={x:3,z:8};moveInBookshop(shelf,3,0);assert.ok(shelf.x<=3.7);
  moveInBookshop(p,0,-40);assert.ok(p.z>=.3);
  assert.equal(bookshopReply({x:3.3,z:8,angle:Math.PI/2}),'MUSIC');
  assert.ok(facingBookseller({x:15.5,z:13,angle:0}));
});
test('bookshop renders finite geometry',()=>{
  let count=0;
  const check=(...args)=>{count++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));};
  drawBookshopInterior({box:check,quad:check,face:(points)=>{count++;for(const p of points)check(p.x,p.y,p.z);}});
  assert.ok(count>500);
});

test('both window shelves block movement while the entrance stays clear',()=>{
  for(const shelf of BOOKSHOP.windowShelves){
    const player={x:shelf.x+shelf.w/2,z:2};
    moveInBookshop(player,0,-4);
    assert.ok(player.z>=shelf.z+shelf.d+.3-1e-9);
  }
  const player={...BOOKSHOP.spawn};
  moveInBookshop(player,0,-4);
  assert.ok(player.z<.5);
});

test('window shelf books reply when approached along either display',()=>{
  for(const shelf of BOOKSHOP.windowShelves)for(const offset of [.5,3,5.5]){
    const player={x:shelf.x+offset,z:1.5,angle:Math.PI};
    assert.equal(bookshopReply(player),"I SHOULDN'T TAKE THESE.");
    assert.notEqual(bookshopReply({...player,angle:0}),"I SHOULDN'T TAKE THESE.");
  }
});

test('bookseller asks clients behind the desk to return to the other side',()=>{
  const player={x:15.5,z:17,angle:Math.PI};
  assert.equal(bookshopReply(player),'CLIENTS ON THE OTHER SIDE, PLEASE.');
  assert.ok(!facingBookseller(player));
  assert.notEqual(bookshopReply({...player,angle:0}),'CLIENTS ON THE OTHER SIDE, PLEASE.');
  const customer={x:15.5,z:13,angle:0};
  assert.ok(facingBookseller(customer));
  assert.equal(bookshopReply(customer),null,'aiming at the bookseller opens his conversation');
  assert.notEqual(bookshopReply(customer),'CLIENTS ON THE OTHER SIDE, PLEASE.');
});

test('the till responds from both sides of the desk',()=>{
  const {till}=BOOKSHOP;
  const reply="DON'T PLAY WITH THE TILL, PLEASE.";
  assert.equal(bookshopReply({x:till.x,z:13,angle:0}),reply);
  assert.equal(bookshopReply({x:till.x,z:15.8,angle:Math.PI}),reply);
  assert.notEqual(bookshopReply({x:till.x,z:13,angle:Math.PI}),reply);
  assert.notEqual(bookshopReply({x:till.x,z:10,angle:0}),reply);
});

import {BOOKSHOP_BOOKS,BOOK_TITLES,BOOKSELLER_TALK,BOOKSELLER_GIFTS,BOOK_READING_INVITATION,BOOK_READING_REPLY,BOOK_EXIT_REPLY,bookshopWalkable} from '../neon-city/midnite-interior.js';
import {BookshopLife,bookshopRoute} from '../neon-city/midnite-life.js';
import {Inventory} from '../neon-city/inventory.js';
import {StaffTalk} from '../neon-city/pub-interior.js';

const atBook=book=>{
  const table=BOOKSHOP.tables[book.tableIndex],back=book.z>table.z+table.d/2;
  return {x:book.x,z:back?table.z+table.d+.8:table.z-.8,angle:back?Math.PI:0};
};
test('all twelve titled display books can be examined and taken',()=>{
  assert.equal(BOOKSHOP_BOOKS.length,12);
  assert.deepEqual(BOOK_TITLES.slice(9),["NO, I'M NOT A HUMAN",'NEWSPEAK DICTIONARY','V FOR VINTAGE']);
  assert.equal(new BookshopLife().books.length,12);
  assert.deepEqual(BOOK_TITLES.slice(6,9),['MAKE IT SO, NUMBER ONE!','LOOK OUTSIDE','HOW TO EXIT VIM']);
  assert.deepEqual(BOOK_TITLES.slice(3,6),['REGULAR EXPRESSIONS','AUTOBIOGRAPHY OF A MAN WHO DIED ALL OF A SUDD','THE ULTIMATE GUIDE TO TIME PARADOXES']);
  for(let i=0;i<12;i++){
    const life=new BookshopLife(),inventory=new Inventory(),book=life.books[i],player=atBook(book);
    assert.equal(life.interact(player,inventory),`${BOOK_TITLES[i]}... should I read this?`);
    assert.equal(inventory.items.length,0);
    assert.equal(life.interact(player,inventory),'TAKEN');
    assert.equal(inventory.current,book);
    assert.equal(life.onDisplay(book),false);
    assert.equal(life.carried(inventory),book);
    assert.equal(life.interact({...player,angle:player.angle+Math.PI}),null);
  }
});

test('giving any of the twelve books to the bookseller invites reading and retains the loan',()=>{
  for(const book of new BookshopLife().books){
    const inventory=new Inventory();inventory.take(book);
    const talk=new StaffTalk(BOOKSELLER_TALK,{},inventory,BOOKSELLER_GIFTS);
    talk.confirm(talk.script.findIndex(option=>option.action==='give'));
    talk.confirm(0);
    assert.equal(talk.line,BOOK_READING_INVITATION);
    assert.equal(talk.over,false,'keep the invitation visible until dismissed');
    talk.confirm();
    assert.equal(talk.over,true,'dismissal ends the conversation');
    assert.equal(inventory.current,book,'the customer keeps the book to read');
  }
  assert.equal(BOOK_EXIT_REPLY,"I CAN'T LEAVE WITH A BOOK I DIDN'T BUY.");
});

test('reading either chair leaves the book there and the seller returns it after five seconds',()=>{
  for(const seat of BOOKSHOP.chairs)for(let i=0;i<12;i++){
    const life=new BookshopLife(),inventory=new Inventory(),book=life.books[i];
    life.interact(atBook(book),inventory);life.interact(atBook(book),inventory);
    assert.equal(life.sit(seat,inventory),BOOK_READING_REPLY);
    assert.equal(life.carried(inventory),book);
    life.stand(seat,inventory);
    assert.equal(inventory.items.length,0);
    assert.equal(book.state,'reading');
    assert.equal(book.seat,BOOKSHOP.chairs.indexOf(seat));
    life.update(4.99,null);
    assert.equal(life.atDesk,true);assert.equal(book.state,'reading');
    life.update(.02,null);assert.equal(life.state,'collect');
    let collected=false,replaced=false;
    for(let frame=0;frame<2500&&!life.atDesk;frame++){
      life.update(.04,null);
      assert.ok(bookshopWalkable(life.seller.x,life.seller.z,.35,null),'seller stays clear of furniture');
      collected||=book.state==='returning';replaced||=book.state==='display';
    }
    assert.ok(collected&&replaced&&life.atDesk,'collects, restocks, and returns to the desk');
    assert.equal(life.onDisplay(book),true);
    assert.equal(life.carried(inventory),undefined);
    assert.equal(life.interact(atBook(book),inventory),`${book.name}... should I read this?`);
    assert.deepEqual(life.seller,BOOKSHOP.bookseller);
  }
});

test('the bookseller waits for a player blocking the route and resumes when they move',()=>{
  const life=new BookshopLife(),inventory=new Inventory(),book=life.books[0];
  life.interact(atBook(book),inventory);life.interact(atBook(book),inventory);life.stand(BOOKSHOP.chairs[0],inventory);
  life.update(5,null);
  const before={...life.seller},target=life.route[0],gap=Math.hypot(target.x-before.x,target.z-before.z);
  const blocker={x:before.x+(target.x-before.x)/gap*.86,z:before.z+(target.z-before.z)/gap*.86};
  life.update(.1,blocker);
  assert.deepEqual(life.seller,before);
  life.update(.1,{x:9,z:1});assert.notDeepEqual(life.seller,before);
});

test('display and reading books render at their current locations without duplicating a loan',()=>{
  const life=new BookshopLife(),inventory=new Inventory(),book=life.books[0];
  const covers=[];
  const draw=()=>{covers.length=0;drawBookshopInterior({face(){},quad(){},box:(x,y,z,w,h,d)=>{if(w===.6&&h===.08&&d===.55)covers.push({x,y,z});}},life);return covers.length;};
  assert.equal(draw(),12);
  life.interact(atBook(book),inventory);life.interact(atBook(book),inventory);
  assert.equal(draw(),11);
  life.stand(BOOKSHOP.chairs[1],inventory);
  assert.equal(draw(),12);
  assert.ok(covers.some(cover=>cover.y===.68));
});

test('game seat and door controls enforce reading loans and leave the book when standing',async()=>{
  const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
  const interior=await import('../neon-city/midnite-interior.js');
  const source=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const door=source.slice(source.indexOf('function useDoor(){'),source.indexOf('// Pub chairs,'));
  const seat=source.slice(source.indexOf('function useSeat(){'),source.indexOf('const hotelGuestScene='));
  const inventory=new Inventory(),life=new BookshopLife(),book=life.books[0],message={textContent:''};
  life.interact(atBook(book),inventory);life.interact(atBook(book),inventory);
  const sandbox={...interior,inventory,bookshopLife:life,player:{...BOOKSHOP.spawn,angle:Math.PI},
    insideBookshop:true,insidePub:false,insideHotel:false,insideArcade:false,insideLavatory:false,insideCubicle:null,hotelStairs:null,
    indoors:()=>true,streetPosition:{x:100,z:100,angle:1},playerSeat:null,SEATED_EYE:1.5,
    keys:new Set(),shiftKeys:new Set(),seatedTexturePrewarmer:{cancel(){}},notice:0,noticeText:'',
    document:{querySelector:()=>message},lobbyMusic:{choose(){}},pubMusic:{choose(){}},arcadeAmbience:{mute(){}},parkBirds:{mute(){}}};
  runInNewContext(door+seat,sandbox);
  assert.equal(sandbox.useDoor(),true);
  assert.equal(sandbox.insideBookshop,true);
  assert.equal(message.textContent,BOOK_EXIT_REPLY);
  const chair=BOOKSHOP.chairs[0];
  Object.assign(sandbox.player,{x:chair.x,z:chair.z+1.8,angle:Math.PI});
  assert.equal(sandbox.useSeat(),true);
  assert.equal(sandbox.noticeText,BOOK_READING_REPLY);
  assert.equal(sandbox.playerSeat.bookshopChair,chair);
  assert.equal(sandbox.useSeat(),true);
  assert.equal(sandbox.playerSeat,null);
  assert.equal(book.state,'reading');assert.equal(inventory.items.length,0);
  Object.assign(sandbox.player,{...BOOKSHOP.spawn,angle:Math.PI});
  assert.equal(sandbox.useDoor(),true);assert.equal(sandbox.insideBookshop,false);
  assert.equal(sandbox.player.x,100);
});

import {BACKPACK} from '../neon-city/backpack.js';
import {BACKPACK_WARNING} from '../neon-city/midnite-interior.js';
const atBackpack=()=>({x:BOOKSHOP.backpack.x,z:BOOKSHOP.backpack.z-1.15,angle:0});

test('the bookseller protects his backpack at the desk and when returning nearby',()=>{
  for(const returning of [false,true]){
    const life=new BookshopLife(),inventory=new Inventory();
    if(returning){life.state='home';life.seller.x-=1.9;}
    assert.equal(life.interact(atBackpack(),inventory),'PLEASE SIR, LEAVE MY BACKPACK ALONE.');
    assert.equal(life.backpackTaken,false);assert.equal(inventory.items.length,0);
  }
  const life=new BookshopLife();
  assert.equal(life.interact({...atBackpack(),angle:Math.PI},new Inventory()),null);
  assert.equal(life.interact({x:BOOKSHOP.backpack.x,z:13,angle:0},new Inventory()),null,'cannot reach through the desk');
});

test('the backpack can be taken while the seller is away, including when still far from the desk on return',()=>{
  for(const state of ['collect','replace','home']){
    const life=new BookshopLife(),inventory=new Inventory();
    life.state=state;life.seller.x-=2.1;
    assert.equal(life.interact(atBackpack(),inventory),'TAKEN');
    assert.equal(inventory.current,BACKPACK);assert.equal(life.backpackTaken,true);
    assert.equal(life.interact(atBackpack(),inventory),null,'cannot take the same backpack again');
  }
});

test('book collection creates an opportunity to take the backpack and it stays taken after the seller returns',()=>{
  const life=new BookshopLife(),inventory=new Inventory(),book=life.books[0];
  life.interact(atBook(book),inventory);life.interact(atBook(book),inventory);life.stand(BOOKSHOP.chairs[0],inventory);
  for(let frame=0;frame<1000&&life.guardingBackpack;frame++)life.update(.04,null);
  assert.equal(life.guardingBackpack,false);
  assert.equal(life.interact(atBackpack(),inventory),'TAKEN');
  for(let frame=0;frame<2500&&!life.atDesk;frame++)life.update(.04,null);
  assert.equal(life.atDesk,true);assert.equal(life.backpackTaken,true);
  assert.deepEqual(inventory.items,[BACKPACK]);
  assert.equal(life.interact(atBackpack(),inventory),null);
});

test('the floor backpack disappears only after a successful pickup',()=>{
  const life=new BookshopLife(),inventory=new Inventory();
  const body=()=>{
    const parts=[];
    drawBookshopInterior({face:(points,color)=>{if(color==='#44605c')parts.push(...points);},quad(){},box(){}},life);
    if(!parts.length)return [];
    const x=Math.min(...parts.map(p=>p.x)),y=Math.min(...parts.map(p=>p.y)),z=Math.min(...parts.map(p=>p.z));
    return [{x,y,z,w:Math.max(...parts.map(p=>p.x))-x,d:Math.max(...parts.map(p=>p.z))-z}];
  };
  const [bag]=body();assert.ok(bag);
  assert.equal(bag.y,0);assert.ok(bag.x+bag.w<=BOOKSHOP.width&&bag.z+bag.d<=BOOKSHOP.depth);
  assert.ok(bag.z>BOOKSHOP.counter.z+BOOKSHOP.counter.d);
  assert.equal(life.interact(atBackpack(),inventory),BACKPACK_WARNING);assert.equal(body().length,1);
  life.state='collect';life.seller.x-=3;inventory.take(BACKPACK);
  assert.equal(life.interact(atBackpack(),inventory),'I ALREADY HAVE ONE.');assert.equal(body().length,1);
  inventory.items.length=0;
  assert.equal(life.interact(atBackpack(),inventory),'TAKEN');assert.equal(body().length,0);
});


test('bookseller ticket follow-up remembers refusal and returns to the main menu',()=>{
  const record={},talk=new StaffTalk(BOOKSELLER_TALK,record);
  const enter=t=>t.confirm(t.script.findIndex(option=>option.ask==='DO YOU HAVE ANY SPARE TICKET FOR THE RADIOCOWS SHOW?'));
  assert.ok(!talk.script.some(option=>option.ask==='DO YOU HAVE ANY SPARE TICKET FOR THE RADIOCOWS SHOW?'));
  record.RADIOACTIVE_COWS_TICKET_MENTIONED=true;
  enter(talk);
  assert.equal(talk.line,'DO YOU MEAN THE RADIOACTIVE COWS?');
  talk.confirm();assert.equal(talk.line,'I WAS LUVKY ENOUGH TO BUY THE LAST TICKET!');
  talk.confirm();assert.equal(talk.block,1);
  assert.deepEqual(talk.script.map(option=>option.ask),['WOULD YOU SELL IT TO ME?','NEVER MIND.']);
  talk.confirm(0);assert.equal(talk.line,"I WOULDN'T SELL IT FOR A MILLION COWS. SORRY PAL.");
  talk.confirm();assert.deepEqual(talk.script.map(option=>option.ask),['I REALLY NEED THAT TICKET...','NEVER MIND.']);
  talk.confirm(0);assert.equal(talk.line,'I NEED IT, TOO. SORRY PAL.');talk.confirm();
  talk.confirm(1);assert.equal(talk.block,0);assert.equal(talk.line,null);assert.equal(talk.over,false);
  const reopened=new StaffTalk(BOOKSELLER_TALK,record);
  enter(reopened);reopened.confirm();reopened.confirm();
  assert.equal(reopened.script[0].ask,'I REALLY NEED THAT TICKET...');
});


test('taking a book requires consecutive interactions with that same book',()=>{
  const life=new BookshopLife(),inventory=new Inventory(),[first,second]=life.books;
  const examine=book=>`${book.name}... should I read this?`;
  assert.equal(life.interact(atBook(first),inventory),examine(first));
  assert.equal(life.interact(atBook(second),inventory),examine(second));
  assert.equal(life.interact(atBook(first),inventory),examine(first));
  assert.equal(life.interact({...BOOKSHOP.spawn,angle:Math.PI},inventory),null);
  assert.equal(life.interact(atBook(first),inventory),examine(first));
  const backpack=BOOKSHOP.backpack;
  assert.equal(life.interact({x:backpack.x,z:backpack.z-1,angle:0},inventory),BACKPACK_WARNING);
  assert.equal(life.interact(atBook(first),inventory),examine(first));
  life.resetBookInteraction(); // Seats, doors and dropped-item pickups interrupt the sequence.
  assert.equal(life.interact(atBook(first),inventory),examine(first));
  assert.equal(inventory.items.length,0);
  assert.equal(life.interact(atBook(first),inventory),'TAKEN');
  assert.equal(inventory.current,first);
});


import {BOOKSHOP_VISITORS} from '../neon-city/midnite-life.js';
const finishBookshopEvent=life=>{
  for(let frame=0;frame<3000&&life.eventActive;frame++)life.update(.05,null);
  assert.equal(life.eventActive,false,'the visitor and any shelf return finish');
};
test('bookshop events start 5–10 seconds after entry and after the previous event ends',()=>{
  for(const random of [()=>0,()=>.999999]){
    const life=new BookshopLife(random);life.enter();
    const wait=life.eventWait;assert.ok(wait>=5&&wait<=10);
    life.update(wait-.01,null);assert.equal(life.people.length,0);
    life.update(.02,null);assert.equal(life.eventActive,true);
    const person=life.people[0],blocker={x:person.x,z:person.z+.3};
    const position={x:person.x,z:person.z};life.update(20,blocker);
    assert.deepEqual({x:person.x,z:person.z},position,'a player in the doorway blocks entry');
    assert.equal(life.eventActive,true,'the timer waits for movement to finish');
    finishBookshopEvent(life);
    assert.ok(life.eventWait>=5&&life.eventWait<=10);
    const current=life.people.map(p=>p.state);
    life.update(life.eventWait-.01,null);assert.deepEqual(life.people.map(p=>p.state),current);
    life.enter();assert.ok(life.eventWait>=5&&life.eventWait<=10,'re-entry restarts the delay');
  }
});
test('both girls browse their category, read a random book, and leave it for a shelf return',()=>{
  for(const definition of BOOKSHOP_VISITORS.filter(d=>d.titles))for(const choice of [0,.4,.999999]){
    const life=new BookshopLife(()=>choice);
    assert.ok(life.startVisitorEvent(definition));finishBookshopEvent(life);
    const visitor=life.people[0];assert.equal(visitor.state,'browsing');assert.equal(visitor.shelf,definition.shelf);
    assert.ok(life.startVisitorEvent(definition));
    const book=visitor.book;assert.equal(book.name,definition.titles[Math.floor(choice*3)]);
    const seat=visitor.seat;assert.equal(life.occupied(seat),true,'reserve the table before walking to it');
    finishBookshopEvent(life);assert.equal(visitor.state,'reading');
    assert.ok(life.startVisitorEvent(definition));
    assert.equal(life.visitorBooks[0],book);assert.equal(life.occupied(seat),true,'a left book still occupies its table');
    let collected=false;
    for(let frame=0;frame<3000&&life.eventActive;frame++){
      life.update(.05,null);collected||=book.state==='returning';
    }
    assert.equal(life.eventActive,false);assert.ok(collected);
    assert.equal(book.state,'shelved');assert.equal(book.shelf,definition.shelf);
    assert.equal(life.people.length,0);assert.equal(life.visitorBooks.length,0);assert.equal(life.atDesk,true);
  }
});
test('visitors leave a reading table free and account for the player and abandoned books',()=>{
  const life=new BookshopLife(()=>.2),[girl,punk]=BOOKSHOP_VISITORS;
  for(const def of [girl,punk]){assert.ok(life.startVisitorEvent(def));finishBookshopEvent(life);}
  life.update(0,null,BOOKSHOP.chairs[0]);
  assert.equal(life.startVisitorEvent(girl),false,'do not use the last table while the player sits');
  life.update(0,null);
  assert.ok(life.startVisitorEvent(girl));
  assert.equal(life.startVisitorEvent(punk),false,'a visitor heading to a table already reserves it');
  finishBookshopEvent(life);
  assert.equal(life.startVisitorEvent(punk),false,'a second visitor cannot use the last table');
  assert.ok(life.startVisitorEvent(girl));
  assert.equal(life.startVisitorEvent(punk),false,'a left book keeps its table reserved');
  finishBookshopEvent(life);
  assert.ok(life.startVisitorEvent(punk));finishBookshopEvent(life);
});
test('the smart-dressed woman changes shelves or leaves and the seller avoids occupied shelf spots',()=>{
  let value=.7;const life=new BookshopLife(()=>value),woman=BOOKSHOP_VISITORS[2];
  assert.ok(life.startVisitorEvent(woman));finishBookshopEvent(life);
  const visitor=life.people[0],shelf=visitor.shelf;
  assert.ok(life.startVisitorEvent(woman));finishBookshopEvent(life);
  assert.notEqual(visitor.shelf,shelf);
  value=.1;assert.ok(life.startVisitorEvent(woman));finishBookshopEvent(life);assert.equal(life.people.length,0);
  // A browsing visitor must not prevent the seller reaching the same shelf.
  const girl=BOOKSHOP_VISITORS[0];
  assert.ok(life.startVisitorEvent(girl));finishBookshopEvent(life);
  assert.ok(life.startVisitorEvent(girl));finishBookshopEvent(life);
  const reader=life.people[0];
  life.people.push({...woman,x:2,z:8,shelf:0,state:'browsing',radius:.3,route:[]});
  assert.ok(life.startVisitorEvent(girl));finishBookshopEvent(life);
  assert.equal(life.visitorBooks.length,0);assert.equal(reader.book,null);
});


test('the bookseller finishes queued player and visitor books before returning to the desk',()=>{
  const life=new BookshopLife(),first=life.books[0];
  Object.assign(first,{state:'reading',seat:0,wait:0});
  const second={name:'HISTORY OF NUMBERS',state:'reading',seat:1,wait:0,shelf:0};
  life.visitorBooks.push(second);
  let collectedSecond=false;
  for(let frame=0;frame<3000;frame++){
    assert.ok(frame<3000,'all queued work finishes');
    life.update(.05,null);
    collectedSecond||=second.state==='returning';
    if(first.state==='reading'||second.state==='reading')assert.notEqual(life.state,'home','no desk trip between jobs');
    if(life.atDesk)break;
  }
  assert.equal(first.state,'display');assert.equal(second.state,'shelved');assert.ok(collectedSecond);
  assert.equal(life.atDesk,true);assert.deepEqual(life.seller,BOOKSHOP.bookseller);
});
test('new work interrupts the return to the desk, including a book still in its reading delay',()=>{
  const life=new BookshopLife(),[first,second]=life.books;
  Object.assign(first,{state:'reading',seat:0,wait:0});
  for(let frame=0;frame<2000&&life.state!=='home';frame++)life.update(.05,null);
  assert.equal(life.state,'home');
  Object.assign(second,{state:'reading',seat:1,wait:1});
  const position={...life.seller};life.update(.05,null);
  assert.equal(life.state,'waiting');assert.deepEqual(life.seller,position,'wait for the next job instead of returning to the desk');
  life.update(1,null);assert.equal(life.state,'collect');assert.equal(life.returning,second);
  for(let frame=0;frame<3000&&!life.atDesk;frame++)life.update(.05,null);
  assert.equal(second.state,'display');assert.equal(life.atDesk,true);
});


test('bookshop visitors show their backs when viewed behind their walking, browsing or reading direction',async()=>{
  const {bookshopVisitorShowsBack}=await import('../neon-city/midnite-life.js');
  const check=person=>{
    const dx=Math.sin(person.angle),dz=Math.cos(person.angle);
    assert.equal(bookshopVisitorShowsBack(person,{x:person.x+dx*3,z:person.z+dz*3}),false);
    assert.equal(bookshopVisitorShowsBack(person,{x:person.x-dx*3,z:person.z-dz*3}),true);
  };
  for(const definition of BOOKSHOP_VISITORS){
    const life=new BookshopLife(()=>.2);
    life.startVisitorEvent(definition);
    life.update(.1,null);check(life.people[0]);
    finishBookshopEvent(life);check(life.people[0]);
    if(definition.titles){
      life.startVisitorEvent(definition);finishBookshopEvent(life);check(life.people[0]);
      life.startVisitorEvent(definition);life.update(.1,null);check(life.people[0]);
    }
  }
  for(const chair of BOOKSHOP.chairs)check(chair);
});


test('the bookseller faces his walking direction and faces the counter again at the desk',()=>{
  const life=new BookshopLife(),book=life.books[0];
  Object.assign(book,{state:'reading',seat:0,wait:0});
  let moved=false;
  for(let frame=0;frame<3000;frame++){
    const before={...life.seller};life.update(.02,null);
    const dx=life.seller.x-before.x,dz=life.seller.z-before.z;
    if(Math.hypot(dx,dz)>1e-8&&!life.atDesk){
      assert.ok(dx*Math.sin(life.sellerAngle)+dz*Math.cos(life.sellerAngle)>0);moved=true;
    }
    if(life.atDesk)break;
  }
  assert.ok(moved);assert.equal(life.atDesk,true);assert.equal(life.sellerAngle,Math.PI);
});
test('bookseller model turns his face toward each walking direction',async()=>{
  const {drawBookseller}=await import('../neon-city/midnite-interior.js');
  const seller={x:8,z:9};
  for(const angle of [0,Math.PI/2,-Math.PI/2,Math.PI/4]){
    const nose=[];
    drawBookseller({box(){},face(points,color){
      if(color==='#94624e'&&points.every(p=>p.y>=1.57*4/3-1e-8&&p.y<=1.66*4/3+1e-8))nose.push(...points);
    }},seller,angle);
    assert.ok(nose.length>0);
    const x=nose.reduce((sum,p)=>sum+p.x,0)/nose.length-seller.x;
    const z=nose.reduce((sum,p)=>sum+p.z,0)/nose.length-seller.z;
    assert.ok(x*Math.sin(angle)+z*Math.cos(angle)>.2,'face points in the travel direction');
  }
});


test('the gay visitor browses SCI-FI then leaves on his next event',()=>{
  const definition=BOOKSHOP_VISITORS.find(visitor=>visitor.id==='gay-man');
  for(const value of [.1,.9]){
    const life=new BookshopLife(()=>value);
    assert.ok(life.startVisitorEvent(definition));finishBookshopEvent(life);
    const visitor=life.people[0];
    assert.equal(visitor.type,6);assert.equal(visitor.state,'browsing');
    assert.equal(visitor.shelf,4);assert.equal(visitor.book,undefined);
    assert.ok(life.startVisitorEvent(definition));assert.equal(visitor.state,'leaving');
    finishBookshopEvent(life);assert.equal(life.people.length,0);
    assert.equal(life.freeReadingSeats().length,2);
  }
});
