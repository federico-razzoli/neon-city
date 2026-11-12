/* SPDX-License-Identifier: AGPL-3.0-only */
#include "geometry.h"
/* Each quad: visibility rule, material, texture, reserved, then four x/y/z/u/v
 * vertices. Material indices match car-geometry.js; texture IDs are resolved
 * by carTexture() in the renderer. Rules 1..6 are the original box() tests; 0 always emits.
 */
static int count,axis,dir;
static double *current;
static void face(int rule,int material,int texture){
 current=geometry_output+count++*24;
 current[0]=rule;current[1]=material;current[2]=texture;current[3]=0;
}
static void vertex(int i,double x,double y,double z,double u,double v){
 double *p=current+4+i*5;p[0]=x;p[1]=y;p[2]=z;p[3]=u;p[4]=v;
}
static void point(int i,double across,double along,double y,double u,double v){
 vertex(i,axis?along*dir:across,y,axis?across:along*dir,u,v);
}
static void box(double x,double y,double z,double w,double h,double d,int color,int roof){
 double xs[4]={x,x+w,x+w,x},zs[4]={z,z,z+d,z+d};
 const int corners[6][4]={{0,1,1,0},{2,3,3,2},{3,0,0,3},{1,2,2,1},{0,1,2,3},{3,2,1,0}};
 for(int f=0;f<6;f++){
  face(f+1,f==4?roof:color,0);
  for(int i=0;i<4;i++){
   int c=corners[f][i];
   vertex(i,xs[c],y+((f==4||(f<4&&i>=2))?h:0),zs[c],0,0);
  }
 }
}
static void part(double across,double along,double y,double w,double l,double h,int color,int roof){
 double px=axis?along*dir:across,pz=axis?across:along*dir;
 double width=axis?l:w,depth=axis?w:l;
 box(px-width/2,y,pz-depth/2,width,h,depth,color,roof);
}
#include "car-ornament.h"
__attribute__((export_name("car_build")))
int car_build(int type,int road_axis,int direction){
 count=0;axis=road_axis;dir=direction;
 double w=axis?4.7:2.1,d=axis?2.1:4.7,x=-w/2,z=-d/2;
 if(type==1){
  part(0,0,.25,2.1,4.7,1.85,4,5);
  part(0,0,2.1,2.02,4.58,.18,5,6);
  for(int side=-1;side<=1;side+=2){
   double left=side*dir*(axis?-1:1)*1.05,along=side*2.351;
   face(0,4,side==1?1:2);
   point(0,left,along,.25,0,192);point(1,-left,along,.25,192,192);
   point(2,-left,along,2.1,192,0);point(3,left,along,2.1,0,0);
   double a=side*1.051,start=side*(axis?-1:1)*2.35;
   face(0,4,3);
   point(0,a,start,.25,0,192);point(1,a,-start,.25,384,192);
   point(2,a,-start,2.1,384,0);point(3,a,start,2.1,0,0);
   part(0,side*2.38,.29,2.1,.12,.14,7,7);
  }
 }else if(type==2){
  part(0,0,.25,2.1,4.7,.65,8,9);
  part(0,-.3,.9,1.82,2.55,.56,10,11);
  part(0,-.3,1.46,1.86,2.58,.09,12,9);
  for(int side=-1;side<=1;side+=2){
   double alongs[3]={-1.54,-.35,.94};
   for(int i=0;i<3;i++)part(side*.92,alongs[i],.9,.07,.09,.57,13,13);
   part(side*1.055,0,.73,.04,4.25,.055,14,14);
   part(side*.94,-.85,.85,.055,.23,.045,15,15);
   part(side*.94,.45,.85,.055,.23,.045,15,15);
   part(side*.98,.85,1.01,.22,.26,.13,16,16);
   part(side*.73,-2.37,.53,.46,.06,.22,17,17);
  }
  part(0,-2.38,.3,2.02,.1,.12,18,18);
  part(0,2.38,.3,2.02,.1,.12,18,18);
  double left=dir*(axis?-1:1)*.5;
  face(0,19,4);
  point(0,left,2.401,.43,0,96);point(1,-left,2.401,.43,192,96);
  point(2,-left,2.401,.86,192,0);point(3,left,2.401,.86,0,0);
  part(0,2.16,.9,.14,.14,.035,20,20);
  part(0,2.16,.935,.035,.035,.1,21,21);
  double radius=.15,inner=.127,centre=1.18;
  for(int layer=0;layer<2;layer++){
   double along=layer?2.18:2.14;
   for(int i=0;i<24;i++){
    face(0,21,0);
    point(0,circle[i][0]*radius,along,centre+circle[i][1]*radius,0,0);
    point(1,circle[i+1][0]*radius,along,centre+circle[i+1][1]*radius,0,0);
    point(2,circle[i+1][0]*inner,along,centre+circle[i+1][1]*inner,0,0);
    point(3,circle[i][0]*inner,along,centre+circle[i][1]*inner,0,0);
   }
   for(int i=0;i<3;i++){
    double dx=spokes[i][0],dy=spokes[i][1],half=.012;
    face(0,21,0);
    for(int v=0;v<4;v++){
     double length=(v==1||v==2)?inner:0,offset=v<2?-half:half;
     point(v,dx*length-dy*offset,along,centre+dy*length+dx*offset,0,0);
    }
   }
  }
  for(int i=0;i<24;i++){
   face(0,22,0);
   point(0,circle[i][0]*radius,2.14,centre+circle[i][1]*radius,0,0);
   point(1,circle[i+1][0]*radius,2.14,centre+circle[i+1][1]*radius,0,0);
   point(2,circle[i+1][0]*radius,2.18,centre+circle[i+1][1]*radius,0,0);
   point(3,circle[i][0]*radius,2.18,centre+circle[i][1]*radius,0,0);
  }
 }else if(type==3){
  part(0,0,.25,2.1,4.7,.78,23,24);
  part(0,-.3,1.03,1.85,2.9,.8,25,26);
  part(0,-.3,1.83,1.98,3.05,.16,26,27);
  for(int side=-1;side<=1;side+=2){
   double alongs[3]={-1.7,-.3,1.1};
   for(int i=0;i<3;i++)part(side*.94,alongs[i],1.02,.1,.13,.82,28,28);
   part(side*1.03,-1.55,.55,.16,1.05,.28,29,29);
   part(side*1.03,1.5,.55,.16,1.05,.28,29,29);
   part(side*.96,-.8,.91,.08,.28,.06,30,30);
   part(side*.96,.5,.91,.08,.28,.06,30,30);
  }
  part(0,2.36,.42,1.02,.08,.48,31,31);
  double across[5]={-.36,-.18,0,.18,.36};
  for(int i=0;i<5;i++)part(across[i],2.41,.47,.055,.03,.37,32,32);
  part(0,-2.38,.29,1.95,.12,.12,31,31);
  part(0,2.38,.29,1.95,.12,.12,31,31);
  part(0,.5,1.99,.82,.36,.28,33,34);
  for(int side=-1;side<=1;side+=2){
   double along=.5+side*.181,left=side*dir*(axis?-1:1)*.41;
   face(0,33,5);
   point(0,left,along,1.99,0,56);point(1,-left,along,1.99,160,56);
   point(2,-left,along,2.27,160,0);point(3,left,along,2.27,0,0);
  }
 }else{
  box(x,.25,z,w,.65,d,0,0);
  box(x+(axis?1:.15),.9,z+(axis?.15:1),axis?2.5:1.8,.6,axis?1.8:2.5,1,2);
 }
 for(int side=-1;side<=1;side+=2)for(int i=0;i<2;i++){
  double offset=i?3.5:.8;
  if(axis)box(x+offset,.12,side*1.05-.1,.7,.55,.2,3,3);
  else box(side*1.05-.1,.12,z+offset,.2,.55,.7,3,3);
 }
 double frontX=axis?dir*2.36:0,frontZ=axis?0:dir*2.36;
 if(type!=1)for(int side=-1;side<=1;side+=2)
  box(frontX+(axis?-.04:side*.7-.2),.52,frontZ+(axis?side*.7-.2:-.04),axis?.08:.4,.2,axis?.4:.08,35,35);
 return count;
}
