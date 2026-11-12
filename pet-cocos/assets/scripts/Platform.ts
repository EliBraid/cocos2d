// Which runtime the game is in. The Xiaohongshu (小红书) mini-tool build sets window.__XHS_MINITOOL in its boot
// script (build/xhs-minitool/xhs-boot.js, made by tools/finish-xhs.mjs); WeChat injects `wx`.
// On Xiaohongshu the save goes through window.__xhsStore, which mirrors localStorage into the container's Storage API.
import {sys} from 'cc';
const g=globalThis as any;
export const IS_WX=!!g.wx;
export const IS_XHS=!!g.__XHS_MINITOOL;
if(IS_XHS&&g.__xhsStore)(sys as any).localStorage=g.__xhsStore;
/** container window info from xhs.miniTool.getWindowInfo (read once in the boot script), or null */
export function xhsWindowInfo():any{return IS_XHS?g.__xhsWindowInfo||null:null;}
