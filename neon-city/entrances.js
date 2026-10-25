// Wall order matches the renderer: north, south, west, east.
export const entranceSide=b=>b.entranceSide??(b.j===1?1:0);
export function entranceWall(b){
  return [
    {x:b.x+b.w/2,z:b.z,nx:0,nz:-1,width:b.w},
    {x:b.x+b.w/2,z:b.z+b.d,nx:0,nz:1,width:b.w},
    {x:b.x,z:b.z+b.d/2,nx:-1,nz:0,width:b.d},
    {x:b.x+b.w,z:b.z+b.d/2,nx:1,nz:0,width:b.d},
  ][entranceSide(b)];
}
export function facesEntrance(player,b,facingDoorway){
  const wall=entranceWall(b);
  if((player.x-wall.x)*wall.nx+(player.z-wall.z)*wall.nz<=0)return false;
  // Rotate east/west walls into the north/south doorway coordinate system.
  return wall.nx?facingDoorway({x:player.z,z:player.x,angle:Math.PI/2-player.angle},{x:wall.z,z:wall.x},wall.width*10/160):
    facingDoorway(player,wall,wall.width*10/160);
}
export function orientEntrances(chunk,parks){
  for(const b of chunk.buildings){
    const normal=b.j===1?1:0,lateral=b.i===1?3:2;
    const neighbors=[[chunk.x,chunk.z-1],[chunk.x,chunk.z+1],[chunk.x-1,chunk.z],[chunk.x+1,chunk.z]];
    const side=[normal,lateral].find(side=>parks.has(neighbors[side].join(',')))??normal;
    if(entranceSide(b)!==side){delete b.textures;delete b.dimTextures;}
    b.entranceSide=side;
  }
}
