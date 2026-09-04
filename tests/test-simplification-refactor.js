// tests/test-simplification-refactor.js — 代码精简与重构专项 TDD 行为等价性测试
'use strict';
const assert = require('assert');
const vm = require('vm');
const { ctx } = require('./setup.js');

const S = vm.runInContext('({ BaseDefense, ConvoyEscort, Bullet, Tank, Game, World, Input, CONFIG, POWER_TYPES, MAP_DEFS, drawPowerIcon, applyPower, P1_KEYS, P2_KEYS, CELL })', ctx);

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}\n    ${err.stack || err.message}`);
  }
}

function makeMockCtx() {
  return {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    bezierCurveTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    rotate: () => {},
    translate: () => {},
    scale: () => {},
    fillText: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 100 }),
    drawImage: () => {}
  };
}

console.log('==================================================');
console.log('   代码精简与重构专项 (TDD 行为一致性测试)');
console.log('==================================================\n');

// ----------------------------------------------------
// 1. modes.js 简化重构验证
// ----------------------------------------------------
console.log('[模块 1] modes.js 基地保卫战与装甲车护送');

test('BaseDefense 为原生类且能正确实例化与重置', () => {
  assert.strictEqual(typeof S.BaseDefense, 'function');
  const mockGame = { world: new S.World(S.MAP_DEFS[0]) };
  const bd = new S.BaseDefense(mockGame, 2, 18);
  assert.ok(bd.playerHQ);
  assert.ok(bd.enemyHQ);
  assert.strictEqual(bd.playerHQ.hp, 200);
  assert.strictEqual(bd.enemyHQ.hp, 200);
  assert.strictEqual(bd.playerHQ.size, 2);

  bd.takeDamage(50, 'player');
  assert.strictEqual(bd.playerHQ.hp, 150);
  bd.takeDamage(60, 'enemy');
  assert.strictEqual(bd.enemyHQ.hp, 140);

  bd.reset();
  assert.strictEqual(bd.playerHQ.hp, 200);
  assert.strictEqual(bd.enemyHQ.hp, 200);
});

test('BaseDefense 胜利条件与地形清理', () => {
  const mockGame = { world: new S.World(S.MAP_DEFS[0]) };
  const bd = new S.BaseDefense(mockGame, 2, 18);
  
  assert.strictEqual(bd.checkWin(false, false, false), null);
  assert.strictEqual(bd.checkWin(true, false, false), 'player_win');
  assert.strictEqual(bd.checkWin(false, true, false), 'hq_destroyed');
  assert.strictEqual(bd.checkWin(false, false, true), 'player_win');

  bd.clearTerrain(mockGame.world);
  assert.ok(true);
});

test('ConvoyEscort 为原生类且护送机制行为等价', () => {
  assert.strictEqual(typeof S.ConvoyEscort, 'function');
  const mockGame = { world: new S.World(S.MAP_DEFS[0]) };
  const ce = new S.ConvoyEscort(mockGame);
  assert.ok(ce.transport);
  assert.strictEqual(ce.transport.hp, 100);
  assert.strictEqual(ce.transport.alive, true);

  ce.transportTakeDamage(30);
  assert.strictEqual(ce.transport.hp, 70);

  ce.updateTransport(0.5);
  assert.ok(ce.transport.x > 0);

  assert.strictEqual(ce.checkWin(false, false), null);
  assert.strictEqual(ce.checkWin(true, false), 'player_win');
  assert.strictEqual(ce.checkWin(false, true), 'transport_destroyed');
});

// ----------------------------------------------------
// 2. powerup.js 图标表驱动与道具生效逻辑验证
// ----------------------------------------------------
console.log('\n[模块 2] powerup.js 图标绘制与道具生效');

test('drawPowerIcon 支持所有 12 种道具类型且不抛异常', () => {
  const mockCtx = makeMockCtx();
  const types = Object.keys(S.POWER_TYPES).concat(['slow']);
  for (const t of types) {
    S.drawPowerIcon(mockCtx, t, 10);
  }
  assert.ok(true, '12 种道具图标全部无异常绘制');
});

test('applyPower 冰冻与 EMP 对存活敌方生效且不伤队友', () => {
  const game = {
    tanks: [
      { id: 0, team: 0, alive: true, buff: { shield: 8, speed: 0, slow: 0, freeze: 0 }, x: 100, y: 100 },
      { id: 1, team: 0, alive: true, buff: { shield: 0, speed: 0, slow: 0, freeze: 0 }, x: 150, y: 100 }, // 队友
      { id: 2, team: 1, alive: true, buff: { shield: 8, speed: 0, slow: 0, freeze: 0 }, x: 400, y: 400 }, // 敌方1
      { id: 3, team: 1, alive: true, buff: { shield: 0, speed: 0, slow: 0, freeze: 0 }, x: 500, y: 500 }, // 敌方2
      { id: 4, team: 1, alive: false, buff: { shield: 0, speed: 0, slow: 0, freeze: 0 }, x: 600, y: 600 } // 死敌方
    ],
    parts: { text: () => {}, spark: () => {}, ring: () => {}, star: () => {} },
    mines: []
  };

  // 玩家拾取 EMP
  S.applyPower(game, game.tanks[0], 'emp');
  assert.strictEqual(game.tanks[0].buff.shield, 8, '自己护盾不被破');
  assert.strictEqual(game.tanks[1].buff.shield, 0, '队友护盾不受影响');
  assert.strictEqual(game.tanks[2].buff.shield, 0, '敌方1护盾被摧毁');
  assert.strictEqual(game.tanks[2].buff.slow, S.CONFIG.EMP_SLOW_DURATION, '敌方1被减速');
  assert.strictEqual(game.tanks[3].buff.slow, S.CONFIG.EMP_SLOW_DURATION, '敌方2被减速');

  // 玩家拾取冰冻
  S.applyPower(game, game.tanks[0], 'freeze');
  assert.strictEqual(game.tanks[0].buff.freeze, 0, '自己未被冰冻');
  assert.strictEqual(game.tanks[1].buff.freeze, 0, '队友未被冰冻');
  assert.ok(game.tanks[2].buff.freeze > 0, '敌方1被冰冻');
  assert.ok(game.tanks[3].buff.freeze > 0, '敌方2被冰冻');
});

// ----------------------------------------------------
// 3. bullet.js 碰撞模块拆分验证
// ----------------------------------------------------
console.log('\n[模块 3] bullet.js 子弹 5 类碰撞解耦验证');

test('Bullet 碰撞管道：基地碰撞检测', () => {
  const game = {
    gameMode: 3,
    baseDefense: {
      playerHQ: { size: 2, x: 110, y: 110, alive: true },
      enemyHQ: { size: 2, x: 1100, y: 110, alive: true },
      takeDamage: (dmg, target) => {
        if (target === 'enemy') game.baseDefense.enemyHQ.hp -= dmg;
      }
    },
    parts: { debris: () => {}, flash: () => {}, explosion: () => {}, trail: () => {} },
    addShake: () => {},
    world: { at: () => '.' },
    tanks: [],
    bullets: []
  };

  const b = new S.Bullet({ team: 0, color: '#38bdf8' }, 1100, 110, 'right', { damage: 35 });
  b.update(0.016, game);
  assert.strictEqual(b.dead, true, '命中敌方基地后子弹销毁');
});

test('Bullet 碰撞管道：钢墙与砖墙（突击炮穿透）检测', () => {
  let brickDestroyed = false;
  const game = {
    gameMode: 0,
    world: {
      at: (c, r) => (c === 5 ? 'B' : (c === 6 ? 'S' : '.')),
      destroyBrick: () => { brickDestroyed = true; }
    },
    parts: { debris: () => {}, flash: () => {}, ring: () => {}, spark: () => {}, trail: () => {} },
    addShake: () => {},
    tanks: [],
    bullets: []
  };

  // 普通坦克打砖墙 -> 销毁砖墙且子弹死亡
  const bNormal = new S.Bullet({ team: 0, color: '#38bdf8', pierce: false }, 5 * S.CELL + 10, 20, 'right', { damage: 35 });
  bNormal.update(0.016, game);
  assert.strictEqual(brickDestroyed, true);
  assert.strictEqual(bNormal.dead, true);

  // 突击炮打砖墙 -> 销毁砖墙但子弹继续存活
  brickDestroyed = false;
  const bAssault = new S.Bullet({ team: 0, color: '#ef4444', pierce: true }, 5 * S.CELL + 10, 20, 'right', { damage: 60 });
  bAssault.update(0.016, game);
  assert.strictEqual(brickDestroyed, true);
  assert.strictEqual(bAssault.dead, false, '突击炮穿透砖墙后继续存活');

  // 打钢墙 -> 子弹死亡
  const bSteel = new S.Bullet({ team: 0, color: '#38bdf8', pierce: true }, 6 * S.CELL + 10, 20, 'right', { damage: 60 });
  bSteel.update(0.016, game);
  assert.strictEqual(bSteel.dead, true, '即使突击炮遇到钢墙也销毁');
});

test('Bullet 碰撞管道：子弹与子弹对消', () => {
  const b1 = new S.Bullet({ id: 0, team: 0, color: '#38bdf8' }, 200, 200, 'right', { damage: 35 });
  const b2 = new S.Bullet({ id: 1, team: 1, color: '#ff8c42' }, 202, 202, 'left', { damage: 35 });
  const game = {
    gameMode: 0,
    world: { at: () => '.' },
    tanks: [],
    bullets: [b1, b2],
    parts: { spark: () => {}, ring: () => {}, flash: () => {}, trail: () => {} },
    addShake: () => {}
  };

  b1.update(0.016, game);
  assert.strictEqual(b1.dead, true);
  assert.strictEqual(b2.dead, true);
});

// ----------------------------------------------------
// 4. game.js 菜单与通知精简验证
// ----------------------------------------------------
console.log('\n[模块 4] game.js 胜者解析与通知清理精简');

test('Game 菜单渲染分解方法均存在且不抛错', () => {
  const mockCtx = makeMockCtx();
  const game = new S.Game(mockCtx, 1);
  assert.doesNotThrow(() => {
    game.drawMenu(mockCtx);
  });
});

test('Game 胜者文本与颜色解析统一方法 getWinnerInfo', () => {
  const game = new S.Game(makeMockCtx(), 1);
  game.tanks = [
    { name: '玩家 1', color: '#38bdf8' },
    { name: '玩家 2', color: '#34d399' }
  ];

  // 单人模式
  game.gameMode = 0;
  assert.strictEqual(game.getWinnerInfo(0).name, '玩家');
  assert.strictEqual(game.getWinnerInfo(0).color, '#38bdf8');
  assert.strictEqual(game.getWinnerInfo(1).name, 'AI 阵营');

  // 协作模式
  game.gameMode = 2;
  assert.strictEqual(game.getWinnerInfo(0).name, '玩家阵营');
  assert.strictEqual(game.getWinnerInfo(1).name, 'AI 阵营');

  // 平局
  assert.strictEqual(game.getWinnerInfo(-1).name, '平局');
});

// ----------------------------------------------------
// 5. tank.js 输入方向辅助方法验证
// ----------------------------------------------------
console.log('\n[模块 5] tank.js 输入方向判定精简');

test('Tank 输入方向解析一致性', () => {
  const mockGame = { world: new S.World(S.MAP_DEFS[0]), matchStats: [{}] };
  const tank = new S.Tank(0, { c: 1, r: 1, face: 'right', color: '#38bdf8', name: 'P1', keys: S.P1_KEYS }, mockGame);
  
  // 模拟按键 W
  S.Input.held.add('KeyW');
  assert.strictEqual(tank._getInputDir(S.P1_KEYS, null), 'up');
  S.Input.held.delete('KeyW');

  // 模拟手柄推左
  assert.strictEqual(tank._getInputDir(S.P1_KEYS, 'left'), 'left');
});

console.log('\n==================================================');
console.log(`执行总结: 总测试 ${total} | 通过: ${passed} | 失败: ${total - passed}`);
console.log('==================================================');
if (passed === total) process.exit(0);
else process.exit(1);
