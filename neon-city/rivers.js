import {BLOCK,WATER_LEVEL,bridgeHeight,mod} from './world.js?v=characters-2';

// Each chunk owns half of a river, including its share of each bridge.
export function drawRiverTerrain(chunk,{quad},time){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const first=chunk.z===chunk.riverStart;
  const bank=first?start+8:start+110;
  quad(x,.04,bank,64,10,'#345841');
  quad(x,.06,first?bank:bank+4,64,6,'#757380');
  // Low grass tufts make the green strip legible in the night palette.
  for(let t=16;t<50;t+=3){
    quad(x+t,.065,first?bank+7:bank+1,1.3,.3,'#547348');
    quad(x+t+1,.066,first?bank+8:bank+2,.4,.6,'#416548');
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
    quad(x+offset,.075,bank,width,10,color);
}

export function drawRiverStructures(chunk,{face,box},viewer){
  const x=chunk.x*BLOCK,z=chunk.z*BLOCK,start=chunk.riverStart*BLOCK;
  const bank=chunk.z===chunk.riverStart?start+18:start+110;
  // Stone retaining walls expose the full drop from the grass to the water.
  const waterSide=!viewer||(chunk.z===chunk.riverStart?viewer.z>bank:viewer.z<bank);
  for(let a=0;waterSide&&a<64;a+=8){
    for(let y=WATER_LEVEL;y<0;y+=1.4){
      face([{x:x+a,y,z:bank},{x:x+a+8,y,z:bank},{x:x+a+8,y:y+1.4,z:bank},{x:x+a,y:y+1.4,z:bank}],Math.round((y-WATER_LEVEL)/1.4)%2?'#52566a':'#454c60');
    }
  }
  for(let a=14;a<50;a+=6){
    box(x+a,.06,bank-.22,6,.2,.44,'#89929d');
    box(x+a,1.05,bank-.09,6,.12,.18,'#9ba6ab');
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
    for(const [left,right,color] of [[0,8,'#292b3b'],[8,14,'#757380'],[50,56,'#757380'],[56,64,'#292b3b']])strip(left,right,.075,.075,color);
    if(Math.floor((a-start)/4)%3===0)strip(0,.15,.085,.085,'#c4af8c');
    for(const edge of [14,50]){
      // The visible stone fascia and handrail rise together with the deck.
      face([{x:x+edge,y:h0-1.4,z:a},{x:x+edge,y:h1-1.4,z:b},{x:x+edge,y:h1+.25,z:b},{x:x+edge,y:h0+.25,z:a}],'#68758a');
      face([{x:x+edge,y:h0+1.05,z:a},{x:x+edge,y:h1+1.05,z:b},{x:x+edge,y:h1+1.19,z:b},{x:x+edge,y:h0+1.19,z:a}],'#b0bac0');
      strip(edge-.15,edge+.15,.25,.25,'#8f9eab');
      strip(edge-.1,edge+.1,1.19,1.19,'#b0bac0');
      if(Math.round(a-start)%4===2)box(x+edge-.1,h0+.2,a,.2,1,.2,'#8594a2');
    }
  }
}
