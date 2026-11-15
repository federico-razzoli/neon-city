// SPDX-License-Identifier: AGPL-3.0-only
import {ShaderChunk} from './vendor/three/three.module.js';

// A small negative bias retains more detail without disabling mipmaps or
// anisotropic sampling. Keep this restricted to sign artwork.
export function sharpenSignSampling(material){
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
      ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv, -0.35 )'));
  };
  material.customProgramCacheKey=()=> 'sign-mip-bias--0.35';
}
