// SPDX-License-Identifier: AGPL-3.0-only
import {Mesh} from './vendor/three/three.module.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {BOOKSHOP,BOOKSHOP_BOOKS,drawBookshopInterior,drawBookshopBook,drawBookseller} from './midnite-interior.js';
import {bookshopVisitorShowsBack} from './midnite-life.js';
import {drawBackpack} from './backpack.js';

export function createThreeBookshopScene({imageFor}={}){
  return createThreeInteriorScene({name:'bookshop',background:'#302c26',imageFor,
    drawRoom:helpers=>drawBookshopInterior(helpers,null,{dynamic:false,solidShelfEnds:true}),
    actorsFor:frame=>frame.bookshopLife?.people,
    actorView:(person,frame)=>({seated:person.state==='reading',back:bookshopVisitorShowsBack(person,frame.player)}),
    createExtras({scene,builder,material}){
      const seller=new Mesh(builder.build(helpers=>drawBookseller(helpers,{x:0,z:0})),material);
      seller.name='bookshop-bookseller';scene.add(seller);
      const backpack=new Mesh(builder.build(({box,face})=>drawBackpack(BOOKSHOP.backpack,box,face)),material);
      backpack.name='bookshop-backpack';scene.add(backpack);
      const geometries=new Map(),books=new Map();
      function place(key,book,x,z,y=1,scale=1){
        let mesh=books.get(key);
        if(!mesh){
          let geometry=geometries.get(book.color);
          if(!geometry){geometry=builder.build(({box})=>drawBookshopBook(box,book,0,0,0));geometries.set(book.color,geometry);}
          mesh=new Mesh(geometry,material);mesh.name=`bookshop-book-${book.id??BOOKSHOP_BOOKS.indexOf(book)}`;
          books.set(key,mesh);scene.add(mesh);
        }
        mesh.visible=true;mesh.position.set(x,y,-z);mesh.scale.setScalar(scale);
      }
      return {
        update({bookshopLife:life}){
          for(const mesh of books.values())mesh.visible=false;
          const position=life?.seller??BOOKSHOP.bookseller,angle=life?.sellerAngle??Math.PI;
          seller.position.set(position.x,0,-position.z);seller.rotation.y=-(angle-Math.PI);
          backpack.visible=!life?.backpackTaken;
          for(const book of BOOKSHOP_BOOKS)if(!life||life.onDisplay(book))place(book,book,book.x,book.z);
          for(const book of [...(life?.books??[]),...(life?.visitorBooks??[])])if(book.state==='reading'){
            const table=BOOKSHOP.readingTables[book.seat];place(book,book,table.x,table.z,.68);
          }
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
        dispose(){seller.geometry.dispose();backpack.geometry.dispose();for(const geometry of geometries.values())geometry.dispose();geometries.clear();books.clear();}
      };
    }
  });
}
