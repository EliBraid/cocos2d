// 微信云开发 (env below): cloud save, live config (events / mails / codes / notices), feedback and the tower leaderboard.
// Everything degrades to offline: outside WeChat or without network the game keeps working on the local save.
// Server side: cloudfunctions/game (one function, `action` picks the job).
import {PlayerModel,SAVE_KEY} from './meta/PlayerModel';
import {EVENTS} from './meta/Events';
import type {GameEvent} from './meta/Events';
import {MAILS,CODES} from './meta/Welfare';
import type {Bundle,MailDef} from './meta/Welfare';
export const CLOUD_ENV='cloud1-d3gkoj0jp68f9e79e';
export interface Notice{id:string;title:string;body:string}
const wx=()=>(globalThis as any).wx;
let ready=false,booted:Promise<void>|null=null,pending:{data:string;at:number}|null=null,timer:any=null;
export const CloudState={online:false,notices:[] as Notice[]};
function call<T=any>(data:any,timeoutMs=8000):Promise<T|null>{const cloud=wx()?.cloud;
 if(!ready||typeof cloud?.callFunction!=='function')return Promise.resolve(null);
 return new Promise(ok=>{const t=setTimeout(()=>ok(null),timeoutMs);
  const fail=()=>{clearTimeout(t);ok(null);};
  try{const request=cloud.callFunction({name:'game',data,success:(r:any)=>{clearTimeout(t);ok(r?.result?.ok?r.result as T:null);},fail});
   // Compatibility runtimes may expose a stub that throws or rejects instead of invoking fail.
   if(typeof request?.catch==='function')request.catch(fail);
  }catch{fail();}});}
/** live config from the console: rows are appended to (or replace by id) the built-in lists */
function applyConfig(c:any){if(!c)return;
 for(const e of c.events||[])if(e?.name&&e.mods){const i=EVENTS.findIndex(x=>x.id===e.id);const ev={id:e.id,name:e.name,desc:e.desc||'',icon:e.icon||'star',mods:e.mods,weekdays:e.weekdays,from:e.from,to:e.to} as GameEvent;if(i>=0)EVENTS[i]=ev;else EVENTS.push(ev);}
 for(const m of c.mails||[])if(m?.title&&!MAILS.some(x=>x.id===m.id))MAILS.push({id:m.id,from:m.from||'运营组',title:m.title,body:m.body||'',b:m.b} as MailDef);
 for(const k of c.codes||[])if(k?.id&&k.b)CODES[String(k.id).toUpperCase()]=k.b as Bundle;
 CloudState.notices=(c.notices||[]).filter((n:any)=>n?.title).map((n:any)=>({id:n.id,title:n.title,body:n.body||''}));}
/** once per launch, before the PlayerModel is made: pull config + the cloud save (newer one wins) */
export function cloudBoot(store:{getItem(k:string):string|null;setItem(k:string,v:string):void}){return booted??=(async()=>{
 const cloud=wx()?.cloud;
 // TapTap can expose cloud.init without implementing WeChat cloud.callFunction.
 // Presence of the cloud object alone does not mean cloud services are supported.
 if(typeof cloud?.init!=='function'||typeof cloud?.callFunction!=='function')return;
 try{await cloud.init({env:CLOUD_ENV,traceUser:true});ready=true;}catch{return;}
 const r=await call<any>({action:'boot'});if(!r)return;CloudState.online=true;applyConfig(r.config);
 let localAt=0;try{localAt=JSON.parse(store.getItem(SAVE_KEY)||'{}').savedAt||0;}catch{}
 if(r.save&&r.save.at>localAt){try{store.setItem(SAVE_KEY,r.save.data);}catch{}}
 // every later local save is uploaded a few seconds after the last change
 PlayerModel.onSaved=(data,at)=>{pending={data,at};clearTimeout(timer);timer=setTimeout(flush,4000);};})();}
export function flush(){if(!pending)return;const p=pending;pending=null;call({action:'save',data:p.data,at:p.at});}
export function sendFeedback(text:string,info:any){return call({action:'feedback',text,info});}
export function towerRank(best?:number,name?:string){return call<{top:{name:string;best:number;me:boolean}[];mine:{best:number;rank:number}|null}>(best?{action:'tower',best,name}:{action:'towerTop'});}
