import {facingDoorway,drawStaff,BLONDE_RECEPTIONIST,drawCylinder} from './pub-interior.js?v=staff-room-1';

export const ARCADE={width:18,depth:16,height:4.5,door:{x:11,z:0},spawn:{x:11,z:1.8,angle:0},
  desk:{x:11.5,z:12.8,w:6.5,d:1.3},attendant:{x:14.5,z:14.8,radius:.55},
  cabinets:[...Array.from({length:5},(_,i)=>({x:.5+i*2,z:14,w:1.5,d:1.5})),
    ...Array.from({length:4},(_,i)=>({x:.5+i*2.3,z:7.5,w:1.5,d:1.5}))],
  pinballs:[{x:13,z:6,w:1.5,d:2.7},{x:15.4,z:6,w:1.5,d:2.7}]};
export function facingArcadeDoor(player,buildings){
  return buildings.find(b=>{
    if(b.sign!=='ARCADE')return false;
    const south=b.j===1,z=south?b.z+b.d:b.z;
    return (south?player.z>z:player.z<z)&&facingDoorway(player,{x:b.x+b.w/2,z},b.w*10/160);
  });
}
export const facingArcadeExit=player=>player.z>0&&facingDoorway(player,ARCADE.door,.85);
export function moveInArcade(player,dx,dz){
  const r=.3,obstacles=[ARCADE.desk,...ARCADE.cabinets,...ARCADE.pinballs];
  const clear=(x,z)=>x>=r&&x<=ARCADE.width-r&&z>=r&&z<=ARCADE.depth-r&&
    !obstacles.some(b=>x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)&&
    Math.hypot(x-ARCADE.attendant.x,z-ARCADE.attendant.z)>=r+ARCADE.attendant.radius;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
const FONT={A:['010','101','111','101','101'],C:['111','100','100','100','111'],H:['101','101','111','101','101'],N:['101','111','111','111','101'],G:['111','100','101','101','111'],E:['111','100','110','100','111'],X:['101','101','010','101','101'],I:['111','010','010','010','111'],T:['111','010','010','010','010']};
export function drawArcadeInterior({face,quad,box}){
  const panel=(x,y,z,w,h,color)=>face([{x,y,z},{x:x+w,y,z},{x:x+w,y:y+h,z},{x,y:y+h,z}],color);
  const label=(word,x,y,z,s,color,direction=1)=>{
    for(const [i,c] of [...word].entries())for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(FONT[c]?.[row][col]==='1')panel(x+direction*(i*4+col)*s,y+(4-row)*s,z,direction*s,s,color);
  };
  for(let x=0;x<18;x+=2)for(let z=0;z<16;z+=2){quad(x,0,z,2,2,(x+z)%4?'#302944':'#49405a');quad(x,4.5,z,2,2,'#16182b');}
  const wall=(x,z,dx,dz)=>{
    for(let i=0;i<8;i++){
      const strip=(low,high,color)=>face([{x:x+dx*i/8,y:low,z:z+dz*i/8},{x:x+dx*(i+1)/8,y:low,z:z+dz*(i+1)/8},{x:x+dx*(i+1)/8,y:high,z:z+dz*(i+1)/8},{x:x+dx*i/8,y:high,z:z+dz*i/8}],color);
      strip(0,1,'#272338');strip(1,3.7,'#40304f');strip(3.7,3.77,'#ed58c4');strip(3.77,4.5,'#25233c');
    }
  };
  const doorX=ARCADE.door.x,left=doorX-.85,right=doorX+.85;
  wall(0,0,left,0);wall(right,0,ARCADE.width-right,0);wall(0,16,18,0);wall(0,0,0,16);wall(18,0,0,16);
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
  panel(b.x+.2,.25,b.z-.02,b.w-.4,.72,'#20263b');label('CHANGE',b.x+1.65,.45,b.z-.03,.12,'#ffdf89');
  drawStaff({face,box},ARCADE.attendant,BLONDE_RECEPTIONIST);
  // Cash register and trays of coins on the change desk.
  box(12.3,1.34,13,.7,.3,.55,'#a8a8b8');box(12.4,1.64,13.25,.5,.22,.17,'#34394c');panel(12.45,1.7,13.24,.4,.1,'#a0eac7');
  box(15.4,1.34,13,.8,.06,.5,'#242437');
  for(let i=0;i<4;i++)drawCylinder(face,15.53+i*.17,1.4,13.2,.065,.035*(i+1),'#d6b975');
  // Space-themed wall art and ceiling light bars.
  for(const x of [2,6]){
    panel(x,1.65,.03,2.2,1.65,'#d794bd');panel(x+.08,1.73,.04,2.04,1.49,'#151d36');
    for(let i=0;i<9;i++)panel(x+.2+(i*7%17)*.1,1.9+(i*3%11)*.1,.05,.035,.035,'#e5dbef');
    panel(x+.8,2.2,.06,.65,.4,'#67c9d9');panel(x+.5,2.35,.07,1.25,.07,'#e9b6ec');
  }
  for(const x of [4,10,15])for(const z of [4,11])box(x,4.35,z,2,.08,.15,'#a6dcf2');
}
