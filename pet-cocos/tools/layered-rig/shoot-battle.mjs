// Screenshots a real battle (and the camp) with a chosen deck, to check how pets look in game.
// needs the build served: node tools/portrait-rig/shoot-battle.mjs [outDir] [kind,kind,...]
// (default server http://127.0.0.1:8395/, override with BATTLE_URL)
import {chromium} from 'playwright';import fs from 'node:fs';
const out=process.argv[2]||'docs/battle/puppet',deck=(process.argv[3]||'fox,cat,tiger,frog,panda,octopus').split(',');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:540,height:960}});
// skip the login screen so the camp shows straight away
await page.addInitScript(()=>{(globalThis).__petGuardiansLoggedIn=true;});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:8395/');
await page.evaluate(d=>{const K='pet-guardians-player-v1',s=JSON.parse(localStorage.getItem(K)||'{}');Object.assign(s,{version:1,agreed:true,owned:d,deck:d,stamina:99});localStorage.setItem(K,JSON.stringify(s));(globalThis).__petGuardiansLoggedIn=true;},deck);
await page.reload();
await page.waitForFunction(()=>(globalThis).__home?.ready,null,{timeout:60000});
await page.waitForTimeout(4000);await page.screenshot({path:out+'/camp.png'});
await page.evaluate(()=>(globalThis).cc.director.loadScene('Battle'));
await page.waitForFunction(()=>(globalThis).__battle?.ready,null,{timeout:60000});
const deployed=await page.evaluate(()=>{const B=(globalThis).__battle.battle;B.gold=99999;const out=[];for(let i=0;i<6;i++)for(let c=0;c<B.cards.length;c++){const p=B.deploy(c,i);if(p){out.push(p.kind);break;}}return out;});
for(const t of [1500,4000,9000]){await page.waitForTimeout(t-(t>1500?(t===4000?1500:4000):0));await page.screenshot({path:`${out}/battle-${t}.png`});}
console.log(JSON.stringify({deployed,errors:errors.slice(0,5)}));
await browser.close();
