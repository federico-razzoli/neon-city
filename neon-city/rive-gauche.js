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

import {RIVE_GAUCHE_SIGN,groundHeight} from './world.js?v=rive-gauche-6';
import {band} from './parks.js?v=rive-gauche-6';

export const RIVE_GAUCHE_TEXTURE={width:360,height:220};
const BROWN={board:'#6b3f22',light:'#7d4c2b',dark:'#5a331b',edge:'#3c2414'};
const POST=['#4a505a','#5d6470','#717986','#878f9b'];
const visible=(viewer,p,n)=>(viewer.x-p.x)*n.x+(viewer.y-p.y)*n.y+(viewer.z-p.z)*n.z>0;

// The panel runs from the post along (ax,az), between t=near and t=far.
export function drawRiveGaucheSign(s,{face},viewer,texture){
  const {post,width,bottom,top}=RIVE_GAUCHE_SIGN,half=.02,{width:columns,height:rows}=RIVE_GAUCHE_TEXTURE;
  const ground=groundHeight(s.x,s.z)+.075,y0=ground+bottom,y1=ground+top;
  band(face,viewer,{x:s.x,z:s.z},ground,post,y1+.05,post,POST,{sides:6,bottom:false});
  const near=post,far=post+width,nx=s.az,nz=-s.ax;
  const at=(t,y,side)=>({x:s.x+s.ax*t+side*half*nx,y,z:s.z+s.az*t+side*half*nz});
  // Both faces read forwards: from side 1 the panel runs to the viewer's right.
  for(const side of [-1,1]){
    if(!visible(viewer,at(near,y0,side),{x:side*nx,y:0,z:side*nz}))continue;
    const [left,right]=side>0?[near,far]:[far,near];
    face([{...at(left,y0,side),u:0,v:rows},{...at(right,y0,side),u:columns,v:rows},
      {...at(right,y1,side),u:columns,v:0},{...at(left,y1,side),u:0,v:0}],BROWN.board,texture);
  }
  const edges=[[far,y0,far,y1,{x:s.ax,y:0,z:s.az}],[far,y1,near,y1,{x:0,y:1,z:0}],[near,y0,far,y0,{x:0,y:-1,z:0}]];
  for(const [ta,ya,tb,yb,n] of edges){
    if(!visible(viewer,at(ta,ya,1),n))continue;
    face([at(ta,ya,-1),at(tb,yb,-1),at(tb,yb,1),at(ta,ya,1)],BROWN.edge);
  }
}
