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

import {register} from './register.js';

export class PassiveConversation{
  constructor(lines,{random=Math.random,record=register,followup=null,loop=!followup,interval=null}={}){
    this.loop=loop;this.interval=interval;this.currentLine=null;this.followup=followup;this.ready=false;this.opened=false;
    this.lines=lines;this.random=random;this.record=record;this.index=0;this.wait=this.delay();
  }
  delay(){return this.interval??(3+this.random()*2);}
  // Returns the line that is due now, if any.
  update(dt){
    if(!this.lines.length||this.ready)return null;
    this.wait-=dt;
    if(this.wait>0)return null;
    return this.advance();
  }
  advance(){
    if(!this.lines.length||this.ready)return null;
    if(this.index===this.lines.length){this.ready=true;this.currentLine=null;return null;}
    this.wait=this.delay();
    const line=this.lines[this.index];
    this.index=this.loop?(this.index+1)%this.lines.length:this.index+1;
    if(line.sets)this.record[line.sets]=true;
    this.currentLine=line.say??line;
    return this.currentLine;
  }
}
