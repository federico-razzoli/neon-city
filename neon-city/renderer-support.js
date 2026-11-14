// SPDX-License-Identifier: AGPL-3.0-only
export function supportsRenderer(destination,renderer){
  return renderer==='three'&&['street','initial','river','park','hotel','storage','stairs','corridor','arcade','bookshop','pub','lavatory','cubicle'].includes(destination);
}

export function defaultRenderer(destination){
  if(!supportsRenderer(destination,'three'))throw new Error('Unknown destination');
  return 'three';
}
export function createRendererPreferences(){
  return {
    get:defaultRenderer,
    set(destination,renderer){
      if(!supportsRenderer(destination,renderer))throw new Error('This renderer is not available for that destination.');
    }
  };
}
