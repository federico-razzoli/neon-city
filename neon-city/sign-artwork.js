// SPDX-License-Identifier: AGPL-3.0-only
// Exported sign artwork, shared by all matching signs and decoded before play.
const images=new Map();
const names=['night-river-left','night-river-right','park-left','park-right','rive-gauche'];
function imageFor(name){
  if(!names.includes(name))throw new Error(`Unknown sign artwork: ${name}`);
  if(!images.has(name)){
    const image=new Image(name==='rive-gauche'?360:300,name==='rive-gauche'?220:72);
    image.src=new URL(`./assets/signs/${name}.png`,import.meta.url).href;
    images.set(name,image);
  }
  return images.get(name);
}
export function signTexture(text,tipRight){
  return imageFor(`${text.toLowerCase().replaceAll(' ','-')}-${tipRight?'right':'left'}`);
}
export function riveGaucheTexture(){return imageFor('rive-gauche');}
export function preloadSignArtwork(){return Promise.all(names.map(name=>imageFor(name).decode()));}

export function isSignArtwork(image){return [...images.values()].includes(image);}
