/* SPDX-License-Identifier: AGPL-3.0-only */
import {BOOKSHOP,BOOKSHOP_BOOKS,BOOKSELLER_GIFTS,BOOK_READING_REPLY,BACKPACK_WARNING,bookshopWalkable} from './midnite-interior.js';
import {BACKPACK} from './backpack.js';
import {TICKET} from './inventory.js';
import {facingNearest,pubPersonBlocks} from './pub-interior.js';

// Staff use the same furniture footprint as the player, with a little extra
// clearance. Routes are planned only when a collection or delivery starts.
export function bookshopRoute(start,end,people=[]){
  if(people.some(p=>Math.hypot(end.x-p.x,end.z-p.z)<.85))return null;
  const segment=(a,b)=>{
    if(!bookshopWalkable(a.x,a.z,.35,null)||!bookshopWalkable(b.x,b.z,.35,null))return false;
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    for(const box of [...BOOKSHOP.shelves,...BOOKSHOP.windowShelves,...BOOKSHOP.tables,BOOKSHOP.counter]){
      let low=0,high=1;
      for(const [at,delta,min,max] of [[a.x,dx,box.x-.35,box.x+box.w+.35],[a.z,dz,box.z-.35,box.z+box.d+.35]]){
        if(Math.abs(delta)<1e-10){if(at<=min||at>=max){high=-1;break;}}
        else{const t1=(min-at)/delta,t2=(max-at)/delta;low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));}
      }
      if(low<high)return false;
    }
    for(const circle of [...BOOKSHOP.chairs,...BOOKSHOP.readingTables,...people.map(p=>({...p,radius:Math.max(.5,p.radius??.3)}))]){
      const t=length?Math.max(0,Math.min(1,((circle.x-a.x)*dx+(circle.z-a.z)*dz)/length)):0;
      if(Math.hypot(a.x+t*dx-circle.x,a.z+t*dz-circle.z)<.35+circle.radius)return false;
    }
    return true;
  };
  if(segment(start,end))return [{...end}];
  const first={x:Math.round(start.x*4)/4,z:Math.round(start.z*4)/4},key=p=>`${p.x},${p.z}`;
  if(!segment(start,first))return null;
  const queue=[first],previous=new Map([[key(first),null]]);let goal;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(Math.hypot(p.x-end.x,p.z-end.z)<.5&&segment(p,end)){goal=p;break;}
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const next={x:p.x+dx,z:p.z+dz};
      if(previous.has(key(next))||!segment(p,next))continue;
      previous.set(key(next),p);queue.push(next);
    }
  }
  if(!goal)return null;
  const points=[end];for(let p=goal;p;p=previous.get(key(p)))points.push(p);points.push(start);points.reverse();
  const result=[];let i=0;
  while(i<points.length-1){let j=points.length-1;while(j>i+1&&!segment(points[i],points[j]))j--;result.push({...points[j]});i=j;}
  return result;
}
export function bookshopVisitorShowsBack(person,viewer){
  return (viewer.x-person.x)*Math.sin(person.angle)+(viewer.z-person.z)*Math.cos(person.angle)<0;
}
export const BOOKSHOP_VISITORS=[
  {id:'math-girl',type:4,shelf:0,titles:['HISTORY OF NUMBERS','THE SECRET PROPERTIES OF SUBTRACTIONS','FRACTIONS OF FRACTIONS']},
  {id:'punk-girl',type:3,shelf:3,titles:['RADIOACTIVE COWS LYRICS','POLKA METAL HALL OF FAME','TRIBAL TANGO HEROES']},
  {id:'smart-woman',type:8},
  {id:'gay-man',type:6,shelf:4,leavesAfterBrowsing:true}
];
const entrance={x:BOOKSHOP.door.x,z:.5};
const shelfSpots=[{x:2,z:8,angle:-Math.PI/2},{x:16,z:8,angle:Math.PI/2},{x:8,z:16,angle:0},{x:5.8,z:10,angle:-Math.PI/2},{x:11.2,z:10,angle:Math.PI/2}];
const readingApproach=seat=>{
  const chair=BOOKSHOP.chairs[seat],table=BOOKSHOP.readingTables[seat];
  return {x:table.x+Math.sin(chair.angle)*.9,z:table.z+Math.cos(chair.angle)*.9};
};
export class BookshopLife{
  constructor(random=Math.random,backpack={seen:false,taken:false,returned:false}){
    this.random=random;this.people=[];this.visitorBooks=[];this.eventWait=null;this.eventActive=false;this.playerSeat=null;
    this.books=BOOKSHOP_BOOKS.filter(book=>book.id).map(book=>({...book,state:'display'}));
    this.pendingBook=null;
    this.backpack=backpack;
    this.sellerAngle=Math.PI;this.seller={...BOOKSHOP.bookseller};this.state='desk';this.route=[];this.returning=null;
  }
  enter(){this.eventWait=5+this.random()*5;}
  occupied(seat){return this.people.some(p=>p.seat===seat)||this.visitorBooks.some(b=>b.seat===seat&&b.state==='reading');}
  freeReadingSeats(){
    return BOOKSHOP.chairs.map((_,i)=>i).filter(i=>i!==this.playerSeat&&!this.occupied(i)&&!this.books.some(b=>b.seat===i&&b.state==='reading'));
  }
  visitorTravel(p,state,target){
    const route=bookshopRoute(p,target,[this.seller,...this.people.filter(other=>other!==p&&other.state!=='reading')]);
    if(!route)return false;
    p.state=state;p.route=route;return true;
  }
  startVisitorEvent(definition){
    const p=this.people.find(p=>p.id===definition.id);
    if(!p){
      const shelf=definition.shelf??Math.floor(this.random()*shelfSpots.length),spot=shelfSpots[shelf];
      const newcomer={...definition,...entrance,shelf,radius:.3,angle:0,walkTime:0,variant:this.random()};
      if(!this.visitorTravel(newcomer,'entering',spot))return false;
      this.people.push(newcomer);
    }else if(p.state==='reading'){
      const approach=readingApproach(p.seat);
      // Standing up returns to the same clear spot used when sitting down.
      const start={x:p.x,z:p.z};Object.assign(p,approach);
      if(!this.visitorTravel(p,'leaving',entrance)){Object.assign(p,start);return false;}
      p.book.state='reading';p.book.wait=0;p.book.seat=p.seat;
      this.visitorBooks.push(p.book);p.book=null;delete p.seat;
    }else if(p.state==='browsing'&&definition.titles){
      const free=this.freeReadingSeats();
      if(free.length<2)return false;
      const seat=free[Math.floor(this.random()*free.length)];
      if(!this.visitorTravel(p,'to-table',readingApproach(seat)))return false;
      p.seat=seat;
      p.book={id:`visitor-${p.id}`,name:definition.titles[Math.floor(this.random()*definition.titles.length)],color:p.type===4?'#ae925c':'#93634e',state:'carried',shelf:p.shelf};
    }else if(p.state==='browsing'){
      if(definition.leavesAfterBrowsing||this.random()<.5){if(!this.visitorTravel(p,'leaving',entrance))return false;}
      else{
        const alternatives=shelfSpots.map((_,i)=>i).filter(i=>i!==p.shelf);
        const shelf=alternatives[Math.floor(this.random()*alternatives.length)];
        if(!this.visitorTravel(p,'to-shelf',shelfSpots[shelf]))return false;
        p.shelf=shelf;
      }
    }else return false;
    this.eventActive=true;return true;
  }
  updateVisitors(dt,player){
    const moving=this.people.find(p=>p.route?.length);
    if(moving){
      const p=moving;let distance=dt*1.2;
      while(p.route.length&&distance>0){
        const target=p.route[0],dx=target.x-p.x,dz=target.z-p.z,length=Math.hypot(dx,dz),step=Math.min(distance,length);
        const next=length?{x:p.x+dx/length*step,z:p.z+dz/length*step}:target;
        if(player&&pubPersonBlocks(p,next,player))break;
        const others=[this.seller,...this.people.filter(other=>other!==p&&other.state!=='reading')];
        if(pubPersonBlocks(p,next,others)){
          p.route=bookshopRoute(p,p.route.at(-1),others)??p.route;break;
        }
        if(length)p.angle=Math.atan2(dx,dz);
        Object.assign(p,next);p.walkTime+=step/1.2;distance-=step;
        if(length>step)break;
        p.route.shift();
      }
      if(!p.route.length){
        if(p.state==='leaving')this.people.splice(this.people.indexOf(p),1);
        else if(p.state==='to-table'){
          Object.assign(p,BOOKSHOP.chairs[p.seat]);p.side=Math.cos(p.angle);p.state='reading';
        }else{p.state='browsing';p.angle=shelfSpots[p.shelf].angle;}
      }
    }
    if(this.eventActive){
      if(!this.people.some(p=>p.route?.length)&&this.atDesk&&!this.visitorBooks.some(b=>b.state!=='shelved')){
        this.eventActive=false;this.eventWait=5+this.random()*5;
      }
      return;
    }
    if(this.eventWait==null)return;
    this.eventWait=Math.max(0,this.eventWait-dt);
    if(this.eventWait>0)return;
    const candidates=[...BOOKSHOP_VISITORS];
    while(candidates.length){
      const [candidate]=candidates.splice(Math.floor(this.random()*candidates.length),1);
      if(this.startVisitorEvent(candidate))return;
    }
    this.eventWait=5+this.random()*5;
  }
  booksellerGifts(inventory){
    return {
      ...BOOKSELLER_GIFTS,
      backpack:record=>({ends:true,answer:()=>{
        const index=inventory.items.findIndex(item=>item.id===BACKPACK.id);
        if(index<0)return [];
        inventory.items.splice(index,1);
        this.backpack.taken=false;
        this.backpack.returned=true;
        const reward=record.BOOKSELLER_TICKET_NEEDED&&!record.BOOKSELLER_TICKET_REWARDED;
        if(reward){
          inventory.take(TICKET);
          record.BOOKSELLER_TICKET_REWARDED=true;
        }
        inventory.selected=Math.max(0,Math.min(inventory.selected,inventory.items.length-1));
        if(reward){
          return ['THIS IS MY BACKPACK! THANK YOU, SIR!','PLEASE ACCEPT A GIFT AS A REWARD FOR YOUR HONESTY...'];
        }
        return ['THIS IS MY BACKPACK! THANK YOU, SIR'];
      }}),
      ticket:["KEEP IT, SIR. IT'S YOURS AND WELL-DESERVED!"]
    };
  }
  get backpackTaken(){return this.backpack.taken;}
  get atDesk(){return this.state==='desk';}
  get guardingBackpack(){return this.atDesk||Math.hypot(this.seller.x-BOOKSHOP.bookseller.x,this.seller.z-BOOKSHOP.bookseller.z)<=2;}
  onDisplay(book){return !book.id||this.books.find(b=>b.id===book.id)?.state==='display';}
  carried(inventory){return this.books.find(book=>book.state==='carried'&&inventory.items.some(item=>item.id===book.id));}
  resetBookInteraction(){this.pendingBook=null;}
  interact(player,inventory){
    const previous=this.pendingBook;
    this.resetBookInteraction();
    if(!this.backpackTaken&&facingNearest(player,[BOOKSHOP.backpack])){
      this.backpack.seen=true;
      if(this.guardingBackpack)return BACKPACK_WARNING;
      const reply=inventory.take(BACKPACK);
      if(reply==='TAKEN')this.backpack.taken=true;
      return reply;
    }
    const visitor=facingNearest(player,this.people.filter(p=>p.book));
    if(visitor)return visitor.book.name;
    const leftBook=facingNearest(player,this.visitorBooks.filter(b=>b.state==='reading').map(b=>({...BOOKSHOP.readingTables[b.seat],name:b.name,reach:1.4})));
    if(leftBook)return leftBook.name;
    const target=facingNearest(player,BOOKSHOP_BOOKS.filter(book=>this.onDisplay(book)));
    const book=this.books.find(book=>book.id===target?.id);
    if(!book)return null;
    if(previous!==book){this.pendingBook=book;return `${book.name}... should I read this?`;}
    if(this.carried(inventory))return 'I ALREADY HAVE ONE.';
    const reply=inventory.take(book);
    if(reply==='TAKEN')book.state='carried';
    return reply;
  }
  sit(seat,inventory){return this.carried(inventory)?BOOK_READING_REPLY:null;}
  stand(seat,inventory){
    const book=this.carried(inventory);if(!book)return;
    book.state='reading';book.seat=BOOKSHOP.chairs.indexOf(seat);book.wait=5;
    const index=inventory.items.findIndex(item=>item.id===book.id);inventory.items.splice(index,1);
    inventory.selected=Math.max(0,Math.min(inventory.selected,inventory.items.length-1));inventory.description=false;
  }
  travel(state,target){
    const route=bookshopRoute(this.seller,target,this.people.filter(p=>p.state!=='reading'));if(!route)return false;
    this.state=state;this.route=route;return true;
  }
  get pendingCollections(){return [...this.books,...this.visitorBooks].filter(book=>book.state==='reading');}
  collectNext(){
    for(const book of this.pendingCollections){
      if(book.wait>0)continue;
      const target=readingApproach(book.seat);
      if(this.travel('collect',target)){this.returning=book;return true;}
    }
    return false;
  }
  update(dt,player,playerSeat=null){
    this.playerSeat=playerSeat==null?null:BOOKSHOP.chairs.indexOf(playerSeat);
    this.updateVisitors(dt,player);
    for(const book of this.books)if(book.state==='reading')book.wait=Math.max(0,book.wait-dt);
    if(this.atDesk||this.state==='home'||this.state==='waiting'){
      if(!this.collectNext()){
        if(this.pendingCollections.length){
          if(!this.atDesk){this.state='waiting';this.route=[];}
          return;
        }
        if(this.atDesk)return;
        if(this.state==='waiting'&&!this.travel('home',BOOKSHOP.bookseller))return;
      }
    }
    let travel=dt*1.3;
    while(this.route.length&&travel>0){
      const target=this.route[0],dx=target.x-this.seller.x,dz=target.z-this.seller.z,distance=Math.hypot(dx,dz),step=Math.min(distance,travel);
      const next=distance?{x:this.seller.x+dx/distance*step,z:this.seller.z+dz/distance*step}:target;
      if(player&&pubPersonBlocks(this.seller,next,player))return;
      if(pubPersonBlocks(this.seller,next,this.people)){
        this.route=bookshopRoute(this.seller,this.route.at(-1),this.people.filter(p=>p.state!=='reading'))??this.route;return;
      }
      if(distance>0)this.sellerAngle=Math.atan2(dx,dz);
      Object.assign(this.seller,next);travel-=step;
      if(distance>step)break;
      this.route.shift();
    }
    if(this.route.length)return;
    const book=this.returning;
    if(this.state==='collect'){
      const spot=shelfSpots[book.shelf],shelf=BOOKSHOP.shelves[book.shelf];
      const targets=book.shelf==null?[{x:book.x,z:BOOKSHOP.tables[book.tableIndex].z-.7}]:
        [spot,...[-1.5,1.5].map(offset=>({x:spot.x+(shelf.w>shelf.d?offset:0),z:spot.z+(shelf.d>shelf.w?offset:0)}))];
      if(targets.some(target=>this.travel('replace',target)))book.state='returning';
    }else if(this.state==='replace'){
      book.state=book.shelf==null?'display':'shelved';delete book.seat;
      if(book.state==='shelved')this.visitorBooks.splice(this.visitorBooks.indexOf(book),1);
      this.returning=null;this.state='waiting';this.route=[];
      if(!this.collectNext()&&!this.pendingCollections.length)this.travel('home',BOOKSHOP.bookseller);
    }else if(this.state==='home'){
      this.state='desk';this.returning=null;this.sellerAngle=Math.PI;
    }
  }
}
