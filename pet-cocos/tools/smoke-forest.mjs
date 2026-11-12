import {chromium} from 'playwright';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('../docs/forest-verification/',import.meta.url));await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:540,height:960}}),errors=[],warnings=[];
page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
let debug=null;
try{await page.goto(process.env.PET_PREVIEW_URL||'http://127.0.0.1:8393/');await page.waitForFunction(()=>globalThis.__forest?.ready,null,{timeout:30000});await page.waitForTimeout(1000);debug=await page.evaluate(()=>globalThis.__forest.debugInfo());}catch(e){errors.push(String(e));}
await page.screenshot({path:out+'/forest-first.png'});await fs.writeFile(out+'/smoke.json',JSON.stringify({debug,errors,warnings},null,2));console.log(JSON.stringify({debug,errors,warnings}));await browser.close();
