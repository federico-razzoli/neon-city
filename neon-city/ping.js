// Ping: one player, three lives, and a computer opponent.
export class Ping{
  width=640;height=360;lives=3;score=0;playerY=180;computerY=180;over=false;
  constructor(random=Math.random){this.random=random;this.serve();}
  serve(){this.x=320;this.y=180;this.vx=-220;this.vy=(this.random()-.5)*180;this.delay=.7;}
  update(dt,direction=0){
    if(this.over)return;
    // Small steps keep fast balls from passing through a paddle.
    const steps=Math.max(1,Math.ceil(Math.min(dt,.1)/.008)),step=Math.min(dt,.1)/steps;
    for(let i=0;i<steps&&!this.over;i++)this.step(step,direction);
  }
  step(dt,direction){
    this.playerY=Math.max(63,Math.min(309,this.playerY+direction*300*dt));
    this.computerY=Math.max(63,Math.min(309,this.computerY+Math.max(-1,Math.min(1,(this.y-this.computerY)/35))*170*dt));
    if(this.delay>0){this.delay-=dt;return;}
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(this.y<35){this.y=70-this.y;this.vy=Math.abs(this.vy);}
    if(this.y>337){this.y=674-this.y;this.vy=-Math.abs(this.vy);}
    if(this.vx<0&&this.x<=36&&this.x>=24&&Math.abs(this.y-this.playerY)<=33){
      this.x=36;this.vx=Math.min(420,Math.abs(this.vx)+12);this.vy=(this.y-this.playerY)*7;
      this.score+=10;
    }
    if(this.vx>0&&this.x>=604&&this.x<=616&&Math.abs(this.y-this.computerY)<=33){
      this.x=604;this.vx=-Math.abs(this.vx);this.vy=(this.y-this.computerY)*7;
    }
    if(this.x<0){this.lives--;if(!this.lives)this.over=true;else this.serve();}
    else if(this.x>640){this.score+=100;this.serve();}
  }
  draw(ctx){
    ctx.fillStyle='#080e18';ctx.fillRect(0,0,640,360);
    ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillStyle='#8fffe1';
    ctx.fillText('PING',320,23);ctx.fillText(`SCORE ${this.score}`,120,23);ctx.fillText(`LIVES ${this.lives}`,520,23);
    if(this.over){
      ctx.fillStyle='#ffdb97';ctx.font='bold 38px monospace';ctx.fillText('GAME OVER',320,160);
      ctx.font='18px monospace';ctx.fillText(`SCORE ${this.score}`,320,197);
      ctx.font='14px monospace';ctx.fillText('SPACE / ENTER TO RETURN',320,233);
      ctx.textAlign='start';return;
    }
    ctx.fillStyle='#294b51';ctx.fillRect(0,30,640,2);ctx.fillRect(0,340,640,2);
    for(let y=40;y<338;y+=16)ctx.fillRect(319,y,2,8);
    ctx.fillStyle='#8fffe1';ctx.fillRect(24,this.playerY-28,8,56);ctx.fillRect(608,this.computerY-28,8,56);
    ctx.fillStyle='#fff4ce';ctx.fillRect(this.x-4,this.y-4,8,8);
    ctx.font='11px monospace';ctx.fillText('↑ ↓ / W S MOVE · ESC LEAVE',320,355);
    ctx.textAlign='start';
  }
}
