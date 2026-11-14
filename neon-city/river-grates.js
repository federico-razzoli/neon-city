// SPDX-License-Identifier: AGPL-3.0-only
import {Box3,Vector3,Raycaster} from './vendor/three/three.module.js';
import {BLOCK,RIVER_ROWS,RIVER_WALK_HEIGHT,hasBridge} from './world.js';

export const RIVER_GRATE={width:1.8,height:-1.4-RIVER_WALK_HEIGHT,depth:.12};
export const RIVER_GRATE_MESSAGE='THIS LOOKS ANCIENT, MYSTERIOUS AND SCARY...';

const raycaster=new Raycaster(),bounds=new Box3(),hit=new Vector3();
// Gameplay +Z maps to rendered -Z. Target the full door opening, so looking
// between the iron members still counts as looking into the doorway.
export function riverGrateTarget(player){
  if(!player.riverWalk||player.riverFall)return null;
  const street=Math.round(player.x/BLOCK);
  if(!hasBridge(street))return null;
  const pitch=player.pitch??0;
  raycaster.set(new Vector3(player.x,RIVER_WALK_HEIGHT+1.65,-player.z),
    new Vector3(Math.sin(player.angle)*Math.cos(pitch),Math.sin(pitch),-Math.cos(player.angle)*Math.cos(pitch)));
  for(const row of RIVER_ROWS)for(const [bank,dir] of [[row*BLOCK+18,1],[row*BLOCK+110,-1]]){
    const distance=(player.z-bank)*dir;
    if(distance<.4||distance>2.5)continue;
    const center=street*BLOCK,z=-bank+dir*.16;
    bounds.min.set(center-RIVER_GRATE.width/2,RIVER_WALK_HEIGHT,z-.02);
    bounds.max.set(center+RIVER_GRATE.width/2,RIVER_WALK_HEIGHT+RIVER_GRATE.height,z+.02);
    if(raycaster.ray.intersectBox(bounds,hit)&&raycaster.ray.origin.distanceTo(hit)<=2.7)
      return `${street},${row},${dir}`;
  }
  return null;
}

export function facingRiverGrate(player){return riverGrateTarget(player)!==null;}

// Inharmonic, independently decaying modes give an iron impact its clang.
export function playRiverGrateClang(context,random=Math.random){
  if(context?.state!=='running')return null;
  // Choose afresh on each strike; the original frequencies are the high voice.
  const pitch=[.55,.75,1][Math.floor(random()*3)];
  const now=context.currentTime,output=context.createGain(),nodes=[];let live=6;
  output.gain.value=.65;output.connect(context.destination);
  for(const [i,frequency] of [183,307,451,709,1031,1483].entries()){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency*pitch,now);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.18/(1+i*.55),now+.003);
    gain.gain.exponentialRampToValueAtTime(.0001,now+1.8-i*.19);
    oscillator.connect(gain);gain.connect(output);nodes.push(oscillator);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(--live===0)output.disconnect();};
    oscillator.start(now);oscillator.stop(now+2);
  }
  return {stop(){for(const oscillator of nodes)try{oscillator.stop();}catch{}output.disconnect();}};
}

export class RiverGrateClang{
  constructor(play=playRiverGrateClang,random=Math.random){this.play=play;this.random=random;this.target=null;this.remaining=3;this.sound=null;}
  reset(){this.sound?.stop();this.sound=null;this.target=null;this.remaining=3;}
  update(dt,player,context,active=true){
    const target=active&&context?.state==='running'?riverGrateTarget(player):null;
    if(target!==this.target){this.reset();this.target=target;}
    if(!target){this.reset();return;}
    this.remaining-=Math.max(0,dt);
    if(this.remaining>1e-9)return;
    this.sound?.stop();this.sound=this.play(context);
    // No burst of queued clangs after a long frame.
    this.remaining=5+this.random()*3;
  }
}
