// SPDX-License-Identifier: AGPL-3.0-only
import {SHOE_COLORS} from './sprites.js?v=bumps-1';

export const MAGIC_BOOT={id:'magic-boot',name:'MAGIC BOOT',description:"THIS BOOT APPEARS TO BE MAGIC. BUT IT'S HARD TO TELL WHAT IT MIGHT DO."};

// Origin is the centre of the sole at floor level.
export function drawMagicBoot({x,z,ground=0},box,side=1){
  const shaftZ=z+(side<0?-.14:-.04);
  box(x-.095,ground+.08,shaftZ,.19,.27,.19,SHOE_COLORS[3]);
  box(x-.11,ground,z-.15,.22,.12,.3,SHOE_COLORS[3]);
  box(x-.05,ground+.13,shaftZ-.006,.035,.16,.012,'#363340');
}
