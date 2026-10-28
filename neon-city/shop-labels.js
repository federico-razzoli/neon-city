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

// One deterministic permutation per shop, shared by every facade. Labels are
// assigned by window slot rather than by texture creation or draw order.
export function shopLabels(building,kind,choices){
  let seed=2166136261;
  for(const char of `${kind}:${building.x},${building.z}`)seed=Math.imul(seed^char.charCodeAt(0),16777619);
  const labels=[...choices];
  for(let i=labels.length-1;i>0;i--){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const j=Math.floor(seed/4294967296*(i+1));
    [labels[i],labels[j]]=[labels[j],labels[i]];
  }
  return labels;
}
export function shopWindowLabels(building,kind,choices,side,entrance,bigOnly=[]){
  const labels=shopLabels(building,kind,choices);
  // Reserve the first two slots for small windows without losing uniqueness.
  for(let i=0;i<2;i++)if(bigOnly.includes(labels[i])){
    const replacement=labels.findIndex((label,index)=>index>=2&&!bigOnly.includes(label));
    [labels[i],labels[replacement]]=[labels[replacement],labels[i]];
  }
  if(side===entrance)return labels.slice(0,2);
  const index=[0,1,2,3].filter(s=>s!==entrance).indexOf(side);
  return [labels[2+index]];
}
