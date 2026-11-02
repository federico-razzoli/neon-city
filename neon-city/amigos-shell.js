// Session-local AmigaDOS subset. All files live in memory and vanish on exit.
const COMMANDS=['HELP','DIR','LIST','CD','TYPE','ECHO','MAKEDIR','COPY','RENAME','DELETE','VERSION','INFO','AVAIL','DATE','CLS','ENDCLI'];
export class AmigosShell{
  cwd='SYS:';input='';history=[];historyIndex=0;draft='';lines=['AmigaShell','Copyright (C) 1985-1994 Commodore','Type HELP for commands.'];
  constructor(){
    this.files=new Map();
    for(const path of ['SYS:','SYS:System','SYS:Utilities','SYS:Prefs','SYS:Tools','SYS:S','SYS:C','RAM:','Work:'])this.files.set(path,null);
    for(const [path,content] of Object.entries({
      'SYS:System/Manual':"AMIGOS Shell commands\n\nHELP                 List commands\nDIR [path]           List names\nLIST [path]          List names and sizes\nCD [path]            Change/show directory; CD / goes up\nTYPE file            Read a text file\nECHO \"text\"          Print text\nECHO \"text\" TO file   Write a text file\nMAKEDIR drawer       Create a directory\nCOPY source TO dest  Copy a file; add ALL for directories\nRENAME old TO new    Rename/move\nDELETE path          Delete; add ALL for non-empty directories\nVERSION              Show OS version\nINFO                 Show disks\nAVAIL                Show memory\nDATE                 Show date/time\nCLS                  Clear screen\nENDCLI               Close Shell (also ENDSHELL)\n\nPaths: SYS: RAM: Work: S: C: (case-insensitive).\nQuote names containing spaces. >file writes; >>file appends.\nUp/Down recalls commands. Files last for this session.\n\nTry:\nECHO \"Hello Amiga!\" TO RAM:hello.txt\nTYPE RAM:hello.txt\nDIR RAM:\n",
      'SYS:ReadMe':'Welcome to AMIGOS!\nTry DIR, CD System, CD /, TYPE SYS:ReadMe.\nUse RAM: for your own files.\nECHO "Hello Amiga!" TO RAM:hello.txt',
      'SYS:S/Startup-Sequence':'C:SetPatch QUIET\nC:LoadWB\nEndCLI',
      'SYS:S/Shell-startup':'; Welcome to the AmigaDOS Shell',
      'Work:ReadMe':'Your Work volume. Files last for this session.'
    }))this.files.set(path,content);
    for(const command of COMMANDS)this.files.set('SYS:C/'+command,'AmigaDOS command: '+command);
    this.files.set('SYS:System/Shell','AmigaShell 40.2');
  }
  get prompt(){return `1.${this.cwd}> `;}
  resolve(raw=''){
    let path=raw,base=this.cwd;
    if(path.includes(':')){
      const i=path.indexOf(':'),volume=path.slice(0,i).toLowerCase();
      base=({sys:'SYS:','workbench3.1':'SYS:',ram:'RAM:','ram disk':'RAM:',work:'Work:',s:'SYS:S',c:'SYS:C'})[volume];
      if(!base)throw Error('Device not mounted');path=path.slice(i+1);
    }
    for(const part of path.split('/')){
      if(part===''){if(path&&path.startsWith('/')){base=this.parent(base);path=path.slice(1);}continue;}
      if(part==='..'){base=this.parent(base);continue;}
      base=base+(base.endsWith(':')?'':'/')+part;
      base=[...this.files.keys()].find(k=>k.toLowerCase()===base.toLowerCase())??base;
    }
    return [...this.files.keys()].find(k=>k.toLowerCase()===base.toLowerCase())??base;
  }
  parent(path){return path.includes('/')?path.slice(0,path.lastIndexOf('/')):path.slice(0,path.indexOf(':')+1);}
  require(path,dir=false){
    if(!this.files.has(path))throw Error('Object not found');
    if(dir&&this.files.get(path)!==null)throw Error('Object is not a directory');
    return path;
  }
  children(path){return [...this.files.keys()].filter(k=>k!==path&&this.parent(k)===path).sort((a,b)=>Number(this.files.get(b)===null)-Number(this.files.get(a)===null)||a.localeCompare(b));}
  destination(path){if(path.endsWith(':'))throw Error('Invalid file name');this.require(this.parent(path),true);return path;}
  recall(direction){
    if(this.historyIndex===this.history.length)this.draft=this.input;
    this.historyIndex=Math.max(0,Math.min(this.history.length,this.historyIndex+direction));
    this.input=this.historyIndex===this.history.length?this.draft:this.history[this.historyIndex];return this.input;
  }
  submit(line=this.input){
    this.input='';this.historyIndex=this.history.length;this.draft='';
    if(!line.trim())return;
    this.history.push(line);this.history=this.history.slice(-100);this.historyIndex=this.history.length;
    this.lines.push(this.prompt+line);
    try{
      const tokens=line.match(/"[^"]*"|>>?|[^\s>]+/g)?.map(s=>s.startsWith('"')?s.slice(1,-1):s)??[];
      if((line.match(/"/g)?.length??0)%2)throw Error('Unmatched quote');
      const command=tokens.shift().toUpperCase(),args=tokens;
      const redirect=args.findIndex(a=>a==='>'||a==='>>');
      let dest,append=false;
      if(redirect>=0){
        if(redirect!==args.length-2)throw Error('Invalid redirection');
        append=args[redirect]==='>>';dest=this.destination(this.resolve(args[redirect+1]));
        if(this.files.get(dest)===null)throw Error('Object is a directory');
        args.splice(redirect);
      }
      let output=this.run(command,args);
      if(dest){this.files.set(dest,(append?(this.files.get(dest)??''):'')+(output??'')+'\n');output=undefined;}
      if(output!==undefined&&output!=='')this.lines.push(...String(output).split('\n'));
      this.lines=this.lines.slice(-300);
      return command==='ENDCLI'||command==='ENDSHELL'?'close':undefined;
    }catch(error){this.lines.push(error.message);this.lines=this.lines.slice(-300);}
  }
  run(command,args){
    const needed=n=>{if(args.length<n)throw Error('Required argument missing');};
    if(command==='HELP')return 'Commands: '+COMMANDS.join(', ')+'\nPaths: SYS: RAM: Work: S: C:\nCD / = parent directory. Names ignore case.\nCOPY source TO target; DELETE drawer ALL\nECHO "text" TO file; Up/Down: history.';
    if(command==='VERSION')return 'Kickstart 40.68, Workbench 40.42';
    if(command==='DATE')return new Date().toLocaleString('en-GB');
    if(command==='AVAIL')return 'Type     Available    In-Use     Maximum\nChip       1853440    243712     2097152\nFast       8388608         0     8388608';
    if(command==='INFO')return 'Unit     Size  Used  Free  Full  Name\nDH0:      40M   12M   28M   30%  Workbench3.1\nDH1:      80M    1M   79M    1%  Work\nRAM:       0K    0K 1853K    0%  Ram Disk';
    if(command==='CLS'){this.lines=[];return;}
    if(command==='ENDCLI'||command==='ENDSHELL')return;
    if(command==='CD'){
      if(!args.length)return this.cwd;
      this.cwd=this.require(this.resolve(args[0]),true);return;
    }
    if(command==='DIR'||command==='LIST'){
      const flags=args.map(a=>a.toUpperCase()),all=flags.includes('ALL'),path=this.require(this.resolve(args.find(a=>!['ALL','DIRS','FILES'].includes(a.toUpperCase()))??''));
      const rows=[];
      const list=p=>{for(const k of this.files.get(p)===null?this.children(p):[p]){
        const content=this.files.get(k),dir=content===null;
        if((!flags.includes('DIRS')||dir)&&(!flags.includes('FILES')||!dir))rows.push((all?k:k.slice(this.parent(k).length).replace(/^\//,''))+(dir?' (dir)':command==='LIST'?`    ${content.length} bytes`:''));
        if(all&&dir)list(k);
      }};list(path);return rows.join('\n')||'Directory is empty';
    }
    if(command==='TYPE'){needed(1);const path=this.require(this.resolve(args[0]));if(this.files.get(path)===null)throw Error('Object is a directory');return this.files.get(path);}
    if(command==='ECHO'){
      const to=args.findIndex(a=>a.toUpperCase()==='TO');
      if(to<0)return args.join(' ');
      if(!args[to+1])throw Error('Required argument missing');
      const dest=this.destination(this.resolve(args[to+1]));if(this.files.get(dest)===null)throw Error('Object is a directory');this.files.set(dest,args.slice(0,to).join(' ')+'\n');return;
    }
    if(command==='MAKEDIR'){
      needed(1);for(const name of args){const path=this.destination(this.resolve(name));if(this.files.has(path))throw Error('Object already exists');this.files.set(path,null);}return;
    }
    if(command==='COPY'||command==='RENAME'){
      needed(2);const source=this.require(this.resolve(args[0])),tail=args.slice(1).filter(a=>a.toUpperCase()!=='TO'&&a.toUpperCase()!=='ALL');
      if(!tail.length)throw Error('Required argument missing');
      let dest=this.resolve(tail[0]);if(this.files.get(dest)===null)dest+=(dest.endsWith(':')?'':'/')+source.slice(this.parent(source).length).replace(/^\//,'');
      this.destination(dest);
      if(source.endsWith(':')||dest.toLowerCase()===source.toLowerCase()||dest.toLowerCase().startsWith(source.toLowerCase()+'/'))throw Error('Invalid destination');
      if(this.files.has(dest))throw Error('Object already exists');
      const subtree=[...this.files.entries()].filter(([k])=>k===source||k.startsWith(source+'/'));
      if(command==='COPY'&&this.files.get(source)===null&&!args.some(a=>a.toUpperCase()==='ALL'))throw Error('Use COPY drawer TO target ALL');
      for(const [k,v] of subtree)this.files.set(dest+k.slice(source.length),v);
      if(command==='RENAME'){for(const [k] of subtree)this.files.delete(k);if(this.cwd===source||this.cwd.startsWith(source+'/'))this.cwd=dest+this.cwd.slice(source.length);}return;
    }
    if(command==='DELETE'){
      needed(1);const path=this.require(this.resolve(args[0]));if(path.endsWith(':')||this.cwd===path||this.cwd.startsWith(path+'/'))throw Error('Object in use');
      const children=[...this.files.keys()].filter(k=>k.startsWith(path+'/'));
      if(children.length&&!args.some(a=>a.toUpperCase()==='ALL'))throw Error('Directory not empty (use ALL)');
      for(const k of [path,...children])this.files.delete(k);return;
    }
    throw Error(command+': Unknown command');
  }
}
