/* SPDX-License-Identifier: AGPL-3.0-only */
import {BOOKSHOP,BOOKSHOP_BOOKS,BOOK_READING_REPLY,BACKPACK_WARNING,bookshopWalkable} from './midnite-interior.js';
import {BACKPACK} from './backpack.js';
import {facingNearest,pubPersonBlocks} from './pub-interior.js';

// Staff use the same furniture footprint as the player, with a little extra
// clearance. Routes are planned only when a collection or delivery starts.
export function bookshopRoute(start,end){
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
    for(const circle of [...BOOKSHOP.chairs,...BOOKSHOP.readingTables]){
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
export class BookshopLife{
  constructor(){
    this.books=BOOKSHOP_BOOKS.filter(book=>book.id).map(book=>({...book,state:'display',examined:false}));
    this.backpackTaken=false;
    this.seller={...BOOKSHOP.bookseller};this.state='desk';this.route=[];this.returning=null;
  }
  get atDesk(){return this.state==='desk';}
  get guardingBackpack(){return this.atDesk||Math.hypot(this.seller.x-BOOKSHOP.bookseller.x,this.seller.z-BOOKSHOP.bookseller.z)<=2;}
  onDisplay(book){return !book.id||this.books.find(b=>b.id===book.id)?.state==='display';}
  carried(inventory){return this.books.find(book=>book.state==='carried'&&inventory.items.some(item=>item.id===book.id));}
  interact(player,inventory){
    if(!this.backpackTaken&&facingNearest(player,[BOOKSHOP.backpack])){
      if(this.guardingBackpack)return BACKPACK_WARNING;
      const reply=inventory.take(BACKPACK);
      if(reply==='TAKEN')this.backpackTaken=true;
      return reply;
    }
    const target=facingNearest(player,BOOKSHOP_BOOKS.filter(book=>this.onDisplay(book)));
    const book=this.books.find(book=>book.id===target?.id);
    if(!book)return null;
    if(!book.examined){book.examined=true;return `${book.name}... should I read this?`;}
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
    const route=bookshopRoute(this.seller,target);if(!route)return false;
    this.state=state;this.route=route;return true;
  }
  update(dt,player){
    for(const book of this.books)if(book.state==='reading')book.wait=Math.max(0,book.wait-dt);
    if(this.atDesk){
      const book=this.books.find(b=>b.state==='reading'&&b.wait===0);if(!book)return;
      const chair=BOOKSHOP.chairs[book.seat],table=BOOKSHOP.readingTables[book.seat];
      if(!this.travel('collect',{x:table.x+Math.sin(chair.angle)*.9,z:table.z+Math.cos(chair.angle)*.9}))return;
      this.returning=book;
    }
    let travel=dt*1.3;
    while(this.route.length&&travel>0){
      const target=this.route[0],dx=target.x-this.seller.x,dz=target.z-this.seller.z,distance=Math.hypot(dx,dz),step=Math.min(distance,travel);
      const next=distance?{x:this.seller.x+dx/distance*step,z:this.seller.z+dz/distance*step}:target;
      if(player&&pubPersonBlocks(this.seller,next,player))return;
      Object.assign(this.seller,next);travel-=step;
      if(distance>step)break;
      this.route.shift();
    }
    if(this.route.length)return;
    const book=this.returning;
    if(this.state==='collect'){
      if(this.travel('replace',{x:book.x,z:BOOKSHOP.tables[0].z-.7}))book.state='returning';
    }else if(this.state==='replace'){
      book.state='display';book.examined=false;delete book.seat;
      this.travel('home',BOOKSHOP.bookseller);
    }else if(this.state==='home'){
      this.state='desk';this.returning=null;
    }
  }
}
