// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {HOTEL,RECEPTIONISTS,drawHotelInterior,drawHotelLamp,hotelInteriorLook,hotelReceptionistPosition} from './hotel-interior.js?v=receptionist-lamp-2';
import {drawStaff} from './pub-interior.js?v=court-shoes-1';
import {hotelLook} from './hotel.js?v=park-entrances-1';

export function createThreeHallScene(hotel,{imageFor}={}){
  const facade=hotelLook(hotel),look=hotelInteriorLook(facade);
  return createThreeInteriorScene({name:'hall',imageFor,
    drawRoom:helpers=>drawHotelInterior({...helpers,look:facade,lampTaken:true,drawReceptionist:false}),
    createExtras({scene,builder,material}){
      let receptionistType=hotel.receptionist??RECEPTIONISTS[0];
      const staffGeometry=()=>builder.build(helpers=>drawStaff(helpers,{x:0,z:0},receptionistType));
      const receptionist=new THREE.Mesh(staffGeometry(),material);receptionist.name='hall-receptionist';
      const {lamp,desk}=HOTEL;
      const lampMeshes=[false,true].map(on=>{
        const mesh=new THREE.Mesh(builder.build(({box})=>drawHotelLamp(lamp.x,1.3,lamp.z,box,look.metal,on)),material);
        mesh.name=on?'hall-lamp-on':'hall-lamp-off';return mesh;
      });
      const glow=new THREE.Mesh(builder.build(({quad})=>{
        quad(lamp.x-.45,1.302,desk.z+.05,.9,.75,'#c4b494');
        quad(lamp.x-.25,1.303,desk.z+.2,.5,.42,'#dccb9f');
      }),material);glow.name='hall-lamp-glow';
      scene.add(receptionist,...lampMeshes,glow);
      return {
        update(frame){
          const type=frame.currentHotel.receptionist??RECEPTIONISTS[0];
          if(type!==receptionistType){
            receptionistType=type;receptionist.geometry.dispose();receptionist.geometry=staffGeometry();
          }
          const position=hotelReceptionistPosition(frame.currentHotel);
          receptionist.position.set(position.x,0,-position.z);
          const present=!frame.currentHotel.lampTaken,on=!!frame.currentHotel.lampOn;
          lampMeshes[0].visible=present&&!on;lampMeshes[1].visible=present&&on;glow.visible=present&&on;
        },
        dispose(){receptionist.geometry.dispose();for(const mesh of [...lampMeshes,glow])mesh.geometry.dispose();}
      };
    }
  });
}
