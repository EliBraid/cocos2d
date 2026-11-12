export const UNIT=.5,ORIGIN=[200,382];
export const sp=([x,y])=>[+((x-ORIGIN[0])*UNIT).toFixed(3),+((ORIGIN[1]-y)*UNIT).toFixed(3)];
export const BONES=[['root',null,[200,382]],['foot-left','root',[168,372]],['foot-right','root',[236,372]],['body','root',[200,372]],['top','body',[200,232]],['face','body',[200,300]]];
export const WORLD=Object.fromEntries(BONES.map(([n,,p])=>[n,sp(p)]));
export const SLOTS=[['foot-left','foot-left'],['foot-right','foot-right'],['body','body'],['top','top'],['face','face']];
