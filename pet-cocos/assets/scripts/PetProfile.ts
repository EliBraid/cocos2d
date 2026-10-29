export type PetAppearanceData={scarf:number;weapon:'sword'};
export const FOX_PROFILE={id:'ember-fox',name:'赤焰小狐',profession:'近战剑士',appearance:{scarf:0,weapon:'sword'} as PetAppearanceData};
export const SCARF_PALETTES=[{name:'赤焰',rgb:[1,.16,.12]},{name:'海蓝',rgb:[.15,.62,.9]},{name:'苔绿',rgb:[.42,.63,.27]},{name:'金黄',rgb:[1,.78,.2]},{name:'紫藤',rgb:[.62,.38,.88]},{name:'薄荷',rgb:[.45,.9,.7]},{name:'橙焰',rgb:[1,.55,.1]}] as const;
/** Placeholder looks until each pet has its own rig: same skeleton, different scarf and size. */
/** base: until a pet has its own rig, it borrows this pet's rig, tinted */
export const PET_LOOK:Record<string,{scarf:number;scale:number;tint:[number,number,number];base?:string}>={
 fox:{scarf:0,scale:.19,tint:[255,255,255]},turtle:{scarf:2,scale:0.215,tint:[200,225,200]},sparrow:{scarf:3,scale:0.2,tint:[235,205,170]},chick:{scarf:6,scale:0.2,tint:[255,235,150]},cat:{scarf:5,scale:0.205,tint:[205,245,225]},dog:{scarf:1,scale:0.21,tint:[255,255,255]},mossdragon:{scarf:2,scale:0.215,tint:[255,255,255]},penguin:{scarf:4,scale:0.205,tint:[255,255,255]},bunny:{scarf:5,scale:0.205,tint:[255,255,255]},deer:{scarf:3,scale:0.22,tint:[255,255,255]},
 hedgehog:{scarf:6,scale:.2,tint:[200,170,140],base:'turtle'},bear:{scarf:3,scale:.235,tint:[205,150,100],base:'mossdragon'},
 tiger:{scarf:0,scale:.205,tint:[255,190,110],base:'dog'},boar:{scarf:6,scale:.21,tint:[220,170,160],base:'dog'},wolf:{scarf:1,scale:.215,tint:[205,215,235],base:'fox'},
 squirrel:{scarf:6,scale:.19,tint:[230,170,120],base:'sparrow'},owl:{scarf:4,scale:.205,tint:[200,180,150],base:'sparrow'},frog:{scarf:2,scale:.195,tint:[160,225,140],base:'penguin'},
 seal:{scarf:1,scale:.2,tint:[200,215,235],base:'penguin'},stardragon:{scarf:3,scale:.21,tint:[255,215,150],base:'mossdragon'},
 sheep:{scarf:5,scale:.205,tint:[255,250,240],base:'cat'},panda:{scarf:2,scale:.22,tint:[230,230,230],base:'cat'},
 weasel:{scarf:4,scale:.19,tint:[190,150,120],base:'fox'},bat:{scarf:4,scale:.19,tint:[170,150,200],base:'fox'},ninjacat:{scarf:1,scale:.195,tint:[150,150,170],base:'cat'},snowfox:{scarf:1,scale:.2,tint:[235,245,255],base:'fox'},
 hamster:{scarf:3,scale:.185,tint:[245,205,160],base:'bunny'},mole:{scarf:6,scale:.19,tint:[180,150,140],base:'bunny'},butterfly:{scarf:5,scale:.19,tint:[255,200,230],base:'deer'},octopus:{scarf:4,scale:.2,tint:[240,160,200],base:'chick'}};
/** the rig a pet is drawn with right now (its own, or the borrowed base) */
export const rigKind=(k:string)=>PET_LOOK[k]?.base||k;
