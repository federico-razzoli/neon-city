/* SPDX-License-Identifier: AGPL-3.0-only */
export const BACKPACK={id:'backpack',name:'BACKPACK',description:'A BACKPACK.'};

// Rounded canvas body, a gusseted front pocket, zips, and padded shoulder straps.
// The shop bag and dropped inventory item share the same floor-standing model.
export function drawBackpack({x,z,ground=0},box,face){
  const point=(px,py,pz)=>({x:x+px,y:ground+py,z:z+pz});
  const polygon=(points,color)=>face(points.map(([px,py,pz])=>point(px,py,pz)),color);
  const sections=[[0,.23,.14],[.07,.31,.2],[.46,.33,.22],[.65,.3,.2],[.78,.23,.155],[.86,.12,.09],[.875,.035,.035]];
  const rings=sections.map(([y,w,d])=>Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*w,y,Math.sin(i*Math.PI/8)*d]));
  for(let j=1;j<rings.length;j++)for(let i=0;i<16;i++){
    const next=(i+1)%16;
    polygon([rings[j-1][i],rings[j-1][next],rings[j][next],rings[j][i]],i>=8?'#44605c':i<4?'#384e4b':'#506d64');
  }
  polygon(rings[0],'#303f3c');polygon(rings.at(-1),'#58736a');
  // Octagonal outlines soften the pocket corners and give its sides depth.
  const outline=[[-.19,.12],[.19,.12],[.24,.17],[.24,.38],[.19,.43],[-.19,.43],[-.24,.38],[-.24,.17]];
  const pocket=outline.map(([px,py])=>[px,py,-.315]);
  polygon(pocket,'#658076');
  for(let i=0;i<pocket.length;i++){
    const a=pocket[i],b=pocket[(i+1)%pocket.length];
    polygon([a,b,[b[0],b[1],-.17],[a[0],a[1],-.17]],'#49645c');
  }
  const seam=(points,width,color)=>{
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      const ox=-dy/length*width/2,oy=dx/length*width/2;
      polygon([[a[0]+ox,a[1]+oy,a[2]],[b[0]+ox,b[1]+oy,b[2]],[b[0]-ox,b[1]-oy,b[2]],[a[0]-ox,a[1]-oy,a[2]]],color);
    }
  };
  // The main zip follows the domed top; the smaller zip opens the front pocket.
  seam([[-.275,.49,-.16],[-.24,.68,-.16],[-.15,.795,-.13],[0,.845,-.1],[.15,.795,-.13],[.24,.68,-.16],[.275,.49,-.16]],.014,'#a6a28a');
  seam([[-.19,.405,-.32],[.19,.405,-.32]],.013,'#d0bf92');
  box(x+.155,ground+.355,z-.34,.025,.065,.018,'#d7c799');
  box(x-.28,ground+.475,z-.18,.025,.07,.02,'#d7c799');
  box(x-.065,ground+.265,z-.323,.13,.06,.012,'#c6b78e');
  // Two curved, padded loops on the back, rather than straps across the front.
  for(const px of [-.19,.19]){
    const strap=[[.72,.155],[.62,.3],[.33,.345],[.12,.19]];
    for(let i=1;i<strap.length;i++){
      const [ay,az]=strap[i-1],[by,bz]=strap[i];
      polygon([[px-.045,ay,az],[px+.045,ay,az],[px+.045,by,bz],[px-.045,by,bz]],'#263b36');
      polygon([[px-.045,ay,az+.02],[px+.045,ay,az+.02],[px+.045,by,bz+.02],[px-.045,by,bz+.02]],'#718277');
    }
    box(x+px-.035,ground+.17,z+.235,.07,.06,.025,'#b6ac89');
  }
  seam([[-.09,.83,.035],[-.09,.95,.035],[-.055,1,.035],[.055,1,.035],[.09,.95,.035],[.09,.83,.035]],.032,'#b39c6d');
  // Reinforced base and side seams finish the soft body.
  for(const px of [-.28,.26])box(x+px,ground+.11,z-.075,.02,.35,.06,'#3b514a');
}
