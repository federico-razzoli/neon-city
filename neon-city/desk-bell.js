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

// A brass service bell: a struck note with inharmonic partials, the higher
// ones fading first, so it sounds a bright "dlin" and then rings away.
export const BELL_PARTIALS=[[2200,.1,1.6],[2200*2.76,.044,.8],[2200*5.4,.024,.4],[2200*8.93,.012,.2]];

export function playDeskBell(context){
  if(context?.state!=='running')return;
  const now=context.currentTime;
  for(const [frequency,level,ring] of BELL_PARTIALS){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(level,now+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,now+ring);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(now);oscillator.stop(now+ring+.02);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
