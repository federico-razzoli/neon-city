# SPDX-License-Identifier: AGPL-3.0-only
import asyncio,json,argparse,subprocess
from playwright.async_api import async_playwright
hook='''
window.streetTest={render,player,city,setTime:t=>{time=t;}};
'''
parser=argparse.ArgumentParser(description='Compare full street frames and render timings against the pre-WASM renderer. Requires Python Playwright and a running static server.')
parser.add_argument('--url',default='http://localhost:8765')
parser.add_argument('--browser',default='chromium',choices=['chromium','webkit'])
parser.add_argument('--rounds',type=int,default=1)
args=parser.parse_args()
baseline=subprocess.check_output(['git','show','2df3d9e8fac894d706c74038c026f93484f19b70:neon-city/perspective.js'],text=True)
async def main():
 async with async_playwright() as p:
  browser=await getattr(p,args.browser).launch(headless=True)
  results=[]
  for wasm in ([False,True,True,False]*args.rounds):
   page=await browser.new_page()
   await page.add_init_script('''let seed=123456;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);window.requestAnimationFrame=()=>0;Date.now=()=>1700000000000;''')
   async def route(r):
    response=await r.fetch()
    await r.fulfill(response=response,body=(await response.text())+hook)
   await page.route('**/game.js?*',route)
   if not wasm:
    await page.route('**/perspective.js?*',lambda r:r.fulfill(body=baseline,content_type='text/javascript'))
   await page.goto(args.url+'/neon-city/index.html')
   await page.wait_for_function('window.streetTest !== undefined')
   if wasm:
    await page.wait_for_function("import('./wall-columns-wasm.js').then(m=>!!m.wallColumnKernel)")
   hashes=await page.evaluate('''async()=>{
    const {render,player,city,setTime}=streetTest,origin={...player},ctx=document.querySelector('#view').getContext('2d');
    const hashes=[];
    for(let i=0;i<60;i++){
      player.x=origin.x+Math.sin(i*.07)*6;player.z=origin.z+Math.cos(i*.09)*6;player.angle=origin.angle+i*.045;city.update(player.x,player.z);setTime(i/60);render();
      const data=ctx.getImageData(0,0,640,360).data;
      hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join(''));
    }
    return hashes;
   }''')
   # Pixel readback can change Canvas backend selection. Use a fresh page for timing.
   await page.reload()
   await page.wait_for_function('window.streetTest !== undefined')
   if wasm:
    await page.wait_for_function("import('./wall-columns-wasm.js').then(m=>!!m.wallColumnKernel)")
   result=await page.evaluate('''()=>{
    const {render,player,city,setTime}=streetTest,origin={...player},times=[];
    function view(i){player.x=origin.x+Math.sin(i*.07)*6;player.z=origin.z+Math.cos(i*.09)*6;player.angle=origin.angle+i*.045;city.update(player.x,player.z);setTime(i/60);}
    for(let i=0;i<120;i++){view(i);render();}
    for(let i=0;i<360;i++){view(i);const start=performance.now();render();times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);
    return {median:times[180],p95:times[342],p99:times[356],mean:times.reduce((a,b)=>a+b)/times.length};
   }''')
   result['hashes']=hashes
   print(('wasm' if wasm else 'baseline'),json.dumps({k:v for k,v in result.items() if k!='hashes'}),flush=True)
   results.append(result)
   await page.close()
  different=sum(a!=b for r in results[1:] for a,b in zip(results[0]['hashes'],r['hashes']));print('Different frame hashes:',different,flush=True);assert different==0
  await browser.close()
asyncio.run(main())
