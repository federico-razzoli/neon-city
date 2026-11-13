// SPDX-License-Identifier: AGPL-3.0-only
export function supportsRenderer(destination,renderer){
  return renderer==='canvas'||renderer==='three'&&['hotel','storage','stairs','corridor','arcade'].includes(destination);
}

export function defaultRenderer(destination){
  return supportsRenderer(destination,'three')?'three':'canvas';
}
export function createRendererPreferences(){
  const choices=new Map();
  return {
    get(destination){return choices.get(destination)??defaultRenderer(destination);},
    set(destination,renderer){
      if(!supportsRenderer(destination,renderer))throw new Error('This renderer is not available for that destination.');
      choices.set(destination,renderer);
    }
  };
}
