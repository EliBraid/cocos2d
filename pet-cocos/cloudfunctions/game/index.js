// 灵爪守望 · single cloud function. The caller's openid comes from the WeChat context (no login server needed).
// actions: boot (save + live config) | save | feedback | tower (submit best floor, get top list) | towerTop
// Collections (edit config ones in the 云开发 console): saves, feedback, tower, events, mails, codes, notices
const cloud=require('wx-server-sdk');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const db=cloud.database(),_=db.command;
const MAX_SAVE=200*1024,TOP=20;

async function all(name){try{const r=await db.collection(name).where({enabled:_.neq(false)}).limit(100).get();return r.data.map(({_id,_openid,enabled,...d})=>({id:_id,...d}));}catch(e){return [];}}
async function getDoc(name,id){try{return (await db.collection(name).doc(id).get()).data;}catch(e){return null;}}

exports.main=async(event)=>{const {OPENID}=cloud.getWXContext(),a=event.action;
 if(!OPENID)return {ok:false,msg:'no openid'};
 if(a==='boot'){const [save,events,mails,codes,notices]=await Promise.all([getDoc('saves',OPENID),all('events'),all('mails'),all('codes'),all('notices')]);
  return {ok:true,openid:OPENID,save:save?{data:save.data,at:save.at}:null,config:{events,mails,codes,notices}};}
 if(a==='save'){const data=String(event.data||''),at=Number(event.at)||0;if(!data||data.length>MAX_SAVE)return {ok:false,msg:'bad save'};
  const old=await getDoc('saves',OPENID);if(old&&old.at>at)return {ok:false,msg:'stale',at:old.at}; // another device saved later
  await db.collection('saves').doc(OPENID).set({data:{data,at,updated:db.serverDate()}});return {ok:true,at};}
 if(a==='feedback'){const text=String(event.text||'').slice(0,500).trim();if(!text)return {ok:false,msg:'empty'};
  await db.collection('feedback').add({data:{openid:OPENID,text,info:event.info||{},at:db.serverDate(),done:false}});return {ok:true};}
 if(a==='tower'||a==='towerTop'){
  if(a==='tower'){const best=Math.max(0,Math.min(9999,Math.floor(Number(event.best)||0))),name=String(event.name||'队长').slice(0,12);const old=await getDoc('tower',OPENID);
   if(!old||best>old.best)await db.collection('tower').doc(OPENID).set({data:{best,name,at:db.serverDate()}});}
  const top=(await db.collection('tower').orderBy('best','desc').orderBy('at','asc').limit(TOP).get()).data.map(d=>({name:d.name,best:d.best,me:d._id===OPENID}));
  const mine=await getDoc('tower',OPENID);let rank=0;if(mine)rank=(await db.collection('tower').where({best:_.gt(mine.best)}).count()).total+1;
  return {ok:true,top,mine:mine?{best:mine.best,rank}:null};}
 return {ok:false,msg:'unknown action'};};
