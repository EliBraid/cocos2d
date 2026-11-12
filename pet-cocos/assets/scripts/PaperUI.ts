import {Node,UITransform,Graphics,Color,Label,HorizontalTextAlignment,VerticalTextAlignment,tween,Vec3,EventTouch,Sprite,SpriteFrame,resources} from 'cc';
import {UI_SKIN,UI_SKIN_DIR} from './ui/UISkin';
import {coverFull} from './Screen';
export const C={ink:new Color(31,32,27),paper:new Color(249,247,236),red:new Color(244,111,94),cyan:new Color(76,213,220),sage:new Color(145,172,128),muted:new Color(118,120,103),line:new Color(210,207,187),white:new Color(255,254,245)};
export type BtnColor='red'|'cream'|'green'|'gold'|'blue'|'grey';
// icon names used by older call sites -> drawn icon in the UI kit
const ICON_ALIAS:Record<string,string>={pet:'paw',sword:'swords'};
/** Runtime-built UI. Coordinates are top-left based (x right, y down) inside the parent's box.
 *  When the code-drawn UI kit is loaded (PaperUI.loadSkin) panels, buttons, bars and icons use its
 *  9-slice sprites; otherwise everything falls back to the original Graphics drawing. */
export class PaperUI {
  static skin:Record<string,SpriteFrame>={};
  static get skinned(){return !!PaperUI.skin['btn-red'];}
  /** Loads every piece listed in UISkin.ts and sets its 9-slice insets. Safe to call more than once. */
  static async loadSkin(){if(PaperUI.skinned)return;
    await Promise.all(Object.entries(UI_SKIN).map(([name,p])=>new Promise<void>(ok=>resources.load(UI_SKIN_DIR+name+'/spriteFrame',SpriteFrame,(e,f)=>{
      if(!e&&f){if(p.l!==undefined){f.insetLeft=p.l;f.insetTop=p.t!;f.insetRight=p.r!;f.insetBottom=p.b!;}PaperUI.skin[name]=f;}else console.warn('ui skin',name,e);ok();}))));}
  buttons=new Map<string,Node>();
  node(parent:Node,name:string,x:number,y:number,w:number,h:number){const n=new Node(name);parent.addChild(n);n.layer=parent.layer;const p=parent.getComponent(UITransform);n.addComponent(UITransform).setContentSize(w,h);n.setPosition(x-(p?.width||540)/2,(p?.height||960)/2-y);return n;}
  label(parent:Node,value:string,x:number,y:number,w:number,h:number,size=20,bold=false,color=C.ink,align=HorizontalTextAlignment.CENTER){const n=this.node(parent,'text:'+value,x,y,w,h),l=n.addComponent(Label);l.string=value;l.fontSize=size;l.lineHeight=Math.round(size*1.35);l.isBold=bold;l.fontFamily='Microsoft YaHei';l.color=color;l.horizontalAlign=align;l.verticalAlign=VerticalTextAlignment.CENTER;l.enableWrapText=false;l.overflow=Label.Overflow.SHRINK;return l;}
  // ------------------------------------------------------------------ skin pieces
  /** A kit sprite drawn at half its texture size (textures are 2x). Sliced pieces stretch to w x h. */
  private skinSprite(parent:Node,key:string,w:number,h:number){const f=PaperUI.skin[key],p=UI_SKIN[key];const n=this.node(parent,'skin:'+key,w/2,h/2,w*2,h*2);n.setScale(.5,.5,1);
    const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.type=p?.l!==undefined?Sprite.Type.SLICED:Sprite.Type.SIMPLE;s.spriteFrame=f;n.getComponent(UITransform)!.setContentSize(w*2,h*2);return s;}
  /** A box (panel/card/slot/…) whose background is a kit piece; children use the box's top-left coordinates. */
  frame(parent:Node,name:string,x:number,y:number,w:number,h:number,key='panel'){const n=this.node(parent,name,x,y,w,h);if(PaperUI.skin[key])this.skinSprite(n,key,w,h);else this.paperRect(n,w,h,C.paper,true);return n;}
  /** An unstretched kit image (icons, stars). */
  img(parent:Node,key:string,x:number,y:number,w:number,h=w){const n=this.node(parent,'img:'+key,x,y,w,h);if(PaperUI.skin[key])this.skinSprite(n,key,w,h);return n;}
  /** Raised button with a pressed state. Content (label, icon) sits on the button's face. */
  btn(parent:Node,id:string,value:string,x:number,y:number,w:number,h:number,action:()=>void,color:BtnColor='cream',size=21,icon?:string){
    if(!PaperUI.skinned)return this.button(parent,id,value,x,y,w,h,action,color==='red'?C.red:color==='grey'?new Color(226,224,210):C.paper,size,icon,true);
    const n=this.node(parent,'button:'+id,x,y,w,h);this.buttons.set(id,n);const up='btn-'+color,down=up+'-down';const sp=this.skinSprite(n,up,w,h);
    const face=(k:string)=>{const p=UI_SKIN[k];return ((p.faceTop||0)/2+h-(p.faceBottom||0)/2)/2;};
    const content=this.node(n,'content',w/2,face(up),w,h);
    const iconSize=Math.min(h*.62,34),textW=value?Math.min(w-(icon?iconSize+22:18),value.length*size*1.02):0;
    const cx=w/2+(icon&&value?(iconSize+6)/2:0);
    const l=this.label(content,value,cx,h/2,w-(icon?iconSize+22:18),h*.7,size,true,C.ink);
    if(color!=='cream'&&color!=='grey'){l.enableOutline=true;l.outlineColor=C.ink;l.outlineWidth=2;l.color=C.white;}
    if(color==='grey')l.color=C.muted;
    if(icon)this.icon(content,icon,value?cx-textW/2-iconSize/2-6:w/2,h/2,iconSize);
    const dy=face(down)-face(up);let pressed=false;
    const press=(v:boolean)=>{if(pressed===v)return;pressed=v;sp.spriteFrame=PaperUI.skin[v?down:up];const p=content.position;content.setPosition(p.x,p.y+(v?-dy:dy),0);};
    n.on(Node.EventType.TOUCH_START,()=>press(true));n.on(Node.EventType.TOUCH_CANCEL,()=>press(false));
    n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;press(false);action();});return n;}
  /** Round raised button (side menu, close, plus). size = face diameter in design px. */
  roundBtn(parent:Node,id:string,x:number,y:number,size:number,action:()=>void,key='round',icon?:string){const n=this.node(parent,'button:'+id,x,y,size,size);this.buttons.set(id,n);
    if(!PaperUI.skin[key]){this.paperRect(n,size,size,C.white,true);if(icon)this.icon(n,icon,size/2,size/2,size*.6);}
    else{const p=UI_SKIN[key],h=size*p.h/p.w;const box=this.node(n,'face',size/2,size/2+(h-size)/2,size,h);this.skinSprite(box,key,size,h);if(icon)this.icon(n,icon,size/2,size/2-1,size*.58);}
    n.on(Node.EventType.TOUCH_START,()=>n.setScale(.93,.93,1));n.on(Node.EventType.TOUCH_CANCEL,()=>n.setScale(1,1,1));
    n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;n.setScale(1,1,1);action();});return n;}
  // ------------------------------------------------------------------ original paper drawing (fallback)
  private paperRect(n:Node,w:number,h:number,fill:Color,border:boolean){const g=n.addComponent(Graphics),a=w/2,b=h/2,k=Math.min(9,w/5,h/5);g.fillColor=fill;g.strokeColor=C.ink;g.lineWidth=2.6;g.moveTo(-a+k,-b);g.lineTo(a-k,-b+.6);g.lineTo(a,-b+k);g.lineTo(a-.7,b-k);g.lineTo(a-k,b);g.lineTo(-a+k,b-.6);g.lineTo(-a,b-k);g.lineTo(-a+.5,-b+k);g.close();g.fill();if(border){g.stroke();g.strokeColor=new Color(58,58,47,100);g.lineWidth=.7;g.moveTo(-a+k,-b+4);g.lineTo(a-k,-b+4);g.stroke();}return g;}
  rect(parent:Node,name:string,x:number,y:number,w:number,h:number,fill=C.paper,border=true){const n=this.node(parent,name,x,y,w,h);this.paperRect(n,w,h,fill,border);if(w===540&&h===960&&x===270&&y===480)coverFull(n);return n;} // full-screen backgrounds and dims reach the screen edges
  button(parent:Node,id:string,value:string,x:number,y:number,w:number,h:number,action:()=>void,fill=C.paper,size=21,icon?:string,plain=false){
    if(!plain&&PaperUI.skinned&&fill.a>0){const k:BtnColor=fill.equals(C.red)?'red':(fill.r<235&&Math.abs(fill.r-fill.g)<12)?'grey':'cream';return this.btn(parent,id,value,x,y,w,h,action,k,size,icon);}
    const n=this.rect(parent,'button:'+id,x,y,w,h,fill,fill.a>0);this.buttons.set(id,n);this.label(n,value,w/2+(icon?13:0),h/2,w-(icon?45:16),h-8,size,true);if(icon)this.icon(n,icon,22,h/2,26);const reset=()=>tween(n).to(.08,{scale:new Vec3(1,1,1)}).start();n.on(Node.EventType.TOUCH_START,()=>tween(n).to(.06,{scale:new Vec3(.97,.97,1)}).start());n.on(Node.EventType.TOUCH_CANCEL,reset);n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;reset();action();});return n;}
  bar(parent:Node,x:number,y:number,w:number,h:number,value:number,color=C.cyan){
    if(PaperUI.skinned){const n=this.frame(parent,'progress',x,y,w,h,'bar-bg');const key=color.equals(C.red)?'bar-red':color.equals(C.sage)?'bar-green':color.r>230&&color.g>180?'bar-gold':'bar-cyan';
      const m=Math.max(2,Math.round(h*.2)),fh=h-m*2,fill=this.node(n,'fill',m,h/2,fh,fh);fill.getComponent(UITransform)!.setAnchorPoint(0,.5);fill.setPosition(m-w/2,0,0);
      const s=this.skinSprite(fill,key,fh,fh);
      const draw=(v:number)=>{const fw=Math.max(fh,(w-m*2)*Math.max(0,Math.min(1,v)));fill.getComponent(UITransform)!.setContentSize(fw,fh);s.node.getComponent(UITransform)!.setContentSize(fw*2,fh*2);s.node.setPosition(fw/2,0,0);fill.active=v>0;};draw(value);return draw;}
    const n=this.node(parent,'progress',x,y,w,h),g=n.addComponent(Graphics);const draw=(v:number)=>{g.clear();g.fillColor=new Color(222,221,204);g.roundRect(-w/2,-h/2,w,h,h/2);g.fill();g.fillColor=color;g.roundRect(-w/2+2,-h/2+2,Math.max(h-4,(w-4)*Math.max(0,Math.min(1,v))),h-4,(h-4)/2);g.fill();g.strokeColor=C.ink;g.lineWidth=1.6;g.roundRect(-w/2,-h/2,w,h,h/2);g.stroke();};draw(value);return draw;}
  icon(parent:Node,kind:string,x:number,y:number,size=30,color=C.ink){
    const key='icon-'+(ICON_ALIAS[kind]||kind);if(PaperUI.skin[key])return this.img(parent,key,x,y,size);
    const n=this.node(parent,'icon:'+kind,x,y,size,size),g=n.addComponent(Graphics);n.setScale(size/36,size/36,1);g.lineWidth=2.7;g.strokeColor=color;g.fillColor=C.paper;
    const path=(a:number[][],close=false,fill=false)=>{g.moveTo(a[0][0],a[0][1]);for(const p of a.slice(1))g.lineTo(p[0],p[1]);if(close)g.close();if(fill)g.fill();g.stroke();};
    const circle=(x:number,y:number,r:number,fill=false)=>{g.circle(x,y,r);if(fill)g.fill();g.stroke();};
    if(kind==='home'){path([[-16,-1],[0,15],[16,-1]]);path([[-12,1],[-12,-15],[-4,-15],[-4,-5],[4,-5],[4,-15],[12,-15],[12,1]]);}
    else if(kind==='pet'||kind==='paw'){g.ellipse(0,-6,10,8);g.fill();g.stroke();for(const [x,y] of [[-11,5],[-4,12],[5,12],[13,4]]){g.ellipse(x,y,3.5,5);g.fill();g.stroke();}}
    else if(kind==='sword'){path([[-11,-13],[10,14],[15,15],[15,9],[-6,-16]],true,true);path([[-14,-5],[-3,-15]]);path([[-14,-15],[-9,-9]]);}
    else if(kind==='team'){for(const [x,y] of [[-10,7],[10,7]])circle(x,y,5,true);path([[-17,-14],[-17,-7],[-10,-1],[-3,-7],[-3,-14]]);path([[3,-14],[3,-7],[10,-1],[17,-7],[17,-14]]);}
    else if(kind==='bag'){path([[-11,9],[-15,-14],[15,-14],[11,9]],true,true);path([[-7,8],[-7,15],[7,15],[7,8]]);path([[-4,5],[-4,-2],[4,-2],[4,5]]);}
    else if(kind==='compass'){circle(0,0,15);g.fillColor=C.red;path([[-5,-7],[4,10],[7,-4],[-5,-7]],true,true);}
    else if(kind==='food'){g.fillColor=new Color(242,128,90);g.ellipse(0,-2,12,12);g.fill();g.stroke();path([[0,9],[1,16],[8,17]]);}
    else if(kind==='coin'){g.fillColor=new Color(255,208,80);circle(0,0,14,true);circle(0,0,9);path([[0,-6],[0,6]]);}
    else if(kind==='energy'){g.fillColor=new Color(129,213,134);path([[3,17],[-10,-2],[0,-2],[-3,-17],[11,3],[2,3]],true,true);}
    else if(kind==='gear'){for(let i=0;i<8;i++){const a=i*Math.PI/4;g.moveTo(Math.cos(a)*12,Math.sin(a)*12);g.lineTo(Math.cos(a)*17,Math.sin(a)*17);g.stroke();}circle(0,0,11,true);circle(0,0,4);}
    else if(kind==='mail'){path([[-15,11],[15,11],[15,-11],[-15,-11]],true,true);path([[-14,9],[0,-2],[14,9]]);}
    else if(kind==='book'){path([[-14,13],[-2,10],[-2,-14],[-14,-10]],true,true);path([[0,10],[14,13],[14,-10],[0,-14]],true,true);}
    else if(kind==='heart'){g.fillColor=C.red;g.moveTo(0,-13);g.bezierCurveTo(-28,2,-8,23,0,9);g.bezierCurveTo(8,23,28,2,0,-13);g.fill();g.stroke();}
    else if(kind==='lock'){g.roundRect(-10,-13,20,17,3);g.fill();g.stroke();g.moveTo(-6,4);g.lineTo(-6,10);g.bezierCurveTo(-6,19,6,19,6,10);g.lineTo(6,4);g.stroke();circle(0,-5,1.5,true);}
    else if(kind==='back'){path([[7,13],[-7,0],[7,-13]]);}
    else if(kind==='plus'){path([[-11,0],[11,0]]);path([[0,-11],[0,11]]);}
    else if(kind==='star'){g.fillColor=new Color(255,209,78);const p=[];for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?7:16;p.push([Math.cos(a)*r,Math.sin(a)*r]);}path(p,true,true);}
    return n;
  }
}
