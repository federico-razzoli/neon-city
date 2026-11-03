import {ARCADE} from './arcade-interior.js?v=arcade-visitors-1';

export const ARCADE_VISITOR_TYPES=[14,15,4,0];
const entrance={x:ARCADE.door.x,z:.5};
const desk={x:ARCADE.attendant.x,z:ARCADE.desk.z-.85};
// Cabinet data can come from independently versioned module imports.
const sameMachine=(a,b)=>Boolean(a&&b&&a.x===b.x&&a.z===b.z);
const machineKey=machine=>`${machine.x},${machine.z}`;
const cabinetSpot=b=>({x:b.x+b.w/2,z:b.z-.7});
// Visitors go around cabinet rows instead of squeezing between adjacent games.
const cabinetRows=[];
for(const cabinet of ARCADE.cabinets){
  const row=cabinetRows.find(b=>b.z===cabinet.z);
  if(row){
    const right=Math.max(row.x+row.w,cabinet.x+cabinet.w);
    row.x=Math.min(row.x,cabinet.x);row.w=right-row.x;row.d=Math.max(row.d,cabinet.d);
  }else cabinetRows.push({...cabinet});
}
const obstacles=[ARCADE.bridgeConsole,ARCADE.desk,...cabinetRows,...ARCADE.pinballs];
export function arcadeWalkable(p,people=[]){
  const r=.3;
  return p.x>=r&&p.x<=ARCADE.width-r&&p.z>=r&&p.z<=ARCADE.depth-r&&
    !obstacles.some(b=>p.x>b.x-r&&p.x<b.x+b.w+r&&p.z>b.z-r&&p.z<b.z+b.d+r)&&
    [ARCADE.attendant,...ARCADE.bridgeChairs].every(c=>Math.hypot(p.x-c.x,p.z-c.z)>=r+c.radius)&&
    people.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>=.6);
}
// Grid routes keep visitors out of the furniture and away from other players.
export function arcadeRoute(start,end,people=[]){
  const segment=(a,b)=>{
    if(!arcadeWalkable(a,people)||!arcadeWalkable(b,people))return false;
    const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
    for(const box of obstacles){
      let low=0,high=1;
      for(const [value,delta,min,max] of [[a.x,dx,box.x-.3,box.x+box.w+.3],[a.z,dz,box.z-.3,box.z+box.d+.3]]){
        if(Math.abs(delta)<1e-10){if(value<=min||value>=max){high=-1;break;}}
        else{const t1=(min-value)/delta,t2=(max-value)/delta;low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));}
      }
      if(low<high)return false;
    }
    for(const c of [...ARCADE.bridgeChairs,ARCADE.attendant,...people]){
      const t=length2?Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.z-a.z)*dz)/length2)):0;
      if(Math.hypot(a.x+t*dx-c.x,a.z+t*dz-c.z)<(c.radius===undefined?.6:c.radius+.3))return false;
    }
    return true;
  };
  if(segment(start,end))return [{...end}];
  const step=.25,key=p=>`${p.x},${p.z}`,first={x:Math.round(start.x/step)*step,z:Math.round(start.z/step)*step};
  if(!segment(start,first))return null;
  const queue=[first],previous=new Map([[key(first),null]]);let goal;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(Math.hypot(p.x-end.x,p.z-end.z)<.5&&segment(p,end)){goal=p;break;}
    for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const next={x:p.x+dx,z:p.z+dz};
      if(previous.has(key(next))||!segment(p,next))continue;
      previous.set(key(next),p);queue.push(next);
    }
  }
  if(!goal)return null;
  const route=[end];for(let p=goal;p;p=previous.get(key(p)))route.push(p);route.push(start);route.reverse();
  const result=[];let i=0;
  while(i<route.length-1){let j=route.length-1;while(j>i+1&&!segment(route[i],route[j]))j--;result.push({...route[j]});i=j;}
  return result;
}

export class ArcadeLife{
  constructor(random=Math.random){this.random=random;this.people=[];this.arrival=5+random()*5;this.lastDepartedType=null;this.playedCabinets=new Set();}
  get busy(){return this.people.some(p=>p.state!=='playing');}
  get deskBusy(){return this.people.some(p=>p.state==='desk');}
  occupied(machine,except=null){return this.people.some(p=>p!==except&&sameMachine(p.machine,machine));}
  delay(){return 10+this.random()*10;}
  travel(p,state,target){
    const route=arcadeRoute(p,target,this.people.filter(other=>other!==p));
    if(!route)return false;
    p.state=state;p.route=route;p.machine=null;return true;
  }
  play(p,playerMachine){
    const free=ARCADE.cabinets.filter(b=>!sameMachine(b,p.machine)&&!sameMachine(b,playerMachine)&&!this.occupied(b));
    // Share a random rotation across visitors, so a small crowd does not keep
    // returning to the same few games. Occupied games remain eligible later.
    const fresh=free.filter(machine=>!this.playedCabinets.has(machineKey(machine)));
    const repeated=free.filter(machine=>this.playedCabinets.has(machineKey(machine)));
    for(const [cycle,candidates] of [fresh,repeated].entries())while(candidates.length){
      const [machine]=candidates.splice(Math.floor(this.random()*candidates.length),1);
      if(this.travel(p,'to-cabinet',cabinetSpot(machine))){
        if(cycle===1)this.playedCabinets.clear();
        this.playedCabinets.add(machineKey(machine));p.machine=machine;return true;
      }
    }
    return false;
  }
  update(dt,player=null,playerMachine=null,deskTalking=false){
    this.arrival-=dt;
    for(const p of this.people)if(p.state==='playing')p.wait=Math.max(0,p.wait-dt);
    const active=this.people.find(p=>p.state!=='playing');
    if(active){
      const p=active;
      if(p.state==='to-cabinet'&&(sameMachine(p.machine,playerMachine)||this.occupied(p.machine,p))){
        // Reservations normally prevent this; also handle a player taking the
        // target while the visitor approaches, or independently restored state.
        if(!this.play(p,playerMachine))return;
      }
      if(p.state==='desk'){
        p.wait=Math.max(0,p.wait-dt);
        if(p.wait===0)this.play(p,playerMachine);
      }else{
        // Stop before the player, keeping the route ready to resume.
        let travel=dt*1.4;
        while(travel>0&&p.route.length){
          const target=p.route[0],dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
          if(d<.000001){p.route.shift();continue;}
          const move=Math.min(travel,d,.05),next={x:p.x+dx/d*move,z:p.z+dz/d*move};
          p.facingX=dx/d;p.facingZ=dz/d;
          if(player&&Math.hypot(next.x-player.x,next.z-player.z)<.6)break;
          // The player's own desk conversation takes priority.
          if(p.state==='to-desk'&&deskTalking&&Math.hypot(next.x-desk.x,next.z-desk.z)<1)break;
          p.x=next.x;p.z=next.z;p.walkTime+=move/1.4;travel-=move;
          if(d<=move+.000001)p.route.shift();
        }
        if(!p.route.length){
          p.walkTime=1/6;
          if(p.state==='to-exit'){
            this.people.splice(this.people.indexOf(p),1);
            this.lastDepartedType=p.type;
            this.arrival=5+this.random()*5;
          }
          else if(p.state==='to-desk'){p.state='desk';p.wait=5;p.facingX=0;p.facingZ=1;}
          else{p.state='playing';p.wait=5+this.random()*5;p.facingX=0;p.facingZ=1;}
        }
      }
      return;
    }
    if(this.arrival<=0&&this.people.length<3){
      if(player&&Math.hypot(player.x-entrance.x,player.z-entrance.z)<.6)return;
      const types=ARCADE_VISITOR_TYPES.filter(type=>type!==this.lastDepartedType&&!this.people.some(p=>p.type===type));
      const p={...entrance,type:types[Math.floor(this.random()*types.length)],variant:this.random(),walkTime:0,facingX:0,facingZ:1};
      if(!this.travel(p,'to-desk',desk))return;
      this.people.push(p);this.arrival=this.delay();return;
    }
    // Only one visitor can leave their game or enter on the same update.
    const finished=this.people.find(p=>p.wait===0);
    if(finished){
      const choice=this.random();
      if(choice<.35)this.travel(finished,'to-exit',entrance);
      else if(choice<.5)this.travel(finished,'to-desk',desk);
      else this.play(finished,playerMachine);
      return;
    }

  }
}
