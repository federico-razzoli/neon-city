import test from 'node:test';
import assert from 'node:assert/strict';
import {Punch,PUNCH_FIGHTERS} from '../neon-city/punch.js';
import {PUNCH_CABINET,tryArcadeGame,facingArcadeGame} from '../neon-city/arcade-interior.js';
import {Inventory,arcadeTokens} from '../neon-city/inventory.js';
const tick=(g,seconds,v=0,h=0)=>{for(let t=0;t<seconds-1e-6;t+=.02)g.update(.02,v,h);};
const fighting=()=>{const g=new Punch();g.keyDown('x');g.update(.01);g.keyDown('x');g.update(.01);tick(g,1.3);return g;};
const tell=(g,type='hook',side=-1)=>Object.assign(g,{phase:'tell',timer:.01,attack:{type,side,damage:20,recovery:.8},sequence:[],punch:null});
const punch=(g,key='x',v=0)=>{g.keyDown(key);tick(g,.12,v);};
test('cabinet previews without charging, charges one token and can be approached',()=>{
 const i=new Inventory();assert.match(tryArcadeGame(PUNCH_CABINET,i),/TOKENS/);i.take(arcadeTokens(2));assert.equal(tryArcadeGame(PUNCH_CABINET,i,false),'PUNCH');assert.equal(i.current.count,2);assert.equal(tryArcadeGame(PUNCH_CABINET,i),'PUNCH');assert.equal(i.current.count,1);assert.equal(facingArcadeGame({x:PUNCH_CABINET.x+.75,z:PUNCH_CABINET.z-.8,angle:0}),PUNCH_CABINET);
});
test('title and scouting introduction require deliberate input before the bell',()=>{
 const g=new Punch();tick(g,5);assert.equal(g.phase,'title');g.keyDown('z');g.update(.01);assert.equal(g.phase,'intro');tick(g,5);assert.equal(g.phase,'intro');g.keyDown('x');g.update(.01);assert.equal(g.phase,'bell');tick(g,1.3);assert.equal(g.phase,'idle');
});
test('head and body guard, independent hands, and queued fast key taps',()=>{
 const g=fighting();g.timer=5;g.guard='head';punch(g,'z',-1);assert.equal(g.opponentHealth,100);assert.equal(g.punch.hand,-1);
 tick(g,.3);punch(g,'x');assert.equal(g.opponentHealth,96);assert.equal(g.punch.hand,1);
 tick(g,.3);g.guard='body';punch(g,'x',-1);assert.equal(g.opponentHealth,92);
 tick(g,.3);punch(g,'z');assert.equal(g.opponentHealth,92);
});
test('gold-flash counters interrupt combinations and earn capped stars; uppercuts spend a star',()=>{
 const g=fighting();Object.assign(g,{phase:'tell',timer:.3,attack:{type:'hook',side:-1},sequence:[{type:'jab'}]});punch(g,'z',-1);
 assert.equal(g.phase,'stunned');assert.equal(g.stars,1);assert.equal(g.sequence.length,0);assert.equal(g.opponentHealth,91);
 tick(g,.3);punch(g,' ');assert.equal(g.stars,0);assert.equal(g.opponentHealth,57);
 const h=fighting();h.timer=5;punch(h,' ');assert.equal(h.punch,null);assert.equal(h.opponentHealth,100);
});
test('dodges have a finite timing window and holding a direction does not keep dodging',()=>{
 const g=fighting();g.timer=5;tick(g,.12,0,1);tell(g);g.update(.02,0,1);assert.equal(g.health,100);
 tick(g,.8,0,1);tell(g);g.update(.02,0,1);assert.equal(g.health,80);
 const wrong=fighting();tick(wrong,.12,0,-1);tell(wrong);wrong.update(.02,0,-1);assert.equal(wrong.health,80);
});
test('duck evades cross, high guard blocks jabs, uppercuts defeat duck and block',()=>{
 for(const [type,v,expected] of [['sweep',1,100],['hook',-1,98],['uppercut',1,80],['uppercut',-1,80]]){const g=fighting();tell(g,type);g.update(.02,v);assert.equal(g.health,expected,`${type} / ${v}`);}
 const g=fighting();tick(g,.12,0,1);tell(g,'uppercut');g.update(.02,0,1);assert.equal(g.health,100);
});
test('feints do no damage and chained punches do not provide an early recovery opening',()=>{
 const g=fighting();g.bout=1;g.patternIndex=1;g.sequence=[];g.beginExchange();assert.equal(g.attack.type,'feint');tick(g,.56);assert.equal(g.phase,'tell');assert.equal(g.attack.type,'uppercut');assert.equal(g.health,100);
 const h=fighting();h.sequence=[{type:'jab',side:1,tell:.3,damage:10,recovery:.5}];tell(h);h.sequence=[{type:'jab',side:1,tell:.3,damage:10,recovery:.5}];h.update(.02);tick(h,.18);assert.equal(h.phase,'tell');assert.equal(h.attack.type,'jab');
});
test('exhaustion prevents punching and recovers without freezing the opponent',()=>{
 const g=fighting();g.stamina=2;g.timer=5;punch(g,'z');assert.ok(g.exhausted>0);assert.equal(g.punch,null);tick(g,2);assert.ok(g.stamina>20);assert.equal(g.exhausted,0);
});
test('knockdown count requires recovery input; three in a round cause a TKO',()=>{
 const g=fighting();g.knockdown('player');tick(g,2.5);assert.equal(g.phase,'down');assert.ok(g.count>=2);for(let i=0;i<10;i++){g.keyDown('x');g.update(.02);}assert.equal(g.phase,'bell');assert.ok(g.health>0);
 const h=fighting();h.roundPlayerDowns=2;h.knockdown('player');tick(h,1);assert.equal(h.over,true);assert.match(h.result,/TKO/);
 const loss=fighting();loss.knockdown('player');tick(loss,9);assert.equal(loss.over,true);assert.equal(loss.result,'KNOCKOUT');
});
test('opponents get up on early counts, lose on ten, and next bout resets match state',()=>{
 const g=fighting();g.knockdown('opponent');tick(g,5);assert.equal(g.phase,'bell');assert.equal(g.opponentHealth,65);
 g.opponentDowns=2;g.roundOpponentDowns=0;g.knockdown('opponent');tick(g,9);assert.equal(g.phase,'result');assert.equal(g.boutWon,true);assert.equal(g.over,false);
 g.keyDown('x');g.update(.02);assert.equal(g.bout,1);assert.equal(g.phase,'intro');assert.equal(g.round,1);assert.equal(g.opponentHealth,100);assert.equal(g.opponentDowns,0);
});
test('round breaks restore health; final round is judged and final victory awards the belt',()=>{
 const g=fighting();g.health=50;g.time=.01;g.update(.02);assert.equal(g.phase,'rest');g.keyDown('x');g.update(.02);assert.equal(g.round,2);assert.equal(g.health,75);assert.equal(g.time,180);
 Object.assign(g,{phase:'idle',round:3,time:.01,landed:100,taken:1});g.update(.02);assert.equal(g.boutWon,true);assert.equal(g.result,'JUDGES’ DECISION');
 const h=fighting();h.bout=2;h.finishBout(true,'KNOCKOUT');assert.equal(h.victory,true);assert.equal(h.over,true);const score=h.score;tick(h,4);assert.equal(h.score,score);
});
test('touch controls select head punches, ducking, dodges and recovery taps',()=>{
 const g=fighting();g.timer=5;g.pointer('down',310,330);g.pointer('down',480,330);g.update(.02);assert.equal(g.punch.head,true);g.pointer('up',480,330);assert.equal(g.touchVertical,0);
 g.knockdown('player');g.pointer('down',300,200);assert.ok(g.queue.length);
});
test('all fighters have distinct patterns and can be beaten by reading and countering',()=>{
 assert.equal(new Set(PUNCH_FIGHTERS.map(f=>JSON.stringify(f.patterns))).size,3);
 const g=fighting();let hand=0;
 for(let i=0;i<40000&&!g.over;i++){
   let v=0,h=0;
   if(['intro','result','rest'].includes(g.phase))g.keyDown('x');
   if(g.phase==='down'&&g.downWho==='player'&&i%2===0)g.keyDown('x');
   if(g.phase==='tell'&&g.timer<.2&&g.attack.type!=='feint'){
     if(g.attack.type==='sweep')v=1;else h=-g.attack.side;
   }
   if(['recover','stunned'].includes(g.phase)&&g.cooldown===0){v=-1;g.keyDown(g.stars?' ':hand++%2?'z':'x');}
   g.update(.02,v,h);
 }
 assert.equal(g.over,true);assert.equal(g.victory,true,`${g.bout} / ${g.phase} / ${g.result}`);
});
