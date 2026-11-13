// SPDX-License-Identifier: AGPL-3.0-only
import {Mesh} from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {PUB,pubChairs,drawPubInterior,drawPubPatron,drawPubPint,drawStaff} from './pub-interior.js?v=bar-taps-1';

export function createThreePubScene({imageFor}={}){
  return createThreeInteriorScene({name:'pub',imageFor,
    drawRoom:helpers=>drawPubInterior({...helpers,drawBartender:false,drawBarBeer:false}),
    actorsFor:frame=>frame.pubLife?.walker?[frame.pubLife.walker]:[],
    actorView:(person,frame)=>person.seated?{seated:true,back:(frame.player.z-person.z)*person.side>0}:{height:2.4},
    createExtras({scene,builder,material}){
      const chairs=pubChairs(),seats=new Map();let actors=[],bartenderType,beerKey;
      const bartender=new Mesh(undefined,material),beer=new Mesh(undefined,material);
      bartender.name='pub-bartender';beer.name='pub-bar-beer';scene.add(bartender,beer);
      return {
        actors:()=>actors,
        update(frame){
          if(bartenderType!==frame.bartenderType){
            bartenderType=frame.bartenderType;bartender.geometry.dispose();
            bartender.geometry=builder.build(helpers=>drawStaff(helpers,PUB.bartender,bartenderType));
          }
          const pint=frame.currentVenue.barBeer??PUB.barBeer,nextBeerKey=JSON.stringify([pint.x,pint.z,!!pint.dark]);
          if(beerKey!==nextBeerKey){
            beerKey=nextBeerKey;beer.geometry.dispose();beer.geometry=builder.build(helpers=>drawPubPint(helpers,pint.x,1.3,pint.z,pint.dark));
          }
          actors=[];
          for(const chair of chairs){
            const {tableIndex,seat}=chair,key=`${tableIndex}:${seat}`,patrons=frame.pubPatrons[tableIndex],type=patrons?.[seat];
            let entry=seats.get(key);
            if(type==null){
              if(entry){scene.remove(entry.mesh);entry.mesh.geometry.dispose();seats.delete(key);}
              continue;
            }
            patrons.beerSides??=[Math.random()<.5?-1:1,Math.random()<.5?-1:1];
            patrons.beerDark??=[Math.random()<1/3,Math.random()<1/3];
            const variant=patrons.variants?.[seat]??0,side=patrons.beerSides[seat],dark=patrons.beerDark[seat];
            const signature=JSON.stringify([type,variant,side,dark]);
            if(entry?.signature!==signature){
              if(entry){scene.remove(entry.mesh);entry.mesh.geometry.dispose();}
              let actor;
              const mesh=new Mesh(builder.build(helpers=>{
                drawPubPatron({...helpers,seatedPatron:person=>{actor={...person,id:`pub-seat-${key}`,seated:true};}},chair,type,variant);
                const table=PUB.tables[tableIndex];
                drawPubPint(helpers,table.x+side*.65,1.102,table.z+(seat===0?-1:1)*(table.radius-.45),dark);
              }),material);
              mesh.name=`pub-seat-${key}`;scene.add(mesh);entry={mesh,actor,signature};seats.set(key,entry);
            }
            actors.push(entry.actor);
          }
        },
        dispose(){bartender.geometry.dispose();beer.geometry.dispose();for(const {mesh} of seats.values())mesh.geometry.dispose();seats.clear();actors=[];}
      };
    }
  });
}
