// Shopfronts use metre-sized doors, display bays and signs, independently of
// the width of the buildings above. Each block has exactly two entrances.
const SHOPS=[
  {name:'NIGHT RECORDS',trim:'#55b9c7',wall:'#25343e',kind:'records'},
  {name:'BOOKS',trim:'#d2ad6d',wall:'#423139',kind:'books'},
  {name:'BLUE NOTE RECORDS',trim:'#55b9c7',wall:'#25343e',kind:'records'},
  {name:'MIDNIGHT BOOKS',trim:'#d2ad6d',wall:'#423139',kind:'books'},
  {name:'VINYL',trim:'#b18bca',wall:'#352c43',kind:'records'},
  {name:'CITY BOOKS',trim:'#d2ad6d',wall:'#423139',kind:'books'}
];
const labels=new Map();
function label(shop){
  if(typeof document==='undefined')return null;
  if(!labels.has(shop.name)){
    const c=document.createElement('canvas');c.width=shop.name.length*20+32;c.height=48;
    const g=c.getContext('2d');g.fillStyle=shop.wall;g.fillRect(0,0,c.width,c.height);
    g.font='bold 30px monospace';g.textAlign='center';g.textBaseline='middle';
    g.fillStyle=shop.trim;g.fillText(shop.name,c.width/2,25);labels.set(shop.name,c);
  }
  return labels.get(shop.name);
}
export function drawBlockShops({face,box},left,right,ground,z,block){
  const width=(right-left)/2,base=ground+.16;
  for(let shopIndex=0;shopIndex<2;shopIndex++){
    const shop=SHOPS[block*2+shopIndex],x=left+shopIndex*width,door=x+width/2;
    const panel=(px,y,w,h,color,offset=.035)=>face([
      {x:px,y:base+y,z:z-offset},{x:px+w,y:base+y,z:z-offset},
      {x:px+w,y:base+y+h,z:z-offset},{x:px,y:base+y+h,z:z-offset}
    ],color);
    // A continuous ground-floor fascia covers the original lowest windows.
    panel(x,0,width,3.35,shop.wall,.025);
    panel(x+.08,2.68,width-.16,.6,shop.wall,.045);
    panel(x+.08,2.66,width-.16,.035,shop.trim,.05);
    panel(x+.08,3.27,width-.16,.035,shop.trim,.05);
    // Fixed-size glazed entrance, threshold and handle.
    panel(door-.65,0,1.3,2.6,shop.trim,.05);
    panel(door-.56,.04,1.12,2.48,'#19232c',.055);
    panel(door-.45,.55,.9,1.77,'#344553',.06);
    panel(door+.35,.95,.045,.3,'#d9c9a2',.065);
    box(door-.65,base,z-.12,1.3,.035,.12,'#77717b');
    // Broad display windows retain human-scale frames even on longer blocks.
    for(const [start,end] of [[x+.25,door-.85],[door+.85,x+width-.25]]){
      const bays=Math.max(1,Math.ceil((end-start)/2.8)),bay=(end-start)/bays;
      for(let b=0;b<bays;b++){
        const px=start+b*bay,w=bay-.12;
        panel(px,.3,w,2.25,shop.trim,.05);
        panel(px+.07,.38,w-.14,2.09,'#26313d',.055);
        panel(px+.1,.4,w-.2,.16,'#735443',.06);
        for(const shelf of [.62,1.4]){
          panel(px+.13,shelf,w-.26,.055,'#9b7954',.065);
          const items=Math.max(2,Math.floor((w-.35)/.36));
          for(let item=0;item<items;item++){
            const ix=px+.18+item*(w-.35)/items,color=['#a86e76','#bba269','#668a83','#7e779c'][item%4];
            const iw=shop.kind==='books'?.16:.28,ih=shop.kind==='books'?.48:.32;
            panel(ix,shelf+.06,iw,ih,color,.07);
            if(shop.kind==='records')panel(ix+.07,shelf+.13,.14,.14,'#242631',.075);
            else panel(ix+.03,shelf+.39,.1,.025,'#dfd2a9',.075);
          }
        }
        panel(px+.14,2.32,w-.28,.045,'#e4c899',.065);
        panel(px+.1,.44,.035,1.8,'#61717e',.08);
      }
    }
    const texture=label(shop);
    if(texture){
      const h=.48,w=texture.width/texture.height*h,cx=x+width/2,y=base+2.75;
      face([{x:cx-w/2,y,z:z-.06,u:0,v:texture.height},
        {x:cx+w/2,y,z:z-.06,u:texture.width,v:texture.height},
        {x:cx+w/2,y:y+h,z:z-.06,u:texture.width,v:0},
        {x:cx-w/2,y:y+h,z:z-.06,u:0,v:0}],shop.wall,texture);
    }
  }
}
