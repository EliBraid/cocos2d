// Rewarded-video ads. On WeChat this uses wx.createRewardedVideoAd; anywhere else (editor preview,
// web preview) it simulates a short ad and grants the reward, so the flow can be played end to end.
// Fill AD_UNITS with the ad unit ids from the WeChat 流量主 console before release.
export const AD_UNITS:Record<string,string>={x5:'',revive:''};
const cache:Record<string,any>={};
export const Ads={
 /** resolves true when the player watched to the end and should get the reward */
 rewarded(placement:string):Promise<boolean>{const wx=(globalThis as any).wx,unit=AD_UNITS[placement];
  if(!wx?.createRewardedVideoAd||!unit)return new Promise(ok=>setTimeout(()=>ok(true),1200));
  return new Promise(ok=>{let ad=cache[unit];if(!ad){ad=cache[unit]=wx.createRewardedVideoAd({adUnitId:unit});}
   const done=(r:any)=>{ad.offClose(done);ok(!!(r&&r.isEnded)||r===undefined);};ad.onClose(done);
   ad.show().catch(()=>ad.load().then(()=>ad.show()).catch(()=>{ad.offClose(done);ok(false);}));});}};
