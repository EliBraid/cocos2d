import {sp} from 'cc';
import {FOX_RIG} from './ActiveRig';
import {PetAppearanceData,SCARF_PALETTES} from './PetProfile';
// Native Skin composition preserves the shared bind pose. Only neutral cloth
// slots receive dye; animation and behaviour never select texture coordinates.
export class PetAppearance {
 private key='';private skins=new Map<string,any>();back=false;
 constructor(private skeleton:sp.Skeleton,public data:PetAppearanceData){}
 apply(back:boolean){const key=back?'back':'front';if(key!==this.key){const runtime=(this.skeleton as any)._skeleton,data=this.skeleton.skeletonData!.getRuntimeData() as any;let skin=this.skins.get(key);if(!skin){const base=data.findSkin(FOX_RIG.skins[key][0]);skin=new base.constructor('appearance/'+key);for(const name of FOX_RIG.skins[key])skin.addSkin(data.findSkin(name));this.skins.set(key,skin);}runtime.setSkin(skin);this.skeleton.setSlotsToSetupPose();this.key=key;this.back=back;}
  const rgb=SCARF_PALETTES[this.data.scarf%SCARF_PALETTES.length].rgb;for(const name of FOX_RIG.dyeSlots){const s=this.skeleton.findSlot(name) as any;if(s){s.color.r=rgb[0];s.color.g=rgb[1];s.color.b=rgb[2];s.color.a=1;}}
 }
 cycle(){this.data.scarf=(this.data.scarf+1)%SCARF_PALETTES.length;return SCARF_PALETTES[this.data.scarf].name;}
 debug(){return {skin:this.key,components:FOX_RIG.skins[this.back?'back':'front'],scarf:SCARF_PALETTES[this.data.scarf].name};}
}
