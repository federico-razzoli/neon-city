export const PUB_NAMES=["THE CLANSMAN","HARRY'S PUB","PUBLIC HOUSE","JOIN TABLES","THE LEPRECHAUN","OLD RIVER","APACHE PUB"];
export function pubName(building){
  // A pseudorandom choice per address stays consistent across walls and visits.
  let hash=2166136261;
  for(const char of `pub:${building.x},${building.z}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;
  return PUB_NAMES[(hash>>>0)%PUB_NAMES.length];
}

export function drawPub(g,height,building,side){
  // Stable occupants per address and wall, including after texture regeneration.
  let seed=2166136261;
  for(const char of `${building.x},${building.z}:${side}`)seed=Math.imul(seed^char.charCodeAt(0),16777619);
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const pick=values=>values[Math.floor(random()*values.length)];
  const y=height-39;
  const rect=(colour,x,z,w,h)=>{g.fillStyle=colour;g.fillRect(x,y+z,w,h);};
  rect('#24191f',0,0,160,39);
  // Each window looks into a different part of the seating area.
  for(const x of [6,96]){
    rect('#9b7954',x,3,58,33);rect('#302126',x+2,5,54,29);
    rect('#5b3930',x+3,26,52,8);
    if(side===(building.j===1?1:0)&&x===6){
      // A single distant bar occupies only one view of the pub.
      for(const shelf of [12,18]){
        rect('#a2774c',x+5,shelf,19,1);
        for(let i=0;i<4;i++){
          rect(['#618568','#b37943','#9e5652'][i%3],x+6+i*5,shelf-4,2,4);
          rect('#c9ab73',x+6+i*5,shelf-5,1,1);
        }
      }
      rect('#b78350',x+4,20,21,2);rect('#694331',x+5,22,19,3);
    }else{
      const px=x+7+Math.floor(random()*8);
      rect('#a2774c',px,9,12,8);rect(pick(['#665366','#526563','#88654b']),px+1,10,10,6);
    }
    rect('#35232a',x+27,5,2,3);rect('#edb969',x+23,8,10,3);
    for(const offset of [7,33]){
      const tx=x+offset+Math.floor(random()*3),ty=25+Math.floor(random()*3);
      const occupied=random()<.85;
      for(const direction of [-1,1]){
        const px=direction===-1?tx-2:tx+15;
        rect('#805840',px-1,ty-3,6,8);rect('#39282a',px,ty+5,1,3);
        if(!occupied||(direction===1&&random()<.35))continue;
        const skin=pick(['#d6a17b','#a86f51','#704b3b','#e8bd97']);
        const shirt=pick(['#8a5468','#587b7c','#a58454','#64628d','#a1614f']);
        rect('#292532',px,ty+2,5,2);rect('#292532',px+(direction===-1?3:0),ty+3,2,4);
        rect(shirt,px,ty-5,5,7);rect(skin,px+1,ty-10,4,5);
        rect(pick(['#34282b','#806044','#baa17b','#201e28']),px,ty-11,5,2);
        rect(shirt,px+(direction===-1?3:-2),ty-4,4,2);
        rect(skin,px+(direction===-1?6:-3),ty-3,2,1);
      }
      rect('#483036',tx+7,ty+1,2,7);rect('#483036',tx+3,ty+7,10,1);
      rect('#bf8d59',tx,ty,18,2);
      if(occupied){
        rect('#d7c7a0',tx+4,ty-3,2,3);rect('#b88642',tx+4,ty-2,2,2);
        rect('#779479',tx+12,ty-4,2,4);rect('#c6ac79',tx+12,ty-5,1,1);
      }
    }
    g.globalAlpha=.12;rect('#c5e6ed',x+4,6,2,27);rect('#c5e6ed',x+48,6,3,27);g.globalAlpha=1;
    rect('#9b7954',x+28,4,2,31);
  }
  // Only the street-facing north/south facade gets an entrance.
  // SPACE at this entrance transports the player into the pub.
  if(side===(building.j===1?1:0)){
    rect('#a18460',68,2,24,37);rect('#4f3330',70,4,20,34);
    rect('#bd9760',73,7,14,18);rect('#423332',75,9,10,14);
    rect('#322329',73,28,14,7);rect('#e4c483',85,26,2,5);
    rect('#a18460',70,37,20,2);
  }else{
    rect('#674733',70,7,20,24);rect('#32242a',72,9,16,20);
    rect('#c0a073',75,13,10,1);rect('#c0a073',75,17,10,1);
    rect('#c0a073',77,21,6,1);
  }
}
