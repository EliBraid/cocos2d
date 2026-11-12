// Rewarded-video ads. On WeChat this uses wx.createRewardedVideoAd; anywhere else (editor preview,
// web preview) it simulates a short ad and grants the reward, so the flow can be played end to end.
// Fill AD_UNITS with the ad unit ids from the WeChat 流量主 console. `default` is used by every placement without its own id;
// while it is empty, WeChat builds hide all ad buttons (no free rewards, no fake ads before 流量主 is approved).
export const AD_UNITS:Record<string,string>={default:'',x5:'',stamina:'',battle2x:'',train2x:'',hatch:'',tower:'',sign2x:''};
const unitOf=(p:string)=>AD_UNITS[p]||AD_UNITS.default;
import {IS_XHS} from './Platform';
const cache:Record<string,any>={};
export const Ads={
 /** resolves true when the player watched to the end and should get the reward */
 /** whether to show this ad button at all */
 available(placement:string){if(IS_XHS)return false;const wx=(globalThis as any).wx;return !wx?.createRewardedVideoAd||!!unitOf(placement);},
 rewarded(placement:string):Promise<boolean>{if(IS_XHS)return Promise.resolve(false);const wx=(globalThis as any).wx,unit=unitOf(placement);
  if(!wx?.createRewardedVideoAd)return new Promise(ok=>setTimeout(()=>ok(true),1200));if(!unit)return Promise.resolve(false);
  return new Promise(ok=>{let ad=cache[unit];if(!ad){ad=cache[unit]=wx.createRewardedVideoAd({adUnitId:unit});}
   const done=(r:any)=>{ad.offClose(done);ok(!!(r&&r.isEnded)||r===undefined);};ad.onClose(done);
   ad.show().catch(()=>ad.load().then(()=>ad.show()).catch(()=>{ad.offClose(done);ok(false);}));});}};
