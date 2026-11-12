/* SPDX-License-Identifier: AGPL-3.0-only */
// Original car renderer retained as an independent parity reference.
export function originalCar(c,{player,eye,groundHeight,indoors,face:emit,vanTexture,mercedesGrille,taxiSign},groundOverride){
let vehicleSurface=null,vehicleTurn=null;
function face(vertices,color,texture=null){
 if(vehicleSurface)vertices=vertices.map(v=>({...v,y:v.y+vehicleSurface(v.z)}));
 if(vehicleTurn){const {x,z,angle}=vehicleTurn,co=Math.cos(angle),si=Math.sin(angle);vertices=vertices.map(v=>({...v,x:x+(v.x-x)*co+(v.z-z)*si,z:z-(v.x-x)*si+(v.z-z)*co}));}
 emit(vertices,color,texture);
}
function box(x,y,z,w,h,d,color,roof=color){
  const a={x,y,z},b={x:x+w,y,z},c={x:x+w,y,z:z+d},e={x,y,z:z+d};
  const up=p=>({...p,y:y+h});
  if(player.z<z)face([a,b,up(b),up(a)],color);
  if(player.z>z+d)face([c,e,up(e),up(c)],color);
  if(player.x<x)face([e,a,up(a),up(e)],color);
  if(player.x>x+w)face([b,c,up(c),up(b)],color);
  if(eye>y+h+(vehicleSurface?vehicleSurface(z+d/2):0))face([up(a),up(b),up(c),up(e)],roof);
  if(indoors()&&eye<y)face([e,c,b,a],color);
}
function car(c,groundOverride){
  vehicleTurn=c.turn?{x:c.x,z:c.z,angle:c.turn.angle}:null;
  const base=groundOverride??groundHeight(c.x,c.z),slope=groundOverride!=null||c.axis?0:(groundHeight(c.x,c.z+.1)-groundHeight(c.x,c.z-.1))/.2;
  vehicleSurface=z=>base+(z-c.z)*slope;
  const w=c.axis?4.7:2.1,d=c.axis?2.1:4.7,x=c.x-w/2,z=c.z-d/2;
  // Local coordinates shared by the special vehicle bodies.
  const part=(across,along,y,width,length,height,color,roof=color)=>{
      const px=c.x+(c.axis?along*c.dir:across),pz=c.z+(c.axis?across:along*c.dir);
      box(px-(c.axis?length:width)/2,y,pz-(c.axis?width:length)/2,c.axis?length:width,height,c.axis?width:length,color,roof);
    };
  if(c.type==='hippie-van'){
    part(0,0,.25,2.1,4.7,1.85,'#29a99c','#f3e5bc');
    part(0,0,2.1,2.02,4.58,.18,'#f3e5bc','#fff1cf');
    const point=(across,along,y,u,v)=>({x:c.x+(c.axis?along*c.dir:across),z:c.z+(c.axis?across:along*c.dir),y,u,v});
    for(const side of [-1,1]){
      const left=side*c.dir*(c.axis?-1:1)*1.05,along=side*2.351;
      face([point(left,along,.25,0,192),point(-left,along,.25,192,192),point(-left,along,2.1,192,0),point(left,along,2.1,0,0)],'#29a99c',vanTexture(side===1?'front':'rear'));
      const a=side*1.051,start=side*(c.axis?-1:1)*2.35;
      face([point(a,start,.25,0,192),point(a,-start,.25,384,192),point(a,-start,2.1,384,0),point(a,start,2.1,0,0)],'#29a99c',vanTexture('side'));
      part(0,side*2.38,.29,2.1,.12,.14,'#deded1');
    }
  }else if(c.type==='mercedes'){
    // Low white saloon with a long bonnet, dark glass, and chrome trim.
    part(0,0,.25,2.1,4.7,.65,'#e5e9ee','#ffffff');
    part(0,-.3,.9,1.82,2.55,.56,'#354653','#e8edf3');
    part(0,-.3,1.46,1.86,2.58,.09,'#f1f3f6','#ffffff');
    for(const side of [-1,1]){
      for(const along of [-1.54,-.35,.94])part(side*.92,along,.9,.07,.09,.57,'#edf0f4');
      part(side*1.055,0,.73,.04,4.25,.055,'#bcc9d4');
      for(const along of [-.85,.45])part(side*.94,along,.85,.055,.23,.045,'#d8e2e9');
      part(side*.98,.85,1.01,.22,.26,.13,'#f4f5f7');
      part(side*.73,-2.37,.53,.46,.06,.22,'#c63448');
    }
    for(const along of [-2.38,2.38])part(0,along,.3,2.02,.1,.12,'#aebbc7');
    const left=c.dir*(c.axis?-1:1)*.5;
    const point=(across,y,u,v)=>({x:c.x+(c.axis?2.401*c.dir:across),z:c.z+(c.axis?across:2.401*c.dir),y,u,v});
    face([point(left,.43,0,96),point(-left,.43,192,96),point(-left,.86,192,0),point(left,.86,0,0)],'#c9d0d6',mercedesGrille());
    // Freestanding chrome ring and star mounted above the front of the bonnet.
    part(0,2.16,.9,.14,.14,.035,'#bdcad5');
    part(0,2.16,.935,.035,.035,.1,'#e4edf5');
    const ornamentPoint=(across,y,along)=>({
      x:c.x+(c.axis?along*c.dir:across),
      z:c.z+(c.axis?across:along*c.dir),y
    });
    const radius=.15,inner=.127,centre=1.18;
    for(const along of [2.14,2.18]){
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
        face([[radius,a],[radius,b],[inner,b],[inner,a]].map(([r,t])=>
          ornamentPoint(Math.cos(t)*r,centre+Math.sin(t)*r,along)),'#e4edf5');
      }
      for(let i=0;i<3;i++){
        const a=Math.PI/2+i*Math.PI*2/3,dx=Math.cos(a),dy=Math.sin(a),half=.012;
        face([[0,-half],[inner,-half],[inner,half],[0,half]].map(([length,offset])=>
          ornamentPoint(dx*length-dy*offset,centre+dy*length+dx*offset,along)),'#e4edf5');
      }
    }
    // Give the ring depth so the upright ornament also reads from the side.
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      face([[a,2.14],[b,2.14],[b,2.18],[a,2.18]].map(([t,along])=>
        ornamentPoint(Math.cos(t)*radius,centre+Math.sin(t)*radius,along)),'#aebfcd');
    }
  }else if(c.type==='taxi'){
    part(0,0,.25,2.1,4.7,.78,'#14151c','#242630');
    part(0,-.3,1.03,1.85,2.9,.8,'#455765','#171820');
    part(0,-.3,1.83,1.98,3.05,.16,'#171820','#30313a');
    // Window pillars, raised wheel arches, and chrome door handles.
    for(const side of [-1,1]){
      for(const along of [-1.7,-.3,1.1])part(side*.94,along,1.02,.1,.13,.82,'#191a22');
      for(const along of [-1.55,1.5])part(side*1.03,along,.55,.16,1.05,.28,'#252630');
      for(const along of [-.8,.5])part(side*.96,along,.91,.08,.28,.06,'#b8bdc5');
    }
    part(0,2.36,.42,1.02,.08,.48,'#a4aab3');
    for(const across of [-.36,-.18,0,.18,.36])part(across,2.41,.47,.055,.03,.37,'#34343d');
    for(const along of [-2.38,2.38])part(0,along,.29,1.95,.12,.12,'#a4aab3');
    part(0,.5,1.99,.82,.36,.28,'#ffcb57','#ffe29a');
    // Letter both faces; face() applies the same bridge slope and turn as the cab.
    for(const side of [-1,1]){
      const along=.5+side*.181,left=side*c.dir*(c.axis?-1:1)*.41;
      const point=(across,y,u,v)=>({
        x:c.x+(c.axis?along*c.dir:across),
        z:c.z+(c.axis?across:along*c.dir),y,u,v
      });
      face([point(left,1.99,0,56),point(-left,1.99,160,56),
        point(-left,2.27,160,0),point(left,2.27,0,0)],'#ffcb57',taxiSign());
    }
  }else{
    box(x,.25,z,w,.65,d,c.color);box(x+(c.axis?1:.15),.9,z+(c.axis?.15:1),c.axis?2.5:1.8,.6,c.axis?1.8:2.5,'#34445d','#657187');
  }
  if(c.axis){for(const side of [-1,1])for(const offset of [.8,3.5])box(x+offset,.12,c.z+side*1.05-.1,.7,.55,.2,'#10101b');}
  else{for(const side of [-1,1])for(const offset of [.8,3.5])box(c.x+side*1.05-.1,.12,z+offset,.2,.55,.7,'#10101b');}
  const frontX=c.x+(c.axis?c.dir*2.36:0),frontZ=c.z+(c.axis?0:c.dir*2.36);
  if(c.type!=='hippie-van')for(const side of [-1,1])box(frontX+(c.axis?-.04:side*.7-.2),.52,frontZ+(c.axis?side*.7-.2:-.04),c.axis?.08:.4,.2,c.axis?.4:.08,'#fff0b8');
  vehicleSurface=null;vehicleTurn=null;
}

car(c,groundOverride);
}
