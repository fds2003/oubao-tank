/**
 * combos.js - 道具组合系统
 * 当玩家同时拥有特定道具时触发组合效果
 */
var ComboSystem = (function(){
 const COMBOS = [
  {
   name: '闪电战',
   id: 'lightning',
   requires: ['speed', 'rapid'],
   desc: '移动中射击不减速',
   color: '#ffd23f',
   effect: { speedMultiplier: 1.2, damageMultiplier: 1.0, shootWhileMoving: true }
  },
  {
   name: 'Boss模式',
   id: 'boss',
   requires: ['mega', 'power'],
   desc: '体型增大+重炮伤害',
   color: '#ff5555',
   effect: { speedMultiplier: 0.9, damageMultiplier: 1.5 }
  },
  {
   name: '幽灵战',
   id: 'ghost_combo',
   requires: ['ghost', 'scatter'],
   desc: '穿墙+三发散射',
   color: '#c89dff',
   effect: { speedMultiplier: 1.0, damageMultiplier: 1.2, pierceWalls: true }
  },
  {
   name: '冰火两重天',
   id: 'icefire',
   requires: ['freeze', 'power'],
   desc: '冰冻敌人+重炮伤害',
   color: '#9ad8ff',
   effect: { speedMultiplier: 1.0, damageMultiplier: 1.3, freezeOnHit: true }
  }
 ];

 class ComboSystem {
  constructor() {
   this.combos = COMBOS;
   this.activeBuffTypes = {}; // { type: remainingTime }
   this.activeCombos = [];
  }

  addBuff(type, duration) {
   this.activeBuffTypes[type] = duration;
   this._checkCombos();
  }

  removeBuff(type) {
   delete this.activeBuffTypes[type];
   this._checkCombos();
  }

  update(dt) {
   // 更新buff时间
   for (const type in this.activeBuffTypes) {
    this.activeBuffTypes[type] -= dt;
    if (this.activeBuffTypes[type] <= 0) {
     delete this.activeBuffTypes[type];
    }
   }
   this._checkCombos();
  }

  _checkCombos() {
   this.activeCombos = [];
   for (const combo of this.combos) {
    let hasAll = true;
    for (const req of combo.requires) {
     if (!this.activeBuffTypes[req]) { hasAll = false; break; }
    }
    if (hasAll) {
     this.activeCombos.push(combo);
    }
   }
  }

  getEffect(comboId) {
   for (const c of this.activeCombos) {
    if (c.id === comboId) return c.effect;
   }
   return null;
  }

  getActiveComboNames() {
   return this.activeCombos.map(c => c.name);
  }

  getActiveComboColors() {
   return this.activeCombos.map(c => c.color);
  }

  hasCombo(comboId) {
   return this.activeCombos.some(c => c.id === comboId);
  }

  reset() {
   this.activeBuffTypes = {};
   this.activeCombos = [];
  }
 }

 return ComboSystem;
})();
