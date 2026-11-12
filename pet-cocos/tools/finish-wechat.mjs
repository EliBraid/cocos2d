// After the WeChat mini-game build: move remote bundles out of the upload folder and check the package limits
// (主包 ≤ 4MB, 主包+分包 ≤ 30MB; see developers.weixin.qq.com 小游戏 分包加载).
import fs from 'node:fs';import path from 'node:path';
const out='build/wechatgame',remote=path.join(out,'remote'),aside='build/wechatgame-remote';
if(fs.existsSync(remote)){fs.rmSync(aside,{recursive:true,force:true});fs.renameSync(remote,aside);}
const size=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).reduce((s,e)=>{const p=path.join(dir,e.name);return s+(e.isDirectory()?size(p):fs.statSync(p).size);},0):0;
const MB=n=>(n/1048576).toFixed(2)+'MB',total=size(out),sub=size(path.join(out,'subpackages')),main=total-sub;
console.log(`wechat package: main ${MB(main)} / 4MB, subpackages ${MB(sub)}, total ${MB(total)} / 30MB; remote bundles moved to ${aside} (${MB(size(aside))}, not uploaded)`);
if(main>4*1048576||total>30*1048576){console.error('WeChat package limit exceeded');process.exit(1);}
