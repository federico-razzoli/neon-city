import {facesEntrance} from './entrances.js';
import {facingDoorway,facingNearest,drawStaff,BLONDE_RECEPTIONIST,BARTENDER_REPLY,drawCylinder,drawRod} from './pub-interior.js?v=court-shoes-1';

// The room runs a metre deeper than the bridge console needs, so its chairs
// leave the aisle behind them as wide as before.
// The door is midway between the nearer planet picture (x 6–8.2) and the
// bridge console (from x 12.4), with 1.25 m of wall either side.
export const ARCADE={width:18,depth:17,height:4.5,door:{x:10.3,z:0},spawn:{x:10.3,z:1.8,angle:0},
  bridgeConsole:{x:12.4,z:.15,w:5.1,d:1.25},
  // One swivel chair per station, seated facing the console.
  bridgeChairs:[0,1,2].map(i=>({x:13.25+i*1.7,z:2.05,radius:.38,angle:Math.PI})),
  desk:{x:11.5,z:13.8,w:6.5,d:1.3},attendant:{x:14.5,z:15.8,radius:.55},
  // The cash register and the tray of coins drawn on the desk.
  deskThings:[{x:12.65,z:14.3,radius:.4},{x:15.8,z:14.25,radius:.4}],
  cabinets:[...Array.from({length:5},(_,i)=>({x:.5+i*2,z:15,w:1.5,d:1.5})),
    ...Array.from({length:4},(_,i)=>({x:.5+i*2.3,z:8.5,w:1.5,d:1.5}))],
  pinballs:[{x:13,z:7,w:1.5,d:2.7},{x:15.4,z:7,w:1.5,d:2.7}]};
export function facingArcadeDoor(player,buildings){
  return buildings.find(b=>{
    if(b.sign!=='ARCADE')return false;
    return facesEntrance(player,b,facingDoorway);
  });
}
export const facingArcadeExit=player=>player.z>0&&facingDoorway(player,ARCADE.door,.85);
export const facingArcadeSeat=player=>facingNearest(player,ARCADE.bridgeChairs);
export const DESK_THING_REPLY="DON'T TOUCH IT, PLEASE.";
// The attendant only answers from her own side of the desk, sending the player
// back round; the things on the desk are off limits from either side.
export function arcadeReply(player){
  const {desk,attendant,deskThings}=ARCADE,behind=player.z>desk.z+desk.d;
  const thing=facingNearest(player,behind?[attendant,...deskThings]:deskThings);
  return thing===attendant?BARTENDER_REPLY:thing?DESK_THING_REPLY:null;
}
export function moveInArcade(player,dx,dz){
  const r=.3,obstacles=[ARCADE.bridgeConsole,ARCADE.desk,...ARCADE.cabinets,...ARCADE.pinballs];
  const clear=(x,z)=>x>=r&&x<=ARCADE.width-r&&z>=r&&z<=ARCADE.depth-r&&
    !obstacles.some(b=>x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)&&
    [ARCADE.attendant,...ARCADE.bridgeChairs].every(c=>Math.hypot(x-c.x,z-c.z)>=r+c.radius);
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
// The black shell catches more light where it curves away at the sides.
const SHELL_SHADES=['#121318','#14151b','#18191f','#1e1f26','#25272f','#2d2f38'];
const FONT={A:['010','101','111','101','101'],C:['111','100','100','100','111'],H:['101','101','111','101','101'],N:['1001','1101','1011','1001','1001'],G:['111','100','101','101','111'],E:['111','100','110','100','111'],K:['101','101','110','101','101'],O:['111','101','101','101','111'],S:['111','100','111','001','111'],X:['101','101','010','101','101'],I:['111','010','010','010','111'],T:['111','010','010','010','010']};
export function drawArcadeInterior({face,quad,box}){
  const panel=(x,y,z,w,h,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y:y+h,z},{x,y:y+h,z}],color);
  const label=(word,x,y,z,s,color,direction=1)=>{
    // Glyphs are 3 columns wide unless drawn wider (N needs 4 for its diagonal).
    let start=0;
    for(const c of word){
      const glyph=FONT[c];
      for(let row=0;row<5;row++)for(let col=0;col<(glyph?.[row].length??0);col++)if(glyph[row][col]==='1')panel(x+direction*(start+col)*s,y+(4-row)*s,z,direction*s,s,color);
      start+=(glyph?.[0].length??3)+1;
    }
  };
  const {width,depth}=ARCADE;
  for(let x=0;x<width;x+=2)for(let z=0;z<depth;z+=2){const d=Math.min(2,depth-z);quad(x,0,z,2,d,(x+z)%4?'#302944':'#49405a');quad(x,4.5,z,2,d,'#16182b');}
  const wall=(x,z,dx,dz)=>{
    for(let i=0;i<8;i++){
      const strip=(low,high,color)=>face([{x:x+dx*i/8,y:low,z:z+dz*i/8},{x:x+dx*(i+1)/8,y:low,z:z+dz*(i+1)/8},{x:x+dx*(i+1)/8,y:high,z:z+dz*(i+1)/8},{x:x+dx*i/8,y:high,z:z+dz*i/8}],color);
      strip(0,1,'#272338');strip(1,3.7,'#40304f');strip(3.7,3.77,'#ed58c4');strip(3.77,4.5,'#25233c');
    }
  };
  const doorX=ARCADE.door.x,left=doorX-.85,right=doorX+.85;
  wall(0,0,left,0);wall(right,0,width-right,0);wall(0,depth,width,0);wall(0,0,0,depth);wall(width,0,0,depth);
  panel(left,0,0,1.7,3,'#262a43');panel(left,3,0,1.7,1.5,'#40304f');
  box(doorX+.55,1.05,.02,.09,.3,.08,'#d9c58e');
  // Viewed toward -z, screen-right runs toward decreasing world x.
  panel(doorX-.7,3.15,.025,1.4,.6,'#183d3b');label('EXIT',doorX+.525,3.27,.03,.07,'#94ffd3',-1);
  const colors=['#ed5cb9','#56dbe7','#f1c65f','#99d47c'];
  for(const [i,b] of ARCADE.cabinets.entries()){
    const {x,z,w}=b,c=colors[i%4];
    box(x,0,z,w,1.05,1.5,'#222337');box(x+.06,.12,z-.01,w-.12,.68,.02,'#34304c');
    box(x,1.05,z-.02,w,.17,.62,c);box(x,1.22,z+.38,w,1.1,1.12,'#202338');
    box(x,2.32,z+.32,w,.32,1.18,c);panel(x+.13,2.39,z+.31,w-.26,.16,'#fff0b0');
    panel(x+.13,1.4,z+.365,w-.26,.79,'#080e24');
    // Distinct decorative game screens: invaders, a maze, and a racer.
    if(i%3===0){
      for(let a=0;a<3;a++)for(let row=0;row<2;row++){
        panel(x+.24+a*.35,1.82+row*.18,z+.35,.19,.08,'#93f4a2');
        panel(x+.27+a*.35,1.79+row*.18,z+.345,.04,.14,'#93f4a2');
      }
      panel(x+.66,1.48,z+.35,.22,.08,'#ff76bf');
    }else if(i%3===1){
      for(let j=0;j<4;j++){panel(x+.23,1.5+j*.17,z+.35,.85,.035,'#5497fa');panel(x+.23+j*.27,1.5,z+.345,.035,.57,'#5497fa');}
      panel(x+.65,1.74,z+.33,.1,.1,'#ffe480');
    }else{
      for(const off of [.35,1.1])panel(x+off,1.43,z+.35,.04,.71,'#a7b5cb');
      panel(x+.7,1.53,z+.34,.14,.27,c);
      for(let j=0;j<3;j++)panel(x+.72,1.87+j*.1,z+.35,.025,.06,'#fff5ce');
    }
    drawCylinder(face,x+.4,1.22,z+.18,.035,.16,'#c7ced8');drawCylinder(face,x+.4,1.38,z+.18,.075,.08,'#ed677e');
    for(let j=0;j<3;j++)drawCylinder(face,x+.85+j*.17,1.22,z+.18,.055,.035,colors[(i+j)%4]);
    panel(x+.65,.57,z-.035,.2,.25,'#a7a5b3');panel(x+.72,.67,z-.04,.055,.12,'#111827');
    // Side art and a rear accent make the freestanding row finished on all sides.
    box(x+.04,.3,z+1.5,w-.08,1.7,.015,'#302840');box(x+.15,1.9,z+1.52,w-.3,.08,.015,c);
  }
  for(const [i,b] of ARCADE.pinballs.entries()){
    const {x,z,w,d}=b,c=colors[i];
    for(const a of [.12,w-.2])for(const t of [.15,d-.25])box(x+a,0,z+t,.08,.85,.08,'#adb3c7');
    box(x,.85,z,w,.3,d,'#39304f');
    const slope=(px,pz)=>({x:px,y:1.17+(pz-z)*.14,z:pz});
    face([slope(x+.08,z),slope(x+w-.08,z),slope(x+w-.08,z+d),slope(x+.08,z+d)],'#164354');
    for(const side of [0,w-.07]){const a=slope(x+side,z),b=slope(x+side,z+d);face([a,{...a,x:a.x+.07},{...b,x:b.x+.07},b],c);}
    for(const [a,t] of [[.4,1],[1,1.5],[.65,2]])drawCylinder(face,x+a,1.17+t*.14,z+t,.14,.1,c,'#ffe39a');
    for(const a of [.4,.85])box(x+a,1.23,z+.4,.27,.05,.08,'#fff0c3');
    drawCylinder(face,x+1.13,1.23,z+.45,.055,.07,'#ecf8ff');
    box(x,1.5,z+d-.22,w,.95,.22,c);panel(x+.09,1.64,z+d-.23,w-.18,.63,'#131c30');
    for(let j=0;j<5;j++)panel(x+.2+j*.23,1.87,z+d-.24,.12,.19,'#ffdf80');
    box(x+w-.12,1.01,z-.12,.08,.08,.16,'#d5d7dc');
  }
  const b=ARCADE.desk;
  box(b.x,0,b.z,b.w,1.2,b.d,'#353148');box(b.x,1.2,b.z-.08,b.w,.14,b.d+.16,'#ad78ab');
  panel(b.x+.2,.25,b.z-.02,b.w-.4,.72,'#20263b');label('TOKENS',b.x+(b.w-2.88)/2,.45,b.z-.03,.12,'#ffdf89');
  drawStaff({face,box},ARCADE.attendant,BLONDE_RECEPTIONIST);
  // Cash register and trays of coins on the token desk (see ARCADE.deskThings).
  box(12.3,1.34,b.z+.2,.7,.3,.55,'#a8a8b8');box(12.4,1.64,b.z+.45,.5,.22,.17,'#34394c');panel(12.45,1.7,b.z+.44,.4,.1,'#a0eac7');
  box(15.4,1.34,b.z+.2,.8,.06,.5,'#242437');
  for(let i=0;i<4;i++)drawCylinder(face,15.53+i*.17,1.4,b.z+.4,.065,.035*(i+1),'#d6b975');
  // A decorative original-series bridge station faces the pinball aisle.
  // Raised grey surround, red fascia and black sloping control surfaces.
  const console=ARCADE.bridgeConsole;
  box(12.3,1.9,.025,5.3,2.25,.16,'#959aa6');
  panel(12.46,2.06,.19,4.98,1.93,'#060d20');
  for(let i=0;i<42;i++){
    const x=12.55+(i*37%479)/100,y=2.15+(i*29%173)/100;
    panel(x,y,.195,i%7===0?.025:.013,i%7===0?.025:.013,i%3?'#a4bfd9':'#fbecd3');
  }
  const ellipse=(x,y,rx,ry,z,color)=>face(Array.from({length:40},(_,i)=>({x:x+Math.cos(i*Math.PI/20)*rx,y:y+Math.sin(i*Math.PI/20)*ry,z})),color);
  // Ringed amber planet and a blue ocean world, with a tiny moon.
  ellipse(13.62,3.12,.92,.19,.20,'#88799a');
  ellipse(13.62,3.12,.66,.66,.205,'#bb7754');
  ellipse(13.55,3.18,.55,.56,.21,'#e3b57b');
  for(const [dy,color] of [[-.3,'#c48c63'],[-.08,'#f1c992'],[.17,'#c9976c']]){
    const radius=.58,low=dy,high=dy+.07;
    face([{x:13.62-Math.sqrt(radius*radius-low*low),y:3.12+low,z:.215},{x:13.62+Math.sqrt(radius*radius-low*low),y:3.12+low,z:.215},{x:13.62+Math.sqrt(radius*radius-high*high),y:3.12+high,z:.215},{x:13.62-Math.sqrt(radius*radius-high*high),y:3.12+high,z:.215}],color);
  }
  // Near half of the rings passes across the planet's lower hemisphere.
  for(let i=20;i<40;i++){
    const point=(t,r)=>({x:13.62+Math.cos(t)*r,y:3.12+Math.sin(t)*r*.21,z:.22});
    const a=i*Math.PI/20,b=(i+1)*Math.PI/20;
    face([point(a,.75),point(a,.98),point(b,.98),point(b,.75)],'#d1b8b4');
  }
  ellipse(16.01,2.94,.52,.52,.205,'#25436d');
  ellipse(15.93,3,.42,.44,.21,'#4f96b8');
  ellipse(15.79,3.15,.17,.12,.215,'#93c4a3');ellipse(16.07,2.85,.13,.22,.215,'#7da894');
  ellipse(15.95,3.3,.24,.025,.22,'#d8e7dc');ellipse(15.86,2.77,.2,.025,.22,'#d8e7dc');
  ellipse(16.85,3.6,.13,.13,.205,'#c8c8d3');
  box(console.x,0,console.z,console.w,1,console.d,'#747b89');
  box(console.x,.86,console.z+console.d,console.w,.17,.06,'#b84643');
  for(let station=0;station<3;station++){
    const x=console.x+station*1.7;
    // Wedge sides enclose the inclined panel; controls sit on the same plane.
    const top=(px,pz,lift=0)=>({x:px,y:1.48-(pz-console.z)*.36+lift,z:pz});
    for(const edge of [x,x+1.7])face([{x:edge,y:1,z:console.z},{x:edge,y:1,z:console.z+console.d},top(edge,console.z+console.d),top(edge,console.z)],'#a3a7ae');
    const control=(px,pz,w,d,color,lift=.008)=>face([top(px,pz,lift),top(px+w,pz,lift),top(px+w,pz+d,lift),top(px,pz+d,lift)],color);
    control(x+.035,console.z,1.63,console.d,'#151c29',0);
    control(x+.16,.28,.63,.38,'#293d49');
    // Small rectangular telemetry lights and the characteristic coloured keys.
    for(let j=0;j<4;j++)control(x+.2+j*.13,.34,.07,.025+j*.045,'#97cbd1',.016);
    for(let row=0;row<3;row++)for(let col=0;col<5;col++)control(x+.87+col*.13,.29+row*.14,.09,.085,['#df5b51','#e8c779','#91bcc7','#e5e2ca'][(row+col+station)%4]);
    for(let j=0;j<7;j++)control(x+.17+j*.19,1.02,.12,.13,j%3?'#d8dbca':'#db6454');
    for(let j=0;j<3;j++){
      control(x+.18+j*.19,.78,.12,.08,'#8997a2');
      control(x+.21+j*.19,.76,.035,.13,'#f0e9d7',.035);
    }
    // Recessed front panel and vent slots finish each station's cabinet.
    panel(x+.16,.2,1.41,1.38,.47,'#414a5c');
    for(let j=0;j<6;j++)panel(x+.35+j*.17,.34,1.415,.09,.025,'#171f30');
  }
  // Original-series bridge chairs, at pub-chair scale: a black pedestal on a
  // four-footed star base, a pale blue-grey cushion in a black bowl, and a
  // tall black shell that wraps the seat and rises above the console's edge.
  for(const {x,z} of ARCADE.bridgeChairs){
    for(let i=0;i<4;i++){
      const t=Math.PI/4+i*Math.PI/2,fx=x+Math.cos(t)*.36,fz=z+Math.sin(t)*.36;
      drawRod(face,{x,y:.08,z},{x:fx,y:.04,z:fz},.03,'#24262d');
      box(fx-.04,0,fz-.04,.08,.04,.08,'#9aa1ad');
    }
    drawCylinder(face,x,0,z,.09,.1,'#24262d');
    drawCylinder(face,x,.1,z,.055,.36,'#24262d');
    drawCylinder(face,x,.44,z,.08,.05,'#9aa1ad');
    drawCylinder(face,x,.49,z,.2,.13,'#121318','#121318',.36);
    drawCylinder(face,x,.62,z,.33,.07,'#8ea7ba','#b3c6d4');
    // The shell's arc is centred on +z, away from the console; each level
    // gives its height, how far it wraps round, and its radius.
    const levels=[[.6,1.45,.37],[.72,1.3,.36],[.9,1,.34],[1.1,1,.34],[1.28,1,.35],[1.4,.85,.35],[1.47,.5,.35]];
    const n=12,point=(level,i,inset=0)=>{const [y,spread,r]=level,t=Math.PI/2-spread+i*2*spread/n;return {x:x+Math.cos(t)*(r-inset),y,z:z+Math.sin(t)*(r-inset)};};
    for(let l=0;l+1<levels.length;l++){
      const a=levels[l],b=levels[l+1],padded=a[0]>=.72&&b[0]<=1.4;
      for(let i=0;i<n;i++){
        face([point(a,i),point(a,i+1),point(b,i+1),point(b,i)],SHELL_SHADES[Math.floor(Math.abs(i+.5-n/2))]);
        face([point(a,i,.04),point(a,i+1,.04),point(b,i+1,.04),point(b,i,.04)],padded?'#8ea7ba':'#1d1f26');
      }
      for(const i of [0,n])face([point(a,i),point(a,i,.04),point(b,i,.04),point(b,i)],'#2a2c34');
    }
    const top=levels.at(-1);
    for(let i=0;i<n;i++)face([point(top,i),point(top,i+1),point(top,i+1,.04),point(top,i,.04)],'#2a2c34');
  }
  // Space-themed wall art and ceiling light bars.
  for(const x of [2,6]){
    panel(x,1.65,.03,2.2,1.65,'#d794bd');panel(x+.08,1.73,.04,2.04,1.49,'#151d36');
    for(let i=0;i<9;i++)panel(x+.2+(i*7%17)*.1,1.9+(i*3%11)*.1,.05,.035,.035,'#e5dbef');
    panel(x+.8,2.2,.06,.65,.4,'#67c9d9');panel(x+.5,2.35,.07,1.25,.07,'#e9b6ec');
  }
  for(const x of [4,10,15])for(const z of [5,12])box(x,4.35,z,2,.08,.15,'#a6dcf2');
}
