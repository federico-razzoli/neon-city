/*
Browser Games — standalone browser games, including Neon City.
Copyright (C) 2026 Federico Razzoli <federico.razzoli@vettabase.com>
SPDX-License-Identifier: AGPL-3.0-only

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program (see LICENSE in the repository root).
If not, see <https://www.gnu.org/licenses/>.
*/

// Camera coordinates face +Z; texture coordinates remain in source pixel units.
export const NATIVE_VIEW={width:640,height:360,focal:355,horizon:164,near:.15,far:260};
export function createRenderCamera({width:W=640,height:H=360,focal:F=355,horizon=164,near=.15}={}){
  let player={x:0,z:0,angle:0},eye=1.65,pitch=0;
  let cameraCos=1,cameraSin=0,pitchCos=1,pitchSin=0;
  const viewPlanes=new Float64Array(20);
  function prepareCamera(view){
    player=view.position;eye=view.eye;pitch=view.pitch??0;
    cameraCos=Math.cos(player.angle);cameraSin=Math.sin(player.angle);
    pitchCos=Math.cos(pitch);pitchSin=Math.sin(pitch);
    // Inward-facing near, left, right, top and bottom planes. Coordinates are
    // relative to the eye, so each AABB test needs no projected vertex objects.
    const plane=(i,x,y,z,d=0)=>{viewPlanes[i]=x;viewPlanes[i+1]=y;viewPlanes[i+2]=z;viewPlanes[i+3]=d;};
    const zx=cameraSin*pitchCos,zy=pitchSin,zz=cameraCos*pitchCos;
    const yx=-cameraSin*pitchSin,yy=pitchCos,yz=-cameraCos*pitchSin;
    plane(0,zx,zy,zz,-near);
    plane(4,W/2*zx+F*cameraCos,W/2*zy,W/2*zz-F*cameraSin);
    plane(8,W/2*zx-F*cameraCos,W/2*zy,W/2*zz+F*cameraSin);
    plane(12,horizon*zx-F*yx,horizon*zy-F*yy,horizon*zz-F*yz);
    plane(16,(H-horizon)*zx+F*yx,(H-horizon)*zy+F*yy,(H-horizon)*zz+F*yz);
  }
  function boundsVisible(minX,minY,minZ,maxX,maxY,maxZ){
    const x=(minX+maxX)/2-player.x,y=(minY+maxY)/2-eye,z=(minZ+maxZ)/2-player.z;
    const rx=(maxX-minX)/2,ry=(maxY-minY)/2,rz=(maxZ-minZ)/2;
    for(let i=0;i<viewPlanes.length;i+=4){
      const a=viewPlanes[i],b=viewPlanes[i+1],c=viewPlanes[i+2];
      if(a*x+b*y+c*z+viewPlanes[i+3]+Math.abs(a)*rx+Math.abs(b)*ry+Math.abs(c)*rz< -1e-8)return false;
    }
    return true;
  }
  function camera(v){
    const dx=v.x-player.x,dz=v.z-player.z,y=v.y-eye,z=dx*cameraSin+dz*cameraCos;
    return {x:dx*cameraCos-dz*cameraSin,y:y*pitchCos-z*pitchSin,z:z*pitchCos+y*pitchSin,u:v.u||0,v:v.v||0};
  }
  function project(v){return {x:W/2+v.x*F/v.z,y:horizon-v.y*F/v.z};}
  function clip(vertices){const out=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],ai=a.z>=near,bi=b.z>=near;if(ai)out.push(a);if(ai!==bi){const t=(near-a.z)/(b.z-a.z),v={};for(const k of ['x','y','z','u','v'])v[k]=a[k]+(b[k]-a[k])*t;out.push(v);}}return out;}
  return {set:prepareCamera,transform:camera,project,clip,boundsVisible};
}
