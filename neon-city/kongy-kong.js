// Kongy Kong, level one: sloping girders, ladders, rolling barrels and hammers.
const LEFT=32,RIGHT=608;
export const girderY=(floor,x)=>floor===6?62:320-floor*42+(floor%2?1:-1)*(x-320)*.025;
export const KONG_LADDERS=[
  {floor:0,x:540},{floor:0,x:240},{floor:1,x:100},{floor:1,x:390},
  {floor:2,x:530},{floor:2,x:270},{floor:3,x:110},{floor:3,x:410},
  {floor:4,x:535},{floor:4,x:240},{floor:5,x:520}
];
const SPRITES={
  player:['..rrrrrr....','..rrrrrrrr..','..hhsshs....','.hshssshss..','.hshhssshss.','..hsssshhh..','...ssssss...','..bbrrbb....','.bbbrrbbb...','bbbbrrbbbb..','ssbrrrrbss..','ssrrrrrrss..','..rr..rr....','.hhh..hhh...'],
  monkey:['....hhhhhhhhhhhh....','..hhbbbbbbbbbbbbhh..','.hbbbbssssssbbbbbbh.','hbbbbssbssbssbbbbbbh','hbbbssssssssssbbbbbh','hbbbsshhhhhhssbbbbbh','.hbbbshsssshsbbbbbh.','..hbbbssssssbbbbhh..','.hbbbbbbbbbbbbbbbbh.','hbbbbbbbbbbbbbbbbbbh','hbbbbsbbbbbbbbsbbbbh','hbbbssbbbbbbbbssbbbh','hbbsssbbbbbbbbsssbbh','.hhssbbbbbbbbbbsshh.','..hbbbbhhhhhbbbbbh..','..hbbbh.....hbbbh...','.hssssh.....hssssh..'],
  girl:['...yyyy...','..yyyyyy..','..yssss...','..yssss...','...sss....','..ppppp...','.ppppppp..','sspppppss.','..ppppp...','.ppppppp..','ppppppppp.','...s.s....','...s.s....','..ss.ss...']
};
const PALETTE={r:'#ff3030',b:'#2448ee',s:'#ffbd80',h:'#702800',p:'#ff70be',y:'#ffe050'};
function drawCharacter(ctx,name,x,y,scale=1){
  const palette=name==='monkey'?{...PALETTE,b:'#9c4a18',h:'#502000',s:'#d88b45'}:PALETTE;
  SPRITES[name].forEach((row,j)=>[...row].forEach((c,i)=>{
    if(palette[c]){ctx.fillStyle=palette[c];ctx.fillRect(Math.round(x+i*scale),Math.round(y+j*scale),scale,scale);}
  }));
}
export class KongyKong{
  kind='kong';lives=3;score=0;over=false;won=false;victoryTime=0;time=90;barrels=[];spawnIn=1.8;clock=0;hammer=0;delay=0;jumpHeld=false;
  hammers=[{floor:1,x:185,taken:false},{floor:3,x:335,taken:false}];
  constructor(){this.resetPlayer();}
  resetPlayer(){this.player={x:58,y:girderY(0,58),floor:0,vy:0,air:false,climb:null,facing:1};this.hammer=0;}
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
    this.resetPlayer();this.barrels=[];this.spawnIn=2;this.time=90;this.delay=1;
    for(const hammer of this.hammers)hammer.taken=false;
  }
  restartLevel(){
    this.won=false;this.victoryTime=0;this.time=90;this.barrels=[];this.spawnIn=1.8;this.delay=.6;
    this.resetPlayer();this.jumpHeld=false;
    for(const hammer of this.hammers)hammer.taken=false;
  }
  escapePose(){
    const t=this.victoryTime,carrying=t>=2;
    const x=t<2?100+175*t:450+Math.max(0,t-2.6)*100;
    return {monkeyX:x,monkeyY:191-(carrying?Math.min(1,(t-2)/.6)*8:0),
      girlX:carrying?x+12:470,girlY:carrying?171:211,carrying};
  }
  update(dt,vertical=0,horizontal=0,jump=false){
    if(this.over)return;
    if(this.won){
      this.victoryTime+=Math.max(0,dt);
      if(this.victoryTime>=5)this.restartLevel();
      return;
    }
    const steps=Math.max(1,Math.ceil(Math.min(dt,.25)/.008));
    for(let i=0;i<steps&&!this.over&&!this.won;i++)this.step(Math.min(dt,.25)/steps,vertical,horizontal,jump);
    this.jumpHeld=jump;
  }
  step(dt,vertical,horizontal,jump){
    this.clock+=dt;
    if(this.delay>0){this.delay=Math.max(0,this.delay-dt);return;}
    this.time-=dt;if(this.time<=0){this.die();return;}
    this.hammer=Math.max(0,this.hammer-dt);
    const p=this.player;
    if(p.climb){
      const target=girderY(p.climb.target,p.climb.x);
      p.y+=Math.sign(target-p.y)*52*dt;
      if(Math.abs(p.y-target)<1){p.y=target;p.floor=p.climb.target;p.climb=null;}
    }else{
      if(!p.air&&!this.hammer&&vertical){
        const ladder=KONG_LADDERS.find(l=>Math.abs(l.x-p.x)<12&&(vertical<0?l.floor===p.floor:l.floor+1===p.floor));
        if(ladder){p.x=ladder.x;p.climb={x:ladder.x,target:p.floor+(vertical<0?1:-1)};return;}
      }
      if(horizontal){p.facing=Math.sign(horizontal);p.x=Math.max(p.floor===6?460:LEFT+6,Math.min(p.floor===6?590:RIGHT-6,p.x+horizontal*84*dt));}
      if(jump&&!this.jumpHeld&&!p.air&&!this.hammer){p.air=true;p.vy=-155;this.jumpHeld=true;for(const b of this.barrels)b.jumped=false;}
      if(p.air){p.vy+=500*dt;p.y+=p.vy*dt;if(p.vy>0&&p.y>=girderY(p.floor,p.x)){p.y=girderY(p.floor,p.x);p.air=false;p.vy=0;}}
      else p.y=girderY(p.floor,p.x);
    }
    for(const item of this.hammers)if(!item.taken&&!p.air&&!p.climb&&item.floor===p.floor&&Math.abs(item.x-p.x)<14){item.taken=true;this.hammer=8;}
    if(p.floor===6&&p.x>=500){this.won=true;this.victoryTime=0;this.score+=1000+Math.ceil(this.time)*10;return;}
    this.spawnIn-=dt;
    if(this.spawnIn<=0){this.barrels.push({x:100,y:girderY(5,100),floor:5,falling:false,jumped:false});this.spawnIn=2.5;}
    for(const b of this.barrels){
      if(b.falling){
        b.y+=110*dt;
        if(b.y>=girderY(b.floor,b.x)){b.y=girderY(b.floor,b.x);b.falling=false;}
      }else{
        b.x+=(b.floor%2?1:-1)*70*dt;b.y=girderY(b.floor,b.x);
        if(b.x>RIGHT||b.x<LEFT){b.x=Math.max(LEFT,Math.min(RIGHT,b.x));b.floor--;b.falling=true;}
      }
      if(b.floor<0){b.gone=true;continue;}
      if(this.hammerHits(b)){b.gone=true;this.score+=300;continue;}
      if(Math.abs(b.x-p.x)<11&&p.y>b.y-10&&p.y-15<b.y){this.die();return;}
      if(p.air&&!b.jumped&&Math.abs(b.x-p.x)<10&&p.y<=b.y-10&&p.y>b.y-38){b.jumped=true;this.score+=100;}
    }
    this.barrels=this.barrels.filter(b=>!b.gone);
  }
  draw(ctx){
    ctx.fillStyle='#000000';ctx.fillRect(0,0,640,360);ctx.textAlign='center';
    ctx.fillStyle='#ffffff';ctx.font='bold 16px monospace';ctx.fillText('KONGY KONG',320,20);
    ctx.fillText(`SCORE ${this.score}`,105,20);ctx.fillText(`LIVES ${this.lives}`,540,20);
    if(this.over||this.won){
      ctx.fillStyle=this.won?'#ffff00':'#ff3030';ctx.font='bold 32px monospace';
      ctx.fillText(this.won?'LEVEL 1 COMPLETE!':'GAME OVER',320,this.won?90:150);
      ctx.font='18px monospace';ctx.fillStyle='#ffffff';
      ctx.fillText(`SCORE ${this.score}`,320,this.won?125:195);
      if(this.won){
        ctx.fillStyle='#ff3058';ctx.fillRect(60,225,560,4);
        const pose=this.escapePose();
        drawCharacter(ctx,'monkey',pose.monkeyX,pose.monkeyY,2);
        drawCharacter(ctx,'girl',pose.girlX,pose.girlY);
      }
      ctx.font='14px monospace';ctx.fillStyle='#ffffff';
      ctx.fillText(this.won?'LEVEL 1 RESTARTING...':'SPACE / ENTER TO RETURN',320,280);
      ctx.textAlign='start';return;
    }
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    const sprite=(name,x,y,scale=1)=>drawCharacter(ctx,name,x,y,scale);
    // Red girders and cyan ladders against the original black arcade backdrop.
    for(let floor=0;floor<7;floor++){
      const start=floor===6?460:LEFT,end=floor===6?590:RIGHT;
      for(let x=start;x<end;x+=8)rect(x,girderY(floor,x),8,3,'#ff3058');
      for(let x=start;x<end;x+=16){const y=girderY(floor,x);rect(x,y+7,16,2,'#ff3058');rect(x+4,y+3,3,4,'#ff3058');}
    }
    for(const l of KONG_LADDERS){
      const top=girderY(l.floor+1,l.x),bottom=girderY(l.floor,l.x);
      rect(l.x-6,top,2,Math.ceil(bottom-top),'#00dfff');rect(l.x+5,top,2,Math.ceil(bottom-top),'#00dfff');
      for(let y=top+4;y<bottom;y+=6)rect(l.x-4,y,9,2,'#00dfff');
    }
    sprite('monkey',60,70,2);sprite('girl',540,48);
    rect(46,91,10,14,'#b86b18');rect(34,91,10,14,'#b86b18');
    const hammer=(x,y,side=1)=>{rect(x,y-14,3,14,'#ffbd80');rect(x+(side<0?-9:-3),y-19,12,7,'#00dfff');};
    for(const h of this.hammers)if(!h.taken)hammer(h.x,girderY(h.floor,h.x)-7);
    for(const b of this.barrels){rect(b.x-6,b.y-10,12,10,'#b86b18');rect(b.x-4,b.y-9,2,8,'#ffbd80');rect(b.x+2,b.y-9,2,8,'#ffbd80');rect(b.x-3,b.y-6,6,2,'#702800');}
    const p=this.player;
    if(!this.delay||Math.floor(this.clock*10)%2)sprite('player',p.x-6,p.y-14);
    if(this.hammer){
      const head=this.hammerPose();
      if(head.state==='raised')rect(p.x-1,p.y-26,3,17,'#ffbd80');
      else rect(p.facing>0?p.x+3:p.x-18,p.y-9,15,3,'#ffbd80');
      rect(head.x,head.y,head.w,head.h,'#00dfff');
    }
    rect(32,303,17,20,'#2448ee');rect(32,303,17,3,'#00dfff');
    ctx.fillStyle='#ffffff';ctx.font='10px monospace';ctx.fillText(`TIME ${Math.ceil(this.time)} · ← → / A D MOVE · ↑ ↓ / W S CLIMB · SPACE JUMP · ESC LEAVE`,320,352);
    if(this.hammer){ctx.fillStyle='#ffff00';ctx.fillText(`HAMMER ${Math.ceil(this.hammer)}`,320,39);}
    ctx.textAlign='start';
  }
}
