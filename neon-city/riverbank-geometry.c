/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
/* Each retaining-wall quad: draw stage (2=retaining wall),
 * palette index, four x/y/z vertices. Preserve separate wall panels and order.
 */
static int count;
static void walls(int first,double water_level){
 double wall=first?18:46;
 for(int a=0;a<64;a+=8)for(double y=water_level;y<0;y+=1.4){
  int color=3+((int)__builtin_floor((y-water_level)/1.4+.5)%2);
  double top=y+1.4<0?y+1.4:0;
  double *p=geometry_output+count++*14;
  p[0]=2;p[1]=color;
  p[2]=a;p[3]=y;p[4]=wall;p[5]=a+8;p[6]=y;p[7]=wall;
  p[8]=a+8;p[9]=top;p[10]=wall;p[11]=a;p[12]=top;p[13]=wall;
 }
}
__attribute__((export_name("riverbank_walls_build")))
int riverbank_walls_build(int first,double water_level){
 count=0;walls(first,water_level);return count;
}
