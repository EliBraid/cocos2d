// 新手引导: a bouncing arrow plus a speech bubble pointing at what to tap next. It never blocks input; the screen that
// owns it decides each frame which step (if any) to show, so a step ends as soon as the player has really done it.
import {Node,Color,Graphics,Label,UIOpacity} from 'cc';
import {PaperUI,C} from './PaperUI';
export class Guide{
 private root:Node;private arrow:Graphics;private bubble:Node;private label:Label;private op:UIOpacity;private t=0;private key='';private at:[number,number]=[0,0];private up=false;
 constructor(parent:Node,private ui:PaperUI){
  this.root=ui.node(parent,'Guide',270,480,540,960);this.op=this.root.addComponent(UIOpacity);
  this.arrow=ui.node(this.root,'arrow',270,480,60,60).addComponent(Graphics);
  this.bubble=ui.rect(this.root,'bubble',270,480,300,58,new Color(255,250,232,255),true);
  this.label=ui.label(this.bubble,'',150,29,280,50,16,true,C.ink);this.label.overflow=Label.Overflow.SHRINK;
  this.root.active=false;}
 /** point at design coords (x,y = the thing to tap, y down); the bubble sits on the far side of the arrow */
 show(key:string,x:number,y:number,text:string,arrowUp=false){if(key!==this.key){this.key=key;this.t=0;this.label.string=text;}this.at=[x,y];this.up=arrowUp;this.root.active=true;}
 hide(){this.key='';this.root.active=false;}
 update(dt:number){if(!this.root.active)return;this.t+=dt;const [x,y]=this.at,bob=Math.abs(Math.sin(this.t*5))*10,d=this.up?1:-1;
  this.op.opacity=Math.round(255*Math.min(1,this.t*4));
  // arrow tip touches the target; it points down at things below the bubble, up at things above it
  const tipY=y+d*(-26-bob),ax=x-270,ay=480-tipY,g=this.arrow;g.node.setPosition(0,0,0);g.clear();
  g.fillColor=new Color(255,196,64,255);g.strokeColor=new Color(42,26,18,255);g.lineWidth=4;
  const s=this.up?-1:1;g.moveTo(ax,ay);g.lineTo(ax-18,ay+22*s);g.lineTo(ax-7,ay+22*s);g.lineTo(ax-7,ay+46*s);g.lineTo(ax+7,ay+46*s);g.lineTo(ax+7,ay+22*s);g.lineTo(ax+18,ay+22*s);g.close();g.fill();g.stroke();
  // pulsing ring on the target
  const r=22+8*Math.abs(Math.sin(this.t*3));g.strokeColor=new Color(255,196,64,200);g.lineWidth=4;g.circle(x-270,480-y,r);g.stroke();
  const by=Math.max(60,Math.min(900,y+d*(-26-bob)+d*(-46-34)));this.bubble.setPosition(Math.max(160,Math.min(380,x))-270,480-by,0);}
}
