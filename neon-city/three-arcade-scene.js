// SPDX-License-Identifier: AGPL-3.0-only
import {createThreeInteriorScene} from './three-interior-scene.js';
import {drawArcadeInterior} from './arcade-interior.js?v=pinball-9';

export function createThreeArcadeScene({imageFor}={}){
  return createThreeInteriorScene({name:'arcade',drawRoom:drawArcadeInterior,
    background:'#17172b',imageFor,actorsFor:frame=>frame.arcadeLife?.people
  });
}
