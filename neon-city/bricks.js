// SPDX-License-Identifier: AGPL-3.0-only
// Bricks: a modern brick breaker with falling power-ups. Each token buys three lives.
// A narrow, tall playfield sits between two side panels, as in classic cabinets.
const LEFT=166,RIGHT=474,TOP=24,BOTTOM=356,PADDLE_Y=334,PADDLE_H=8,BALL_R=4;
// A thin strip of water lies just below the paddle; lost balls splash into it.
const WATER_Y=346;
const COLS=11,BRICK_W=26,BRICK_H=11,GAP=2,FIELD_X=LEFT+(RIGHT-LEFT-(COLS*BRICK_W+(COLS-1)*GAP))/2,FIELD_Y=56;
const BASE_SPEED=220,MAX_BALL_SPEED=380,EFFECT_TIME=10;
// Every ball keeps at least this share of its speed moving vertically.
const MIN_VERTICAL=.3;
// The paddle reaches 240 px/s in about 0.11 s and, once released, stops in about 0.06 s:
// a short ramp up allows precise nudges, a shorter ramp down avoids sliding past the ball.
// Worst case: the fastest ball (380 px/s) leaving the lowest brick row (bottom at y 171)
// falls 163 px at no less than 0.3*380 px/s, so it takes at least 1.43 s to reach
// the paddle. Crossing the whole field (308 - 52 = 256 px) takes the paddle 1.12 s.
const PADDLE_SPEED=240,PADDLE_ACCEL=2200,PADDLE_DECEL=4000;
// No brick colour is red: red is reserved for the DIE capsule.
const BRICK_COLOURS={c:'#38d9ff',b:'#5b7dff',v:'#a56bff',g:'#45e39b',y:'#ffd84d',t:'#2fe0c6',p:'#ff6fd8',s:'#c9d2e3'};
const LEVELS=[
  ['sssssssssss','ppppppppppp','vvvvvvvvvvv','bbbbbbbbbbb','ccccccccccc','ggggggggggg','yyyyyyyyyyy'],
  ['.....s.....','....sys....','...syyys...','..scccccs..','.vvvvvvvvv.','bbbbbbbbbbb','.ggggggggg.','..ttttttt..','...ppppp...'],
  ['c.v.b.g.y.t','c.v.b.g.y.t','s.s.s.s.s.s','c.v.b.g.y.t','c.v.b.g.y.t','s.s.s.s.s.s','c.v.b.g.y.t'],
  ['ppp.....ppp','vvvv...vvvv','.bbbb.bbbb.','.cccsssccc.','..ggg.ggg..','.yyyy.yyyy.','tttt...tttt']
];
// Capsules carry no text: each has its own colour and a drawn symbol. Only DIE is red.
export const POWER_UPS={
  fast:{colour:'#ff9f1c',weight:1},
  slow:{colour:'#3fa7ff',weight:1},
  multi:{colour:'#33d46e',weight:1},
  laser:{colour:'#b06cff',weight:1},
  die:{colour:'#ff1f2e',weight:.8}
};
export class Bricks{
  kind='bricks';width=640;height=360;lives=3;score=0;level=0;over=false;
  balls=[];capsules=[];bolts=[];particles=[];ripples=[];ending=0;fireHeld=true;clock=0;shake=0;
  constructor(random=Math.random){this.random=random;this.loadLevel();}
  loadLevel(){
    const layout=LEVELS[this.level%LEVELS.length];
    this.bricks=[];
    layout.forEach((row,r)=>[...row].forEach((c,col)=>{
      if(!BRICK_COLOURS[c])return;
      this.bricks.push({x:FIELD_X+col*(BRICK_W+GAP),y:FIELD_Y+r*(BRICK_H+GAP),w:BRICK_W,h:BRICK_H,colour:BRICK_COLOURS[c],hits:c==='s'?2:1,flash:0});
    }));
    this.resetServe();
  }
  resetServe(){
    this.paddle={x:(LEFT+RIGHT)/2,w:52,vx:0};
    this.balls=[{x:this.paddle.x,y:PADDLE_Y-BALL_R-1,vx:0,vy:0,stuck:true,offset:0}];
    this.capsules=[];this.bolts=[];this.speedFactor=1;this.speedTime=0;this.laser=0;this.cooldown=0;
    this.delay=.6;
  }
  get speed(){return Math.min(MAX_BALL_SPEED,BASE_SPEED*(1+Math.min(this.level,6)*.06)*this.speedFactor);}
  // Only the DIE capsule explodes; a ball lost in the water has already splashed.
  loseLife(explodeAt=null){
    if(explodeAt){this.burst(explodeAt.x,explodeAt.y,'#ff3b3b',36,200);this.shake=.35;this.tone(110,.35,'sawtooth',.18);}
    // The last splash (or explosion) plays out before the GAME OVER screen.
    if(--this.lives<=0){this.lives=0;this.ending=1.3;this.balls=[];this.capsules=[];this.bolts=[];return;}
    this.resetServe();
    if(!explodeAt)this.delay=1;
  }
  splash(x){
    this.ripples.push({x,t:0});
    // A small crown of round droplets that barely rises above the surface.
    for(let i=0;i<10;i++){
      const vx=(this.random()-.5)*70,vy=-(90+this.random()*60);
      this.particles.push({x:x+(this.random()-.5)*6,y:WATER_Y,vx,vy,gravity:620,life:1,colour:this.random()<.5?'#8fb7d8':'#6b98c2',water:true});
    }
    this.splashSound();
  }
  splashSound(){
    const ctx=this.audioContext;if(!ctx||ctx.state!=='running')return;
    const buffer=splashSamples(ctx),source=ctx.createBufferSource(),highpass=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;highpass.type='highpass';highpass.frequency.value=120;gain.gain.value=.4;
    source.connect(highpass);highpass.connect(gain);gain.connect(ctx.destination);
    source.onended=()=>{source.disconnect();highpass.disconnect();gain.disconnect();};
    source.start();
  }
  update(dt,vertical=0,horizontal=0,fire=false){
    if(this.over)return;
    const time=Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(time/.004));
    for(let i=0;i<steps&&!this.over;i++)this.step(time/steps,horizontal,fire);
    this.fireHeld=fire;
  }
  step(dt,horizontal,fire){
    this.clock+=dt;this.shake=Math.max(0,this.shake-dt);
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gravity??260)*dt;p.life-=dt;}
    // Droplets vanish back into the water.
    this.particles=this.particles.filter(p=>p.life>0&&!(p.water&&p.vy>0&&p.y>=WATER_Y));
    for(const r of this.ripples)r.t+=dt;
    this.ripples=this.ripples.filter(r=>r.t<1.4);
    if(this.ending>0){this.ending-=dt;if(this.ending<=0)this.over=true;return;}
    for(const b of this.bricks)b.flash=Math.max(0,b.flash-dt);
    // The paddle eases toward full speed for precise but responsive control.
    const pad=this.paddle,target=horizontal*PADDLE_SPEED;
    // Releasing or reversing the key brakes at the faster rate.
    const rate=!horizontal||pad.vx*horizontal<0?PADDLE_DECEL:PADDLE_ACCEL;
    pad.vx+=Math.sign(target-pad.vx)*Math.min(Math.abs(target-pad.vx),rate*dt);
    const x=Math.max(LEFT+pad.w/2,Math.min(RIGHT-pad.w/2,pad.x+pad.vx*dt));
    if(x!==pad.x+pad.vx*dt)pad.vx=0;
    pad.x=x;
    if(this.delay>0){this.delay-=dt;for(const b of this.balls)if(b.stuck)b.x=pad.x+b.offset;return;}
    const pressed=fire&&!this.fireHeld;
    if(this.speedTime>0){this.speedTime-=dt;if(this.speedTime<=0){this.speedFactor=1;this.retime();}}
    this.laser=Math.max(0,this.laser-dt);this.cooldown=Math.max(0,this.cooldown-dt);
    for(const b of this.balls)if(b.stuck){
      b.x=pad.x+b.offset;b.y=PADDLE_Y-BALL_R-1;
      if(pressed){b.stuck=false;const angle=-Math.PI/2+Math.max(-.45,Math.min(.45,pad.vx/1000));b.vx=Math.cos(angle)*this.speed;b.vy=Math.sin(angle)*this.speed;this.tone(660,.06);}
    }
    if(this.laser>0&&fire&&this.cooldown<=0){
      this.cooldown=.3;
      for(const side of [-1,1])this.bolts.push({x:pad.x+side*(pad.w/2-5),y:PADDLE_Y-5});
      this.tone(1250,.05,'square',.05);
    }
    for(const bolt of this.bolts){
      bolt.y-=520*dt;
      const brick=this.bricks.find(b=>bolt.x>=b.x&&bolt.x<=b.x+b.w&&bolt.y>=b.y&&bolt.y<=b.y+b.h);
      if(brick){bolt.gone=true;this.hitBrick(brick);}
      else if(bolt.y<TOP)bolt.gone=true;
    }
    this.bolts=this.bolts.filter(b=>!b.gone);
    for(const ball of this.balls)if(!ball.stuck)this.moveBall(ball,dt);
    this.balls=this.balls.filter(b=>!b.gone);
    if(!this.balls.length){this.loseLife();return;}
    for(const c of this.capsules){
      c.y+=75*dt;c.spin+=dt;
      if(c.y+6>=PADDLE_Y&&c.y-6<=PADDLE_Y+PADDLE_H&&Math.abs(c.x-pad.x)<=pad.w/2+14){c.gone=true;this.collect(c);if(this.over||c.type==='die')return;}
      else if(c.y>=WATER_Y)c.gone=true;
    }
    this.capsules=this.capsules.filter(c=>!c.gone);
    if(!this.bricks.length){
      this.score+=500+this.lives*100;this.level++;this.tone(880,.25,'triangle',.12);this.loadLevel();this.delay=1.2;
    }
  }
  moveBall(ball,dt){
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<LEFT+BALL_R){ball.x=LEFT+BALL_R;ball.vx=Math.abs(ball.vx);this.tone(330,.03);}
    if(ball.x>RIGHT-BALL_R){ball.x=RIGHT-BALL_R;ball.vx=-Math.abs(ball.vx);this.tone(330,.03);}
    if(ball.y<TOP+BALL_R){ball.y=TOP+BALL_R;ball.vy=Math.abs(ball.vy);this.tone(330,.03);}
    const pad=this.paddle;
    if(ball.vy>0&&ball.y+BALL_R>=PADDLE_Y&&ball.y-BALL_R<=PADDLE_Y+PADDLE_H&&Math.abs(ball.x-pad.x)<=pad.w/2+BALL_R){
      // Where the ball lands on the paddle sets its rebound angle.
      const hit=Math.max(-1,Math.min(1,(ball.x-pad.x)/(pad.w/2))),angle=-Math.PI/2+hit*1.0;
      ball.vx=Math.cos(angle)*this.speed;ball.vy=Math.sin(angle)*this.speed;ball.y=PADDLE_Y-BALL_R;
      this.tone(520,.05);
    }
    if(ball.y>=WATER_Y){ball.gone=true;this.splash(ball.x);return;}
    for(const b of this.bricks){
      const nx=Math.max(b.x,Math.min(ball.x,b.x+b.w)),ny=Math.max(b.y,Math.min(ball.y,b.y+b.h));
      const dx=ball.x-nx,dy=ball.y-ny;
      if(dx*dx+dy*dy>BALL_R*BALL_R)continue;
      // Reflect along the axis of least penetration.
      const overlapX=Math.min(ball.x+BALL_R-b.x,b.x+b.w-(ball.x-BALL_R)),overlapY=Math.min(ball.y+BALL_R-b.y,b.y+b.h-(ball.y-BALL_R));
      if(overlapX<overlapY){ball.vx=ball.x<b.x+b.w/2?-Math.abs(ball.vx):Math.abs(ball.vx);ball.x+=ball.vx>0?overlapX:-overlapX;}
      else{ball.vy=ball.y<b.y+b.h/2?-Math.abs(ball.vy):Math.abs(ball.vy);ball.y+=ball.vy>0?overlapY:-overlapY;}
      // Avoid endless near-horizontal bounces.
      steep(ball,this.speed);
      this.hitBrick(b);
      break;
    }
  }
  hitBrick(b){
    b.hits--;b.flash=.12;
    if(b.hits>0){this.score+=10;this.tone(990,.04,'triangle');return;}
    this.score+=50;this.tone(760+this.random()*200,.05,'triangle');
    this.burst(b.x+b.w/2,b.y+b.h/2,b.colour,12,120);
    this.bricks.splice(this.bricks.indexOf(b),1);
    if(this.random()<.2){
      const types=Object.keys(POWER_UPS),total=types.reduce((sum,t)=>sum+POWER_UPS[t].weight,0);
      let pick=this.random()*total,type=types[0];
      for(const t of types){pick-=POWER_UPS[t].weight;if(pick<=0){type=t;break;}}
      this.capsules.push({type,x:b.x+b.w/2,y:b.y+b.h/2,spin:0});
    }
  }
  retime(){for(const b of this.balls)if(!b.stuck){const s=Math.hypot(b.vx,b.vy)||1;b.vx*=this.speed/s;b.vy*=this.speed/s;}}
  collect(c){
    if(c.type==='die'){this.loseLife({x:c.x,y:PADDLE_Y});return;}
    this.score+=100;this.tone(1046,.12,'sine',.1);
    if(c.type==='fast'||c.type==='slow'){this.speedFactor=c.type==='fast'?1.45:.62;this.speedTime=EFFECT_TIME;this.retime();}
    if(c.type==='laser'){this.laser=EFFECT_TIME;this.cooldown=.15;}
    if(c.type==='multi'){
      // Every ball splits into two, angled apart.
      const extra=[];
      for(const b of this.balls){
        if(b.stuck){b.stuck=false;b.vx=0;b.vy=-this.speed;}
        if(this.balls.length+extra.length>=12)break;
        const angle=Math.atan2(b.vy,b.vx)+.4,s=this.speed;
        extra.push(steep({x:b.x,y:b.y,vx:Math.cos(angle)*s,vy:Math.sin(angle)*s,stuck:false,offset:0},s));
        const back=Math.atan2(b.vy,b.vx)-.2;b.vx=Math.cos(back)*s;b.vy=Math.sin(back)*s;steep(b,s);
      }
      this.balls.push(...extra);
    }
  }
  burst(x,y,colour,count,speed){
    for(let i=0;i<count;i++){
      const a=this.random()*Math.PI*2,v=speed*(.3+this.random()*.7);
      this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:.35+this.random()*.35,colour});
    }
    if(this.particles.length>400)this.particles.splice(0,this.particles.length-400);
  }
  tone(frequency,duration,type='square',volume=.06){
    const ctx=this.audioContext;if(!ctx||ctx.state!=='running')return;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(frequency,now);
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0005,now+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    osc.start(now);osc.stop(now+duration+.02);
  }
  drawCapsule(ctx,type,x,y,spin=0){
    const {colour}=POWER_UPS[type],w=26,h=12;
    const g=ctx.createLinearGradient(0,y-h/2,0,y+h/2);
    g.addColorStop(0,'#ffffff');g.addColorStop(.25,colour);g.addColorStop(1,shade(colour,-.45));
    ctx.save();ctx.shadowColor=colour;ctx.shadowBlur=10;
    roundRect(ctx,x-w/2,y-h/2,w,h,h/2);ctx.fillStyle=g;ctx.fill();ctx.restore();
    // A sweeping highlight hints that the capsule is rolling.
    const band=x-w/2+((spin*34)%w);
    ctx.save();roundRect(ctx,x-w/2,y-h/2,w,h,h/2);ctx.clip();ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(band,y-h/2,4,h);ctx.restore();
    ctx.lineWidth=1.2;ctx.strokeStyle=type==='die'?'#ffe0e0':'rgba(255,255,255,.85)';roundRect(ctx,x-w/2,y-h/2,w,h,h/2);ctx.stroke();
    symbol(ctx,type,x,y);
  }
  draw(ctx){
    ctx.save();
    if(this.shake>0)ctx.translate((this.random()-.5)*8*this.shake,(this.random()-.5)*8*this.shake);
    const bg=ctx.createLinearGradient(0,0,0,360);bg.addColorStop(0,'#090b20');bg.addColorStop(1,'#140922');
    ctx.fillStyle=bg;ctx.fillRect(-10,-10,660,380);
    // Playfield: a plain, slightly darker well.
    const field=ctx.createLinearGradient(0,TOP,0,BOTTOM);field.addColorStop(0,'#0e1438');field.addColorStop(1,'#1d0f36');
    ctx.fillStyle=field;ctx.fillRect(LEFT,TOP,RIGHT-LEFT,BOTTOM-TOP);
    ctx.save();ctx.shadowColor='#5b7dff';ctx.shadowBlur=10;ctx.strokeStyle='#7f9bff';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(LEFT-2,BOTTOM+4);ctx.lineTo(LEFT-2,TOP-2);ctx.lineTo(RIGHT+2,TOP-2);ctx.lineTo(RIGHT+2,BOTTOM+4);ctx.stroke();ctx.restore();
    this.drawWater(ctx);
    this.drawPanels(ctx);
    if(this.over){
      ctx.textAlign='center';ctx.fillStyle='#ffd84d';ctx.font='bold 30px sans-serif';ctx.fillText('GAME OVER',320,160);
      ctx.font='15px sans-serif';ctx.fillText(`SCORE ${this.score}`,320,192);
      ctx.font='12px sans-serif';ctx.fillText('SPACE / ENTER TO RETURN',320,224);
      this.drawParticles(ctx);ctx.restore();ctx.textAlign='start';return;
    }
    for(const b of this.bricks){
      const silver=b.colour===BRICK_COLOURS.s,g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);
      const base=silver&&b.hits===1?'#8e97aa':b.colour;
      g.addColorStop(0,shade(base,.45));g.addColorStop(.5,base);g.addColorStop(1,shade(base,-.35));
      roundRect(ctx,b.x,b.y,b.w,b.h,3);ctx.fillStyle=b.flash>0?'#ffffff':g;ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.35)';roundRect(ctx,b.x+2,b.y+1.5,b.w-4,2,1);ctx.fill();
      if(silver){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1;roundRect(ctx,b.x+.5,b.y+.5,b.w-1,b.h-1,3);ctx.stroke();}
    }
    for(const c of this.capsules)this.drawCapsule(ctx,c.type,c.x,c.y,c.spin);
    ctx.fillStyle='#e4b3ff';ctx.save();ctx.shadowColor='#c58bff';ctx.shadowBlur=8;
    for(const bolt of this.bolts)ctx.fillRect(bolt.x-1,bolt.y-7,2.5,10);ctx.restore();
    const pad=this.paddle,px=pad.x-pad.w/2;
    roundRect(ctx,px,PADDLE_Y,pad.w,PADDLE_H,4);ctx.fillStyle='#4f7fa3';ctx.fill();
    ctx.fillStyle=this.laser>0?'#7a58a6':'#36617f';roundRect(ctx,px+2,PADDLE_Y+2.5,8,3,1.5);ctx.fill();roundRect(ctx,px+pad.w-10,PADDLE_Y+2.5,8,3,1.5);ctx.fill();
    if(this.laser>0){ctx.fillStyle='#8f7aae';for(const side of [-1,1])ctx.fillRect(pad.x+side*(pad.w/2-5)-1.5,PADDLE_Y-5,3,6);}
    for(const ball of this.balls){
      ctx.fillStyle='#b8c4d4';ctx.beginPath();ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);ctx.fill();
    }
    this.drawParticles(ctx);
    if(this.balls.some(b=>b.stuck)){
      ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 13px sans-serif';
      ctx.fillText(`LEVEL ${this.level+1}`,320,250);ctx.font='11px sans-serif';ctx.fillText('SPACE TO LAUNCH',320,268);
    }
    ctx.restore();ctx.textAlign='start';
  }
  drawPanels(ctx){
    // Left: title, score, lives, level and active effects.
    ctx.textAlign='center';
    ctx.save();ctx.shadowColor='#38d9ff';ctx.shadowBlur=10;ctx.fillStyle='#8fe9ff';ctx.font='bold 24px sans-serif';ctx.fillText('BRICKS',83,52);ctx.restore();
    const stat=(label,value,y)=>{ctx.fillStyle='#8f9bd6';ctx.font='bold 11px sans-serif';ctx.fillText(label,83,y);ctx.fillStyle='#ffffff';ctx.font='bold 20px sans-serif';ctx.fillText(value,83,y+22);};
    stat('SCORE',String(this.score),100);stat('LIVES',String(this.lives),156);stat('LEVEL',String(this.level+1),212);
    const status=[];
    if(this.speedTime>0)status.push([this.speedFactor>1?'FAST':'SLOW',this.speedTime,this.speedFactor>1?POWER_UPS.fast.colour:POWER_UPS.slow.colour]);
    if(this.laser>0)status.push(['LASER',this.laser,POWER_UPS.laser.colour]);
    ctx.font='bold 12px sans-serif';
    status.forEach(([label,t,colour],i)=>{ctx.fillStyle=colour;ctx.fillText(`${label} ${Math.ceil(t)}`,83,276+i*18);});
    // Right: controls.
    ctx.fillStyle='#8f9bd6';ctx.font='bold 11px sans-serif';ctx.fillText('CONTROLS',557,100);
    ctx.fillStyle='#c8d2ff';ctx.font='10px sans-serif';
    ['← → / A D  MOVE','SPACE  LAUNCH / SHOOT','ESC  LEAVE'].forEach((s,i)=>ctx.fillText(s,557,122+i*16));
  }
  drawWater(ctx){
    // Gentle swell plus rings spreading out from each splash.
    const surface=x=>{
      let y=WATER_Y+Math.sin(x*.07+this.clock*2.2)*.8;
      for(const r of this.ripples){
        const d=Math.abs(x-r.x),front=r.t*70;
        if(d<front)y+=Math.sin((d-front)*.35)*2.6*(1-r.t/1.4)*Math.max(0,1-(front-d)/40);
      }
      return y;
    };
    ctx.beginPath();ctx.moveTo(LEFT,BOTTOM);
    for(let x=LEFT;x<=RIGHT;x+=2)ctx.lineTo(x,surface(x));
    ctx.lineTo(RIGHT,BOTTOM);ctx.closePath();
    const g=ctx.createLinearGradient(0,WATER_Y,0,BOTTOM);g.addColorStop(0,'#24507a');g.addColorStop(1,'#122a48');
    ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();for(let x=LEFT;x<=RIGHT;x+=2)x===LEFT?ctx.moveTo(x,surface(x)):ctx.lineTo(x,surface(x));
    ctx.strokeStyle='#5f8db8';ctx.lineWidth=1;ctx.stroke();
  }
  drawParticles(ctx){
    for(const p of this.particles){
      ctx.globalAlpha=Math.max(0,Math.min(1,p.life*2.5));ctx.fillStyle=p.colour;
      if(p.water){ctx.beginPath();ctx.arc(p.x,p.y,1.3,0,Math.PI*2);ctx.fill();}
      else ctx.fillRect(p.x-1,p.y-1,2.5,2.5);
    }
    ctx.globalAlpha=1;
  }
}
// A splash is rendered sample by sample: a burst of softened noise for the spray,
// whose level sloshes unevenly, plus a low "plunk" and a cluster of small bubbles.
// Each bubble is a short sine whose pitch rises as it decays, which is what makes
// synthesized water sound wet rather than like a beep.
function splashSamples(ctx){
  const rate=ctx.sampleRate,length=Math.ceil(rate*.7),buffer=ctx.createBuffer(1,length,rate),data=buffer.getChannelData(0);
  const smoothing=1-Math.exp(-2*Math.PI*2400/rate),sloshEvery=Math.floor(rate/45);
  let soft=0,slosh=1,sloshTarget=1;
  for(let i=0;i<length;i++){
    const t=i/rate;
    soft+=(Math.random()*2-1-soft)*smoothing;
    if(i%sloshEvery===0)sloshTarget=.35+Math.random()*.9;
    slosh+=(sloshTarget-slosh)*.003;
    const envelope=Math.min(1,t/.003)*Math.exp(-t*11)+.22*Math.min(1,t/.04)*Math.exp(-t*4.5);
    data[i]=soft*envelope*slosh*1.4;
  }
  const bubble=(at,frequency,duration,amplitude,rise)=>{
    let phase=0;
    const first=Math.floor(at*rate),count=Math.min(length-first,Math.ceil(duration*rate*1.5));
    for(let j=0;j<count;j++){
      const t=j/rate;
      phase+=2*Math.PI*frequency*(1+(rise-1)*Math.min(1,t/duration))/rate;
      data[first+j]+=amplitude*Math.sin(phase)*Math.exp(-4*t/duration)*Math.min(1,t/.0008);
    }
  };
  bubble(.004,380+Math.random()*80,.1,.55,1.9);
  for(let i=0;i<26;i++){
    const at=.008+Math.random()**2*.45;
    bubble(at,Math.exp(Math.log(650)+Math.random()*Math.log(4800/650)),.012+Math.random()*.05,(.08+Math.random()*.2)*(1-at*1.4),1.25+Math.random()*.9);
  }
  let peak=0;for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(data[i]));
  const fade=Math.floor(rate*.03);
  for(let i=0;i<length;i++)data[i]*=.9/(peak||1)*Math.min(1,(length-i)/fade);
  return buffer;
}
function steep(ball,speed){
  if(Math.abs(ball.vy)<speed*MIN_VERTICAL){
    ball.vy=Math.sign(ball.vy||1)*speed*MIN_VERTICAL;
    ball.vx=Math.sign(ball.vx||1)*speed*Math.sqrt(1-MIN_VERTICAL*MIN_VERTICAL);
  }
  return ball;
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function shade(hex,amount){
  const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.round(amount>0?v+(255-v)*amount:v*(1+amount)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// Fast: chevrons pointing ahead. Slow: chevrons pointing back. Duplicate: two balls.
// Laser: two upward beams. Die: a skull.
function symbol(ctx,type,x,y){
  if(type==='die'){skull(ctx,x,y);return;}
  ctx.save();ctx.strokeStyle=ctx.fillStyle='#0b1020';ctx.lineWidth=1.6;ctx.lineCap=ctx.lineJoin='round';
  const chevron=(cx,dir)=>{ctx.beginPath();ctx.moveTo(cx-1.6*dir,y-3);ctx.lineTo(cx+1.6*dir,y);ctx.lineTo(cx-1.6*dir,y+3);ctx.stroke();};
  if(type==='fast'){chevron(x-2.5,1);chevron(x+2.5,1);}
  if(type==='slow'){chevron(x-2.5,-1);chevron(x+2.5,-1);}
  if(type==='multi')for(const dx of [-3,3]){ctx.beginPath();ctx.arc(x+dx,y,2.3,0,Math.PI*2);ctx.fill();}
  if(type==='laser')for(const dx of [-3,3]){ctx.beginPath();ctx.moveTo(x+dx,y+3.5);ctx.lineTo(x+dx,y-2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+dx-1.8,y-1);ctx.lineTo(x+dx,y-3.5);ctx.lineTo(x+dx+1.8,y-1);ctx.stroke();}
  ctx.restore();
}
function skull(ctx,x,y){
  ctx.save();ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(x,y-1,3.2,0,Math.PI*2);ctx.fill();ctx.fillRect(x-2,y+1,4,3);
  ctx.fillStyle='#8a0010';ctx.fillRect(x-2,y-2,1.6,1.6);ctx.fillRect(x+.4,y-2,1.6,1.6);ctx.fillRect(x-.4,y+1.5,.8,2);
  ctx.restore();
}
