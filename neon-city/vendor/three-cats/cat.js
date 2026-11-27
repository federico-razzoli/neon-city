// SPDX-License-Identifier: AGPL-3.0-only
export function createCatState({purrDurationMs=10000,awakeDurationMs=20000}={}){
  for(const [name,value] of Object.entries({purrDurationMs,awakeDurationMs})){
    if(!Number.isFinite(value)||value<0)throw new RangeError(name+' must be a finite, nonnegative duration in milliseconds');
  }
  const lieDownMs=2500;
  let catPurrUntil=0;
  let catWoke=-Infinity,catTouched=-Infinity,catAlertAtTouch=0;
  function easeCat(t){
    const u=Math.max(0,Math.min(1,t));
    return u*u*(3-2*u);
  }
  function pose(now=performance.now()){
    const idle=now-catTouched;
    const alert=catAlertAtTouch+(1-catAlertAtTouch)*easeCat(idle/600);
    const awake=alert*(1-easeCat((idle-awakeDurationMs)/lieDownMs));
    const age=now-catWoke;
    const stretch=awake*easeCat(age/650)*(1-easeCat((age-950)/850));
    return {stretch,sit:awake*easeCat((age-950)/850)};
  }
  function pet(now=performance.now()){
    const idle=now-catTouched;
    const asleep=idle>=awakeDurationMs+lieDownMs;
    catAlertAtTouch=asleep?0:1-easeCat((idle-awakeDurationMs)/lieDownMs);
    if(asleep)catWoke=now;
    catTouched=now;
    if(catPurrUntil>now)catPurrUntil+=2*purrDurationMs;
    else if(!asleep)catPurrUntil=now+purrDurationMs;
    return catPurrUntil>now;
  }
  return {pose,pet,get purrUntil(){return catPurrUntil;}};
}

function createCatPurr(THREE,context,camera,root,refDistance){
  THREE.AudioContext.setContext(context);
  const listener=new THREE.AudioListener();
  camera.add(listener);
  const sound=new THREE.PositionalAudio(listener);
  root.add(sound);
  sound.position.y=.12;
  sound.setDistanceModel('linear');
  sound.setRefDistance(refDistance);
  sound.setMaxDistance(4.5);
  const volume=.17;
  const rate=12000,buffer=context.createBuffer(1,rate*2,rate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++){
    const t=i/rate,breath=Math.sin(Math.PI*t);
    const phase=2*Math.PI*26*t+.55*breath;
    const pulse=.52+.48*Math.cos(phase);
    const rumble=.21*Math.sin(2*phase)+.19*Math.sin(4*phase);
    const rasp=pulse*(.33*Math.sin(8*phase)+.17*Math.sin(11*phase)+.09*Math.sin(15*phase));
    samples[i]=(rumble+rasp)*(.42+.58*Math.abs(breath))*(.9+.1*breath);
  }
  sound.setBuffer(buffer);
  sound.setLoop(true);
  return {
    play(seconds){
      const continuing=sound.isPlaying;
      if(!continuing)sound.play();
      const now=context.currentTime,end=now+seconds;
      const gain=sound.gain.gain;
      const level=continuing?gain.value:0;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(level,now);
      gain.linearRampToValueAtTime(volume,now+Math.min(.08,seconds/3));
      gain.setValueAtTime(volume,end-Math.min(.2,seconds/3));
      gain.linearRampToValueAtTime(0,end);
      sound.source.stop(end);
    },
    dispose(){
      if(sound.isPlaying)sound.stop();
      sound.disconnect();
      sound.gain.disconnect();
      listener.gain.disconnect();
      listener.removeFromParent();
    }
  };
}
export function createCat(THREE,{scene,camera,position,rotationY=0,purrDurationMs,awakeDurationMs,state=createCatState({purrDurationMs,awakeDurationMs}),refDistance=2.58}){
  let purr,scheduledUntil=0;
  let nextBlink=0;
  let lookYaw=0,lookPitch=0,lastLookTime=performance.now();
  const viewer=new THREE.Vector3();
  const root=new THREE.Group(),head=new THREE.Group();
  if(position)root.position.copy(position);
  root.rotation.y=rotationY;
  scene.add(root);
  root.add(head);
  const oval=new THREE.SphereGeometry(1,18,12);
  const wedge=new THREE.ConeGeometry(1,1,3);
  const coat=color=>new THREE.MeshBasicMaterial({color,toneMapped:false});
  const fur=coat(0x080809),shadow=coat(0x030304),cheek=coat(0x101011);
  const amber=coat(0xdaac52),innerEar=coat(0x493438),whisker=coat(0x756e67);
  function part(parent,shape,material,x,y,z,w,h,d){
    const mesh=new THREE.Mesh(shape,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,h,d);
    parent.add(mesh);
    return mesh;
  }
  const ball=(parent,material,x,y,z,w,h,d)=>part(parent,oval,material,x,y,z,w,h,d);
  const rump=ball(root,fur,0,0,0,.104192,.1056,.11264);
  const chest=ball(root,fur,0,0,0,.078144,.08448,.08448);
  const spine=ball(root,fur,0,0,0,.08448,.08448,.12672);
  ball(head,fur,0,.00704,0,.085888,.076736,.073216);
  const legs=[],eyes=[];
  for(const side of [-1,1]){
    const ear=part(head,wedge,fur,side*.05632,.07744,0,.052096,.10208,.040128);
    ear.rotation.z=-side*.23;
    const lining=part(head,wedge,innerEar,side*.057728,.08096,.021824,.03168,.061248,.011264);
    lining.rotation.z=ear.rotation.z;
    const eye=ball(head,amber,side*.037312,.019712,.064064,.02112,.009856,.007744);
    eye.rotation.z=side*.18;
    ball(eye,shadow,0,0,.87,.17,.94,.35);
    eyes.push(eye);
    ball(head,cheek,side*.018304,-.016192,.0704,.027456,.021824,.027456);
    for(const tilt of [-.13,.14]){
      const hair=ball(head,whisker,side*.061248,-.016192+tilt*.02816,.085888,.04576,.0012672,.0012672);
      hair.rotation.z=side*tilt;
    }
    legs.push({
      side,
      thigh:ball(root,shadow,0,0,0,.059136,.09152,.096448),
      hindPaw:ball(root,shadow,side*.078848,.022528,0,.034496,.022528,.065472),
      shin:ball(root,cheek,0,0,0,.025344,.0704,.02816),
      paw:ball(root,cheek,side*.047168,.018304,0,.030976,.018304,.045056)
    });
  }
  const nose=part(head,wedge,innerEar,0,-.009152,.097152,.015488,.01408,.007744);
  nose.rotation.z=Math.PI;
  const tailPath=new THREE.CatmullRomCurve3([
    [0,.06336,-.13376],[.06336,.03872,-.176],[.13376,.023936,-.11968],[.145024,.020416,-.011968],
    [.124608,.019712,.074624],[.075328,.019712,.11264],[.050688,.026048,.10912]
  ].map(([x,y,z])=>new THREE.Vector3(x,y,z)));
  const tailShape=new THREE.TubeGeometry(tailPath,32,.019008,8,false);
  const vertices=tailShape.attributes.position,vertex=new THREE.Vector3();
  for(let ring=0;ring<=32;ring++){
    const centre=tailPath.getPointAt(ring/32);
    for(let j=0;j<=8;j++){
      const i=ring*9+j;
      vertex.fromBufferAttribute(vertices,i).sub(centre).multiplyScalar(1-.92*(ring/32)**3).add(centre);
      vertices.setXYZ(i,vertex.x,vertex.y,vertex.z);
    }
  }
  const tail=new THREE.Mesh(tailShape,shadow);
  root.add(tail);
  // Join the shoulders to the hips and the forelegs to their planted paws.
  function span(mesh,y1,z1,y2,z2,padding){
    mesh.position.y=(y1+y2)/2;
    mesh.position.z=(z1+z2)/2;
    mesh.rotation.x=Math.atan2(z2-z1,y2-y1);
    mesh.scale.y=Math.hypot(y2-y1,z2-z1)/2+padding;
  }
  function update(frame){
    const now=performance.now();
    const catPurrUntil=state.purrUntil;
    if(catPurrUntil>now&&scheduledUntil!==catPurrUntil&&frame?.audioContext?.state==='running'){
      purr??=createCatPurr(THREE,frame.audioContext,camera,root,refDistance);
      purr.play((catPurrUntil-now)/1000);
      scheduledUntil=catPurrUntil;
    }
    const {sit,stretch}=state.pose(now);
    const hipY=.076032+.026048*sit+.109824*stretch,hipZ=-.06688-.025344*stretch;
    const shoulderY=.073216+.164032*sit+.015488*stretch,shoulderZ=.0528+.014784*sit+.052096*stretch;
    rump.position.set(0,hipY,hipZ);
    rump.scale.y=.076032+.026048*sit+.009152*stretch;
    chest.position.set(0,shoulderY,shoulderZ);
    chest.scale.y=.065472+.019008*sit;
    span(spine,hipY,hipZ,shoulderY,shoulderZ,.046464);
    head.position.set(.058432*(1-sit-stretch),shoulderY+.008448+.08448*sit+.011264*stretch,shoulderZ+.03872+.0176*stretch);
    const resting=1-sit-stretch,baseYaw=1.64*resting-.23*sit,basePitch=.44*resting;
    camera.getWorldPosition(viewer);
    root.worldToLocal(viewer).sub(head.position);
    const attention=1-THREE.MathUtils.smoothstep(viewer.length(),1.2,2.5);
    const yaw=Math.atan2(viewer.x,viewer.z)-baseYaw;
    const pitch=-Math.atan2(viewer.y,Math.hypot(viewer.x,viewer.z))-basePitch;
    const blend=1-Math.exp(-.006*Math.min(now-lastLookTime,100));
    lastLookTime=now;
    lookYaw+=(attention*THREE.MathUtils.clamp(Math.atan2(Math.sin(yaw),Math.cos(yaw)),-.65,.65)-lookYaw)*blend;
    lookPitch+=(attention*THREE.MathUtils.clamp(pitch,-.3,.3)-lookPitch)*blend;
    head.rotation.set(basePitch,baseYaw,-.24*resting);
    head.rotateOnWorldAxis(THREE.Object3D.DEFAULT_UP,lookYaw*sit);
    head.rotateX(lookPitch*sit);
    const awakeEyes=.0088*sit+.004224*stretch;
    let squint=0;
    if(awakeEyes>0&&attention>0){
      if(!nextBlink||now>=nextBlink+1500)nextBlink=now+4500+Math.random()*5500;
      if(now>nextBlink)squint=.35*attention*Math.sin(Math.PI*(now-nextBlink)/1500)**2;
    }else nextBlink=0;
    for(const eye of eyes)eye.scale.y=.001056+awakeEyes*(1-squint);
    for(const {side,thigh,hindPaw,shin,paw} of legs){
      thigh.position.set(side*.061952,hipY-.009856,hipZ+.009856);
      thigh.scale.y=hipY-.01056;
      hindPaw.position.z=hipZ+.05632;
      paw.position.z=.053504+.059136*sit+.171776*stretch;
      shin.position.x=side*.047168;
      span(shin,.026752,paw.position.z-.016192,shoulderY,shoulderZ,.008448);
    }
    tail.rotation.x=-.77*stretch;
    tail.position.y=.1056*stretch;
  }
  update();
  return {state,update,dispose(){
    purr?.dispose();
    root.removeFromParent();
    for(const resource of [oval,wedge,tailShape,fur,shadow,cheek,amber,innerEar,whisker])resource.dispose();
  }};
}
