import test from 'node:test';
import assert from 'node:assert/strict';
import {Amigos} from '../neon-city/amigos.js';
import {ARCADE,AMIGOS_CABINET,tryArcadeGame} from '../neon-city/arcade-interior.js';
const context=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function tap(game,x,y){game.draw(context);game.pointer('down',x,y);game.pointer('up',x,y);}
test('AMIGOS occupies the next near-door cabinet and consumes one token',()=>{
  assert.equal(AMIGOS_CABINET,ARCADE.cabinets[8]);
  const inventory={items:[{id:'arcade-token',count:2}],selected:0};
  assert.equal(tryArcadeGame(AMIGOS_CABINET,inventory,false),'AMIGOS');assert.equal(inventory.items[0].count,2);
  assert.equal(tryArcadeGame(AMIGOS_CABINET,inventory),'AMIGOS');assert.equal(inventory.items[0].count,1);
});
test('desktop supports tapping drawers, dragging and closing windows',()=>{
  const game=new Amigos();tap(game,140,100);tap(game,140,100);assert.equal(game.windows.at(-1).name,'System');
  game.draw(context);const w=game.windows.at(-1),x=w.x,y=w.y;
  game.pointer('down',x+80,y+12);game.pointer('move',x+120,y+42);game.pointer('up',x+120,y+42);
  assert.equal(w.x,x+40);assert.equal(w.y,y+30);
  tap(game,w.x+10,w.y+10);assert.equal(game.windows.length,1);
});
test('five minutes ends the session and prevents further interaction',()=>{
  const game=new Amigos();game.update(299.9);assert.equal(game.over,false);game.update(.1);assert.equal(game.over,true);
  const n=game.windows.length;tap(game,45,200);assert.equal(game.windows.length,n);game.update(10);assert.equal(game.elapsed,300);
});
test('calculator evaluates arithmetic without executing source',()=>{
  const game=new Amigos();for(const key of ['1','2','+','3','='])game.calculate(key);assert.equal(game.calc,'15');
  for(const key of ['C','2','/','0','='])game.calculate(key);assert.equal(game.calc,'Error');
});

test('single click selects; only a second click on the same icon within 450ms opens it',()=>{
  let now=0;const game=new Amigos(()=>now);
  tap(game,140,100);assert.equal(game.selected,'Workbench3.1/System');assert.equal(game.windows.length,1);
  now=451;tap(game,140,100);assert.equal(game.windows.length,1,'slow clicks only select');
  now=600;tap(game,140,100);assert.equal(game.windows.at(-1).name,'System');
});
test('clicking another icon or background breaks a double-click sequence',()=>{
  const game=new Amigos(()=>0);
  tap(game,140,100);tap(game,225,100);tap(game,140,100);
  assert.equal(game.windows.length,1);
  tap(game,600,300);assert.equal(game.selected,'');tap(game,140,100);
  assert.equal(game.windows.length,1);
});
test('a cancelled or dragged tap does not open an icon',()=>{
  const game=new Amigos(()=>0);tap(game,140,100);game.draw(context);
  game.pointer('down',140,100);game.pointer('cancel',140,100);
  tap(game,140,100);assert.equal(game.windows.length,1);
  game.pointer('down',140,100);game.pointer('move',170,110);game.pointer('up',170,110);
  tap(game,140,100);assert.equal(game.windows.length,1);
});

// Shell commands operate on a session-local, case-insensitive Amiga filesystem.
import {AmigosShell} from '../neon-city/amigos-shell.js';
test('Shell navigates volumes, assigns, and Amiga parent paths',()=>{
  const sh=new AmigosShell();sh.submit('cd sys:system');assert.equal(sh.cwd,'SYS:System');
  sh.submit('cd /');assert.equal(sh.cwd,'SYS:');sh.submit('cd S:');assert.equal(sh.cwd,'SYS:S');
  sh.submit('cd RAM:');assert.equal(sh.cwd,'RAM:');sh.submit('makedir One');sh.submit('cd one');sh.submit('makedir Two');sh.submit('cd two');
  sh.submit('cd //');assert.equal(sh.cwd,'RAM:');sh.submit('cd');assert.equal(sh.lines.at(-1),'RAM:');
});
test('Shell creates, reads, copies, renames and deletes files, including quoted paths',()=>{
  const sh=new AmigosShell();sh.submit('echo "Hello Amiga!" TO "RAM:My File"');
  sh.submit('type "ram:my file"');assert.ok(sh.lines.includes('Hello Amiga!'));
  sh.submit('copy "RAM:My File" TO RAM:copy');assert.equal(sh.files.get('RAM:copy'),'Hello Amiga!\n');
  sh.submit('rename RAM:copy TO RAM:renamed');assert.equal(sh.files.has('RAM:copy'),false);
  sh.submit('delete RAM:renamed');assert.equal(sh.files.has('RAM:renamed'),false);
  sh.submit('echo first >RAM:out');sh.submit('echo second >>RAM:out');assert.equal(sh.files.get('RAM:out'),'first\nsecond\n');
  sh.submit('makedir SYS:system/Test');assert.equal(sh.files.get('SYS:System/Test'),null);
});
test('Shell lists recursively and handles non-empty drawer operations',()=>{
  const sh=new AmigosShell();sh.submit('makedir RAM:Test');sh.submit('copy SYS:ReadMe TO RAM:Test');
  sh.submit('dir RAM: all');assert.ok(sh.lines.some(s=>s.startsWith('RAM:Test/ReadMe')));
  sh.submit('copy RAM:Test TO Work:Backup ALL');assert.ok(sh.files.has('Work:Backup/ReadMe'));
  sh.submit('delete RAM:Test');assert.ok(sh.files.has('RAM:Test'));assert.match(sh.lines.at(-1),/not empty/);
  sh.submit('delete RAM:Test ALL');assert.equal(sh.files.has('RAM:Test/ReadMe'),false);
  sh.submit('rename Work:Backup TO Work:Backup/Bad');assert.match(sh.lines.at(-1),/Invalid destination/);
});
test('Shell reports errors, remembers commands and resets files between sessions',()=>{
  const sh=new AmigosShell();for(const cmd of ['type missing','cd missing','copy','echo "unfinished','nonsense']){sh.submit(cmd);assert.ok(sh.lines.at(-1));}
  assert.equal(sh.recall(-1),'nonsense');assert.equal(sh.recall(-1),'echo "unfinished');assert.equal(sh.recall(1),'nonsense');assert.equal(sh.recall(1),'');
  sh.submit('echo sample TO RAM:temporary');assert.equal(new AmigosShell().files.has('RAM:temporary'),false);
  for(const command of ['help','version','avail','info','date']){sh.submit(command);assert.ok(sh.lines.at(-1));}
  sh.submit('cls');assert.deepEqual(sh.lines,[]);assert.equal(sh.submit('endcli'),'close');
});

test('desktop EXIT requires double-clicking and requests an immediate exit',()=>{
  const game=new Amigos(()=>0);tap(game,45,285);
  assert.equal(game.selected,'desktop/EXIT');assert.equal(game.exitRequested,false);
  tap(game,45,285);assert.equal(game.exitRequested,true);assert.equal(game.over,false);
});
test('Workbench menu Exit AMIGOS requests an immediate exit',()=>{
  const game=new Amigos();tap(game,40,10);assert.equal(game.menu,true);
  tap(game,60,126);assert.equal(game.exitRequested,true);assert.equal(game.menu,false);
});
test('countdown starts at five minutes and formats minute boundaries',()=>{
  const game=new Amigos(),labels=[];
  const g=new Proxy({fillText(s){labels.push(s);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  for(const [dt,label] of [[0,'5:00'],[1,'4:59'],[59,'4:00'],[239,'0:01'],[1,'0:00']]){
    game.update(dt);labels.length=0;game.draw(g);assert.ok(labels.includes(label),label);
  }
});

test('Manual is a text file beside Shell in the System drawer',()=>{
  const game=new Amigos(()=>0);
  game.shell.submit('TYPE SYS:System/Manual');
  assert.match(game.shell.files.get('SYS:System/Manual'),/COPY source TO dest/);
  assert.ok(game.shell.lines.includes('AMIGOS Shell commands'));
  assert.equal(game.shell.files.has('SYS:SHELL'),false);
  tap(game,140,100);tap(game,140,100);
  assert.equal(game.windows.at(-1).name,'System');
  tap(game,250,125);assert.equal(game.selected,'System/Manual');
  tap(game,250,125);assert.equal(game.windows.at(-1).name,'Manual');
  game.draw(context);const w=game.windows.at(-1);
  tap(game,w.x+w.w-70,w.y+w.h-35);assert.equal(game.shellHelpPage,1);
  tap(game,w.x+35,w.y+w.h-35);assert.equal(game.shellHelpPage,0);
});
