// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {createStorefrontStreet} from './three-storefront-street.js';
import {blueNoteDoor,blueNoteBins,wallRecordRacks,blueNoteStairs,counter,counterOverhang,stairWallThickness,clerk} from './blue-note-interior.js';

import {drawRod,drawStaff} from './pub-interior.js?v=bar-taps-1';


const storefront={
  doorX:blueNoteDoor.x,
  panes:[1.2,3.7,9.4,11.9].map(x=>({x:x+.09,y:.96,z:.09,w:2.27,h:1.83})),
  preparationPoints:[[3.7,2.4],[11.9,2.4],[8,6]]
};

const cream='#f5dcac',ink='#141c28',brass='#d7a268';
const cabinet='#253b50',surface='#61949b',trim='#94b9bf';
const counterBaseHeight=1.02,countertopThickness=.11;
const fixtureTop=counterBaseHeight+countertopThickness;
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
function drawRoom({box,quad,face}){
  function hanging(x,y,z,dx,dz,h,image){
    const w=image.width,v=image.height;
    face([{x,y:y+h,z,u:0,v:0},{x:x+dx,y:y+h,z:z+dz,u:w,v:0},
      {x:x+dx,y,z:z+dz,u:w,v},{x,y,z,u:0,v}],cream,image);
  }
  const wood='#684737',oak='#ab805c',wall='#41575a';
  const [upper,lower]=blueNoteStairs;
  const concrete='#73797b';
  quad(0,0,0,16,lower.z,concrete);quad(0,0,lower.z,lower.x,lower.d,concrete);
  box(-.1,0,0,.1,4.5,14,wall);box(16,-3.2,0,.1,9.8,14,wall);
  box(0,-3.2,14,16,9.8,.1,wall);
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
  // Till, customer display, and four stacked records in album sleeves.
  box(x+.36,1.13,z+.15,.76,.17,.55,'#485154');box(x+.42,1.30,z+.39,.64,.30,.18,'#273438');
  box(x+.48,1.42,z+.38,.52,.12,.025,'#a1c3a1');
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
  box(upper.x,-3.2,upper.z+upper.d,upper.w,9.4,lower.z-upper.z-upper.d,plaster);
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
    for(const post of [z,z+d-.05])box(x,0,post,.07,2.65,.05,metal);
    box(x,2.60,z,.07,.05,d,metal);box(x,.01,z,.07,.04,d,metal);
    const handle=z+d-.17;
    box(x-.055,.9,handle,.04,.39,.028,steel);
    for(const y of [.90,1.26])box(x-.03,y,handle,.07,.03,.028,steel);
    box(x+w-.04,height,z+.12,.04,2.1,d-.24,'#485d65');
  }
}
function stairGlazing({scene}){
  const geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.MeshBasicMaterial({color:0xa1d6de,transparent:true,opacity:.10,
    depthWrite:false,side:THREE.DoubleSide});
  for(const {x,z,d} of blueNoteStairs){
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
    const material=new THREE.MeshBasicMaterial({color:'#7295aa',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    for(const {x,y,z,w,h} of storefront.panes){
      const pane=new THREE.Mesh(geometry,material);
      pane.position.set(x+w/2,y+h/2,-z);pane.scale.set(w,h,1);scene.add(pane);
    }
    return {
      prepare:(renderer,frame)=>street.prepare(renderer,frame),
      update:frame=>street.update(frame),
      dispose(){street.dispose();stairs.dispose();geometry.dispose();material.dispose();}
    };
  },actorsFor:()=>[]});
}
