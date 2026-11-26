// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {createStorefrontStreet} from './three-storefront-street.js';
import {blueNoteDoor,blueNoteBins,wallRecordRacks,blueNoteStairs,counter,counterOverhang,stairWallThickness,clerk,stairRun,flightDrop,basementFloor,instrumentDesk,instrumentClerk,instrumentTill,keyboardTables} from './blue-note-interior.js';

import {drawCylinder,drawRod,drawStaff} from './pub-interior.js?v=bar-taps-1';


const storefront={
  doorX:blueNoteDoor.x,
  panes:[1.2,3.7,9.4,11.9].map(x=>({x:x+.09,y:.96,z:.09,w:2.27,h:1.83})),
  preparationPoints:[[3.7,2.4],[11.9,2.4],[8,6]]
};

const cream='#f5dcac',ink='#141c28',brass='#d7a268';
const cabinet='#253b50',surface='#61949b',trim='#94b9bf';
const counterBaseHeight=1.02,countertopThickness=.11;
const fixtureTop=counterBaseHeight+countertopThickness;
function drawTill(box,x,y,z){
  box(x,y,z,.76,.17,.55,'#485154');
  box(x+.06,y+.17,z+.24,.64,.30,.18,'#273438');
  box(x+.12,y+.29,z+.23,.52,.12,.025,'#a1c3a1');
}
function panel(width,height,background,paint){
  const image=document.createElement('canvas');
  image.width=width;image.height=height;
  const g=image.getContext('2d');
  g.fillStyle=background;g.fillRect(0,0,width,height);
  paint(g);
  return image;
}
function lettering(g,words,x,y,size,color){
  g.font='bold '+size+'px sans-serif';g.fillStyle=color;g.fillText(words,x,y);
}
function neonGuitar(){
  return panel(640,256,'#101923',g=>{
    g.save();g.translate(212,150);g.rotate(-.43);
    g.lineJoin='round';g.lineCap='round';g.shadowBlur=16;
    const tube=(path,color,width)=>{
      const line=new Path2D(path);
      g.shadowColor=color;g.strokeStyle=color;g.lineWidth=width;g.stroke(line);
      g.strokeStyle='#fff2de';g.lineWidth=1.4;g.stroke(line);
    };
    tube('M 43 -15 Q 16 -18 10 -44 Q -16 -38 -24 -22 C -44 -10 -68 -40 -92 -17 C -129 17 -95 64 -58 57 Q -34 53 -15 42 Q 4 34 26 42 Q 63 51 68 14 Q 45 24 35 8','#ff5395',6);
    tube('M 28 7 L 233 2 L 252 -11 L 277 -10 L 268 7 L 237 14 L 30 19 Z','#47ddff',5);
    tube('M -62 15 L 34 11 M -60 22 L 34 15','#ffc377',3);
    for(let x=52;x<230;x+=16)g.fillRect(x,6,1,7);
    g.restore();
    lettering(g,'BLUE NOTE',24,36,23,'#73e7ec');
  });
}
// Each wall bay is painted once, including the separate jackets, labels and shelf edges.
const titles=['Side Street','Low Tide','Night Shift','Open Circuit','Two Steps','Sunday Blue',
  'Daybreak','In Motion','Cross Town','First Light','Small Hours','Out West'];
// Drawn in jacket coordinates. Interior contours reveal the sleeve color.
const coverSilhouettes=[
  // Gaunt undead face with ragged hair, hollow eyes and a broken grin.
  'M12 45 L17 23 L12 29 L19 13 L25 16 L26 7 L33 11 L40 4 L44 10 L53 6 L53 14 L61 12 L58 23 L65 42 L56 36 L59 51 L49 42 L47 51 L40 57 L31 54 L25 47 L24 41 L16 50 L19 35 Z M23 25 L35 29 L31 34 L24 32 Z M41 29 L53 24 L51 32 L44 34 Z M36 34 L32 41 L40 39 Z M29 43 L34 45 L35 43 L40 45 L45 41 L43 48 L38 50 L32 48 Z',
  // Raised fist with curled fingers and a thumb across the palm.
  'M25 56 L25 47 L17 36 L15 23 Q15 18 21 18 L23 28 L23 14 Q24 9 30 11 L32 24 L32 10 Q35 5 40 10 L41 23 L42 12 Q47 8 50 14 L50 25 L52 17 Q58 14 59 21 L58 32 L51 43 L47 47 L47 56 Z M27 32 L39 24 L51 27 L50 30 L40 29 L32 36 Z',
  // Pump in profile, with an arched sole and narrow heel.
  'M9 19 L16 13 Q26 23 35 33 Q40 40 47 38 L53 35 Q56 41 65 43 Q70 45 68 50 L44 50 Q38 50 32 41 Q26 30 22 31 Q19 32 18 49 L18 53 L14 53 L14 40 Q15 29 9 19 Z',
  // Electric guitar, angled from the lower bout to the headstock.
  'M12 40 Q13 33 22 33 Q29 33 27 24 Q35 21 35 30 L51 14 L52 9 L60 4 L65 9 L59 17 L55 18 L38 35 Q43 38 49 30 Q50 41 39 44 Q35 45 32 52 Q26 60 17 54 Q9 49 12 40 Z M20 41 L22 39 L29 46 L27 48 Z',
  // Flame tongues curling around a cutout ember.
  'M37 57 Q17 56 16 43 Q15 34 24 23 Q22 35 29 34 Q36 27 32 19 Q30 12 42 4 Q39 14 47 21 Q56 29 51 37 Q57 35 59 26 Q69 47 52 55 Q46 58 37 57 Z M35 51 Q28 47 34 40 Q37 37 38 32 Q39 38 44 42 Q49 49 41 52 Z'
];
let silhouettePaths;

function recordBayLayout(width){
  const columns=Math.floor((width-13)/83);
  return {width,columns,left:Math.floor((width-(columns-1)*83-76)/2)};
}
function recordBay(genre,offset,{width,columns,left}=recordBayLayout(512)){
  silhouettePaths??=coverSilhouettes.map(path=>new Path2D(path));
  const colors=['#df8059','#d8b857','#71a5aa','#bd7583','#8587b5','#99ac79'];
  return panel(width,336,cabinet,g=>{
    lettering(g,genre,12,27,21,cream);
    for(let row=0;row<3;row++){
      const top=40+row*97;
      for(let col=0;col<columns;col++){
        const n=offset+row*(columns===9?10:columns)+col,x=left+col*83;
        g.save();g.translate(x,top);g.fillStyle=colors[(n*5+row)%6];g.fillRect(0,0,76,76);
        g.fillStyle=ink;
        const design=n%(4+coverSilhouettes.length);
        if(design===0){
          g.beginPath();g.arc(38,33,25,0,Math.PI*2);g.fill();
          g.fillStyle=cream;g.beginPath();g.arc(38,33,6,0,Math.PI*2);g.fill();
        }else if(design===1){
          for(let j=0;j<5;j++)g.fillRect(7+j*12,10+j%3*7,7,36-j%3*6);
        }else if(design===2){
          g.beginPath();g.moveTo(4,52);g.lineTo(47,9);g.lineTo(70,52);g.fill();
          g.fillStyle=cream;g.fillRect(15,30,47,4);
        }else if(design===3){
          for(let j=0;j<5;j++){g.beginPath();g.arc(25,24,7+j*6,-1.5,2.2);g.strokeStyle=ink;g.lineWidth=2;g.stroke();}
        }else g.fill(silhouettePaths[design-4],'evenodd');
        lettering(g,titles[n%titles.length],4,69,10,ink);g.restore();
      }
      g.fillStyle=trim;g.fillRect(0,top+76,width,4);
      g.fillStyle=ink;g.fillRect(0,top+80,width,4);
    }
  });
}
const basementSideWall='#375153',basementEndWall='#354849';
function drawDora(box,face){
  const {x,z}=instrumentClerk;
  const block=(dx,y,dz,...args)=>box(x+dx,basementFloor+y,z+dz,...args);
  const localFace=(points,color)=>face(points.map(p=>({x:x+p.x,y:basementFloor+p.y,z:z+p.z})),color);
  const skin='#c58d73',tee='#804653',denim='#37383d',creamPrint='#e4d3b0';
  for(const side of [-1,1]){
    const leg=side*.135;
    block(leg-.09,.16,-.09,.18,.78,.21,denim);
    block(leg-.095,.19,-.10,.19,.065,.23,'#616067');
    block(leg-.09,.025,-.17,.18,.16,.28,'#27272c');
    block(leg-.095,0,-.18,.19,.034,.30,'#88827a');
    block(leg-.06,.048,-.174,.085,.025,.008,'#726d68');
    block(side*.29-.063,1.00,-.09,.126,.35,.17,skin);
    block(side*.29-.083,1.26,-.11,.166,.18,.21,tee);
    block(side*.29-.085,1.25,-.115,.17,.045,.22,'#985f68');
  }
  block(-.235,.89,-.14,.47,.56,.30,tee);
  // A cream sound-wave print below the pick necklace.
  for(const [i,height] of [.045,.095,.065,.14,.08,.11,.045].entries())
    block(-.137+i*.042,1.12-height/2,-.145,.026,height,.008,creamPrint);
  for(const side of [-1,1])
    drawRod(localFace,{x:side*.09,y:1.45,z:-.15},{x:0,y:1.30,z:-.156},.008,'#33292b');
  localFace([{x:-.048,y:1.32,z:-.166},{x:.048,y:1.32,z:-.166},
    {x:.037,y:1.277,z:-.166},{x:0,y:1.235,z:-.166},{x:-.037,y:1.277,z:-.166}],'#ffd34a');
  drawCylinder(localFace,0,1.435,0,.082,.13,skin);
  // Rotate the face, curls and earrings together around the base of the head.
  const tilt=.12;
  const headFace=(points,color)=>localFace(points.map(p=>({
    x:p.x*Math.cos(tilt)-p.y*Math.sin(tilt),
    y:1.52+p.x*Math.sin(tilt)+p.y*Math.cos(tilt),z:p.z
  })),color);
  drawCylinder(headFace,0,0,0,.13,.22,skin,skin,.155);
  for(const side of [-1,1]){
    drawCylinder(headFace,side*.059,.115,-.13,.016,.017,'#34292b');
    const hoop=Array.from({length:10},(_,i)=>{
      const angle=i*Math.PI/5;
      return {x:side*.15+.027*Math.cos(angle),y:.058+.034*Math.sin(angle),z:-.03};
    });
    hoop.forEach((p,i)=>drawRod(headFace,p,hoop[(i+1)%hoop.length],.006,'#dbdce0'));
  }
  drawRod(headFace,{x:-.028,y:.061,z:-.135},{x:.03,y:.064,z:-.135},.006,'#995e58');
  drawCylinder(headFace,0,.196,0,.16,.086,'#30282a');
  for(let i=0;i<14;i++){
    const a=i*Math.PI/7;
    drawCylinder(headFace,.14*Math.cos(a),.145+.04*Math.max(0,-Math.sin(a))+.012*(i%2),
      .14*Math.sin(a),.049,.085,i%3?'#30282a':'#443437','#443437',.038);
  }
}
function drawInstrumentShop({box,quad,face}){
  const floor=basementFloor;
  quad(0,floor,0,16,14,'#706258');
  box(-.1,floor,0,.1,-floor,14,basementSideWall);
  box(16,floor,0,.1,-floor,14,basementSideWall);
  box(0,floor,-.1,16,-floor,.1,basementEndWall);
  box(0,floor,14,16,-floor,.1,basementEndWall);
  const colors=['#ad4936','#e0ad55','#438781','#67394b'];
  for(let i=0;i<12;i++){
    const x=1+i*1.25,bass=i>=6,y=floor+1;
    const outline=[[-.10,.64],[-.22,.70],[-.25,.48],[-.16,.33],[-.28,.18],[-.27,.03],
      [-.16,-.08],[.13,-.08],[.27,.02],[.28,.18],[.16,.35],[.24,.53],[.22,.64],[.10,.53]];
    // Fan triangles keep the cutaways on either side of the neck.
    const point=([dx,dy])=>({x:x+dx,y:y+dy,z:.31});
    for(let n=0;n<outline.length;n++)
      face([point([0,.30]),point(outline[n]),point(outline[(n+1)%outline.length])],colors[i%4]);
    const neck=bass?1.12:.85;
    box(x-.055,y+.48,.26,.11,neck,.07,'#aa7950');
    box(x-.08,y+.48+neck,.26,.16,.21,.07,'#d6ad70');
    box(x-.11,y+.2,.31,.22,.06,.03,'#e1d9cb');
    for(let n=0;n<(bass?4:6);n++)
      box(x-.04+n*(bass?.027:.016),y+.23,.345,.004,neck+.38,.008,'#c5c1ae');
  }
  for(const [index,{x,z,w,d}] of keyboardTables.entries()){
    box(x,floor+.84,z,w,.18,d,index===0?'#242a33':'#454443');
    const panelZ=z+d-.10;
    const buttonCount=index===0?6:8;
    for(let button=0;button<buttonCount;button++)
      box(x+w/2-.36+button*.12,floor+1.02,panelZ-.035,.095,.025,.07,'#54585c','#92979a');
    drawCylinder(face,x+w-.16,floor+1.02,panelZ,.034,.014,'#27292b');
    drawCylinder(face,x+w-.16,floor+1.034,panelZ,.023,.012,'#cc1725','#ff5054');
    const left=x+w*.23,right=x+w*.77,middle=z+d/2,steel='#474b50';
    for(const [foot,top,offset] of [[left,right,-.026],[right,left,.026]]){
      drawRod(face,{x:foot,y:floor+.033,z:middle+offset},{x:top,y:floor+.81,z:middle+offset},.026,steel);
      for(const [support,y] of [[foot,floor+.033],[top,floor+.81]]){
        drawRod(face,{x:support,y,z:z+.06},{x:support,y,z:z+d-.06},.031,steel);
        for(const end of [z+.06,z+d-.14])
          drawRod(face,{x:support,y,z:end},{x:support,y,z:end+.08},.033,'#26282b');
      }
    }
    drawRod(face,{x:x+w/2,y:floor+.4215,z:middle-.06},{x:x+w/2,y:floor+.4215,z:middle+.06},.047,'#6d7275');
    const key=(w-.16)/28;
    for(let i=0;i<28;i++){
      const right=x+w-.08-i*key,back=z+d-.2;
      const left=right-key+.006;
      const hasSharp=![2,6].includes(i%7);
      const followsSharp=i%7!==0&&i%7!==3;
      const rearLeft=hasSharp?right-key*.70:left;
      const rearRight=followsSharp?right-key*.25:right;
      box(left,floor+1.02,back-.52,right-left,.04,.20,'#e9e4cf');
      box(rearLeft,floor+1.02,back-.32,rearRight-rearLeft,.04,.32,'#e9e4cf');
      if(hasSharp)box(right-key*1.25,floor+1.02,back-.32,key*.55,.04,.32,'#26272a');
    }
  }
  const {x,z,w,d}=instrumentDesk;
  box(x,floor,z,w,counterBaseHeight,d,cabinet);
  box(x,floor+counterBaseHeight,z-counterOverhang,w+counterOverhang,countertopThickness,d+2*counterOverhang,trim,surface);
  drawTill(box,instrumentTill.x-.38,floor+fixtureTop,instrumentTill.z-.275);
  drawDora(box,face);
}
function drawRoom({box,quad,face}){
  function hanging(x,y,z,dx,dz,h,image){
    const w=image.width,v=image.height;
    face([{x,y:y+h,z,u:0,v:0},{x:x+dx,y:y+h,z:z+dz,u:w,v:0},
      {x:x+dx,y,z:z+dz,u:w,v},{x,y,z,u:0,v}],cream,image);
  }
  const wood='#684737',oak='#ab805c',wall='#41575a';
  const [upper,lower]=blueNoteStairs;
  drawInstrumentShop({box,quad,face});
  // A separate soffit hides the undersides of the upstairs fixtures.
  // Its two panels meet at the stairwell corner and leave both flights clear.
  const ceiling=-.24,frontOfStairs=upper.z-stairWallThickness;
  quad(0,ceiling,0,16,frontOfStairs,'#464e50');
  quad(0,ceiling,frontOfStairs,upper.x,14-frontOfStairs,'#464e50');
  for(const [x,z] of [[2,3],[10,3],[2,7],[10,7],[2,11]]){
    box(x,ceiling-.07,z,4,.07,.18,'#778486');
    box(x+.06,ceiling-.10,z+.025,3.88,.03,.13,'#ffe3aa');
  }
  for(const [x,label] of [[5.4,'GUITARS'],[12.9,'BASSES']]){
    const sign=panel(224,48,ink,g=>lettering(g,label,10,37,38,cream));
    hanging(x,basementFloor+3.05,.04,-2.8,0,.6,sign);
  }
  box(upper.x,basementFloor,upper.z-stairWallThickness,upper.w,-basementFloor,stairWallThickness,basementEndWall);
  box(upper.x,basementFloor,upper.z+upper.d,stairRun,-basementFloor,lower.z-upper.z-upper.d,basementEndWall);
  box(lower.x,basementFloor,lower.z,.08,ceiling-basementFloor,lower.d,basementSideWall);
  const concrete='#73797b';
  quad(0,0,0,16,lower.z,concrete);quad(0,0,lower.z,lower.x,lower.d,concrete);
  box(-.1,0,0,.1,4.5,14,wall);box(16,0,0,.1,6.6,14,wall);
  box(0,0,14,16,6.6,.1,wall);
  quad(0,4.5,0,16,upper.z,'#383d3c');quad(0,4.5,upper.z,upper.x,14-upper.z,'#383d3c');
  quad(upper.x,6.2,upper.z,16-upper.x,14-upper.z,'#343d40');
  for(const z of [3,7,11])box(1,4.43,z,8,.04,.08,'#ffe3aa');
  let edge=0;
  for(const {x,y,w,h} of storefront.panes){
    box(edge,0,-.1,x-edge,4.5,.1,wall);
    box(x,0,-.1,w,y,.1,wall);
    box(x,y+h,-.1,w,4.5-y-h,.1,wall);
    edge=x+w;
    for(const jamb of [x-.09,x+w])box(jamb,.85,.02,.09,2.05,.06,wood);
    for(const rail of [.85,y+h])box(x,rail,.02,w,.11,.06,wood);
  }
  box(edge,0,-.1,16-edge,4.5,.1,wall);
  box(7,0,.02,2,2.75,.12,wood);box(7.12,.14,.15,1.76,2.48,.04,'#375364');
  box(7.12,.14,.2,1.76,.57,.035,oak);box(8.62,1,.24,.045,.42,.08,brass);
  function topEdges(x,z,w,d){
    for(const [ax,az,bx,bz] of [[x,z,x+w,z],[x+w,z,x+w,z+d],
      [x+w,z+d,x,z+d],[x,z+d,x,z]]){
      face([{x:ax,y:counterBaseHeight,z:az},{x:bx,y:counterBaseHeight,z:bz},
        {x:bx,y:fixtureTop,z:bz},{x:ax,y:fixtureTop,z:az}],surface);
    }
  }
  function topFace(x,z,w,d,image){
    const u=image?.width??1,v=image?.height??1;
    face([{x,y:fixtureTop,z,u:0,v},{x:x+w,y:fixtureTop,z,u,v},
      {x:x+w,y:fixtureTop,z:z+d,u,v:0},{x,y:fixtureTop,z:z+d,u:0,v:0}],surface,image);
  }
  // The wall stand and its flat display share album artwork.
  const genres=[['ROCK','SOUL','BLUES','INDIE'],['LIVES & BOOTLEGS','METAL & PUNK']];
  wallRecordRacks.forEach(({x,z,w,d},index)=>{
    const rightWall=x>0;
    const top=fixtureTop;
    box(x,0,z,w,counterBaseHeight,d,cabinet);
    topEdges(x,z,w,d);
    const bayLength=d/genres[index].length;
    const panelLength=bayLength-(rightWall?.02:.05),panelHeight=rightWall?2.15:1.72;
    const layout=recordBayLayout(rightWall?Math.round(336*panelLength/panelHeight):512);
    genres[index].forEach((genre,i)=>{
      const start=z+i*bayLength;
      const image=recordBay(genre,index*31+i*7,layout);
      if(rightWall)hanging(15.91,top+.16,start+bayLength-.01,0,-panelLength,panelHeight,image);
      else hanging(.12,top+.16,start,0,panelLength,panelHeight,image);
      const slots=Math.floor(bayLength/.52),spacing=bayLength/slots,size=spacing-.065;
      const width=256,height=Math.round(width*bayLength/w);
      const lid=panel(width,height,surface,g=>{
        const coverWidth=size*width/w,coverHeight=size*height/bayLength;
        for(let slot=0;slot<slots;slot++){
          const u=layout.left+(slot%layout.columns)*83,v=40+((1+Math.floor(slot/layout.columns))%3)*97;
          const near=(slot*spacing+.03)*height/bayLength;
          g.save();
          g.translate(width/2,height-near-coverHeight/2);
          g.rotate(rightWall?Math.PI/2:-Math.PI/2);
          g.drawImage(image,u,v,76,76,-coverHeight/2,-coverWidth/2,coverHeight,coverWidth);
          g.restore();
        }
      });
      topFace(x,start,w,bayLength,lid);
    });
  });
  const singlesArtwork=recordBay('FRESH SINGLES',47);
  hanging(.32,1.2,13.95,3.3,0,2.17,singlesArtwork);
  hanging(4.7,2.22,13.94,4.85,0,1.94,neonGuitar());
  blueNoteBins.forEach(({x,z,w,d},i)=>{
    box(x+.1,0,z+.1,w-.2,.64,d-.2,cabinet);
    box(x,.64,z,w,.33,d,surface);
    for(let col=0;col<8;col++)for(let row=0;row<11;row++){
      const colors=['#d8ad78','#485960','#b45e52','#657c85','#b9b397'];
      box(x+.07+col*.52,.94,z+.08+row*.11,.48,.42+row*.012,.027,colors[(i+col+row)%5]);
    }
  });
  const {x,z,w,d}=counter;
  box(x,0,z,w,counterBaseHeight,d,cabinet);
  topEdges(x,z-counterOverhang,w+.06,d+2*counterOverhang);
  topFace(x,z-counterOverhang,w+.06,d+2*counterOverhang);
  for(let i=0;i<6;i++)box(x+.1+i*w/6,.12,z-.016,w/6-.17,.74,.016,'#39566c');
  drawTill(box,x+.36,fixtureTop,z+.15);
  const recordColors=['#bd404f','#438f98','#9975b0','#dba249'];
  recordColors.forEach((color,i)=>{
    const left=x+w-.94+i*.012,base=1.13+i*.013,front=z+.18;
    box(left,base,front,.65,.013,.63,color);
    const y=base+.0131,u=10+i*83,v=40;
    face([{x:left,y,z:front+.63,u,v},{x:left+.65,y,z:front+.63,u:u+76,v},
      {x:left+.65,y,z:front,u:u+76,v:v+76},{x:left,y,z:front,u,v:v+76}],color,singlesArtwork);
  });
  drawStaff({box,face},clerk,'rocker');
  const metal='#384851',steel='#adb9ba',plaster='#718489';
  box(upper.x,0,upper.z-stairWallThickness,upper.w,6.2,stairWallThickness,plaster);
  box(upper.x,0,upper.z+upper.d,stairRun,6.2,lower.z-upper.z-upper.d,plaster);
  box(upper.x,2.65,upper.z,.12,3.55,14-upper.z,wall);
  for(const {x,z,w,d,direction} of blueNoteStairs){
    const run=.29,rise=.18,steps=17;
    const height=steps*rise*direction,end=x+steps*run;
    for(let i=0;i<steps;i++){
      const depth=x+i*run,top=(i+1)*rise*direction;
      box(depth,top-rise-.05,z,run,rise+.05,d,'#49575e','#899497');
      box(depth+.012,top+.002,z,.025,.008,d,'#c3ccc8');
    }
    box(end,height-.18,z,x+w-end,.18,d,metal,'#899497');
    const railZ=z+d-.12;
    drawRod(face,{x:x+.05,y:.93,z:railZ},{x:end,y:height+.93,z:railZ},.036,steel);
    for(let i=1;i<steps;i+=4){
      const y=.93+direction*i*rise,depth=x+i*run;
      drawRod(face,{x:depth,y,z:railZ},{x:depth,y:y-.07,z:z+d},.022,metal);
    }
    if(direction<0)continue;
    for(const post of [z,z+d-.05])box(x,0,post,.07,2.65,.05,metal);
    box(x,2.60,z,.07,.05,d,metal);box(x,.01,z,.07,.04,d,metal);
    const handle=z+d-.17;
    box(x-.055,.9,handle,.04,.39,.028,steel);
    for(const y of [.90,1.26])box(x-.03,y,handle,.07,.03,.028,steel);
    box(x+w-.04,height,z+.12,.04,2.1,d-.24,'#485d65');
  }
  const end=upper.x+stairRun;
  box(end,-flightDrop-.18,upper.z,16-end,.18,lower.z-upper.z,metal);
  for(let i=0;i<17;i++){
    const x=end-(i+1)*.29,top=-flightDrop-(i+1)*.18;
    box(x,top-.21,upper.z,.29,.21,upper.d,'#49575e','#899497');
    box(x+.265,top+.002,upper.z,.025,.008,upper.d,'#c3ccc8');
  }
  drawRod(face,{x:end,y:-flightDrop+.93,z:upper.z+.12},
    {x:upper.x,y:basementFloor+.93,z:upper.z+.12},.036,steel);
}
function stairGlazing({scene}){
  const geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.MeshBasicMaterial({color:0xa1d6de,transparent:true,opacity:.10,
    depthWrite:false,side:THREE.DoubleSide});
  for(const {x,z,d} of blueNoteStairs.slice(0,1)){
    const glass=new THREE.Mesh(geometry,material);
    glass.rotation.y=Math.PI/2;glass.scale.set(d,2.6,1);
    glass.position.set(x+.025,1.3,-z-d/2);scene.add(glass);
  }
  return {dispose(){geometry.dispose();material.dispose();}};
}
export function createBlueNoteScene({streetScene}={}){
  return createThreeInteriorScene({name:'blue-note',drawRoom,createExtras({scene}){
    const stairs=stairGlazing({scene}),street=createStorefrontStreet(scene,storefront,{streetScene});
    const geometry=new THREE.PlaneGeometry(1,1);
    const loader=new THREE.TextureLoader();
    const posters=[];
    const [upper]=blueNoteStairs;
    let left=upper.x+.24;
    for(const [band,aspect] of [['fault-choir',2/3],['paper-satellites',2/3],['radioactive-cows',3/4]]){
      const texture=loader.load(new URL(`./assets/blue-note-${band}.png`,import.meta.url).href);
      texture.colorSpace=THREE.SRGBColorSpace;
      const poster=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
      const height=2.3,width=height*aspect;
      poster.scale.set(width,height,1);
      poster.position.set(left+width/2,2.95,-upper.z+stairWallThickness+.012);
      scene.add(poster);
      posters.push(poster);
      left+=width+.20;
    }
    const material=new THREE.MeshBasicMaterial({color:'#7295aa',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    for(const {x,y,z,w,h} of storefront.panes){
      const pane=new THREE.Mesh(geometry,material);
      pane.position.set(x+w/2,y+h/2,-z);pane.scale.set(w,h,1);scene.add(pane);
    }
    return {
      prepare:(renderer,frame)=>street.prepare(renderer,frame),
      update:frame=>street.update(frame),
      dispose(){
        for(const poster of posters){poster.material.map.dispose();poster.material.dispose();}
        street.dispose();stairs.dispose();geometry.dispose();material.dispose();
      }
    };
  },actorsFor:()=>[]});
}
