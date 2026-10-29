// WeChat sharing. Shares never pay rewards: WeChat's rules forbid 诱导分享 (rewards for sharing) and punish it.
// initShare turns on the top-right 转发 / 朋友圈 menu; shareNow is the "分享战绩" button. Outside WeChat it does nothing.
const TITLES=['我的萌宠守住了水晶，你也来试试！','一起来养萌宠、守家园吧！','这群萌宠打怪也太可爱了吧'];
let last='';
export function initShare(){const wx=(globalThis as any).wx;if(!wx?.showShareMenu)return;
 try{wx.showShareMenu({withShareTicket:false,menus:['shareAppMessage','shareTimeline']});
  wx.onShareAppMessage?.(()=>({title:last||TITLES[Math.floor(Math.random()*TITLES.length)]}));
  wx.onShareTimeline?.(()=>({title:last||TITLES[0]}));}catch{}}
/** share now with a custom title; returns false when not running inside WeChat */
export function shareNow(title:string){const wx=(globalThis as any).wx;last=title;if(!wx?.shareAppMessage)return false;try{wx.shareAppMessage({title});return true;}catch{return false;}}
