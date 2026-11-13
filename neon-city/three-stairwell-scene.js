// SPDX-License-Identifier: AGPL-3.0-only
import {createThreeInteriorScene} from './three-interior-scene.js';
import {createThreeMoneyNote} from './three-money-note.js';
import {drawHotelStairwell,stairwellNote} from './hotel-stairwell.js?v=hotel-guests-3';
import {hotelLook} from './hotel.js?v=park-entrances-1';

export function createThreeStairwellScene(hotel,{createCashNote=createThreeMoneyNote}={}){
  return createThreeInteriorScene({name:'stairs',
    drawRoom:helpers=>drawHotelStairwell({...helpers,look:hotelLook(hotel)}),
    createExtras({scene}){
      const note=stairwellNote(hotel),cash=createCashNote(note);scene.add(cash.mesh);
      return {update(){cash.mesh.visible=!note.taken;},dispose(){cash.dispose();}};
    }
  });
}
