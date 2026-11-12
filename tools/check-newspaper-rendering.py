# SPDX-License-Identifier: AGPL-3.0-only
import asyncio,json,subprocess,argparse
from pathlib import Path
from playwright.async_api import async_playwright
parser=argparse.ArgumentParser(description='Compare newspaper rendering pixels; requires Python Playwright, Chromium, and a static server on port 8765.')
parser.add_argument('--chromium',required=True,help='Path to an existing Chromium executable')
args=parser.parse_args()
hook='''
window.newspaperCheck=async()=>{
 const result=[];
 for(let side=0;side<4;side++)for(const paper of ['DAILY BUGLE','NEON NEWS','THE RECORD'])for(const distance of [2,5,12])for(const degrees of [-70,-45,-20,0,20,45,70]){
  const a=[Math.PI,0,-Math.PI/2,Math.PI/2][side]+degrees*Math.PI/180;
  const m={x:14,z:14,side,w:(side<2?1:.9)*.85,d:(side<2?.9:1)*.85,paper};
  player.x=m.x+Math.sin(a)*distance;player.z=m.z+Math.cos(a)*distance;player.angle=Math.atan2(m.x-player.x,m.z-player.z);
  eye=1.5;prepareCamera();queue=[];
  ctx.fillStyle='#252233';ctx.fillRect(0,0,W,H);
  newspaperMachine(m);queue.sort((a,b)=>b.depth-a.depth);for(const f of queue)drawFace(f);
  const data=ctx.getImageData(0,0,W,H).data;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
  result.push({side,paper,distance,degrees,hash});
 }
 return result;
};
'''
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
  results=[]
  for before in [True,False]:
   page=await browser.new_page()
   await page.add_init_script('window.requestAnimationFrame=()=>0;Date.now=()=>1700000000000;')
   async def route(r):
    source=subprocess.check_output(['git','show','51c551d:neon-city/game.js'],text=True) if before else Path('neon-city/game.js').read_text()
    await r.fulfill(body=source+hook,content_type='text/javascript')
   await page.route('**/game.js?*',route)
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8765/neon-city/index.html')
   try: await page.wait_for_function('window.newspaperCheck !== undefined',timeout=15000)
   except: print(errors);raise
   results.append(await page.evaluate('newspaperCheck()'))
   await page.close()
  differences=[{'before':a,'after':b} for a,b in zip(*results) if a!=b]
  print(json.dumps({'views':len(results[0]),'different_frames':len(differences),'examples':differences[:2]}))
  assert not differences
  await browser.close()
asyncio.run(main())
