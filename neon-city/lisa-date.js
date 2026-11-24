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

import {BLOCK,RIVER_ROWS,isRiverRow} from './world.js?v=start-pub-1';
import {PUB,pubChairs} from './pub-interior.js?v=bar-taps-1';
import {pubRoute} from './pub-life.js?v=npc-followup-1';

import {PlayerFollower,STREET_CLEARANCE} from './player-follower.js';

// Lisa, the tall girl, walking with the player to Night River.
export const LISA_TYPE=15;
const SPEED=1.3,WARN_DISTANCE=16,REACH=20,LEAVE_TIME=12;
const LATERAL_LIMIT=3;
const entrance={x:PUB.door.x,z:.4};
const block=v=>Math.floor(v/BLOCK);
const onRiver=p=>isRiverRow(block(p.z));
const centre=c=>({x:c.x+c.w/2,z:c.z+c.d/2});

// States: seated (agreed, waiting for the player to stand), following,
// waiting (at the river, while the player is on other streets), leaving.
// Gone once she has walked off; she may then turn up in a pub again.
export class LisaDate extends PlayerFollower{
  constructor({tableIndex,seat,variant,pubBlock,spawn}){
    const chair=spawn?null:pubChairs().find(c=>c.tableIndex===tableIndex&&c.seat===seat);
    super({type:LISA_TYPE,variant,...(spawn??{room:'pub',...centre(chair),chair,facingZ:-chair.side})});
    Object.assign(this,{pubBlock,state:spawn?'following':'seated',distanceWarned:false,atRiver:spawn?.room==='street'&&onRiver(spawn),gone:false,leaveTime:0});
    // 1 when the nearest river lies at greater z than the pub's block, else -1.
    this.riverDirection=Math.sign(RIVER_ROWS.reduce((a,b)=>Math.abs(b+.5-pubBlock.z)<Math.abs(a+.5-pubBlock.z)?b:a)+.5-pubBlock.z);
  }
  get benchDialogue(){return ['THIS PLACE IS BEAUTIFUL...', "AND YOU'RE SO FUNNY!"];}
  isFollowing(player){return !this.gone&&this.state==='following'&&Math.hypot(player.x-this.x,player.z-this.z)<=REACH;}
  get visible(){return !this.gone&&this.state!=='seated'&&!this.inDoorway;}
  // Room is 'pub', 'street' or anything else (a place she won't go).
  update(dt,{room,moveIndoors,player,seated,bench,ground=0,patrons,city}){
    if(this.gone)return;
    // Waiting at the river, she stays there wherever the player goes.
    if(room!==this.room){if(this.state!=='waiting')this.gone=true;return;}
    if(room!=='street'&&room!=='pub'){
      const dx=player.x-this.x,dz=player.z-this.z,distance=Math.hypot(dx,dz);
      if(distance>1.6){
        const step=Math.min(dt*4,distance-1.6)/distance;
        moveIndoors(this,dx*step,dz*step);
      }
      return;
    }
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
    if(this.inDoorway){if(distance<STREET_CLEARANCE)return;this.inDoorway=false;}
    if(this.benchSeated){this.updateBench(dt,bench,player,city,ground);return;}
    const playerOff=this.atRiver&&!onRiver(player);
    if(playerOff){this.state='waiting';this.distanceWarned=false;return;}
    if(this.state==='waiting'){
      if(distance>REACH)return;
      this.state='following';
    }
    if(distance>REACH||room==='street'&&!this.atRiver&&!onRiver(player)&&this.strayed(player)){this.leave();return;}
    const warn=distance>=WARN_DISTANCE&&!this.distanceWarned;
    this.distanceWarned=distance>=WARN_DISTANCE;
    if(!this.followPlayer(dt,{player,city,ground,bench}))return;
    if(room==='street'&&!this.atRiver&&onRiver(this))this.atRiver=true;
    if(warn)return 'HEY! WAIT FOR ME!';
  }
  // Off the river, the player must stay between the pub's block and the river.
  strayed(player){
    const bx=block(player.x),bz=block(player.z);
    return Math.abs(bx-this.pubBlock.x)>=LATERAL_LIMIT||(bz-this.pubBlock.z)*this.riverDirection<0;
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
