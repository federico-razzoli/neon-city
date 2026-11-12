/* SPDX-License-Identifier: AGPL-3.0-only */
/* Two boxes (five quads each), then the textured front. x/y/z/u/v per vertex. */
static double geometry[11*4*5];
__attribute__((export_name("output"))) double *output_buffer(void) { return geometry; }
static void vertex(int face,int i,double x,double y,double z,double u,double v){
  double *p=geometry+(face*4+i)*5;
  p[0]=x;p[1]=y;p[2]=z;p[3]=u;p[4]=v;
}
static void box(int first,double x,double y,double z,double w,double h,double d){
  double xs[4]={x,x+w,x+w,x},zs[4]={z,z,z+d,z+d};
  int corners[5][4]={{0,1,1,0},{2,3,3,2},{3,0,0,3},{1,2,2,1},{0,1,2,3}};
  for(int f=0;f<5;f++)for(int i=0;i<4;i++){
    int c=corners[f][i];
    vertex(first+f,i,xs[c],(f==4||i>=2)?y+h:y,zs[c],0,0);
  }
}
__attribute__((export_name("build")))
void build(int side,double w,double d){
  double scale=.85,top=.08+1.45*.9*scale,front=.45*scale+.001;
  int dx=side==2?-1:side==3?1:0,dz=side==0?-1:side==1?1:0;
  box(0,-w/2,.08,-d/2,w,1.45*.9*scale,d);
  double cw=w+(side<2?.06:.054)*scale,cd=d+(side<2?.054:.06)*scale;
  box(5,dx*.027*scale-cw/2,top,dz*.027*scale-cd/2,cw,.08*.9*scale,cd);
  for(int i=0;i<4;i++){
    double u=(i==0||i==3)?-.5*scale:.5*scale;
    double x=side<2?(side==0?u:-u):dx*front;
    double z=side<2?dz*front:(side==2?-u:u);
    vertex(10,i,x,i<2?.08:top,z,(i==0||i==3)?0:160,i<2?224:0);
  }
}
