// SPDX-License-Identifier: AGPL-3.0-only
// The cardboard tree air freshener hanging from each ice cream van's mirror. One
// outline serves the van model, the inventory picture and the dropped item.
import * as THREE from './vendor/three/three.module.js';

export const ARBRE_MAGIQUE={id:'arbre-magique',name:'ARBRE MAGIQUE',description:'AN ACCESSORY FOR CARS. MINT FLAVOUR.'};
export const ARBRE_MAGIQUE_COLOR='#3f9a4c';
export const ARBRE_MAGIQUE_STRING={length:.047,width:.003,color:'#f1ece0'};
// Card outline in metres: u across, v down from the string's knot.
const half=[[0,0],[.013,-.022],[.007,-.023],[.023,-.047],[.013,-.049],[.035,-.08],[.006,-.08],[.006,-.095]];
export const ARBRE_MAGIQUE_OUTLINE=[...half,...half.slice(1).reverse().map(([u,v])=>[-u,v])].map(([u,v])=>new THREE.Vector2(u,v));
export const arbreMagiqueShape=()=>new THREE.Shape(ARBRE_MAGIQUE_OUTLINE);
// The card is not convex, so split it into triangles once for face-based renderers.
const triangles=THREE.ShapeUtils.triangulateShape(ARBRE_MAGIQUE_OUTLINE,[]);

// Upright for the inventory picture, facing its front-right viewpoint; otherwise lying
// flat on the ground, turned to the player's heading, with the string laid out above.
export function drawArbreMagique(item,face,{upright=false}={}){
  const {x=0,z=0,ground=0,angle=0}=item,c=Math.cos(angle),s=Math.sin(angle);
  const at=upright?(u,v)=>({x:x+u*Math.SQRT1_2,y:ground+.095+v,z:z+u*Math.SQRT1_2})
    :(u,v)=>({x:x+u*c-(v+.05)*s,y:ground+.003,z:z-u*s-(v+.05)*c});
  for(const triangle of triangles)face(triangle.map(i=>at(ARBRE_MAGIQUE_OUTLINE[i].x,ARBRE_MAGIQUE_OUTLINE[i].y)),ARBRE_MAGIQUE_COLOR);
  const {length,width,color}=ARBRE_MAGIQUE_STRING;
  face([at(-width,length),at(width,length),at(width,0),at(-width,0)],color);
}
