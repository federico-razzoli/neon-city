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

import {BLOCK,RIVER_WALK_WIDTH,RIVER_STAIRS,isRiverRow,riverWalkPosition,groundHeight,hasBridge,vanAtStreetPosition} from './world.js?v=start-pub-1';
import {ICE_CREAM_VAN,iceCreamVanFloor} from './ice-cream-vans.js';
import {facingRiverGrate} from './river-grates.js';
import {PUB,pubChairs} from './pub-interior.js?v=bar-taps-1';
import {pubRoute} from './pub-life.js?v=npc-followup-1';

import {PlayerFollower,STREET_CLEARANCE} from './player-follower.js';

const choose=lines=>lines[Math.floor(Math.random()*lines.length)];
const railLines=["LOOK! A SHOOTING STAR!","THANKS FOR COMING HERE WITH ME."];
const waterLines=["IF YOU PAY ATTENTION, YOU CAN SEE SOME FISHES.","DID YOU KNOW THAT THIS WATER IS ALWAYS WARM?"];
const bridgeLines=["HOW BEAUTIFUL...","SOME SAY NIGHT RIVER IS ENDLESS.","SHALL WE GO DOWN?"];
const gateLines=["I HEAR STRANGE NOISES...","I SEE STRANGE LIGHTS...","THIS ANCIENT GATE GIVES ME THE FEAR..."];

// Lisa, the tall girl, walking with the player to Night River.
export const LISA_TYPE=15;
const SPEED=1.3,WARN_DISTANCE=16,REACH=20,LEAVE_TIME=12;
const entrance={x:PUB.door.x,z:.4};
const block=v=>Math.floor(v/BLOCK);
const onRiver=p=>isRiverRow(block(p.z));
const centre=c=>({x:c.x+c.w/2,z:c.z+c.d/2});

// States: seated (agreed, waiting for the player to stand), following, leaving.
// Gone once she has walked off; she may then turn up in a pub again.
export class LisaDate extends PlayerFollower{
  constructor({tableIndex,seat,variant,spawn}){
    const chair=spawn?null:pubChairs().find(c=>c.tableIndex===tableIndex&&c.seat===seat);
    super({type:LISA_TYPE,variant,...(spawn??{room:'pub',...centre(chair),chair,facingZ:-chair.side})});
    Object.assign(this,{state:spawn?'following':'seated',distanceWarned:false,atRiver:spawn?.room==='street'&&onRiver(spawn),gone:false,leaveTime:0});
  }
  get benchDialogue(){return ['THIS PLACE IS BEAUTIFUL...', "AND YOU'RE SO FUNNY!"];}
  sharedViewReply({player}){
    if(this.room==='street'&&facingRiverGrate(player))return choose(gateLines);
  }
  standingReply({player,city}){
    const bank=this.room==='street'&&riverWalkPosition(player.x,player.z);
    if(bank){
      const van=vanAtStreetPosition(city,player);
      if(van&&iceCreamVanFloor(van,player)===ICE_CREAM_VAN.floor)return "WE SHOULDN'T BE HERE...";
      // The player can turn toward Lisa while she is still facing the gate.
      if(this.riverWalk&&facingRiverGrate({...this,angle:Math.atan2(this.facingX,this.facingZ)}))return choose(gateLines);
      if(player.riverWalk){
        if(Math.abs(bank.d-RIVER_WALK_WIDTH)<=2)return choose(waterLines);
      }else{
        if(groundHeight(player.x,player.z)>0)return choose(bridgeLines);
        const street=block(player.x);
        if(Math.abs(bank.d)<=2&&(!hasBridge(street)||bank.lx>=RIVER_STAIRS.start)&&
          (!hasBridge(street+1)||bank.lx<=BLOCK-14))return choose(railLines);
      }
    }
    return super.standingReply({player,city});
  }
  isFollowing(player){return !this.gone&&this.state==='following'&&Math.hypot(player.x-this.x,player.z-this.z)<REACH;}
  get visible(){return !this.gone&&this.state!=='seated'&&!this.inDoorway;}
  // Room is 'pub', 'street' or anything else (a place she won't go).
  update(dt,{room,moveIndoors,player,seated,bench,gate,ground=0,patrons,city}){
    if(this.gone)return;
    if(room!==this.room){this.gone=true;return;}
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
    if(distance>=REACH){
      this.benchVisit=null;
      this.leave();
      return;
    }
    const warn=distance>WARN_DISTANCE&&!this.distanceWarned;
    this.distanceWarned=distance>WARN_DISTANCE;
    if(this.benchSeated)this.updateBench(dt,bench,player,city,ground);
    else if(!(room==='street'&&this.atRiver&&!onRiver(player))){
      this.followPlayer(dt,{player,city,ground,bench,gate});
      if(room==='street'&&!this.atRiver&&onRiver(this))this.atRiver=true;
    }
    if(warn)return 'HEY! WAIT FOR ME!';
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
