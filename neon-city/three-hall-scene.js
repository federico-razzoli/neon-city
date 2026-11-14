// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {HOTEL,RECEPTIONISTS,drawHotelInterior,drawHotelLamp,hotelInteriorLook,hotelReceptionistPosition} from './hotel-interior.js?v=receptionist-lamp-2';
import {drawStaff} from './pub-interior.js?v=court-shoes-1';
import {hotelLook} from './hotel.js?v=park-entrances-1';

export function createThreeHallScene(hotel,{imageFor}={}){
  const facade=hotelLook(hotel),look=hotelInteriorLook(facade);
  return createThreeInteriorScene({name:'hall',imageFor,
    createMaterial:()=>new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}),
    drawRoom:helpers=>drawHotelInterior({...helpers,look:facade,lampTaken:true,drawReceptionist:false}),
    createExtras({scene,builder,material}){
      let receptionistType=hotel.receptionist??RECEPTIONISTS[0];
      const staffGeometry=()=>builder.build(helpers=>drawStaff(helpers,{x:0,z:0},receptionistType));
      const receptionist=new THREE.Mesh(staffGeometry(),material);receptionist.name='hall-receptionist';
      const {lamp}=HOTEL;
      const lampMeshes=[false,true].map(on=>{
        const mesh=new THREE.Mesh(builder.build(({box})=>drawHotelLamp(lamp.x,1.3,lamp.z,box,look.metal,on)),material);
        mesh.name=on?'hall-lamp-on':'hall-lamp-off';return mesh;
      });
      // Ambient illumination preserves the hall's painted colours when off.
      // The bulb sits just below the shade, directing warm light onto the desk.
      const ambient=new THREE.AmbientLight(0xffffff,1);ambient.name='hall-ambient';
      // Two successive 50% increases: cone width is proportional to tan(angle).
      const glow=new THREE.SpotLight(0xffd690,.14,2,Math.atan(Math.tan(Math.PI*.4)*2.25),.8,2);
      glow.name='hall-lamp-glow';glow.position.set(lamp.x,1.555,-lamp.z);
      glow.target.position.set(lamp.x,1.3,-lamp.z-.12);
      scene.add(receptionist,...lampMeshes,ambient,glow,glow.target);
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
        dispose(){receptionist.geometry.dispose();for(const mesh of lampMeshes)mesh.geometry.dispose();glow.dispose();}
      };
    }
  });
}
