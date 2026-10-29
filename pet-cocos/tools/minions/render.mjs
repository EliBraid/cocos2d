import {Resvg} from '@resvg/resvg-js';import fs from 'node:fs';
export const svgDoc=(inner,w=1000,h=1000)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
export const png=(inner,scale=1)=>new Resvg(svgDoc(inner),{fitTo:{mode:'zoom',value:scale},background:'rgba(0,0,0,0)'}).render().asPng();
