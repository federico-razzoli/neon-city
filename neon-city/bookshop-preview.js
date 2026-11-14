// SPDX-License-Identifier: AGPL-3.0-only
import {Color,Vector3,Matrix4} from './vendor/three/three.module.js';
import {createBookGeometry,createBackpackGeometry} from './three-bookshop-models.js';

// Inventory's 2D thumbnail renderer projects the same native model triangles.
// No separate book or backpack shape generator is retained.
export function projectModel(geometry,face,{x=0,z=0,ground=0,angle=0}={}){
  const transform=new Matrix4().makeTranslation(x,ground,-z).multiply(new Matrix4().makeRotationY(-angle));
  const positions=geometry.attributes.position,colors=geometry.attributes.color;
  for(let i=0;i<positions.count;i+=3){
    const points=Array.from({length:3},(_,j)=>{
      const p=new Vector3().fromBufferAttribute(positions,i+j).applyMatrix4(transform);
      return {x:p.x,y:p.y,z:-p.z};
    });
    const color=new Color().fromBufferAttribute(colors,i);
    face(points,`#${color.getHexString()}`);
  }
}
export function previewBook(book,face,position){
  const geometry=createBookGeometry(book.color);
  try{projectModel(geometry,face,position);}finally{geometry.dispose();}
}
export function previewBackpack(position,face){
  const geometry=createBackpackGeometry();
  try{projectModel(geometry,face,position);}finally{geometry.dispose();}
}
