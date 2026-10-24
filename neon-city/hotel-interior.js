import {drawCylinder,drawRod,drawStaff,facingDoorway,facingNearest,NURSE_JOY,BLONDE_RECEPTIONIST} from './pub-interior.js?v=lavatory-1';

// Interior coordinates are local: the street entrance is centred on the south
// wall. The staircase climbs the east wall to a landing; the receptionist
// stands behind a desk that closes off the north-west corner.
export const HOTEL={width:20,depth:16,height:7,
  door:{x:10,z:0,halfWidth:1.2},spawn:{x:10,z:1.8,angle:0},
  desk:{x:0,z:12,w:8,d:1.2},deskReturn:{x:6.8,z:13.2,w:1.2,d:2.8},
  receptionist:{x:3.6,z:14.4},
  sofa:{x:.3,z:4.6,w:1,d:3.4},
  stairs:{x:16.4,z:3.5,w:3.6,steps:16,rise:.25,run:.5},
  landing:{x:16.4,z:11.5,w:3.6,d:4.5,y:4},
  lift:{x:12,z:16,halfWidth:1.05},liftButton:{x:13.53,z:16,halfWidth:.08},
  palms:[{x:.9,z:3.5,radius:.45},{x:.9,z:9,radius:.45}],
  lamp:{x:1.42,z:12.38,radius:.3},bell:{x:6,z:12.5,radius:.25},
  chandelier:{x:10,z:7}};
export const RECEPTIONISTS=[NURSE_JOY,BLONDE_RECEPTIONIST];
// Lobby walls are lit up from their dark facade colours, as if by the chandelier.
const brighter=(color,factor)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(color.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('');
// The same red carpet runs up the stairs in every hotel.
const STAIR_CARPET=['#6e2030','#7a2636'];

// Furniture the player cannot walk through, including the banister's newel post.
const obstacles=()=>{
  const {stairs:s}=HOTEL;
  return [HOTEL.desk,HOTEL.deskReturn,HOTEL.sofa,{x:s.x-.1,z:s.z-.3,w:.28,d:.28}];
};
// Height of the floor underfoot: the stairs rise evenly from their bottom
// step to the landing, so the view climbs smoothly rather than step by step.
export function hotelFloorHeight(x,z){
  const {stairs:s,landing:l}=HOTEL;
  if(x<s.x||z<s.z)return 0;
  return Math.min(l.y,(z-s.z)*s.rise/s.run);
}
// The stairs are entered from their bottom step only: the banister runs the
// length of their open side and round the landing, so nobody climbs over it.
export function moveInHotel(player,dx,dz){
  const radius=.3,boxes=obstacles(),{stairs:s}=HOTEL;
  const clear=(x,z)=>x>=radius&&x<=HOTEL.width-radius&&z>=radius&&z<=HOTEL.depth-radius&&
    !boxes.some(b=>x>b.x-radius&&x<b.x+b.w+radius&&z>b.z-radius&&z<b.z+b.d+radius)&&
    !HOTEL.palms.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+radius)&&
    !(z>s.z-.02&&Math.abs(x-s.x)<radius);
  // Substeps keep running and diagonal motion from crossing furniture or walls.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
// The street doors are the glazed pair in the middle of the hotel's
// street-facing facade, as drawn on its wall texture.
export function facingHotelDoor(player,buildings){
  return buildings.find(b=>{
    if(b.sign!=='HOTEL')return false;
    const south=b.j===1,z=south?b.z+b.d:b.z;
    return (south?player.z>z:player.z<z)&&facingDoorway(player,{x:b.x+b.w/2,z},b.w*10/160);
  });
}
export const facingHotelExit=player=>player.z>HOTEL.door.z&&facingDoorway(player,HOTEL.door,HOTEL.door.halfWidth);
export const facingHotelPlant=player=>facingNearest(player,HOTEL.palms);
// One place to sit per sofa cushion; seated players face the hall.
export const sofaSeats=()=>[0,1,2].map(i=>({x:HOTEL.sofa.x+.62,z:HOTEL.sofa.z+.75+i*.95,radius:.3,angle:Math.PI/2}));
export const facingHotelSeat=player=>facingNearest(player,sofaSeats());
// The lamp on the reception desk, reached across the counter.
export const facingHotelLamp=player=>facingNearest(player,[HOTEL.lamp])!=null;
// The service bell on the reception desk; ringing it brings an answer.
export const facingHotelBell=player=>facingNearest(player,[HOTEL.bell])!=null;
export const BELL_ANSWER="I'M HERE...";
// Switches a hotel's reception lamp. After a couple of goes, the
// receptionist asks the player to stop, every time from then on.
export const LAMP_PATIENCE=2;
export function switchHotelLamp(hotel){
  hotel.lampOn=!hotel.lampOn;
  hotel.lampSwitches=(hotel.lampSwitches??0)+1;
  return hotel.lampSwitches>LAMP_PATIENCE?'CAN YOU NOT, PLEASE?':null;
}
// What Space says in the lobby, or null where there is nothing to try.
export function hotelReply(player){
  const {lift,liftButton}=HOTEL;
  if(hotelFloorHeight(player.x,player.z)>0)return null;
  if(player.z<liftButton.z&&facingDoorway(player,liftButton,liftButton.halfWidth))return "IT'S OUT OF SERVICE";
  if(player.z<lift.z&&facingDoorway(player,lift,lift.halfWidth))return 'TRY PRESSING THE BUTTON...';
  if(facingHotelPlant(player))return "IT'S JUST A PLANT.";
  return null;
}

// The lobby in the hotel's own colours (see hotelLook), empty but for the receptionist.
export function drawHotelInterior({face,quad,box,look:facade,receptionist=NURSE_JOY,lampOn=false}){
  const look={...facade,wall:brighter(facade.wall,1.6),panel:brighter(facade.panel,1.35),wood:facade.wood.map(color=>brighter(color,1.25))};
  const {width:W,depth:D,height:H}=HOTEL;
  const cylinder=(...args)=>drawCylinder(face,...args);
  const rod=(...args)=>drawRod(face,...args);
  // Marble chequer underfoot, a dark coffered ceiling overhead.
  for(let x=0;x<W;x++)for(let z=0;z<D;z++)quad(x,0,z,1,1,look.floor[(x+z)%2]);
  for(let x=0;x<W;x+=2)for(let z=0;z<D;z+=2)quad(x,H,z,2,2,(x+z)%4?'#3a2d36':'#443541');
  // A carpet runner leads from the doors towards the middle of the hall.
  quad(9,.01,0,2,9,look.carpet);
  for(const x of [8.9,11])quad(x,.012,0,.1,9,look.metal);
  // Walls: wood panelling below a brass rail, the hotel's colour above.
  // The south wall stops at the doorway, so no panel overlaps the doors.
  const wall=(x0,z0,x1,z1)=>{
    const n=Math.ceil(Math.hypot(x1-x0,z1-z0));
    for(let i=0;i<n;i++){
      const a=i/n,b=(i+1)/n,p=(t,y)=>({x:x0+(x1-x0)*t,y,z:z0+(z1-z0)*t});
      face([p(a,0),p(b,0),p(b,1.2),p(a,1.2)],look.panel);
      face([p(a,1.2),p(b,1.2),p(b,1.28),p(a,1.28)],look.metal);
      face([p(a,1.28),p(b,1.28),p(b,H),p(a,H)],look.wall);
    }
  };
  const {door}=HOTEL,left=door.x-door.halfWidth,right=door.x+door.halfWidth;
  wall(0,0,left,0);wall(right,0,W,0);
  wall(0,D,W,D);wall(0,0,0,D);wall(W,0,W,D);
  face([{x:left,y:3,z:0},{x:right,y:3,z:0},{x:right,y:H,z:0},{x:left,y:H,z:0}],look.wall);
  // Glazed double doors onto the night street.
  face([{x:left,y:0,z:0},{x:right,y:0,z:0},{x:right,y:3,z:0},{x:left,y:3,z:0}],look.metal);
  for(const [x0,x1] of [[left+.1,door.x-.06],[door.x+.06,right-.1]]){
    face([{x:x0,y:.1,z:.01},{x:x1,y:.1,z:.01},{x:x1,y:2.9,z:.01},{x:x0,y:2.9,z:.01}],'#151a2c');
    face([{x:x0+.15,y:.3,z:.015},{x:x0+.3,y:.3,z:.015},{x:x0+.3,y:2.6,z:.015},{x:x0+.15,y:2.6,z:.015}],'#1f2840');
  }
  for(const x of [door.x-.3,door.x+.22])box(x,1.1,.02,.08,.6,.06,'#d2b678');
  // A gilt cornice runs round the top of the walls.
  for(const [x0,z0,x1,z1] of [[0,.02,W,.02],[0,D-.02,W,D-.02],[.02,0,.02,D],[W-.02,0,W-.02,D]])
    face([{x:x0,y:H-.35,z:z0},{x:x1,y:H-.35,z:z1},{x:x1,y:H-.2,z:z1},{x:x0,y:H-.2,z:z0}],look.metal);

  // Reception: a marble-topped desk, the key cabinet and the receptionist.
  const {desk,deskReturn:side,receptionist:at}=HOTEL;
  for(const b of [desk,side]){
    box(b.x,0,b.z,b.w,1.15,b.d,look.wood[0]);
    box(b.x-.05,1.15,b.z-.1,b.w+.1,.15,b.d+.15,look.column[1],look.column[0]);
  }
  for(let x=desk.x+.3;x+1.1<=desk.x+desk.w-.2;x+=1.3){
    box(x,.15,desk.z-.03,1.1,.8,.03,look.wood[1]);
    box(x+.1,.25,desk.z-.05,.9,.6,.02,look.wood[0]);
  }
  box(desk.x,.95,desk.z-.06,desk.w,.05,.04,look.metal);
  box(1.2,1.4,D-.3,5,1.5,.3,look.wood[1]);
  for(let row=0;row<3;row++)for(let col=0;col<8;col++){
    box(1.35+col*.6,1.52+row*.45,D-.33,.45,.32,.03,'#1f120e');
    if((row*8+col)%3)box(1.55+col*.6,1.6+row*.45,D-.35,.05,.14,.02,look.metal);
  }
  const {bell}=HOTEL;
  cylinder(bell.x,1.3,bell.z,.07,.04,look.metal);cylinder(bell.x,1.34,bell.z,.06,.06,look.metal,look.metal,.01);
  // A banker's lamp and a vase of roses on the counter. The lamp starts off;
  // lit, its bulb glows under the shade and warms the marble beneath it.
  const {lamp}=HOTEL;
  box(lamp.x-.13,1.3,lamp.z-.1,.26,.03,.2,look.metal);
  box(lamp.x-.03,1.33,lamp.z-.03,.06,.29,.06,look.metal);
  box(lamp.x-.27,1.6,lamp.z-.13,.55,.12,.26,'#2a5a40','#356b4e');
  box(lamp.x-.2,1.56,lamp.z-.08,.4,.04,.16,lampOn?'#ffe7a0':'#5a5040');
  if(lampOn){quad(lamp.x-.45,1.302,desk.z+.05,.9,.75,'#c4b494');quad(lamp.x-.25,1.303,desk.z+.2,.5,.42,'#dccb9f');}
  cylinder(2.6,1.3,12.5,.09,.3,'#7f95a0','#9fb3bd',.06);
  for(const [dx,dz,color] of [[0,0,'#9c2a3e'],[-.07,.04,'#ad3c52'],[.07,-.03,'#9c2a3e']])box(2.56+dx,1.62,12.46+dz,.09,.09,.09,color);
  drawStaff({face,box},at,receptionist,{x:at.x+.8,y:1.48,z:desk.z+.55});

  // A velvet sofa against the west wall, facing the hall.
  const sofa=HOTEL.sofa;
  box(sofa.x,.12,sofa.z,sofa.w,.33,sofa.d,look.velvet[0]);
  box(sofa.x,.12,sofa.z,.28,.95,sofa.d,look.velvet[0],look.velvet[1]);
  for(const z of [sofa.z-.01,sofa.z+sofa.d-.24])box(sofa.x,.12,z,sofa.w+.02,.6,.25,look.velvet[1]);
  for(let i=0;i<3;i++)box(sofa.x+.28,.45,sofa.z+.3+i*.95,.68,.12,.9,look.velvet[1]);
  for(const z of [sofa.z+.05,sofa.z+sofa.d-.15])for(const x of [sofa.x+.05,sofa.x+sofa.w-.15])box(x,0,z,.1,.12,.1,look.wood[1]);

  // Potted palms about 2.8 m tall either side of the sofa.
  for(const p of HOTEL.palms){
    cylinder(p.x,0,p.z,.32,.9,look.metal,'#2a1c16',.4);
    cylinder(p.x,.9,p.z,.06,1.65,'#5b4430');
    for(let i=0;i<7;i++){
      const angle=i*2*Math.PI/7,c=Math.cos(angle),s=Math.sin(angle);
      const tip={x:p.x+c*.95,y:1.875,z:p.z+s*.95},mid={x:p.x+c*.5,y:2.775,z:p.z+s*.5};
      const base={x:p.x,y:2.55,z:p.z},w={x:-s*.13,z:c*.13};
      const color=i%2?'#2a5a3c':'#356f4b';
      face([base,{x:mid.x+w.x,y:mid.y,z:mid.z+w.z},tip,{x:mid.x-w.x,y:mid.y,z:mid.z-w.z}],color);
    }
  }

  // The staircase: marble steps under a red carpet with brass stair rods,
  // and a banister along its open side, climbing to the landing.
  const {stairs:st,landing:ld}=HOTEL;
  for(let i=0;i<st.steps;i++){
    const z=st.z+i*st.run,h=(i+1)*st.rise;
    box(st.x,0,z,st.w,h,st.run,look.column[1],look.column[0]);
    box(st.x+.6,h-st.rise,z-.015,st.w-1.2,st.rise+.015,st.run+.015,...STAIR_CARPET);
    box(st.x+.55,h+.015,z+st.run-.04,st.w-1.1,.03,.03,look.metal);
  }
  box(ld.x,0,ld.z,ld.w,ld.y,ld.d,look.panel,STAIR_CARPET[1]);
  box(ld.x+.6,ld.y,ld.z,ld.w-1.2,.015,ld.d,...STAIR_CARPET);
  const railX=st.x+.04,railHeight=.95;
  box(st.x-.1,0,st.z-.3,.28,1.25,.28,look.wood[1]);
  cylinder(st.x+.04,1.25,st.z-.16,.1,.12,look.metal);
  for(let i=1;i<st.steps;i+=2)box(railX-.03,(i+1)*st.rise,st.z+i*st.run+.2,.06,railHeight,.06,look.metal);
  rod({x:railX,y:1.2,z:st.z-.16},{x:railX,y:ld.y+railHeight,z:ld.z},.04,look.wood[0]);
  for(let z=ld.z+.5;z<D;z+=.6)box(railX-.03,ld.y,z,.06,railHeight,.06,look.metal);
  rod({x:railX,y:ld.y+railHeight,z:ld.z},{x:railX,y:ld.y+railHeight,z:D},.04,look.wood[0]);
  // The way to the rooms is closed off by a black panel in a brass frame.
  box(ld.x+.4,ld.y,D-.06,ld.w-.8,2.5,.04,look.metal);
  box(ld.x+.55,ld.y,D-.08,ld.w-1.1,2.35,.03,'#050406');

  // The lift: brass doors under a floor dial, with a call button.
  const {lift}=HOTEL;
  box(lift.x-1.25,0,D-.08,2.5,3.35,.08,look.metal);
  for(const x of [lift.x-1.05,lift.x+.01])box(x,0,D-.12,1.04,3.1,.04,'#5f5a52');
  box(lift.x-.02,0,D-.13,.04,3.1,.02,'#3c3732');
  box(lift.x-.35,3.5,D-.08,.7,.3,.06,'#1a1210');
  box(lift.x-.05,3.6,D-.1,.1,.1,.02,'#d8c48c');
  const button=HOTEL.liftButton;
  box(button.x-button.halfWidth,1.05,D-.08,2*button.halfWidth,.32,.06,look.metal);
  box(button.x-.04,1.15,D-.1,.08,.08,.02,'#e8b04a');

  // A crystal chandelier hangs over the middle of the hall.
  const ch=HOTEL.chandelier,base=H-3;
  for(let y=base+.5;y<H-.05;y+=.15)rod({x:ch.x,y,z:ch.z},{x:ch.x,y:y+.1,z:ch.z},.02,look.metal);
  cylinder(ch.x,base-.25,ch.z,.12,.25,look.metal,look.metal,.25);
  cylinder(ch.x,base,ch.z,.25,.15,look.metal,look.metal,.1);
  cylinder(ch.x,base+.15,ch.z,.06,.4,look.metal);
  for(const [radius,y,count] of [[1,0,10],[.55,.45,6]])for(let i=0;i<count;i++){
    const angle=i*2*Math.PI/count,tip={x:ch.x+Math.cos(angle)*radius,y:base+y+.1,z:ch.z+Math.sin(angle)*radius};
    rod({x:ch.x,y:base+y,z:ch.z},tip,.025,look.metal);
    cylinder(tip.x,tip.y,tip.z,.05,.18,'#dfcda4','#f2e2bb');
    cylinder(tip.x,tip.y+.18,tip.z,.04,.09,'#f4bb64','#ffe5aa',0);
    box(tip.x-.02,tip.y-.3,tip.z-.02,.04,.22,.04,'#c9d4dc');
  }
}
