import {flowersFor} from './flowers.js';
export const TAKEN='TAKEN';
export const ALREADY_HAVE_ONE='I ALREADY HAVE ONE.';
export const PINE_CONE={id:'pine-cone',name:'PINE CONE',description:'A PINE CONE. MOST PROBABLY, FALLEN FROM A PINE.'};
export const LADYBUG={id:'ladybug',name:'LADYBUG',description:'THIS BUG IS A LADY. I THINK.'};
export const FLOWER={id:'flower',name:'FLOWER',description:'A FLOWER.'};
export const HOTEL_NOTE={id:'hotel-note',name:'HOTEL NOTE',description:'IT READS: LISA HAS THE KEY.'};
export class Inventory{
  items=[];
  selected=0;
  description=false;
  take(item){
    if(this.items.some(entry=>entry.id===item.id))return ALREADY_HAVE_ONE;
    this.items.push(item);
    return TAKEN;
  }
  move(step){
    if(this.items.length)this.selected=(this.selected+step+this.items.length)%this.items.length;
    this.description=false;
  }
  get current(){return this.items[this.selected];}
}
export function takePineCone(player,chunks,inventory){
  return takeNaturalItem(player,chunks,inventory,false);
}
export function takeOutdoorItem(player,chunks,inventory){
  return takeNaturalItem(player,chunks,inventory,true);
}
function takeNaturalItem(player,chunks,inventory,includeFlowers){
  let nearest=null,distance=3.5;
  for(const chunk of chunks)for(const cone of [...(chunk.park?.cones??[]),...(includeFlowers?flowersFor(chunk):[])]){
    if(cone.taken)continue;
    const dx=cone.x-player.x,dz=cone.z-player.z,gap=Math.hypot(dx,dz);
    if(gap>distance)continue;
    if(gap>.25&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/gap<Math.cos(.45+Math.asin(Math.min(1,.25/gap))))continue;
    nearest=cone;distance=gap;
  }
  if(!nearest)return null;
  const item=nearest.size?{...FLOWER,color:nearest.color,size:nearest.size,centre:nearest.centre}:PINE_CONE;
  const reply=inventory.take(item);
  if(reply===TAKEN)nearest.taken=true;
  return reply;
}

export function dropItem(inventory,player,chunk,room='street',ground=0){
  if(!inventory.current||!chunk)return null;
  const [item]=inventory.items.splice(inventory.selected,1);
  inventory.selected=Math.max(0,Math.min(inventory.selected,inventory.items.length-1));
  inventory.description=false;
  if(item.id===LADYBUG.id)return {item,lost:true};
  const dropped={item,room,x:player.x,z:player.z,ground,angle:player.angle,length:.22,radius:.07};
  (chunk.droppedItems??=[]).push(dropped);
  return dropped;
}
export function takeDroppedItem(player,chunks,inventory,room='street',ground=0){
  let nearest=null,owner=null,distance=3.5;
  for(const chunk of chunks)for(const dropped of chunk.droppedItems??[]){
    if(dropped.room!==room||Math.abs(dropped.ground-ground)>1)continue;
    const dx=dropped.x-player.x,dz=dropped.z-player.z,gap=Math.hypot(dx,dz);
    if(gap>distance)continue;
    if(gap>.25&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/gap<Math.cos(.45+Math.asin(Math.min(1,.25/gap))))continue;
    nearest=dropped;owner=chunk;distance=gap;
  }
  if(!nearest)return null;
  const reply=inventory.take(nearest.item);
  if(reply===TAKEN)owner.droppedItems.splice(owner.droppedItems.indexOf(nearest),1);
  return reply;
}
