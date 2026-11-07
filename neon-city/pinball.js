// A pinball table: one steel ball, mechanical flippers, rubber and scoring switches.
import {drawPinball} from './pinball-renderer.js?v=5';
const TAU=Math.PI*2;
export const BALL_RADIUS=8;
export const FLIPPER_LENGTH=76;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function segments(points){return points.slice(1).map((p,i)=>[...points[i],...p]);}
function arc(cx,cy,rx,ry,from,to,steps){return Array.from({length:steps+1},(_,i)=>{const a=from+(to-from)*i/steps;return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];});}
export class Pinball{
  kind='pinball';width=640;height=360;score=0;lives=3;over=false;time=0;charge=0;launchHeld=false;
  bumpers=[{x:160,y:258,r:22,lit:0},{x:320,y:258,r:22,lit:0},{x:240,y:406,r:23,lit:0}];
  targets=[{x:102,y:367,down:false},{x:102,y:409,down:false},{x:102,y:451,down:false}];
  rollovers=[{x:164,on:false},{x:241,on:false},{x:318,on:false}];
  posts=[{x:83,y:638,r:9},{x:118,y:709,r:9},{x:365,y:638,r:9},{x:332,y:709,r:9}];
  flippers=[{x:150,y:744,a:.38,rest:.38,active:-.5},{x:330,y:744,a:Math.PI-.38,rest:Math.PI-.38,active:Math.PI+.5}];
  slings=[{points:[[92,564],[140,675],[101,658]],lit:0},{points:[[387,564],[339,675],[378,658]],lit:0}];
  arch=arc(249,145,219,100,Math.PI,TAU,32);
  constructor(variant=1){
    this.variant=variant;
    if(variant===2){
      this.bumpers=[{x:151,y:246,r:22,lit:0},{x:307,y:289,r:22,lit:0},{x:221,y:367,r:23,lit:0},{x:339,y:432,r:22,lit:0},{x:178,y:492,r:22,lit:0}];
      // A short save flipper closes the right outlane mouth against its inner guide.
      this.flippers.push({x:420,y:594,length:38,a:Math.PI/2,rest:Math.PI/2,active:Math.PI+.18});
    }
    this.rails=[...segments(this.arch),[30,145,30,610],...segments([[30,360],[38,430],[64,490],[104,530]]),[468,145,468,850],[431,205,431,850],
      ...segments([[30,610],[56,694],[84,772],[124,823]]),...segments([[431,610],[414,694],[392,772],[352,823]]),
      [71,544,118,709],[405,544,365,638],[365,638,332,709],
      ...[125,202,280,357].map(x=>[x,106,x,185])];
    this.pointers=new Map();this.serve();
  }
  serve(){this.tilted=false;this.lastNudge=-Infinity;this.ball={x:450,y:796,vx:0,vy:0};this.ready=true;this.charge=0;this.plungerPull=0;this.springTime=null;}
  nudge(direction){
    if(this.over||this.ready||this.tilted)return;
    if(this.time-this.lastNudge<1){this.tilted=true;this.sound('drain');return;}
    this.lastNudge=this.time;this.ball.vx+=direction*160;
  }
  sound(kind='rubber'){
    const c=this.audioContext;if(!c||c.state!=='running'||this.time<(this.soundAfter||0))return;
    this.soundAfter=this.time+.022;
    const o=c.createOscillator(),g=c.createGain(),freq={rubber:140,flipper:95,bumper:680,target:940,launch:170,drain:110}[kind];
    o.type=kind==='flipper'?'triangle':'sine';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.35,c.currentTime+.1);
    g.gain.setValueAtTime(kind==='bumper'?.065:.035,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.16);
    o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.17);
    o.onended=()=>{o.disconnect();g.disconnect();};
  }
  pointer(type,x,y,id=0){
    if(type==='down')this.pointers.set(id,x>394&&x<425&&y>280?'launch':x<320?'left':'right');
    else this.pointers.delete(id);
  }
  syncInput(_canvas,running){if(!running){this.pointers.clear();this.launchHeld=false;this.charge=0;this.plungerPull=0;this.springTime=null;}}
  update(dt,down=0,_h=0,_space=false,left=false,right=false){
    if(this.over)return;
    const touch=[...this.pointers.values()],pull=down>0||touch.includes('launch');left=left||touch.includes('left');right=right||touch.includes('right');
    dt=clamp(dt,0,.15);this.time+=dt;
    for(const p of [...this.bumpers,...this.slings])p.lit=Math.max(0,p.lit-dt);
    if(this.bankReset>0){this.bankReset-=dt;if(this.bankReset<=0)for(const t of this.targets)t.down=false;}
    if(this.ready){
      if(this.springTime!==null){
        // A released spring returns to the stationary ball before imparting its energy.
        this.springTime+=dt;
        this.plungerPull=this.releasePull*Math.max(0,Math.cos(this.springTime*30));
        if(this.springTime>=Math.PI/60){
          this.ready=false;this.ball.vy=-1250*this.releasePull;
          this.charge=0;this.plungerPull=0;this.springTime=null;this.sound('launch');
        }
      }else if(pull){
        this.charge=Math.min(1,this.charge+dt*1.2);this.plungerPull=this.charge;
      }else if(this.launchHeld&&this.charge>0){
        this.releasePull=this.charge;this.springTime=0;
      }
    }
    this.launchHeld=pull;
    const steps=Math.max(1,Math.ceil(dt/(1/480))),h=dt/steps;
    for(let i=0;i<steps;i++){
      for(const [j,f] of this.flippers.entries()){
        const target=(!this.tilted&&(j===0?left:right))?f.active:f.rest,old=f.a;
        f.a+=clamp(target-f.a,-h*15,h*15);f.omega=h?(f.a-old)/h:0;
        if(Math.abs(f.omega)>0&&old===f.rest)this.sound('flipper');
      }
      if(!this.ready&&!this.over)this.step(h);
    }
  }
  // Ball against a rounded rail. Moving flippers supply their local surface velocity.
  rail(ax,ay,bx,by,restitution=.78,motion=null,radius=3){
    const b=this.ball,dx=bx-ax,dy=by-ay,t=clamp(((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy),0,1);
    const px=ax+t*dx,py=ay+t*dy,d=Math.hypot(b.x-px,b.y-py),limit=BALL_RADIUS+radius;
    if(d>=limit||d<.00001)return false;
    const nx=(b.x-px)/d,ny=(b.y-py)/d,ux=motion?-motion.omega*(py-motion.y):0,uy=motion?motion.omega*(px-motion.x):0;
    const v=(b.vx-ux)*nx+(b.vy-uy)*ny;
    b.x=px+nx*limit;b.y=py+ny*limit;
    if(v<0){b.vx-=(1+restitution)*v*nx;b.vy-=(1+restitution)*v*ny;}
    return v<0;
  }
  round(p,restitution=1,kick=0){
    const b=this.ball,dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),limit=p.r+BALL_RADIUS;
    if(d>=limit||d<.00001)return false;
    const nx=dx/d,ny=dy/d,v=b.vx*nx+b.vy*ny;b.x=p.x+nx*limit;b.y=p.y+ny*limit;
    if(v<0){b.vx-=((1+restitution)*v-kick)*nx;b.vy-=((1+restitution)*v-kick)*ny;}
    return v<0;
  }
  step(dt){
    const b=this.ball,oldY=b.y,score=this.score;
    b.vy+=480*dt;b.vx*=1-.028*dt;b.vy*=1-.028*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    for(const [i,r] of this.rails.entries())this.rail(...r,i<this.arch.length-1?.5:.78);
    for(const f of this.flippers)this.rail(f.x,f.y,f.x+Math.cos(f.a)*(f.length??FLIPPER_LENGTH),f.y+Math.sin(f.a)*(f.length??FLIPPER_LENGTH),.83,f,8);
    for(const p of this.posts)this.round(p,.9);
    for(const p of this.bumpers)if(this.round(p,1,this.tilted?0:210)){this.score+=100;p.lit=.18;this.sound('bumper');}
    for(const t of this.targets)if(!t.down&&this.rail(t.x,t.y-14,t.x,t.y+14,.8,null,4)){
      t.down=true;this.score+=500;this.sound('target');
      if(this.targets.every(t=>t.down)){this.score+=3000;this.bankReset=1.8;}
    }
    for(const s of this.slings){
      const [a,c,d]=s.points;
      const front=this.rail(...a,...c,1.05,null,5);
      this.rail(...c,...d,.8,null,5);this.rail(...d,...a,.8,null,5);
      if(front&&!s.lit&&!this.tilted){b.vy-=190;b.vx+=s===this.slings[0]?130:-130;this.score+=10;s.lit=.15;this.sound('rubber');}
    }
    if(oldY<180&&b.y>=180&&b.vy>0)for(const r of this.rollovers)if(Math.abs(b.x-r.x)<28&&!r.on){
      r.on=true;this.score+=250;this.sound('target');
      if(this.rollovers.every(r=>r.on)){this.score+=1000;for(const r of this.rollovers)r.on=false;}
    }
    // A spinner switch is crossed by the ball; it is not a solid wall.
    if((oldY-302)*(b.y-302)<0&&Math.abs(b.x-153)<18){this.score+=100;this.spinnerUntil=this.time+1;this.sound('target');}
    if(this.tilted)this.score=score;
    const speed=Math.hypot(b.vx,b.vy);if(speed>1450){b.vx*=1450/speed;b.vy*=1450/speed;}
    // An underpowered shot rolls back onto the plunger without spending a ball.
    if(!this.tilted&&b.x>442&&b.y>=796&&b.vy>0){this.serve();return;}
    if(b.y>865){this.sound('drain');if(--this.lives===0)this.over=true;else this.serve();}
  }
  draw(ctx){drawPinball(ctx,this);}
  dispose(){this.art=null;this.pointers.clear();}
}
