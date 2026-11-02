import {AmigosShell} from './amigos-shell.js';
import {mountShellInput} from './amigos-shell-input.js';

// A small, interactive Workbench 3.1 desktop recreation. No ROMs or OS assets.
export class Amigos{
  width=640;height=360;pointerX=0;pointerY=0;pointerVisible=false;kind='amigos';elapsed=0;over=false;exitRequested=false;sessionSeconds=300;
  windows=[];regions=[];drag=null;selected='';menu=false;background='#959595';
  constructor(now=()=>Date.now()){this.now=now;this.shell=new AmigosShell();this.open('Workbench3.1');}
  update(dt){if(!this.over){this.elapsed=Math.min(this.sessionSeconds,this.elapsed+Math.max(0,dt));this.over=this.elapsed>=this.sessionSeconds;if(this.over)this.drag=null;}}
  open(name){
    const existing=this.windows.find(w=>w.name===name);
    if(existing){this.raise(existing);return;}
    const n=this.windows.length;
    this.windows.push(name==='Manual'?{name,x:40,y:40,w:560,h:280}:name==='Shell'?{name,x:62,y:40,w:530,h:270}:{name,x:Math.min(180,100+n*22),y:Math.min(125,46+n*22),w:386,h:206});
  }
  raise(w){this.windows.splice(this.windows.indexOf(w),1);this.windows.push(w);}
  pointer(type,x,y){
    if(this.over)return;
    this.pointerX=x;this.pointerY=y;this.pointerVisible=true;
    if(type==='move'&&this.drag){const d=this.drag;d.w.x=Math.max(0,Math.min(640-d.w.w,x-d.dx));d.w.y=Math.max(22,Math.min(330-d.w.h,y-d.dy));return;}
    if(type==='move'&&this.pressedIcon&&Math.hypot(x-this.pressedIcon.x,y-this.pressedIcon.y)>8){this.pressedIcon=null;this.lastIconClick=null;}
    if(type==='up'||type==='cancel'){
      const pressed=this.pressedIcon;this.pressedIcon=null;this.drag=null;
      if(type==='up'&&pressed&&Math.hypot(x-pressed.x,y-pressed.y)<=8)pressed.hit.action(x,y);
      if(type==='up'&&this.windows.at(-1)?.name==='Shell'){this.shellCanvas&&this.syncInput(this.shellCanvas,true);this.shellInput?.focus();}
      if(type==='cancel')this.lastIconClick=null;
      return;
    }
    if(type!=='down')return;
    const hit=[...this.regions].reverse().find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
    if(hit?.iconId){this.pressedIcon={hit,x,y};return;}
    this.pressedIcon=null;this.lastIconClick=null;
    hit?.action(x,y);
  }
  draw(g){
    this.regions=[];g.save();g.textBaseline='alphabetic';g.textAlign='left';g.font='bold 12px monospace';
    const rect=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
    const text=(s,x,y,c='#000')=>{g.fillStyle=c;g.fillText(s,x,y);};
    const hit=(x,y,w,h,action,iconId=null)=>this.regions.push({x,y,w,h,action,iconId});
    const bevel=(x,y,w,h,c='#aaa')=>{rect('#000',x,y,w,h);rect(c,x+1,y+1,w-2,h-2);rect('#fff',x+1,y+1,w-2,1);rect('#fff',x+1,y+1,1,h-2);rect('#555',x+1,y+h-2,w-2,1);rect('#555',x+w-2,y+1,1,h-2);};
    const button=(label,x,y,w,action)=>{bevel(x,y,w,24);text(label,x+7,y+16);hit(x,y,w,24,action);};
    const icon=(name,x,y,kind='drawer',owner='desktop')=>{
      const id=owner+'/'+name;
      if(this.selected===id)rect('#6688bb',x-6,y-3,86,59);
      if(kind==='exit'){
        bevel(x+19,y,35,35,'#ddd');rect('#222',x+25,y+5,22,30);rect('#5577aa',x+28,y+7,16,26);rect('#fff',x+39,y+20,3,3);
      }else if(kind==='text'){
        // A sheet of paper with a folded corner and text lines.
        rect('#000',x+22,y,30,36);rect('#fff',x+23,y+1,28,34);
        rect('#aaa',x+42,y+1,9,9);rect('#000',x+41,y+1,1,10);rect('#000',x+42,y+10,9,1);
        for(let row=0;row<4;row++)rect('#555',x+27,y+14+row*5,row===3?12:20,1);
      }else if(kind==='disk'){
        bevel(x+13,y+5,46,25,'#ccc');rect('#777',x+17,y+9,38,5);rect('#222',x+21,y+22,28,3);rect('#fff',x+20,y+16,30,4);
      }else if(kind==='clock'){
        bevel(x+21,y,32,34,'#eee');g.strokeStyle='#000';g.beginPath();g.arc(x+37,y+17,12,0,Math.PI*2);g.moveTo(x+37,y+8);g.lineTo(x+37,y+17);g.lineTo(x+45,y+20);g.stroke();
      }else if(kind==='tool'){
        bevel(x+17,y+3,40,30,'#ddd');rect('#5577aa',x+22,y+8,30,17);text('>_',x+24,y+21,'#fff');
      }else{
        rect('#000',x+10,y+5,50,28);rect('#fff',x+11,y+6,48,25);rect('#6688bb',x+13,y+9,44,21);rect('#000',x+10,y,24,8);rect('#aaa',x+11,y+1,22,6);rect('#bbb',x+15,y+13,42,16);rect('#fff',x+15,y+13,42,2);
      }
      g.textAlign='center';text(name,x+36,y+49);g.textAlign='left';
      hit(x-6,y-3,86,59,()=>{
        const now=this.now(),previous=this.lastIconClick;
        this.selected=id;
        if(previous?.id===id&&now-previous.time<=450){this.lastIconClick=null;if(id==='desktop/EXIT')this.exitRequested=true;else this.open(name);}
        else this.lastIconClick={id,time:now};
      },id);
    };
    rect(this.background,0,0,640,360);hit(0,21,640,316,()=>{this.selected='';});bevel(0,0,640,21,'#aaa');
    text('Amiga Workbench',7,15);text('1,853,440 graphics mem  8,388,608 other mem',146,15);
    hit(0,0,600,21,()=>{this.menu=!this.menu;});
    icon('Ram Disk',22,41,'disk');icon('Workbench3.1',22,115,'disk');icon('Work',22,189,'disk');icon('EXIT',22,263,'exit');
    for(const [index,w] of this.windows.entries()){
      const {x,y,w:ww,h}=w,active=index===this.windows.length-1;
      bevel(x,y,ww,h,'#aaa');hit(x,y,ww,h,()=>{this.selected='';this.raise(w);});
      rect(active?'#5577aa':'#999',x+2,y+2,ww-4,20);
      bevel(x+3,y+3,20,18);rect('#000',x+8,y+8,10,7);
      text(w.name,x+30,y+16,active?'#fff':'#000');
      hit(x+24,y+2,ww-69,20,(px,py)=>{this.raise(w);this.drag={w,dx:px-x,dy:py-y};});
      hit(x+3,y+3,20,18,()=>this.windows.splice(this.windows.indexOf(w),1));
      bevel(x+ww-43,y+3,19,18);text('↕',x+ww-40,y+16);
      hit(x+ww-43,y+3,19,18,()=>{w.x=w.x===0?100:0;w.y=25;});
      bevel(x+ww-23,y+3,20,18);rect('#000',x+ww-18,y+7,10,9);rect('#aaa',x+ww-16,y+9,10,9);
      hit(x+ww-23,y+3,20,18,()=>{if(this.windows.length>1)this.windows.unshift(this.windows.pop());});
      rect('#777',x+ww-15,y+23,13,h-38);bevel(x+ww-14,y+28,11,h-64);bevel(x+2,y+h-14,ww-17,12);text('◀',x+5,y+h-4);text('▶',x+ww-30,y+h-4);bevel(x+ww-15,y+h-15,13,13);text('/',x+ww-12,y+h-4);
      const cx=x+12,cy=y+36;
      if(['Workbench3.1','Work','Ram Disk','System','Utilities','Prefs','Tools'].includes(w.name)){
        const contents={
          'Workbench3.1':['System','Utilities','Prefs','Tools'],Work:['ReadMe','Clock','Palette'],
          'Ram Disk':['ReadMe'],System:['Shell','Manual','ReadMe'],Utilities:['Clock','Calculator'],Prefs:['Palette','Pointer'],Tools:['Clock','Calculator','ReadMe']
        }[w.name];
        contents.forEach((name,i)=>icon(name,cx+(i%4)*88,cy+Math.floor(i/4)*65,name==='Manual'?'text':name==='Clock'?'clock':['Shell','Calculator','ReadMe','Palette','Pointer'].includes(name)?'tool':'drawer',w.name));
        text(`${contents.length} icons    100% free`,cx,y+h-23);
      }else if(w.name==='Manual'){
        const lines=(this.shell.files.get('SYS:System/Manual')??'File not found.').split('\n'),size=11,pages=Math.max(1,Math.ceil(lines.length/size));
        this.shellHelpPage=Math.min(this.shellHelpPage??0,pages-1);
        lines.slice(this.shellHelpPage*size,(this.shellHelpPage+1)*size).forEach((s,i)=>text(s,cx,cy+8+i*16));
        button('Previous',cx,y+h-47,88,()=>{this.shellHelpPage=Math.max(0,this.shellHelpPage-1);});
        text(`Page ${this.shellHelpPage+1}/${pages}`,cx+110,y+h-31);
        button('Next',x+ww-100,y+h-47,80,()=>{this.shellHelpPage=Math.min(pages-1,this.shellHelpPage+1);});
      }else if(w.name==='Clock'){
        const ox=cx+171,oy=cy+68;g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.arc(ox,oy,58,0,Math.PI*2);g.stroke();
        for(let i=0;i<12;i++){const a=i*Math.PI/6;rect('#000',ox+Math.sin(a)*51-1,oy-Math.cos(a)*51-1,3,3);}
        const sec=this.elapsed;for(const [a,l] of [[sec*Math.PI/30,46],[Math.PI/3+sec*Math.PI/1800,37],[Math.PI/2,25]]){g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+Math.sin(a)*l,oy-Math.cos(a)*l);g.stroke();}g.lineWidth=1;
      }else if(w.name==='Palette'){
        text('Workbench screen colours',cx,cy+12);
        ['#959595','#5577aa','#6b8b87','#b49a77','#77779b','#aaa'].forEach((c,i)=>{bevel(cx+i*54,cy+28,44,38,c);hit(cx+i*54,cy+28,44,38,()=>{this.background=c;});});
        text('Select a desktop colour.',cx,cy+93);button('Reset',cx,cy+111,82,()=>{this.background='#959595';});
      }else if(w.name==='Calculator'){
        bevel(cx,cy,344,26,'#ddd');text(this.calc||'0',cx+8,cy+18);
        ['7','8','9','+','4','5','6','-','1','2','3','*','C','0','=','/'].forEach((key,i)=>button(key,cx+(i%4)*85,cy+34+Math.floor(i/4)*27,78,()=>this.calculate(key)));
      }else if(w.name==='Shell'){
        rect('#fff',cx-3,cy-8,ww-32,h-63);
        const columns=Math.floor((ww-38)/7.3),rows=Math.floor((h-95)/16),wrapped=[];
        for(const line of this.shell.lines){if(!line)wrapped.push('');for(let i=0;i<line.length;i+=columns)wrapped.push(line.slice(i,i+columns));}
        g.save();g.beginPath();g.rect(cx-2,cy-7,ww-36,h-72);g.clip();
        wrapped.slice(-rows).forEach((s,i)=>text(s,cx,cy+7+i*16));
        text(this.shell.prompt,cx,y+h-50);g.restore();
      }else if(w.name==='Pointer'){
        text('Choose your pointer colour',cx,cy+15);['#e44','#fff','#000'].forEach((c,i)=>{bevel(cx+i*80,cy+34,64,36,c);hit(cx+i*80,cy+34,64,36,()=>{this.pointerColor=c;});});
      }else{
        ['Welcome to AMIGOS!','Workbench 3.1 • AmigaOS • 1994','','Double-click / double-tap to open.','Drag title bars to move windows.','Top-left gadget closes a window.','Tap the screen title for menus.'].forEach((s,i)=>text(s,cx,cy+10+i*19));
      }
    }
    if(this.menu){bevel(0,0,640,21);text('Workbench    Window    Icons    Tools',8,15);bevel(4,22,190,125);['About…','Open Workbench','Clean Up','Close window','Exit AMIGOS'].forEach((s,i)=>{text(s,14,42+i*23);hit(5,24+i*23,188,23,()=>{this.menu=false;if(i===0)this.open('ReadMe');if(i===1)this.open('Workbench3.1');if(i===2)this.windows.forEach((w,j)=>{w.x=100+j*18;w.y=44+j*18;});if(i===3)this.windows.pop();if(i===4)this.exitRequested=true;});});}
    rect('#aaa',0,337,640,23);text('AMIGOS',8,353);text('DOUBLE-CLICK/TAP TO OPEN · ESC EXIT',83,353);const remaining=Math.ceil(this.sessionSeconds-this.elapsed);text(`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`,591,353);
    hit(540,337,45,23,()=>{this.exitRequested=true;});text('EXIT',544,353);
    if(this.over){bevel(135,111,370,138);text('AMIGOS — SESSION COMPLETE',163,141);text('Your free evaluation is over.',151,168);text('To keep using Workbench, buy an Amiga!',151,188);button('Return to arcade',232,210,176,()=>{});}
    if(this.pointerColor&&this.pointerVisible&&!this.over){
      const x=this.pointerX,y=this.pointerY;g.fillStyle=this.pointerColor;g.strokeStyle='#000';g.beginPath();g.moveTo(x,y);g.lineTo(x+3,y+16);g.lineTo(x+7,y+11);g.lineTo(x+14,y+11);g.closePath();g.fill();g.stroke();
    }
    g.restore();
  }
  syncInput(canvas,running){
    this.shellCanvas=canvas;
    this.shellInput??=mountShellInput(this,canvas);
    this.shellInput.sync(running);
  }
  dispose(){this.shellInput?.dispose();this.shellInput=null;}
  calculate(key){
    if(key==='C'){this.calc='';this.operand=null;this.operator=null;return;}
    if('+-*/='.includes(key)){
      if(this.operator&&this.operand!=null){const a=this.operand,b=Number(this.calc||0);this.calc=String(this.operator==='+'?a+b:this.operator==='-'?a-b:this.operator==='*'?a*b:b===0?'Error':a/b).slice(0,20);}
      this.operand=Number(this.calc||0);this.operator=key==='='?null:key;this.fresh=true;
    }else{this.calc=(this.fresh?'':this.calc||'')+key;this.calc=this.calc.slice(0,20);this.fresh=false;}
  }
}
