export type BattleState = {active:boolean;level:number;xp:number;kills:number;gold:number;core:number;elapsed:number};
const finite=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback;
export class GameModel {
  coins=1280; food=36; energy=60; level=1; bond=24; name='森林旅人'; training=0;
  battle:BattleState={active:false,level:1,xp:0,kills:0,gold:0,core:100,elapsed:0};
  constructor(saved?:string|null){
    if(!saved)return;
    try{const s=JSON.parse(saved);if(s.version!==1)return;
      this.coins=finite(s.coins,1280,0,99999999);this.food=finite(s.food,36,0,9999);this.energy=finite(s.energy,60,0,80);
      this.level=finite(s.level,1,1,20);this.bond=finite(s.bond,24,0,100);this.training=finite(s.training,0,0,999999);
      if(typeof s.name==='string'&&s.name.trim())this.name=s.name.trim().slice(0,12);
    }catch{ /* A malformed local save starts a new camp. */ }
  }
  get upgradeCost(){return 100+(this.level-1)*70;}
  get stats(){const growth=1+(this.level-1)*.12,bond=this.bond===100?1.05:1;return {health:Math.round(1080*growth),attack:Math.round(112*growth*bond),defense:20+(this.level-1)*2,power:Math.round((1080*growth)/10+112*growth*4+this.level*20)};}
  get battleAttack(){return Math.round(this.stats.attack*(1+(this.battle.level-1)*.1));}
  feed(){if(this.food<=0||this.bond>=100)return false;this.food--;this.bond=Math.min(100,this.bond+10);return true;}
  upgrade(){if(this.level>=20||this.coins<this.upgradeCost)return false;this.coins-=this.upgradeCost;this.level++;return true;}
  awardTraining(){this.coins+=20;this.training++;}
  beginBattle(){if(this.battle.active||this.energy<5)return false;this.energy-=5;this.battle={active:true,level:1,xp:0,kills:0,gold:0,core:100,elapsed:0};return true;}
  awardKill(){if(!this.battle.active)return;const b=this.battle;b.kills++;b.gold+=8;b.xp++;while(b.xp>=3&&b.level<15){b.xp-=3;b.level++;}}
  damageCore(amount:number){if(this.battle.active)this.battle.core=Math.max(0,this.battle.core-Math.max(0,amount));}
  finishBattle(victory:boolean){if(!this.battle.active)return 0;const loot=this.battle.gold+(victory?50:0);this.coins+=loot;this.battle.active=false;return loot;}
  serialize(){return JSON.stringify({version:1,coins:this.coins,food:this.food,energy:this.energy,level:this.level,bond:this.bond,name:this.name,training:this.training});}
}
