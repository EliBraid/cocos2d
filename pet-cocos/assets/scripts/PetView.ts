import {Node,UITransform,sp} from 'cc';
import type {PetState} from './PetBrain';
export class PetView {
  node:Node; skeleton:sp.Skeleton; state=''; events:{name:string;at:number}[]=[];
  onStrike:()=>void=()=>{}; onComplete:(name:string)=>void=()=>{};onStep:()=>void=()=>{};
  constructor(parent:Node,data:sp.SkeletonData){
    this.node=new Node('FoxSpine');this.node.layer=parent.layer;parent.addChild(this.node);this.node.addComponent(UITransform).setContentSize(800,800);
    this.skeleton=this.node.addComponent(sp.Skeleton);this.skeleton.setAnimationCacheMode(0);this.skeleton.premultipliedAlpha=false;this.skeleton.skeletonData=data;
    for(const a of ['idle','walk','attack','hit','happy'])for(const b of ['idle','walk','attack','hit','happy'])if(a!==b)this.skeleton.setMix(a,b,a==='hit'||b==='hit'?.035:.12);
    this.skeleton.setEventListener((entry:any,event:any)=>{if(entry.trackIndex!==0)return;const name=event.data?.name||event.getData?.()?.name;if(!name)return;this.events.push({name,at:Date.now()});if(this.events.length>50)this.events.shift();if(name==='strike')this.onStrike();if(name==='step')this.onStep();});
    this.skeleton.setCompleteListener((entry:any)=>{if(entry.trackIndex===0)this.onComplete(entry.animation?.name||entry.getAnimation?.()?.name||'');});
    this.play('idle');
  }
  play(state:PetState,force=false){if(this.state===state&&!force)return;this.state=state;this.skeleton.setAnimation(0,state,state==='idle'||state==='walk');this.skeleton.setAnimation(1,state==='happy'?'happy':state==='attack'?'focused':'auto-blink',true);}
  face(direction:number){this.node.setScale(direction<0?-1:1,1,1);}
}
