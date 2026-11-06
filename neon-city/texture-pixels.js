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

// Textures are immutable after painting. Weak keys let their pixels be reclaimed
// when the owning texture is no longer used by the city or either renderer.
const pixels=new WeakMap();
export function texturePixels(texture){
  if(!pixels.has(texture))pixels.set(texture,texture.getContext('2d').getImageData(0,0,texture.width,texture.height));
  return pixels.get(texture);
}

// One readback per idle callback keeps sitting down from reading every wall
// at once. Cancelling releases queued textures, but preserves cached pixels.
export function createTexturePrewarmer(
  schedule=callback=>globalThis.requestIdleCallback?
    globalThis.requestIdleCallback(callback,{timeout:1000}):setTimeout(callback,32),
  cancel=handle=>globalThis.cancelIdleCallback?globalThis.cancelIdleCallback(handle):clearTimeout(handle)
){
  const pending=new Set();
  let handle=null;
  function next(){
    handle=null;
    const texture=pending.values().next().value;
    if(texture){pending.delete(texture);texturePixels(texture);}
    if(pending.size)handle=schedule(next);
  }
  return {
    add(texture){
      if(pixels.has(texture))return;
      pending.add(texture);
      if(handle===null)handle=schedule(next);
    },
    cancel(){
      if(handle!==null)cancel(handle);
      handle=null;pending.clear();
    }
  };
}
