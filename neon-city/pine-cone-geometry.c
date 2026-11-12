/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
#include "tree-directions.h"
/* Each face: count, normal x/y/z, palette index, six x/y/z vertex slots. */
static double rings[4][6][3];
static int count;
static void face(int ring,int side,int cap){
 double *p=geometry_output+count++*23;
 int n=cap?6:ring==2?3:4;
 p[0]=n;
 for(int i=0;i<n;i++){
  int row=cap?0:ring+(i>=2),col=cap?5-i:(i==1||i==2)?(side+1)%6:side;
  for(int axis=0;axis<3;axis++)p[5+i*3+axis]=rings[row][col][axis];
 }
 double e1[3],e2[3],m[3]={0,0,0};
 for(int axis=0;axis<3;axis++){
  e1[axis]=p[8+axis]-p[5+axis];e2[axis]=p[11+axis]-p[5+axis];
  for(int i=0;i<n;i++)m[axis]+=p[5+i*3+axis]/n;
 }
 double nx=e1[1]*e2[2]-e1[2]*e2[1],ny=e1[2]*e2[0]-e1[0]*e2[2],nz=e1[0]*e2[1]-e1[1]*e2[0];
 double centre=rings[1][0][1]; /* ring angle zero has no vertical offset */
 if(nx*m[0]+ny*(m[1]-centre)+nz*m[2]<0){nx=-nx;ny=-ny;nz=-nz;}
 p[1]=nx;p[2]=ny;p[3]=nz;
 double length=__builtin_sqrt(nx*nx+ny*ny+nz*nz);
 if(length<1e-12){p[4]=-1;return;}
 nx/=length;ny/=length;nz/=length;
 double dot=nx*light[0]+ny*light[1]+nz*light[2];
 double t=.5*(dot>0?dot:0)+.5*(ny*.5+.5);
 int shade=(int)(t*5);p[4]=shade<5?shade:4;
}
__attribute__((export_name("pine_cone_build")))
int pine_cone_build(double length,double radius,double ax,double az){
 count=0;
 const double levels[4][2]={{-.5,.45},{-.25,1},{.15,.8},{.5,0}};
 double y=radius*.8660254037844387;
 for(int row=0;row<4;row++)for(int i=0;i<6;i++){
  double u=levels[row][0],r=radius*levels[row][1],c=directions6[i][0],s=directions6[i][1];
  rings[row][i][0]=ax*u*length-az*c*r;
  rings[row][i][1]=y+s*r;
  rings[row][i][2]=az*u*length+ax*c*r;
 }
 face(0,0,1);
 for(int row=0;row<3;row++)for(int i=0;i<6;i++)face(row,i,0);
 return count;
}
