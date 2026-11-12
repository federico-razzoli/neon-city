/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
#include "tree-directions.h"
/* Each face: vertex count, normal x/y/z, palette index, eight x/y/z slots.
 * Complete unit-scale pine: six trunk sides and bottom, five foliage tiers.
 */
static int count;
static double *current;
static void face(int vertices,double nx,double ny,double nz,int color){
 current=geometry_output+count++*29;
 current[0]=vertices;current[1]=nx;current[2]=ny;current[3]=nz;current[4]=color;
}
static void vertex(int i,double x,double y,double z){
 double *p=current+5+i*3;p[0]=x;p[1]=y;p[2]=z;
}
static int shade(double nx,double ny,double nz,int palette,int colors){
 double length=__builtin_sqrt(nx*nx+ny*ny+nz*nz);
 nx/=length;ny/=length;nz/=length;
 double dot=nx*light[0]+ny*light[1]+nz*light[2];
 double t=.5*(dot>0?dot:0)+.5*(ny*.5+.5);
 int index=(int)(t*colors);
 return palette+(index<colors?index:colors-1);
}
static void band(double y0,double r0,double y1,double r1,int sides,int palette,int colors,int top){
 const double (*directions)[6]=sides==6?directions6:directions8;
 double cos_half=sides==6?.8660254037844387:.9238795325112867;
 for(int i=0;i<sides;i++){
  const double *d=directions[i];
  double nx=d[4]*(y1-y0),ny=(r0-r1)*cos_half,nz=d[5]*(y1-y0);
  face(r1?4:3,nx,ny,nz,shade(nx,ny,nz,palette,colors));
  vertex(0,d[0]*r0,y0,d[1]*r0);
  vertex(1,d[2]*r0,y0,d[3]*r0);
  vertex(2,d[2]*r1,y1,d[3]*r1);
  if(r1)vertex(3,d[0]*r1,y1,d[1]*r1);
 }
 face(sides,0,-1,0,palette);
 for(int i=0;i<sides;i++)vertex(i,directions[i][0]*r0,y0,directions[i][1]*r0);
 if(top&&r1){
  face(sides,0,1,0,palette+colors-1);
  for(int i=0;i<sides;i++)vertex(i,directions[i][0]*r1,y1,directions[i][1]*r1);
 }
}
__attribute__((export_name("tree_build")))
int tree_build(void){
 count=0;
 band(0,.45,3,.3,6,0,4,0);
 const double tiers[5][4]={{3,3.6,6.6,1.5},{6.6,3,10,1.2},{10,2.4,13.2,.9},{13.2,1.8,16,.6},{16,1.15,18,0}};
 for(int i=0;i<5;i++)band(tiers[i][0],tiers[i][1],tiers[i][2],tiers[i][3],8,4,5,1);
 return count;
}
