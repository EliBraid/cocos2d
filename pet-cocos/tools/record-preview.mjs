import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('../docs/verification/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({viewport:{width:360,height:640},recordVideo:{dir:out,size:{width:360,height:640}}});
  const page=await context.newPage();
  await page.goto(process.env.PET_PREVIEW_URL||'http://127.0.0.1:8392/');
  await page.waitForFunction(()=>globalThis.__petGame?.ready);
  await page.evaluate(()=>globalThis.__petGame.navigate('pet'));
  await page.waitForTimeout(1800);
  for(const [id,duration] of [['pose-walk',1800],['pose-attack',1300],['pose-hit',850],['pose-happy',1600],['pose-idle',1700]]){
    const p=await page.evaluate(id=>globalThis.__petGame.buttonPosition(id),id);
    await page.mouse.click(p.x*2/3,p.y*2/3);
    await page.waitForTimeout(duration);
  }
  const video=page.video();await context.close();await video.saveAs(out+'/fox-native-spine.webm');await video.delete();
  console.log('Recorded actual Cocos Spine animation: docs/verification/fox-native-spine.webm');
} finally {await browser.close();}
