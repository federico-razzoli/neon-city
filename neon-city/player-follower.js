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

import {iceCreamView} from './carried-ice-cream.js';
import {groundHeight,BLOCK,isRiverRow,RIVER_STAIRS,RIVER_WALK_HEIGHT,hasRiverStairs,riverWalkPosition,streetFloorHeight,vanAtStreetPosition} from './world.js?v=start-pub-1';
import {ICE_CREAM_VAN,iceCreamVanFloor,iceCreamVanLocal} from './ice-cream-vans.js';
import {RIVER_GRATE} from './river-grates.js';
import {PUB,behindBar} from './pub-interior.js?v=bar-taps-1';
import {pubRoute} from './pub-life.js?v=npc-followup-1';

const BENCH_DELAY=2;
const WALK_SPEED=1.3,FOLLOW_SPEED=4,GAP=1.6,ROUTE_INTERVAL=.25,HISTORY=240;
export const STREET_CLEARANCE=1.3;
const CLEARANCE={street:STREET_CLEARANCE,pub:.85};

const WARN_DISTANCE=16,LEAVE_DISTANCE=20,LEAVE_TIME=12;
const onRiver=z=>isRiverRow(Math.floor(z/BLOCK));

// Pass a chair when starting in a pub seat so pubRoute can plan a way out.
export class PlayerFollower{
  constructor({type,variant=0,room,x,z,ground=0,chair=null,facingX=0,facingZ=1,allowedRooms=['street']}){
    Object.assign(this,{type,variant,room,x,z,ground,chair,facingX,facingZ,
      allowedRooms,state:chair?'seated':'following',gone:false,distanceWarned:false,
      atRiver:room==='street'&&onRiver(z),benchVisit:null,route:[],history:[],routeTimer:0,pushTime:0,walkTime:0});
  }
  get visible(){return !this.gone&&this.state!=='seated'&&!this.inDoorway;}
  isFollowing(player){
    return !this.gone&&this.state==='following'&&Math.hypot(player.x-this.x,player.z-this.z)<LEAVE_DISTANCE;
  }
  // Subclasses can also use the venue when deciding whether to cross a door.
  canEnter(room,venue){return this.allowedRooms.includes(room);}
  enterRoom(room,venue,previousPlayer,player,ground,stairs){
    if(!this.canEnter(room,venue)||!this.isFollowing(previousPlayer)){this.gone=true;return;}
    Object.assign(this,{room,x:player.x,z:player.z,ground,chair:null,stairs,
      entryDoor:{x:player.x,z:player.z},
      route:[],history:[],benchVisit:null,riverStairs:null,riverWalk:false,gateSide:0,
      routeTimer:0,pushTime:0,distanceWarned:false,inDoorway:true});
    if(room==='street'&&onRiver(this.z))this.atRiver=true;
  }
  update(dt,context){
    const {room,player,seated,patrons,bench,city,ground=0,door,moveIndoors}=context;
    if(this.gone)return;
    if(room!==this.room){this.gone=true;return;}
    if(this.state==='seated'){
      if(seated)return;
      patrons[this.chair.tableIndex][this.chair.seat]=null;
      this.state='following';
    }
    if(this.state==='leaving'){
      const travel=WALK_SPEED*Math.min(dt,this.leaveTime);
      this.leaveTime-=dt;
      if(room==='street'||room==='pub')this.walkRoute(travel,player,ground);
      else{
        const target=this.route[0],dx=target.x-this.x,dz=target.z-this.z;
        const distance=Math.hypot(dx,dz);
        if(distance>.04){
          const step=Math.min(1,travel/distance);
          moveIndoors(this,dx*step,dz*step);
        }
        if(Math.hypot(target.x-this.x,target.z-this.z)<=.04)this.route.shift();
      }
      if(!this.route.length||this.leaveTime<=0)this.gone=true;
      return;
    }
    const distance=Math.hypot(player.x-this.x,player.z-this.z);
    if(this.inDoorway){
      if(distance<(CLEARANCE[room]??.85))return;
      this.inDoorway=false;
    }
    if(distance>=LEAVE_DISTANCE){
      this.benchVisit=null;
      this.state='leaving';this.leaveTime=LEAVE_TIME;
      if(room==='street')this.route=this.history.slice().reverse();
      else if(room==='pub')this.route=pubRoute(this,{x:PUB.door.x,z:.4},this.chair)??[];
      else this.route=[this.entryDoor??door];
      if(!this.route.length)this.gone=true;
      return;
    }
    const warn=distance>WARN_DISTANCE&&!this.distanceWarned;
    this.distanceWarned=distance>WARN_DISTANCE;
    if(this.benchSeated)this.updateBench(dt,bench,player,city,ground);
    else if(room!=='street'||!this.atRiver||onRiver(player.z)){
      this.followPlayer(dt,context);
      if(room==='street'&&onRiver(this.z))this.atRiver=true;
    }
    if(warn)return 'HEY! WAIT FOR ME!';
  }
  standingReply({player}){
    if(this.room==='pub'&&behindBar(player)&&behindBar(this))return "WE SHOULDN'T BE HERE...";
    return "GO AHEAD. I'LL FOLLOW YOU.";
  }
  // Rendering data for a street pedestrian card.
  get benchSeated(){return this.benchVisit?.seated===true;}
  view(){return {...iceCreamView(this),seated:this.benchSeated,x:this.x,z:this.z,ground:this.ground,type:this.type,variant:this.variant,facingX:this.facingX,facingZ:this.facingZ,frame:Math.floor(this.walkTime*WALK_SPEED*5)%4};}
  // Where she stands, for collisions; below street level means the lower path.
  // As walker, she is a bumped person without lines for the place.
  body(){return {...this.view(),riverWalk:this.riverWalk,walker:this,place:null};}
  // A bench faces away from its normal. Approach the vacant end from the path.
  updateBench(dt,bench,player,city,ground){
    let visit=this.benchVisit;
    if(visit?.seated){
      if(visit.bench===bench){visit.elapsed=0;return true;}
      visit.elapsed+=dt;
      if(visit.elapsed>=BENCH_DELAY){
        this.x=visit.front.x;this.z=visit.front.z;
        this.benchVisit=null;
      }
      return true;
    }
    if(!bench){this.benchVisit=null;return false;}
    if(bench!==visit?.bench){
      const side=(player.x-bench.x)*bench.tx+(player.z-bench.z)*bench.tz>0?-.5:.5;
      const seat={x:bench.x+side*bench.tx,z:bench.z+side*bench.tz};
      const front={x:seat.x-bench.nx,z:seat.z-bench.nz};
      visit=this.benchVisit={bench,seat,front,elapsed:0,seated:false};
    }
    let target=visit.front;
    const u=(this.x-bench.x)*bench.tx+(this.z-bench.z)*bench.tz;
    const v=(this.x-bench.x)*bench.nx+(this.z-bench.z)*bench.nz;
    // Walk around the nearest armrest when approaching from the back.
    if(v>-.85){
      const end=u<0?-1.8:1.8;
      const depth=v>0&&Math.abs(u)<1.65?Math.max(v,1):-1;
      target={x:bench.x+end*bench.tx+depth*bench.nx,z:bench.z+end*bench.tz+depth*bench.nz};
    }
    const dx=target.x-this.x,dz=target.z-this.z,distance=Math.hypot(dx,dz);
    if(distance>.04){
      visit.elapsed=0;
      const step=Math.min(dt*FOLLOW_SPEED/distance,1);
      this.moveOnStreet(city,dx*step,dz*step);
    }else if(target===visit.front&&Math.abs(this.ground-ground)<.5){
      this.facingX=-bench.nx;this.facingZ=-bench.nz;
      visit.elapsed+=dt;
      if(visit.elapsed>=BENCH_DELAY){
        Object.assign(this,visit.seat);
        visit.seated=true;visit.elapsed=0;
      }
    }
    return true;
  }
  climbRiverStairs(dt,player,city,here){
    if(!this.riverStairs?.ascending){
      // The player exits at the landing. Keep that staircase as the target
      // even if they immediately turn away on the upper promenade.
      const block=Math.floor((player.x-RIVER_STAIRS.landing)/BLOCK);
      const base=[block,block+1,block-1].map(b=>b*BLOCK).find(hasRiverStairs);
      const toe=base+RIVER_STAIRS.end+.6;
      const lane=here.bank+here.dir*RIVER_STAIRS.width/2;
      const approach=[];
      const onTreads=this.x>=base+RIVER_STAIRS.landing&&this.x<toe&&here.d<=RIVER_STAIRS.width;
      if(!onTreads){
        const outside=here.bank+here.dir*(RIVER_STAIRS.width+.7);
        approach.push({x:this.x,z:outside},{x:toe,z:outside},{x:toe,z:lane});
      }else approach.push({x:this.x,z:lane});
      this.riverStairs={ascending:true,base,lane,approach,bank:here.bank,dir:here.dir};
    }
    const {base,lane,approach}=this.riverStairs;
    const landing=base+(RIVER_STAIRS.landing+RIVER_STAIRS.start)/2;
    let target=approach[0],gap=0;
    if(!this.riverWalk){
      // Crossing the bank changes layers before the actor clears the railing.
      // Finish the exit inland, then round the end of the rail onto the deck.
      const {bank,dir}=this.riverStairs;
      const inland=bank-dir;
      if((this.z-inland)*dir>.04)target={x:landing,z:inland};
      else if(player.x<base+RIVER_STAIRS.landing&&
        this.x>base+RIVER_STAIRS.landing-1+.04)
        target={x:base+RIVER_STAIRS.landing-1,z:inland};
      else{this.riverStairs=null;return false;}
    }else if(!target){
      if(player.riverWalk){
        target={x:player.x,z:lane};gap=GAP;
      }else if(Math.abs(this.x-landing)>.04)target={x:landing,z:lane};
      else target={x:landing,z:here.bank-here.dir};
    }
    const dx=target.x-this.x,dz=target.z-this.z,distance=Math.hypot(dx,dz);
    if(distance<=.04){if(approach.length)approach.shift();return true;}
    const step=Math.min(dt*FOLLOW_SPEED,Math.max(0,distance-gap))/distance;
    if(step>0)this.moveOnStreet(city,dx*step,dz*step);
    return true;
  }
  // Enter through the upper landing. Stay on the treads even when the player
  // cuts across their open side and lands directly on the lower path.
  followRiverStairs(dt,player,city){
    const at=riverWalkPosition(player.x,player.z);
    const here=riverWalkPosition(this.x,this.z);
    const playerClimbing=player.riverWalk&&at&&hasRiverStairs(player.x)&&
      at.lx>=RIVER_STAIRS.landing&&at.lx<RIVER_STAIRS.end&&at.d<=RIVER_STAIRS.width&&
      (this.riverStairs?.ascending||groundHeight(player.x,player.z,true)>this.ground+.01);
    const finishingAscent=!player.riverWalk&&(this.riverWalk||this.riverStairs?.ascending);
    if(here&&(finishingAscent||this.riverWalk&&playerClimbing))
      return this.climbRiverStairs(dt,player,city,here);
    if(!player.riverWalk||this.riverStairs?.ascending)this.riverStairs=null;
    if(!player.riverWalk||!at)return false;
    if(!this.riverStairs){
      if(this.riverWalk&&this.ground<=RIVER_WALK_HEIGHT+.01)return false;
      // Use the staircase the companion is on, or the one nearest the player.
      const reference=this.riverWalk?this.x:player.x;
      const block=Math.floor(reference/BLOCK);
      const bases=[block-1,block,block+1].map(b=>b*BLOCK).filter(hasRiverStairs);
      const base=bases[0];
      const landing=base+(RIVER_STAIRS.landing+RIVER_STAIRS.start)/2;
      const lane=at.bank+at.dir*RIVER_STAIRS.width/2;
      const approach=[];
      if(!this.riverWalk){
        const inland=at.bank-at.dir;
        if(here&&here.d>0)approach.push({x:this.x,z:inland});
        approach.push({x:landing,z:inland},{x:landing,z:lane});
      }
      this.riverStairs={base,lane,approach};
    }
    const {base,lane,approach}=this.riverStairs;
    const toe=base+RIVER_STAIRS.end+.5;
    const rear=base+RIVER_STAIRS.landing-.6;
    let target=approach[0],gap=0;
    if(!target){
      const playerOnTreads=player.x>=base+RIVER_STAIRS.landing&&player.x<toe&&at.d<=RIVER_STAIRS.width;
      if(playerOnTreads){
        target={x:player.x,z:lane};gap=GAP;
      }else if(!this.riverStairs.pastToe&&this.x<toe-.04){
        target={x:toe,z:lane};
      }else if(player.x<toe&&(at.d>RIVER_STAIRS.width||player.x<rear)){
        this.riverStairs.pastToe=true;
        const outside=at.bank+at.dir*(RIVER_STAIRS.width+.6);
        if(here.d<RIVER_STAIRS.width+.5&&this.x>rear+.04)target={x:this.x,z:outside};
        else if(player.x<rear&&this.x>rear+.04)target={x:rear,z:outside};
        else{this.riverStairs=null;return false;}
      }else{
        this.riverStairs=null;return false;
      }
    }
    const dx=target.x-this.x,dz=target.z-this.z,distance=Math.hypot(dx,dz);
    if(distance<=.04){if(approach.length)approach.shift();return true;}
    const step=Math.min(dt*FOLLOW_SPEED,Math.max(0,distance-gap))/distance;
    if(step>0)this.moveOnStreet(city,dx*step,dz*step);
    return true;
  }
  joinAtGate(dt,player,city,gate){
    // Choose a place alongside the player that still faces the opening.
    // Keep the chosen side until the player leaves too little room there.
    const edge=RIVER_GRATE.width/2-.1;
    const offset=player.x-gate.x;
    if(!this.gateSide)this.gateSide=this.x<player.x?-1:1;
    if(offset*this.gateSide>.15)this.gateSide=-Math.sign(offset);
    const beside=Math.max(-edge,Math.min(edge,offset+this.gateSide*STREET_CLEARANCE));
    const playerDepth=(player.z-gate.bank)*gate.dir;
    const depth=Math.max(.55,Math.min(.85,playerDepth));
    let targetX=gate.x+beside,targetZ=gate.bank+depth*gate.dir;
    // When crossing from the other side, pass behind the player first.
    // Re-evaluate from the actual positions, including after a shove.
    const lateral=(this.x-player.x)*this.gateSide;
    const behind=(this.z-player.z)*gate.dir;
    if(lateral<0&&behind<STREET_CLEARANCE-.04){
      targetX=this.x;targetZ=player.z+gate.dir*STREET_CLEARANCE;
    }else if(lateral<Math.min(.65,Math.abs(targetX-player.x))-.04&&behind>=STREET_CLEARANCE-.04){
      targetZ=this.z;
    }
    const dx=targetX-this.x,dz=targetZ-this.z;
    const distance=Math.hypot(dx,dz);
    if(distance>.04){
      const step=Math.min(1,dt*FOLLOW_SPEED/distance);
      this.moveOnStreet(city,dx*step,dz*step);
      return;
    }
    const gx=gate.x-this.x,gz=gate.bank-this.z,length=Math.hypot(gx,gz);
    this.facingX=gx/length;this.facingZ=gz/length;
  }
  followIntoVan(dt,player,city){
    const van=vanAtStreetPosition(city,player);
    const boarding=van&&iceCreamVanFloor(van,player)>0;
    const vehicle=boarding?van:vanAtStreetPosition(city,this);
    if(!vehicle||(!boarding&&!iceCreamVanFloor(vehicle,this)))return false;
    const p=iceCreamVanLocal(vehicle,this),rear=ICE_CREAM_VAN.rear;
    const sign=vehicle.first?1:-1;
    // Align behind the open door leaf before walking straight up the ramp.
    const approach=rear-2*ICE_CREAM_VAN.doorHalf-.55;
    let x=p.x,z=0;
    if(!boarding){
      x=approach;
    }else if(p.x>=ICE_CREAM_VAN.front&&p.z<2.75){
      // Clear the nose and any open cab door on the way around to the rear.
      if(p.z<-.32&&p.x<3.5){x=3.55;z=p.z;}
      else z=2.8;
    }else if(p.x>=ICE_CREAM_VAN.front||Math.abs(p.z)>.6&&p.x>approach+.04){
      x=approach;z=p.z;
    }else if(Math.abs(p.z)<=.08){
      const leader=iceCreamVanLocal(vehicle,player);
      x=Math.min(leader.x-GAP,ICE_CREAM_VAN.front-GAP);
    }
    const dx=(x-p.x)*sign,dz=(p.z-z)*sign,distance=Math.hypot(dx,dz);
    if(distance>.04){
      const step=Math.min(1,dt*FOLLOW_SPEED/distance);
      this.moveOnStreet(city,dx*step,dz*step);
    }
    return true;
  }
  followPlayer(dt,{player,city,moveIndoors,ground=0,bench=null,gate=null}){
    if(!gate)this.gateSide=0;
    if(this.room==='street'&&!this.benchSeated&&this.followRiverStairs(dt,player,city))return true;
    if(this.room==='street'&&this.updateBench(dt,bench,player,city,ground))return true;
    if(gate&&this.room==='street'&&this.riverWalk){
      this.joinAtGate(dt,player,city,gate);
      return true;
    }
    if(this.room==='street'&&!this.riverWalk&&this.followIntoVan(dt,player,city))return true;
    const room=this.room,dx=player.x-this.x,dz=player.z-this.z,distance=Math.hypot(dx,dz);
    const travel=Math.min(dt*FOLLOW_SPEED,distance-GAP);
    if(travel<=0)return false;
    if(room==='pub'){
      const target={x:player.x-dx/distance*GAP,z:player.z-dz/distance*GAP};
      this.routeTimer-=dt;
      if(this.routeTimer<=0){
        this.routeTimer=ROUTE_INTERVAL;
        this.route=pubRoute(this,target,this.chair)??pubRoute(this,player,this.chair)??[];
      }
      this.walkRoute(travel,player,ground);
    }else{
      const step=travel/distance;
      if(room==='street')this.moveOnStreet(city,dx*step,dz*step);
      else moveIndoors(this,dx*step,dz*step);
    }
    return true;
  }
  moveOnStreet(city,dx,dz){
    const x=this.x,z=this.z;
    const last=this.history.at(-1);
    if(!last||Math.hypot(x-last.x,z-last.z)>=.25){
      this.history.push({x,z,ground:this.ground});
      if(this.history.length>HISTORY)this.history.shift();
    }
    this.moveWithoutFalling((person,x,z)=>city.move(person,x,z),dx,dz);
    this.ground=streetFloorHeight(city,this);
    this.faceMovement(this.x-x,this.z-z);
  }
  moveWithoutFalling(move,dx,dz){
    const {x,z,riverWalk}=this;
    move(this,dx,dz);
    if(this.riverFall){
      Object.assign(this,{x,z,riverWalk});
      delete this.riverFall;
    }
  }
  yieldToPlayer(dt,pressed,player,move,city){
    if(this.benchVisit)return;
    this.pushTime=pressed?this.pushTime+dt:0;
    if(this.pushTime<.35)return;
    this.pushTime=0;
    const x=this.x,z=this.z,dx=x-player.x,dz=z-player.z,distance=Math.hypot(dx,dz);
    if(!distance)return;
    this.moveWithoutFalling(move,.35*dx/distance,.35*dz/distance);
    this.faceMovement(this.x-x,this.z-z);
    this.routeTimer=0;
    if(this.room==='street'){
      this.ground=streetFloorHeight(city,this);
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
