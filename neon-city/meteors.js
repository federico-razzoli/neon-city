// Vector space shooter. Each token buys exactly three lives.
const W=640,H=302,TOP=32;
const ROCK_COLOURS=['#ffb86b','#81cfff','#ff82b2','#c2a0ff','#f4df78','#98e6ab'];
const wrap=(n,size)=>(n%size+size)%size;
const distance=(a,b)=>Math.hypot(Math.min(Math.abs(a.x-b.x),W-Math.abs(a.x-b.x)),Math.min(Math.abs(a.y-b.y),H-Math.abs(a.y-b.y)));
export class Meteors{
  kind='meteors';width=640;height=360;lives=3;score=0;level=0;over=false;rocks=[];bullets=[];cooldown=0;explosion=null;nextRockColour=0;
  constructor(random=Math.random){this.random=random;this.respawn();this.nextWave();}
  respawn(){this.ship={x:W/2,y:H/2,vx:0,vy:0,angle:-Math.PI/2};this.invulnerable=2.5;this.bullets=[];}
  hit(){
    if(this.over||this.explosion||this.invulnerable>0)return;
    this.lives--;
    this.explosion={x:this.ship.x,y:this.ship.y,time:.8,particles:Array.from({length:24},(_,i)=>{
      const angle=i*Math.PI/12,speed=45+this.random()*120;
      return {vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed};
    })};
    this.bullets=[];this.thrust=false;this.playExplosion();
  }
  playExplosion(){
    const ctx=this.audioContext;if(!ctx||ctx.state!=='running')return;
    const duration=.55,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
    source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(1800,now);filter.frequency.exponentialRampToValueAtTime(80,now+duration);
    gain.gain.setValueAtTime(.35,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
  }
  rock(x,y,size){
    const angle=this.random()*Math.PI*2,speed=30+this.level*6+(3-size)*20;
    return {x,y,size,colour:ROCK_COLOURS[this.nextRockColour++%ROCK_COLOURS.length],radius:size*10+4,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,angle,spin:this.random()-.5,shape:Array.from({length:10},()=>.72+this.random()*.28)};
  }
  nextWave(){
    this.level++;
    this.rocks=Array.from({length:Math.min(10,this.level+3)},()=>{
      const x=this.random()*W,y=this.random()<.5?25:H-25;
      return this.rock(x,y,3);
    });
    this.invulnerable=Math.max(this.invulnerable,2);
  }
  update(dt,vertical=0,horizontal=0,fire=false){
    if(this.over)return;
    const time=Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(time/.008));
    for(let i=0;i<steps&&!this.over;i++)this.step(time/steps,vertical,horizontal,fire);
  }
  step(dt,vertical,horizontal,fire){
    if(this.explosion){
      this.explosion.time=Math.max(0,this.explosion.time-dt);
      if(this.explosion.time<=.000001){this.explosion=null;if(this.lives===0)this.over=true;else this.respawn();}
      return;
    }
    const s=this.ship;
    this.invulnerable=Math.max(0,this.invulnerable-dt);this.cooldown=Math.max(0,this.cooldown-dt);
    s.angle+=horizontal*4.2*dt;this.thrust=vertical<0;
    if(this.thrust){s.vx+=Math.cos(s.angle)*210*dt;s.vy+=Math.sin(s.angle)*210*dt;}
    const speed=Math.hypot(s.vx,s.vy);if(speed>280){s.vx*=280/speed;s.vy*=280/speed;}
    s.vx*=Math.exp(-.15*dt);s.vy*=Math.exp(-.15*dt);
    if(fire&&this.cooldown<=0){
      this.cooldown=.18;
      this.bullets.push({x:wrap(s.x+Math.cos(s.angle)*15,W),y:wrap(s.y+Math.sin(s.angle)*15,H),vx:s.vx+Math.cos(s.angle)*440,vy:s.vy+Math.sin(s.angle)*440,life:1.8,armed:false});
    }
    for(const o of [s,...this.rocks,...this.bullets]){o.x=wrap(o.x+o.vx*dt,W);o.y=wrap(o.y+o.vy*dt,H);}
    for(const r of this.rocks)r.angle+=r.spin*dt;
    for(const b of this.bullets){
      b.life-=dt;if(b.life<=0)continue;
      // A shot becomes dangerous only once it has cleared the firing ship.
      if(distance(b,s)>24)b.armed=true;
      if(b.armed&&this.invulnerable<=0&&distance(b,s)<10){this.hit();return;}
      const index=this.rocks.findIndex(r=>distance(b,r)<r.radius+2);
      if(index<0)continue;
      const [r]=this.rocks.splice(index,1);b.life=0;this.score+=[0,100,50,20][r.size];
      if(r.size>1)for(let i=0;i<2;i++)this.rocks.push(this.rock(r.x,r.y,r.size-1));
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    if(this.invulnerable<=0&&this.rocks.some(r=>distance(s,r)<r.radius+8)){
      this.hit();
    }
    if(!this.over&&!this.explosion&&!this.rocks.length)this.nextWave();
  }
  draw(ctx){
    ctx.fillStyle='#050b13';ctx.fillRect(0,0,640,360);
    ctx.textAlign='center';ctx.font='bold 17px monospace';ctx.fillStyle='#a6ffe4';
    ctx.fillText(`SCORE ${this.score}`,105,23);ctx.fillText('METEORS',320,23);ctx.fillText(`LIVES ${this.lives}`,535,23);
    if(this.over){
      ctx.fillStyle='#ffdb97';ctx.font='bold 38px monospace';ctx.fillText('GAME OVER',320,160);
      ctx.font='18px monospace';ctx.fillText(`SCORE ${this.score}`,320,197);
      ctx.font='14px monospace';ctx.fillText('SPACE TO RETURN',320,233);ctx.textAlign='start';return;
    }
    ctx.save();ctx.beginPath();ctx.rect(0,TOP,W,H);ctx.clip();ctx.translate(0,TOP);ctx.lineWidth=1.5;
    // Repeat edge copies so objects cross the screen without popping.
    for(const dx of [-W,0,W])for(const dy of [-H,0,H]){
      ctx.save();ctx.translate(dx,dy);
      for(const r of this.rocks){
        ctx.strokeStyle=r.colour;ctx.beginPath();r.shape.forEach((length,i)=>{const a=r.angle+i*Math.PI/5,x=r.x+Math.cos(a)*r.radius*length,y=r.y+Math.sin(a)*r.radius*length;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.stroke();
      }
      ctx.fillStyle='#fff4ce';for(const b of this.bullets)ctx.fillRect(b.x-1.5,b.y-1.5,3,3);
      if(this.explosion){
        const e=this.explosion,age=.8-e.time;ctx.strokeStyle=e.time>.4?'#fff4ce':'#ff9955';ctx.globalAlpha=e.time/.8;
        for(const p of e.particles){ctx.beginPath();ctx.moveTo(e.x+p.vx*age,e.y+p.vy*age);ctx.lineTo(e.x+p.vx*(age+.06),e.y+p.vy*(age+.06));ctx.stroke();}
        ctx.globalAlpha=1;
      }
      if(!this.explosion&&(this.invulnerable<=0||Math.floor(this.invulnerable*10)%2===0)){
        const s=this.ship;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.strokeStyle='#a6ffe4';
        ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-10,-9);ctx.lineTo(-6,0);ctx.lineTo(-10,9);ctx.closePath();ctx.stroke();
        if(this.thrust){ctx.strokeStyle='#ffb56b';ctx.beginPath();ctx.moveTo(-10,-4);ctx.lineTo(-20,0);ctx.lineTo(-10,4);ctx.stroke();}ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();ctx.fillStyle='#a6ffe4';ctx.font='10px monospace';ctx.fillText('← → / A D TURN · ↑ / W THRUST · SPACE FIRE · ESC LEAVE',320,352);ctx.textAlign='start';
  }
}
