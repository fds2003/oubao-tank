/**
 * modes.js - 特殊游戏模式
 * 基地保卫战 + 护送装甲车
 */

/**
 * 基地保卫战
 * 双方出生点后方生成指挥所（2×2网格，200HP）
 * 胜负：全歼敌方 或 摧毁敌方基地
 */
var BaseDefense = (function(){
 class BaseDefense {
  constructor() {
   this.hq = { hp: 200, maxHp: 200, alive: true, size: 2 };
  }

  takeDamage(dmg) {
   if (!this.hq.alive) return;
   this.hq.hp = Math.max(0, this.hq.hp - dmg);
   if (this.hq.hp <= 0) this.hq.alive = false;
  }

  /**
   * 检查胜利条件
   * @param {boolean} allEnemiesDead - 敌方全灭
   * @param {boolean} hqDestroyed - 基地被毁
   * @returns {string|null} 'player_win'|'hq_destroyed'|null
   */
  checkWin(allEnemiesDead, hqDestroyed) {
   if (allEnemiesDead) return 'player_win';
   if (!this.hq.alive || hqDestroyed) return 'hq_destroyed';
   return null;
  }

  /**
   * 获取基地位置（在出生点后方）
   * @param {number} spawnCol - 出生点列
   * @returns {Object} {c, r}
   */
  getHQPosition(spawnCol) {
   // 基地在出生点后方2格
   return { c: Math.max(1, spawnCol - 3), r: 1 };
  }

  getStatus() {
   if (!this.hq.alive) return '被摧毁';
   if (this.hq.hp < this.hq.maxHp) return '受损';
   return '正常';
  }

  reset() {
   this.hq = { hp: 200, maxHp: 200, alive: true, size: 2 };
  }
 }
 return BaseDefense;
})();

/**
 * 护送装甲车
 * 玩家护送无武装运输车沿路线移动到撤离点
 * AI优先攻击运输车
 */
var ConvoyEscort = (function(){
 class ConvoyEscort {
  constructor() {
   this.transport = {
    hp: 100,
    maxHp: 100,
    alive: true,
    speed: 60, // px/s
    x: 0, y: 0,
    waypointIdx: 0,
   };
   this.waypoints = [
    { c: 2, r: 6 },   // 起点（左侧）
    { c: 10, r: 6 },  // 中间
    { c: 19, r: 6 },  // 终点（右侧撤离点）
   ];
   this.waypointRadius = 40; // 到达路径点的判定半径
  }

  transportTakeDamage(dmg) {
   if (!this.transport.alive) return;
   this.transport.hp = Math.max(0, this.transport.hp - dmg);
   if (this.transport.hp <= 0) this.transport.alive = false;
  }

  updateTransport(dt) {
   if (!this.transport.alive) return;
   if (this.transport.waypointIdx >= this.waypoints.length) return;

   const wp = this.waypoints[this.transport.waypointIdx];
   const tx = wp.c * 55 + 27.5; // CELL=55
   const ty = wp.r * 55 + 27.5;
   const dx = tx - this.transport.x;
   const dy = ty - this.transport.y;
   const dist = Math.sqrt(dx * dx + dy * dy);

   if (dist < this.waypointRadius) {
    this.transport.waypointIdx++;
   } else {
    const spd = this.transport.speed * dt;
    this.transport.x += (dx / dist) * spd;
    this.transport.y += (dy / dist) * spd;
   }
  }

  /**
   * 检查胜利条件
   * @param {boolean} allEnemiesDead - AI全灭
   * @param {boolean} transportDead - 运输车被毁
   * @returns {string|null}
   */
  checkWin(allEnemiesDead, transportDead) {
   if (allEnemiesDead) return 'player_win';
   if (!this.transport.alive || transportDead) return 'transport_destroyed';
   if (this.transport.waypointIdx >= this.waypoints.length) return 'escort_complete';
   return null;
  }

  reset() {
   this.transport = {
    hp: 100, maxHp: 100, alive: true, speed: 60,
    x: this.waypoints[0].c * 55 + 27.5,
    y: this.waypoints[0].r * 55 + 27.5,
    waypointIdx: 0,
   };
  }
 }
 return ConvoyEscort;
})();
