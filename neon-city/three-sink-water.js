// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {Reflector} from './vendor/three/Reflector.js';
import {tapStream} from './lavatory.js?v=staff-room-1';

const vertexShader=`
  uniform mat4 textureMatrix;
  varying vec4 vReflection;
  varying vec2 vLocal;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vEye;
  void main(){
    vReflection=textureMatrix*vec4(position,1.0);
    vLocal=position.xy;vHeight=position.y+.5;
    vec4 eye=modelViewMatrix*vec4(position,1.0);
    vNormal=normalize(normalMatrix*normal);vEye=-eye.xyz;
    gl_Position=projectionMatrix*eye;
  }
`;
const streamShader=`
  uniform float time;
  uniform vec3 blue;
  uniform vec3 pale;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vEye;
  void main(){
    float streak=step(.82,fract(vHeight*3.0+time*3.5));
    float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),2.0);
    gl_FragColor=vec4(mix(blue,pale,.18+streak*.48+rim*.28),.46+rim*.25);
    #include <colorspace_fragment>
  }
`;
const basinShader=`
  uniform sampler2D tDiffuse;
  varying vec4 vReflection;
  varying vec3 vNormal;
  varying vec3 vEye;
  uniform float time;
  uniform float activity;
  uniform vec2 impact;
  uniform vec3 blue;
  uniform vec3 pale;
  varying vec2 vLocal;
  void main(){
    float distanceFromTap=length(vLocal-impact);
    float rings=0.0;
    for(int i=0;i<3;i++){
      float age=fract(time*1.8+float(i)/3.0);
      float radius=.012+age*.19;
      float band=1.0-smoothstep(.002,.007,abs(distanceFromTap-radius));
      rings+=band*(1.0-age);
    }
    float shimmer=step(.92,sin(vLocal.x*72.0+vLocal.y*33.0+time*1.6))*.1;
    float highlight=clamp(rings*activity*.75+shimmer*(.15+activity*.85),0.0,1.0);
    vec2 ripple=vec2(sin(distanceFromTap*95.0-time*9.0),cos(distanceFromTap*83.0-time*8.0));
    vec4 projected=vReflection;
    projected.xy+=ripple*.002*activity*projected.w;
    vec3 reflected=texture2DProj(tDiffuse,projected).rgb;
    float fresnel=pow(1.0-abs(dot(normalize(vNormal),normalize(vEye))),3.0);
    vec3 water=mix(blue,pale,highlight);
    gl_FragColor=vec4(mix(water,reflected,.45+fresnel*.4),.55+fresnel*.3);
    #include <colorspace_fragment>
  }
`;

// Retained meshes and shared geometry; animation changes uniforms/transforms only.
export function createThreeSinkWater(sinks){
  const group=new THREE.Group();group.name='lavatory-water';
  const streamGeometry=new THREE.CylinderGeometry(.017,.009,1,8,8,true);
  const dropGeometry=new THREE.SphereGeometry(1,4,3);
  const dropMaterial=new THREE.MeshBasicMaterial({color:'#d5edf4',transparent:true,opacity:.65,depthWrite:false,toneMapped:false});
  const resources=new Set([streamGeometry,dropGeometry,dropMaterial]);
  const entries=sinks.map((sink,index)=>{
    const flow=tapStream(sink),bottom=.9425;
    const uniforms=()=>({time:{value:0},blue:{value:new THREE.Color('#6fa9bf')},pale:{value:new THREE.Color('#eaf7fc')}});
    const streamMaterial=new THREE.ShaderMaterial({uniforms:uniforms(),vertexShader,fragmentShader:streamShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    const stream=new THREE.Mesh(streamGeometry,streamMaterial);stream.name=`lavatory-water-stream-${index}`;
    stream.position.set(flow.x,(flow.top+bottom)/2,-flow.z);stream.scale.y=flow.top-bottom;stream.visible=false;
    const width=sink.w-.2,depth=sink.d-.16,cx=sink.x+.07+width/2,cz=sink.z+.08+depth/2;
    const surfaceGeometry=new THREE.PlaneGeometry(width,depth);
    const surface=new Reflector(surfaceGeometry,{textureWidth:320,textureHeight:180,multisample:0,clipBias:.001,shader:{
      uniforms:{...uniforms(),color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},activity:{value:0},impact:{value:new THREE.Vector2(flow.x-cx,flow.z-cz)}},
      vertexShader,fragmentShader:basinShader
    }});
    const surfaceMaterial=surface.material;
    surfaceMaterial.transparent=true;surfaceMaterial.depthWrite=false;surfaceMaterial.side=THREE.DoubleSide;surfaceMaterial.toneMapped=false;
    surface.name=`lavatory-water-basin-${index}`;
    surface.rotation.x=-Math.PI/2;surface.position.set(cx,bottom,-cz);
    const drops=Array.from({length:5},(_,i)=>{
      const mesh=new THREE.Mesh(dropGeometry,dropMaterial);mesh.name=`lavatory-water-drop-${index}-${i}`;mesh.visible=false;group.add(mesh);return mesh;
    });
    group.add(stream,surface);
    for(const resource of [streamMaterial,surfaceGeometry])resources.add(resource);
    return {flow,stream,surface,drops,activity:0};
  });
  let previous=null,time=0,disposed=false;
  return {group,reflectors:entries.map(entry=>entry.surface),
    update(taps,seconds,animate=true){
      if(disposed)return;
      const dt=previous===null||!animate?0:Math.max(0,seconds-previous);previous=seconds;time+=dt;
      entries.forEach((entry,index)=>{
        const open=!!taps[index];entry.activity=open?1:Math.max(0,entry.activity-dt/1.6);
        const {stream,surface,flow,drops,activity}=entry;
        stream.visible=open;stream.material.uniforms.time.value=time;
        surface.material.uniforms.time.value=time;surface.material.uniforms.activity.value=activity;
        drops.forEach((mesh,i)=>{
          const age=(time*2.8+i/drops.length)%1,angle=i*2.39996;
          const distance=.008+age*.055;
          mesh.visible=activity>.65;
          mesh.position.set(flow.x+Math.cos(angle)*distance,.944+Math.sin(age*Math.PI)*.035,-flow.z-Math.sin(angle)*distance);
          const size=(.0045+(i%2)*.0015)*Math.min(1,activity*2)*(1-age*.5);
          mesh.scale.set(size,size*1.4,size);
        });
      });
    },
    dispose(){if(disposed)return;disposed=true;for(const entry of entries)entry.surface.dispose();for(const resource of resources)resource.dispose();resources.clear();group.clear();}
  };
}
