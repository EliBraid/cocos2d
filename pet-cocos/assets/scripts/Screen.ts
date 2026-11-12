// 全屏适配: screens are laid out on a 540x960 box. On phones taller than 16:9 the canvas takes the full height
// (FIXED_WIDTH) instead of letterboxing; the box sits on the safe bottom (above the home indicator), full-screen
// backgrounds/dims stretch to cover everything, and the top band (title / resource bar) moves up into the free space,
// stopping below the notch and WeChat's capsule menu button.
import {view,ResolutionPolicy,Node,UITransform,screen} from 'cc';
import {xhsWindowInfo} from './Platform';
/** H: visible height in design px; top/bottom: unsafe insets; free: room above the box for the top band; s: box scale; off: box centre y */
export const FIT={H:960,top:0,bottom:0,free:0,s:1,off:0};
export function fitScreen(canvas:Node){const ws=screen.windowSize,tall=ws.height/ws.width>=960/540-.001;
 view.setDesignResolutionSize(540,960,tall?ResolutionPolicy.FIXED_WIDTH:ResolutionPolicy.SHOW_ALL);
 const H=tall?Math.round(540*ws.height/ws.width):960;let top=0,bottom=0;
 if(tall){const wx=(globalThis as any).wx;try{if(wx?.getSystemInfoSync){const si=wx.getSystemInfoSync(),k=540/si.windowWidth,sa=si.safeArea;
  let t=sa?sa.top:(si.statusBarHeight||0);const mb=wx.getMenuButtonBoundingClientRect?.();if(mb&&mb.bottom)t=Math.max(t,mb.bottom+4);
  top=t*k;bottom=sa?Math.max(0,si.windowHeight-sa.bottom)*k:0;}}catch{}
  const xi=xhsWindowInfo();if(xi&&xi.windowWidth>0){const k=540/xi.windowWidth,sa=xi.safeArea;let t=sa?sa.top:(xi.statusBarHeight||0);
   const mb=xi.menuButtons||{};for(const b of [mb.back,mb.me,mb.share])if(b&&b.bottom)t=Math.max(t,b.bottom+4);
   top=t*k;bottom=sa?Math.max(0,xi.windowHeight-sa.bottom)*k:0;}}
 const room=H-top-bottom,s=Math.min(1,room/960);
 FIT.H=H;FIT.top=top;FIT.bottom=bottom;FIT.s=s;FIT.free=Math.max(0,room-960*s)/s;FIT.off=H/2-(H-bottom-480*s);
 canvas.getComponent(UITransform)!.setContentSize(540,H);}
/** put a 540x960 layout node (direct child of the canvas) on the safe bottom */
export function placeBox(box:Node){box.setScale(FIT.s,FIT.s,1);box.setPosition(0,FIT.off,0);}
/** stretch a full-screen flat rect / hit blocker (540x960, centred in a box) so it covers the whole screen */
export function coverFull(n:Node){const half=FIT.H/2+Math.abs(FIT.off);n.setScale(n.scale.x/FIT.s,n.scale.y*2*half/(960*FIT.s),1);}
/** same for a full-bleed painting: uniform scale, crops the sides */
export function coverScale(){return Math.max(1/FIT.s,(FIT.H+2*Math.abs(FIT.off))/(960*FIT.s));}
/** move the direct children of a box-sized layer whose centre is above `cut` (design y, top-down) up into the free space */
export function dockTop(layer:Node,cut:number,amount=FIT.free){const d=Math.min(FIT.free,amount);if(d<=0)return 0;for(const c of layer.children){if(480-c.position.y<cut)c.setPosition(c.position.x,c.position.y+d,0);}return d;}
