import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Capture the actual Cocos canvas and UI interactions, including native Spine.
const out=fileURLToPath(new URL('../docs/forest-v05-verification/',import.meta.url));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({viewport:{width:432,height:768},recordVideo:{dir:out,size:{width:432,height:768}}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  async function click(id){const p=await page.evaluate(id=>globalThis.__forest.buttonPosition(id),id);await page.mouse.click(p.x*.8,p.y*.8);}
  async function ground(x,z){const p=await page.evaluate(point=>globalThis.__forest.groundPosition(point),{x,z});await page.mouse.click(p.x*.8,p.y*.8);}
  await page.goto(process.env.PET_PREVIEW_URL||'http://127.0.0.1:8395/');
  await page.waitForFunction(()=>globalThis.__forest?.ready,null,{timeout:30000});
  await page.waitForTimeout(1200);
  await click('view');await page.waitForTimeout(1500);await click('view');await page.waitForTimeout(1500);await click('zoom');await page.waitForTimeout(1600);
  await page.waitForTimeout(1800);await click('pet');await page.waitForTimeout(1700);await click('scarf');await page.waitForTimeout(900);await click('scarf');await page.waitForTimeout(900);await click('scarf');
  await click('emotions');await click('surprise');await page.waitForTimeout(800);
  await click('zoom');await page.waitForTimeout(1000);
  await ground(0,-1.8);await page.waitForTimeout(2400);
  await click('train');
  await page.waitForFunction(()=>globalThis.__forest.trainingHits>=5,null,{timeout:20000});
  await page.waitForTimeout(500);
  await click('night');await page.waitForTimeout(1800);
  await click('fire');
  await page.waitForFunction(()=>globalThis.__forest.pending==='',null,{timeout:10000});
  await page.waitForTimeout(1600);
  await click('sleep');await page.waitForTimeout(1800);
  await click('sleep');await page.waitForTimeout(1000);
  const final=await page.evaluate(()=>globalThis.__forest.debugInfo());
  const video=page.video();await context.close();
  await video.saveAs(out+'/forest-native-spine.webm');await video.delete();
  await fs.writeFile(out+'/recording.json',JSON.stringify({source:'Actual Cocos Creator WebGL runtime; UI clicked through Playwright',errors,final},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({recorded:'docs/forest-v05-verification/forest-native-spine.webm',errors,hits:final.hits}));
} finally {await browser.close();}
