import {START_SIGN,groundHeight} from './world.js?v=park-entrances-1';

// Keep money in pence, separate from objects that can be carried or dropped.
export class Wallet{
  pence=0;
  note={x:START_SIGN.x+1.2,z:START_SIGN.z+.7,taken:false};
  get balance(){return `£${(this.pence/100).toFixed(2)}`;}
  takeNote(player,note=this.note){
    const dx=note.x-player.x,dz=note.z-player.z,gap=Math.hypot(dx,dz);
    if(note.taken||gap>3.5)return null;
    if(gap>.25&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/gap<Math.cos(.45+Math.asin(Math.min(1,.25/gap))))return null;
    note.taken=true;
    this.pence+=500;
    return 'TAKEN £5.00';
  }
}

let texture;
export function drawMoneyNote(note,face){
  if(note.taken)return;
  if(!texture){
    texture=document.createElement('canvas');texture.width=160;texture.height=80;
    const g=texture.getContext('2d');
    g.fillStyle='#58665a';g.fillRect(0,0,160,80);
    g.strokeStyle='#343e36';g.lineWidth=3;g.strokeRect(5,5,150,70);
    g.fillStyle='#424e44';g.beginPath();g.ellipse(119,40,20,27,0,0,Math.PI*2);g.fill();
    g.fillStyle='#252e28';g.font='bold 32px serif';g.fillText('£5',15,47);
    g.font='9px serif';g.fillText('FIVE POUNDS',15,65);
  }
  const {x,z}=note,y=(note.ground??groundHeight(x,z))+.012;
  const angle=.28,c=Math.cos(angle),s=Math.sin(angle);
  const corner=(dx,dz,u,v)=>({x:x+dx*c-dz*s,y,z:z+dx*s+dz*c,u,v});
  face([corner(-.32,-.16,0,0),corner(.32,-.16,160,0),
    corner(.32,.16,160,80),corner(-.32,.16,0,80)],'#58665a',texture);
}
