// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {Reflector} from './vendor/three/Reflector.js';
import {createThreeInteriorScene} from './three-interior-scene.js';
import {LAVATORY,drawLavatory,drawLavatoryWater,drawCubicle,mirrorOf,playerSilhouetteContours} from './lavatory.js?v=staff-room-1';
import {bansheeFrame,drawBanshee} from './banshee.js?v=6';
import {NATIVE_VIEW} from './render-camera.js';

export function createThreeLavatoryScene({imageFor}={}){
  return createThreeInteriorScene({name:'lavatory',imageFor,
    drawRoom:helpers=>drawLavatory({...helpers,drawIndicators:false,drawMirrorGlass:false}),
    actorsFor:frame=>frame.lavatoryLife?.walker?[frame.lavatoryLife.walker]:[],
    createExtras({scene,builder,material}){
      const flags=LAVATORY.cubicles.map((c,i)=>[false,true].map(occupied=>{
        const mesh=new THREE.Mesh(builder.build(({box})=>box(c.x-c.halfWidth+.15,1.22,LAVATORY.depth-.1,.14,.06,.04,occupied?'#d23a32':'#3f9a4c')),material);
        mesh.name=`lavatory-flag-${i}-${occupied?'engaged':'vacant'}`;scene.add(mesh);return mesh;
      }));
      // Water repeats every six ticks (two band colors and three splash sizes).
      const water=LAVATORY.sinks.map((sink,i)=>Array.from({length:6},(_,tick)=>{
        const mesh=new THREE.Mesh(builder.build(helpers=>drawLavatoryWater(helpers,sink,(tick+.1)/14)),material);
        mesh.name=`lavatory-water-${i}-${tick}`;scene.add(mesh);return mesh;
      }));
      const mirrors=LAVATORY.sinks.map((sink,i)=>{
        const m=mirrorOf(sink),geometry=new THREE.PlaneGeometry(m.z1-m.z0,m.y1-m.y0);
        const mirror=new Reflector(geometry,{textureWidth:640,textureHeight:360,multisample:0,clipBias:0,color:0x7f7f7f});
        mirror.name=`lavatory-mirror-${i}`;mirror.position.set(m.x-.002,(m.y0+m.y1)/2,-(m.z0+m.z1)/2);
        mirror.rotation.y=-Math.PI/2;
        mirror.getRenderTarget().texture.magFilter=THREE.NearestFilter;
        mirror.getRenderTarget().texture.minFilter=THREE.NearestFilter;
        scene.add(mirror);return mirror;
      });
      const silhouette=new THREE.Group();silhouette.name='lavatory-player-silhouette';scene.add(silhouette);
      const silhouetteMaterial=new THREE.MeshBasicMaterial({color:'#0b0b10',toneMapped:false});
      const legs=[[[.025,.95],[.17,.95],[.16,0],[.035,0]],[[-.17,.95],[-.025,.95],[-.035,0],[-.16,0]]];
      for(const [i,points] of [...playerSilhouetteContours(),...legs].entries()){
        const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
        const depth=i===0?.20:.16;
        const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});geometry.translate(0,0,-depth/2);
        const mesh=new THREE.Mesh(geometry,silhouetteMaterial);mesh.layers.set(1);silhouette.add(mesh);
      }
      for(const mirror of mirrors){
        const reflect=mirror.onBeforeRender;
        mirror.onBeforeRender=function(renderer,scene,camera){
          // Layer 1 contains only the player's body; the normal camera uses 0.
          this.getReflectionCamera(camera).layers.enable(1);
          const visibility=mirrors.map(other=>other.visible);
          mirrors.forEach(other=>{if(other!==this)other.visible=false;});
          try{reflect.call(this,renderer,scene,camera);}
          finally{mirrors.forEach((other,i)=>{other.visible=visibility[i];});}
        };
      }
      return {
        update(frame){
          flags.forEach((pair,i)=>pair.forEach((mesh,j)=>{mesh.visible=(frame.lavatoryOccupied[i]!==false)===!!j;}));
          const tick=Math.floor(performance.now()/1000*14)%6;
          water.forEach((frames,i)=>frames.forEach((mesh,j)=>{mesh.visible=!!frame.lavatoryTaps[i]&&j===tick;}));
          silhouette.position.set(frame.player.x,frame.eye-1.65,-frame.player.z);
          silhouette.rotation.y=-frame.player.angle;
        },
        dispose(){
          for(const mesh of [...flags.flat(),...water.flat()])mesh.geometry.dispose();
          for(const mirror of mirrors){mirror.geometry.dispose();mirror.dispose();}
          for(const mesh of silhouette.children)mesh.geometry.dispose();silhouetteMaterial.dispose();
        }
      };
    }
  });
}

export function createThreeCubicleScene(){
  const room=createThreeInteriorScene({name:'cubicle',drawRoom:drawCubicle,actorsFor:()=>[]});
  let overlay;
  return {...room,
    renderOverlay(renderer,frame){
      if(!frame.banshee)return;
      const seconds=(performance.now()-frame.banshee.started)/1000,state=bansheeFrame(seconds);
      if(!state.dark&&!state.opacity)return;
      if(!overlay){
        const canvas=document.createElement('canvas');canvas.width=NATIVE_VIEW.width;canvas.height=NATIVE_VIEW.height;
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
        texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
        const geometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene();scene.add(new THREE.Mesh(geometry,material));
        overlay={canvas,texture,material,geometry,scene,camera:new THREE.OrthographicCamera(-1,1,1,-1,0,2)};
        overlay.camera.position.z=1;
      }
      const ctx=overlay.canvas.getContext('2d');ctx.clearRect(0,0,overlay.canvas.width,overlay.canvas.height);
      if(state.dark){ctx.fillStyle='#000';ctx.fillRect(0,0,overlay.canvas.width,overlay.canvas.height);}
      if(state.opacity)drawBanshee(ctx,overlay.canvas.width,overlay.canvas.height,seconds,state.opacity);
      overlay.texture.needsUpdate=true;
      const autoClear=renderer.autoClear;renderer.autoClear=false;
      try{renderer.render(overlay.scene,overlay.camera);}finally{renderer.autoClear=autoClear;}
    },
    dispose(){room.dispose();if(overlay){overlay.geometry.dispose();overlay.material.dispose();overlay.texture.dispose();overlay=null;}}
  };
}
