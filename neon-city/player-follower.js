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

import {groundHeight} from './world.js?v=start-pub-1';
import {pubRoute} from './pub-life.js?v=npc-followup-1';

const WALK_SPEED=1.3,FOLLOW_SPEED=4,GAP=1.6,ROUTE_INTERVAL=.25,HISTORY=240;
export const STREET_CLEARANCE=1.3;
const CLEARANCE={street:STREET_CLEARANCE,pub:.85};

// Events own the follower's lifecycle and call followPlayer while active.
// Pass a chair when starting in a pub seat so pubRoute can plan a way out.
export class PlayerFollower{
  constructor({type,variant=0,room,x,z,ground=0,chair=null,facingX=0,facingZ=1}){
    Object.assign(this,{type,variant,room,x,z,ground,chair,facingX,facingZ,
      route:[],history:[],routeTimer:0,pushTime:0,walkTime:0});
  }
  // Rendering data for a street pedestrian card.
  view(){return {x:this.x,z:this.z,ground:this.ground,type:this.type,variant:this.variant,facingX:this.facingX,facingZ:this.facingZ,frame:Math.floor(this.walkTime*WALK_SPEED*5)%4};}
  // Where she stands, for collisions; below street level means the lower path.
  // As walker, she is a bumped person without lines for the place.
  body(){return {...this.view(),riverWalk:this.riverWalk,walker:this,place:null};}
  followPlayer(dt,{player,city,ground=0}){
    const room=this.room,distance=Math.hypot(player.x-this.x,player.z-this.z);
    const travel=Math.min(dt*FOLLOW_SPEED,distance-GAP);
    if(travel<=0||(room!=='street'&&room!=='pub'))return false;
    if(room==='pub'){
      const dx=player.x-this.x,dz=player.z-this.z;
      const target={x:player.x-dx/distance*GAP,z:player.z-dz/distance*GAP};
      this.routeTimer-=dt;
      if(this.routeTimer<=0){
        this.routeTimer=ROUTE_INTERVAL;
        this.route=pubRoute(this,target,this.chair)??pubRoute(this,player,this.chair)??[];
      }
      this.walkRoute(travel,player,ground);
    }else{
      const x=this.x,z=this.z;
      const last=this.history.at(-1);
      if(!last||Math.hypot(x-last.x,z-last.z)>=.25){
        this.history.push({x,z,ground:this.ground});
        if(this.history.length>HISTORY)this.history.shift();
      }
      city.move(this,(player.x-x)/distance*travel,(player.z-z)/distance*travel);
      this.ground=groundHeight(this.x,this.z,this.riverWalk);
      delete this.riverFall;
      this.faceMovement(this.x-x,this.z-z);
    }
    return true;
  }
  yieldToPlayer(dt,pressed,player,move){
    this.pushTime=pressed?this.pushTime+dt:0;
    if(this.pushTime<.35)return;
    this.pushTime=0;
    const x=this.x,z=this.z,dx=x-player.x,dz=z-player.z,distance=Math.hypot(dx,dz);
    if(!distance)return;
    move(this,.35*dx/distance,.35*dz/distance);
    this.faceMovement(this.x-x,this.z-z);
    this.routeTimer=0;
    if(this.room==='street'){
      this.ground=groundHeight(this.x,this.z,this.riverWalk);
      delete this.riverFall;
    }
  }
  faceMovement(dx,dz){
    const distance=Math.hypot(dx,dz);
    if(distance===0)return;
    this.facingX=dx/distance;this.facingZ=dz/distance;
    this.walkTime+=distance/WALK_SPEED;
  }
  walkRoute(travel,player,playerGround){
    while(travel>0&&this.route.length){
      const p=this.route[0],dx=p.x-this.x,dz=p.z-this.z,d=Math.hypot(dx,dz);
      if(d===0){this.route.shift();continue;}
      const move=Math.min(d,travel),x=this.x+dx/d*move,z=this.z+dz/d*move;
      const after=Math.hypot(x-player.x,z-player.z);
      if(Math.abs(playerGround-this.ground)<=1.5&&after<CLEARANCE[this.room]&&after<Math.hypot(this.x-player.x,this.z-player.z))return;
      this.faceMovement(x-this.x,z-this.z);
      this.x=x;this.z=z;this.ground+=((p.ground??0)-this.ground)*move/d;
      travel-=move;
      if(move===d)this.route.shift();
    }
  }
}
