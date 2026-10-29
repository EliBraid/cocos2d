import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('all bones including the sword are ordered after their parents',()=>{
 const rig=JSON.parse(fs.readFileSync(new URL('../assets/proto/fox/fox.json',import.meta.url),'utf8')),seen=new Set();
 for(const b of rig.bones){if(b.parent)assert.ok(seen.has(b.parent),b.name+' appears before its parent '+b.parent);seen.add(b.name);}
 for(const slot of rig.slots)assert.ok(seen.has(slot.bone));
});
