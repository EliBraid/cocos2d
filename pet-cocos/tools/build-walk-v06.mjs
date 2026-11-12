// v0.6: replaces walk / walk-back (+ previews) and adds walk-front using ChibiWalk.ts.
// Runs last in `npm run forest:assets`; safe to re-run on its own output.
import fs from 'node:fs/promises';
import {WALK_CYCLE,bodyPose,nativeFoot,STANCE_TRAVEL} from '../assets/scripts/ChibiWalk.ts';
const file='assets/proto/forest/fox/fox.json',contractFile='source-assets/fox-v052/contract.json';
const rig=JSON.parse((await fs.readFile(file,'utf8')).replace(/^﻿/,'')),contract=JSON.parse((await fs.readFile(contractFile,'utf8')).replace(/^﻿/,''));
const bone=n=>rig.bones.find(b=>b.name===n),D=WALK_CYCLE.duration,N=48,R=x=>+x.toFixed(3);
const frames=fn=>Array.from({length:N+1},(_,i)=>({time:+(i/N*D).toFixed(5),...fn(i/N)}));
const ankle={left:bone('ankle-left'),right:bone('ankle-right')},toe={left:bone('toe-left'),right:bone('toe-right')};
const center=(ankle.left.x+ankle.right.x)/2,legRoot=structuredClone({left:rig.animations.walk.bones['leg-left'],right:rig.animations.walk.bones['leg-right']});
function make(view){
 const body=t=>bodyPose(t,view),rot=(k,base=0)=>({rotate:frames(t=>({value:R(base+body(t)[k])}))});
 const bones={
  hips:{translate:frames(t=>({x:R(body(t).hipX),y:R(body(t).hipY)})),rotate:frames(t=>({value:R(body(t).hipR)}))},
  'back-btm':{scale:frames(t=>({x:R(body(t).squashX),y:R(body(t).squashY)})),rotate:frames(t=>({value:R(body(t).lean*.3)}))},
  'back-top':rot('lean'),
  head:{rotate:frames(t=>({value:R(body(t).headR-body(t).lean*.9)})),translate:frames(t=>({x:R(body(t).headX),y:R(body(t).headY)}))},
  'ear-left':rot('earL'),'ear-right':rot('earR'),
  tail:{rotate:frames(t=>({value:R(body(t).tail)})),translate:frames(t=>({x:0,y:R(body(t).tailY)}))},'tail-mid':rot('tailMid'),'tail-tip':rot('tailTip'),
  scarf:rot('scarf'),'scarf-mid':rot('scarfMid'),'scarf-tip':rot('scarfTip'),
  'arm-left':rot('armL'),'fore-left':rot('foreL'),'arm-right':rot('armR'),'fore-right':rot('foreR'),weapon:rot('blade')
 };
 for(const n of ['arm-left','fore-left','arm-right','fore-right','weapon'])bones['rear-'+n]=structuredClone(bones[n]);
 for(const [side,shift] of [['left',0],['right',.5]]){
  const tuck=(center-ankle[side].x)*(view==='side'?.18:.06),f=t=>nativeFoot(t+shift,view,tuck);
  const o={x:toe[side].x-ankle[side].x,y:toe[side].y-ankle[side].y};
  bones['ankle-'+side]={translate:frames(t=>{const p=f(t);return {x:R(p.x),y:R(p.y)};})};
  bones['toe-'+side]={translate:frames(t=>{const p=f(t),a=p.roll*Math.PI/180;return {x:R(p.x+o.x*Math.cos(a)-o.y*Math.sin(a)-o.x),y:R(p.y+o.x*Math.sin(a)+o.y*Math.cos(a)-o.y)};})};
  bones['knee-visual-'+side]={translate:frames(t=>{const p=f(t),b=body(t),bend=p.y>2?Math.min(1,p.y/14):0;return {x:R(p.x*.5+(view==='side'?7*bend:0)+b.hipX*.5),y:R(p.y*.55+b.hipY*.5+(view==='side'?0:3*bend))};})};
  const leg=structuredClone(legRoot[side]);if(leg?.translate?.length)leg.translate.at(-1).time=D;if(leg)bones['leg-'+side]=leg;
 }
 return {bones,events:[{time:0,name:'step-left'},{time:+(D/2).toFixed(5),name:'step-right'}]};
}
const A=rig.animations,swap=[{},{time:+(D*.5).toFixed(5),offsets:[{slot:'leg-left',offset:1},{slot:'leg-right',offset:-1}]},{time:D}];
A.walk=make('side');A['walk-preview']=structuredClone(A.walk);
A['walk-back']={...make('away'),drawOrder:swap};A['walk-back-preview']=structuredClone(A['walk-back']);
A['walk-front']={...make('toward'),drawOrder:structuredClone(swap)};
rig.skeleton.hash='fox-v06-chibi-bounce-walk';
Object.assign(contract,{version:'0.6.0',walkDuration:D,stride:WALK_CYCLE.stride,flatWalkPreview:{animation:'walk-preview',duration:D,speed:WALK_CYCLE.speed,stride:WALK_CYCLE.stride},walkClips:{side:'walk',away:'walk-back',toward:'walk-front'}});
await fs.writeFile(file,JSON.stringify(rig,null,2));await fs.writeFile(contractFile,JSON.stringify(contract,null,2));
await fs.writeFile('assets/scripts/FoxRig.ts','// Generated directional arm and rear gait contract (walk v0.6).\nexport const FOX_RIG='+JSON.stringify(contract,null,2)+' as const;\n');
console.log(JSON.stringify({version:contract.version,duration:D,stride:WALK_CYCLE.stride,stanceTravel:+STANCE_TRAVEL.toFixed(1),clips:['walk','walk-back','walk-front']}));
