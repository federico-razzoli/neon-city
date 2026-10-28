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

export function onManhole(player,chunks){
  for(const chunk of chunks)for(const cover of chunk.manholes){
    if(Math.hypot(player.x-cover.x,player.z-cover.z)<=cover.radius+2.25)return true;
  }
  return false;
}

export class CoverAttempt {
  constructor(){this.lastAttempt=-Infinity;}
  try(player,chunks,now,repeat=false){
    if(repeat&&now-this.lastAttempt<1.2)return false;
    if(!onManhole(player,chunks))return false;
    this.lastAttempt=now;
    return true;
  }
}

const buffers=new WeakMap();
export function loadCoverGrunt(context){
  if(!context)return Promise.resolve(null);
  if(!buffers.has(context)){
    const loading=fetch(new URL('./assets/effort-grunt.wav?v=lifting-3',import.meta.url))
      .then(response=>{if(!response.ok)throw new Error('Grunt unavailable');return response.arrayBuffer();})
      .then(data=>context.decodeAudioData(data))
      .catch(()=>{buffers.delete(context);return null;});
    buffers.set(context,loading);
  }
  return buffers.get(context);
}

export async function playCoverGrunt(context){
  if(context?.state!=='running')return;
  const buffer=await loadCoverGrunt(context);
  if(!buffer||context.state!=='running')return;
  const source=context.createBufferSource();source.buffer=buffer;
  source.connect(context.destination);source.start();
  source.onended=()=>source.disconnect();
}
