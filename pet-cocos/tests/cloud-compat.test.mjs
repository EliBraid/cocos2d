import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(fs.readFileSync(new URL('../assets/scripts/Cloud.ts',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
function setup(wx){
 const PlayerModel={}, exports={}, records=new Map();
 const modules={'./meta/PlayerModel':{PlayerModel,SAVE_KEY:'save'},'./meta/Events':{EVENTS:[]},'./meta/Welfare':{MAILS:[],CODES:{}}};
 vm.runInNewContext(code,{exports,wx,require:name=>{assert.ok(modules[name],name);return modules[name];},setTimeout,clearTimeout});
 return {api:exports,PlayerModel,store:{getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)},records};
}
test('TapTap cloud.init without callFunction preserves local startup and disables cloud features',async()=>{
 let initialized=false;
 const s=setup({cloud:{init(){initialized=true;}}});
 s.store.setItem('save','{"savedAt":123}');
 await s.api.cloudBoot(s.store);
 assert.equal(initialized,false);
 assert.equal(s.api.CloudState.online,false);
 assert.equal(s.store.getItem('save'),'{"savedAt":123}');
 assert.equal(s.PlayerModel.onSaved,undefined);
 assert.equal(await s.api.sendFeedback('test',{}),null);
 assert.equal(await s.api.towerRank(1,'player'),null);
});
test('absent platform and incomplete cloud objects do not reject startup',async()=>{
 for(const wx of [undefined,{}, {cloud:{}},{cloud:{callFunction(){throw Error('must not call');}}}]){
  const s=setup(wx);await s.api.cloudBoot(s.store);assert.equal(s.api.CloudState.online,false);
 }
});
test('throwing or rejecting init falls back to local startup',async()=>{
 for(const init of [()=>{throw Error('unsupported');},()=>Promise.reject(Error('unsupported'))]){
  const s=setup({cloud:{init,callFunction(){throw Error('must not call');}}});
  await s.api.cloudBoot(s.store);assert.equal(s.api.CloudState.online,false);
 }
});
test('throwing or rejecting callFunction stubs cannot reject startup',async()=>{
 for(const callFunction of [()=>{throw Error('unsupported');},()=>Promise.reject(Error('unsupported')),({fail})=>fail()]){
  const s=setup({cloud:{init(){},callFunction}});await s.api.cloudBoot(s.store);
  assert.equal(s.api.CloudState.online,false);assert.equal(s.PlayerModel.onSaved,undefined);
 }
});
test('supported WeChat cloud still restores and uploads saves, feedback and ranking',async()=>{
 const calls=[];const cloud={init(){assert.equal(this,cloud);},callFunction({data,success}){
  assert.equal(this,cloud);calls.push(data);success({result:{ok:true,save:{at:200,data:'{"savedAt":200}'},config:{}}});
 }};
 const s=setup({cloud});s.store.setItem('save','{"savedAt":100}');await s.api.cloudBoot(s.store);
 assert.equal(s.api.CloudState.online,true);assert.equal(s.store.getItem('save'),'{"savedAt":200}');
 s.PlayerModel.onSaved('{"savedAt":201}',201);s.api.flush();
 await s.api.sendFeedback('help',{});await s.api.towerRank(2,'forest');
 assert.deepEqual(calls.map(c=>c.action),['boot','save','feedback','tower']);
});
