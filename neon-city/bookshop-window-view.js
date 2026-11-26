// SPDX-License-Identifier: AGPL-3.0-only
import {BOOKSHOP} from './midnite-interior.js';
import {storefrontWindowView} from './three-storefront-street.js';

export const bookshopStorefront={
  doorX:BOOKSHOP.door.x,
  panes:BOOKSHOP.windowShelves.map(b=>({x:b.x+.12,y:.95,z:.04,w:b.w-.24,h:1.8})),
  preparationPoints:[[4,2.4],[14,2.4],[9,6]]
};

export function bookshopWindowView(frame){return storefrontWindowView(frame,bookshopStorefront);}
