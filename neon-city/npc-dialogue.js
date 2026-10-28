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

const TATTOOED_MAN={
  label:'Talk to the tattooed man',
  script:[
    {ask:'I LIKE YOUR TATTOOS!',answer:['NAH. THEY SUCK.']},
    {ask:'LIFE IS GOOD',answer:['SURE. IF YOU LIKE THINGS THAT SUCK.']},
    {ask:'BYE!',answer:['IT WAS GREAT TALKING TO YOU!'],ends:true},
  ],
  gifts:{
    flower:['THIS FLOWER SUCKS.','IT REALLY DOES.'],
    'pine-cone':['THIS PINE CONE SUCKS.','IT REALLY DOES.'],
  },
};
// The punk girl turns down whatever she is offered, in every place.
const PUNK_GIRL_GIFTS={any:['THIS IS NOT A TICKET FOR THE RADIOACTIVE COWS SHOW!','FIND ME ONE, IF YOU WANT TO MARRY ME.']};
const PUNK_GIRL={
  pub:{
    label:'Talk to the punk girl',
    script:[
      {ask:"WHAT'S YOUR FAVOURITE GENRE?",answer:['POLKA METAL!','BUT I ALSO LIKE TRIBAL TANGO.','AND PROGRESSIVE LOUNGE.']},
      {ask:"WHAT'S YOUR FAVOURITE ALBUM?",answer:['"CONTAMINATING THE FARM", BY THE RADIOACTIVE COWS.']},
      {ask:"WHAT'S YOUR FAVOURITE SONG?",answer:['THE PURPLE COW.']},
      {ask:'BYE!',answer:['MOO-BYE!'],ends:true},
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
  river:{
    label:'Talk to the punk girl',
    script:[
      [{ask:'I LOVE BLACK RIVER.',answer:['I LOVE IT, TOO.',"I WONDER IF IT'S RADIOACTIVE?"],next:1},
        {ask:'DO YOU COME HERE OFTEN?',answer:['YEAH. THIS PLACE IS SPECIAL.']},
        {ask:'BYE!',answer:['MOO-MOO-BYE!'],ends:true}],
      [{ask:"I DON'T THINK SO.",answer:["OH, WELL. IT'S STILL BEAUTIFUL."],next:0}],
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
  footpath:{
    label:'Talk to the punk girl',
    script:[
      {ask:'DO YOU LIKE THIS PARK?',answer:["YEAH. IT'S A BIT SMALL, THOUGH."]},
      {ask:'BYE!',answer:['MOO-MOO-BYE!'],ends:true},
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
};
// The interactive conversation each character opens, by place, once their
// place-specific lines are over.
const FOLLOWUPS={
  3:PUNK_GIRL,
  5:{pub:TATTOOED_MAN,river:TATTOOED_MAN,footpath:TATTOOED_MAN},
};
export const followupFor=(type,place)=>FOLLOWUPS[type]?.[place]??null;
