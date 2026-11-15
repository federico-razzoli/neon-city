// SPDX-License-Identifier: AGPL-3.0-only
import {Mesh,PlaneGeometry,MeshBasicMaterial,DoubleSide} from './vendor/three/three.module.js';
import {createThreeSeatedCharacters} from './three-seated-characters.js';
import {characterGirth} from './world.js?v=start-pub-1';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {BOOKSHOP,BOOKSHOP_BOOKS} from './midnite-interior.js';
import {bookshopVisitorShowsBack} from './midnite-life.js';
import {createBookshopRoomGeometry,createBooksellerGeometry,createBackpackGeometry,createBookGeometry} from './three-bookshop-models.js';
import {createBookshopStreet} from './three-bookshop-street.js';

export function createThreeBookshopScene({imageFor,streetScene}={}){
  return createThreeInteriorScene({name:'bookshop',background:'#302c26',imageFor,
    createRoomGeometry:createBookshopRoomGeometry,
    actorsFor:frame=>frame.bookshopLife?.people,
    actorView:(person,frame)=>({seated:person.state==='reading',back:bookshopVisitorShowsBack(person,frame.player)}),
    createExtras({scene,material}){
      const street=createBookshopStreet(scene,{streetScene}),seated=createThreeSeatedCharacters(),legs=new Map();
      const glassGeometry=new PlaneGeometry(1,1),glassMaterial=new MeshBasicMaterial({color:'#8bb9ae',transparent:true,opacity:.22,depthWrite:false,side:DoubleSide,toneMapped:false});
      for(const [i,b] of BOOKSHOP.windowShelves.entries()){
        const glass=new Mesh(glassGeometry,glassMaterial);glass.name=`bookshop-window-${i}`;
        glass.position.set(b.x+b.w/2,1.85,-.04);glass.scale.set(b.w-.24,1.8,1);scene.add(glass);
      }
      const seller=new Mesh(createBooksellerGeometry(),material);
      seller.name='bookshop-bookseller';scene.add(seller);
      const backpack=new Mesh(createBackpackGeometry(),material);
      backpack.position.set(BOOKSHOP.backpack.x,0,-BOOKSHOP.backpack.z);
      backpack.name='bookshop-backpack';scene.add(backpack);
      const geometries=new Map(),books=new Map();
      function place(key,book,x,z,y=1,scale=1){
        let mesh=books.get(key);
        if(!mesh){
          let geometry=geometries.get(book.color);
          if(!geometry){geometry=createBookGeometry(book.color);geometries.set(book.color,geometry);}
          mesh=new Mesh(geometry,material);mesh.name=`bookshop-book-${book.id??BOOKSHOP_BOOKS.indexOf(book)}`;
          books.set(key,mesh);scene.add(mesh);
        }
        mesh.visible=true;mesh.position.set(x,y,-z);mesh.scale.setScalar(scale);
      }
      return {
        prepare(renderer,frame){street.prepare(renderer,frame);},
        update(frame){
          const {bookshopLife:life}=frame;street.update(frame);
          for(const mesh of books.values())mesh.visible=false;
          const position=life?.seller??BOOKSHOP.bookseller,angle=life?.sellerAngle??Math.PI;
          seller.position.set(position.x,0,-position.z);seller.rotation.y=-(angle-Math.PI);
          backpack.visible=!life?.backpackTaken;
          for(const book of BOOKSHOP_BOOKS)if(!life||life.onDisplay(book))place(book,book,book.x,book.z);
          for(const book of [...(life?.books??[]),...(life?.visitorBooks??[])])if(book.state==='reading'){
            const table=BOOKSHOP.readingTables[book.seat];place(book,book,table.x,table.z,.68);
          }
          const presentLegs=new Set();
          for(const visitor of life?.people??[])if(visitor.state==='reading'){
            const key=visitor.id??visitor;presentLegs.add(key);
            let mesh=legs.get(key);
            const geometry=seated.geometry(visitor.type,visitor.variant,-1,.5);
            if(!mesh){mesh=new Mesh(geometry,seated.material);mesh.name='bookshop-seated-legs';mesh.userData.actorId=visitor.id;legs.set(key,mesh);scene.add(mesh);}
            mesh.geometry=geometry;mesh.position.set(visitor.x,0,-visitor.z);
            mesh.rotation.y=-(visitor.angle??BOOKSHOP.chairs[visitor.seat]?.angle??0);
            mesh.scale.x=characterGirth(visitor.type);
          }
          for(const [key,mesh] of legs)if(!presentLegs.has(key)){scene.remove(mesh);legs.delete(key);}
          for(const visitor of life?.people??[])if(visitor.book){
            const book=visitor.book;
            if(visitor.state==='reading'){
              const table=BOOKSHOP.readingTables[visitor.seat];place(book,book,table.x,table.z,.68);
            }else{
              const angle=visitor.angle??0;
              place(book,book,visitor.x+Math.cos(angle)*.43+Math.sin(angle)*.08,
                visitor.z-Math.sin(angle)*.43+Math.cos(angle)*.08,.65,.7);
            }
          }
          if(life?.returning?.state==='returning')place(life.returning,life.returning,
            position.x+Math.sin(angle)*.35,position.z+Math.cos(angle)*.35,1.1);
          // Keep display objects for reuse; release references to finished loans.
          for(const [key,mesh] of books)if(!mesh.visible&&!BOOKSHOP_BOOKS.includes(key)){
            scene.remove(mesh);books.delete(key);
          }
        },
        dispose(){for(const mesh of legs.values())scene.remove(mesh);legs.clear();seated.dispose();street.dispose();glassGeometry.dispose();glassMaterial.dispose();seller.geometry.dispose();backpack.geometry.dispose();for(const geometry of geometries.values())geometry.dispose();geometries.clear();books.clear();}
      };
    }
  });
}
