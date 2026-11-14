// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {BLOCK,RIVER_WIDTH,WATER_LEVEL} from './world.js';
import {createRiverFishResources,createRiverSchool,riverSchoolPlacements} from './three-river-fish.js';

// One material serves every visible river chunk. World-space
// waves stay continuous across chunk boundaries; chunks retain their GPU mesh.
export function createThreeRiverWater(scene){
  const group=new THREE.Group();group.name='river-water';scene.add(group);
  const geometry=new THREE.PlaneGeometry(BLOCK,RIVER_WIDTH/2,32,24);geometry.rotateX(-Math.PI/2);
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.06;
  // The river runs along world X. Advect every wave at the same speed on
  // that axis; Z only bends the crests, never sends waves across the banks.
  const waves=`
    vec3 riverWave(vec2 p,float time){
      float flow=p.x-time*0.8;
      float a=flow*0.72+0.18*sin(p.y*0.22);
      float b=flow*1.37+0.25*sin(p.y*0.47);
      return vec3(0.035*sin(a)+0.018*sin(b),
        0.0252*cos(a)+0.02466*cos(b),
        0.001386*cos(p.y*0.22)*cos(a)+0.002115*cos(p.y*0.47)*cos(b));
    }`;
  const material=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},riverStart:{value:0}},
    vertexShader:`
      uniform float time;
      uniform float riverStart;
      varying vec3 waterPosition;
      varying float bankDistance;
      ${waves}
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        bankDistance=min(-world.z-riverStart,riverStart+${RIVER_WIDTH.toFixed(1)}+world.z);
        float shore=smoothstep(0.0,4.0,bankDistance);
        world.y+=shore*riverWave(world.xz,time).x;
        waterPosition=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader:`
      uniform float time;
      varying vec3 waterPosition;
      varying float bankDistance;
      ${waves}
      void main(){
        vec2 p=waterPosition.xz;
        float shore=smoothstep(0.0,4.0,bankDistance);
        vec3 wave=riverWave(p,time);
        vec3 normal=normalize(vec3(-shore*wave.y,1.0,-shore*wave.z));
        vec3 water=vec3(0.012,0.047,0.060);
        // Soft diffuse shading makes the moving crests visible without a
        // reflected scene, reflected sky, or specular moon streak.
        float light=dot(normal,normalize(vec3(-0.6,0.7,0.2)));
        vec3 color=water*(0.82+0.3*light+wave.x*2.0);
        float distanceToEye=length(cameraPosition-waterPosition);
        color=mix(color,vec3(0.0048,0.0030,0.012),smoothstep(22.0,170.0,distanceToEye));
        // A uniform veil of water keeps submerged fish only faintly visible.
        gl_FragColor=vec4(color,0.84);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,toneMapped:false,transparent:true,depthWrite:false
  });
  const parts=new Map(),fishResources=createRiverFishResources();
  let time=0;
  return {
    beginFrame(frame){time=frame.time;material.uniforms.time.value=frame.time;for(const part of parts.values())part.seen=false;},
    draw(chunk){
      const key=`${chunk.x},${chunk.z}`;
      let part=parts.get(key);
      if(!part){
        const start=chunk.riverStart*BLOCK+18,low=Math.max(chunk.z*BLOCK,start),high=Math.min((chunk.z+1)*BLOCK,start+RIVER_WIDTH);
        const mesh=new THREE.Mesh(geometry,material);mesh.name=`river-water:${key}`;
        mesh.scale.z=(high-low)/(RIVER_WIDTH/2);mesh.position.set(chunk.x*BLOCK+BLOCK/2,WATER_LEVEL,-(low+high)/2);
        const schools=riverSchoolPlacements(fishResources.seed,Math.floor(chunk.x/3),chunk.riverStart)
          .filter(p=>Math.floor(p.x/BLOCK)===chunk.x&&p.z>=low&&p.z<high)
          .map(p=>createRiverSchool(fishResources,p));
        for(const school of schools)scene.add(school.group);
        mesh.onBeforeRender=()=>{material.uniforms.riverStart.value=start;material.uniformsNeedUpdate=true;};
        group.add(mesh);part={mesh,schools,seen:true};parts.set(key,part);
      }
      part.seen=true;for(const school of part.schools)school.update(time);material.uniforms.riverStart.value=chunk.riverStart*BLOCK+18;
    },
    endFrame(){for(const [key,part] of parts)if(!part.seen){group.remove(part.mesh);for(const school of part.schools)scene.remove(school.group);parts.delete(key);}},
    dispose(){scene.remove(group);for(const part of parts.values())for(const school of part.schools)scene.remove(school.group);parts.clear();fishResources.dispose();geometry.dispose();material.dispose();}
  };
}
