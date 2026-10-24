export const SHOE_COLORS=['#b8a7ac','#170f28','#b8a7ac','#12121a','#e3d8dc','#191725','#463447','#121018','#151320','#a07a5e','#e6e2dc','#585e68','#b5a688'];
// The Black teen girl's outfits: shirt, chest print, back panel and shoes.
export const TEEN_OUTFITS=[
  {shirt:'#e5b447',print:'#fff0c0',panel:'#c89235',shoes:SHOE_COLORS[4]},
  {shirt:'#3fb6a8',print:'#d9fff4',panel:'#2c8a80',shoes:'#f05b7a'},
  {shirt:'#9a5fd6',print:'#f0d8ff',panel:'#7442ab',shoes:'#f2d16b'}
];
// Only she varies; variant 0 keeps the original outfit.
export const outfit=(type,variant=0)=>type===4?Math.min(TEEN_OUTFITS.length-1,Math.floor(variant*TEEN_OUTFITS.length)):0;
const sprites=[];
export function sprite(type,frame,back=false,variant=0){
  const look=outfit(type,variant),key=`${type}:${frame}:${back}:${look}`;if(sprites[key])return sprites[key];
  const c=document.createElement('canvas');c.width=24;c.height=48;const g=c.getContext('2d');
  const rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const stride=[-2,0,2,0][frame],skin=type===2?'#94624e':'#e2a282';
  if(type===6){
    // Gay man with pink hair and shirt, white trousers and a right-ear hoop.
    rect('#ed68ac',8,2,10,6);rect('#ff9bcc',10,1,6,3);
    rect(skin,8,7,10,8);rect(skin,10,14,6,2);
    rect('#e97eb2',5,16,16,16);rect('#e97eb2',3,17,3,6);rect('#e97eb2',21,17,3,6);
    rect(skin,3,23,3,9);rect(skin,21,23,3,9);
    rect('#f4eff2',7,32,6,12+stride);rect('#f4eff2',15,32,5,12-stride);
    rect('#d2c7d5',11,33,2,10+stride);rect('#d2c7d5',15,33,1,10-stride);
    rect(SHOE_COLORS[type],5,44+stride,8,3);rect(SHOE_COLORS[type],15,44-stride,8,3);
    if(back){
      rect('#ed68ac',8,5,10,8);rect('#c85897',8,11,10,2);
      rect('#ca6098',6,18,14,1);rect('#ca6098',12,20,1,11);
    }else{
      rect('#ed68ac',8,6,5,3);rect('#342237',10,10,1,1);rect('#342237',15,10,1,1);
      rect('#b96578',11,13,4,1);rect('#f9b5d6',10,16,6,2);
      rect('#ca6098',12,18,1,13);
      for(let y=20;y<30;y+=4)rect('#ffe0ed',13,y,1,1);
    }
    // His right ear is on the viewer's left from the front, right from behind.
    const earX=back?18:6;
    rect(skin,earX,10,2,2);
    rect('#f2d477',earX,12,2,3);rect('#765b38',earX+1,13,1,1);
    sprites[key]=c;return c;
  }
  if(type===3||type===4){
    // Teen outfits share the same four-frame walk cycle.
    const dark=type===4,skin=dark?'#875235':'#e2a282',clothes=TEEN_OUTFITS[look];
    const hair=dark?'#211923':'#fa4eb1',shirt=dark?clothes.shirt:'#292438';
    rect(hair,7,3,11,12);rect(skin,9,7,7,8);
    rect(shirt,6,16,14,15);rect(skin,4,21,3,11);rect(skin,20,21,3,11);
    if(dark){
      rect('#394866',8,31,5,12+stride);rect('#394866',14,31,5,12-stride);
      rect(clothes.shoes,6,43+stride,7,3);rect(clothes.shoes,14,43-stride,7,3);
    }else{
      // Short black skirt and chunky black boots.
      rect(skin,8,33,5,10+stride);rect(skin,14,33,5,10-stride);
      rect('#15141d',7,29,13,6);rect('#15141d',6,33,15,2);
      rect('#35323f',7,29,13,1);rect('#b9acbc',12,29,2,1);
      rect(SHOE_COLORS[type],8,39+stride,5,6);rect(SHOE_COLORS[type],14,39-stride,5,6);
      rect(SHOE_COLORS[type],6,43+stride,7,3);rect(SHOE_COLORS[type],14,43-stride,7,3);
      rect('#363340',9,40+stride,2,1);rect('#363340',16,40-stride,2,1);
    }
    if(dark){
      // A simple rounded hairstyle with a bright headband.
      rect(hair,9,2,7,2);rect('#ec795c',8,5,10,2);
    }else{
      // Spiky pink fringe, dark vest and silver studs.
      rect(hair,8,0,3,5);rect(hair,13,1,3,5);rect(hair,17,3,3,6);
      rect('#141524',6,16,4,14);rect('#141524',17,16,3,14);
      rect('#d6c6dc',7,18,1,1);rect('#d6c6dc',18,18,1,1);
    }
    if(back){
      rect(hair,8,7,10,8);
      rect(dark?clothes.panel:'#a54b92',10,20,6,5);
    }else{
      rect('#241c2c',10,10,1,1);rect('#241c2c',14,10,1,1);
      rect(dark?clothes.print:'#ec91c9',11,20,4,4);
      if(!dark)rect(hair,8,6,6,3);
    }
    sprites[key]=c;return c;
  }
  if(type===5){
    // Shirtless adult, ink on both arms and torso, beer held at his side.
    const skin='#c68b68',ink='#3b4150';
    rect('#392d2c',8,2,10,5);rect(skin,8,7,10,8);
    rect(skin,5,16,16,16);rect(skin,2,18,3,14);rect(skin,21,18,3,13);
    rect('#303344',7,32,6,12+stride);rect('#303344',15,32,5,12-stride);
    rect(SHOE_COLORS[type],5,44+stride,8,3);rect(SHOE_COLORS[type],15,44-stride,8,3);
    for(const x of [2,21]){rect(ink,x,20,3,2);rect(ink,x+1,23,1,4);rect(ink,x,27,3,1);}
    if(back){
      rect('#392d2c',8,5,10,7);rect(ink,9,19,8,2);rect(ink,12,18,2,10);
      rect(ink,10,23,6,2);
    }else{
      rect('#30242b',10,10,1,1);rect('#30242b',15,10,1,1);rect('#624336',10,13,6,2);
      rect(ink,7,19,5,2);rect(ink,9,18,1,5);rect(ink,16,25,3,4);
    }
    // Mirror the hand in the back view so the bottle stays in his left hand.
    const bottleX=back?1:21;
    rect('#6e914d',bottleX+1,28,1,4);rect('#345b38',bottleX,31,3,8);
    rect('#e5cf8a',bottleX,34,3,3);rect('#c8b887',bottleX+1,28,1,1);
    sprites[key]=c;return c;
  }
  if(type===7){
    // Businessman: charcoal suit, white shirt, red tie and polished shoes.
    const skin='#b97a57',hair='#231b20',suit='#3a3d4c',seam='#2c2e3a',shirt='#e8e6ea';
    rect(hair,8,2,10,5);rect(skin,8,6,10,8);rect(skin,7,9,1,2);rect(skin,18,9,1,2);rect(skin,10,14,6,1);
    rect(suit,5,15,16,17);rect(suit,3,16,3,13);rect(suit,20,16,3,13);
    rect(shirt,3,29,3,1);rect(shirt,20,29,3,1);rect(skin,3,30,3,2);rect(skin,20,30,3,2);
    rect(suit,7,32,5,12+stride);rect(suit,14,32,5,12-stride);
    rect(seam,9,33,1,10+stride);rect(seam,16,33,1,10-stride);
    rect(SHOE_COLORS[type],6,44+stride,7,3);rect(SHOE_COLORS[type],14,44-stride,7,3);
    rect('#4a4658',7,44+stride,2,1);rect('#4a4658',15,44-stride,2,1);
    if(back){
      rect(hair,8,2,10,11);rect(shirt,10,14,6,1);
      rect(seam,8,15,10,1);rect(seam,12,18,1,14);
    }else{
      rect('#3d3036',10,3,1,2);rect('#2a1e22',10,10,1,1);rect('#2a1e22',15,10,1,1);rect('#7a4a3c',11,12,4,1);
      // Open V of shirt, with the tie running down to the jacket button.
      rect(shirt,10,15,6,3);rect(shirt,11,18,4,3);rect(shirt,12,21,2,3);
      rect('#8f2433',12,16,2,2);rect('#c03a48',12,18,2,6);
      rect(seam,10,18,1,3);rect(seam,15,18,1,3);rect(seam,11,21,1,3);rect(seam,14,21,1,3);
      rect('#1e2029',12,26,1,1);rect('#1e2029',12,29,1,1);rect(shirt,17,19,2,1);
    }
    sprites[key]=c;return c;
  }
  if(type===8){
    // Businesswoman: burgundy blazer, charcoal pencil skirt, sheer tights and black heels.
    const skin='#e8b496',hair='#3b2420',blazer='#7e2a45',lapel='#5e1f34',skirt='#2a2638';
    rect(hair,7,2,12,11);rect(hair,8,1,10,2);rect(skin,9,5,8,8);rect(skin,11,13,4,2);
    rect('#f1ece4',8,13,1,1);rect('#f1ece4',17,13,1,1);
    rect(blazer,6,15,14,13);rect(blazer,7,28,12,1);rect(blazer,4,16,3,12);rect(blazer,19,16,3,12);
    rect(skin,4,28,3,2);rect(skin,19,28,3,2);
    rect(skirt,8,29,10,8);
    rect('#d39c80',9,37,3,6+stride);rect('#d39c80',14,37,3,6-stride);
    // Pointed pumps with a slim heel at the back, as on the clubgoer.
    rect(SHOE_COLORS[type],8,43+stride,5,2);rect(SHOE_COLORS[type],14,43-stride,5,2);
    rect(SHOE_COLORS[type],9,45+stride,1,2);rect(SHOE_COLORS[type],15,45-stride,1,2);
    rect('#4a4458',9,43+stride,2,1);rect('#4a4458',15,43-stride,2,1);
    if(back){
      rect(hair,7,2,12,12);rect(lapel,12,18,1,11);rect('#1d1a28',12,33,1,4);
    }else{
      rect(hair,9,5,4,1);rect('#2a1a22',10,9,1,1);rect('#2a1a22',15,9,1,1);rect('#b5425a',12,11,3,1);
      rect('#efe2cf',10,15,6,2);rect('#efe2cf',11,17,4,3);rect('#efe2cf',12,20,2,2);rect('#e0c56e',12,17,2,1);
      rect(lapel,10,17,1,3);rect(lapel,15,17,1,3);rect(lapel,11,20,1,2);rect(lapel,14,20,1,2);
      rect('#d8b45a',12,24,2,1);
    }
    sprites[key]=c;return c;
  }
  if(type===9){
    // Muslim woman: teal hijab framing the face and a long, loose plum abaya.
    const skin='#c58c66',hijab='#2f6170',fold='#234b57',abaya='#5a3d5c',trim='#8a6a8c';
    // Her flats go first so the long hem covers a lifted foot; a planted one stays at the hem.
    rect(SHOE_COLORS[type],7,44+Math.min(0,stride),6,2);rect(SHOE_COLORS[type],14,44+Math.min(0,-stride),6,2);
    rect(hijab,7,2,12,14);rect(hijab,6,15,14,4);
    rect(abaya,5,19,16,11);rect(abaya,5,30,16,14);rect(abaya,4,36,18,8);
    rect(abaya,3,18,3,12);rect(abaya,20,18,3,12);rect(trim,3,29,3,1);rect(trim,20,29,3,1);
    rect(skin,3,30,3,2);rect(skin,20,30,3,2);
    // The hem sways with each step.
    rect('#47304a',9+stride/2,34,1,9);rect('#47304a',16-stride/2,34,1,9);
    if(back){
      // The scarf tapers to a soft point down her back.
      rect(hijab,6,15,14,4);rect(hijab,7,19,12,2);rect(hijab,9,21,8,1);
      rect(fold,12,4,1,17);rect(fold,9,9,1,10);rect(fold,16,9,1,10);
    }else{
      rect(skin,10,6,6,7);rect('#ded3c4',10,5,6,1);
      rect(fold,9,6,1,8);rect(fold,16,6,1,8);rect(fold,10,13,6,1);
      rect('#2a1a22',11,9,1,1);rect('#2a1a22',14,9,1,1);rect('#9c5a50',12,11,2,1);
      rect(trim,12,19,2,25);
    }
    sprites[key]=c;return c;
  }
  if(type===10){
    // Sikh man: saffron turban, full beard, steel kara, bomber jacket, jeans and white sneakers.
    const skin='#a8714f',turban='#e08a2c',fold='#b86a1e',beard='#1d1719',jacket='#5d6b45',rib='#46523a';
    rect(skin,8,7,10,8);rect(skin,7,9,1,2);rect(skin,18,9,1,2);
    // The turban's lower edge dips to a point above the brow and rises toward the ears.
    rect(turban,7,1,12,6);rect(turban,8,0,10,2);rect(turban,10,7,6,1);rect(turban,12,8,2,1);
    rect(jacket,5,16,16,16);rect(jacket,3,17,3,12);rect(jacket,20,17,3,12);
    rect(rib,3,29,3,1);rect(rib,20,29,3,1);rect(rib,5,30,16,2);
    rect(skin,3,30,3,2);rect(skin,20,30,3,2);
    rect('#2f3e5e',7,32,5,12+stride);rect('#2f3e5e',14,32,5,12-stride);
    rect(SHOE_COLORS[type],6,44+stride,7,3);rect(SHOE_COLORS[type],14,44-stride,7,3);
    rect('#8a8494',6,46+stride,7,1);rect('#8a8494',14,46-stride,7,1);
    if(back){
      rect(turban,7,1,12,9);rect(fold,8,3,6,1);rect(fold,12,4,6,1);rect(fold,8,6,5,1);rect(fold,13,7,5,1);
      // Uncut hair is tied up under the turban and shows at the nape, above a short neck.
      rect(beard,8,10,10,4);rect(skin,10,14,6,2);
      rect(rib,8,16,10,1);
    }else{
      // Layers cross diagonally from each temple and meet at the centre.
      for(const [dx,y] of [[0,5],[2,4],[4,3]]){rect(fold,8+dx,y,2,1);rect(fold,16-dx,y,2,1);}
      rect(fold,10,2,6,1);rect(fold,12,7,2,1);
      rect(beard,8,11,10,5);rect(beard,10,11,6,1);rect('#7a4a3c',11,12,4,1);
      rect('#20161a',10,9,1,1);rect('#20161a',15,9,1,1);
      rect('#9a9aa6',10,16,6,14);rect(rib,9,16,1,14);rect(rib,16,16,1,14);
    }
    // The kara stays on his right wrist: viewer's left from the front, right from behind.
    rect('#c9ccd4',back?20:3,30,3,1);
    sprites[key]=c;return c;
  }
  if(type===11){
    // Old-style tin robot: boxy head, antenna, accordion arms, pincers and a wind-up key.
    const metal='#9aa0a8',dark='#6b717a',light='#c4c9cf';
    rect('#ff5a4a',11,0,3,2);rect(dark,12,2,1,2);
    rect(metal,7,4,12,10);rect(light,7,4,12,1);rect(dark,6,7,1,4);rect(dark,19,7,1,4);
    rect(dark,10,14,6,2);rect(metal,10,15,6,1);
    rect(metal,5,16,16,16);rect(light,5,16,1,16);rect(dark,19,16,2,16);
    for(const [x,y] of [[6,17],[18,17],[6,30],[18,30]])rect(dark,x,y,1,1);
    for(const x of [3,21]){
      rect(dark,x,17,2,12);for(let y=18;y<29;y+=3)rect(metal,x,y,2,1);
    }
    // Two-pronged pincers hang below each arm.
    rect(dark,2,29,4,2);rect(dark,2,31,1,2);rect(dark,5,31,1,2);
    rect(dark,20,29,4,2);rect(dark,20,31,1,2);rect(dark,23,31,1,2);
    rect(metal,8,32,4,12+stride);rect(metal,14,32,4,12-stride);
    rect(dark,8,37+stride,4,1);rect(dark,14,37-stride,4,1);
    rect(SHOE_COLORS[type],6,44+stride,7,3);rect(SHOE_COLORS[type],14,44-stride,7,3);
    if(back){
      rect(dark,9,8,8,1);rect(dark,9,10,8,1);
      rect(dark,10,20,6,6);rect('#c9a13a',9,21,8,2);rect('#c9a13a',12,23,2,2);
    }else{
      rect(dark,8,6,5,5);rect(dark,13,6,5,5);rect('#ffcf4a',9,7,3,3);rect('#ffcf4a',14,7,3,3);
      rect('#fff3c0',9,7,1,1);rect('#fff3c0',14,7,1,1);
      rect(dark,9,11,8,2);for(const x of [10,12,14])rect(light,x,11,1,2);
      rect(dark,8,19,10,7);rect('#ff5a4a',9,20,2,2);rect('#5aff8a',12,20,2,2);rect('#ffcf4a',15,20,2,2);
      rect(light,9,23,8,1);rect('#ff5a4a',13,23,1,1);
    }
    sprites[key]=c;return c;
  }
  if(type===12){
    // Egyptian mummy: wrapped head to foot in worn linen, with glowing eyes.
    const linen='#d8ccb0',wrap='#b5a688',gap='#2a2228',glow='#b8ff7a';
    rect(linen,9,1,8,1);rect(linen,8,2,10,12);rect(wrap,10,14,6,2);
    rect(linen,5,16,16,16);rect(linen,3,17,3,13);rect(linen,20,17,3,13);
    rect(SHOE_COLORS[type],3,30,3,2);rect(SHOE_COLORS[type],20,30,3,2);
    rect(linen,7,32,5,12+stride);rect(linen,14,32,5,12-stride);
    rect(SHOE_COLORS[type],6,44+stride,7,3);rect(SHOE_COLORS[type],14,44-stride,7,3);
    // Wrap lines alternate their offset so the bandages read as spiralling.
    for(let y=3;y<14;y+=3)rect(wrap,y%2?8:10,y,8,1);
    for(let y=18;y<32;y+=3){rect(wrap,y%2?5:9,y,12,1);rect(wrap,3,y,3,1);rect(wrap,20,y,3,1);}
    for(let y=35;y<44;y+=3){rect(wrap,7,y,5,1);rect(wrap,14,y,5,1);}
    rect(gap,16,22,2,1);rect(gap,8,27,1,1);rect(gap,15,38,1,1);
    // A loose strip trails from his arm and flutters as he shuffles.
    rect(linen,2,24,1,4);rect(linen,frame%2?1:2,28,1,6);
    if(back){
      rect(wrap,11,6,4,2);rect(wrap,12,8,2,10);
    }else{
      rect(gap,9,8,8,2);rect(glow,10,8,2,1);rect(glow,14,8,2,1);
    }
    sprites[key]=c;return c;
  }
  if(type===1){ // Adult clubgoer: big hair, magenta minidress, solid-colour tights and heels.
    rect('#b96d40',7,1,11,16);rect(skin,9,5,7,8);rect('#f7bd5b',7,1,11,5);rect('#ef4c99',8,15,10,15);rect(skin,5,16,3,15);rect(skin,18,16,3,15);rect('#ec849a',8,30,4,13+stride);rect('#ec849a',14,30,4,13-stride);
    rect(SHOE_COLORS[type],7,43+stride,6,2);rect(SHOE_COLORS[type],14,43-stride,7,2);rect(SHOE_COLORS[type],8,45+stride,1,2);rect(SHOE_COLORS[type],15,45-stride,1,2);
  }else{
    rect(type===2?'#171422':'#503e43',8,2,10,6);rect(skin,8,6,10,8);rect(type===2?'#1e1e2b':'#67bac5',5,15,16,17);rect(type===2?'#b2b0aa':'#efb9c4',10,16,6,14);rect(skin,3,19,3,13);rect(skin,21,19,3,13);rect('#21283f',7,32,6,12+stride);rect('#21283f',15,32,5,12-stride);rect(SHOE_COLORS[type],5,44+stride,8,3);rect(SHOE_COLORS[type],15,44-stride,8,3);
    if(type===0){rect('#101225',7,7,12,3);rect('#99dfeb',8,7,3,1);}else{rect('#d7b352',10,17,1,6);rect('#d7b352',15,17,1,6);rect('#d7b352',11,23,4,1);rect('#281e26',10,12,7,2);}
  }
  if(back){
    if(type===1){
      // Long hair covers the face and shoulders from behind.
      rect('#b96d40',7,1,11,18);rect('#f7bd5b',8,2,3,14);rect('#905235',16,6,2,13);
      rect('#b72e76',12,20,1,10);rect('#ff79b5',8,28,10,2);
    }else{
      // Back of the head and a closed jacket: no face, glasses, shirt or chain.
      rect(type===2?'#171422':'#503e43',8,2,10,11);
      rect(skin,10,13,6,2);
      rect(type===2?'#1e1e2b':'#67bac5',5,15,16,17);
      rect(type===2?'#414052':'#438d9b',6,18,14,1);
      rect(type===2?'#11121e':'#438d9b',12,20,1,11);
      rect('#687080',7,34,4,2);rect('#687080',16,34,3,2);
      rect('#655e70',5,44+stride,8,3);rect('#655e70',15,44-stride,8,3);
    }
  }
  sprites[key]=c;return c;
}
