/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
/* Thirty quads in drawing order, with four x/y/z vertices each. */
static void quad(int f,double x,double y,double z,double w,double d){
 double *p=geometry_output+f*12;
 p[0]=x;p[1]=y;p[2]=z;
 p[3]=x+w;p[4]=y;p[5]=z;
 p[6]=x+w;p[7]=y;p[8]=z+d;
 p[9]=x;p[10]=y;p[11]=z+d;
}
__attribute__((export_name("road_marking_build")))
void road_marking_build(void){
 int f=0;
 // Entire lane dashes stay between intersections, which begin at offset 56.
 for(int t=12;t+4<=56;t+=12){
  quad(f++,-.09,.025,t,.18,4);
  quad(f++,t,.025,-.09,4,.18);
 }
 // Centre crossing stripes across the road, with equal gaps to sidewalks.
 for(int i=-5;i<=5;i++){
  quad(f++,i*1.4-.325,.03,9.5,.65,2.7);
  quad(f++,9.5,.03,i*1.4-.325,2.7,.65);
 }
}
