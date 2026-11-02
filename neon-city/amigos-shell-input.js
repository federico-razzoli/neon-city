// Real text input supplies native editing, paste, IME and mobile keyboards.
export function mountShellInput(game,canvas){
  const input=canvas.ownerDocument.createElement('input');
  input.type='text';input.className='amigos-shell-input';input.hidden=true;
  input.setAttribute('aria-label','AmigaDOS Shell command');
  input.autocomplete='off';input.autocapitalize='off';input.spellcheck=false;
  input.addEventListener('input',()=>{game.shell.input=input.value.slice(0,256);});input.maxLength=256;
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape')return;
    e.stopPropagation();
    if(e.key==='Enter'&&!e.isComposing){e.preventDefault();const result=game.shell.submit(input.value);input.value='';if(result==='close'){game.windows=game.windows.filter(w=>w.name!=='Shell');input.blur();canvas.focus();}}
    else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();input.value=game.shell.recall(e.key==='ArrowUp'?-1:1);input.setSelectionRange(input.value.length,input.value.length);}
  });
  canvas.parentElement.append(input);
  return {
    sync(running){
      const w=game.windows.at(-1),active=running&&!game.over&&w?.name==='Shell'&&!game.menu;
      input.hidden=!active;
      if(!active){if(input.ownerDocument.activeElement===input)input.blur();return;}
      input.value=game.shell.input;
      input.style.left=`${(w.x+12)/640*100}%`;input.style.top=`${(w.y+w.h-44)/360*100}%`;
      input.style.width=`${(w.w-34)/640*100}%`;input.style.height=`${24/360*100}%`;
      input.style.fontSize=`${Math.max(10,canvas.getBoundingClientRect().width/640*12)}px`;
    },
    focus(){if(!input.hidden)input.focus({preventScroll:true});},
    dispose(){input.remove();}
  };
}
