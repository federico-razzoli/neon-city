import {BLOCK,WATER_LEVEL,bridgeHeight,hasBridge,mod} from './world.js?v=bridge-visibility-1';

// Each chunk owns half of a river, including its share of each bridge.
export function drawRiverTerrain(chunk,{quad},time){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const first=chunk.z===chunk.riverStart;
  const bank=first?start+8:start+110;
  quad(x,.04,bank,64,10,'#345841');
  quad(x,.06,first?bank:bank+4,64,6,'#757380');
  // Small flowers scatter across an otherwise uniform green lawn.
  // Address-based placement stays fixed as the camera moves and chunks reload.
  const scatter=n=>mod(Math.sin(chunk.x*127.1+chunk.z*311.7+n*74.7)*43758.5453,1);
  const petals=['#d38aa9','#d9c47b','#aaa0d1','#d9d3c5'];
  for(let i=0;i<12;i++){
    const fx=x+15.5+scatter(i*3)*32.5;
    const fz=bank+(first?6.5:.5)+scatter(i*3+1)*2.6;
    const size=.24+scatter(i*3+2)*.12,color=petals[i%petals.length];
    quad(fx-size/2,.065,fz-size/6,size,size/3,color);
    quad(fx-size/6,.065,fz-size/2,size/3,size,color);
    quad(fx-size/6,.066,fz-size/6,size/3,size/3,'#e5bb60');
  }
  const low=Math.max(z,start+18),high=Math.min(z+64,start+110);
  for(let a=0;a<64;a+=8)for(let b=low;b<high;b+=8){
    quad(x+a,WATER_LEVEL,b,8,Math.min(8,high-b),'#164957');
    const offset=mod(a*.7+b*.3+time*.8,5);
    quad(x+a+offset,WATER_LEVEL+.01,b+1,2,.13,'#377783');
    quad(x+a+1,WATER_LEVEL+.012,b+3,3,.08,'#225d70');
  }
  const road=first?start:start+120;
  quad(x,.015,road,64,8,'#252233');
  for(let t=16;t<52;t+=12)quad(x+t,.025,first?road+.1:road+7.8,4,.18,'#b09485');
  // Flat bridge approaches cut through the grass without a step.
  for(const [offset,width,color] of [[0,8,'#252233'],[8,6,'#757380'],[50,6,'#757380'],[56,8,'#252233']])
    if(hasBridge(chunk.x+(offset>=50?1:0)))quad(x+offset,.075,bank,width,10,color);
}

// Split the fascia at ground level so its buried ends draw before the banks.
// The lower wall faces the water; from the deck side it is hidden by the deck.
export function drawBridgeFascias(chunk,{face},viewer,belowGround=false){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const clip=vertices=>{
    const out=[],sign=belowGround?-1:1;
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length];
      const ai=sign*a.y>=0,bi=sign*b.y>=0;
      if(ai)out.push(a);
      if(ai!==bi){const t=-a.y/(b.y-a.y);out.push({x:a.x+(b.x-a.x)*t,y:0,z:a.z+(b.z-a.z)*t});}
    }
    if(out.length>=3)face(out,'#68758a');
  };
  for(let a=Math.max(z,start+18);a<Math.min(z+64,start+110);a+=2){
    const b=Math.min(a+2,z+64,start+110),h0=bridgeHeight(a),h1=bridgeHeight(b);
    for(const edge of [14,50]){
      if(!hasBridge(chunk.x+(edge===50?1:0)))continue;
      const wall=(bottom,top)=>clip([
        {x:x+edge,y:h0+bottom,z:a},{x:x+edge,y:h1+bottom,z:b},
        {x:x+edge,y:h1+top,z:b},{x:x+edge,y:h0+top,z:a}
      ]);
      if(!viewer||(edge===14?viewer.x>x+edge:viewer.x<x+edge))wall(-1.4,.075);
      if(!belowGround)wall(.075,.25);
    }
  }
}

// Below-ground faces must be painted before the grass, promenade, and roads.
export function drawRiverbankFaces(chunk,{face},viewer){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  // Stone retaining walls expose the full drop from the grass to the water.
  const waterSide=!viewer||(chunk.z===chunk.riverStart?viewer.z>bank:viewer.z<bank);
  for(let a=0;waterSide&&a<64;a+=8){
    for(let y=WATER_LEVEL;y<0;y+=1.4){
      face([{x:x+a,y,z:bank},{x:x+a+8,y,z:bank},{x:x+a+8,y:Math.min(0,y+1.4),z:bank},{x:x+a,y:Math.min(0,y+1.4),z:bank}],Math.round((y-WATER_LEVEL)/1.4)%2?'#52566a':'#454c60');
    }
  }
}

export function drawRiverStructures(chunk,{face,box},viewer){
  drawBridgeFascias(chunk,{face},viewer);
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  const left=hasBridge(chunk.x)?14:0,right=hasBridge(chunk.x+1)?50:64;
  for(let a=left;a<right;a+=6){
    box(x+a,.06,bank-.22,Math.min(6,right-a),.2,.44,'#89929d');
    box(x+a,1.05,bank-.09,Math.min(6,right-a),.12,.18,'#9ba6ab');
    box(x+a,.1,bank-.1,.18,1,.2,'#6e7d8a');
  }
  const low=Math.max(z,start+18),high=Math.min(z+64,start+110);
  // Short planar segments approximate a continuous arch; physics uses the same curve.
  for(let a=low;a<high;a+=2){
    const b=Math.min(a+2,high),h0=bridgeHeight(a),h1=bridgeHeight(b);
    const strip=(left,right,y0,y1,color)=>face([
      {x:x+left,y:h0+y0,z:a},{x:x+right,y:h0+y0,z:a},
      {x:x+right,y:h1+y1,z:b},{x:x+left,y:h1+y1,z:b}
    ],color);
    for(const [left,right,color] of [[0,8,'#292b3b'],[8,14,'#757380'],[50,56,'#757380'],[56,64,'#292b3b']])if(hasBridge(chunk.x+(left>=50?1:0)))strip(left,right,.075,.075,color);
    if(hasBridge(chunk.x)&&Math.floor((a-start)/4)%3===0)strip(0,.15,.085,.085,'#c4af8c');
    for(const edge of [14,50]){
      if(!hasBridge(chunk.x+(edge===50?1:0)))continue;
      // The visible stone fascia and handrail rise together with the deck.
      face([{x:x+edge,y:h0+1.05,z:a},{x:x+edge,y:h1+1.05,z:b},{x:x+edge,y:h1+1.19,z:b},{x:x+edge,y:h0+1.19,z:a}],'#b0bac0');
      strip(edge-.15,edge+.15,.25,.25,'#8f9eab');
      strip(edge-.1,edge+.1,1.19,1.19,'#b0bac0');
      if(Math.round(a-start)%4===2)box(x+edge-.1,h0+.2,a,.2,1,.2,'#8594a2');
    }
  }
}
