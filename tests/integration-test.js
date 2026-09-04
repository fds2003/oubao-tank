'use strict';
/*
 * 欧宝坦克大战 — 集成测试 v2
 * 在 vm 沙箱中加载全部 21 个 JS 模块，实例化真实 Game，模拟真实游戏循环
 * 运行: node tests/integration-test.js
 * 输出: 控制台汇总 + tests/integration-results.json
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ctx } = require('./setup.js');

function staticCheck(name, cond, detail) {
  return { id: 'ST', name, pass: !!cond, detail: cond ? '' : detail };
}

const SCRIPT = `
'use strict';
const __R = [];
function test(id, name, fn) {
  try {
    const r = fn();
    __R.push({ id, name, pass: r === true || r === undefined, detail: r === true || r === undefined ? '' : String(r) });
  } catch (e) {
    __R.push({ id, name, pass: false, detail: '[异常] ' + e.name + ': ' + e.message });
  }
}

// ================= 测试环境 =================
function makeCtx2D() {
  const base = {
    canvas: { width: VIEW_W, height: VIEW_H },
    measureText: (t) => ({ width: (t ? String(t).length : 0) * 8 }),
    createLinearGradient: () => ({ addColorStop: function () {} }),
    createRadialGradient: () => ({ addColorStop: function () {} }),
    createPattern: () => ({})
  };
  return new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p];
      return function () {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

function newGame(mode, aiCount) {
  Tutorial.markCompleted();
  const g = new Game(makeCtx2D(), 1);
  g.gameMode = mode;
  if (aiCount !== undefined) g.aiCount = aiCount;
  g.state = 'menu';
  return g;
}

function enterPlay(g) {
  g.startMatch(0);
  let n = 0;
  while (g.state !== 'play' && n < 700) { g.update(0.016); n++; }
  if (g.state !== 'play') throw new Error('无法进入 play，当前 state=' + g.state);
}

function step(g, n, dt) {
  dt = dt || 0.016;
  for (let i = 0; i < n; i++) { g.update(dt); g.draw(); }
}

function clearMap(g) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.world.set(c, r, '.');
}

function fireAndAdvance(g, owner, x, y, dirKey, dmg, frames) {
  const b = new Bullet(owner, x, y, dirKey, { damage: dmg || 35 });
  g.bullets.push(b);
  const n = frames || 200;
  for (let i = 0; i < n && !b.dead; i++) b.update(0.016, g);
  return b;
}

// ================= 场景 =================

test('S01', '模块加载冒烟：核心类/常量存在', () => {
  const need = [Game, Tank, Bullet, Physics, ComboSystem, AchievementSystem, PowerUp, Tutorial, Input, applyPower, POWER_TYPES, MAP_DEFS, CONFIG, WIN_ROUNDS];
  for (const s of need) if (s === undefined) return '缺失: ' + s;
  return true;
});

test('S02', '菜单状态渲染 8 帧不抛异常', () => {
  const g = newGame(0, 2);
  for (let i = 0; i < 8; i++) g.draw();
  return true;
});

test('S03', '[BUG] 菜单打开排行榜(L)后渲染不崩溃', () => {
  const g = newGame(0, 2);
  g.showLeaderboard = true;
  g.draw(); // 应抛 ReferenceError: CX is not defined
  return true;
});

test('S04', '单人模式完整对局 250 帧不抛异常', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  step(g, 250);
  return true;
});

test('S05', '[BUG] 模式3(基地保卫战)开局不崩溃', () => {
  const g = newGame(3, 2);
  g.startMatch(0); // 应抛 ReferenceError: s1 is not defined
  return true;
});

test('S32', '模式3(基地保卫战)完整对局运行且 HQ 存在', () => {
  const g = newGame(3, 2);
  enterPlay(g);
  if (!g.baseDefense || !g.baseDefense.hq || !g.baseDefense.hq.alive) return 'baseDefense/HQ 缺失';
  step(g, 120);
  return true;
});

test('S33', '[BUG] 模式3 第二局 reset 后 HQ 坐标仍有效且绘制不崩溃', () => {
  const g = newGame(3, 2);
  enterPlay(g);
  const h1 = g.baseDefense.hq;
  if (!(h1.x > 0) || !(h1.y > 0)) return '首局 HQ 坐标无效 x=' + h1.x + ' y=' + h1.y;
  g.startRound(); // 第二局 → baseDefense.reset() 分支
  const h2 = g.baseDefense.hq;
  if (!(h2.x > 0) || !(h2.y > 0)) return '第二局 reset 后 HQ 坐标丢失 x=' + h2.x + ' y=' + h2.y;
  g.draw();
  return true;
});

test('S34', '模式3 HQ / 模式4 运输车坐标有效且在画布内', () => {
  const g3 = newGame(3, 2);
  enterPlay(g3);
  const hq = g3.baseDefense.hq;
  if (!(hq.x >= 0 && hq.x <= VIEW_W && hq.y >= 0 && hq.y <= VIEW_H)) return 'HQ 坐标越界 x=' + hq.x + ' y=' + hq.y;
  const g4 = newGame(4, 1);
  enterPlay(g4);
  const tr = g4.convoyEscort.transport;
  if (!(tr.x >= 0 && tr.x <= VIEW_W && tr.y >= 0 && tr.y <= VIEW_H)) return '运输车坐标越界 x=' + tr.x + ' y=' + tr.y;
  return true;
});

test('S41', '[BUG] 模式3 玩家子弹不会伤害己方 HQ', () => {
  const g = newGame(3, 1);
  enterPlay(g);
  clearMap(g);
  const hq = g.baseDefense.hq;
  hq.alive = true;
  const hp = hq.hp;
  const p1 = g.tanks[0];
  p1.x = hq.x - 100; p1.y = hq.y; p1.dirKey = 'right';
  fireAndAdvance(g, p1, p1.x + 30, p1.y, 'right', 35, 150);
  if (hq.hp === hp) return true;
  return '玩家子弹命中己方 HQ，造成 ' + (hp - hq.hp) + ' 伤害（无阵营判定）';
});

test('S06', '模式4(护送装甲车)运行 150 帧不抛异常且运输车存活', () => {
  const g = newGame(4, 2);
  enterPlay(g);
  if (!g.convoyEscort || !g.convoyEscort.transport || !g.convoyEscort.transport.alive) return '运输车不存在或已死亡';
  step(g, 150);
  return true;
});

test('S07', '[BUG] 坦克带 slow 减速 buff 时 HUD 绘制不崩溃', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  g.tanks[0].buff.slow = 1.5; // 断履带/EMP 写入的键
  g.draw(); // 应抛 TypeError
  return true;
});

test('S08', '菜单 Q 选择困难后 AI 实际难度为 hard（setDifficulty 基准同步）', () => {
  const g = newGame(0, 2);
  g.aiDifficulty = 2; // 菜单选"困难"
  g.dynamicDifficulty.setDifficulty(2); // 模拟菜单 Q 键处理（同步动态难度基准）
  enterPlay(g);
  const d = g.tanks[1].ai.diff;
  if (d === 'hard') return true;
  return 'AI 实际难度=' + d + '（菜单选择未生效，AI 使用动态难度默认值）';
});

test('S08b', '动态难度接通：菜单默认(普通)时连胜3局后 AI 难度升为 hard', () => {
  const g = newGame(0, 2);
  // 菜单未手动选难度，基准为默认 normal
  enterPlay(g);
  const dd = g.dynamicDifficulty;
  if (dd.getEffectiveDifficulty() !== 'normal') return '初始难度=' + dd.getEffectiveDifficulty() + '（应为 normal）';
  // 连胜 3 局：达到 streakThreshold 升档
  for (let i = 0; i < 3; i++) {
    g.tanks[0].alive = true;
    g.tanks.slice(1).forEach(t => { t.alive = false; });
    g.updatePlay(0.016); // 触发 recordWin
  }
  const eff = dd.getEffectiveDifficulty();
  if (eff === 'hard') return true;
  return '连胜3局后难度=' + eff + '（期望 hard）';
});

test('S09', '[BUG] 玩家败北后动态难度应降低(记录失败)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const dd = g.dynamicDifficulty;
  const l0 = dd.loseStreak;
  g.tanks[0].alive = false; // 玩家死亡 → AI 胜
  g.updatePlay(0.016);
  if (dd.loseStreak === l0 + 1) return true;
  return 'AI胜利后 winStreak=' + dd.winStreak + '（应记 loseStreak，当前记录被颠倒）';
});

test('S10', '[BUG] 玩家获胜后动态难度应提升(记录胜利)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const dd = g.dynamicDifficulty;
  for (let i = 1; i < g.tanks.length; i++) g.tanks[i].alive = false; // AI 全灭 → 玩家胜
  g.updatePlay(0.016);
  if (dd.winStreak === 1) return true;
  return '玩家胜利后 loseStreak=' + dd.loseStreak + ' winStreak=' + dd.winStreak + '（记录被颠倒）';
});

test('S11', '[BUG] 协作模式 AI 出生在敌人侧(s2)', () => {
  const g = newGame(2, 2);
  enterPlay(g);
  const s1 = g.world.spawns[0], s2 = g.world.spawns[1];
  const s1x = s1.c * CELL + CELL / 2, s2x = s2.c * CELL + CELL / 2;
  let nearP1 = 0;
  for (let i = 2; i < g.tanks.length; i++) {
    if (Math.abs(g.tanks[i].x - s1x) < CELL * 2) nearP1++;
  }
  if (nearP1 === 0) return true;
  return nearP1 + ' 个 AI 出生在玩家1出生点(s1)附近，应出生在对侧 s2';
});

test('S12', '[BUG] 协作模式玩家2的子弹能命中 AI 敌人', () => {
  const g = newGame(2, 2);
  enterPlay(g);
  clearMap(g);
  const p2 = g.tanks[1], ai = g.tanks[2];
  p2.x = 400; p2.y = 300; ai.x = 700; ai.y = 300;
  p2.dirKey = 'right';
  ai.invuln = 0;
  const hp = ai.hp;
  fireAndAdvance(g, p2, p2.x + 30, p2.y, 'right', 35, 150);
  if (ai.hp < hp) return true;
  return 'P2 子弹穿过 AI 敌人，AI 血量未变化（isPlayer 阵营判定错误）';
});

test('S13', '[BUG] 协作模式玩家1的子弹不会误伤队友玩家2', () => {
  const g = newGame(2, 2);
  enterPlay(g);
  clearMap(g);
  const p1 = g.tanks[0], p2 = g.tanks[1];
  p1.x = 400; p1.y = 300; p2.x = 700; p2.y = 300;
  p1.dirKey = 'right';
  p2.invuln = 0;
  const hp = p2.hp;
  fireAndAdvance(g, p1, p1.x + 30, p1.y, 'right', 35, 150);
  if (p2.hp === hp) return true;
  return 'P1 子弹命中队友 P2，造成 ' + (hp - p2.hp) + ' 伤害（应跳过队友）';
});

test('S14', '双人模式玩家1能击中玩家2(对战模式正常)', () => {
  const g = newGame(1, 0);
  enterPlay(g);
  clearMap(g);
  const p1 = g.tanks[0], p2 = g.tanks[1];
  p1.x = 400; p1.y = 300; p2.x = 700; p2.y = 300;
  p1.dirKey = 'right';
  p2.invuln = 0;
  const hp = p2.hp;
  fireAndAdvance(g, p1, p1.x + 30, p1.y, 'right', 35, 150);
  if (p2.hp < hp) return true;
  return '双人模式 P1 无法击中 P2';
});

test('S15a', '[BUG] 面朝左坦克正面(左方)被击不会触发背部暴击', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const tk = g.tanks[0];
  tk.dirKey = 'left'; tk.x = 600; tk.y = 400;
  const res = g.physics.calculateDamage(tk, { x: tk.x - 50, y: tk.y }, 35); // 正面命中
  if (!res.isBackHit) return true;
  return '正面命中被误判为背部暴击（tank.face 不存在，恒按面朝右计算）';
});
test('S15b', '[BUG] 面朝左坦克背后(右方)被击会触发背部暴击', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const tk = g.tanks[0];
  tk.dirKey = 'left'; tk.x = 600; tk.y = 400;
  const res = g.physics.calculateDamage(tk, { x: tk.x + 50, y: tk.y }, 35); // 背后命中
  if (res.isBackHit) return true;
  return '背后命中未触发暴击（tank.face 不存在，物理方向判定全部失真）';
});

test('S16', '[BUG] 侧面命中(90°)有机会触发断履带(slow 减速)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  clearMap(g);
  const tk = g.tanks[0];
  tk.x = 600; tk.y = 400; tk.dirKey = 'right';
  const oldRand = Math.random;
  Math.random = () => 0.1; // TRACK_STUN_CHANCE=0.3 → 必触发
  let res;
  try {
    // 正上方命中 = 相对坦克正侧面(90°)
    res = g.physics.calculateDamage(tk, { x: tk.x, y: tk.y - 30 }, 35);
  } finally { Math.random = oldRand; }
  if (res.isTrackStun) return true;
  return '90°侧面命中触发跳弹(isRicochet=' + res.isRicochet + ', 伤害=' + res.damage + ')，断履带判定被跳弹分支抢先(RICOCHET_ANGLE=65 覆盖 TRACK 60-120°，仅 60-65° 窄窗可达)';
});

test('S17', '[BUG] 失败局仍记录玩家击杀数(成就 tank_killer)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  let captured = null;
  const orig = g.achievements.recordGame.bind(g.achievements);
  g.achievements.recordGame = (r) => { captured = r; return orig(r); };
  // 玩家真实击杀 1 个 AI 后输掉（AI2 存活）
  const p1 = g.tanks[0], ai1 = g.tanks[1];
  ai1.ai = null; ai1.invuln = 0; p1.invuln = 0; // 固定 AI、清除无敌
  p1.x = ai1.x - 60; p1.y = ai1.y; p1.dirKey = 'right';
  fireAndAdvance(g, p1, p1.x + 30, p1.y, 'right', 999, 20);
  if (ai1.alive) return 'AI 未被玩家击杀';
  if ((g.matchStats[0].kills || 0) !== 1) return 'matchStats[0].kills=' + g.matchStats[0].kills + '（击杀未计入）';
  g.scores = [0, 4];
  g.tanks[0].alive = false; // 玩家死亡 → AI 胜
  g.updatePlay(0.016);
  g.bannerT = 0;
  g.update(0.016); // round→match，触发 _recordMatchResult
  if (!captured) return '未捕获 match result';
  if (captured.killed === 1) return true;
  return '输局 killed 记录=' + captured.killed + '（应为1，实际固定为0）';
});

test('S18', '[BUG] 对局结果记录玩家拾取的道具(成就 power_master)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  let captured = null;
  const orig = g.achievements.recordGame.bind(g.achievements);
  g.achievements.recordGame = (r) => { captured = r; return orig(r); };
  const pu = new PowerUp(g.tanks[0].x + 20, g.tanks[0].y, 'shield'); // POWERUP_PICKUP_RANGE=34
  g.powerups = [pu];
  g.updatePlay(0.016); // 拾取
  g.scores = [4, 0];
  for (let i = 1; i < g.tanks.length; i++) g.tanks[i].alive = false;
  g.updatePlay(0.016);
  g.bannerT = 0;
  g.update(0.016);
  if (!captured) return '未捕获 match result';
  if (captured.powerups && captured.powerups.length > 0) return true;
  return 'powerups 记录=' + (captured.powerups || []).length + '（Tank 无 collectedPowerups 属性，永远为空）';
});

test('S19', '观察: close_call 成就(lastHp===1)实战达成率', () => {
  const hps = [70, 80, 100, 150];
  const base = [25, 35, 45, 50, 60];
  const mults = [0.3, 1, 1.2, 1.3, 1.5];
  const dmgSet = [];
  for (const d of base) for (const m of mults) dmgSet.push(Math.round(d * m));
  const HEAL = CONFIG.HEAL_AMOUNT || 40;
  let reached = 0, won = 0, total = 200000;
  for (let i = 0; i < total; i++) {
    let hp = hps[(Math.random() * hps.length) | 0];
    const maxHp = hp;
    let alive = true;
    for (let k = 0; k < 300; k++) {
      if (hp === 1) { reached++; break; }
      if (hp <= 0) { alive = false; break; }
      if (Math.random() < 0.12 && hp < maxHp) { hp = Math.min(maxHp, hp + HEAL); continue; }
      hp = Math.max(0, hp - dmgSet[(Math.random() * dmgSet.length) | 0]);
    }
    if (alive && hp === 1) won++;
  }
  const rate = (reached / total * 100).toFixed(4);
  if (rate >= 0.1) return true; // 若达成率>=0.1% 视为可达成（观察项）
  return '20万次模拟中 hp 恰好=1 的次数=' + reached + '（达成率=' + rate + '%，lastHp===1 条件极苛刻）';
});

test('S20', '组合系统: mega+power 激活 boss 组合且子弹伤害×1.5', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const p1 = g.tanks[0];
  p1.buff.mega = 8; p1.buff.power = 8;
  p1.update(0.016); // 同步 combo
  if (!g.comboSystem.hasCombo('boss')) return 'boss 组合未激活';
  const before = g.bullets.length;
  p1.fire();
  const b = g.bullets[g.bullets.length - 1];
  if (!b || g.bullets.length === before) return '未生成子弹';
  // power 道具 → heavy 子弹 HEAVY_DMG × mega(1.2) × boss(1.5)
  const expect = Math.round(HEAVY_DMG * 1.2 * 1.5);
  if (b.damage === expect) return true;
  return '子弹伤害=' + b.damage + '，期望=' + expect;
});

test('S21', '[BUG] 闪电战组合(speed+rapid)的加速/移动射击效果生效', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const p1 = g.tanks[0];
  p1.buff.speed = 8; p1.buff.rapid = 8;
  p1.update(0.016);
  if (!g.comboSystem.hasCombo('lightning')) return 'lightning 组合未激活';
  const eff = g.comboSystem.getEffect('lightning');
  const keys = eff ? Object.keys(eff) : [];
  if (eff && eff.damageMultiplier !== 1) return true;
  // 行为验证：lightning 激活时移动速度 ×speedMultiplier
  clearMap(g);
  p1.ai = { update(){}, getCommand(){ return { dir:'right', fire:false }; } };
  const dt = 0.1;
  p1.x = 200; p1.y = 400; p1.dirKey = 'right';
  p1.buff.speed = 8; p1.buff.rapid = 0; // 有加速无闪电战组合
  p1.update(0.016);
  const x0 = p1.x;
  p1.update(dt);
  const baseDist = p1.x - x0;
  if (baseDist <= 0) return '基准移动异常 dist=' + baseDist;
  p1.x = 200;
  p1.buff.speed = 8; p1.buff.rapid = 8;
  p1.update(0.016);
  if (!g.comboSystem.hasCombo('lightning')) return 'lightning 组合未激活';
  const eff2 = g.comboSystem.getEffect('lightning');
  if (!eff2 || !(eff2.speedMultiplier > 1)) return 'lightning effect 缺少 speedMultiplier>1';
  const x1 = p1.x;
  p1.update(dt);
  const boostDist = p1.x - x1;
  const expected = baseDist * eff2.speedMultiplier;
  if (Math.abs(boostDist - expected) < 1) return true;
  return '闪电战加速未生效：基准=' + baseDist.toFixed(1) + ' 实际=' + boostDist.toFixed(1) + ' 期望=' + expected.toFixed(1);
});

test('S23', '[BUG] 模式4 HUD 统计全部 AI 存活数', () => {
  const g = newGame(4, 2);
  enterPlay(g);
  const aiIdx = (g.gameMode === 0 || g.gameMode === 4) ? 1 : 2; // 与 drawHUD 同逻辑
  const counted = g.tanks.slice(aiIdx).filter(t => t.alive).length;
  if (counted === g.aiCount) return true;
  return 'HUD 统计 AI 存活 ' + counted + '/' + g.aiCount + '（aiIdx=2 漏掉第1个AI）';
});

test('S24', '[BUG] 模式4 玩家子弹不会伤害己方运输车', () => {
  const g = newGame(4, 1);
  enterPlay(g);
  clearMap(g);
  const tr = g.convoyEscort.transport;
  tr.x = 700; tr.y = 300; tr.alive = true;
  const p1 = g.tanks[0];
  p1.x = 400; p1.y = 300; p1.dirKey = 'right';
  const hp = tr.hp;
  fireAndAdvance(g, p1, p1.x + 30, p1.y, 'right', 35, 150);
  if (tr.hp === hp) return true;
  return '玩家子弹命中己方运输车，造成 ' + (hp - tr.hp) + ' 伤害（无阵营判定）';
});

test('S35', '[BUG] 模式3 AI 子弹能伤害敌方 HQ', () => {
  const g = newGame(3, 2);
  enterPlay(g);
  clearMap(g);
  const hq = g.baseDefense.hq;
  hq.alive = true;
  const hp = hq.hp;
  const ai = g.tanks[2];
  fireAndAdvance(g, ai, hq.x - 40, hq.y, 'right', 35, 60);
  if (hq.hp < hp) return true;
  return 'AI 子弹命中 HQ 但血量未变化（bullet.js 未处理 HQ 碰撞）';
});

test('S36', '[BUG] 模式4 AI 子弹能伤害运输车', () => {
  const g = newGame(4, 1);
  enterPlay(g);
  clearMap(g);
  const tr = g.convoyEscort.transport;
  tr.x = 700; tr.y = 300; tr.alive = true;
  const hp = tr.hp;
  const ai = g.tanks[1];
  ai.x = 400; ai.y = 300; ai.dirKey = 'right';
  fireAndAdvance(g, ai, ai.x + 30, ai.y, 'right', 35, 150);
  if (tr.hp < hp) return true;
  return 'AI 子弹命中运输车但血量未变化（bullet.js 未处理运输车碰撞）';
});

test('S25', '开局 2 秒无敌时间生效', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const p1 = g.tanks[0];
  if (p1.invuln <= 0) return 'invuln 初始=' + p1.invuln;
  const hp = p1.hp;
  p1.takeDamage(35, null, g);
  if (p1.hp === hp) return true;
  return '无敌期间仍受到伤害';
});

test('S26', '[BUG] 协作模式 P1 放冰冻不会冻结队友 P2', () => {
  const g = newGame(2, 1);
  enterPlay(g);
  const p2 = g.tanks[1];
  p2.buff.freeze = 0;
  applyPower(g, g.tanks[0], 'freeze');
  if (p2.buff.freeze > 0) return 'P2(队友) 被 P1 的冰冻误伤 freeze=' + p2.buff.freeze;
  return true;
});

test('S27', '[BUG] 协作模式 P1 放 EMP 不会减速队友 P2', () => {
  const g = newGame(2, 1);
  enterPlay(g);
  const p2 = g.tanks[1];
  p2.buff.slow = 0;
  applyPower(g, g.tanks[0], 'emp');
  if (p2.buff.slow > 0) return 'P2(队友) 被 P1 的 EMP 减速 slow=' + p2.buff.slow;
  return true;
});

test('S37', '[BUG] 教程激活时菜单按空格不会立即开始对局', () => {
  const g = newGame(0, 2);
  g.state = 'menu';
  g.tutorial.state = 'active';
  g.tutorial.step = 0;
  Input.taps.add('Space');
  g.update(0.016);
  Input.taps.clear();
  if (g.state === 'play' || g.state === 'countdown') return '教程激活时按空格直接进入对局(state=' + g.state + ')';
  return true;
});

test('S38', '[BUG] 残血(lastHp<=1)获胜应解锁 close_call 成就', () => {
  const g = newGame(0, 2);
  const res = { won: true, shots: 10, hits: 5, killed: 1, survived: true, powerups: [], lastHp: 0.5, coop: false };
  g.achievements.recordGame(res);
  if (g.achievements.unlocked.indexOf('close_call') !== -1) return true;
  return 'lastHp=0.5 获胜未解锁 close_call（判定 ===1 过于苛刻）';
});

test('S28', '幽灵状态下可以穿过钢墙(设计特性)', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const tk = g.tanks[0];
  const gx = 3 * CELL + CELL / 2, gy = 3 * CELL + CELL / 2;
  g.world.set(3, 3, 'S');
  if (tk.fits(gx, gy)) return '无幽灵时也能穿墙(异常)';
  tk.buff.ghost = 5;
  if (tk.fits(gx, gy)) return true;
  return '幽灵状态未能穿墙';
});

test('S29', '子弹撞砖墙和钢墙均被阻挡销毁', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  clearMap(g);
  const p1 = g.tanks[0];
  g.world.set(5, 5, '#');
  const b1 = fireAndAdvance(g, p1, 5 * CELL + CELL / 2 - 20, 5 * CELL + CELL / 2, 'right', 35, 60);
  if (!b1.dead) return '子弹未撞砖墙';
  clearMap(g);
  g.world.set(7, 7, 'S');
  const b2 = fireAndAdvance(g, p1, 7 * CELL + CELL / 2 - 20, 7 * CELL + CELL / 2, 'right', 35, 60);
  if (!b2.dead) return '子弹未撞钢墙';
  return true;
});

test('S30', '模式4 运输车到达终点触发 escort_complete', () => {
  const g = newGame(4, 1);
  enterPlay(g);
  const ce = g.convoyEscort;
  const wp = ce.waypoints[ce.waypoints.length - 1];
  ce.transport.x = wp.c * CELL + CELL / 2;
  ce.transport.y = wp.r * CELL + CELL / 2;
  ce.transport.waypointIdx = ce.waypoints.length; // 到达终点
  ce.transport.alive = true;
  const w = ce.checkWin(false, false);
  if (w === 'escort_complete') return true;
  return '到达终点后 checkWin=' + w;
});

test('S31', '[BUG] 协作模式 AI 开局向玩家侧推进（应为对侧敌人）', () => {
  const g = newGame(2, 2);
  enterPlay(g);
  const s2 = g.world.spawns[1];
  const s2x = s2.c * CELL + CELL / 2;
  let distP1 = 0, distS2 = 0;
  for (let i = 2; i < g.tanks.length; i++) {
    distP1 += Math.abs(g.tanks[i].x - g.world.spawns[0].c * CELL - CELL / 2);
    distS2 += Math.abs(g.tanks[i].x - s2x);
  }
  if (distS2 < distP1) return true;
  return '协作模式 AI 全部位于玩家侧（AI 与玩家同侧出生）';
});

test('S46', '越界移动被拒绝：tryMove 返回 false 且位置不变', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const t = g.tanks[0];
  const ox = t.x, oy = t.y;
  if (t.tryMove(-999, -999)) return 'tryMove 越过左上边界却返回 true';
  if (t.x !== ox || t.y !== oy) return '被拒绝后位置仍被改变';
  if (t.tryMove(9999, 9999)) return 'tryMove 越过右下边界却返回 true';
  return true;
});

test('S47', 'dt=0 与极大 dt 下 update 不崩溃且坐标有限', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const t = g.tanks[0];
  t.ai = { update(){}, getCommand(){ return { dir: 'right', fire: false }; } };
  t.update(0);
  t.update(100);
  if (!isFinite(t.x) || !isFinite(t.y)) return '坐标变为非有限值: ' + t.x + ',' + t.y;
  return true;
});

test('S48', '极端 buff 值下 update 不产生 NaN', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const t = g.tanks[0];
  t.ai = { update(){}, getCommand(){ return { dir: 'right', fire: false }; } };
  t.buff.speed = 999999; t.buff.shield = 999999; t.buff.rapid = 999999;
  t.update(0.016);
  if (!isFinite(t.x) || !isFinite(t.y) || !t.alive) return '极端 buff 异常: ' + t.x + ',' + t.y + ' alive=' + t.alive;
  return true;
});

test('S49', '超大伤害 HP 归零而非负数，死亡后不再受伤', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const t = g.tanks[0];
  t.invuln = 0; t.buff.shield = 0;
  t.takeDamage(999999, null, g);
  if (t.hp !== 0) return 'HP=' + t.hp + '（应为0）';
  t.takeDamage(50, null, g);
  if (t.hp !== 0) return '死亡后受伤 HP 变为 ' + t.hp;
  return true;
});

test('S50', '[BUG] AI 在 tanks 数组为空时不崩溃（防御）', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const ai1 = g.tanks[1];
  g.tanks = [];
  try {
    for (let i = 0; i < 30; i++) ai1.ai.update(0.016);
  } catch (e) {
    return 'AI update 崩溃: ' + e.message;
  }
  return true;
});

test('S51', '玩家死亡后 AI 无目标运行不崩溃', () => {
  const g = newGame(0, 2);
  enterPlay(g);
  const p1 = g.tanks[0], ai1 = g.tanks[1];
  p1.alive = false;
  try {
    for (let i = 0; i < 30; i++) ai1.ai.update(0.016);
  } catch (e) {
    return 'AI update 崩溃: ' + e.message;
  }
  return true;
});

test('S52', '动态难度极端序列：100连胜hard/100连败easy/交替合法', () => {
  const d1 = new DynamicDifficulty();
  for (let i = 0; i < 100; i++) d1.recordWin();
  if (d1.getEffectiveDifficulty() !== 'hard') return '100连胜难度=' + d1.getEffectiveDifficulty();
  const d2 = new DynamicDifficulty();
  for (let i = 0; i < 100; i++) d2.recordLoss();
  if (d2.getEffectiveDifficulty() !== 'easy') return '100连败难度=' + d2.getEffectiveDifficulty();
  const d3 = new DynamicDifficulty();
  for (let i = 0; i < 100; i++) { if (i % 2 === 0) d3.recordWin(); else d3.recordLoss(); }
  if (!['easy', 'normal', 'hard'].includes(d3.getEffectiveDifficulty())) return '交替难度越界: ' + d3.getEffectiveDifficulty();
  return true;
});

test('S53', '物理跳弹角度边界：0/负不跳，90/极大跳', () => {
  const p = new Physics();
  if (p.shouldRicochet(0)) return '0度不应跳弹';
  if (p.shouldRicochet(-10)) return '负角度不应跳弹';
  if (!p.shouldRicochet(90)) return '90度应跳弹';
  if (!p.shouldRicochet(999)) return '极大角度应跳弹';
  return true;
});

test('S54', '组合系统边界：4buff并存与快速增删', () => {
  const c = new ComboSystem();
  c.addBuff('speed', 1); c.addBuff('rapid', 1); c.addBuff('power', 1); c.addBuff('mega', 1);
  if (!(c.activeCombos.length >= 1)) return '4buff 并存未形成组合';
  const c2 = new ComboSystem();
  for (let i = 0; i < 100; i++) { c2.addBuff('speed', 1); c2.removeBuff('speed'); }
  if (c2.activeCombos.length !== 0) return '快速增删后残留组合 ' + c2.activeCombos.length;
  return true;
});

globalThis.__results = __R;
`;

try {
  vm.runInContext(SCRIPT, ctx, { filename: 'integration-test.js' });
} catch (e) {
  console.error('沙箱执行失败:', e);
  process.exit(1);
}

const results = (ctx.__results || []).slice();

// Node 侧静态断言
try {
  const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
  const tankSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'tank.js'), 'utf8');
  const bulletSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'bullet.js'), 'utf8');
  const physicsSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8');

  results.push(staticCheck('组合系统 effect 字段(speedMultiplier等)在坦克移动/射击逻辑中生效',
    /speedMultiplier/.test(tankSrc),
    'tank.js 未读取组合 effect 字段 → 闪电战组合加速无效'));
  results.push(staticCheck('履带印衰减使用 dt（而非硬编码 0.016）',
    !/tm\.life\s*-?=\s*0\.016/.test(gameSrc),
    'game.js drawScene 中 tm.life-=0.016 硬编码帧时间'));
  results.push(staticCheck('Tank 类存在 collectedPowerups 属性',
    /collectedPowerups/.test(tankSrc),
    'tank.js 无 collectedPowerups → 对局道具统计恒为空'));
  results.push(staticCheck('物理系统使用 tank.face（随 dirKey 动态同步）',
    /get face\(\)\s*\{/.test(tankSrc),
    'tank.js 未提供 face → physics.js 恒按面朝右计算'));
  results.push(staticCheck('tank.isPlayer 阵营判定包含玩家2（id=1）',
    !/isPlayer\s*=\s*\(?id\s*===?\s*0\)?/.test(tankSrc),
    'tank.js 中 isPlayer 仅以 id===0 判定 → 协作模式 P2/队友阵营错乱(配合 S12/S13)'));
  results.push(staticCheck('模式3 基地保卫战在 startRound 内创建 BaseDefense(s1 已定义)',
    /startRound\(\)\{[\s\S]*?new BaseDefense\(this,s1\.c(?:,s2\.c)?\)/.test(gameSrc),
    'BaseDefense 未在 startRound 内用 s1.c 创建（startMatch 中 s1 未定义会崩溃）'));
} catch (e) {
  console.error('静态断言失败:', e);
}

let pass = 0, fail = 0;
for (const r of results) {
  if (r.pass) pass++; else fail++;
}
console.log('');
console.log('========== 集成测试结果（共 ' + results.length + ' 项）==========');
for (const r of results) {
  const tag = r.pass ? '[PASS]' : '[FAIL]';
  console.log(tag + ' ' + r.id + ' ' + r.name + (r.detail ? '  →  ' + r.detail : ''));
}
console.log('');
console.log('通过: ' + pass + ' / 失败: ' + fail);
fs.writeFileSync(path.join(__dirname, 'integration-results.json'), JSON.stringify(results, null, 2));
