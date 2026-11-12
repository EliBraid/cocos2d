// usage: node preview.mjs <species> <out.png>
import {front} from '../ember-fox/parts.mjs';import {png} from '../ember-fox/render.mjs';import fs from 'node:fs';
const sp=process.argv[2]||'fox';const F=sp==='fox'?front():(await import(`./species/${sp}.mjs`)).front();
const order=['tail','leg-far','leg-near','arm-far','body','scarf-tail','ear-far','ear-near','head','eyes','brows','mouth','scarf-wrap','brooch','sword','arm-near'];
let s='<rect width="1000" height="1000" fill="#f3ead8"/>';
for(const k of order){const p=F[k];if(!p)continue;if(p.svg)s+=p.svg;else if(p.variants){const v=k==='eyes'?'open':k==='brows'?'calm':'smile';s+=p.variants[v]||'';}}
fs.writeFileSync(process.argv[3]||'prev.png',png(s,1));
