// Interior coordinates are local: the street entrance is centred on the south wall.
export const PUB={width:30,depth:18,height:5,door:{x:9,z:0},spawn:{x:9,z:1.8,angle:0},
  walls:[{x:17.8,z:0,w:.4,d:6},{x:17.8,z:10,w:.4,d:8}],
  bar:{x:0,z:13,w:15,d:1.7},
  shelves:{x:2,z:17.25,w:13,d:.65},
  chandeliers:[{x:9,z:6},{x:9,z:11},{x:24,z:5},{x:24,z:13}],
  bartender:{x:9,z:15.5,radius:.4},
  tables:[{x:4,z:4,radius:1.6},{x:14,z:4,radius:1.6},{x:4,z:9,radius:1.6},
    {x:22,z:3.5,radius:1.6},{x:27,z:3.5,radius:1.6},{x:24.5,z:9,radius:1.6},
    {x:22,z:14.5,radius:1.6},{x:27,z:14.5,radius:1.6}]};
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
export function moveInPub(player,dx,dz){
  const radius=.3,obstacles=[...PUB.walls,PUB.bar,PUB.shelves];
  const clear=(x,z)=>x>=radius&&x<=PUB.width-radius&&z>=radius&&z<=PUB.depth-radius&&!obstacles.some(b=>x>b.x-radius&&x<b.x+b.w+radius&&z>b.z-radius&&z<b.z+b.d+radius)&&![...PUB.tables,PUB.bartender].some(b=>Math.hypot(x-b.x,z-b.z)<b.radius+radius);
  // Substeps keep running and diagonal motion from crossing furniture or walls.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
  for(let i=0;i<count;i++){
    if(clear(player.x+dx/count,player.z))player.x+=dx/count;
    if(clear(player.x,player.z+dz/count))player.z+=dz/count;
  }
}
export function drawPubInterior({face,quad,box}){
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
  for(const b of PUB.tables){
    cylinder(b.x,0,b.z,.65,.12,'#3c2a21');
    cylinder(b.x,.12,b.z,.18,.8,'#674531','#876443');
    cylinder(b.x,.92,b.z,b.radius,.17,'#755133','#b78b5c');
    // Fine concentric edging and a pair of drinks on each polished tabletop.
    cylinder(b.x,1.09,b.z,b.radius-.08,.012,'#a7794e');
    pint(b.x-.55,1.102,b.z-.3);bottle(b.x+.5,1.102,b.z+.3,1);
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
  // Bartender in a cream shirt, waistcoat and apron, standing behind the counter.
  const {x,z}=PUB.bartender;
  for(const dx of [-.16,.08])box(x+dx,0,z-.1,.16,.82,.22,'#282731');
  box(x-.28,.8,z-.17,.56,.57,.34,'#ece0c2');
  box(x-.23,.83,z-.195,.46,.48,.04,'#43333a');
  box(x-.22,.55,z-.22,.44,.45,.035,'#c2b79c');
  cylinder(x,1.37,z,.09,.12,'#bd8864');
  cylinder(x,1.49,z,.19,.34,'#c08e6c','#d7a781');
  cylinder(x,1.79,z,.2,.1,'#43332c');
  for(const dx of [-.08,.07])box(x+dx,1.67,z-.185,.035,.025,.025,'#2a282a');
  box(x-.025,1.57,z-.22,.055,.09,.07,'#d7a781');
  for(const dx of [-.39,.26]){
    box(x+dx,.98,z-.14,.13,.36,.23,'#e4d9b7');
    box(x+dx,.98,z-.37,.13,.12,.27,'#c08e6c');
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
