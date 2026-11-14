// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {createCorridorSky} from './three-corridor-sky.js';
import {HOTEL_CORRIDOR,drawHotelCorridor,drawCorridorCasement,corridorWindowAngle,corridorWindowState} from './hotel-corridor.js?v=businessman-door-1';
import {hotelLook} from './hotel.js?v=park-entrances-1';
import {hotelInteriorLook} from './hotel-interior.js?v=street-lights-1';
import {hotelStreetLife} from './hotel-street.js?v=1';
import {createThreeCarModels} from './three-cars.js';
import {vehicleTexture} from './vehicle-textures.js';

export function createThreeCorridorScene(hotel,floor,{createSky=createCorridorSky,textureFor=vehicleTexture,imageFor}={}){
  const facade=hotelLook(hotel),look=hotelInteriorLook(facade);
  return createThreeInteriorScene({name:'corridor',background:'#000',imageFor,
    drawRoom:helpers=>drawHotelCorridor({...helpers,look:facade,floor,casements:false}),
    createExtras({scene,builder,material}){
      const sky=createSky(scene),leaves=[],models=createThreeCarModels({textureFor}),cars=new Map();
      let street={people:[]};
      const {depth,window:{x,w}}=HOTEL_CORRIDOR;
      for(const side of [0,1]){
        const hinge=side?x+w-.08:x+.08,baseZ=depth+.01;
        const geometry=builder.build(({face})=>drawCorridorCasement((vertices,color)=>{
          face(vertices.map(p=>({...p,x:p.x-hinge,z:p.z-baseZ})),color);
        },look,side,0));
        const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,material);group.add(mesh);
        group.name=side?'corridor-window-right':'corridor-window-left';group.position.set(hinge,0,-baseZ);
        leaves.push({group,geometry,sign:side?-1:1});scene.add(group);
      }
      return {
        update(frame){
          const angle=corridorWindowAngle(corridorWindowState(hotel,floor).progress);
          for(const {group,sign} of leaves)group.rotation.y=sign*angle;
          street=hotelStreetLife(hotel.seed,frame.time,floor);
          const present=new Set();
          for(const car of street.cars){
            present.add(car.id);
            const key=`${car.type}:${car.axis}:${car.dir}:${car.color}`;
            let actor=cars.get(car.id);
            if(!actor||actor.key!==key){
              if(actor)scene.remove(actor.group);
              const asset=models.get(car);actor={key,group:asset.group.clone(true)};
              actor.group.name='corridor-car';actor.group.userData.streetId=car.id;
              cars.set(car.id,actor);scene.add(actor.group);
            }
            actor.group.position.set(car.x,car.y,-car.z);
          }
          for(const [id,actor] of cars)if(!present.has(id)){scene.remove(actor.group);cars.delete(id);}
          sky.update(frame);
        },
        actors(){return street.people;},
        dispose(){
          sky.dispose();for(const {geometry} of leaves)geometry.dispose();
          models.dispose();cars.clear();
        }
      };
    }
  });
}
