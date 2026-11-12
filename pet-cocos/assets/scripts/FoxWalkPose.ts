// The whole character is authored at contact/down/passing/up, then mirrored in
// time for the other support leg. Columns share one phase, not separate waves.
export const FOX_STANCE={left:{x:-37,y:24},right:{x:48,y:24},unit:3.8/640};
export const FOX_CARRY={'arm-left':-8,'fore-left':2,'arm-right':-28,'fore-right':10,weapon:6};
export const FOX_LOCOMOTION={speed:.8,stride:.56,stance:.58,lift:.038,trackCompression:.85} as const;
export const FOX_WALK_KEYS=[
 {t:0,hipX:0,hipY:-0.42,hipR:0,chestR:0,headR:-.6,free:-10,fore:1,carry:3,carryFore:0,blade:-1,tail:-2,tailTip:-5,scarf:2},
 {t:.125,hipX:-0.7,hipY:-2.1,hipR:-0.4,chestR:0.65,headR:-.7,free:-8,fore:-1,carry:2,carryFore:-2,blade:0,tail:-5,tailTip:-7,scarf:4},
 {t:.25,hipX:-1.1,hipY:0.42,hipR:-0.35,chestR:0.75,headR:-.4,free:-2,fore:-2,carry:0,carryFore:-3,blade:2,tail:-3,tailTip:-4,scarf:6},
 {t:.375,hipX:-0.6,hipY:1.68,hipR:-0.175,chestR:0.45,headR:.3,free:5,fore:0,carry:-2,carryFore:1,blade:3,tail:1,tailTip:2,scarf:3},
 {t:.5,hipX:0,hipY:-0.42,hipR:0,chestR:0,headR:.6,free:10,fore:2,carry:-3,carryFore:2,blade:1,tail:3,tailTip:5,scarf:-2},
 {t:.625,hipX:0.8,hipY:-2.1,hipR:0.4,chestR:-0.65,headR:.7,free:8,fore:1,carry:-2,carryFore:3,blade:0,tail:5,tailTip:7,scarf:-4},
 {t:.75,hipX:1.2,hipY:0.42,hipR:0.35,chestR:-0.75,headR:.4,free:2,fore:-1,carry:0,carryFore:2,blade:-2,tail:2,tailTip:3,scarf:-6},
 {t:.875,hipX:0.6,hipY:1.68,hipR:0.175,chestR:-0.45,headR:-.3,free:-5,fore:0,carry:2,carryFore:-1,blade:-3,tail:-1,tailTip:-2,scarf:-1}
] as const;
export function sampleFoxWalk(phase:number,key:string){const p=((phase%1)+1)%1*8,i=Math.floor(p),t=p-i,at=(n:number)=>(FOX_WALK_KEYS[(n+8)%8] as any)[key] as number,a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
