// SPDX-License-Identifier: AGPL-3.0-only
import {drawFlower} from './flowers.js';
import {drawDroppedToken} from './inventory.js?v=backpack-reward-1';
import {drawDroppedNote} from './hotel-storage.js?v=hotel-note-3';
import {drawHotelLamp} from './hotel-interior.js?v=receptionist-lamp-2';
import {drawBackpack} from './backpack.js';
import {drawPastisBottle,drawMarijuanaPlant} from './backpack-contents.js';
import {drawPineConeGeometry as pineCone} from './pine-cone-geometry.js';

// A null viewer emits complete geometry for a retained renderer. Canvas passes
// its current viewpoint to retain the existing pine-cone visibility optimization.
export function drawDroppedObject(item,{face,quad,box},viewer=null){
  if(item.item.id==='flower')drawFlower({...item.item,...item},quad);
  else if(['hotel-note','ticket'].includes(item.item.id))drawDroppedNote(item,face);
  else if(item.item.id==='arcade-token')drawDroppedToken(item,face);
  else if(item.item.id==='lamp')drawHotelLamp(item.x,(item.ground??0)+.006,item.z,box);
  else if(item.item.id==='backpack')drawBackpack(item,box,face);
  else if(item.item.id==='pastis-bottle')drawPastisBottle(item,box,face);
  else if(item.item.id==='marijuana-plant')drawMarijuanaPlant(item,box,face);
  else pineCone(item,face,viewer);
}
