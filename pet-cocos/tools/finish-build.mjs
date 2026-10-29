import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),config=JSON.parse(await fs.readFile(new URL('build-config.json',root),'utf8')),index=new URL('build/'+(config.outputName||'web-mobile')+'/index.html',root);
let html=await fs.readFile(index,'utf8');
if(!html.includes('pet-guardians-finish'))html=html.replace('</head>','<link id="pet-guardians-finish" rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%23f46f5e%22/%3E%3Ctext x=%225%22 y=%2225%22 font-size=%2226%22%3E✦%3C/text%3E%3C/svg%3E"><style>html,body,#GameDiv{background:#f9f7ec!important}body{overscroll-behavior:none}</style></head>');
await fs.writeFile(index,html);
