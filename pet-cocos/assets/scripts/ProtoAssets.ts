// The forest / camp prototypes (Forest.scene, PetGame) keep their art in the "proto" asset bundle (assets/proto) so the
// release build does not ship it inside resources. Paths are the same as before; anything not in proto comes from resources.
import {assetManager,resources,AssetManager} from 'cc';
let proto:Promise<AssetManager.Bundle|null>|null=null;
const bundle=()=>proto??=new Promise(ok=>assetManager.loadBundle('proto',(e,b)=>ok(e?null:b)));
export async function loadProto<T>(path:string,type:any):Promise<T>{const b=await bundle();
 const from=(src:AssetManager.Bundle)=>new Promise<T>((ok,fail)=>src.load(path,type,(e:any,a:any)=>e?fail(e):ok(a as T)));
 if(b&&b.getInfoWithPath(path,type))return from(b);return from(resources);}
