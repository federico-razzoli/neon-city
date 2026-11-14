/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
/* Each quad: draw stage (0=grass/path, 1=approaches, 2=retaining wall),
 * palette index, four x/y/z vertices. Preserve separate wall panels and order.
 */
static int count;
static void quad(int stage,int color,double x,double y,double z,double w,double d){
 double *p=geometry_output+count++*14;
 p[0]=stage;p[1]=color;
 p[2]=x;p[3]=y;p[4]=z;p[5]=x+w;p[6]=y;p[7]=z;
 p[8]=x+w;p[9]=y;p[10]=z+d;p[11]=x;p[12]=y;p[13]=z+d;
}
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
__attribute__((export_name("riverbank_build")))
int riverbank_build(int first,int left_bridge,int right_bridge,double water_level){
 count=0;
 double bank=first?8:46;
 quad(0,0,0,.04,bank,64,10);
 quad(0,1,0,.06,first?bank:bank+4,64,6);
 const double offsets[4]={0,8,50,56},widths[4]={8,6,6,8};
 for(int i=0;i<4;i++)if(i>=2?right_bridge:left_bridge)
  quad(1,i==0||i==3?2:1,offsets[i],.075,bank,widths[i],10);
 walls(first,water_level);
 return count;
}
