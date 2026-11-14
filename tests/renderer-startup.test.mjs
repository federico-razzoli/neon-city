import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const game=await readFile(new URL('../neon-city/game.js',import.meta.url),'utf8');
const startup=game.slice(game.indexOf('async function prepareRendererAtStartup(){'),game.indexOf('async function selectDebugDestination('));
function fixture(prepareThreeRenderer){
  const start={disabled:true,innerHTML:'LOADING THE NIGHT',busy:true,removeAttribute(name){assert.equal(name,'aria-busy');this.busy=false;}},description={textContent:'Welcome'};
  const state={start,prepareThreeRenderer,document:{querySelector:()=>description},fallback:0,useCanvasFallback(){state.fallback++;}};
  const ready=runInNewContext(startup+'\nprepareRendererAtStartup();',state);return {state,start,description,ready};
}
test('title remains gated until shared renderer preparation finishes',async()=>{
  let resolve,calls=0;const pending=new Promise(r=>{resolve=r;});const {start,state,ready}=fixture(()=>{calls++;return pending;});
  assert.equal(start.disabled,true);assert.equal(calls,1);resolve();await ready;
  assert.equal(start.disabled,false);assert.equal(start.busy,false);assert.match(start.innerHTML,/STEP INTO THE NIGHT/);assert.equal(state.fallback,0);
});
test('renderer failure keeps play gated without selecting Canvas',async()=>{
  const {start,state,description,ready}=fixture(async()=>{throw new Error('WebGL unavailable');});await ready;
  assert.equal(start.disabled,true);assert.equal(start.busy,false);assert.equal(state.fallback,0);assert.match(description.textContent,/WebGL unavailable/);
});
test('initial HTML gates play and gameplay checks that gate before enabling movement',async()=>{
  const html=await readFile(new URL('../neon-city/index.html',import.meta.url),'utf8');
  assert.match(html,/<button id="start" disabled aria-busy="true">LOADING THE NIGHT/);
  const play=game.slice(game.indexOf('function play(){'),game.indexOf("start.addEventListener('click',play)"));
  let enabled=0;const state={start:{disabled:true},enableSound(){enabled++;}};
  runInNewContext(play+'\nplay();',state);assert.equal(enabled,0);
});

test('world rendering uses Three.js exclusively and arcade drawing has its own renderer',()=>{
  const render=game.slice(game.indexOf('function render(){'),game.indexOf('// Debug travel'));
  assert.match(render,/cabinetRenderer.draw\(ping,running\)/);
  assert.doesNotMatch(game,/^import .*from ['"]\.\/cabinet-renderer\.js['"]/m);
  assert.doesNotMatch(game,/import\(['"]\.\/cabinet-renderer\.js['"]\)/);
  assert.match(render,/syncArcadeDisplay\(\)/);
  assert.match(render,/selectRenderSurface\(true\)/);
  assert.match(render,/if\(threeRenderer\)/);
  assert.doesNotMatch(game,/canvasRenderer|createCanvasRenderer|useCanvasFallback|wall-columns|texture-pixels/);
  assert.doesNotMatch(render,/worldScene|rendererChoice/);
});
