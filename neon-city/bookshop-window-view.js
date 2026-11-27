// SPDX-License-Identifier: AGPL-3.0-only
import {BOOKSHOP,BOOKSHOP_WINDOW_PANES} from './midnite-interior.js';
import {storefrontWindowView} from './three-storefront-street.js';

export const bookshopStorefront={
  doorX:BOOKSHOP.door.x,
  panes:BOOKSHOP_WINDOW_PANES,
  preparationPoints:[[4,2.4],[14,2.4],[9,6]]
};

export function bookshopWindowView(frame){return storefrontWindowView(frame,bookshopStorefront);}
