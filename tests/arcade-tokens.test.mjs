import test from 'node:test';
import assert from 'node:assert/strict';
import {arcadeTalk,ARCADE,facingArcadeAttendant} from '../neon-city/arcade-interior.js';
import {StaffTalk} from '../neon-city/pub-interior.js';
import {Inventory} from '../neon-city/inventory.js';
import {Wallet} from '../neon-city/money.js';

function prices(talk){
  talk.confirm(0);
  assert.equal(talk.line,'1 TOKEN: £0.5\n3 TOKENS: £1\n6 TOKENS: £666');
  talk.confirm();
  assert.deepEqual(talk.script.map(o=>o.ask),['1 TOKEN','3 TOKENS','6 TOKENS','MAYBE LATER.']);
}
test('declining tokens answers with an ellipsis and returns to the first block',()=>{
  const wallet=new Wallet(),inventory=new Inventory();wallet.pence=500;
  const talk=new StaffTalk(arcadeTalk(wallet,inventory),{});
  prices(talk);talk.confirm(3);
  assert.equal(talk.line,'...');
  talk.confirm();
  assert.equal(talk.line,null);
  assert.deepEqual(talk.script.map(o=>o.ask),['HOW MUCH FOR A TOKEN?','I LOVE RETRO GAMING!','BYE!']);
  assert.equal(talk.over,false);
  assert.equal(wallet.pence,500);assert.equal(inventory.items.length,0);
});
test('arcade purchases check funds, charge each price once and stack tokens',()=>{
  for(const [choice,count,price] of [[0,1,50],[1,3,100],[2,6,66600]]){
    const wallet=new Wallet(),inventory=new Inventory();
    const talk=new StaffTalk(arcadeTalk(wallet,inventory),{});
    wallet.pence=price-1;prices(talk);talk.confirm(choice);
    assert.equal(talk.line,'SURE. BUT FIRST COME BACK WITH THE MONEY, SIR.');
    assert.equal(wallet.pence,price-1);assert.equal(inventory.items.length,0);
    talk.confirm();wallet.pence=price;prices(talk);talk.confirm(choice);
    assert.equal(wallet.pence,0);assert.equal(inventory.current.count,count);
    if(count===6){
      assert.equal(talk.line,'SERIOUSLY?!');talk.confirm();
      assert.equal(talk.line,'OH, WELL. YOUR CALL.');
    }else assert.equal(talk.line,'THANK YOU, SIR!');
    talk.confirm();assert.equal(wallet.pence,0);
    wallet.pence=price;prices(talk);talk.confirm(choice);
    while(talk.line)talk.confirm();
    assert.equal(inventory.items.length,1);
    assert.equal(inventory.current.name,`${count*2} TOKENS`);
    assert.equal(inventory.current.description,'ARCADE TOKENS.');
    assert.equal(wallet.pence,0);
  }
});
test('arcade retro gaming reply and goodbye sequence',()=>{
  const talk=new StaffTalk(arcadeTalk(new Wallet(),new Inventory()),{});
  talk.confirm(1);assert.equal(talk.line,"I KNOW. THAT'S WHY YOU'RE HERE, RIGHT?");
  talk.confirm();assert.equal(talk.line,'SOME RECENT GAMES FEEL LIKE OLD GAMES...');
  talk.confirm();talk.confirm(2);assert.equal(talk.line,'SEE YOU LATER!');
  assert.equal(talk.over,false);talk.confirm();assert.equal(talk.over,true);
});
test('arcade desk lady can be addressed from the customer side',()=>{
  assert.equal(facingArcadeAttendant({x:ARCADE.attendant.x,z:ARCADE.desk.z-.35,angle:0}),true);
  assert.equal(facingArcadeAttendant({x:ARCADE.attendant.x,z:ARCADE.desk.z-.35,angle:Math.PI}),false);
  assert.equal(facingArcadeAttendant({x:ARCADE.attendant.x,z:ARCADE.attendant.z+.7,angle:Math.PI}),false);
});

test('dropping tokens removes one at a time and picking them up restores the stack',async()=>{
  const {arcadeTokens,dropItem,takeDroppedItem,drawDroppedToken}=await import('../neon-city/inventory.js');
  const inventory=new Inventory(),chunk={},player={x:2,z:2,angle:0};
  inventory.take(arcadeTokens(3));
  const first=dropItem(inventory,player,chunk);
  assert.equal(first.item.count,1);
  assert.equal(inventory.current.name,'2 TOKENS');
  assert.notEqual(first.item,inventory.current);
  dropItem(inventory,player,chunk);
  assert.equal(inventory.current.name,'1 TOKEN');
  dropItem(inventory,player,chunk);
  assert.equal(inventory.items.length,0);
  assert.equal(chunk.droppedItems.length,3);
  for(let i=1;i<=3;i++){
    assert.equal(takeDroppedItem(player,[chunk],inventory),'TAKEN');
    assert.equal(inventory.current.count,i);
  }
  assert.equal(chunk.droppedItems.length,0);
  const faces=[];
  drawDroppedToken(first,(points,color)=>faces.push({points,color}));
  assert.equal(faces.length,19);
  assert.equal(faces[16].points.length,16,'round brass face');
  assert.ok(faces.every(f=>f.points.every(p=>Number.isFinite(p.x+p.y+p.z))));
  assert.equal(inventory.current.name,'3 TOKENS');
});
