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

import {MAGIC_BOOT} from './magic-boot.js';

const TATTOOED_MAN={
  label:'Talk to the tattooed man',
  script:[
    {ask:'I LIKE YOUR TATTOOS!',answer:['NAH. THEY SUCK.']},
    {ask:'LIFE IS GOOD',answer:['SURE. IF YOU LIKE THINGS THAT SUCK.']},
    {ask:'BYE!',answer:['IT WAS GREAT TALKING TO YOU!'],ends:true},
  ],
  gifts:{
    'pastis-bottle':["PASTIS SUCKS. BUT I'D BE HAPPY TO ACCEPT SOME BEER."],
    flower:['THIS FLOWER SUCKS.','IT REALLY DOES.'],
    'pine-cone':['THIS PINE CONE SUCKS.','IT REALLY DOES.'],
  },
};
const PROMISE={
  ask:'DO YOU REMEMBER YOUR PROMISE?',needs:'PUNK_GIRL_HAS_TICKET',unless:'MAGIC_BOOT_RECEIVED',
  answer:[{say:'WELL... YES... BUT...',gives:MAGIC_BOOT,sets:'MAGIC_BOOT_RECEIVED'}, "LISTEN, I'M TOO YOUNG TO MARRY YOU.",
    'COME BACK IN TEN YEARS, OK?',
    'IN THE MEANWHILE, I CAN GIVE YOU THIS.'],
};
const PUNK_GIRL_GIFTS={
  ticket:{accept:true,answer:[{say:"IS THIS... IS THIS... OH SH*T, I CAN'T BELIEVE IT!",sets:'PUNK_GIRL_HAS_TICKET'},
    "I'LL GO TO THE RADIOACTIVE COWS SHOW TOMORROW!",'THANK YOU, THANK YOU, THANK YOU!']},
  any:record=>'RADIOACTIVE_COWS_TICKET_MENTIONED' in record&&!record.PUNK_GIRL_HAS_TICKET
    ?['THIS IS NOT A TICKET FOR THE RADIOACTIVE COWS SHOW!','FIND ME ONE, IF YOU WANT TO MARRY ME.']
    :['THANKS BUT NO THANKS.'],
};
const PUNK_GIRL={
  pub:{
    label:'Talk to the punk girl',
    script:[
      {ask:"WHAT'S YOUR FAVOURITE GENRE?",answer:['POLKA METAL!','BUT I ALSO LIKE TRIBAL TANGO.','AND PROGRESSIVE LOUNGE.']},
      {ask:"WHAT'S YOUR FAVOURITE ALBUM?",answer:['"CONTAMINATING THE FARM", BY THE RADIOACTIVE COWS.']},
      {ask:"WHAT'S YOUR FAVOURITE SONG?",answer:['THE PURPLE COW.']},
      PROMISE,
      {ask:'BYE!',answer:['MOO-BYE!'],ends:true},
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
  river:{
    label:'Talk to the punk girl',
    script:[
      [{ask:'I LOVE BLACK RIVER.',answer:['I LOVE IT, TOO.',"I WONDER IF IT'S RADIOACTIVE?"],next:1},
        {ask:'DO YOU COME HERE OFTEN?',answer:['YEAH. THIS PLACE IS SPECIAL.']},
        PROMISE,
      {ask:'BYE!',answer:['MOO-MOO-BYE!'],ends:true}],
      [{ask:"I DON'T THINK SO.",answer:["OH, WELL. IT'S STILL BEAUTIFUL."],next:0}],
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
  footpath:{
    label:'Talk to the punk girl',
    script:[
      {ask:'DO YOU LIKE THIS PARK?',answer:["YEAH. IT'S A BIT SMALL, THOUGH."]},
      PROMISE,
      {ask:'BYE!',answer:['MOO-MOO-BYE!'],ends:true},
    ],
    gifts:PUNK_GIRL_GIFTS,
  },
};
// The interactive conversation each character opens, by place, once their
// place-specific lines are over.
const LAVATORY_ROBOT={
  label:'Talk to the robot',
  script:[
    {ask:'BUT HOW DO YOU PEE?',answer:["THAT'S A PRIVATE QUESTION."]},
    {ask:'YOU SAID... LADYBUGS?',answer:['YES. THE HIGHEST FORM OF LIFE IN YOUR GALAXY!']},
    {ask:'HAVE YOU SEEN OR HEARD ANYTHING UNUSUAL IN THE TOILET?',needs:'PUB_PARANORMAL_ACTIVITIES',answer:[
      'YES. A WEIRD GIRL SINGING A WEIRD SONG IN A CUBICLE.',
      "I DIDN'T GET EVERY WORD, BUT IT WAS ABOUT...",
      'A COW, I THINK.',
    ]},
    {ask:'BYE!',answer:['BYE!'],ends:true},
  ],
};
const FOLLOWUPS={
  11:{lavatory:LAVATORY_ROBOT},
  3:PUNK_GIRL,
  5:{pub:TATTOOED_MAN,river:TATTOOED_MAN,footpath:TATTOOED_MAN},
};
export const followupFor=(type,place)=>FOLLOWUPS[type]?.[place]??null;
