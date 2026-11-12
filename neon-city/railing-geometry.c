/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
#include "railing-heights.h"
/* Each quad: visibility rule (0=always, 1..5=box faces), palette index,
 * segment (-1=bank, otherwise chunk-local z), four x/y/z vertices.
 */
static int count,segment;
static double *current;
static void face(int rule,int color){
 current=geometry_output+count++*15;
 current[0]=rule;current[1]=color;current[2]=segment;
}
static void vertex(int i,double x,double y,double z){
 double *p=current+3+i*3;p[0]=x;p[1]=y;p[2]=z;
}
static void box(double x,double y,double z,double w,double h,double d,int color){
 const int corners[5][4]={{0,1,1,0},{2,3,3,2},{3,0,0,3},{1,2,2,1},{0,1,2,3}};
 double xs[4]={x,x+w,x+w,x},zs[4]={z,z,z+d,z+d};
 for(int f=0;f<5;f++){
  face(f+1,color);
  for(int i=0;i<4;i++){
   int c=corners[f][i];vertex(i,xs[c],y+((f==4||i>=2)?h:0),zs[c]);
  }
 }
}
static void strip(double left,double right,double y0,double y1,double a,double b,int color){
 face(0,color);
 vertex(0,left,y0,a);vertex(1,right,y0,a);vertex(2,right,y1,b);vertex(3,left,y1,b);
}
__attribute__((export_name("railing_build")))
int railing_build(int first,int left_bridge,int right_bridge){
 count=0;segment=-1;
 double bank=first?18:46;
 int left=left_bridge?14:0,right=right_bridge?50:64;
 for(int a=left;a<right;a+=6){
  double w=right-a<6?right-a:6;
  box(a,.06,bank-.22,w,.2,.44,0);
  box(a,1.05,bank-.09,w,.12,.18,1);
  box(a,.1,bank-.1,.18,1,.2,2);
 }
 int low=first?18:0,high=first?64:46;
 for(int a=low;a<high;a+=2){
  int relative=a+(first?0:64),i=(relative-18)/2;
  double b=a+2,h0=heights[i],h1=heights[i+1];segment=a;
  for(int side=0;side<2;side++){
   if(!(side?right_bridge:left_bridge))continue;
   double edge=side?50:14;
   face(0,3);
   vertex(0,edge,h0+1.05,a);vertex(1,edge,h1+1.05,b);
   vertex(2,edge,h1+1.19,b);vertex(3,edge,h0+1.19,a);
   strip(edge-.15,edge+.15,h0+.25,h1+.25,a,b,4);
   strip(edge-.1,edge+.1,h0+1.19,h1+1.19,a,b,3);
   if(relative%4==2)box(edge-.1,h0+.2,a,.2,1,.2,5);
  }
 }
 return count;
}
