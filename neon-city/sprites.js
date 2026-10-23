export const SHOE_COLORS=['#b8a7ac','#170f28','#b8a7ac','#12121a','#e3d8dc','#191725','#463447'];
const sprites=[];
export function sprite(type,frame,back=false){
  const key=`${type}:${frame}:${back}`;if(sprites[key])return sprites[key];
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
    const dark=type===4,skin=dark?'#875235':'#e2a282';
    const hair=dark?'#211923':'#fa4eb1',shirt=dark?'#e5b447':'#292438';
    rect(hair,7,3,11,12);rect(skin,9,7,7,8);
    rect(shirt,6,16,14,15);rect(skin,4,21,3,11);rect(skin,20,21,3,11);
    if(dark){
      rect('#394866',8,31,5,12+stride);rect('#394866',14,31,5,12-stride);
      rect(SHOE_COLORS[type],6,43+stride,7,3);rect(SHOE_COLORS[type],14,43-stride,7,3);
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
      rect(dark?'#c89235':'#a54b92',10,20,6,5);
    }else{
      rect('#241c2c',10,10,1,1);rect('#241c2c',14,10,1,1);
      rect(dark?'#fff0c0':'#ec91c9',11,20,4,4);
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
