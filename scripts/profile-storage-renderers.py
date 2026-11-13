#!/usr/bin/env python3
"""Compare the storage renderers using an existing Playwright Chromium install.

Serve the repository over HTTP first. This script adds test hooks through request
interception only; the shipped game exposes no profiling or state-mutation API.
"""
import argparse
import base64
import gzip
import json
import platform
import statistics
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HOOK='''
globalThis.__storageProfile={
  async select(renderer){
    const start=performance.now();
    await selectDebugDestination('storage',null,renderer);
    // Keep the initial empty-room fixture identical: no timed guest arrivals.
    hotelLife.wait=3600;running=false;render();
    return performance.now()-start;
  },
  capture(view){
    Object.assign(player,view);render();
    return (threeCanvas&&!threeCanvas.hidden?threeCanvas:canvas).toDataURL();
  },
  async run(count,durationMs=0){
    const cpu=[],intervals=[],phases={};let previous=null;const started=performance.now();
    const observer=new PerformanceObserver(list=>{
      for(const entry of list.getEntries())(phases[entry.name]??=[]).push(entry.duration);
    });
    observer.observe({type:'measure'});
    for(let i=0;durationMs?performance.now()-started<durationMs:i<count;i++){
      const now=await new Promise(window.__nativeRAF);
      if(previous!==null)intervals.push(now-previous);previous=now;
      Object.assign(player,{x:1.2,z:.8,angle:.28*Math.sin(2*Math.PI*(durationMs?(now-started)/durationMs:i/count))});
      running=true;last=now-1000/60;
      const start=performance.now();tick(now);cpu.push(performance.now()-start);
      running=false;
    }
    await new Promise(resolve=>setTimeout(resolve,0));observer.disconnect();
    return {durationMs:performance.now()-started,cpu,intervals,phases,memory:threeRenderer?{...threeRenderer.info.memory}:null};
  },
  hardware(){
    const gl=threeCanvas?.getContext('webgl2');
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
  }
};
'''
INIT='''
let seed=42;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
Date.now=()=>123456;
window.__nativeRAF=window.requestAnimationFrame.bind(window);
window.requestAnimationFrame=()=>0;
'''
VIEWS={'spawn':{'x':1.2,'z':.8,'angle':0},'note':{'x':1.2,'z':.6,'angle':1.5707963267948966},
       'crate':{'x':1.2,'z':2.8,'angle':0},'exit':{'x':1.2,'z':.8,'angle':3.141592653589793}}

def summary(values):
    ordered=sorted(values)
    return {'median':statistics.median(ordered),'p95':ordered[max(0,int(len(ordered)*.95)-1)],'max':max(ordered)}

def save_trace(page,session,output):
    complete={}
    session.on('Tracing.tracingComplete',lambda event:complete.update(event))
    session.send('Tracing.end')
    for _ in range(200):
        if 'stream' in complete:break
        page.wait_for_timeout(50)
    if 'stream' not in complete:raise RuntimeError('Chromium did not finish the performance trace')
    stream=complete['stream']
    with gzip.open(output,'wb') as file:
        while True:
            chunk=session.send('IO.read',{'handle':stream})
            file.write(base64.b64decode(chunk['data']) if chunk.get('base64Encoded') else chunk['data'].encode())
            if chunk.get('eof'):break
    session.send('IO.close',{'handle':stream})

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url',default='http://127.0.0.1:8899')
    parser.add_argument('--output',type=Path,default=Path('/tmp/neon-storage-profile'))
    parser.add_argument('--browser-executable',required=True)
    parser.add_argument('--seconds',type=float,default=10)
    args=parser.parse_args()
    if args.seconds<2:parser.error('--seconds must be at least 2')
    args.output.mkdir(parents=True,exist_ok=True)
    source=(ROOT/'neon-city/game.js').read_text()+HOOK
    report={'baseRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'workingTree':'step 2 implementation (see accompanying report)',
            'platform':platform.platform(),'viewport':[1280,900],'nativeViewport':[640,360],
            'recordingSeconds':args.seconds,'warmupFrames':30,'worldSeed':123456,'randomSeed':42,'renderers':{}}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.browser_executable,headless=True,
            args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        report['chromiumVersion']=browser.version
        for renderer in ['canvas','three']:
            page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.add_init_script(INIT)
            page.route('**/game.js*',lambda route:route.fulfill(body=source,content_type='text/javascript'))
            page.goto(args.base_url+'/neon-city/');page.wait_for_function('!!window.__storageProfile')
            loading=page.evaluate('(r)=>__storageProfile.select(r)',renderer)
            page.evaluate('__storageProfile.run(30)')
            session=page.context.new_cdp_session(page)
            session.send('Profiler.enable');session.send('Profiler.setSamplingInterval',{'interval':1000})
            session.send('Profiler.start')
            session.send('Tracing.start',{'categories':'devtools.timeline,v8,blink.user_timing,gpu',
                'options':'record-as-much-as-possible','transferMode':'ReturnAsStream'})
            data=page.evaluate('(seconds)=>__storageProfile.run(0,seconds*1000)',args.seconds)
            profile=session.send('Profiler.stop')['profile']
            (args.output/f'{renderer}.cpuprofile').write_text(json.dumps(profile))
            save_trace(page,session,args.output/f'{renderer}.trace.json.gz')
            for name,view in VIEWS.items():
                image=page.evaluate('(view)=>__storageProfile.capture(view)',view)
                (args.output/f'{renderer}-{name}.png').write_bytes(base64.b64decode(image.split(',')[1]))
            hardware=page.evaluate('__storageProfile.hardware()')
            if hardware:report['webglRenderer']=hardware
            assert not errors,errors
            report['renderers'][renderer]={'initialLoadAndFirstRenderMs':loading,'recordedDurationMs':data['durationMs'],'frames':len(data['cpu']),'completeTickCpuMs':summary(data['cpu']),
                'rafIntervalMs':summary(data['intervals']),
                'intervalsOver25ms':sum(ms>25 for ms in data['intervals']),
                'phasesMs':{name:summary(values) for name,values in data['phases'].items()},'memory':data['memory']}
            (args.output/f'{renderer}-samples.json').write_text(json.dumps(data,indent=2))
            print(renderer,json.dumps(report['renderers'][renderer]),flush=True)
            page.close()
        page=browser.new_page()
        pairs={name:[base64.b64encode((args.output/f'{renderer}-{name}.png').read_bytes()).decode()
                     for renderer in ['canvas','three']] for name in VIEWS}
        comparison=page.evaluate('''async pairs=>{
          const result={};
          for(const [name,pair] of Object.entries(pairs)){
            const pixels=[];
            for(const source of pair){
              const image=new Image();image.src='data:image/png;base64,'+source;await image.decode();
              const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
              const context=canvas.getContext('2d');context.drawImage(image,0,0);
              pixels.push(context.getImageData(0,0,canvas.width,canvas.height).data);
            }
            let changed=0,error=0;
            for(let i=0;i<pixels[0].length;i+=4){
              let differs=false;
              for(let channel=0;channel<3;channel++){
                const delta=Math.abs(pixels[0][i+channel]-pixels[1][i+channel]);error+=delta;differs ||= delta!==0;
              }
              if(differs)changed++;
            }
            const count=pixels[0].length/4;
            result[name]={changedPixels:changed,totalPixels:count,meanAbsoluteChannelError:error/(count*3)};
          }
          return result;
        }''',pairs)
        (args.output/'visual-comparison.json').write_text(json.dumps(comparison,indent=2)+'\n')
        browser.close()
    (args.output/'metrics.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':main()
