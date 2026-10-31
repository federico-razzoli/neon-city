// Grog: cross traffic and ride wooden platforms to the far bank.
const WIDTH=640,TOP=40,CELL=40,ROW=24;
const wrap=(value,size)=>((value%size)+size)%size;
export class Frog{
  kind='frog';lives=3;score=0;level=1;over=false;crossed=false;restartIn=0;time=40;cooldown=0;delay=0;
  lanes=[
    {row:1,speed:38,length:80,spacing:180,offset:10,water:true},
    {row:2,speed:-48,length:88,spacing:210,offset:60,water:true},
    {row:3,speed:45,length:82,spacing:195,offset:0,water:true},
    {row:4,speed:-36,length:88,spacing:200,offset:90,water:true},
    {row:6,speed:-70,length:48,spacing:175,offset:40},
    {row:7,speed:58,length:65,spacing:210,offset:100},
    {row:8,speed:-90,length:45,spacing:180,offset:20},
    {row:9,speed:65,length:60,spacing:220,offset:80},
    {row:10,speed:-55,length:50,spacing:200,offset:120}
  ];
  constructor(){this.reset();}
  reset(){this.x=300;this.row=11;this.furthest=11;this.time=40;this.cooldown=.15;}
  objects(lane){
    const period=lane.spacing*4,first=wrap(lane.offset,period)-period;
    const objects=[];
    for(let x=first;x<WIDTH;x+=lane.spacing)if(x+lane.length>0)objects.push(x);
    return objects;
  }
  die(){
    if(this.over||this.crossed||this.delay>0)return;
    if(--this.lives===0)this.over=true;
    else{this.reset();this.delay=.65;}
  }
  hop(dx,dy){
    if(this.over||this.crossed||this.delay>0||this.cooldown>0)return;
    this.cooldown=.15;
    this.x=Math.max(20,Math.min(620,this.x+dx*CELL));
    this.row=Math.max(0,Math.min(11,this.row+dy));
    if(this.row<this.furthest){this.score+=10;this.furthest=this.row;}
    if(this.row===0){
      this.score+=100+Math.ceil(this.time);
      this.crossed=true;this.restartIn=5;
    }
  }
  continueCrossing(){
    if(!this.crossed)return;
    this.crossed=false;this.restartIn=0;this.level++;this.reset();
  }
  update(dt,vertical=0,horizontal=0){
    if(this.over)return;
    if(this.crossed){
      this.restartIn=Math.max(0,this.restartIn-Math.max(0,dt));
      if(this.restartIn<=.000001)this.continueCrossing();
      return;
    }
    const steps=Math.max(1,Math.ceil(Math.min(dt,.25)/.016));
    for(let i=0;i<steps&&!this.over&&!this.crossed;i++)this.step(Math.min(dt,.25)/steps,vertical,horizontal);
  }
  step(dt,vertical,horizontal){
    for(const lane of this.lanes)lane.offset+=lane.speed*(1+(this.level-1)*.12)*dt;
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.delay>0){this.delay=Math.max(0,this.delay-dt);return;}
    this.time-=dt;if(this.time<=0){this.die();return;}
    if(vertical||horizontal)this.hop(vertical?0:horizontal,vertical);
    if(this.over||this.crossed||this.delay>0)return;
    const lane=this.lanes.find(l=>l.row===this.row);
    if(!lane)return;
    const objects=this.objects(lane);
    if(lane.water){
      if(!objects.some(x=>this.x>=x+8&&this.x<=x+lane.length-8)){this.die();return;}
      this.x+=lane.speed*(1+(this.level-1)*.12)*dt;
      if(this.x<10||this.x>630)this.die();
    }else if(objects.some(x=>this.x+11>x&&this.x-11<x+lane.length))this.die();
  }
  draw(ctx){
    ctx.fillStyle='#090f20';ctx.fillRect(0,0,640,360);
    ctx.textAlign='center';ctx.font='bold 17px monospace';ctx.fillStyle='#b6f780';
    ctx.fillText('GROG',320,22);ctx.fillText(`SCORE ${this.score}`,100,22);ctx.fillText(`LIVES ${this.lives}`,530,22);
    if(this.over||this.crossed){
      ctx.fillStyle=this.over?'#ffdb97':'#b6f780';
      ctx.font=this.over?'bold 38px monospace':'bold 24px monospace';
      ctx.fillText(this.over?'GAME OVER':'CONGRATS, YOU CROSSED THE ROAD!',320,153);
      ctx.font='18px monospace';ctx.fillText(`SCORE ${this.score}`,320,195);
      ctx.font='14px monospace';
      ctx.fillText(this.over?'SPACE / ENTER TO RETURN':`PRESS ANY BUTTON · NEXT CROSSING IN ${Math.ceil(this.restartIn)}`,320,235);
      ctx.textAlign='start';return;
    }
    const frog=(x,y)=>{
      ctx.fillStyle='#9bf25e';ctx.fillRect(x-9,y-7,18,15);
      for(const side of [-1,1]){ctx.fillRect(x+side*12-3,y-9,6,6);ctx.fillRect(x+side*12-3,y+4,6,7);}
      ctx.fillStyle='#12232a';ctx.fillRect(x-7,y-7,3,3);ctx.fillRect(x+4,y-7,3,3);
    };
    for(let row=0;row<12;row++){
      const y=TOP+row*ROW;
      ctx.fillStyle=row===0||row===5||row===11?'#385033':row<5?'#173d68':'#272c3a';ctx.fillRect(0,y,640,ROW);
      if(row>=6&&row<=10){ctx.fillStyle='#687078';for(let x=0;x<640;x+=40)ctx.fillRect(x,y+ROW-1,18,1);}
    }
    for(const lane of this.lanes)for(const x of this.objects(lane)){
      const y=TOP+lane.row*ROW;
      ctx.fillStyle=lane.water?'#aa7040':lane.row%2?'#eaa44b':'#df6387';ctx.fillRect(x,y+3,lane.length,18);
      ctx.fillStyle=lane.water?'#68432c':'#86bdd4';ctx.fillRect(x+8,y+6,lane.water?lane.length-16:14,lane.water?3:12);
      if(!lane.water){ctx.fillStyle='#111827';for(const off of [7,lane.length-14]){ctx.fillRect(x+off,y+1,7,3);ctx.fillRect(x+off,y+20,7,3);}}
    }
    if(!this.delay||Math.floor(this.delay*12)%2)frog(this.x,TOP+this.row*ROW+12);
    ctx.fillStyle='#b6f780';ctx.font='11px monospace';ctx.fillText(`TIME ${Math.ceil(this.time)} · LEVEL ${this.level} · ↑ ↓ ← → / W A S D · ESC LEAVE`,320,349);
    ctx.textAlign='start';
  }
}
