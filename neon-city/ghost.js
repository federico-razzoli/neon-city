import {drawGhost} from './ghost-art.js?v=2';

// Targeting and mode rules follow Jamey Pittman's ROM-verified Pac-Man Dossier:
// https://www.gamedeveloper.com/design/the-pac-man-dossier
// GHOST starts all four pursuers inside, softens early levels and forbids hunter U-turns.
export const GHOST_MAZE=[
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '######.##### ## #####.######',
  '######.##          ##.######',
  '######.## ###--### ##.######',
  '######.## #HHHHHH# ##.######',
  '      .   #HHHHHH#   .      ',
  '######.## #HHHHHH# ##.######',
  '######.## ######## ##.######',
  '######.##          ##.######',
  '######.## ######## ##.######',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################'
];
export const GHOST_DIRS=[{x:0,y:-1},{x:-1,y:0},{x:0,y:1},{x:1,y:0}]; // tie order: up, left, down, right
export const GHOST_COLOURS=['#ff5669','#ff9fce','#58e4ed','#ffb45c'];
const OPPOSITE=[2,3,0,1],COLS=28,ROWS=31,EXIT={x:13,y:11},HOME={x:13,y:14};
const corners=[{x:27,y:-3},{x:0,y:-3},{x:27,y:34},{x:0,y:34}];
const key=(x,y)=>y*COLS+x;
const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const actor=(x,y,dir)=>({x,y,dir,next:null,progress:0});
export function ghostDifficulty(level){
  const n=Math.max(0,level-1);
  return {playerSpeed:5.1+Math.min(n,8)*.08,enemySpeed:3.55+Math.min(n,12)*.19,
    power:Math.max(2.5,10-n*.75),release:[2,10,20,30].map(t=>Math.max(.7,t/(1+n*.3))),
    scatter:Math.max(3,9-n*.6),chase:Math.min(35,16+n*2)};
}
export class Ghost{
  kind='ghost';width=640;height=360;score=0;lives=3;level=1;over=false;phase='title';clock=0;
  power=0;chain=0;freeze=0;popups=[];extraLife=false;seed=0x51a7;wanted=1;touchDirection=null;
  constructor(){this.loadLevel();this.phase='title';}
  loadLevel(){
    this.difficulty=ghostDifficulty(this.level);this.dots=new Set();this.skulls=new Set();
    GHOST_MAZE.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell==='.')this.dots.add(key(x,y));if(cell==='o')this.skulls.add(key(x,y));}));
    this.total=this.dots.size+this.skulls.size;this.resetActors();
  }
  resetActors(){
    this.player=actor(13,23,1);this.wanted=1;this.touchDirection=null;
    this.enemies=GHOST_COLOURS.map((colour,i)=>({...actor(12+i,14,i%2?0:2),colour,index:i,state:'caged',frightened:false,revive:0}));
    this.power=0;this.chain=0;this.elapsed=0;this.wave=0;this.mode='scatter';this.modeTime=this.difficulty.scatter;
    this.freeze=0;this.popups=[];this.seed=0x51a7;this.phase='ready';this.timer=2;
  }
  get remaining(){return this.dots.size+this.skulls.size;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  keyDown(k){
    const d={ArrowUp:0,w:0,ArrowLeft:1,a:1,ArrowDown:2,s:2,ArrowRight:3,d:3}[k];
    if(d!==undefined)this.wanted=d;
    if(this.phase==='title'&&(d!==undefined||k===' '||k==='Enter')){this.phase='ready';this.timer=2;this.sound('start');}
  }
  cell(x,y){return GHOST_MAZE[y]?.[x]??'#';}
  canWalk(x,y,house=false){const c=this.cell(x,y);return c!=='#'&&(house||c!=='H'&&c!=='-');}
  neighbour(a,dir,house=false){
    const d=GHOST_DIRS[dir];let x=a.x+d.x,y=a.y+d.y;
    if(y===14){if(x<0)x=COLS-1;else if(x>=COLS)x=0;}
    return this.canWalk(x,y,house)?{x,y}:null;
  }
  position(a){
    if(!a.next)return {x:a.x,y:a.y};
    let dx=a.next.x-a.x;if(Math.abs(dx)>1)dx=a.dir===1?-1:1;
    return {x:(a.x+dx*a.progress+COLS)%COLS,y:a.y+(a.next.y-a.y)*a.progress};
  }
  reverseActor(a){
    if(a.next){const old={x:a.x,y:a.y};a.x=a.next.x;a.y=a.next.y;a.next=old;a.progress=1-a.progress;}
    a.dir=OPPOSITE[a.dir];
  }
  target(e){
    const tile=a=>{const p=this.position(a);return {x:Math.round(p.x)%COLS,y:Math.round(p.y)};};
    const p=tile(this.player),dir=GHOST_DIRS[this.player.dir];
    const elroy=e.index===0&&this.remaining<=Math.max(20,12+this.level*8);
    if(this.mode==='scatter'&&!elroy)return corners[e.index];
    if(e.index===0)return p;
    // Preserve the famous upward overflow: Pinky aims four up AND four left.
    if(e.index===1)return {x:p.x+dir.x*4-(this.player.dir===0?4:0),y:p.y+dir.y*4};
    if(e.index===2){
      const ahead={x:p.x+dir.x*2-(this.player.dir===0?2:0),y:p.y+dir.y*2},red=tile(this.enemies[0]);
      return {x:ahead.x*2-red.x,y:ahead.y*2-red.y};
    }
    return sq(e,p)>=64?p:corners[3];
  }
  route(a,target){
    // Only returning eyes and the cage use pathfinding; chasers use local tile targeting.
    const start=key(a.x,a.y),goal=key(target.x,target.y),queue=[{x:a.x,y:a.y,first:null}],seen=new Set([start]);
    for(let i=0;i<queue.length;i++){
      const current=queue[i];if(key(current.x,current.y)===goal)return current.first;
      for(let d=0;d<4;d++){
        const next=this.neighbour(current,d,true);if(!next||seen.has(key(next.x,next.y)))continue;
        seen.add(key(next.x,next.y));queue.push({...next,first:current.first??d});
      }
    }
    return null;
  }
  chooseEnemy(e){
    if(e.state==='exiting'){
      if(e.x===EXIT.x&&e.y===EXIT.y){e.state='active';e.dir=1;}else return this.route(e,EXIT);
    }
    if(e.state==='eyes'){
      if(e.x===HOME.x&&e.y===HOME.y){e.state='reviving';e.revive=1;return null;}
      return this.route(e,HOME);
    }
    if(e.state!=='active')return null;
    let options=[0,1,2,3].filter(d=>d!==OPPOSITE[e.dir]&&this.neighbour(e,d));
    if(!options.length)return null;
    if(e.frightened)return options[Math.floor(this.random()*options.length)];
    // Like the original, normal pursuers cannot turn upwards at the four red-zone junctions.
    if((e.y===11||e.y===23)&&(e.x===12||e.x===15)&&options.length>1)options=options.filter(d=>d!==0);
    const target=this.target(e);let best=options[0],distance=Infinity;
    for(const d of options){const candidate=this.neighbour(e,d),value=sq(candidate,target);if(value<distance){best=d;distance=value;}}
    return best;
  }
  choosePlayer(){
    if(this.neighbour(this.player,this.wanted))return this.wanted;
    return this.neighbour(this.player,this.player.dir)?this.player.dir:null;
  }
  move(a,distance,choose,onArrival=()=>{}){
    let left=distance;
    while(left>1e-8){
      if(!a.next){const dir=choose();if(dir==null)return;a.dir=dir;a.next=this.neighbour(a,dir,a!==this.player);if(!a.next)return;a.progress=0;}
      const step=Math.min(left,1-a.progress);a.progress+=step;left-=step;
      if(a.progress>=1-1e-8){a.x=a.next.x;a.y=a.next.y;a.next=null;a.progress=0;onArrival();if(this.phase!=='playing')return;}
    }
  }
  energize(){
    this.power=this.difficulty.power;this.chain=0;
    for(const e of this.enemies)if(e.state!=='eyes'&&e.state!=='reviving')e.frightened=true;
    this.sound('power');
  }
  addScore(points){
    this.score+=points;
    if(!this.extraLife&&this.score>=10000){this.extraLife=true;this.lives++;this.sound('extra');}
  }
  collect(){
    const tile=key(this.player.x,this.player.y);
    if(this.dots.delete(tile)){this.addScore(10);if(this.score%30===0)this.sound('dot');}
    this.collectSkull(tile);this.checkClear();
  }
  collectSkull(tile){if(this.skulls.delete(tile)){this.addScore(50);this.energize();}}
  collectNearbySkull(){
    const p=this.position(this.player);
    for(const tile of this.skulls){
      const x=tile%COLS,y=Math.floor(tile/COLS);let dx=Math.abs(p.x-x);dx=Math.min(dx,COLS-dx);
      if(dx*dx+(p.y-y)**2<=.65**2){this.collectSkull(tile);this.checkClear();break;}
    }
  }
  checkClear(){
    if(!this.remaining){this.phase='clear';this.timer=2.5;this.addScore(500*this.level);this.sound('clear');}
  }
  collide(){
    if(this.phase!=='playing')return;
    const p=this.position(this.player);
    for(const e of this.enemies){
      if(e.state!=='active'&&e.state!=='exiting')continue;
      const q=this.position(e);let dx=Math.abs(p.x-q.x);dx=Math.min(dx,COLS-dx);
      if(dx*dx+(p.y-q.y)**2>.58**2)continue;
      if(e.frightened&&this.power>0){
        const points=200*2**Math.min(3,this.chain++);this.addScore(points);e.state='eyes';e.frightened=false;
        this.popups.push({...q,text:`${points}`,time:1.2});this.freeze=.5;this.sound('eat');
      }else {this.lives--;this.phase='caught';this.timer=1.5;this.power=0;this.sound('death');return;}
    }
  }
  release(dt){
    for(const e of this.enemies)if(e.state==='reviving'){e.revive-=dt;if(e.revive<=0)e.state='waiting';}
    if(this.enemies.some(e=>e.state==='exiting'))return;
    const next=this.enemies.find(e=>e.state==='waiting'||e.state==='caged'&&this.elapsed>=this.difficulty.release[e.index]);
    if(next)next.state='exiting';
  }
  update(dt,vertical=0,horizontal=0,start=false){
    dt=Math.max(0,Math.min(dt,.25));
    if(this.touchDirection!=null)this.wanted=this.touchDirection;
    else if(horizontal)this.wanted=horizontal<0?1:3;
    else if(vertical)this.wanted=vertical<0?0:2;
    if(this.phase==='title'){this.clock+=dt;if(start||horizontal||vertical)this.keyDown(start?' ':horizontal<0?'ArrowLeft':horizontal>0?'ArrowRight':vertical<0?'ArrowUp':'ArrowDown');return;}
    const steps=Math.max(1,Math.ceil(dt*120));for(let i=0;i<steps;i++)this.step(dt/steps);
  }
  step(dt){
    this.clock+=dt;
    for(const popup of this.popups)popup.time-=dt;this.popups=this.popups.filter(p=>p.time>0);
    if(this.over)return;
    if(this.phase!=='playing'){
      this.timer-=dt;
      if(this.timer>0)return;
      if(this.phase==='ready'){this.phase='playing';this.collect();}
      else if(this.phase==='clear'){this.level++;this.loadLevel();}
      else if(this.phase==='caught'){if(this.lives>0)this.resetActors();else {this.over=true;this.phase='gameover';}}
      return;
    }
    if(this.freeze>0){this.freeze=Math.max(0,this.freeze-dt);return;}
    this.elapsed+=dt;this.release(dt);
    if(this.power>0){
      this.power=Math.max(0,this.power-dt);
      if(!this.power)for(const e of this.enemies)e.frightened=false;
    }else {
      this.modeTime-=dt;
      if(this.modeTime<=0){this.wave++;this.mode=this.wave%2?'chase':'scatter';this.modeTime=this.wave>=7?Infinity:this.mode==='scatter'?Math.max(3,this.difficulty.scatter-Math.floor(this.wave/2)):this.difficulty.chase;
      }
    }
    if(this.player.next&&this.wanted===OPPOSITE[this.player.dir])this.reverseActor(this.player);
    this.move(this.player,dt*(this.difficulty.playerSpeed+(this.power>0?.25:0)),()=>this.choosePlayer(),()=>this.collect());
    if(this.phase==='playing')this.collectNearbySkull();
    if(this.phase!=='playing')return;
    for(const e of this.enemies){
      let speed=e.state==='eyes'?11:e.state==='exiting'?3:e.frightened?this.difficulty.enemySpeed*.56:this.difficulty.enemySpeed;
      if(e.index===0&&this.remaining<=Math.max(20,12+this.level*8)&&!e.frightened&&e.state==='active')speed+=this.remaining<12?.55:.28;
      if(e.y===14&&(e.x<6||e.x>21)&&e.state==='active')speed*=.55;
      this.move(e,dt*speed,()=>this.chooseEnemy(e));
    }
    this.collide();
  }
  pointer(type,x,y){
    if(type==='up'||type==='cancel'){this.touchDirection=null;return;}
    if(type!=='down')return;
    if(this.phase==='title'){this.keyDown(' ');return;}
    if(y>=335&&x>=245&&x<401){this.touchDirection=Math.floor((x-245)/39);this.wanted=this.touchDirection;return;}
    const cx=320,cy=185,dx=x-cx,dy=y-cy;
    this.touchDirection=Math.abs(dx)>Math.abs(dy)?dx<0?1:3:dy<0?0:2;this.wanted=this.touchDirection;
  }
  sound(type){
    const ac=this.audioContext;if(!ac||ac.state!=='running')return;
    const notes={dot:[420,530],power:[220,440,660,880],eat:[880,1320],death:[430,300,200,90],start:[262,330,392,523],clear:[523,659,784,1046],extra:[660,880,1320]}[type];
    const now=ac.currentTime;
    notes.forEach((frequency,i)=>{
      const osc=ac.createOscillator(),gain=ac.createGain(),start=now+i*(type==='dot'?.025:.085),duration=type==='dot'?.035:.1;
      osc.type=type==='death'?'triangle':'sine';osc.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.045,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(ac.destination);osc.start(start);osc.stop(start+duration+.01);
      (this.voices??=new Set()).add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices.delete(osc);};
    });
  }
  syncInput(canvas,running){if(!running)this.touchDirection=null;}
  dispose(){for(const voice of this.voices??[]){try{voice.stop();}catch{}voice.disconnect();}this.voices?.clear();this.audioContext=null;}
  draw(ctx){drawGhost(ctx,this);}
}
