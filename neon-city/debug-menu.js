// SPDX-License-Identifier: AGPL-3.0-only
import {PINE_CONE,LADYBUG,FLOWER,LAMP,PASTIS_BOTTLE,MARIJUANA_PLANT,TICKET,HOTEL_NOTE,arcadeTokens} from './inventory.js';
import {supportsRenderer} from './renderer-support.js';
import {BACKPACK} from './backpack.js';
import {BLOCK,RIVER_ROWS} from './world.js?v=start-pub-1';

export const DEBUG_MODE=true;
// Clear promenade between the road and river, away from the signposts.
export const DEBUG_RIVERSIDE_SPAWN={x:32,z:RIVER_ROWS[0]*BLOCK+16,angle:0};
export const DEBUG_DESTINATIONS=[['initial','Initial street'],['river','Riverside'],['park','Nearest park'],['pub','Pub'],['lavatory','Pub lavatory'],['hotel','Hotel lobby'],['stairs','Hotel stairwell'],['storage','Hotel storage room'],['corridor','Hotel corridor'],['arcade','Arcade'],['bookshop','Midnite Books']];
export function parseEvents(text){
  const value=JSON.parse(text);
  if(value===null||Array.isArray(value)||typeof value!=='object')throw new Error('The event register must be a JSON object.');
  // JSON values preserve booleans, strings, numbers, null, arrays and objects.
  const validate=v=>{
    if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Numbers must be finite.');
    if(v&&typeof v==='object')for(const [key,child] of Object.entries(v)){
      if(['__proto__','constructor','prototype'].includes(key))throw new Error(`Reserved key: ${key}`);
      validate(child);
    }
  };
  validate(value);return value;
}
export function walletPence(text){
  if(!/^\d+(\.\d{1,2})?$/.test(text))throw new Error('Enter a nonnegative pound amount with at most two decimal places.');
  const pence=Math.round(Number(text)*100);
  if(!Number.isSafeInteger(pence))throw new Error('That balance is too large.');
  return pence;
}
export function createDebugMenu(api){
  const dialog=document.createElement('dialog');dialog.id='debug-menu';
  dialog.setAttribute('aria-labelledby','debug-title');
  dialog.innerHTML=`<h2 id="debug-title">Debug menu</h2><p>Gameplay is paused. Choose a destination or edit game state.</p>
    <div role="tablist" aria-label="Debug controls">
      <button type="button" role="tab" id="debug-tab-locations" aria-controls="debug-panel-locations" aria-selected="true">LOCATIONS</button>
      <button type="button" role="tab" id="debug-tab-inventory" aria-controls="debug-panel-inventory" aria-selected="false" tabindex="-1">INVENTORY</button>
      <button type="button" role="tab" id="debug-tab-events" aria-controls="debug-panel-events" aria-selected="false" tabindex="-1">EVENTS</button>
    </div>
    <section role="tabpanel" id="debug-panel-locations" aria-labelledby="debug-tab-locations">
    <table><caption>Destination and renderer</caption><thead><tr><th>Destination</th><th>Canvas/WASM</th><th>Three.js</th></tr></thead><tbody></tbody></table>
    <p>Three.js is available for Midnite Books, the arcade, hotel hall, corridors, stairwell and storage room. Switching renderers preserves the current viewpoint and scene state.</p>
    </section>
    <section role="tabpanel" id="debug-panel-inventory" aria-labelledby="debug-tab-inventory" hidden>
    <fieldset><legend>Money</legend><label>Balance (£) <input id="debug-money" inputmode="decimal"></label> <button type="button" id="debug-money-apply">Apply money</button></fieldset>
    <fieldset><legend>Objects</legend><label>Object <select id="debug-object"></select></label> <button type="button" id="debug-add">Add to inventory</button></fieldset>
    </section>
    <section role="tabpanel" id="debug-panel-events" aria-labelledby="debug-tab-events" hidden>
    <fieldset><legend>Game event register</legend><label for="debug-events">Edit JSON to add, change or delete keys. Changes take effect only on Apply.</label><textarea id="debug-events" rows="8" spellcheck="false"></textarea><button type="button" id="debug-events-apply">Apply events</button></fieldset>
    </section>
    <p id="debug-status" role="status" aria-live="polite"></p><button type="button" id="debug-close">Close and resume</button>`;
  document.body.append(dialog);
  const find=id=>dialog.querySelector(`#debug-${id}`),status=message=>{find('status').textContent=message;};
  const attempt=fn=>{try{fn();}catch(error){status(error.message);}};
  const tabs=[...dialog.querySelectorAll('[role="tab"]')];
  function selectTab(selected){
    for(const tab of tabs){
      const active=tab===selected;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
    }
    status('');
  }
  for(const [index,tab] of tabs.entries()){
    tab.addEventListener('click',()=>selectTab(tab));
    tab.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
      if(next===null)return;
      event.preventDefault();selectTab(tabs[next]);tabs[next].focus();
    });
  }
  let park,sequence='',pending=false;
  const destinationButtons=[];
  for(const [id,label] of DEBUG_DESTINATIONS){
    const row=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=label;row.append(name);
    for(const [renderer,labelRenderer] of [['canvas','Canvas/WASM'],['three','Three.js']]){
      const cell=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent=labelRenderer;button.setAttribute('aria-label',`${label}: ${labelRenderer}`);
      const supported=supportsRenderer(id,renderer);
      button.disabled=!supported;if(!supported)button.title='Renderer not implemented for this destination';
      destinationButtons.push({button,supported});
      button.addEventListener('click',async()=>{
        if(pending)return;pending=true;
        for(const {button} of destinationButtons)button.disabled=true;
        find('close').disabled=true;dialog.setAttribute('aria-busy','true');
        status(renderer==='three'?'Loading Three.js…':'Entering destination…');
        try{await api.travel(id,park,renderer);dialog.close();}
        catch(error){status(error.message);}
        finally{
          pending=false;find('close').disabled=false;dialog.removeAttribute('aria-busy');
          for(const {button,supported} of destinationButtons)button.disabled=!supported;
        }
      });cell.append(button);row.append(cell);
    }
    dialog.querySelector('tbody').append(row);
  }
  const objects=[PINE_CONE,LADYBUG,FLOWER,LAMP,PASTIS_BOTTLE,MARIJUANA_PLANT,TICKET,HOTEL_NOTE,BACKPACK];
  for(const item of [...objects,{id:'arcade-token',name:'ARCADE TOKEN'}]){
    const option=document.createElement('option');option.value=item.id;option.textContent=item.name;find('object').append(option);
  }
  find('add').onclick=()=>{const id=find('object').value;status(api.inventory.take(id==='arcade-token'?arcadeTokens(1):{...objects.find(item=>item.id===id)}));};
  find('money-apply').onclick=()=>attempt(()=>{api.wallet.pence=walletPence(find('money').value.trim());api.updateMoney();status('Money applied.');});
  find('events-apply').onclick=()=>attempt(()=>{
    const events=parseEvents(find('events').value);
    for(const key of Object.keys(api.register))delete api.register[key];
    Object.assign(api.register,events);status('Events applied.');
  });
  find('close').onclick=()=>{if(!pending)dialog.close();};
  dialog.addEventListener('cancel',event=>{if(pending)event.preventDefault();});
  dialog.addEventListener('close',()=>{sequence='';api.resume();});
  return {
    get open(){return dialog.open;},
    handleKey(event){
      if(!DEBUG_MODE||!api.canOpen()||event.target.closest?.('input,textarea,select,[contenteditable]')||event.ctrlKey||event.metaKey||event.altKey){sequence='';return false;}
      if(event.repeat)return false;
      const key=event.key.toLowerCase();sequence=(sequence+key).slice(-6);
      if(sequence!=='qwerty')return false;
      sequence='';event.preventDefault();park=api.nearestPark();api.pause();
      find('money').value=(api.wallet.pence/100).toFixed(2);find('events').value=JSON.stringify(api.register,null,2);status('');
      selectTab(tabs[0]);dialog.showModal();return true;
    }
  };
}
