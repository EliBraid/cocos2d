// Skeleton layout for the Ember Fox. All positions are authored in the shared
// art canvas (px, y down) and converted to Spine units here.
export const UNIT=.5,ORIGIN=[505,948];
export const sp=([x,y])=>[+((x-ORIGIN[0])*UNIT).toFixed(3),+((ORIGIN[1]-y)*UNIT).toFixed(3)];
// [name, parent, canvas position]; every bone is unrotated in setup pose.
export const BONES=[
 ['root',null,[505,948]],
 ['ground-left','root',[505,948]],['ground-right','root',[505,948]],
 ['ankle-left','ground-left',[452,930]],['ankle-right','ground-right',[560,930]],
 ['hips','root',[505,800]],
 ['leg-top-left','hips',[452,780]],['leg-top-right','hips',[560,780]],
 ['tail','hips',[462,826]],['tail-mid','tail',[290,826]],['tail-mid2','tail-mid',[190,700]],['tail-tip','tail-mid2',[214,540]],
 ['back-btm','hips',[505,862]],['back-top','back-btm',[505,640]],
 ['arm-left','back-top',[424,640]],['hand-left','arm-left',[384,752]],
 ['arm-right','back-top',[594,640]],['hand-right','arm-right',[642,754]],['weapon','hand-right',[642,754]],
 ['neck','back-top',[505,592]],
 ['scarf','neck',[478,590]],['scarf-mid','scarf',[350,578]],['scarf-tip','scarf-mid',[222,520]],
 ['scarf-back','neck',[500,604]],['scarf-back-mid','scarf-back',[466,662]],['scarf-back-tip','scarf-back-mid',[426,740]],
 ['slash','back-top',[700,600]],['head','neck',[515,585]],['ear-left','head',[420,290]],['ear-right','head',[642,290]],['gaze','head',[574,440]]
];
export const WORLD=Object.fromEntries(BONES.map(([n,,p])=>[n,sp(p)]));
// Slot order = draw order (back to front). Back-view-only slots stay empty in front skins and vice versa.
export const SLOTS=[
 ['tail','tail-mid'],['leg-left','ankle-left'],['leg-right','ankle-right'],['arm-left','arm-left'],
 ['body','back-btm'],['tail-front','tail-mid'],['scarf-tail','scarf'],['ear-left','ear-left'],['ear-right','ear-right'],
 ['head','head'],['eyes','gaze'],['brows','gaze'],['mouth','gaze'],['scarf','neck'],['brooch','neck'],['weapon','weapon'],['arm-right','arm-right'],['slash','slash']
];
