// SPDX-License-Identifier: AGPL-3.0-only
export function carriedIceCreamStage(iceCream){
  if(!iceCream||iceCream.age>=30)return null;
  return iceCream.age<10?'full':iceCream.age<20?'bitten':'cone';
}
export function ageCarriedIceCream(person,dt){
  if(!person?.iceCream)return;
  person.iceCream.age+=dt;
  if(!carriedIceCreamStage(person.iceCream))delete person.iceCream;
}
export function dropCarriedIceCream(person){
  if(!person.iceCream)return null;
  delete person.iceCream;
  return 'OH, NO! I DROPPED MY ICE CREAM!';
}
export function iceCreamView(person){
  return {iceCreamStage:carriedIceCreamStage(person.iceCream),iceCreamFlavour:person.iceCream?.flavour??0};
}
