/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,car_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),256*24);
const templates=new Map();
const types={'hippie-van':1,mercedes:2,taxi:3};
// Zero is the caller's paint colour, shared by all ordinary cars.
const materials=[null,'#34445d','#657187','#10101b','#29a99c','#f3e5bc','#fff1cf','#deded1',
  '#e5e9ee','#ffffff','#354653','#e8edf3','#f1f3f6','#edf0f4','#bcc9d4','#d8e2e9',
  '#f4f5f7','#c63448','#aebbc7','#c9d0d6','#bdcad5','#e4edf5','#aebfcd','#14151c',
  '#242630','#455765','#171820','#30313a','#191a22','#252630','#b8bdc5','#a4aab3',
  '#34343d','#ffcb57','#ffe29a','#fff0b8'];
export function carGeometry(car){
  const type=Object.hasOwn(types,car.type)?types[car.type]:0;
  const axis=car.axis?1:0,key=type*4+axis*2+(car.dir>0?1:0);
  let geometry=templates.get(key);
  if(!geometry){
    const count=build(type,axis,car.dir);
    geometry=scratch.slice(0,count*24);
    templates.set(key,geometry);
  }
  return geometry;
}
// Visibility intentionally matches box(): test axis-aligned faces before the
// renderer applies the vehicle's bridge slope and turn to emitted vertices.
export function drawCarGeometry(car,{player,eye,base,slope,indoors,face,texture,complete=false}){
  const geometry=carGeometry(car);
  for(let k=0;k<geometry.length;k+=24){
    const rule=geometry[k],x=car.x+geometry[k+4],y=geometry[k+5],z=car.z+geometry[k+6];
    if(!complete&&(rule===1&&!(player.z<z)||rule===2&&!(player.z>z)||
       rule===3&&!(player.x<x)||rule===4&&!(player.x>x)||
       rule===5&&!(eye>y+base+(geometry[k+6]+geometry[k+16])/2*slope)||
       rule===6&&!(indoors&&eye<y)))continue;
    const tex=geometry[k+2],vertices=[];
    for(let i=0;i<4;i++){
      const v=k+4+i*5;
      const point={x:car.x+geometry[v],y:geometry[v+1],z:car.z+geometry[v+2]};
      if(tex){point.u=geometry[v+3];point.v=geometry[v+4];}
      vertices.push(point);
    }
    face(vertices,materials[geometry[k+1]]??car.color,tex?texture(tex):null);
  }
}
