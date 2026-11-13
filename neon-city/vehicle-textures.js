// SPDX-License-Identifier: AGPL-3.0-only
// Shared Canvas artwork, reused as textures by either scene renderer.
let taxiSignTexture=null;
function taxiSign(){
  if(!taxiSignTexture){
    taxiSignTexture=document.createElement('canvas');
    taxiSignTexture.width=160;taxiSignTexture.height=56;
    const g=taxiSignTexture.getContext('2d');
    g.fillStyle='#ffcb57';g.fillRect(0,0,160,56);
    g.fillStyle='#171820';g.font='bold 44px sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillText('TAXI',80,30);
  }
  return taxiSignTexture;
}
const vanTextures={};
function vanTexture(side){
  if(vanTextures[side])return vanTextures[side];
  const canvas=document.createElement('canvas');canvas.width=side==='side'?384:192;canvas.height=192;
  const g=canvas.getContext('2d'),w=canvas.width;
  g.fillStyle='#29a99c';g.fillRect(0,0,w,192);
  g.fillStyle='#f3e5bc';g.fillRect(0,0,w,86);
  g.fillStyle='#344d65';
  if(side==='front'){
    // Classic split windshield and cream V-shaped nose.
    g.fillRect(12,12,78,60);g.fillRect(102,12,78,60);
    g.fillStyle='#f3e5bc';g.beginPath();g.moveTo(0,82);g.lineTo(96,142);g.lineTo(192,82);g.fill();
    g.strokeStyle='#f3e5bc';g.lineWidth=4;g.beginPath();g.arc(96,137,20,0,Math.PI*2);g.stroke();
    g.font='bold 23px sans-serif';g.textAlign='center';g.fillText('VW',96,145);
    for(const x of [28,164]){g.fillStyle='#d6d8cc';g.beginPath();g.arc(x,155,15,0,Math.PI*2);g.fill();g.fillStyle='#fff0b8';g.beginPath();g.arc(x,155,11,0,Math.PI*2);g.fill();}
  }else if(side==='side'){
    for(let i=0;i<4;i++)g.fillRect(12+i*94,12,78,60);
    // Painted rainbow, flowers, and a peace symbol.
    for(const [i,color] of ['#f56392','#ffab54','#ffe475'].entries()){
      g.strokeStyle=color;g.lineWidth=8;g.beginPath();g.arc(182,180,69-i*10,Math.PI,Math.PI*2);g.stroke();
    }
    for(const [x,y,color] of [[40,126,'#ff77be'],[329,131,'#ffce59'],[286,166,'#ed8bea']]){
      g.fillStyle=color;
      for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.arc(x+Math.cos(a)*13,y+Math.sin(a)*13,9,0,Math.PI*2);g.fill();}
      g.fillStyle='#fff0b8';g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='#fff0b8';g.lineWidth=4;g.beginPath();g.arc(94,132,23,0,Math.PI*2);g.moveTo(94,109);g.lineTo(94,155);g.moveTo(94,132);g.lineTo(78,148);g.moveTo(94,132);g.lineTo(110,148);g.stroke();
  }else{
    g.fillRect(28,12,136,60);
    g.fillStyle='#e65a57';g.fillRect(14,145,14,25);g.fillRect(164,145,14,25);
    g.fillStyle='#e9dbb8';g.fillRect(67,152,58,18);
  }
  return vanTextures[side]=canvas;
}
let mercedesGrilleTexture=null;
function mercedesGrille(){
  if(mercedesGrilleTexture)return mercedesGrilleTexture;
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=96;
  const g=canvas.getContext('2d');
  g.fillStyle='#c9d0d6';g.fillRect(0,0,192,96);
  g.fillStyle='#252c36';g.fillRect(6,6,180,84);
  g.strokeStyle='#aebbc7';g.lineWidth=4;
  for(const y of [22,39,56,73]){g.beginPath();g.moveTo(10,y);g.lineTo(182,y);g.stroke();}
  g.beginPath();g.moveTo(96,6);g.lineTo(96,90);g.stroke();
  return mercedesGrilleTexture=canvas;
}
export function vehicleTexture(id){
  if(id===1)return vanTexture('front');
  if(id===2)return vanTexture('rear');
  if(id===3)return vanTexture('side');
  if(id===4)return mercedesGrille();
  return taxiSign();
}
