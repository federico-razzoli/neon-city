import {RIVE_GAUCHE_SIGN,groundHeight} from './world.js?v=rive-gauche-6';
import {band} from './parks.js?v=rive-gauche-6';

export const RIVE_GAUCHE_TEXTURE={width:360,height:220};
const BROWN={board:'#6b3f22',light:'#7d4c2b',dark:'#5a331b',edge:'#3c2414'};
const POST=['#4a505a','#5d6470','#717986','#878f9b'];
const visible=(viewer,p,n)=>(viewer.x-p.x)*n.x+(viewer.y-p.y)*n.y+(viewer.z-p.z)*n.z>0;

// A French tourist panel: white border, a river pictogram, then the name.
export function paintRiveGauche(g){
  const {width:w,height:h}=RIVE_GAUCHE_TEXTURE;
  const enamel=g.createLinearGradient(0,0,0,h);
  enamel.addColorStop(0,BROWN.light);enamel.addColorStop(.45,BROWN.board);enamel.addColorStop(1,BROWN.dark);
  g.fillStyle=enamel;g.fillRect(0,0,w,h);
  g.strokeStyle='#ffffff';g.lineWidth=5;g.beginPath();g.roundRect(9,9,w-18,h-18,10);g.stroke();
  // A river winding from the distance; it widens as it bends towards the viewer.
  g.save();g.translate(28,25);
  g.fillStyle='#ffffff';
  const river=t=>({x:62+24*Math.sin(t*Math.PI*1.6)*(1-.35*t),y:30+110*t,half:2+34*t**1.6});
  const samples=Array.from({length:41},(_,i)=>river(i/40));
  g.beginPath();
  samples.forEach(p=>g.lineTo(p.x-p.half,p.y));
  samples.reverse().forEach(p=>g.lineTo(p.x+p.half,p.y));
  g.closePath();g.fill();
  // Ripples cut back into the water.
  g.strokeStyle=BROWN.board;g.lineWidth=3;g.lineCap='round';
  for(const [t,s] of [[.45,6],[.68,10],[.9,15]]){
    const {x,y}=river(t);
    g.beginPath();g.moveTo(x-s,y);g.quadraticCurveTo(x-s/2,y-4,x,y);g.quadraticCurveTo(x+s/2,y+4,x+s,y);g.stroke();
  }
  g.restore();
  g.fillStyle='#ffffff';g.textAlign='center';g.textBaseline='middle';
  g.font='bold 50px "Arial Narrow",Arial,sans-serif';
  g.fillText('RIVE',240,82,170);g.fillText('GAUCHE',240,142,170);
}

// The panel runs from the post along (ax,az), between t=near and t=far.
export function drawRiveGaucheSign(s,{face},viewer,texture){
  const {post,width,bottom,top}=RIVE_GAUCHE_SIGN,half=.02,{width:columns,height:rows}=RIVE_GAUCHE_TEXTURE;
  const ground=groundHeight(s.x,s.z)+.075,y0=ground+bottom,y1=ground+top;
  band(face,viewer,{x:s.x,z:s.z},ground,post,y1+.05,post,POST,{sides:6,bottom:false});
  const near=post,far=post+width,nx=s.az,nz=-s.ax;
  const at=(t,y,side)=>({x:s.x+s.ax*t+side*half*nx,y,z:s.z+s.az*t+side*half*nz});
  // Both faces read forwards: from side 1 the panel runs to the viewer's right.
  for(const side of [-1,1]){
    if(!visible(viewer,at(near,y0,side),{x:side*nx,y:0,z:side*nz}))continue;
    const [left,right]=side>0?[near,far]:[far,near];
    face([{...at(left,y0,side),u:0,v:rows},{...at(right,y0,side),u:columns,v:rows},
      {...at(right,y1,side),u:columns,v:0},{...at(left,y1,side),u:0,v:0}],BROWN.board,texture);
  }
  const edges=[[far,y0,far,y1,{x:s.ax,y:0,z:s.az}],[far,y1,near,y1,{x:0,y:1,z:0}],[near,y0,far,y0,{x:0,y:-1,z:0}]];
  for(const [ta,ya,tb,yb,n] of edges){
    if(!visible(viewer,at(ta,ya,1),n))continue;
    face([at(ta,ya,-1),at(tb,yb,-1),at(tb,yb,1),at(ta,ya,1)],BROWN.edge);
  }
}
