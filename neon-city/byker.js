// BYKER — a continuous, metre-scaled mountain road viewed from the saddle.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const W=640,H=360,F=340,HALF=3.8,FAR=1300;
export class Byker{
  kind='byker';width=W;height=H;
  constructor(random=Math.random){
    this.random=random;this.phase=random()*100;this.distance=0;this.speed=26;this.x=0;this.lean=0;
    this.lives=3;this.score=0;this.level=1;this.time=55;this.length=2600;this.over=false;
    this.combo=0;this.bestCombo=0;this.nearMisses=0;this.invulnerable=0;this.crash=0;this.elapsed=0;
    this.message='COL DU SOLEIL';this.messageTime=4;this.obstacles=[];this.nextTraffic=110;
    this.populate();
  }
  centre(z){return Math.sin(z/310+this.phase)*75+Math.sin(z/780+this.phase)*130;}
  tangent(z){return Math.cos(z/310+this.phase)*75/310+Math.cos(z/780+this.phase)*130/780;}
  elevation(z){return Math.sin(z/420+this.phase)*7+Math.sin(z/170)*1.5;}
  curve(z){return -Math.sin(z/310+this.phase)*75/310**2-Math.sin(z/780+this.phase)*130/780**2;}
  populate(){
    while(this.nextTraffic<this.distance+FAR+400){
      const lane=this.random()<.48?-1:1;
      this.obstacles.push({z:this.nextTraffic,x:lane*1.9,velocity:lane<0?-(19+this.random()*12):15+this.random()*12,
        overtake:lane>0&&this.random()<.28,colour:['#b5bec0','#993b2e','#d8cdb8','#304e60','#777f69'][Math.floor(this.random()*5)],van:this.random()<.2,passed:false});
      this.nextTraffic+=90+this.random()*130;
    }
    this.obstacles=this.obstacles.filter(o=>o.z>this.distance-90);
  }
  hit(reason){
    if(this.invulnerable>0||this.over)return;
    this.lives--;this.combo=0;this.speed*=.32;this.crash=.65;this.invulnerable=2.5;
    this.message=reason;this.messageTime=2;
    if(this.lives<=0){this.over=true;this.reason='BIKE WRECKED';}
  }
  update(dt,vertical=0,horizontal=0){
    if(this.over)return;
    const duration=clamp(dt,0,.1),steps=Math.ceil(duration/.01);
    for(let i=0;i<steps&&!this.over;i++)this.step(duration/steps,vertical,horizontal);
  }
  step(dt,vertical,horizontal){
    this.elapsed+=dt;this.time=Math.max(0,this.time-dt);
    this.invulnerable=Math.max(0,this.invulnerable-dt);this.crash=Math.max(0,this.crash-dt);this.messageTime=Math.max(0,this.messageTime-dt);
    this.lean=mix(this.lean,horizontal,1-Math.exp(-dt*7));
    // Throttle is progressive; coasting has engine drag. Steering authority builds with speed.
    const acceleration=vertical<0?15*(1-(this.speed/89)**2):vertical>0?-32:-3;
    this.speed=clamp(this.speed+acceleration*dt,0,89);
    this.x+=this.lean*(1.8+this.speed*.045)*dt-this.curve(this.distance)*this.speed**2*.65*dt;
    if(Math.abs(this.x)>HALF-.35){
      this.hit('GUARDRAIL');this.x=Math.sign(this.x)*(HALF-.4);
    }
    const before=this.distance;this.distance+=this.speed*dt;
    for(const car of this.obstacles){
      const previous=car.z-before;
      // Occasional drivers cross the centre line to overtake: read the road ahead.
      if(car.overtake)car.x=1.9-2.4*Math.max(0,Math.sin((car.z+this.phase*10)/100));
      car.z+=car.velocity*dt;const relative=car.z-this.distance;
      const gap=Math.abs(car.x-this.x);
      if(previous>=-3&&relative<=3&&relative>=-5&&gap<1.25)this.hit('TRAFFIC COLLISION');
      if(!car.passed&&previous>=0&&relative<0){
        car.passed=true;
        if(gap>=1.25&&gap<2.3&&this.speed>34&&this.invulnerable===0){
          this.combo++;this.nearMisses++;this.bestCombo=Math.max(this.bestCombo,this.combo);
          const points=100*Math.min(this.combo,8);this.score+=points;this.time+=1.2;
          this.message=`CLOSE CALL  +${points}  /  +1.2s`;this.messageTime=1.6;
        }else if(gap>=2.3)this.combo=0;
      }
    }
    this.score+=(this.distance-before)*.1;
    if(this.distance>=this.length){
      this.level++;this.length+=2600;this.time+=35;this.score+=1000;this.lives=Math.min(3,this.lives+1);
      this.message='PASS CLEARED  +35s  /  BIKE REPAIRED';this.messageTime=3;
    }
    if(this.time<=0){this.over=true;this.reason='OUT OF TIME';}
    this.populate();
  }
  syncInput(canvas,running){
    if(!this.audio&&running){
      const win=canvas.ownerDocument.defaultView,Audio=win.AudioContext||win.webkitAudioContext;
      if(Audio){
        const context=new Audio(),gain=context.createGain(),filter=context.createBiquadFilter();
        filter.type='lowpass';filter.frequency.value=450;gain.gain.value=0;
        const engine=context.createOscillator();engine.type='sawtooth';engine.frequency.value=55;
        engine.connect(filter);filter.connect(gain);gain.connect(context.destination);engine.start();
        this.audio={context,gain,engine,filter};
      }
    }
    if(this.audio){
      const {context,gain,engine,filter}=this.audio,t=context.currentTime;
      if(running&&context.state==='suspended')context.resume().catch(()=>{});
      gain.gain.setTargetAtTime(running&&!this.over ? .035 : 0,t,.08);
      // Gear changes drop the engine note while speed keeps increasing.
      const gear=Math.max(1,Math.min(6,Math.ceil(this.speed/16)));
      engine.frequency.setTargetAtTime(36+(this.speed-(gear-1)*14)*3,t,.07);
      filter.frequency.setTargetAtTime(180+this.speed*6,t,.1);
    }
  }
  dispose(){
    if(this.audio){this.audio.engine.stop();this.audio.engine.disconnect();this.audio.filter.disconnect();this.audio.gain.disconnect();this.audio.context.close().catch(()=>{});this.audio=null;}
    this.trees=null;
  }
  project(z){
    const dz=Math.max(.1,z-this.distance),s=F/dz;
    return {x:320+(this.centre(z)-this.centre(this.distance)-this.tangent(this.distance)*dz-this.x)*s,
      y:155+(this.elevation(this.distance)+1.35-this.elevation(z))*s,s};
  }
  draw(ctx){
    const poly=(color,pts)=>{ctx.fillStyle=color;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();};
    const line=(color,width,pts)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();};
    const ellipse=(color,x,y,rx,ry)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
    if(!this.panorama){
      this.panorama=new ctx.canvas.ownerDocument.defaultView.Image();
      this.panorama.src=new URL('./assets/byker/alpine-panorama.png',import.meta.url).href;
      const tile=ctx.canvas.ownerDocument.createElement('canvas');tile.width=256;tile.height=256;
      const tc=tile.getContext('2d'),pixels=tc.createImageData(256,256);
      for(let i=0;i<pixels.data.length;i+=4){const v=35+hash(i)*75;pixels.data[i]=v;pixels.data[i+1]=v+3;pixels.data[i+2]=v+2;pixels.data[i+3]=255;}
      tc.putImageData(pixels,0,0);this.asphalt=ctx.createPattern(tile,'repeat');
    }
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
    const shake=this.crash>0?Math.sin(this.elapsed*83)*this.crash*7:0;
    ctx.translate(shake,Math.sin(this.distance*.6)*this.speed/200);
    // Subtle camera roll ties the horizon, road and bars to the same lean.
    ctx.translate(320,220);ctx.rotate(-this.lean*.023);ctx.translate(-320,-220);
    let g=ctx.createLinearGradient(0,0,0,240);g.addColorStop(0,'#243b50');g.addColorStop(.48,'#7e9299');g.addColorStop(.75,'#dfb995');g.addColorStop(1,'#9ba29b');ctx.fillStyle=g;ctx.fillRect(-30,-30,700,420);
    const pan=this.tangent(this.distance)*230;
    const sunX=470-pan*.3;
    g=ctx.createRadialGradient(sunX,110,2,sunX,110,140);g.addColorStop(0,'#ffe1ab88');g.addColorStop(1,'#ffc18400');ctx.fillStyle=g;ctx.fillRect(sunX-140,-30,280,280);ellipse('#ffe8bd',sunX,108,12,12);
    if(!this.panorama.complete||!this.panorama.naturalWidth){
    // Fractal ridges: sharp rock silhouettes, facets, scree and snow lines.
    for(let layer=0;layer<4;layer++){
      const pts=[[-40,370]],ridge=[];
      for(let x=-40;x<=690;x+=5){const world=x+pan*(.25+layer*.18);const y=112+layer*17-
        Math.abs(Math.sin(world*.006+layer*1.8))* (62-layer*8)-Math.abs(Math.sin(world*.019+layer))* (24-layer*3)-hash(Math.floor(world/5)+layer*91)*6;
        ridge.push([x,y]);}
      pts.push(...ridge,[690,370]);poly(['#7e8a8d','#697b7c','#4b6565','#354e4b'][layer],pts);
      for(let i=1;i<ridge.length-2;i+=3){const [x,y]=ridge[i];poly(layer<2?'#d7c7ae28':'#c2bd9c16',[[x,y],[x+24,y+65+hash(i)*50],[x+7,y+90],[x-4,y+23]]);}
    }
    // The valley lies below the elevated road.
    g=ctx.createLinearGradient(0,150,0,360);g.addColorStop(0,'#86958b');g.addColorStop(1,'#263e35');ctx.fillStyle=g;ctx.fillRect(0,185,640,200);
    }
    if(this.panorama.complete&&this.panorama.naturalWidth){
      ctx.drawImage(this.panorama,-130-pan*.55,-32,900,300);
    }
    // Draw terrain, asphalt, furniture and vehicles in the same depth order.
    const cars=this.obstacles.filter(o=>o.z>this.distance+2&&o.z<this.distance+FAR).sort((a,b)=>b.z-a.z);
    let carIndex=0;let clipY=H;
    const samples=[],asphaltPath=new Path2D();
    // Build front to back visibility so cars and scenery disappear behind crests.
    for(let dz=2;dz<=FAR;dz+=dz<80?2:dz<240?5:15){const p=this.project(this.distance+dz);samples.push({dz,p,clip:clipY});clipY=Math.min(clipY,p.y);}
    for(let i=samples.length-1;i>0;i--){
      const a=samples[i],b=samples[i-1],p=a.p,q=b.p,z=this.distance+a.dz;
      if(q.y<a.clip-1)continue;
      const left=p.x-HALF*p.s,right=p.x+HALF*p.s,L=q.x-HALF*q.s,R=q.x+HALF*q.s;
      const shade=Math.floor(z/7)%2;
      poly('#4e5747',[[0,p.y],[640,p.y],[640,q.y+1],[0,q.y+1]]);
      poly('#898171',[[left-p.s*.65,p.y],[right+p.s*.65,p.y],[R+q.s*.65,q.y+1],[L-q.s*.65,q.y+1]]);
      poly('#393f3f',[[left,p.y],[right,p.y],[R,q.y+1],[L,q.y+1]]);
      asphaltPath.moveTo(left,p.y);asphaltPath.lineTo(right,p.y);asphaltPath.lineTo(R,q.y+1);asphaltPath.lineTo(L,q.y+1);asphaltPath.closePath();
      // Small aggregate flecks and tyre wear stay anchored to world coordinates.
      if(a.dz<190){for(let k=0;k<5;k++){const xx=(hash(Math.floor(z)*7+k)-.5)*10;ctx.fillStyle=k%2?'#aaa99b16':'#111b2220';ctx.fillRect(p.x+xx*p.s,p.y,Math.max(.5,p.s*.04),Math.max(.5,(q.y-p.y)*.2));}}
      for(const side of [-1,1]){
        poly('#d2cead',[[p.x+side*3.5*p.s,p.y],[p.x+side*3.43*p.s,p.y],[q.x+side*3.43*q.s,q.y+1],[q.x+side*3.5*q.s,q.y+1]]);
        // W-beam guardrails, with dark underside and galvanized upper face.
        for(const [height,color] of [[.48,'#343e3c'],[.68,'#c0bda6'],[.76,'#8f9b98']])
          poly(color,[[p.x+side*4.15*p.s,p.y-height*p.s],[q.x+side*4.15*q.s,q.y-height*q.s],[q.x+side*4.15*q.s,q.y-(height-.09)*q.s],[p.x+side*4.15*p.s,p.y-(height-.09)*p.s]]);
      }
      if(Math.floor(z/12)%2===0)for(const side of [-1,1])poly('#d4bd7e',[[p.x+side*.08*p.s,p.y],[p.x+side*.14*p.s,p.y],[q.x+side*.14*q.s,q.y+1],[q.x+side*.08*q.s,q.y+1]]);
      const fog=clamp((a.dz-180)/1200,0,.7);if(fog>0)poly(`rgba(177,180,163,${fog})`,[[0,p.y],[640,p.y],[640,q.y+1],[0,q.y+1]]);
      // Fixed-spaced posts, roadside trees and reflective turn chevrons.
      if(Math.floor(z/16)!==Math.floor((this.distance+b.dz)/16)){
        for(const side of [-1,1]){
          const x=p.x+side*4.15*p.s;
          line('#66736d',Math.max(.5,p.s*.07),[[x,p.y],[x,p.y-.8*p.s]]);
          ctx.fillStyle=side<0?'#e8d7a0':'#de7854';ctx.fillRect(x-p.s*.06,p.y-.72*p.s,p.s*.12,p.s*.12);
        }
      }
      if(Math.floor(z/35)!==Math.floor((this.distance+b.dz)/35)){
        for(const side of [-1,1]){
          const n=Math.floor(z/35),x=p.x+side*(9+hash(n)*11)*p.s,h=(5+hash(n+3)*8)*p.s,y=p.y+1.2*p.s;
          line('#554c3b',Math.max(.5,p.s*.18),[[x,y],[x,y-h]]);
          this.drawTree(ctx,x,y,h,n+side*17);
        }
      }
      while(carIndex<cars.length&&cars[carIndex].z>=this.distance+b.dz){
        const car=cars[carIndex++],c=this.project(car.z);
        ctx.save();ctx.beginPath();ctx.rect(0,0,640,a.clip);ctx.clip();this.drawCar(ctx,car,c,poly,ellipse,line);ctx.restore();
      }
      if(this.length>=this.distance+b.dz&&this.length<z){
        const c=this.project(this.length),y=c.y-5*c.s;
        line('#b4b4a3',Math.max(1,c.s*.14),[[c.x-6*c.s,c.y],[c.x-6*c.s,y],[c.x+6*c.s,y],[c.x+6*c.s,c.y]]);
        ctx.fillStyle='#223b36';ctx.fillRect(c.x-6*c.s,y,12*c.s,1.3*c.s);ctx.fillStyle='#f4dfab';ctx.textAlign='center';ctx.font=`bold ${Math.max(3,c.s*.65)}px sans-serif`;ctx.fillText('COL DU SOLEIL',c.x,y+c.s*.85);
      }
    }
    ctx.globalAlpha=.2;ctx.fillStyle=this.asphalt;ctx.fill(asphaltPath);ctx.globalAlpha=1;
    // Lens shading gives the bright distance more depth without hiding the road.
    g=ctx.createRadialGradient(320,150,90,320,160,380);g.addColorStop(0,'#00000000');g.addColorStop(1,'#05131788');ctx.fillStyle=g;ctx.fillRect(0,0,640,360);
    this.drawCockpit(ctx,poly,line,ellipse);
    ctx.restore();this.drawHud(ctx);
  }
  drawTree(ctx,x,y,h,seed){
    if(h<2||x+h*.3<0||x-h*.3>640||y-h>360)return;
    if(!this.trees){
      this.trees=[];
      for(let variant=0;variant<5;variant++){
        const canvas=ctx.canvas.ownerDocument.createElement('canvas');canvas.width=96;canvas.height=192;
        const c=canvas.getContext('2d');
        c.fillStyle='#3c3d2c';c.fillRect(46,22,4,168);
        for(let j=0;j<240;j++){
          const t=j/240,yy=8+t*170,spread=(5+t*38)*(1-t*.25),xx=48+(hash(j+variant*300)-.5)*spread*2;
          const radius=2+t*8;
          c.strokeStyle=['#172e27','#233e30','#314b36','#44583c','#586347'][Math.floor(hash(j+19)*5)];c.lineWidth=1+t*2;
          c.beginPath();c.moveTo(48,yy-7);c.lineTo(xx,yy+radius);c.stroke();
          for(let k=0;k<3;k++){
            c.fillStyle=['#1b3329','#2b4231','#384e35','#4c5c3c'][Math.floor(hash(j*7+k)*4)];
            c.beginPath();c.ellipse(xx+(k-1)*radius*.7,yy+k*2,radius*.7,radius*.32,-.4,0,Math.PI*2);c.fill();
          }
        }
        this.trees.push(canvas);
      }
    }
    ctx.drawImage(this.trees[Math.abs(seed)%5],x-h*.25,y-h,h*.5,h);
  }
  drawCar(ctx,car,p,poly,ellipse,line){
    const s=p.s,x=p.x+car.x*s,y=p.y,w=.96*s,h=(car.van?1.9:1.4)*s;
    if(s<.15)return;
    ellipse('#0c171b66',x,y,w*1.3,s*.18);
    // Three dimensional body, wheels and glazing, proportioned in metres.
    const front=car.velocity<0;
    for(const side of [-1,1]){ctx.fillStyle='#11191a';ctx.fillRect(x+side*w-w*.14,y-h*.35,w*.28,h*.36);}
    poly('#202b2b',[[x-w,y],[x-w*1.09,y-h*.45],[x-w*.78,y-h*.92],[x+w*.66,y-h],[x+w,y-h*.5],[x+w,y]]);
    poly(car.colour,[[x-w,y-h*.13],[x-w,y-h*.5],[x-w*.7,y-h*.97],[x+w*.6,y-h],[x+w*.94,y-h*.51],[x+w,y-h*.13]]);
    poly('#172c32',[[x-w*.63,y-h*.86],[x+w*.55,y-h*.89],[x+w*.78,y-h*.53],[x-w*.82,y-h*.51]]);
    poly('#b9c3ba55',[[x-w*.6,y-h*.83],[x+w*.5,y-h*.86],[x+w*.64,y-h*.72],[x-w*.69,y-h*.65]]);
    poly('#e3ddc22b',[[x-w*.89,y-h*.49],[x+w*.8,y-h*.51],[x+w*.92,y-h*.35],[x-w*.93,y-h*.32]]);
    line('#0c1b2099',Math.max(.5,s*.035),[[x-w*.9,y-h*.25],[x+w*.9,y-h*.25]]);
    for(const side of [-1,1]){ctx.fillStyle=front?'#fff0c2':'#e85a37';ctx.fillRect(x+side*w*.72-w*.19,y-h*.37,w*.38,h*.13);if(front){ellipse('#ffe0a62a',x+side*w*.72,y-h*.31,w*.5,w*.3);}}
    ctx.fillStyle='#d0caba';ctx.fillRect(x-w*.2,y-h*.2,w*.4,h*.1);
    ctx.fillStyle='#142222';ctx.fillRect(x-w*.88,y-h*.11,w*1.76,h*.075);
  }
  drawCockpit(ctx,poly,line,ellipse){
    ctx.save();ctx.translate(this.lean*9,Math.sin(this.distance*.8)*this.speed*.006);ctx.translate(320,340);ctx.rotate(this.lean*.045);ctx.translate(-320,-340);
    // Transparent touring screen and specular edge.
    poly('#aacac511',[[211,326],[223,235],[249,214],[391,214],[417,235],[429,326]]);
    line('#d1e0cf44',1,[[211,326],[223,235],[249,214],[391,214],[417,235],[429,326]]);
    line('#e7e6cd22',2,[[233,255],[240,236],[271,223]]);
    // Mirrors show receding road, with metal stalks and rubber housings.
    for(const side of [-1,1]){
      line('#121d21',5,[[320+side*105,322],[320+side*147,279],[320+side*179,270]]);
      const x=320+side*192;
      poly('#111d22',[[x-32,251],[x+25,247],[x+35,265],[x+18,281],[x-29,277]]);
      poly('#79928f',[[x-27,254],[x+22,251],[x+29,264],[x+15,276],[x-25,273]]);
      poly('#344644',[[x-25,267],[x+26,261],[x+15,275],[x-25,273]]);
      line('#c6c5ae66',1,[[x-26,254],[x+21,251]]);
    }
    poly('#101b20',[[212,360],[234,316],[272,300],[368,300],[406,316],[428,360]]);
    poly('#3e4c50',[[252,360],[263,303],[281,285],[359,285],[377,303],[388,360]]);
    poly('#101b20',[[264,346],[273,304],[285,295],[355,295],[367,304],[376,346]]);
    poly('#243832',[[276,336],[281,306],[359,306],[364,336]]);
    ctx.textAlign='center';ctx.font='24px monospace';ctx.fillStyle='#dce8c4';ctx.fillText(String(Math.round(this.speed*3.6)).padStart(3,'0'),320,329);
    ctx.font='6px sans-serif';ctx.fillStyle='#aebd9c';ctx.fillText('km/h    ABS    '+(this.speed<5?'N':Math.min(6,Math.ceil(this.speed/16))),320,335);
    for(let i=0;i<24;i++){ctx.fillStyle=i<this.speed/89*24?(i>19?'#ed8a54':'#b5c698'):'#4c5a48';ctx.fillRect(282+i*3.1,301,2,3);}
    for(const side of [-1,1]){
      line('#78817c',7,[[320+side*42,346],[320+side*87,329],[320+side*120,332]]);
      line('#111b20',10,[[320+side*105,331],[320+side*139,334]]);
      // Gloves and jacket sleeves instead of a floating handlebar.
      const x=320+side*127;
      poly('#151e22',[[x-side*17,329],[x+side*8,324],[x+side*24,339],[x+side*40,360],[x-side*11,366],[x-side*23,342]]);
      line('#707c75',2,[[x-side*13,333],[x+side*5,330],[x+side*17,343]]);
      line('#a1704d',3,[[x+side*23,349],[x+side*31,360]]);
    }
    poly('#586362',[[291,359],[301,348],[339,348],[349,359]]);ellipse('#132024',320,355,8,5);ellipse('#b0b3a4',320,355,4,3);
    ctx.restore();
  }
  drawHud(ctx){
    ctx.save();ctx.textBaseline='alphabetic';
    let g=ctx.createLinearGradient(0,0,0,75);g.addColorStop(0,'#081719d9');g.addColorStop(1,'#08171900');ctx.fillStyle=g;ctx.fillRect(0,0,640,75);
    ctx.textAlign='left';ctx.font='italic 900 23px sans-serif';ctx.fillStyle='#f0ebd8';ctx.fillText('BYKER',18,31);
    ctx.font='8px sans-serif';ctx.fillStyle='#b4c6bd';ctx.fillText('ALPINE / COL DU SOLEIL',19,45);
    ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillStyle=this.time<10?'#ff9974':'#f1e9d1';ctx.fillText(this.time.toFixed(1),320,31);
    ctx.font='8px sans-serif';ctx.fillStyle='#c0cbb9';ctx.fillText('TIME TO THE PASS',320,44);
    ctx.textAlign='right';ctx.font='bold 18px sans-serif';ctx.fillStyle='#f0ebd8';ctx.fillText(Math.floor(this.score).toLocaleString('en-US'),620,29);
    ctx.font='8px sans-serif';ctx.fillStyle='#c0cbb9';ctx.fillText(`${Math.ceil(this.length-this.distance)} m  /  PASS ${this.level}`,620,44);
    for(let i=0;i<3;i++){ctx.fillStyle=i<this.lives?'#d9af77':'#46524c';ctx.fillRect(579+i*15,53,11,3);}
    ctx.fillStyle='#d7ddc522';ctx.fillRect(19,55,135,2);ctx.fillStyle='#d9b881';ctx.fillRect(19,55,135*(this.distance%2600)/2600,2);
    if(this.combo>0){ctx.textAlign='left';ctx.fillStyle='#efd19c';ctx.font='italic bold 20px sans-serif';ctx.fillText(`×${Math.min(this.combo,8)}`,20,104);ctx.font='8px sans-serif';ctx.fillText('CLOSE CALL CHAIN',20,117);}
    if(this.messageTime>0&&!this.over){ctx.globalAlpha=Math.min(1,this.messageTime*2);ctx.textAlign='center';ctx.font='bold 12px sans-serif';ctx.fillStyle='#f9dfb4';ctx.shadowColor='#0a1c20';ctx.shadowBlur=5;ctx.fillText(this.message,320,82);ctx.shadowBlur=0;ctx.font='9px sans-serif';ctx.fillStyle='#e3e5cc';if(this.elapsed<4)ctx.fillText('Thread traffic. Close passes earn points and extra time.',320,98);ctx.globalAlpha=1;}
    ctx.fillStyle='#07171bc4';ctx.fillRect(0,345,640,15);ctx.font='8px sans-serif';ctx.fillStyle='#c1c9ba';ctx.textAlign='left';ctx.fillText('↑ W THROTTLE     ↓ S BRAKE     ← → A D LEAN',13,355);ctx.textAlign='right';ctx.fillText('CLOSE CALL +1.2s     /     ESC LEAVE',627,355);
    if(this.crash>0){ctx.fillStyle=`rgba(206,74,39,${this.crash*.25})`;ctx.fillRect(0,0,W,H);}
    if(this.over){
      ctx.fillStyle='#07171be8';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#caab7c';ctx.font='9px sans-serif';ctx.fillText('COL DU SOLEIL / RIDE REPORT',320,103);
      ctx.fillStyle='#f2e7cf';ctx.font='italic bold 36px sans-serif';ctx.fillText(this.reason,320,149);
      ctx.font='bold 27px sans-serif';ctx.fillText(Math.floor(this.score).toLocaleString('en-US'),320,192);ctx.font='9px sans-serif';ctx.fillStyle='#b7c4b5';ctx.fillText('POINTS',320,208);
      ctx.fillText(`${(this.distance/1000).toFixed(2)} km    /    ${this.nearMisses} CLOSE CALLS    /    BEST CHAIN ×${this.bestCombo}`,320,239);
      ctx.fillStyle='#e9c795';ctx.font='10px sans-serif';ctx.fillText('SPACE TO RETURN TO THE ARCADE',320,280);
    }
    ctx.restore();
  }
}
