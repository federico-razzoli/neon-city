import {BLOCK,riverStart,hasBridge} from './world.js?v=parks-4';
import {projectSky} from './sky.js?v=bench-1';

export function onRiverWalk({x,z}){
  const row=riverStart(Math.floor(z/BLOCK));
  if(row===undefined)return false;
  const along=z-row*BLOCK,street=Math.round(x/BLOCK);
  return (along>=8&&along<=14)||(along>=114&&along<=120)||
    (along>=8&&along<=120&&hasBridge(street)&&Math.abs(x-street*BLOCK)<=14);
}

// Invert the sky projection so the whole initial path lies in the current view.
function skyPoint(x,y,{angle,width,focal,horizon,pitch}){
  const right=(x-width/2)/focal,up=(horizon-y)/focal;
  const ahead=Math.cos(pitch)-up*Math.sin(pitch),height=Math.sin(pitch)+up*Math.cos(pitch);
  return {bearing:angle+Math.atan2(right,ahead),elevation:Math.atan2(height,Math.hypot(right,ahead))};
}

export class ShootingStars {
  constructor(random=Math.random){this.random=random;this.remaining=null;this.star=null;}
  update(dt,eligible,view){
    if(!eligible){this.remaining=null;this.star=null;return;}
    if(this.remaining===null)this.remaining=10+20*this.random();
    if(this.star){this.star.age+=dt;if(this.star.age>=1.1)this.star=null;}
    this.remaining-=dt;
    if(this.remaining>0)return;
    this.remaining=10+20*this.random();
    const x=view.width*(.3+.4*this.random()),y=18+24*this.random();
    const direction=this.random()<.5?-1:1;
    this.star={age:0,view:{...view},x,y,dx:direction*(70+35*this.random()),dy:20+15*this.random()};
  }
  draw(ctx,view){
    const s=this.star;if(!s)return;
    const t=s.age/1.1,fade=Math.min(1,t*10)*(1-t);
    ctx.save();
    // A tapering pale trail and bright head, painted before city geometry.
    for(let i=12;i>=0;i--){
      const p=Math.max(0,t-i*.012);
      const object=skyPoint(s.x+s.dx*p,s.y+s.dy*p,s.view);
      const screen=projectSky(object,view.angle,view.width,view.focal,view.horizon,view.pitch);
      if(!screen)continue;
      ctx.globalAlpha=fade*(1-i/13);
      ctx.fillStyle=i===0?'#fff6eb':'#b6c9f3';
      ctx.fillRect(Math.floor(screen.x),Math.floor(screen.y),i===0?2:1,1);
    }
    ctx.restore();
  }
}
