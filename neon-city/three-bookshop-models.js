// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BOOKSHOP,BOOK_CATEGORIES} from './midnite-interior.js';

export function createBookshopRoomGeometry(){
  const model=createModel(),{box,quad,panel,cylinder}=model;
  const glyphs={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['111','100','100','100','111'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],I:['111','010','010','010','111'],K:['101','101','110','101','101'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['111','101','101','101','111'],R:['110','101','110','101','101'],S:['111','100','111','001','111'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],P:['110','101','110','100','100'],H:['101','101','111','101','101'],'-':['000','000','111','000','000']};
  const label=(word,x,y,z,scale,reverse=false)=>{for(const [i,c] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyphs[c]?.[row][col]==='1')panel(x+(reverse?-1:1)*(i*4+col)*scale,y+(4-row)*scale,z,(reverse?-1:1)*scale,scale,'#302c26');};
  const {width,depth,height,door,counter,chairs}=BOOKSHOP;
  for(let x=0;x<width;x++)for(let z=0;z<depth;z+=3){quad(x,0,z,1,3,(x+z)%3?'#72543e':'#816047');}
  quad(0,height,0,width,depth,'#414337');
  panel(0,0,depth,width,height,'#344b3e');
  {
    let left=0;
    for(const opening of [...BOOKSHOP.windowShelves.map(b=>({x:b.x+.12,w:b.w-.24,y:.95,h:1.8})),{x:door.x-.85,w:1.7,y:0,h:3}].sort((a,b)=>a.x-b.x)){
      if(opening.x>left)panel(left,0,0,opening.x-left,height,'#344b3e');
      if(opening.y)panel(opening.x,0,0,opening.w,opening.y,'#344b3e');
      panel(opening.x,opening.y+opening.h,0,opening.w,height-opening.y-opening.h,'#344b3e');
      left=opening.x+opening.w;
    }
    panel(left,0,0,width-left,height,'#344b3e');
  }
  for(const x of [0,width])model.side(x,0,0,depth,height,'#344b3e');
  // A solid door closes the shallow reveal between its face and the wall.
  box(door.x-.85,0,0,1.7,3,.01,'#203c32');
  box(door.x+.55,1.1,.05,.1,.3,.1,'#ddc38a');
  panel(door.x-.6,3.25,.03,1.2,.4,'#d5c494');label('EXIT',door.x+.45,3.3,.04,.055,true);
  // Street-facing display windows retain their gold frames around the glass.
  for(const b of BOOKSHOP.windowShelves){
    panel(b.x,.8,.02,b.w,.15,'#a68b5e');panel(b.x,2.75,.02,b.w,.15,'#a68b5e');
    panel(b.x,.95,.02,.12,1.8,'#a68b5e');panel(b.x+b.w-.12,.95,.02,.12,1.8,'#a68b5e');
    box(b.x,.7,b.z,b.w,.15,b.d,'#9b754e');
  }
  const colors=['#93634e','#ae925c','#526e60','#71617d','#a06b75','#557985'];
  // Stock both window ledges with groups of upright books and low stacks.
  for(const {x} of BOOKSHOP.windowShelves){
    for(let j=0;j<16;j++){
      const bx=x+.3+j*.24,h=.42+(j*7%5)*.055,c=colors[j%colors.length];
      box(bx,.85,.22,.19,h,.38,c);
      box(bx+.025,.94,.605,.14,.025,.012,'#d9c99e');
    }
    for(let j=0;j<3;j++){
      box(x+4.55,.85+j*.095,.2,.85,.09,.42,colors[(j+3)%colors.length]);
      box(x+4.59,.87+j*.095,.625,.77,.045,.012,'#dccca5');
    }
  }
  for(const [i,b] of BOOKSHOP.shelves.entries()){
    const long=b.d>b.w,len=long?b.d:b.w;
    // Keep dividers and shelf boards inside the end panels for Three.js.
    // Exposed coplanar edges otherwise leave seams and fight for depth.
    const inset=.1;
    // Open shelves expose the spines from both sides of each browsing aisle.
    if(long){
      box(b.x+b.w/2-.06,0,b.z+inset,.12,3.2,b.d-2*inset,'#3d3029');
      for(const z of [b.z,b.z+b.d-.1])box(b.x,0,z,b.w,3.2,.1,'#79583b');
    }else{
      box(b.x+inset,0,b.z+b.d-.1,b.w-2*inset,3.2,.1,'#3d3029');
      for(const x of [b.x,b.x+b.w-.1])box(x,0,b.z,.1,3.2,b.d,'#79583b');
    }
    for(const y of [.25,1,1.75,2.5]){
      box(b.x+(long?0:inset),y,b.z+(long?inset:0),
        b.w-(long?0:2*inset),.1,b.d-(long?2*inset:0),'#ac8457');
      for(let j=0;j<Math.floor((len-.2)/.22);j++){
        const h=.42+((j*7+i)%5)*.045,c=colors[(j+i)%colors.length];
        const x=long?b.x+.07:b.x+.1+j*.22,z=long?b.z+.1+j*.22:b.z+.07;
        box(x,y+.1,z,long?b.w-.14:.17,h,long?.17:b.d-.14,c);
      }
    }
    box(b.x,3.2,b.z,b.w,.14,b.d,'#ac8457');
    // Cream category plaques above each bookcase.
    const lines=BOOK_CATEGORIES[i].split('\n'),plaqueHeight=lines.length*.15;
    box(b.x,3.13-plaqueHeight,b.z-.015,b.w,plaqueHeight,.03,'#d9c99e');
    const scale=Math.min(.025,(b.w-.1)/(Math.max(...lines.map(line=>line.length))*4));
    lines.forEach((line,row)=>label(line,b.x+.05,3-row*.15,b.z-.02,scale));
  }
  for(const b of BOOKSHOP.tables){
    for(const x of [b.x+.15,b.x+b.w-.3])for(const z of [b.z+.15,b.z+b.d-.3])box(x,0,z,.15,.85,.15,'#49372d');
    box(b.x,.85,b.z,b.w,.15,b.d,'#a57b51');
  }

  box(counter.x,0,counter.z,counter.w,1.15,counter.d,'#614733');box(counter.x-.08,1.15,counter.z-.08,counter.w+.16,.13,counter.d+.16,'#ad8756');
  const till=BOOKSHOP.till,tx=till.x-.45,tz=till.z-.35;
  const tillScale=.81;
  const tillX=x=>till.x+(x-till.x)*tillScale,tillY=y=>1.28+(y-1.28)*tillScale,tillZ=z=>till.z+(z-till.z)*tillScale;
  const tillBox=(x,y,z,w,h,d,color)=>box(tillX(x),tillY(y),tillZ(z),w*tillScale,h*tillScale,d*tillScale,color);
  const tillPanel=(x,y,z,w,h,color)=>panel(tillX(x),tillY(y),tillZ(z),w*tillScale,h*tillScale,color);
  // A broad cash drawer, raised display, keypad and receipt roll distinguish
  // the register from the books stacked beside it.
  tillBox(tx,1.28,tz,.9,.18,.7,'#bcc0b4');
  tillBox(tx+.05,1.3,tz-.015,.8,.105,.025,'#424a45');
  tillBox(tx+.37,1.33,tz-.035,.16,.035,.025,'#e0d8b5');
  tillBox(tx+.05,1.46,tz+.07,.8,.12,.55,'#78877b');
  tillBox(tx+.08,1.58,tz+.08,.35,.16,.4,'#a9b2a0');
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)tillBox(tx+.11+col*.095,1.74,tz+.1+row*.085,.065,.025,.055,(row===3&&col===2)?'#b07b53':'#e6dfc9');
  tillBox(tx+.07,1.58,tz+.52,.56,.4,.12,'#424e48');
  for(const z of [tz+.51,tz+.645]){
    tillPanel(tx+.12,1.65,z,.46,.23,'#132e29');
    // Three green seven-segment zeroes, visible from either side.
    for(let digit=0;digit<3;digit++){
      const x=tx+.17+digit*.13;
      for(const y of [1.69,1.8])tillPanel(x,y,z-.002,.075,.018,'#9ee5a0');
      for(const xx of [x,x+.058])tillPanel(xx,1.69,z-.002,.017,.128,'#9ee5a0');
    }
  }
  tillBox(tx+.55,1.58,tz+.15,.23,.16,.28,'#d2cbb8');
  tillBox(tx+.59,1.74,tz+.2,.15,.16,.025,'#f4ead1');
  box(BOOKSHOP.deskBook.x-.325,1.28,BOOKSHOP.deskBook.z-.225,.65,.15,.45,'#8e6178');

  for(const chair of chairs){
    const upholsteredBox=(x,y,z,w,h,d,color)=>model.rotatedBox(x,y,z,w,h,d,color,chair);
    // Deep padded seat, full-height cushioned back and broad fabric arms.
    upholsteredBox(-.8,.12,-.75,1.6,.35,1.5,'#674e48');
    upholsteredBox(-.56,.47,-.4,1.12,.2,1.05,'#b18a76');
    upholsteredBox(-.8,.47,-.75,1.6,.95,.3,'#98735f');
    upholsteredBox(-.56,.7,-.435,1.12,.58,.12,'#b18a76');
    for(const x of [-.8,.56])upholsteredBox(x,.47,-.45,.24,.4,1.2,'#98735f');
  }
  for(const table of BOOKSHOP.readingTables){
    cylinder(table.x,0,table.z,.27,.08,'#49372d');
    cylinder(table.x,.08,table.z,.07,.51,'#614733');
    cylinder(table.x,.59,table.z,table.radius,.09,'#79583b','#ad8756');
  }
  // Warm pendant lights above the displays and reading nook.
  for(const [x,z] of [[8.5,6.9],[8.5,11.9],...chairs.map(c=>[c.x,c.z])]){box(x-.035,3.55,z-.035,.07,.95,.07,'#3a322c');box(x-.45,3.4,z-.35,.9,.18,.7,'#c8a56b');quad(x-.35,3.39,z-.25,.7,.5,'#ffe1a0');}
  return model.finish();
}

// Assemble native primitives once; retain one vertex-coloured geometry per model.
function createModel(){
  const positions=[],colors=[];
  function add(geometry,color,transform=new THREE.Matrix4(),top=color){
    const source=geometry.index?geometry.toNonIndexed():geometry;
    const p=source.attributes.position,n=source.attributes.normal;
    const tint=new THREE.Color(color),cap=new THREE.Color(top),v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(transform);positions.push(v.x,v.y,v.z);
      const c=n?.getY(i)>.99?cap:tint;colors.push(c.r,c.g,c.b);
    }
    if(source!==geometry)source.dispose();geometry.dispose();
  }
  const translate=(x,y,z)=>new THREE.Matrix4().makeTranslation(x,y,-z);
  const box=(x,y,z,w,h,d,color,top=color)=>add(new THREE.BoxGeometry(w,h,d),color,translate(x+w/2,y+h/2,z+d/2),top);
  const panel=(x,y,z,w,h,color)=>add(new THREE.PlaneGeometry(w,h),color,translate(x+w/2,y+h/2,z));
  const quad=(x,y,z,w,d,color)=>add(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),color,translate(x+w/2,y,z+d/2));
  const cylinder=(x,y,z,r,h,color,top=color,rTop=r)=>add(new THREE.CylinderGeometry(rTop,r,h,16),color,translate(x,y+h/2,z),top);
  return {add,box,panel,quad,cylinder,
    side(x,y,z,d,h,color){add(new THREE.PlaneGeometry(d,h).rotateY(Math.PI/2),color,translate(x,y+h/2,z+d/2));},
    rotatedBox(x,y,z,w,h,d,color,at){
      const transform=translate(at.x,0,at.z).multiply(new THREE.Matrix4().makeRotationY(-at.angle)).multiply(translate(x+w/2,y+h/2,z+d/2));
      add(new THREE.BoxGeometry(w,h,d),color,transform);
    },
    finish(){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
    }
  };
}

export function createBookGeometry(color){
  const model=createModel();
  model.box(-.3,0,-.275,.6,.08,.55,color);
  model.box(-.26,.08,-.235,.52,.015,.47,'#dccca5');
  return model.finish();
}

export function createBooksellerGeometry(){
  const model=createModel(),scale=4/3;
  const box=(x,y,z,w,h,d,color)=>model.box(x*scale,y*scale,z*scale,w*scale,h*scale,d*scale,color);
  const cylinder=(y,r,h,color)=>model.cylinder(0,y*scale,0,r*scale,h*scale,color);
  for(const x of [-.16,.08])box(x,0,-.1,.16,.82,.22,'#282731');
  box(-.28,.8,-.17,.56,.57,.34,'#eee5cf');
  box(-.23,.83,-.195,.46,.48,.04,'#25232b');
  box(-.085,1.02,-.24,.17,.33,.04,'#fff4df');
  for(const side of [-1,1])box(side*.08-.045,1.27,-.29,.09,.07,.04,'#24232b');
  for(const y of [.92,1.04,1.16])box(.11,y,-.24,.025,.025,.03,'#cfad6b');
  cylinder(1.37,.09,.12,'#94624e');cylinder(1.49,.19,.34,'#94624e');cylinder(1.79,.2,.1,'#201e26');
  for(const x of [-.08,.07])box(x,1.67,-.2,.035,.04,.025,'#2a282a');
  box(-.025,1.57,-.23,.055,.09,.07,'#94624e');
  box(-.045,1.535,-.205,.09,.018,.025,'#9f6658');
  for(const side of [-1,1]){
    const x=side*.345-.065;
    box(x,.98,-.14,.13,.36,.23,'#eee5cf');box(x,.98,-.37,.13,.12,.27,'#94624e');
  }
  return model.finish();
}

export function createBackpackGeometry(){
  const model=createModel();
  // Elliptical rings form the domed fabric body, with a closed reinforced base.
  const profile=[[0,0],[.23,0],[.31,.07],[.33,.46],[.3,.65],[.23,.78],[.12,.86],[.035,.875],[0,.88]];
  const body=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),16);
  body.scale(1,1,.66);model.add(body,'#44605c');
  const pocket=new THREE.Shape();
  pocket.moveTo(-.19,.12);
  for(const [x,y] of [[.19,.12],[.24,.17],[.24,.38],[.19,.43],[-.19,.43],[-.24,.38],[-.24,.17]])pocket.lineTo(x,y);
  pocket.closePath();
  model.add(new THREE.ExtrudeGeometry(pocket,{depth:.145,bevelEnabled:false}).translate(0,0,.17),'#658076');
  const seam=(points,width,color)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x,y,-z)));
    model.add(new THREE.TubeGeometry(curve,24,width/2,4,false),color);
  };
  seam([[-.275,.49,-.16],[-.24,.68,-.16],[-.15,.795,-.13],[0,.845,-.1],[.15,.795,-.13],[.24,.68,-.16],[.275,.49,-.16]],.014,'#a6a28a');
  seam([[-.19,.405,-.32],[.19,.405,-.32]],.013,'#d0bf92');
  model.box(.155,.355,-.34,.025,.065,.018,'#d7c799');
  model.box(-.28,.475,-.18,.025,.07,.02,'#d7c799');
  model.box(-.065,.265,-.323,.13,.06,.012,'#c6b78e');
  for(const x of [-.19,.19]){
    seam([[x,.72,.155],[x,.62,.3],[x,.33,.345],[x,.12,.19]],.075,'#263b36');
    model.box(x-.035,.17,.235,.07,.06,.025,'#b6ac89');
  }
  seam([[-.09,.83,.035],[-.09,.95,.035],[-.055,1,.035],[.055,1,.035],[.09,.95,.035],[.09,.83,.035]],.032,'#b39c6d');
  for(const x of [-.28,.26])model.box(x,.11,-.075,.02,.35,.06,'#3b514a');
  return model.finish();
}
