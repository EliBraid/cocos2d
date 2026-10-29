import {Color,HorizontalTextAlignment} from 'cc';
export const col=(c:ArrayLike<number>,a=255)=>new Color(c[0],c[1],c[2],a);
/** toward white */
export const mix=(c:ArrayLike<number>,k:number,a=255)=>new Color(c[0]+(255-c[0])*k,c[1]+(255-c[1])*k,c[2]+(255-c[2])*k,a);
export const deep=(c:ArrayLike<number>,k:number)=>new Color(c[0]*k,c[1]*k,c[2]*k,255);
export const LEFT=HorizontalTextAlignment.LEFT,RIGHT=HorizontalTextAlignment.RIGHT;
export const pct=(n:number)=>(Math.round(n*10)/10).toString().replace(/\.0$/,'');
export const JOB_COLOR:Record<string,[number,number,number]>={warrior:[226,96,70],guard:[196,150,86],ranged:[110,190,110],mage:[170,110,230],support:[236,130,150],assassin:[120,90,170],summoner:[90,170,150]};
