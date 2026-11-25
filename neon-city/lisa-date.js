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

import {randomReply} from './random-reply.js';
import {BLOCK,RIVER_WALK_WIDTH,RIVER_STAIRS,riverWalkPosition,groundHeight,hasBridge,vanAtStreetPosition} from './world.js?v=start-pub-1';
import {ICE_CREAM_VAN,iceCreamVanFloor} from './ice-cream-vans.js';
import {facingRiverGrate} from './river-grates.js';
import {pubChairs} from './pub-interior.js?v=bar-taps-1';

import {register} from './register.js';
import {PlayerFollower} from './player-follower.js';

const iceCreamThanks=[{say:'THANK YOU FOR THIS ICE CREAM!',sets:'LISA_ICE_CREAM'},"YOU'RE SO SWEET..."];
const invitation=[
  'YOU... YOU MAKE ME FEEL NORMAL.',
  'NO, BETTER THAN NORMAL. SPECIAL.',
  'I... YOU... I MEAN...',
  {say:'',heart:true},
  'I WORK AT THE NAVY HOTEL.',
  'MEET ME IN THE ROOM 666.'
];
const railLines=["LOOK! A SHOOTING STAR!","THANKS FOR COMING HERE WITH ME."];
const waterLines=["IF YOU PAY ATTENTION, YOU CAN SEE SOME FISHES.","DID YOU KNOW THAT THIS WATER IS ALWAYS WARM?"];
const bridgeLines=["HOW BEAUTIFUL...","SOME SAY NIGHT RIVER IS ENDLESS.","SHALL WE GO DOWN?"];
const gateLines=["I HEAR STRANGE NOISES...","I SEE STRANGE LIGHTS...","THIS ANCIENT GATE GIVES ME THE FEAR..."];

// Lisa, the tall girl, walking with the player to Night River.
export const LISA_TYPE=15;
const block=v=>Math.floor(v/BLOCK);
const centre=c=>({x:c.x+c.w/2,z:c.z+c.d/2});

export class LisaDate extends PlayerFollower{
  constructor({tableIndex,seat,variant,spawn}){
    const chair=spawn?null:pubChairs().find(c=>c.tableIndex===tableIndex&&c.seat===seat);
    super({type:LISA_TYPE,variant,allowedRooms:['street'],...(spawn??{room:'pub',...centre(chair),chair,facingZ:-chair.side})});
  }
  benchDialogue(){
    const visit=this.benchVisit;
    if(visit.bench.riverWalk&&register.LISA_ICE_CREAM){
      return {lines:invitation,onFinish:()=>{
        // Step out from the bench, then walk along the path away from the player.
        const {bench,front,seat}=visit;
        const side=Math.sign((seat.x-bench.x)*bench.tx+(seat.z-bench.z)*bench.tz);
        const ground=this.ground;
        this.startLeaving([{...front,ground},{x:front.x+6*side*bench.tx,z:front.z+6*side*bench.tz,ground}],4);
      }};
    }
    return {lines:this.iceCream?iceCreamThanks:['THIS PLACE IS BEAUTIFUL...', "AND YOU'RE SO FUNNY!"]};
  }
  sharedViewReply({player}){
    if(!this.iceCream&&this.room==='street'&&facingRiverGrate(player))return randomReply(gateLines);
  }
  standingReply({player,city}){
    if(this.iceCream)return iceCreamThanks;
    const bank=this.room==='street'&&riverWalkPosition(player.x,player.z);
    if(bank){
      const van=vanAtStreetPosition(city,player);
      if(van&&iceCreamVanFloor(van,player)===ICE_CREAM_VAN.floor)return "WE SHOULDN'T BE HERE...";
      // The player can turn toward Lisa while she is still facing the gate.
      if(this.riverWalk&&facingRiverGrate({...this,angle:Math.atan2(this.facingX,this.facingZ)}))return randomReply(gateLines);
      if(player.riverWalk){
        if(Math.abs(bank.d-RIVER_WALK_WIDTH)<=2)return randomReply(waterLines);
      }else{
        if(groundHeight(player.x,player.z)>0)return randomReply(bridgeLines);
        const street=block(player.x);
        if(Math.abs(bank.d)<=2&&(!hasBridge(street)||bank.lx>=RIVER_STAIRS.start)&&
          (!hasBridge(street+1)||bank.lx<=BLOCK-14))return randomReply(railLines);
      }
    }
    return super.standingReply({player,city});
  }
}
