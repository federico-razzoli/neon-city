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
