// SPDX-License-Identifier: AGPL-3.0-only
import {bookshopStorefront} from './bookshop-window-view.js';
import {createStorefrontStreet,storefrontStreetView} from './three-storefront-street.js';

export function bookshopStreetView(frame){return storefrontStreetView(frame,bookshopStorefront.doorX);}

export function createBookshopStreet(scene,options={}){
  return createStorefrontStreet(scene,bookshopStorefront,options);
}
