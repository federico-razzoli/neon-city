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

import {BLOCK,RIVER_ROWS,isRiverRow,groundHeight} from './world.js?v=start-pub-1';
import {PUB,pubChairs} from './pub-interior.js?v=bar-taps-1';
import {pubRoute} from './pub-life.js?v=npc-followup-1';

// Lisa, the tall girl, walking with the player to Night River.
export const LISA_TYPE=15;
const SPEED=1.3,FOLLOW_SPEED=4,GAP=1.6,WARN_DISTANCE=16,REACH=20,ROUTE_INTERVAL=.25,LEAVE_TIME=12,HISTORY=240;
// How close she comes to the player: just beyond the street bump radius, so
// the player is never pinned, and the pub's person clearance indoors.
const CLEARANCE={street:1.3,pub:.85};
const LATERAL_LIMIT=3;
const entrance={x:PUB.door.x,z:.4};
const block=v=>Math.floor(v/BLOCK);
const onRiver=p=>isRiverRow(block(p.z));
const centre=c=>({x:c.x+c.w/2,z:c.z+c.d/2});

// States: seated (agreed, waiting for the player to stand), following,
// waiting (at the river, while the player is on other streets), leaving.
// Gone once she has walked off; she may then turn up in a pub again.
export class LisaDate{
  constructor({tableIndex,seat,variant,pubBlock}){
    const chair=pubChairs().find(c=>c.tableIndex===tableIndex&&c.seat===seat);
    Object.assign(this,{chair,variant,pubBlock,type:LISA_TYPE,room:'pub',state:'seated',...centre(chair),ground:0,
      route:[],history:[],routeTimer:0,pushTime:0,distanceWarned:false,walkTime:0,facingX:0,facingZ:-chair.side,atRiver:false,gone:false,leaveTime:0});
    // 1 when the nearest river lies at greater z than the pub's block, else -1.
    this.riverDirection=Math.sign(RIVER_ROWS.reduce((a,b)=>Math.abs(b+.5-pubBlock.z)<Math.abs(a+.5-pubBlock.z)?b:a)+.5-pubBlock.z);
  }
  isFollowing(player){return !this.gone&&this.state==='following'&&Math.hypot(player.x-this.x,player.z-this.z)<=REACH;}
  get visible(){return !this.gone&&this.state!=='seated'&&!this.inDoorway;}
  // Rendering data for a street pedestrian card.
  view(){return {x:this.x,z:this.z,ground:this.ground,type:this.type,variant:this.variant,facingX:this.facingX,facingZ:this.facingZ,frame:Math.floor(this.walkTime*SPEED*5)%4};}
  // Where she stands, for collisions; below street level means the lower path.
  // As walker, she is a bumped person without lines for the place.
  body(){return {...this.view(),riverWalk:this.riverWalk,walker:this,place:null};}
  // Room is 'pub', 'street' or anything else (a place she won't go).
  update(dt,{room,player,seated,ground=0,patrons,city}){
    if(this.gone)return;
    // Waiting at the river, she stays there wherever the player goes.
    if(room!==this.room){if(this.state!=='waiting')this.gone=true;return;}
    if(this.state==='seated'){
      if(seated)return;
      // She stands as the player does, and walks round the table to them.
      patrons[this.chair.tableIndex][this.chair.seat]=null;
      this.state='following';
    }
    if(this.state==='leaving'){
      this.leaveTime-=dt;
      this.walkRoute(dt*SPEED,player,ground);
      if(!this.route.length||this.leaveTime<=0)this.gone=true;
      return;
    }
    const distance=Math.hypot(player.x-this.x,player.z-this.z);
    // Out of the pub, she steps through the door once the player has made room.
    if(this.inDoorway){if(distance<CLEARANCE.street)return;this.inDoorway=false;}
    const playerOff=this.atRiver&&!onRiver(player);
    if(playerOff){this.state='waiting';this.distanceWarned=false;return;}
    if(this.state==='waiting'){
      if(distance>REACH)return;
      this.state='following';
    }
    if(distance>REACH||room==='street'&&!this.atRiver&&!onRiver(player)&&this.strayed(player)){this.leave();return;}
    const warn=distance>=WARN_DISTANCE&&!this.distanceWarned;
    this.distanceWarned=distance>=WARN_DISTANCE;
    const travel=Math.min(dt*FOLLOW_SPEED,distance-GAP);
    if(travel<=0)return;
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
    if(room==='street'&&!this.atRiver&&onRiver(this))this.atRiver=true;
    if(warn)return 'HEY! WAIT FOR ME!';
  }
  // Off the river, the player must stay between the pub's block and the river.
  strayed(player){
    const bx=block(player.x),bz=block(player.z);
    return Math.abs(bx-this.pubBlock.x)>=LATERAL_LIMIT||(bz-this.pubBlock.z)*this.riverDirection<0;
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
    this.walkTime+=distance/SPEED;
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
  // She turns and walks away: to the pub door, or back the way she came.
  leave(){
    this.state='leaving';this.leaveTime=LEAVE_TIME;
    if(this.room==='pub'){
      const route=pubRoute({x:this.x,z:this.z},entrance,null);
      if(!route){this.gone=true;return;}
      this.route=route.map(p=>({x:p.x,z:p.z,ground:0}));
    }else this.route=this.history.slice().reverse();
    if(!this.route.length)this.gone=true;
  }
  // The player goes out through the pub door: she comes along if close enough.
  goOutside(player,street,ground=0){
    if(this.gone)return;
    if(this.room!=='pub'||!this.isFollowing(player)){this.gone=true;return;}
    Object.assign(this,{room:'street',x:street.x,z:street.z,ground,route:[],history:[],distanceWarned:false,inDoorway:true});
  }
}
