// What the account screens (GearUI, PetUI, BagUI, AdventureUI, CaptainUI) borrow from HomeSlice.
import {Node,Color,Label,SpriteFrame,HorizontalTextAlignment} from 'cc';
import type {PaperUI} from './PaperUI';
import type {PlayerModel} from './meta/PlayerModel';
import type {PopOpts} from './RewardPop';
export interface GearHost{
 ui:PaperUI;model:()=>PlayerModel;art:()=>Record<string,SpriteFrame>;
 text:(p:Node,id:string,s:string,x:number,y:number,w:number,h:number,size?:number,bold?:boolean,color?:Color,align?:HorizontalTextAlignment)=>Label;
 bold:(p:Node,s:string,x:number,y:number,w:number,h:number,size?:number,color?:Color,outline?:Color,width?:number)=>unknown;
 sprite:(p:Node,key:string,x:number,y:number,w:number,h:number)=>Node;
 tap:(n:Node,fn:()=>void)=>Node;
 modal:(title:string,body:(p:Node,w:number)=>number,w?:number)=>void;
 /** full-screen page (adventure map): body gets the 540x960 page node */
 page:(body:(p:Node)=>void)=>void;
 /** "恭喜获得" overlay */
 reward:(title:string,o:PopOpts)=>void;
 close:()=>void;say:(s:string,t?:number)=>void;refresh:()=>void;startAdventure:()=>void;settings:()=>void;
}
