// SPDX-License-Identifier: AGPL-3.0-only
// Shop till shared by the Blue Note counters and the bookshop counter. The
// corner (x, z) sits .38 and .275 short of the till's centre; y is the
// countertop. The screen faces the customer side (lower z).
export function drawTill(box,x,y,z){
  box(x,y,z,.76,.17,.55,'#485154');
  box(x+.06,y+.17,z+.24,.64,.30,.18,'#273438');
  box(x+.12,y+.29,z+.23,.52,.12,.025,'#a1c3a1');
}
