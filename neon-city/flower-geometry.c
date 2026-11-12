/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
/* Three unit-size quads: x/z offsets, width/depth, and unscaled y offset. */
__attribute__((export_name("flower_build")))
void flower_build(void){
 const double quads[15]={-.5,-1.0/6,1,1.0/3,0,-1.0/6,-.5,1.0/3,1,0,-1.0/6,-1.0/6,1.0/3,1.0/3,.001};
 for(int i=0;i<15;i++)geometry_output[i]=quads[i];
}
