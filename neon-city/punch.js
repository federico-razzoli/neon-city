import {drawPunch} from './punch-art.js?v=2';

// Every fighter has a learnable sequence, a guard and a different signature move.
const hook=(side,extra={})=>({type:'hook',side,tell:.65,damage:16,recovery:.8,...extra});
const jab=(side,extra={})=>({type:'jab',side,tell:.4,damage:10,recovery:.38,...extra});
const upper=(side,extra={})=>({type:'uppercut',side,tell:.85,damage:27,recovery:1.05,...extra});
export const PUNCH_FIGHTERS=[
  {name:'RUSTY ROURKE',alias:'THE DOCKYARD DOG',record:'8–5  /  5 KOs',hint:'His big hooks leave his chin open. Slip away, then go upstairs.',
    skin:'#dba178',shade:'#a7624c',hair:'#a7442b',trunks:'#416db9',gloves:'#b93647',build:1,guard:'head',rise:[5,7,10],
    patterns:[[hook(-1)],[hook(1)],[upper(-1)],[hook(-1),hook(1,{tell:.5})]]},
  {name:'VELVET VEGA',alias:'THE MIDNIGHT MATADOR',record:'19–2  /  12 KOs',hint:'He switches his guard. Watch his feint: the real right follows.',
    skin:'#bb7c5c',shade:'#814533',hair:'#242137',trunks:'#a33c87',gloves:'#e7c767',build:.9,guard:'switch',rise:[5,8,10],
    patterns:[[jab(-1),hook(1,{tell:.38})],[{type:'feint',side:-1,tell:.55,damage:0,recovery:0},upper(1,{tell:.5})],[hook(1),hook(-1,{tell:.35}),hook(1,{tell:.35})]]},
  {name:'MAX TITAN',alias:'WORLD HEAVYWEIGHT CHAMPION',record:'32–0  /  30 KOs',hint:'Duck the sweeping cross. His golden flash is your star opportunity.',
    skin:'#98684d',shade:'#624332',hair:'#201f2b',trunks:'#d1a348',gloves:'#ca4942',build:1.16,guard:'body',rise:[6,9,10],
    patterns:[[jab(-1),jab(1,{tell:.3}),upper(-1,{tell:.5})],[{type:'sweep',side:1,tell:.95,damage:30,recovery:1.2}],[hook(-1,{tell:.45}),hook(1,{tell:.32}),upper(1,{tell:.55})]]}
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Punch{
  kind='punch';width=640;height=360;score=0;over=false;victory=false;clock=0;
  bout=0;round=1;time=180;health=100;opponentHealth=100;stamina=100;stars=0;
  phase='title';timer=0;message='';queue=[];patternIndex=0;sequence=[];attack=null;guard='head';
  playerDowns=0;opponentDowns=0;roundPlayerDowns=0;roundOpponentDowns=0;
  landed=0;taken=0;combo=0;flash=0;shake=0;reaction=0;punch=null;cooldown=0;
  dodge=0;dodgeTimer=0;dodgeCooldown=0;duck=0;block=false;exhausted=0;stun=0;
  lastHorizontal=0;lastVertical=0;legacyHeld=false;count=0;rise=0;countElapsed=0;
  get fighter(){return PUNCH_FIGHTERS[this.bout];}
  keyDown(key){
    if(this.over)return;
    if(['z','x',' ','Enter'].includes(key))this.queue.push(key);
    if(this.queue.length>8)this.queue.shift();
  }
  startBout(){
    Object.assign(this,{round:1,time:180,health:100,opponentHealth:100,stamina:100,stars:0,playerDowns:0,opponentDowns:0,
      roundPlayerDowns:0,roundOpponentDowns:0,landed:0,taken:0,patternIndex:0,sequence:[],attack:null,punch:null,combo:0,exhausted:0,dodge:0,dodgeTimer:0,stun:0,cooldown:0});
    this.enter('intro',0,this.fighter.hint);
  }
  enter(phase,timer=0,message=''){this.phase=phase;this.timer=timer;this.message=message;}
  beginExchange(){
    if(!this.sequence.length){
      const patterns=this.fighter.patterns;this.sequence=patterns[this.patternIndex%patterns.length].map(a=>({...a}));this.patternIndex++;
    }
    this.attack=this.sequence.shift();
    const pace=1+(this.round-1)*.09;
    this.guard=this.fighter.guard==='switch'?(this.patternIndex%2?'head':'body'):this.fighter.guard;
    this.enter('tell',this.attack.tell/pace,this.attack.type==='feint'?'':this.attack.type==='sweep'?'THE TITAN CROSS!':'');
  }
  startPunch(hand,head=false,star=false){
    if(!['idle','tell','strike','recover','stunned'].includes(this.phase)||this.cooldown>0||this.punch||this.dodgeTimer>0||this.duck||this.exhausted>0)return;
    if(star&&!this.stars)return;
    const cost=star?10:7;
    if(this.stamina<cost){this.exhausted=1.8;this.message='WINDED! DODGE TO RECOVER';return;}
    if(star)this.stars--;
    this.stamina-=cost;this.punch={hand,head,star,time:0,resolved:false};this.cooldown=star?.65:.29;
  }
  resolvePunch(){
    const p=this.punch;if(!p||p.resolved)return;p.resolved=true;
    if(!['idle','tell','strike','recover','stunned'].includes(this.phase))return;
    const opening=['recover','stunned'].includes(this.phase);
    const target=p.head?'head':'body';
    const sweet=this.phase==='tell'&&this.timer<.24&&this.timer>.065&&this.attack.type!=='feint';
    const penetrates=opening||sweet||this.phase==='idle'&&target!==this.guard;
    if(!penetrates){this.sound('block');this.message='BLOCKED';this.stamina=Math.max(0,this.stamina-3);this.combo=0;return;}
    const damage=p.star?(opening?34:20):opening?(p.head?11:8):sweet?9:4;
    this.sound(p.star?'star':'hit');this.opponentHealth=Math.max(0,this.opponentHealth-damage);this.landed+=damage;this.score+=damage*15;this.reaction=.28;this.reactionSide=p.hand;this.flash=.09;this.combo++;
    this.message=p.star?'STAR UPPERCUT!':sweet?'PERFECT COUNTER!':opening?`${this.combo} HIT COMBO!`:p.head?'CLEAN JAB!':'BODY BLOW!';
    if(sweet){this.stars=Math.min(3,this.stars+1);this.sequence=[];this.enter('stunned',1.25,'STAR EARNED! KEEP PUNCHING!');this.sound('star');}
    else if(opening&&!p.star){this.timer=Math.min(1.2,this.timer+.13);if(this.combo>=5){this.sequence=[];this.enter('idle',.7,'HE GOT HIS GUARD BACK');this.combo=0;}}
    if(this.opponentHealth<=0)this.knockdown('opponent');
  }
  resolveAttack(){
    const a=this.attack;if(!a||a.type==='feint')return;
    const slip=this.dodgeTimer>0&&this.dodgeTimer<.39;
    const avoided=a.type==='sweep'?this.duck>0:a.type==='uppercut'?slip:slip&&(a.type==='jab'||this.dodge===-a.side)||this.duck>0;
    if(avoided){this.score+=50;this.stamina=Math.min(100,this.stamina+9);this.message=this.sequence.length?'STAY SHARP — ANOTHER ONE!':'MISSED! NOW HIT HIM!';return;}
    const blocked=this.block&&!['uppercut','sweep'].includes(a.type)&&this.stamina>=10;
    if(blocked){this.stamina-=10;this.health=Math.max(0,this.health-2);this.message='GUARD HELD';return;}
    this.health=Math.max(0,this.health-a.damage);this.taken+=a.damage;this.stamina=Math.max(0,this.stamina-13);this.stars=Math.max(0,this.stars-1);
    this.sound('hurt');this.shake=.25;this.flash=.13;this.stun=.35;this.combo=0;this.punch=null;this.message='HIT!';
    if(!this.health)this.knockdown('player');
  }
  knockdown(who){
    this.sequence=[];this.punch=null;this.attack=null;this.count=0;this.countElapsed=0;this.rise=0;this.dodgeTimer=0;
    if(who==='player'){this.playerDowns++;this.roundPlayerDowns++;}else {this.opponentDowns++;this.roundOpponentDowns++;this.score+=400;}
    this.sound('bell');this.downWho=who;this.enter('down',.9,who==='player'?'YOU ARE DOWN! TAP Z / X TO GET UP!':'DOWN!');
  }
  finishBout(won,reason){
    this.sound('bell');this.result=reason;this.boutWon=won;this.punch=null;this.attack=null;
    if(!won){this.over=true;this.victory=false;this.enter('result',0,reason);}
    else if(this.bout===PUNCH_FIGHTERS.length-1){this.over=true;this.victory=true;this.score+=3000;this.enter('result',0,'WORLD CHAMPION!');}
    else {this.score+=1000;this.enter('result',0,`${this.fighter.name} DEFEATED`);}
  }
  update(dt,vertical=0,horizontal=0,legacyAttack=false){
    dt=clamp(dt,0,.1);this.clock+=dt;
    horizontal=horizontal||this.touchHorizontal||0;vertical=vertical||this.touchVertical||0;
    if(legacyAttack&&!this.legacyHeld)this.keyDown(' ');this.legacyHeld=legacyAttack;
    const actions=this.queue.splice(0);
    for(const key of ['flash','shake','reaction','cooldown','stun','exhausted','dodgeCooldown'])this[key]=Math.max(0,this[key]-dt);
    if(this.over)return;
    if(this.phase==='title'){if(actions.length)this.startBout();return;}
    if(this.phase==='intro'){if(actions.length)this.enter('bell',1.2,'ROUND 1');return;}
    if(this.phase==='result'){if(actions.length){this.bout++;this.startBout();}return;}
    if(this.phase==='down'){
      this.timer-=dt;
      if(this.timer>0)return;
      if((this.downWho==='player'?this.roundPlayerDowns:this.roundOpponentDowns)>=3){this.finishBout(this.downWho!=='player','TKO — THREE KNOCKDOWNS');return;}
      this.countElapsed+=dt;this.count=Math.min(10,Math.floor(this.countElapsed/.72));
      if(this.downWho==='player'){
        this.rise=Math.min(100,this.rise+actions.length*10);
        if(this.rise>=100&&this.count>=2){this.health=Math.max(32,65-this.playerDowns*8);this.stamina=80;this.enter('bell',1,'FIGHT!');return;}
        if(this.count===10)this.finishBout(false,'KNOCKOUT');
      }else{
        const target=this.fighter.rise[Math.min(2,this.opponentDowns-1)];
        if(this.count>=target){
          if(target===10)this.finishBout(true,'KNOCKOUT');
          else {this.opponentHealth=75-this.opponentDowns*10;this.enter('bell',1.1,'HE IS BACK UP!');}
        }
      }
      return;
    }
    if(this.phase==='rest'){
      if(actions.length){this.round++;this.roundPlayerDowns=0;this.roundOpponentDowns=0;this.time=180;this.health=Math.min(100,this.health+25);this.opponentHealth=Math.min(100,this.opponentHealth+18);this.stamina=100;this.enter('bell',1.2,`ROUND ${this.round}`);}
      return;
    }
    if(this.phase==='bell'){this.timer-=dt;if(this.timer<=0){this.sound('bell');this.enter('idle',1,'FIGHT!');}return;}
    // Three accelerated three-minute rounds, with a real break between them.
    this.time=Math.max(0,this.time-dt*2.5);
    if(!this.time){
      if(this.round===3)this.finishBout(this.landed+this.opponentDowns*30>this.taken+this.playerDowns*30,'JUDGES’ DECISION');
      else this.enter('rest',0,'BACK TO YOUR CORNER');
      return;
    }
    this.stamina=Math.min(100,this.stamina+dt*(this.exhausted?15:!this.punch&&!this.block?6:1));
    if(horizontal&&horizontal!==this.lastHorizontal&&this.dodgeCooldown===0&&!this.stun&&!this.punch){this.dodge=horizontal;this.dodgeTimer=.46;this.dodgeCooldown=.57;}
    this.lastHorizontal=horizontal;this.lastVertical=vertical;
    this.dodgeTimer=Math.max(0,this.dodgeTimer-dt);if(!this.dodgeTimer)this.dodge=0;
    this.duck=vertical>0&&!this.punch&&!this.stun?1:0;this.block=vertical<0&&!this.punch&&!this.dodgeTimer;
    if(!this.stun)for(const key of actions){if(key==='z'||key==='x')this.startPunch(key==='z'?-1:1,vertical<0);else if(key===' ')this.startPunch(1,true,true);}
    if(this.punch){this.punch.time+=dt;if(this.punch.time>=.1)this.resolvePunch();if(this.punch?.time>=.28)this.punch=null;}
    if(this.phase==='down'||this.phase==='result')return;
    this.timer-=dt;
    if(this.timer>0)return;
    if(this.phase==='idle')this.beginExchange();
    else if(this.phase==='tell'){
      if(this.attack.type==='feint'){this.beginExchange();return;}
      this.enter('strike',.16);this.resolveAttack();
    }else if(this.phase==='strike'){
      if(this.sequence.length)this.beginExchange();
      else {this.combo=0;this.enter('recover',this.attack.recovery,'COUNTER NOW!');}
    }else if(['recover','stunned'].includes(this.phase)){this.combo=0;this.enter('idle',.65);}
  }
  pointer(type,x,y){
    if(type==='up'||type==='cancel'){this.touchHorizontal=0;this.touchVertical=0;return;}
    if(type!=='down')return;
    if(['title','intro','rest','result','down'].includes(this.phase)){this.keyDown('x');return;}
    if(y>300){if(x<95)this.touchHorizontal=-1;else if(x<180)this.touchHorizontal=1;else if(x<270)this.touchVertical=1;else if(x<360)this.touchVertical=-1;else if(x<450)this.keyDown('z');else if(x<540)this.keyDown('x');else this.keyDown(' ');}
  }
  dispose(){
    for(const voice of this.voices??[]){try{voice.stop();}catch{}voice.disconnect();}
    this.voices?.clear();this.queue=[];this.audioContext=null;
  }
  sound(type){
    const ac=this.audioContext;if(!ac||ac.state!=='running')return;
    const voices=type==='bell'?[[740,.55],[1120,.4],[1480,.3]]:type==='star'?[[660,.12],[990,.2]]:[[type==='block'?160:type==='hurt'?60:95,.1]];
    for(const [hz,duration] of voices){
      const oscillator=ac.createOscillator(),gain=ac.createGain(),now=ac.currentTime;
      oscillator.type=type==='bell'||type==='star'?'sine':'triangle';oscillator.frequency.setValueAtTime(hz,now);
      if(type==='hit'||type==='hurt')oscillator.frequency.exponentialRampToValueAtTime(35,now+duration);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(type==='bell'?.07:.11,now+.005);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      oscillator.connect(gain);gain.connect(ac.destination);oscillator.start(now);oscillator.stop(now+duration+.01);
      (this.voices??=new Set()).add(oscillator);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();this.voices.delete(oscillator);};
    }
  }
  draw(ctx){drawPunch(ctx,this);}
}
