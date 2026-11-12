/* SPDX-License-Identifier: AGPL-3.0-only */
/* Each face: count, normal x/y/z, then up to six x/y/z/u/v vertices. */
static double output[7*34];
__attribute__((export_name("output"))) double *output_buffer(void){return output;}
static void face(int f,int count,double nx,double ny,double nz){
 double *p=output+f*34;p[0]=count;p[1]=nx;p[2]=ny;p[3]=nz;
}
static void vertex(int f,int i,double x,double y,double z,double u,double v){
 double *p=output+f*34+4+i*5;p[0]=x;p[1]=y;p[2]=z;p[3]=u;p[4]=v;
}
__attribute__((export_name("board")))
void board(double dx,double dz,double bottom,double top,double start,double reach,double tip,double width,double rows){
 double a[5]={start,reach-tip,reach,reach-tip,start};
 double y[5]={bottom,bottom,(bottom+top)/2,top,top};
 for(int f=0;f<2;f++){
  int side=f?1:-1;
  face(f,5,side*dz,0,-side*dx);
  for(int i=0;i<5;i++)vertex(f,i,side*.035*dz+dx*a[i],y[i],-side*.035*dx+dz*a[i],(side>0?a[i]-start:reach-a[i])/(reach-start)*width,(top-y[i])/(top-bottom)*rows);
 }
 for(int i=0;i<5;i++){
  int j=(i+1)%5;
  face(i+2,4,(y[j]-y[i])*dx,a[i]-a[j],(y[j]-y[i])*dz);
  for(int v=0;v<4;v++){
   int k=(v==1||v==2)?j:i,side=v<2?-1:1;
   vertex(i+2,v,side*.035*dz+dx*a[k],y[k],-side*.035*dx+dz*a[k],0,0);
  }
 }
}
/* Original JS band() samples, including a1=a0+2*Math.PI/6 rounding. */
static const double directions[6][6]={
 {1,0,0.5000000000000001,0.8660254037844386,0.8660254037844387,0.49999999999999994},
 {0.5000000000000001,0.8660254037844386,-0.4999999999999998,0.8660254037844387,6.123233995736766e-17,1},
 {-0.4999999999999998,0.8660254037844387,-1,1.2246467991473532e-16,-0.8660254037844385,0.5000000000000003},
 {-1,1.2246467991473532e-16,-0.5000000000000004,-0.8660254037844385,-0.8660254037844388,-0.4999999999999997},
 {-0.5000000000000004,-0.8660254037844385,0.49999999999999933,-0.866025403784439,-1.8369701987210297e-16,-1},
 {0.5000000000000001,-0.8660254037844386,1,-2.4492935982947064e-16,0.8660254037844388,-0.49999999999999967}
};
__attribute__((export_name("pole")))
void pole(double height,double radius){
 for(int f=0;f<6;f++){
  const double *d=directions[f];
  face(f,4,d[4]*height,0,d[5]*height);
  vertex(f,0,d[0]*radius,0,d[1]*radius,0,0);
  vertex(f,1,d[2]*radius,0,d[3]*radius,0,0);
  vertex(f,2,d[2]*radius,height,d[3]*radius,0,0);
  vertex(f,3,d[0]*radius,height,d[1]*radius,0,0);
 }
 face(6,6,0,1,0);
 for(int i=0;i<6;i++)vertex(6,i,directions[i][0]*radius,height,directions[i][1]*radius,0,0);
}
