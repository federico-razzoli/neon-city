import {SHOE_COLORS,TEEN_OUTFITS,outfit} from './sprites.js?v=characters-9';
import {PUB_TYPES} from './world.js?v=characters-9';

// Interior coordinates are local: the street entrance is centred on the south wall.
export const PUB={width:30,depth:18,height:5,door:{x:9,z:0},spawn:{x:9,z:1.8,angle:0},
  walls:[{x:17.8,z:0,w:.4,d:6},{x:17.8,z:10,w:.4,d:8}],
  bar:{x:0,z:13,w:15,d:1.7},
  staffDoor:{x:16.4,z:18},
  toiletDoor:{x:24.5,z:18},
  shelves:{x:2,z:17.25,w:13,d:.65},
  chandeliers:[{x:9,z:6},{x:9,z:11},{x:24,z:5},{x:24,z:13}],
  bartender:{x:9,z:15.5,radius:.53},
  tables:[{x:4,z:4,radius:1.6},{x:14,z:4,radius:1.6},{x:4,z:9,radius:1.6},
    {x:22,z:3.5,radius:1.6},{x:27,z:3.5,radius:1.6},{x:24.5,z:9,radius:1.6},
    {x:22,z:14.5,radius:1.6},{x:27,z:14.5,radius:1.6}]};
export const pubChairs=()=>PUB.tables.flatMap((table,tableIndex)=>[-1,1].map((side,seat)=>({
  x:table.x-.4,z:table.z+side*(table.radius+.45)-.4,w:.8,d:.8,side,tableIndex,seat
})));
export function facingPubChair(player,patrons=[],reserved){
  let nearest=null,distance=1.5;
  for(const chair of pubChairs()){
    if(patrons[chair.tableIndex]?.[chair.seat]!=null||(reserved?.tableIndex===chair.tableIndex&&reserved?.seat===chair.seat))continue;
    const dx=chair.x+chair.w/2-player.x,dz=chair.z+chair.d/2-player.z;
    const gap=Math.hypot(dx,dz);
    if(gap>distance)continue;
    // Include the chair's width in the viewing cone. Up close, its edges
    // remain usable even when its centre moves away from the crosshair.
    const radius=Math.hypot(chair.w,chair.d)/2;
    const halfAngle=.45+Math.asin(Math.min(1,radius/Math.max(gap,.001)));
    if(gap>radius&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/gap<Math.cos(halfAngle))continue;
    // Do not reach through a dividing wall or a table to sit down.
    let blocked=false;
    for(let t=.1;t<1;t+=.1){
      const x=player.x+dx*t,z=player.z+dz*t;
      if(PUB.walls.some(b=>x>b.x&&x<b.x+b.w&&z>b.z&&z<b.z+b.d)||PUB.tables.some(b=>Math.hypot(x-b.x,z-b.z)<b.radius)){blocked=true;break;}
    }
    if(!blocked){nearest=chair;distance=gap;}
  }
  return nearest;
}
export function createPubPatrons(random=Math.random){
  return PUB.tables.map(()=>{
    // 10% empty, 45% solo, 45% paired.
    const roll=random(),count=roll<.1?0:roll<.55?1:2,seats=[null,null];
    const first=random()<.5?0:1;
    for(let i=0;i<count;i++)seats[(first+i)%2]=PUB_TYPES[Math.floor(random()*PUB_TYPES.length)];
    seats.beerSides=[random()<.5?-1:1,random()<.5?-1:1];
    // Outfit variants follow patrons between the street sprite and their seat.
    seats.variants=[random(),random()];
    return seats;
  });
}
function facing(player,target,halfWidth){
  const dz=target.z-player.z,forwardZ=Math.cos(player.angle);
  // Aim at the whole doorway, rather than a shrinking cone around its centre.
  // The same facing direction stays valid as the player approaches the wall.
  if(dz*forwardZ<=0||Math.abs(forwardZ)<1e-6)return false;
  const distance=Math.hypot(Math.max(0,Math.abs(player.x-target.x)-halfWidth),dz);
  if(distance>3)return false;
  const hitX=player.x+Math.sin(player.angle)*dz/forwardZ;
  return Math.abs(hitX-target.x)<=halfWidth+.15;
}
export function facingPubDoor(player,buildings){
  return buildings.find(b=>{
    if(b.sign!=='NEON PUB')return false;
    const south=b.j===1,z=south?b.z+b.d:b.z;
    return (south?player.z>z:player.z<z)&&facing(player,{x:b.x+b.w/2,z},b.w*10/160);
  });
}
export const facingPubExit=player=>player.z>PUB.door.z&&facing(player,PUB.door,.7);
export const facingStaffDoor=player=>player.z<PUB.staffDoor.z&&facing(player,PUB.staffDoor,.7);
export const facingToiletDoor=player=>player.z<PUB.toiletDoor.z&&facing(player,PUB.toiletDoor,.7);
export function pubPersonBlocks(start,end,person){
  if(!person)return false;
  const clearance=.85,dx=end.x-start.x,dz=end.z-start.z;
  const distance=Math.hypot(start.x-person.x,start.z-person.z);
  // Allow someone already touching to move away rather than become trapped.
  if(distance<clearance&&(start.x-person.x)*dx+(start.z-person.z)*dz>=0&&Math.hypot(end.x-person.x,end.z-person.z)>distance)return false;
  const length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((person.x-start.x)*dx+(person.z-start.z)*dz)/length)):0;
  return Math.hypot(start.x+dx*t-person.x,start.z+dz*t-person.z)<clearance;
}
export function moveInPub(player,dx,dz,patrons=[],walker){
  const radius=.3,obstacles=[...PUB.walls,PUB.bar,PUB.shelves],chairs=pubChairs();
  let bumpedPerson=false;
  const overlaps=(x,z,b)=>x>b.x-radius&&x<b.x+b.w+radius&&z>b.z-radius&&z<b.z+b.d+radius;
  const clear=(x,z)=>{
    if(pubPersonBlocks(player,{x,z},walker)){bumpedPerson=true;return false;}
    if(x<radius||x>PUB.width-radius||z<radius||z>PUB.depth-radius)return false;
    if(obstacles.some(b=>overlaps(x,z,b))||PUB.tables.some(b=>Math.hypot(x-b.x,z-b.z)<b.radius+radius))return false;
    const hitChairs=chairs.filter(b=>overlaps(x,z,b));
    const hitBartender=Math.hypot(x-PUB.bartender.x,z-PUB.bartender.z)<PUB.bartender.radius+radius;
    if(hitBartender||hitChairs.some(b=>patrons[b.tableIndex]?.[b.seat]!=null))bumpedPerson=true;
    return !hitBartender&&!hitChairs.length;
  };
  // Substeps keep running and diagonal motion from crossing furniture or walls.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(dx&&clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(dz&&clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
  return bumpedPerson;
}
export function drawPubInterior({face,quad,box,patrons=[],seatedPatron=()=>{},bartenderType=1}){
  for(let x=0;x<PUB.width;x+=2)for(let z=0;z<PUB.depth;z+=2){
    quad(x,0,z,2,2,'#70513c');
    quad(x,PUB.height,z,2,2,'#31262a');
  }
  // Small wall panels preserve depth ordering around the open connecting arch.
  const wall=(x,z,dx,dz)=>{
    for(let t=0;t<1;t+=.125){
      const points=(low,high)=>[{x:x+dx*t,y:low,z:z+dz*t},{x:x+dx*(t+.125),y:low,z:z+dz*(t+.125)},{x:x+dx*(t+.125),y:high,z:z+dz*(t+.125)},{x:x+dx*t,y:high,z:z+dz*t}];
      face(points(0,1),'#51362e');face(points(1,PUB.height),'#876b53');
    }
  };
  wall(0,0,8.3,0);wall(9.7,0,PUB.width-9.7,0);wall(0,PUB.depth,PUB.width,0);wall(0,0,0,PUB.depth);wall(PUB.width,0,0,PUB.depth);
  for(const b of PUB.walls){wall(b.x,b.z,b.w,0);wall(b.x,b.z+b.d,b.w,0);wall(b.x,b.z,0,b.d);wall(b.x+b.w,b.z,0,b.d);}
  box(17.8,3.2,6,.4,PUB.height-3.2,4,'#51362e');
  // The entrance replaces its wall section. Non-overlapping coplanar panels
  // cannot swap depth order with a wall behind them when the camera turns.
  const xs=[8.3,9.45,9.57,9.7],ys=[0,1,1.18,2.9,PUB.height];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const x=xs[i],right=xs[i+1],y=ys[j],top=ys[j+1];
    let color=y<2.9?'#38262a':'#876b53';
    if(x===9.45&&y===1)color='#e9c47e';
    face([{x,y,z:0},{x:right,y,z:0},{x:right,y:top,z:0},{x,y:top,z:0}],color);
  }
  // Matching closed doors share the rear wall and compact, smoothed signs.
  for(const [staff,words] of [[PUB.staffDoor,['STAFF','ONLY']],[PUB.toiletDoor,['TOILET']]]){
  box(staff.x-.78,0,staff.z-.035,1.56,3,.035,'#a08057');
  box(staff.x-.7,0,staff.z-.06,1.4,2.9,.025,'#49332d');
  box(staff.x+.48,1.05,staff.z-.12,.12,.18,.06,'#d9b671');
  box(staff.x-.25,2.065,staff.z-.08,.5,.32,.02,'#24232b');
  const lettering={
    S:['01111','10000','10000','01110','00001','00001','11110'],
    T:['11111','00100','00100','00100','00100','00100','00100'],
    A:['01110','10001','10001','11111','10001','10001','10001'],
    F:['11111','10000','10000','11110','10000','10000','10000'],
    O:['01110','10001','10001','10001','10001','10001','01110'],
    N:['10001','11001','11001','10101','10011','10011','10001'],
    L:['10000','10000','10000','10000','10000','10000','11111'],
    Y:['10001','10001','01010','00100','00100','00100','00100'],
    I:['11111','00100','00100','00100','00100','00100','11111'],
    E:['11111','10000','10000','11110','10000','10000','11111']
  };
  for(const [line,word] of words.entries()){
    const size=word.length>5?.0125:.0145,left=staff.x-(word.length*6-1)*size/2;
    for(const [letter,char] of [...word].entries())for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(lettering[char][row][col]==='1'){
      const x=left+(letter*6+col)*size,y=(words.length===1?2.27:2.336)-line*.133-row*size,z=staff.z-.085;
      face([{x,y,z},{x:x+size,y,z},{x:x+size,y:y-size,z},{x,y:y-size,z}],'#eee0bb',null,true);
    }
  }
  }
  // Faceted cylinders give glasses, bottles and tables actual round silhouettes.
  const cylinder=(x,y,z,r,h,color,top=color,rTop=r)=>{
    const n=16,ring=(i,yy,rr)=>({x:x+Math.cos(i*2*Math.PI/n)*rr,y:yy,z:z+Math.sin(i*2*Math.PI/n)*rr});
    for(let i=0;i<n;i++)face([ring(i,y,r),ring(i+1,y,r),ring(i+1,y+h,rTop),ring(i,y+h,rTop)],color);
    face(Array.from({length:n},(_,i)=>ring(i,y+h,rTop)),top);
    face(Array.from({length:n},(_,i)=>ring(i,y,r)),color);
  };
  const bottle=(x,y,z,i)=>{
    const glass=['#395640','#6b442a','#3a554f'][i%3],r=.095+(i%2)*.015,h=.27+(i%3)*.025;
    cylinder(x,y,z,r,h,glass,glass);
    cylinder(x,y+h,z,r,.075,glass,glass,.04);
    cylinder(x,y+h+.075,z,.04,.13,glass,'#bda477');
    cylinder(x,y+h+.2,z,.045,.035,'#bda477');
    cylinder(x,y+.09,z,r+.003,.11,'#d6c7a0','#bcab83');
    box(x-.015,y+.1,z-r-.008,.03,.07,.009,'#8a4b38');
    box(x-r*.55,y+.025,z-r*.83,.018,.2,.008,'#80907c');
  };
  const pint=(x,y,z)=>{
    cylinder(x,y,z,.1,.27,'#bd873d','#f2e0ae',.13);
    cylinder(x,y+.27,z,.13,.045,'#eee0b0');
    box(x-.08,y+.03,z-.1,.025,.19,.02,'#e7cca0');
  };
  for(const [tableIndex,b] of PUB.tables.entries()){
    cylinder(b.x,0,b.z,.65,.12,'#3c2a21');
    cylinder(b.x,.12,b.z,.18,.8,'#674531','#876443');
    cylinder(b.x,.92,b.z,b.radius,.17,'#755133','#b78b5c');
    // Drinks belong to occupied seats; an empty table stays clear.
    cylinder(b.x,1.09,b.z,b.radius-.08,.012,'#a7794e');
    for(let seat=0;seat<2;seat++)if(patrons[tableIndex]?.[seat]!=null){
      // Pick once per seat so glasses never jump sides while looking around.
      const seats=patrons[tableIndex];
      seats.beerSides??=[Math.random()<.5?-1:1,Math.random()<.5?-1:1];
      pint(b.x+seats.beerSides[seat]*.65,1.102,b.z+(seat===0?-1:1)*(b.radius-.45));
    }
  }
  for(const chair of pubChairs()){
    const {x,z,w,d,side,tableIndex,seat}=chair;
    for(const dx of [.06,w-.14])for(const dz of [.06,d-.14])box(x+dx,0,z+dz,.08,.6,.08,'#51382b');
    box(x,.55,z,w,.12,d,'#805b3b','#a47a4e');
    const backZ=z+(side<0?0:d-.08);
    for(const dx of [.04,w-.12])box(x+dx,.6,backZ,.08,.75,.08,'#67472e');
    box(x+.04,1.05,backZ,w-.08,.22,.08,'#805b3b');
    const type=patrons[tableIndex]?.[seat],variant=patrons[tableIndex]?.variants?.[seat]??0;
    if(type!=null){
      const shoes=type===4?TEEN_OUTFITS[outfit(type,variant)].shoes:SHOE_COLORS[type];
      const trousers=['#21283f','#ec849a','#21283f','#e2a282','#394866','#303344','#f4eff2','#3a3d4c','#d39c80','#5a3d5c','#2f3e5e','#9aa0a8'][type];
      // Her pencil skirt wraps both thighs and stops just short of the knees.
      if(type===8)box(x+.13,.51,z+(side<0?.2:.33),.54,.2,.42,'#2a2638');
      for(const dx of [.15,.48]){
        if(type===8)box(x+dx,.52,z+(side<0?.62:.2),.17,.17,.13,trousers);
        else box(x+dx,.52,z+.2,.17,.17,.55,trousers);
        box(x+dx,.12,z+(side<0?.57:.06),.17,.46,.17,trousers);
        if(type===3){
          // The punk's street outfit has tall black shafts and chunky soles.
          const bootZ=z+(side<0?.57:.06);
          box(x+dx-.01,.12,bootZ-.01,.19,.27,.19,SHOE_COLORS[type]);
          box(x+dx-.025,.04,z+(side<0?.55:-.06),.22,.12,.3,SHOE_COLORS[type]);
          box(x+dx+.035,.17,bootZ-.016,.035,.16,.012,'#363340');
        }else if(type===1||type===8){
          // Match the street outfit's raised sole and narrow heel at the rear.
          const shoeZ=z+(side<0?.55:-.06);
          box(x+dx-.025,.10,shoeZ,.22,.06,.3,shoes);
          box(x+dx+.015,.04,shoeZ+(side<0?0:.25),.04,.06,.05,shoes);
        }else box(x+dx-.025,.04,z+(side<0?.55:-.06),.22,.12,.3,shoes);
      }
      seatedPatron({x:x+w/2,z:z+d/2,type,variant,side});
    }
  }
  const b=PUB.bar;
  box(b.x,0,b.z,b.w,1.15,b.d,'#61412e');
  // Equal panels fill the frontage with matching end margins and no overshoot.
  const margin=.15,gap=.15,count=Math.round(b.w/1.1);
  const panelWidth=(b.w-2*margin-(count-1)*gap)/count;
  for(let i=0;i<count;i++){
    const x=b.x+margin+i*(panelWidth+gap);
    box(x,.15,b.z-.015,panelWidth,.78,.035,'#95653e');
    box(x+.08,.23,b.z-.04,panelWidth-.16,.62,.04,'#6a4531');
  }
  box(b.x,1.15,b.z-.1,b.w+.1,.15,b.d+.2,'#9e7047','#cea16c');
  box(b.x,.2,b.z-.3,b.w,.07,.07,'#bca26b');
  // Wooden backbar uprights and shelves, stocked with necks, shoulders, labels and caps.
  for(const x of [2,6.3,10.6,14.8])box(x,.5,17.35,.15,2.8,.55,'#65452f');
  for(const y of [.8,1.65,2.5]){
    box(PUB.shelves.x,y,PUB.shelves.z,PUB.shelves.w,.12,PUB.shelves.d,'#9c704b','#c09564');
    for(let i=0;i<28;i++)bottle(2.35+i*.44,y+.12,17.55,i);
  }
  // Brass beer towers, forward-facing spouts, dark handles and drip trays.
  for(const x of [5,6.1,11.6]){
    box(x-.24,1.3,13.05,.48,.025,.55,'#44484a','#a7a9a7');
    for(let i=0;i<5;i++)box(x-.2+i*.09,1.325,13.08,.025,.01,.48,'#363a3a');
    cylinder(x,1.3,13.65,.14,.07,'#c4a76b');
    cylinder(x,1.37,13.65,.065,.48,'#ba995d','#e0cb95');
    box(x-.06,1.76,13.32,.12,.12,.35,'#d4bd83');
    cylinder(x,1.67,13.32,.045,.12,'#d4bd83');
    cylinder(x,1.88,13.4,.035,.14,'#c7a973');
    cylinder(x,2.02,13.4,.065,.2,'#312a2a','#6a513a');
  }
  pint(7.1,1.3,13.35);
  // Four regulars behind the bar: chosen once when this pub is first entered.
  const {x,z}=PUB.bartender;
  const staffScale=4/3;
  const staffBox=(px,py,pz,w,h,d,...colors)=>box(x+(px-x)*staffScale,py*staffScale,z+(pz-z)*staffScale,w*staffScale,h*staffScale,d*staffScale,...colors);
  const staffCylinder=(px,py,pz,r,h,color,top=color,rTop=r)=>cylinder(x+(px-x)*staffScale,py*staffScale,z+(pz-z)*staffScale,r*staffScale,h*staffScale,color,top,rTop*staffScale);
  const staffFace=(points,...args)=>face(points.map(p=>({x:x+(p.x-x)*staffScale,y:p.y*staffScale,z:z+(p.z-z)*staffScale})),...args);
  const nurse=bartenderType===3,large=bartenderType===2;
  const skin=bartenderType===0?'#94624e':nurse?'#f4bdab':'#e2aa8c';
  const hair=bartenderType===0?'#201e26':nurse?'#ee7c9e':large?'#88553d':'#49352c';
  const width=large?.86:.56,depth=large?.5:.34,head=large?.23:.19;
  const shirt=nurse?'#f29bb7':large?'#729083':'#eee5cf';
  for(const dx of [-.16,.08])staffBox(x+dx,0,z-.1,.16,.82,.22,nurse?'#f5eee5':'#282731');
  staffBox(x-width/2,.8,z-depth/2,width,.57,depth,shirt);
  if(nurse||large){
    staffBox(x-width/2,.48,z-depth/2,width,.38,depth,shirt);
    staffBox(x-width*.34,.52,z-depth/2-.025,width*.68,.73,.03,'#f5eee5');
    staffBox(x-width/2,1.05,z-depth/2-.04,width,.07,.04,'#fff4df');
  }else{
    staffBox(x-.23,.83,z-.195,.46,.48,.04,'#25232b');
    // White shirt front, pointed collar, black bow tie and brass vest buttons.
    staffBox(x-.085,1.02,z-.24,.17,.33,.04,'#fff4df');
    for(const side of [-1,1])staffBox(x+side*.08-.045,1.27,z-.29,.09,.07,.04,'#24232b');
    for(const y of [.92,1.04,1.16])staffBox(x+.11,y,z-.24,.025,.025,.03,'#cfad6b');
  }
  staffCylinder(x,1.37,z,.09,.12,skin);
  staffCylinder(x,1.49,z,head,.34,skin,skin);
  staffCylinder(x,1.79,z,head+.01,.1,hair);
  for(const dx of [-.08,.07]){
    staffBox(x+dx,1.67,z-head-.01,.035,.04,.025,nurse?'#467b98':'#2a282a');
    if(nurse)staffBox(x+dx-.008,1.705,z-head-.015,.05,.012,.025,'#663e50');
  }
  staffBox(x-.025,1.57,z-head-.04,.055,.09,.07,skin);
  staffBox(x-.045,1.535,z-head-.015,.09,.018,.025,nurse?'#bf627d':'#9f6658');
  for(const side of [-1,1]){
    const armX=x+side*(width/2+.065)-.065;
    staffBox(armX,.98,z-.14,.13,.36,.23,shirt);
    staffBox(armX,.98,z-.37,.13,.12,.27,skin);
  }
  if(large){
    staffCylinder(x,1.76,z+.15,.22,.22,hair);
    for(const side of [-1,1])staffCylinder(x+side*.22,1.49,z,.055,.07,'#d8ba6e');
  }
  if(nurse){
    // Pink hair wraps the rear half of the head down to the nape.
    for(let i=0;i<12;i++){
      const point=(angle,y)=>({x:x+Math.cos(angle)*(head+.025),y,z:z+Math.sin(angle)*(head+.025)});
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      staffFace([point(a,1.48),point(b,1.48),point(b,1.84),point(a,1.84)],hair);
    }
    // A red-and-white Poké Ball rests on the countertop only for Nurse Joy.
    const ball={x:x+.8,y:1.48,z:13.55,r:.18};
    const latitudes=[-Math.PI/2,-1.2,-.9,-.6,-.3,-.09,.09,.3,.6,.9,1.2,Math.PI/2];
    const spherePoint=(latitude,angle)=>({x:ball.x+ball.r*Math.cos(latitude)*Math.cos(angle),y:ball.y+ball.r*Math.sin(latitude),z:ball.z+ball.r*Math.cos(latitude)*Math.sin(angle)});
    for(let j=0;j<latitudes.length-1;j++)for(let i=0;i<24;i++){
      const low=latitudes[j],high=latitudes[j+1],a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      const color=low===-.09?'#25232b':low>=.09?'#d94650':'#eee9df';
      face([spherePoint(low,a),spherePoint(low,b),spherePoint(high,b),spherePoint(high,a)],color);
    }
    const button=(r,offset,color)=>face(Array.from({length:20},(_,i)=>({x:ball.x+Math.cos(i*Math.PI/10)*r,y:ball.y+Math.sin(i*Math.PI/10)*r,z:ball.z-ball.r-offset})),color);
    button(.06,.004,'#25232b');button(.04,.008,'#f8f2df');button(.023,.012,'#d3d4ce');
    // Nurse Joy's pink side loops, swept fringe, white cap and pink uniform.
    for(const side of [-1,1]){
      staffCylinder(x+side*.27,1.55,z+.04,.13,.28,hair,'#ffa1bc');
      staffCylinder(x+side*.3,1.5,z+.06,.09,.09,hair);
    }
    staffBox(x-.19,1.76,z-.2,.15,.1,.08,hair);
    staffBox(x+.02,1.8,z-.19,.17,.06,.06,hair);
    staffBox(x-.22,1.88,z-.12,.44,.2,.19,'#fff3e4');
    staffBox(x-.025,1.92,z-.132,.05,.12,.02,'#e16b88');
    staffBox(x-.06,1.955,z-.135,.12,.045,.02,'#e16b88');
    staffBox(x-.08,1.28,z-depth/2-.03,.16,.08,.04,'#fff3e4');
  }
  // Suspended antique brass chandeliers, each with six curved candle arms.
  const rod=(a,b,r,color)=>{
    const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);
    const axis={x:dx/len,y:dy/len,z:dz/len};
    const horizontal=Math.hypot(dx,dz);
    const u=horizontal>.001?{x:-dz/horizontal,y:0,z:dx/horizontal}:{x:1,y:0,z:0};
    const v={x:axis.y*u.z-axis.z*u.y,y:axis.z*u.x-axis.x*u.z,z:axis.x*u.y-axis.y*u.x};
    const point=(p,i)=>{const c=Math.cos(i*Math.PI/4)*r,t=Math.sin(i*Math.PI/4)*r;return {x:p.x+u.x*c+v.x*t,y:p.y+u.y*c+v.y*t,z:p.z+u.z*c+v.z*t};};
    for(let i=0;i<8;i++)face([point(a,i),point(a,i+1),point(b,i+1),point(b,i)],color);
  };
  for(const {x,z} of PUB.chandeliers){
    const base=PUB.height-1.35,brass='#96713d',highlight='#c09a59';
    cylinder(x,PUB.height-.09,z,.22,.09,brass);
    // Alternating oval links make the suspension read as a chain.
    for(let y=base+.45;y<PUB.height-.12;y+=.13){
      const alongX=Math.round(y*100)%2===0;
      const points=Array.from({length:8},(_,i)=>({x:x+(alongX?Math.cos(i*Math.PI/4)*.055:0),y:y+Math.sin(i*Math.PI/4)*.085,z:z+(alongX?0:Math.cos(i*Math.PI/4)*.055)}));
      for(let i=0;i<8;i++)rod(points[i],points[(i+1)%8],.014,highlight);
    }
    cylinder(x,base-.18,z,.1,.18,brass,highlight,.2);
    cylinder(x,base,z,.23,.2,brass,highlight,.12);
    cylinder(x,base+.2,z,.07,.3,brass);
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;
      const armPoint=(r,y)=>({x:x+Math.cos(angle)*r,y:base+y,z:z+Math.sin(angle)*r});
      const curve=[[.1,.08],[.35,-.06],[.65,-.1],[.85,-.03],[1,.15],[1,.3]];
      for(let j=1;j<curve.length;j++)rod(armPoint(...curve[j-1]),armPoint(...curve[j]),.035,brass);
      const tip=armPoint(1,.3);
      cylinder(tip.x,tip.y,tip.z,.16,.05,brass,highlight);
      cylinder(tip.x,tip.y+.05,tip.z,.065,.26,'#dfcda4','#f2e2bb');
      cylinder(tip.x,tip.y+.31,tip.z,.055,.13,'#f4bb64','#ffe5aa',0);
    }
  }
}
