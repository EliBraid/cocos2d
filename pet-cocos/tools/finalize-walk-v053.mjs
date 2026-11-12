import fs from 'node:fs/promises';
import {FOX_LOCOMOTION as gait} from '../assets/scripts/FoxWalkPose.ts';
const file='assets/proto/forest/fox/fox.json',rig=JSON.parse(await fs.readFile(file,'utf8'));
// The painted hips remain stable; virtual knee roots follow the narrower
// side-walking stance, keeping the foot targets inside both leg chains' reach.
for(const [side,x] of [['left',18],['right',-20]])rig.animations.walk.bones['leg-'+side]={translate:[{x,y:0},{time:1,x,y:0}]};
// Complete, self-contained Spine cycle for inspection outside the game.
// The game uses `walk` plus terrain-projected targets; this clip bakes the same
// steady lateral contacts onto a flat floor at the actual .8 world-unit pace.
const contract=JSON.parse(await fs.readFile('source-assets/fox-v052/contract.json','utf8'));
const clip=structuredClone(rig.animations.walk),duration=gait.stride/gait.speed,unit=contract.worldUnitsPerSpineUnit,smooth=t=>t*t*t*(10+t*(-15+6*t));
const scaleTimes=v=>{if(!v||typeof v!=='object')return;if(typeof v.time==='number')v.time*=duration;for(const child of Object.values(v))if(typeof child==='object')scaleTimes(child);};scaleTimes(clip);
for(const [side,shift] of [['left',0],['right',.5]]){const ankle=rig.bones.find(b=>b.name==='ankle-'+side),toe=rig.bones.find(b=>b.name==='toe-'+side),rest=contract.targets[side].ankle,center=(contract.targets.left.ankle.x+contract.targets.right.ankle.x)/2,ankles=[],toes=[],rolls=[];
 for(let i=0;i<=96;i++){const p=(i/96+shift)%1,t=(p-.58)/.42,walk=p<.58?.56*(.29-p):-.56*.29+.56*smooth(t)-.56*.42*t,lift=p<.58?0:Math.sin(Math.PI*t)**2*.038,roll=p<.58?0:Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2*6,a=roll*Math.PI/180,x=rest.x+(center-rest.x)*.85+walk/unit,y=24+lift/unit,time=i/96*duration;ankles.push({time,x:x-ankle.x,y:y-ankle.y});toes.push({time,x:x+26*Math.cos(a)+12*Math.sin(a)-toe.x,y:y+26*Math.sin(a)-12*Math.cos(a)-toe.y});rolls.push({time,value:roll});}
 clip.bones['ankle-'+side]={translate:ankles,rotate:rolls};clip.bones['toe-'+side]={translate:toes};
}
rig.animations['walk-preview']=clip;rig.skeleton.hash='fox-v053-alternating-contacts';await fs.writeFile(file,JSON.stringify(rig,null,2));
contract.version='0.5.3';contract.flatWalkPreview={animation:'walk-preview',duration,speed:.8,stride:.56};await fs.writeFile('source-assets/fox-v052/contract.json',JSON.stringify(contract,null,2));await fs.writeFile('assets/scripts/FoxRig.ts','// Generated native rig contract.\nexport const FOX_RIG='+JSON.stringify(contract,null,2)+' as const;\n');
console.log('0.5.3: coordinated contacts and complete native walk-preview exported.');
