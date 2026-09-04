'use strict';
/**
 * modes.js - 特殊游戏模式
 * 基地保卫战 + 护送装甲车
 */

/**
 * 基地保卫战
 * 双方出生点后方生成指挥所（2×2网格，200HP）
 * 胜负：全歼敌方 或 摧毁敌方基地
 */
var BaseDefense = class BaseDefense {
  constructor(game, playerSpawnCol, enemySpawnCol) {
    this.game = game;
    this.spawnCol = playerSpawnCol || 0;
    this.enemySpawnCol = (enemySpawnCol == null) ? COLS - 2 : enemySpawnCol;
    this.playerHQ = this._makeHQ(this.getHQPosition(this.spawnCol));
    this.enemyHQ = this._makeHQ(this.getEnemyHQPosition(this.enemySpawnCol));
  }

  // 向后兼容：hq 即玩家基地
  get hq() { return this.playerHQ; }

  _makeHQ(pos) {
    return {
      hp: 200, maxHp: 200, alive: true, size: 2,
      c: pos.c, r: pos.r,
      x: pos.c * CELL + CELL, y: pos.r * CELL + CELL, // 2x2 网格中心
    };
  }

  takeDamage(dmg, target) {
    const hq = target === 'enemy' ? this.enemyHQ : this.playerHQ;
    if (!hq.alive) return;
    hq.hp = Math.max(0, hq.hp - dmg);
    if (hq.hp <= 0) hq.alive = false;
  }

  /**
   * 检查胜利条件
   * @returns {string|null} 'player_win'|'hq_destroyed'|null
   */
  checkWin(allEnemiesDead, playerHQDestroyed, enemyHQDestroyed) {
    if (!this.enemyHQ.alive || enemyHQDestroyed) return 'player_win';
    if (allEnemiesDead) return 'player_win';
    if (!this.playerHQ.alive || playerHQDestroyed) return 'hq_destroyed';
    return null;
  }

  getHQPosition(spawnCol) {
    return { c: Math.max(1, spawnCol - 3), r: 1 };
  }

  /** 敌方基地：右下角（与玩家基地对角对称） */
  getEnemyHQPosition(enemySpawnCol) {
    return { c: Math.min(COLS - 3, enemySpawnCol), r: ROWS - 3 };
  }

  getStatus() {
    if (!this.playerHQ.alive) return '被摧毁';
    if (this.playerHQ.hp < this.playerHQ.maxHp) return '受损';
    return '正常';
  }

  _drawOne(ctx, hq, colorMain, time) {
    if (!hq.alive) {
      // 被摧毁后留下废墟
      ctx.fillStyle = 'rgba(60,50,40,0.6)';
      ctx.fillRect(hq.c * CELL + 4, hq.r * CELL + 4, CELL * 2 - 8, CELL * 2 - 8);
      return;
    }
    const x = hq.c * CELL, y = hq.r * CELL;
    const w = CELL * 2, h = CELL * 2;
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = colorMain;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = colorMain;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 8);
    ctx.lineTo(x + w - 8, y + h - 8);
    ctx.lineTo(x + 8, y + h - 8);
    ctx.closePath();
    ctx.fill();
    const hpW = w - 8, hpH = 6;
    const hpX = x + 4, hpY = y + h - 12;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const frac = hq.hp / hq.maxHp;
    ctx.fillStyle = frac > 0.5 ? '#5dff70' : frac > 0.25 ? '#ffd23f' : '#ff5555';
    ctx.fillRect(hpX, hpY, hpW * frac, hpH);
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    if (frac < 0.3 && Math.sin(time * 6) > 0) {
      ctx.fillStyle = 'rgba(255, 85, 85, 0.2)';
      ctx.fillRect(x, y, w, h);
    }
  }

  draw(ctx, time) {
    this._drawOne(ctx, this.playerHQ, '#ffd23f', time);
    this._drawOne(ctx, this.enemyHQ, '#ff5d5d', time);
  }

  reset() {
    this.playerHQ = this._makeHQ(this.getHQPosition(this.spawnCol));
    this.enemyHQ = this._makeHQ(this.getEnemyHQPosition(this.enemySpawnCol));
  }

  /** 清空双方基地占位的 2x2 地形（砖墙/水/草），确保基地可被攻击 */
  clearTerrain(world) {
    for (const hq of [this.playerHQ, this.enemyHQ]) {
      for (let r = hq.r; r < hq.r + hq.size; r++) {
        for (let c = hq.c; c < hq.c + hq.size; c++) {
          world.destroyBrick(c, r); // 同步擦除离屏静态缓存，基地废墟不再透出残留砖块
        }
      }
    }
    // 同步剔除草地预渲染列表
    if (world.grassCells) {
      world.grassCells = world.grassCells.filter(gc => {
        for (const hq of [this.playerHQ, this.enemyHQ]) {
          if (gc.c >= hq.c && gc.c < hq.c + hq.size && gc.r >= hq.r && gc.r < hq.r + hq.size) return false;
        }
        return true;
      });
    }
  }
};

/**
 * 护送装甲车
 * 玩家护送无武装运输车沿路线移动到撤离点
 * AI优先攻击运输车
 */
var ConvoyEscort = class ConvoyEscort {
  constructor(game) {
    this.game = game;
    this.waypoints = [
      { c: 2, r: 6 },
      { c: 10, r: 6 },
      { c: 19, r: 6 },
    ];
    this.waypointRadius = 40;
    this.reset();
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
    const tx = wp.c * CELL + CELL / 2;
    const ty = wp.r * CELL + CELL / 2;
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

  checkWin(allEnemiesDead, transportDead) {
    if (allEnemiesDead) return 'player_win';
    if (!this.transport.alive || transportDead) return 'transport_destroyed';
    if (this.transport.waypointIdx >= this.waypoints.length) return 'escort_complete';
    return null;
  }

  reset() {
    this.transport = {
      hp: 100, maxHp: 100, alive: true, speed: 60,
      x: this.waypoints[0].c * CELL + CELL / 2,
      y: this.waypoints[0].r * CELL + CELL / 2,
      waypointIdx: 0,
    };
  }

  draw(ctx, time) {
    if (!this.transport.alive) return;
    const t = this.transport;
    // 运输车主体
    ctx.fillStyle = '#7a8599';
    ctx.fillRect(t.x - 18, t.y - 10, 36, 20);
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x - 18, t.y - 10, 36, 20);
    // 车轮
    ctx.fillStyle = '#3a3a4a';
    ctx.beginPath(); ctx.arc(t.x - 10, t.y + 10, 5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(t.x + 10, t.y + 10, 5, 0, 7); ctx.fill();
    // 护盾指示（如果是玩家护送）
    const pulse = 0.5 + Math.sin(time * 4) * 0.5;
    ctx.strokeStyle = `rgba(255, 210, 63, ${0.2 + pulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(t.x, t.y, 24 + pulse * 4, 0, 7); ctx.stroke();
    // 血量条
    const hpW = 36, hpH = 4;
    const hpX = t.x - hpW / 2, hpY = t.y - 18;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const frac = t.hp / t.maxHp;
    ctx.fillStyle = frac > 0.5 ? '#5dff70' : frac > 0.25 ? '#ffd23f' : '#ff5555';
    ctx.fillRect(hpX, hpY, hpW * frac, hpH);
    // 文字
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 10px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('🚛 装甲车', t.x, hpY - 4);
  }
};
