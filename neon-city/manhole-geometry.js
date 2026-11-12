/* SPDX-License-Identifier: AGPL-3.0-only */
import {geometryWasm} from './geometry-wasm.js';
const {memory,output,manhole_build:build}=geometryWasm;
const scratch=new Float64Array(memory.buffer,output(),99);
// All current covers share radius .65 and therefore one 792-byte template.
// Cache by radius so future sizes also share geometry without per-cover storage.
const templates=new Map();
export function manholeGeometry(radius){
  let geometry=templates.get(radius);
  if(!geometry){
    build(radius);
    geometry=scratch.slice();
    templates.set(radius,geometry);
  }
  return geometry;
}
