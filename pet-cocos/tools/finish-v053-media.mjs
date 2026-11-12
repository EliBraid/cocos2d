import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url),run=args=>{const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);},palette='[0:v]split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=diff[p];[b][p]paletteuse=alpha_threshold=128:dither=sierra2_4a';
for(const dir of ['docs/walk-v053/','docs/walk-v053/back/']){const r=JSON.parse(await fs.readFile(new URL(dir+'pose-review.json',root),'utf8'));run(['-framerate',String(r.fps),'-i',dir+'frames/%03d.png','-filter_complex',palette,'-loop','0',dir+'fox-walk.gif']);}

run(['-i','docs/walk-v053/after-walk.webm','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','docs/walk-v053/after-walk.mp4']);console.log('Native front/back walk loops, idle and actual-scene video saved.');
