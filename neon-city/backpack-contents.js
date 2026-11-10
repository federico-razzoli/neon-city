/* SPDX-License-Identifier: AGPL-3.0-only */
import {drawCylinder,drawRod} from './pub-interior.js';

export function drawPastisBottle({x,z,ground=0},box,face){
  const y=ground+.006,glass='#456044',gold='#d7ae5e';
  const cylinder=(at,r,h,color,top=color,rTop=r)=>drawCylinder(face,x,y+at,z,r,h,color,top,rTop);
  cylinder(0,.103,.045,'#344735');
  cylinder(.045,.104,.24,glass,'#536d4d');
  cylinder(.285,.104,.09,glass,'#536d4d',.036);
  cylinder(.375,.036,.107,glass);
  cylinder(.473,.044,.04,'#9b723b',gold);
  // A warm paper band, with a red seal and gold edge on the front.
  cylinder(.106,.106,.103,'#dfc78c');
  box(x-.033,y+.128,z-.108,.066,.058,.012,'#9f4838');
  box(x-.015,y+.146,z-.111,.03,.021,.006,gold);
  box(x-.055,y+.219,z-.093,.015,.059,.008,'#829271');
}

export function drawMarijuanaPlant({x,z,ground=0},box,face){
  const y=ground+.006;
  const cylinder=(at,r,h,color,top=color,rTop=r)=>drawCylinder(face,x,y+at,z,r,h,color,top,rTop);
  cylinder(0,.082,.135,'#8f4939','#a85c45',.116);
  cylinder(.123,.124,.027,'#bd7151','#ca815a');
  cylinder(.15,.105,.003,'#483329');
  const point=(dx,dy,dz)=>({x:x+dx,y:y+dy,z:z+dz});
  const stem=(a,b,r)=>drawRod(face,a,b,r,'#597b42');
  stem(point(0,.151,0),point(.016,.494,0),.009);
  // Layer small palmate fans around the stem. Fold each pointed leaflet down
  // its centre so its two green tones remain readable in the tiny preview.
  for(const [height,direction,reach,size] of [[.28,.9,.117,.116],[.34,3.4,.132,.126],[.4,5.2,.107,.112],[.46,2.2,.075,.096],[.51,.45,.045,.085]]){
    const dx=Math.cos(direction),dz=Math.sin(direction),root=point(dx*reach,height+.038,dz*reach);
    stem(point(0,height,0),root,.005);
    for(let i=-2;i<=2;i++){
      const angle=direction+i*.55,c=Math.cos(angle),s=Math.sin(angle),length=size*(1-Math.abs(i)*.17),width=length*.15;
      const at=(along,across,lift)=>({x:root.x+c*along-s*across,y:root.y+lift,z:root.z+s*along+c*across});
      const ridge=at(length*.48,0,.016),tip=at(length,0,.026);
      for(const side of [-1,1])face([root,at(length*.29,side*width*.76,.006),at(length*.53,side*width,.008),at(length*.71,side*width*.62,.014),tip,ridge],side<0?'#417338':'#719c4c');
    }
  }
}
