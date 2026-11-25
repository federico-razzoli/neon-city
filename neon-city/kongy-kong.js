// Kongy Kong alternates the barrel and rivet stages.
const LEFT=32,RIGHT=608;
const LAUGH_DURATION=2.7;
const LADDER_DROP_CHANCE=.25; // chance a barrel takes a ladder it rolls over
const FIRE_BARREL_CHANCE=.1;
const FIRE_BARREL_HEIGHT=28;
// Middle girders stop short of the wall at their downhill end, leaving an edge to fall from.
const EDGE_GAP=40;
export const floorSpan=floor=>floor===6?[460,590]:floor===0?[LEFT,RIGHT]:floor%2?[LEFT,RIGHT-EDGE_GAP]:[LEFT+EDGE_GAP,RIGHT];
const onGirder=(floor,x)=>{const [start,end]=floorSpan(floor);return x>=start&&x<=end;};
export const girderY=(floor,x)=>floor===6?62:320-floor*42+(floor%2?1:-1)*(x-320)*.025;
export const KONG_LADDERS=[
  {floor:0,x:540},{floor:0,x:240},{floor:1,x:100},{floor:1,x:390},
  {floor:2,x:530},{floor:2,x:270},{floor:3,x:110},{floor:3,x:410},
  {floor:4,x:320},{floor:4,x:200},{floor:5,x:520}
];
const rivetY=floor=>320-floor*53;
const rivetSpan=floor=>[116+floor*15,524-floor*15];
const FLAME_HEIGHT=32;
const RIVET_X=[220,420];
const KONG_SUPPORT_X=[258,380];
const RIVET_LADDERS=Array.from({length:4},(_,floor)=>{
  const [left,right]=rivetSpan(floor+1);
  const columns=floor%2?[left+8,242,398,right-8]:[left+8,320,right-8];
  return columns.map(x=>({floor,x}));
}).flat();
const SPRITES={
  parasol:['....ppp....','..ppssppp..','.ppssssppp.','ppsspppsspp','p...s.s...p','.....s.....','.....s.....','....ss.....'],
  hat:['...pppp....','..pssspp...','..pppppp...','.yyyyyyyy..','ppppppppppp'],
  purse:['...yyy...','..y...y..','..y...y..','.ppppppp.','pyyysyyyp','ppppppppp','.ppppppp.'],
  player:['..rrrrrr....','..rrrrrrrr..','..hhsshs....','.hshssshss..','.hshhssshss.','..hsssshhh..','...ssssss...','..bbrrbb....','.bbbrrbbb...','bbbbrrbbbb..','ssbrrrrbss..','ssrrrrrrss..','..rr..rr....','.hhh..hhh...'],
  monkey:['....hhhhhhhhhhhh....','..hhbbbbbbbbbbbbhh..','.hbbbbssssssbbbbbbh.','hbbbbssbssbssbbbbbbh','hbbbssssssssssbbbbbh','hbbbsshhhhhhssbbbbbh','.hbbbshsssshsbbbbbh.','..hbbbssssssbbbbhh..','.hbbbbbbbbbbbbbbbbh.','hbbbbbbbbbbbbbbbbbbh','hbbbbsbbbbbbbbsbbbbh','hbbbssbbbbbbbbssbbbh','hbbsssbbbbbbbbsssbbh','.hhssbbbbbbbbbbsshh.','..hbbbbhhhhhbbbbbh..','..hbbbh.....hbbbh...','.hssssh.....hssssh..'],
  girl:['...yyyy...','..yyyyyy..','..yssss...','..yssss...','...sss....','..ppppp...','.ppppppp..','sspppppss.','..ppppp...','.ppppppp..','ppppppppp.','...s.s....','...s.s....','..ss.ss...']
};
const PALETTE={r:'#ff3030',b:'#2448ee',s:'#ffbd80',h:'#702800',p:'#ff70be',y:'#ffe050'};
function drawCharacter(ctx,name,x,y,scale=1,facing=1,footLift=0,footSide=0){
  const palette=name==='monkey'?{...PALETTE,b:'#9c4a18',h:'#502000',s:'#d88b45'}:PALETTE;
  SPRITES[name].forEach((row,j)=>[...row].forEach((c,i)=>{
    const movingLeg=j>=14&&Math.sign(i-9.5)===footSide;
    // The hip stays fixed. The knee bends outward as the foot tucks up beneath it.
    const bend=movingLeg&&j===15?footSide*footLift/4:0;
    const lift=movingLeg?footLift*(j-13)/3:0;
    if(palette[c]){ctx.fillStyle=palette[c];ctx.fillRect(Math.round(x+(facing<0?SPRITES[name][0].length-1-i:i)*scale+bend),Math.round(y+j*scale-lift),scale,scale);}
  }));
}
export class KongyKong{
  level=1;
  get rivetStage(){return this.level%2===0;}
  ordinaryBarrelsDue=0;
  kind='kong';lives=3;score=0;over=false;won=false;victoryTime=0;time=90;barrels=[];spawnIn=0;clock=0;stomp=0;hammer=0;delay=0;jumpHeld=false;
  hammers=[{floor:1,x:185,taken:false},{floor:3,x:335,taken:false}];
  constructor(){this.resetPlayer();}
  resetPlayer(){this.player={x:this.rivetStage?rivetSpan(0)[0]+14:58,y:this.rivetStage?rivetY(0):girderY(0,58),floor:0,vy:0,air:false,climb:null,facing:1};this.hammer=0;
    this.laughAt=this.clock+7+Math.random()*8;
    if(this.rivetStage){
      this.rivets=Array.from({length:4},(_,i)=>RIVET_X.map(x=>({floor:i+1,x,removed:false}))).flat();
      this.bonuses=[
        {kind:'parasol',floor:4,x:204},
        {kind:'hat',floor:2,x:280},
        {kind:'purse',floor:1,x:364}
      ];
      this.flames=[1,2,3,4].map(floor=>({floor,x:floor%2?360:270,direction:floor%2?-1:1}));
    }
  }
  hammerPose(){
    const p=this.player,down=Math.floor((8-this.hammer)/.3)%2===1;
    return down?{state:'down',x:p.x+p.facing*22-4,y:p.y-14,w:8,h:12}
      :{state:'raised',x:p.x-6,y:p.y-33,w:12,h:7};
  }
  hammerHits(barrel){
    if(!this.hammer)return false;
    const head=this.hammerPose();
    return head.state==='down'&&(barrel.x-this.player.x)*this.player.facing>0&&
      barrel.x+6>head.x&&barrel.x-6<head.x+head.w&&
      barrel.y>head.y&&barrel.y-10<head.y+head.h;
  }
  die(){
    if(this.over||this.won||this.delay>0)return;
    if(--this.lives===0){this.over=true;return;}
    this.resetPlayer();this.barrels=[];this.spawnIn=0;this.time=90;this.delay=1;
    for(const hammer of this.hammers)hammer.taken=false;
  }
  restartLevel(){
    this.level++;
    this.won=false;this.victoryTime=0;this.time=90;this.barrels=[];this.spawnIn=0;this.delay=.6;
    this.resetPlayer();this.jumpHeld=false;
    for(const hammer of this.hammers)hammer.taken=false;
  }
  monkeyPose(){
    const lift=this.stomp?Math.sin(Math.PI*Math.min(1,this.stomp/.3))*14:0;
    return {x:60,y:girderY(5,90)-51-lift,scale:3};
  }
  drawMonkey(ctx,x,y,scale,footLift=0,footSide=0){
    drawCharacter(ctx,'monkey',x,y,scale,1,footLift,footSide);
    const elapsed=this.clock-this.laughAt;
    if(this.won||this.stomp||elapsed<0||elapsed>=LAUGH_DURATION)return;
    const beat=Math.min(2,Math.floor(elapsed/.9));
    if(elapsed%.9<.57){
      ctx.fillStyle='#502000';
      ctx.fillRect(x+7*scale,y+6*scale,6*scale,2*scale);
      ctx.fillStyle='#ff8280';
      ctx.fillRect(x+9*scale,y+7*scale,3*scale,scale);
    }
    ctx.fillStyle='#ffe050';ctx.font='bold 11px monospace';
    ctx.fillText(['HA!','HA HA!','HA HA HA!'][beat],x+20*scale+28,y+12);
  }
  escapePose(){
    const t=this.victoryTime,carrying=t>=2;
    const x=t<2?100+175*t:450+Math.max(0,t-2.6)*100;
    return {monkeyX:x,monkeyY:174-(carrying?Math.min(1,(t-2)/.6)*8:0),
      girlX:carrying?x+12:470,girlY:carrying?154:211,carrying};
  }
  update(dt,vertical=0,horizontal=0,jump=false){
    if(this.over)return;
    if(this.won){
      this.victoryTime+=Math.max(0,dt);
      const p=this.player;
      if(this.rivetStage&&!p.air&&!p.climb&&this.platformDrop(p.floor,p.x)>0){
        this.won=false;
        this.victoryTime=0;
        this.die();
      }else if(this.victoryTime>=5){
        if(this.rivetStage)this.score+=1000+Math.ceil(this.time)*10;
        this.restartLevel();
      }
      return;
    }
    const steps=Math.max(1,Math.ceil(Math.min(dt,.25)/.008));
    for(let i=0;i<steps&&!this.over&&!this.won;i++)this.step(Math.min(dt,.25)/steps,vertical,horizontal,jump);
    this.jumpHeld=jump;
  }
  step(dt,vertical,horizontal,jump){
    this.clock+=dt;
    if(this.delay>0){this.delay=Math.max(0,this.delay-dt);return;}
    if(this.stomp){
      this.stomp+=dt;
      if(this.stomp>=.45){this.stomp=0;this.die();}
      return;
    }
    if(this.clock>=this.laughAt+LAUGH_DURATION)this.laughAt=this.clock+7+Math.random()*8;
    this.time-=dt;if(this.time<=0){this.die();return;}
    this.hammer=Math.max(0,this.hammer-dt);
    const p=this.player;
    const surfaceY=this.rivetStage?rivetY:girderY;
    const ladders=this.rivetStage?RIVET_LADDERS:KONG_LADDERS;
    const supported=(floor,x)=>{
      if(!this.rivetStage)return onGirder(floor,x);
      const [left,right]=rivetSpan(floor);
      return x>=left&&x<=right&&!this.rivets.some(r=>r.removed&&r.floor===floor&&Math.abs(r.x-x)<5);
    };
    if(p.climb){
      if(vertical){
        const floor=p.climb.floor+(vertical<0?1:0),target=surfaceY(floor,p.climb.x);
        const distance=target-p.y;
        p.y+=Math.sign(distance)*Math.min(Math.abs(distance),52*dt);
        if(p.y===target){p.floor=floor;p.climb=null;}
      }
    }else{
      // Mid-jump, an up/down press is remembered until she lands, so it still
      // catches a ladder she reaches later in the jump.
      if(p.air&&vertical)p.ladderWish=vertical;
      const want=vertical||(p.air?p.ladderWish??0:0);
      if(!this.hammer&&want&&!p.dropped){
        // Mid-jump she can only catch the ladder she is crossing (the one rising from her girder),
        // then climb it up or back down from where she caught it.
        const ladder=ladders.find(l=>Math.abs(l.x-p.x)<=7.5&&(p.air||want<0?l.floor===p.floor:l.floor+1===p.floor));
        if(ladder){
          p.x=ladder.x;p.air=false;p.vy=0;p.ladderWish=0;p.climb={x:ladder.x,floor:ladder.floor};return;
        }
      }
      const movement=p.air?(p.jumpDirection??0):horizontal;
      if(movement){if(!p.air)p.facing=Math.sign(movement);p.x=Math.max(p.floor===6?460:LEFT+6,Math.min(p.floor===6?590:RIGHT-6,p.x+movement*75.6*dt));}
      if(jump&&!this.jumpHeld&&!p.air&&!this.hammer){p.air=true;p.jumpDirection=horizontal;p.ladderWish=0;p.vy=-155;this.jumpHeld=true;for(const b of this.barrels)b.jumped=false;}
      if(!p.air&&!supported(p.floor,p.x)){p.air=true;p.vy=0;p.jumpDirection=Math.sign(movement);p.floor--;p.dropped=true;}
      if(p.air){
        p.vy+=500*dt;p.y+=p.vy*dt;
        if(this.rivetStage&&p.y>360){this.die();return;}
        if(p.vy>0&&p.y>=surfaceY(p.floor,p.x)){
          // Jumping past an edge carries her down to the next girder; any drop of a whole floor is fatal.
          if(!supported(p.floor,p.x)){p.floor--;p.dropped=true;}
          else{p.y=surfaceY(p.floor,p.x);p.air=false;p.vy=0;p.ladderWish=0;if(p.dropped){this.die();return;}}
        }
      }else p.y=surfaceY(p.floor,p.x);
    }
    if(this.rivetStage){
      this.stepRivets(dt);
      return;
    }
    if(p.x>=48&&p.x<=134&&p.floor===5&&p.y<=girderY(5,p.x)+8){
      this.stomp=dt;return;
    }
    for(const item of this.hammers)if(!item.taken&&!p.climb&&!p.dropped&&item.floor===p.floor&&Math.abs(item.x-p.x)<14){item.taken=true;this.hammer=8;}
    if(p.floor===6&&p.x>=500){this.finishLevel();return;}
    this.spawnIn-=dt;
    if(this.spawnIn<=0){
      const burning=this.ordinaryBarrelsDue===0&&Math.random()<FIRE_BARREL_CHANCE;
      if(burning)this.ordinaryBarrelsDue=2;
      else if(this.ordinaryBarrelsDue>0)this.ordinaryBarrelsDue--;
      this.barrels.push({x:100,y:girderY(5,100),floor:5,falling:false,jumped:false,burning});
      this.spawnIn=2.5;
    }
    for(const b of this.barrels){
      if(b.falling){
        b.y+=(b.onLadder?60:110)*dt;
        if(b.y>=girderY(b.floor,b.x)){b.y=girderY(b.floor,b.x);b.falling=false;b.onLadder=false;}
      }else{
        const from=b.x;
        b.x+=(b.floor%2?1:-1)*70*dt;b.y=girderY(b.floor,b.x);
        // Occasionally a barrel rolling over a ladder top drops down it instead.
        const ladder=KONG_LADDERS.find(l=>l.floor+1===b.floor&&l.x>=Math.min(from,b.x)&&l.x<=Math.max(from,b.x));
        if(ladder&&Math.random()<LADDER_DROP_CHANCE){b.x=ladder.x;b.floor--;b.falling=true;b.onLadder=true;}
        else if(!onGirder(b.floor,b.x)){const [start,end]=floorSpan(b.floor);b.x=Math.max(start,Math.min(end,b.x));b.floor--;b.falling=true;}
      }
      if(b.floor<0){b.gone=true;continue;}
      if(this.hammerHits(b)){b.gone=true;this.score+=300;continue;}
      const height=b.burning?FIRE_BARREL_HEIGHT:10;
      if(Math.abs(b.x-p.x)<11&&p.y>b.y-height&&p.y-15<b.y){this.die();return;}
      if(!b.burning&&p.air&&!b.jumped&&Math.abs(b.x-p.x)<10&&p.y<=b.y-10&&p.y>b.y-38){b.jumped=true;this.score+=100;}
    }
    this.barrels=this.barrels.filter(b=>!b.gone);
  }
  finishLevel(){
    this.won=true;this.victoryTime=0;
    if(!this.rivetStage)this.score+=1000+Math.ceil(this.time)*10;
  }
  stepRivets(dt){
    const p=this.player;
    const onCentralSpan=p.x>KONG_SUPPORT_X[0]&&p.x<KONG_SUPPORT_X[1];
    if(onCentralSpan&&p.y-14<=rivetY(4)&&p.y>=rivetY(4)-51){
      this.stomp=dt;
      return;
    }
    for(const flame of this.flames){
      const [left,right]=rivetSpan(flame.floor);
      let minX=left+6,maxX=right-6;
      for(const hole of this.rivets){
        if(!hole.removed||hole.floor!==flame.floor)continue;
        if(hole.x<flame.x)minX=Math.max(minX,hole.x+11);
        else maxX=Math.min(maxX,hole.x-11);
      }
      flame.x=Math.max(minX,Math.min(maxX,flame.x+flame.direction*30*dt));
      if(flame.x===minX)flame.direction=1;
      if(flame.x===maxX)flame.direction=-1;
      const y=rivetY(flame.floor);
      if(Math.abs(flame.x-p.x)<10&&p.y>y-FLAME_HEIGHT&&p.y-14<y){this.die();return;}
    }
    for(const item of this.bonuses){
      const y=rivetY(item.floor)-4;
      if(item.collectedAt===undefined&&Math.abs(item.x-p.x)<11&&p.y>=y-9&&p.y-14<=y){
        item.collectedAt=this.clock;
        this.score+=300;
      }
    }
    const bridge=p.walkedBridge;
    if(bridge){
      if(Math.abs(p.x-bridge.x)<11&&p.y>=rivetY(bridge.floor)-1)return;
      bridge.removed=true;
      p.walkedBridge=null;
      this.score+=100;
      if(this.rivets.every(r=>r.removed)){
        this.flames=[];
        this.finishLevel();
      }
    }else if(!p.air&&!p.climb){
      p.walkedBridge=this.rivets.find(r=>!r.removed&&r.floor===p.floor&&Math.abs(p.x-r.x)<=5);
    }
  }
  platformDrop(floor,x){
    if(!this.won||floor<1||x<=RIVET_X[0]||x>=RIVET_X[1])return 0;
    const elapsed=Math.max(0,this.victoryTime-.25-(floor-1)*.65);
    const distance=rivetY(0)-9*floor-rivetY(floor);
    return distance*Math.min(1,elapsed/.6)**2;
  }
  drawRivets(rect,sprite){
    const section=(left,right,y)=>{
      rect(left,y,right-left,2,'#3eafff');
      rect(left,y+7,right-left,2,'#374bff');
      for(let x=left;x<right;x+=10)rect(x,y+2,2,5,'#385ce0');
    };
    for(let floor=0;floor<=4;floor++){
      const [left,right]=rivetSpan(floor),y=rivetY(floor);
      const drop=this.platformDrop(floor,320);
      if(!drop)section(left,right,y);
      else{
        section(left,RIVET_X[0]-5,y);
        section(RIVET_X[0]+5,RIVET_X[1]-5,y+drop);
        section(RIVET_X[1]+5,right,y);
      }
    }
    for(const r of this.rivets){
      const y=rivetY(r.floor);
      rect(r.x-5,y,10,9,'#000000');
      if(!r.removed){rect(r.x-5,y,10,3,'#ffff60');rect(r.x-3,y+3,6,6,'#ffae30');}
    }
    for(const flame of this.flames){
      const y=rivetY(flame.floor);
      const tip=flame.x+(Math.floor(this.clock*8)%2?1:-3);
      rect(tip,y-FLAME_HEIGHT,3,14,'#ff4920');
      rect(flame.x-4,y-22,8,18,'#ff4920');
      rect(flame.x-2,y-18,4,14,'#ffad20');
      rect(flame.x-6,y-8,12,7,'#ff4920');
      rect(flame.x-3,y-12,6,10,'#ffad20');
      rect(flame.x+Math.floor(this.clock*8)%2*3-2,y-15,3,6,'#ff4920');
      rect(flame.x-2,y-8,4,5,'#fff49a');
    }
    rect(246,53,148,4,'#3988ff');
    for(const x of KONG_SUPPORT_X)rect(x,57,3,rivetY(4)-57,'#00bfff');
    sprite('girl',315,39);
  }
  draw(ctx){
    ctx.fillStyle='#000000';ctx.fillRect(0,0,640,360);ctx.textAlign='center';
    ctx.fillStyle='#ffffff';ctx.font='bold 16px monospace';ctx.fillText(`KONGY KONG · L${this.level}`,320,20);
    ctx.fillText(`SCORE ${this.score}`,105,20);ctx.fillText(`LIVES ${this.lives}`,540,20);
    if(this.over||(this.won&&!this.rivetStage)){
      ctx.fillStyle=this.won?'#ffff00':'#ff3030';ctx.font='bold 32px monospace';
      ctx.fillText(this.won?`LEVEL ${this.level} COMPLETE!`:'GAME OVER',320,this.won?90:150);
      ctx.font='18px monospace';ctx.fillStyle='#ffffff';
      ctx.fillText(`SCORE ${this.score}`,320,this.won?125:195);
      if(this.won){
        ctx.fillStyle='#ff3058';ctx.fillRect(60,225,560,4);
        const pose=this.escapePose();
        drawCharacter(ctx,'monkey',pose.monkeyX,pose.monkeyY,3);
        drawCharacter(ctx,'girl',pose.girlX,pose.girlY);
      }
      ctx.font='14px monospace';ctx.fillStyle='#ffffff';
      ctx.fillText(this.won?`LEVEL ${this.level+1} NEXT...`:'SPACE / ENTER TO RETURN',320,280);
      ctx.textAlign='start';return;
    }
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    const sprite=(name,x,y,scale=1)=>drawCharacter(ctx,name,x,y,scale);
    // Red girders and cyan ladders against the original black arcade backdrop.
    if(this.rivetStage)this.drawRivets(rect,sprite);
    else for(let floor=0;floor<7;floor++){
      const [start,end]=floorSpan(floor);
      for(let x=start;x<end;x+=8)rect(x,girderY(floor,x),8,3,'#ff3058');
      for(let x=start;x<end;x+=16){const y=girderY(floor,x);rect(x,y+7,16,2,'#ff3058');rect(x+4,y+3,3,4,'#ff3058');}
    }
    const surfaceY=this.rivetStage?rivetY:girderY;
    for(const l of this.rivetStage?RIVET_LADDERS:KONG_LADDERS){
      const drop=this.rivetStage?this.platformDrop(l.floor+1,l.x):0;
      const top=surfaceY(l.floor+1,l.x)+drop;
      const bottom=surfaceY(l.floor,l.x)+(this.rivetStage?this.platformDrop(l.floor,l.x):0);
      if(top>=bottom)continue;
      rect(l.x-6,top,2,Math.ceil(bottom-top),'#00dfff');rect(l.x+5,top,2,Math.ceil(bottom-top),'#00dfff');
      for(let y=top+4;y<bottom;y+=6)rect(l.x-4,y,9,2,'#00dfff');
    }
    if(this.rivetStage){
      for(const item of this.bonuses){
        const y=rivetY(item.floor)+this.platformDrop(item.floor,item.x);
        if(item.collectedAt===undefined)sprite(item.kind,item.x-5,y-12);
        else if(this.clock-item.collectedAt<.8){
          ctx.fillStyle='#ffff60';ctx.font='bold 10px monospace';
          ctx.fillText('+300',item.x,y-14-8*(this.clock-item.collectedAt));
        }
      }
      const side=this.player.x<320?-1:1;
      const lift=Math.min(1,this.stomp/.16,Math.max(0,(.3-this.stomp)/.08))*12;
      // The top girder lands at 2.8 seconds. Hold Kong in place until the pile settles.
      if(this.won&&this.victoryTime>3){
        const elapsed=this.victoryTime-3;
        const drop=Math.min(this.platformDrop(4,320),320*elapsed**2);
        ctx.save();
        ctx.translate(320,rivetY(4)-25.5+drop);
        ctx.rotate(Math.PI*Math.min(1,elapsed/.38));
        sprite('monkey',-30,-25.5,3);
        ctx.restore();
      }else this.drawMonkey(ctx,290,rivetY(4)-51,3,lift,side);
      if(this.stomp>=.3)rect(this.player.x-7,rivetY(4)-3,14,3,'#ff3030');
    }else{
      const monkey=this.monkeyPose();
      this.drawMonkey(ctx,monkey.x,monkey.y,monkey.scale);sprite('girl',540,48);
      if(this.stomp>=.3){
        rect(54,girderY(5,90)-3,72,3,'#ffff00');
        rect(this.player.x-7,this.player.y-4,14,4,'#ff3030');
      }
      rect(46,91,10,14,'#b86b18');rect(34,91,10,14,'#b86b18');
      const hammer=(x,y,side=1)=>{rect(x,y-14,3,14,'#ffbd80');rect(x+(side<0?-9:-3),y-19,12,7,'#00dfff');};
      for(const h of this.hammers)if(!h.taken)hammer(h.x,girderY(h.floor,h.x)-7);
      for(const b of this.barrels){
        if(b.burning){
          const sway=Math.floor(this.clock*8)%2?2:-2;
          const top=b.y-FIRE_BARREL_HEIGHT;
          rect(b.x+sway-1,top,3,10,'#ff5420');
          rect(b.x-4,top+7,8,12,'#ff5420');
          rect(b.x-6,top+11,12,8,'#ff5420');
          rect(b.x-sway-1,top+10,3,9,'#ffde40');
          rect(b.x-3,top+15,6,4,'#ffde40');
        }
        rect(b.x-6,b.y-10,12,10,'#b86b18');rect(b.x-4,b.y-9,2,8,'#ffbd80');rect(b.x+2,b.y-9,2,8,'#ffbd80');rect(b.x-3,b.y-6,6,2,'#702800');
      }
    }
    const p=this.player;
    if(this.stomp<.3&&(!this.delay||Math.floor(this.clock*10)%2))drawCharacter(ctx,'player',p.x-6,p.y-14+(this.rivetStage?this.platformDrop(p.floor,p.x):0),1,p.facing);
    if(this.hammer){
      const head=this.hammerPose();
      if(head.state==='raised')rect(p.x-1,p.y-26,3,17,'#ffbd80');
      else rect(p.facing>0?p.x+3:p.x-18,p.y-9,15,3,'#ffbd80');
      rect(head.x,head.y,head.w,head.h,'#00dfff');
    }
    if(this.rivetStage){ctx.fillStyle='#ffff60';ctx.font='12px monospace';ctx.fillText(`PULL RIVETS · ${this.rivets.filter(r=>r.removed).length}/8`,105,39);}
    else {rect(32,303,17,20,'#2448ee');rect(32,303,17,3,'#00dfff');}
    ctx.fillStyle='#ffffff';ctx.font='10px monospace';ctx.fillText(`TIME ${Math.ceil(this.time)} · ← → / A D MOVE · ↑ ↓ / W S CLIMB · SPACE JUMP · ESC LEAVE`,320,352);
    if(this.hammer){ctx.fillStyle='#ffff00';ctx.fillText(`HAMMER ${Math.ceil(this.hammer)}`,320,39);}
    ctx.textAlign='start';
  }
}
