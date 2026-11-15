// SPDX-License-Identifier: AGPL-3.0-only
export const NEWSPAPER_LOOKS={
  'DAILY BUGLE':{paint:'#a93242',masthead:'#311d29',frame:'#501e30',price:'#f1d6b5',body:['#862c3d','#c44c55'],cap:['#ba4351','#d25b60']},
  'NEON NEWS':{subtitle:'NIGHT EDITION',paint:'#2f8a4a',masthead:'#14301d',frame:'#1b4a2b',price:'#d8f2c6',body:['#246b3a','#43a35d'],cap:['#36994f','#58bd70']},
  'THE RECORD':{subtitle:'2 + 2 = 5',paint:'#2f5aa3',masthead:'#15223f',frame:'#1b3262',price:'#d3e1f6',body:['#25488a','#4a74c0'],cap:['#3962ad','#5a86cc']}
};
const textures=new Map();
export function newspaperTexture(paper='DAILY BUGLE'){
  if(textures.has(paper))return textures.get(paper);
  const look=NEWSPAPER_LOOKS[paper]??NEWSPAPER_LOOKS['DAILY BUGLE'];
  const c=document.createElement('canvas');c.width=160;c.height=224;
  const g=c.getContext('2d');
  g.fillStyle=look.paint;g.fillRect(0,0,160,224);
  g.fillStyle='#eee1bd';g.fillRect(7,9,146,38);
  g.fillStyle=look.masthead;g.textAlign='center';g.font='bold 20px serif';g.fillText(paper,80,35,140);
  g.fillStyle=look.frame;g.fillRect(9,56,142,130);
  g.fillStyle='#829395';g.fillRect(13,60,134,122);
  g.fillStyle='#e2d8b9';g.fillRect(22,69,106,103);
  g.fillStyle='#292636';g.font='bold 15px serif';g.fillText(paper,75,86,100);
  g.font='bold 14px monospace';g.fillText(look.subtitle??'CITY NEWS',75,104,100);
  g.fillStyle='#41414d';g.fillRect(29,113,43,31);
  for(let y=114;y<165;y+=6){g.fillRect(79,y,40,2);if(y>143)g.fillRect(29,y,43,2);}
  g.fillStyle='#e2d8b9';g.fillRect(133,98,8,36);
  g.fillStyle='#beb9ac';g.fillRect(15,195,33,19);
  g.fillStyle='#232231';g.fillRect(20,202,23,4);
  g.fillStyle=look.price;g.font='bold 18px monospace';g.fillText('25¢',113,212);
  textures.set(paper,c);return c;
}
