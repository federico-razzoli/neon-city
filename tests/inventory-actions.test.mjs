import test from 'node:test';
import assert from 'node:assert/strict';
import {Inventory,PINE_CONE,FLOWER,LAMP,HOTEL_NOTE,LADYBUG,TICKET,PASTIS_BOTTLE,MARIJUANA_PLANT,arcadeTokens,inventoryImage} from '../neon-city/inventory.js';

test('item actions default to DROP and only edible objects offer EAT',()=>{
  for(const item of [PINE_CONE,FLOWER,LAMP,HOTEL_NOTE,LADYBUG,arcadeTokens(3),{id:'bookshop-book-0'}]){
    const inventory=new Inventory();inventory.take(item);
    assert.deepEqual(inventory.actions,['DROP',...(['pine-cone','flower'].includes(item.id)?['EAT']:item.id==='lamp'?['TURN ON']:[])]);
    assert.equal(inventory.act('UNKNOWN'),null);
    assert.equal(inventory.current,item);
  }
});

test('eating removes only the selected object and repairs selection',()=>{
  for(const food of [PINE_CONE,FLOWER]){
    const inventory=new Inventory();inventory.take(LAMP);inventory.take(food);inventory.move(1);
    assert.equal(inventory.act('EAT'),'IT WAS DISGUSTING!');
    assert.deepEqual(inventory.items,[LAMP]);assert.equal(inventory.selected,0);
    assert.equal(inventory.act('EAT'),null,'the lamp cannot be eaten');
    inventory.items=[];inventory.take(food);
    assert.equal(inventory.act('EAT'),'IT WAS DISGUSTING!');
    assert.equal(inventory.current,undefined);assert.deepEqual(inventory.actions,[]);
    assert.equal(inventory.act('EAT'),null);
  }
});

test('the unplugged lamp keeps its item and reports the exact reply',()=>{
  const inventory=new Inventory();inventory.take(LAMP);
  assert.equal(inventory.act('TURN ON'),"I CAN'T. IT'S NOT PLUGGED.");
  assert.deepEqual(inventory.items,[LAMP]);
});

test('inventory previews reuse the existing world object models',async()=>{
  const {drawFlower}=await import('../neon-city/flowers.js');
  const {pineCone}=await import('../neon-city/parks.js');
  const {drawDroppedToken}=await import('../neon-city/inventory.js');
  const {drawDroppedNote}=await import('../neon-city/hotel-storage.js');
  const {drawHotelLamp}=await import('../neon-city/hotel-interior.js');
  const {drawBackpack}=await import('../neon-city/backpack.js');
  const {drawPastisBottle,drawMarijuanaPlant}=await import('../neon-city/backpack-contents.js');
  const {drawBookshopBook}=await import('../neon-city/midnite-interior.js');
  const origin={x:0,z:0,ground:0,angle:0};
  const images=[
    inventoryImage(PASTIS_BOTTLE,(item,{box,face})=>drawPastisBottle(origin,box,face)),
    inventoryImage(MARIJUANA_PLANT,(item,{box,face})=>drawMarijuanaPlant(origin,box,face)),
    inventoryImage(PINE_CONE,(item,{face})=>pineCone({...origin,length:.22,radius:.07},face,{x:2,y:3,z:-4})),
    inventoryImage(HOTEL_NOTE,(item,{face})=>drawDroppedNote(origin,face)),
    inventoryImage(arcadeTokens(1),(item,{face})=>drawDroppedToken(origin,face)),
    inventoryImage(FLOWER,(item,{quad})=>drawFlower({...item,x:0,z:0},quad)),
    inventoryImage(LAMP,(item,{box})=>drawHotelLamp(0,0,0,box)),
    inventoryImage({id:'backpack'},(item,{box,face})=>drawBackpack({x:0,z:0},box,face)),
    inventoryImage({color:'#93634e'},(item,{box})=>drawBookshopBook(box,item,0,0,0))
  ];
  assert.equal(new Set(images).size,images.length);
  for(const image of images){
    assert.ok(image.startsWith('data:image/svg+xml,'));
    const svg=decodeURIComponent(image.split(',')[1]);
    assert.ok(svg.includes('<polygon'));assert.ok(svg.endsWith('</svg>'));
    assert.ok(!/NaN|Infinity/.test(svg));
    const [, ,width,height]=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const areas=[...svg.matchAll(/points="([^"]+)"/g)].map(([,points])=>{
      const vertices=points.split(' ').map(point=>point.split(',').map(Number));
      return Math.abs(vertices.reduce((sum,[x,y],i)=>{
        const [nextX,nextY]=vertices[(i+1)%vertices.length];
        return sum+x*nextY-y*nextX;
      },0))/2;
    });
    assert.ok(Math.max(...areas)>width*height*.01,'object has visible surfaces, not collapsed lines');
  }
  assert.equal(inventoryImage(LADYBUG,()=>{}),'','do not invent artwork for an object without a model');
});


test('the backpack can be opened outside the bookshop for its pastis and plant',async()=>{
  const {BACKPACK}=await import('../neon-city/backpack.js');
  const inventory=new Inventory();inventory.take(BACKPACK);
  assert.deepEqual(inventory.actions,['DROP','OPEN']);
  assert.equal(inventory.act('OPEN',{inBookshop:true}),'NOT HERE!');
  assert.deepEqual(inventory.items,[BACKPACK]);assert.equal(inventory.backpackOpened,false);
  assert.equal(inventory.act('OPEN'),'THE BACKPACK CONTAINED SOME STUFF.');
  assert.deepEqual(inventory.items,[BACKPACK,PASTIS_BOTTLE,MARIJUANA_PLANT]);
  assert.equal(TICKET.name,'TICKET');
  assert.equal(TICKET.description,"IT'S A TICKET FOR THE RADIOACTIVE COWS SHOW!");
  for(const item of [PASTIS_BOTTLE,MARIJUANA_PLANT]){
    inventory.selected=inventory.items.indexOf(item);
    assert.deepEqual(inventory.actions,['DROP']);
  }
  inventory.selected=0;
  inventory.items.splice(1);
  assert.equal(inventory.act('OPEN'),'THE BACKPACK IS EMPTY.');
  assert.deepEqual(inventory.items,[BACKPACK],'the backpack contents cannot be generated repeatedly');
});

test('backpack OPEN and DROP in the bookshop close the object box and show NOT HERE',async()=>{
  const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
  const {BACKPACK}=await import('../neon-city/backpack.js');
  const source=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
  const drop=source.slice(source.indexOf('function dropSelectedItem(){'),source.indexOf('function drawDroppedItems('));
  const action=source.slice(source.indexOf('function useInventoryAction(action){'),source.indexOf("inventoryMessage.addEventListener('cancel'"));
  for(const command of ['DROP','OPEN']){
    const inventory=new Inventory();inventory.take(BACKPACK);
    const message={textContent:'',open:false,showModal(){this.open=true;},focus(){}};
    const sandbox={inventory,insideBookshop:true,playerSeat:{},examinedItem:BACKPACK,inventoryMessage:message,
      detailOpen:true,closeInventoryItem(){sandbox.detailOpen=false;}};
    runInNewContext(drop+action,sandbox);
    sandbox.useInventoryAction(command);
    assert.equal(sandbox.detailOpen,false);
    assert.equal(message.open,true);assert.equal(message.textContent,'NOT HERE!');
    assert.deepEqual(inventory.items,[BACKPACK]);
    assert.equal(inventory.backpackOpened,false,'bookshop attempts do not consume the contents');
    if(command==='OPEN'){
      sandbox.insideBookshop=false;sandbox.detailOpen=true;
      sandbox.useInventoryAction('OPEN');
      assert.equal(sandbox.detailOpen,false);
      assert.equal(message.textContent,'THE BACKPACK CONTAINED SOME STUFF.');
      assert.deepEqual(inventory.items,[BACKPACK,PASTIS_BOTTLE,MARIJUANA_PLANT]);
    }
  }
});
