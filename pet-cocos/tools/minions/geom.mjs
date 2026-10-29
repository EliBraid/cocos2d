// Small 2D helpers for drawing furry, ink-outlined parts as SVG.
export function catmull(pts,closed=true,per=24){const n=pts.length,out=[];const P=i=>closed?pts[(i+n)%n]:pts[Math.max(0,Math.min(n-1,i))];
 const segs=closed?n:n-1;for(let i=0;i<segs;i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);for(let k=0;k<per;k++){const t=k/per,t2=t*t,t3=t2*t;out.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
 if(!closed)out.push(pts[n-1]);return out;}
const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function resample(poly,step=4,closed=true){const pts=closed?[...poly,poly[0]]:poly,out=[pts[0]];let acc=0;for(let i=1;i<pts.length;i++){let a=pts[i-1];const b=pts[i];let d=len(a,b);while(acc+d>=step){const t=(step-acc)/d;a=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];out.push(a);d=len(a,b);acc=0;}acc+=d;}if(closed)out.pop();return out;}
// Signed area: positive => clockwise in screen coords (y down).
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
// Add fur tufts along index fractions [from,to] of the resampled contour.
// Each tuft is a soft spike: outward offset peaking mid-tuft and bending "downstream".
export function fur(poly,ranges,{size=26,depth=13,seed=1,step=3}={}){const p=resample(poly,step),n=p.length,cw=area(p)>0?1:-1;let s=seed;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 const off=new Float64Array(n);for(const [a,b,k=1] of ranges){let i0=Math.floor(a*n),i1=Math.floor(b*n);if(i1<i0)i1+=n;let i=i0;while(i<i1){const L=Math.max(4,Math.round(size/step*(.75+.5*rnd()))),D=depth*k*(.7+.6*rnd());for(let j=0;j<L&&i+j<i1;j++){const t=j/L;off[(i+j)%n]=Math.max(off[(i+j)%n],D*Math.pow(Math.sin(Math.PI*Math.pow(t,1.6)),1.3));}i+=L;}}
 return p.map((q,i)=>{const a=p[(i-1+n)%n],b=p[(i+1)%n],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1,nx=ty/l*cw,ny=-tx/l*cw;return [q[0]+nx*off[i],q[1]+ny*off[i]];});}
export const d=(poly,closed=true)=>'M'+poly.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L')+(closed?' Z':'');
export function ribbon(center,widths,{per=20}={}){ // closed contour around a centerline with per-point half widths
 const c=catmull(center,false,per),w=catmull(widths.map((x,i)=>[x,0]),false,per).map(p=>p[0]),L=[],R=[];for(let i=0;i<c.length;i++){const a=c[Math.max(0,i-1)],b=c[Math.min(c.length-1,i+1)],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1,nx=-ty/l,ny=tx/l;L.push([c[i][0]+nx*w[i],c[i][1]+ny*w[i]]);R.push([c[i][0]-nx*w[i],c[i][1]-ny*w[i]]);}return {contour:[...L,...R.reverse()],center:c};}
export const ellipse=(cx,cy,rx,ry,n=72,rot=0)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,x=Math.cos(a)*rx,y=Math.sin(a)*ry,c=Math.cos(rot),s=Math.sin(rot);return [cx+x*c-y*s,cy+x*s+y*c];});
// Explicit fur clumps: specs = [frac, size(px), depth(px), lean(-1..1)]
export function tufts(poly,specs,{step=2.5}={}){const p=resample(poly,step),n=p.length,cw=area(p)>0?1:-1;const off=new Float64Array(n),sh=new Float64Array(n);
 for(const [f,size,depth,lean=0] of specs){const L=Math.max(3,Math.round(size/step/2)),c=Math.round(f*n);for(let j=-L;j<=L;j++){const t0=(j+L)/(2*L),t=Math.pow(t0,lean>0?1+lean*.9:1/(1-lean*.9)),s=Math.max(0,1-Math.pow(Math.abs(2*t-1),1.35));const k=((c+j)%n+n)%n;if(depth*s>off[k]){off[k]=depth*s;sh[k]=lean*depth*s*.35;}}}
 return p.map((q,i)=>{const a=p[(i-1+n)%n],b=p[(i+1)%n],tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty)||1,ux=tx/l,uy=ty/l,nx=uy*cw,ny=-ux*cw;return [q[0]+nx*off[i]+ux*sh[i],q[1]+ny*off[i]+uy*sh[i]];});}
export function clumps(a,b,count,size,depth,lean=0,seed=1){let s=seed*9301+49297;const r=()=>{s=(s*9301+49297)%233280;return s/233280;};const out=[];for(let i=0;i<count;i++){const f=a+(b-a)*(i+.5)/count+(r()-.5)*(b-a)/count*.35;out.push([((f%1)+1)%1,size*(.8+.4*r()),depth*(.75+.5*r()),lean]);}return out;}
export function capsule(x1,y1,r1,x2,y2,r2,n=40){const a=Math.atan2(y2-y1,x2-x1),pts=[];for(let i=0;i<=n;i++){const t=a+Math.PI/2+Math.PI*i/n;pts.push([x1+Math.cos(t)*r1,y1+Math.sin(t)*r1]);}for(let i=0;i<=n;i++){const t=a-Math.PI/2+Math.PI*i/n;pts.push([x2+Math.cos(t)*r2,y2+Math.sin(t)*r2]);}return pts;}
// Tufts placed by nearest contour point: specs = [[x,y], size, depth, lean]
export function tuftsAt(poly,specs,opt){const p=resample(poly,2.5);const n=p.length;const f=([x,y])=>{let bi=0,bd=1e9;p.forEach((q,i)=>{const dd=(q[0]-x)**2+(q[1]-y)**2;if(dd<bd){bd=dd;bi=i;}});return bi/n;};return tufts(poly,specs.map(([pt,s,dp,l])=>[f(pt),s,dp,l]),opt);}
// several tufts spread between two contour points
export function tuftRun(a,b,count,size,depth,lean,jit=.15){const out=[];for(let i=0;i<count;i++){const t=(i+.5)/count;out.push([[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],size*(1+(i%2?-jit:jit)),depth*(1+(i%3-1)*jit),lean]);}return out;}
