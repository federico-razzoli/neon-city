# SPDX-License-Identifier: AGPL-3.0-only
import asyncio,json,subprocess,argparse
from pathlib import Path
from playwright.async_api import async_playwright
parser=argparse.ArgumentParser(description='Compare ordinary sign pixels against the pre-cache renderer. Requires Python Playwright, existing Chromium, and a static server on port 8765.')
parser.add_argument('--chromium',required=True)
args=parser.parse_args()
hook='''
window.signCheck=async()=>{
 const results=[];
 for(const text of ['NIGHT RIVER','PARK'])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(const height of [3.75,5.625])for(const distance of [3,8])for(const degrees of [-160,-110,-70,-20,20,70,110,160]){
  const s={x:8.6,z:8.6,height},raise=height-3.75;
  const boards=[{text,dx,dz,bottom:2.925+raise,top:3.495+raise}];
  const a=degrees*Math.PI/180;
  player.x=s.x+Math.sin(a)*distance;player.z=s.z+Math.cos(a)*distance;player.angle=Math.atan2(s.x+dx-player.x,s.z+dz-player.z);
  eye=1.65;prepareCamera();queue=[];
  ctx.fillStyle='#252233';ctx.fillRect(0,0,W,H);
  drawFingerpost(s,boards,{face,signTexture},{x:player.x,y:eye,z:player.z});
  queue.sort((a,b)=>b.depth-a.depth);for(const f of queue)drawFace(f);
  const data=ctx.getImageData(0,0,W,H).data;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
  results.push({text,dx,dz,height,distance,degrees,hash});
 }
 return results;
};
'''
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=args.chromium,headless=True,args=['--no-sandbox'])
  results=[]
  for before in [True,False]:
   page=await browser.new_page()
   await page.add_init_script('window.requestAnimationFrame=()=>0;Date.now=()=>1700000000000;')
   async def game(r):
    await r.fulfill(body=Path('neon-city/game.js').read_text()+hook,content_type='text/javascript')
   await page.route('**/game.js?*',game)
   if before:
    async def parks(r): await r.fulfill(body=subprocess.check_output(['git','show','42c46e0:neon-city/parks.js'],text=True),content_type='text/javascript')
    await page.route('**/parks.js?*',parks)
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8765/neon-city/index.html')
   try: await page.wait_for_function('window.signCheck !== undefined',timeout=15000)
   except: print(errors);raise
   results.append(await page.evaluate('signCheck()'))
   await page.close()
  differences=[{'before':a,'after':b} for a,b in zip(*results) if a!=b]
  print(json.dumps({'views':len(results[0]),'different_frames':len(differences),'examples':differences[:3]}))
  assert not differences
  await browser.close()
asyncio.run(main())
