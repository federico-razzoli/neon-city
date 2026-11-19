// SPDX-License-Identifier: AGPL-3.0-only
import * as THREE from './vendor/three/three.module.js';
import {RIVER_WALK_HEIGHT} from './world.js';
import {RIVER_WISPS} from './river-grates.js';

// Will-o'-the-wisps glimpsed through a river gate. They float just in front of
// the gate's black recess, behind the bars; small, soft and with nothing around
// them to judge depth by, they read as lights deep in a tunnel.
const SIZE=.05,SPEED=.6,DEPTH=.26,HEIGHT=RIVER_WALK_HEIGHT+1.35,FADE_IN=.5,FADE_OUT=.6;

export function createThreeRiverWisps(scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),glow=ctx.createRadialGradient(32,32,0,32,32,32);
  glow.addColorStop(0,'rgba(255,255,255,1)');glow.addColorStop(.16,'rgba(205,255,238,.95)');
  glow.addColorStop(.42,'rgba(95,230,205,.38)');glow.addColorStop(1,'rgba(40,150,170,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const group=new THREE.Group();group.name='river-wisps';group.visible=false;scene.add(group);
  const wisps=Array.from({length:RIVER_WISPS.count},(_,i)=>{
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,blending:THREE.AdditiveBlending,
      depthWrite:false,fog:false,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.name=`river-wisp-${i}`;group.add(sprite);
    return {sprite,material,phase:i*Math.PI/2,home:(i-(RIVER_WISPS.count-1)/2)*.16};
  });
  return {
    update(view){
      group.visible=Boolean(view);
      if(!view)return;
      const {t}=view,m=t*SPEED,envelope=Math.max(0,Math.min(1,t/FADE_IN,(RIVER_WISPS.dance-t)/FADE_OUT));
      for(const [i,{sprite,material,phase,home}] of wisps.entries()){
        // Each wisp weaves on its own figure, crossing and bobbing past the others.
        const x=home+.09*Math.sin(2.1*m+phase)+.03*Math.sin(5.3*m+2*phase);
        const y=.05*Math.sin(3.1*m+1.7*phase)+.02*Math.sin(7*m+i);
        sprite.position.set(view.x+x,HEIGHT+y,-view.bank+view.dir*DEPTH);
        sprite.scale.setScalar(SIZE*(.7+.3*envelope));
        material.opacity=envelope*(.72+.28*Math.sin(11*m+i*2.3));
      }
    },
    dispose(){scene.remove(group);for(const {material} of wisps)material.dispose();texture.dispose();}
  };
}
