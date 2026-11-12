import fs from 'node:fs';const du=(f,t)=>`data:${t};base64,`+fs.readFileSync(f).toString('base64');
const R='/mnt/user-data/outputs/battle/res/',E='/tmp/claude-0/fx/out/';
const A={crystalRed:du(R+'crystal-red.png','image/png'),crystal:du('/mnt/user-data/uploads/小游戏开发/pet-cocos/assets/resources/art/crystal.png','image/png'),portal:du(R+'portal.png','image/png'),eyes:du(R+'portal-eyes.png','image/png'),avatar:du(R+'ember-avatar.png','image/png'),
 raw:{'ember.atlas':du(E+'ember.atlas','text/plain'),'ember.json':du(E+'ember.json','application/json'),'ember.png':du(E+'ember.png','image/png'),'minion.atlas':du(R+'minion/minion.atlas','text/plain'),'minion.json':du(R+'minion/minion.json','application/json'),'minion.png':du(R+'minion/minion.png','image/png')}};
let h=fs.readFileSync('template.html','utf8');h=h.replace('__BOARD__',du(R+'board.png','image/png')).replace('__CORE__',()=>fs.readFileSync('/tmp/claude-0/bt/core.js','utf8')).replace('__ASSETS__',()=>JSON.stringify(A));
const out=process.argv[2]||'battle.html';fs.writeFileSync(out,h);console.log(out,(h.length/1e6).toFixed(2)+'MB');
