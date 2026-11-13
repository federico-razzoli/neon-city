// SPDX-License-Identifier: AGPL-3.0-only
import {createThreeInteriorScene} from './three-interior-scene.js';
import {drawHotelStorage,drawStorageNote} from './hotel-storage.js?v=hotel-note-3';
import {Mesh} from './vendor/three/three.module.js';

export {createInteriorCamera as createStorageCamera,updateInteriorCamera as updateStorageCamera,
  createInteriorGeometryBuilder as createStorageGeometryBuilder} from './three-interior-scene.js';

export function createThreeStorageScene(){
  return createThreeInteriorScene({name:'storage',
    drawRoom:helpers=>drawHotelStorage({...helpers,noteTaken:true}),
    createExtras({scene,builder,material}){
      const note=new Mesh(builder.build(drawStorageNote),material);
      note.name='storage-note';scene.add(note);
      return {update(frame){note.visible=!frame.currentHotel.storageNoteTaken;},dispose(){note.geometry.dispose();}};
    }
  });
}
