// Menus occupy the centre of every pub wall except the entrance wall.
export function facingPubMenu(player,buildings){
  for(const b of buildings){
    if(b.sign!=='NEON PUB')continue;
    const walls=[
      {x:b.x+b.w/2,z:b.z,nx:0,nz:-1},
      {x:b.x+b.w/2,z:b.z+b.d,nx:0,nz:1},
      {x:b.x,z:b.z+b.d/2,nx:-1,nz:0},
      {x:b.x+b.w,z:b.z+b.d/2,nx:1,nz:0},
    ];
    for(let side=0;side<walls.length;side++){
      if(side===(b.j===1?1:0))continue;
      const wall=walls[side],dx=wall.x-player.x,dz=wall.z-player.z;
      const distance=Math.hypot(dx,dz);
      // Require the outside of this wall, close proximity and a centred view.
      if(dx*wall.nx+dz*wall.nz>=0||distance>3||distance<.01)continue;
      if((dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/distance>=Math.cos(.22))return true;
    }
  }
  return false;
}
