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

import {followupFor} from './npc-dialogue.js?v=punk-girl-1';
import {PubConversation} from './pub-life.js?v=npc-followup-1';
import {placeLines} from './world.js?v=lavatory-talk-1';

// A walk away shorter than this keeps the conversation going; a longer one
// starts it again from the first line, like sitting down at a pub table.
export const TALK_MEMORY=5;
// A contact is a walker and where they are: 'river', 'footpath', 'lavatory' or null.
export const talksHere=({walker,place})=>placeLines(walker.type,place).length>0;

// A walker with lines for their place talks to the player who blocks their
// way. They say their first line at once, in place of the bump notice, then
// carry on as a pub conversation does while the player stays in their way.
export class WalkerTalk{
  constructor(random=Math.random){this.random=random;this.walker=null;this.place=null;this.conversation=null;this.apart=0;}
  // SPACE deliberately chooses a nearby speaker in the player's view.
  interact(player,people){
    const target=people.filter(person=>{
      if(!talksHere(person))return false;
      const dx=person.x-player.x,dz=person.z-player.z,distance=Math.hypot(dx,dz);
      return distance>0&&distance<=2.8&&(dx*Math.sin(player.angle)+dz*Math.cos(player.angle))/distance>.75;
    }).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
    if(!target)return null;
    if(target.walker!==this.walker||target.place!==this.place){
      this.walker=target.walker;this.place=target.place;
      this.conversation=new PubConversation(placeLines(target.walker.type,target.place),this.random,undefined,followupFor(target.walker.type,target.place));
    }
    this.apart=0;
    return this.conversation.advance();
  }
  advance(){return this.apart===0?this.conversation?.advance()??null:null;}
  // Contacts are the walkers the player bumped or blocked this frame.
  // Returns the line that is due now, if any.
  update(dt,contacts){
    // Contact ordering must never let a second walker steal a conversation.
    const current=contacts.find(c=>c.walker===this.walker&&talksHere(c));
    const contact=current??(this.walker&&this.apart===0?null:contacts.find(talksHere));
    if(!contact){
      this.apart+=dt;
      if(this.apart>=TALK_MEMORY){this.walker=null;this.place=null;this.conversation=null;}
      return null;
    }
    this.apart=0;
    const {walker,place}=contact;
    if(walker!==this.walker||place!==this.place){
      this.walker=walker;this.place=place;
      this.conversation=new PubConversation(placeLines(walker.type,place),this.random,undefined,followupFor(walker.type,place));
      this.conversation.wait=0;
    }
    return this.conversation.update(dt);
  }
}
