// tests/test-codriver.js
// 车长同乘模式（Co-Driver Mode）与独立炮塔瞄准测试套件

const fs = require('fs');
const vm = require('vm');

const mockCtx = {
  save(){}, restore(){}, translate(){}, rotate(){}, fillRect(){},
  fill(){}, stroke(){}, beginPath(){}, arc(){}, arcTo(){}, moveTo(){},
  lineTo(){}, closePath(){}, scale(){}, setLineDash(){}, quadraticCurveTo(){},
  setTransform(){}, clip(){}, strokeRect(){}, fillText(){}, rect(){},
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => ({ addColorStop(){} }),
  createRadialGradient: () => ({ addColorStop(){} })
};

const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date, Set, Map,
  setTimeout, setInterval, clearTimeout, clearInterval,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  window: { addEventListener: () => {}, removeEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ width: 1600, height: 900, getContext: () => mockCtx }), addEventListener: () => {} },
  AudioContext: class { constructor(){this.state='running';this.currentTime=0;this.destination={};} resume(){} createGain(){return{gain:{value:0},connect:()=>{}}} createOscillator(){return{type:'',frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},start:()=>{},stop:()=>{}}} get sampleRate(){return 44100} },
  localStorage: { _store:{}, getItem(k){return this._store[k]||null}, setItem(k,v){this._store[k]=String(v)}, removeItem(k){delete this._store[k]}, clear(){this._store = {}} },
  requestAnimationFrame: () => {}
};

const ctx = vm.createContext(sandbox);

// 按顺序载入所有游戏模块
[
  'js/utils.js','js/audio.js','js/tutorial.js','js/dynamic-difficulty.js',
  'js/achievements.js','js/leaderboard.js','js/combos.js','js/bgm.js',
  'js/physics.js','js/modes.js','js/tank-classes.js','js/input.js',
  'js/maps.js','js/world.js','js/particles.js','js/powerup.js',
  'js/bullet.js','js/ai.js','js/tank.js','js/game.js'
].forEach(p => {
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
});

const TEST_RUNNER = `
'use strict';
const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  near(a, b, eps = 0.001, msg = '') { this.ok(Math.abs(a - b) <= eps, (msg || 'near') + ' (' + a + ' ≈ ' + b + ')'); },
  summary() {
    console.log('\\n' + '='.repeat(50));
    console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail);
    console.log('='.repeat(50));
    return this._fail;
  }
};

console.log('\\n[Test 1] Input 模块鼠标支持');
T.ok(Input.mouse, 'Input 存在 mouse 状态对象');
T.ok(typeof Input.mouse.x === 'number', 'mouse.x 是数字');
T.ok(typeof Input.mouse.y === 'number', 'mouse.y 是数字');
T.ok(typeof Input.mouse.down === 'boolean', 'mouse.down 是布尔值');

console.log('\\n[Test 2] Tank 类的炮塔角度与朝向解耦');
const mockGame = {
  matchStats: [{ shots: 0, hits: 0, dmg: 0, kills: 0 }],
  bullets: [],
  parts: { muzzleBlast(){}, spark(){}, hitImpact(){}, text(){}, explosion(){} },
  addShake(){},
  triggerHitmarker(){},
  world: { at: () => '.', solidTank: () => false },
  gameMode: 5 // 车长同乘模式
};
const tank = new Tank(0, { c: 2, r: 2, face: 'right', color: '#38bdf8', name: '双人坦克', keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: ['Space'] } }, mockGame, 'medium');

T.ok(typeof tank.turretAngle === 'number', 'tank 存在 turretAngle 属性');
T.near(tank.turretAngle, DIRS.right.a, 0.001, '初始 turretAngle 与初始 dirKey (right) 朝向一致');

// 旋转炮塔测试
tank.turretAngle = Math.PI / 4; // 45度
T.near(tank.turretAngle, Math.PI / 4, 0.001, 'turretAngle 支持独立赋值为任意角度');

console.log('\\n[Test 3] 360 度独立开火计算');
const oldBulletsCount = mockGame.bullets.length;
tank.fire();
T.eq(mockGame.bullets.length, oldBulletsCount + 1, '调用 fire() 成功生成子弹');
const spawnedBullet = mockGame.bullets[mockGame.bullets.length - 1];
T.ok(spawnedBullet, '子弹实例存在');
T.near(spawnedBullet.dir.x, Math.cos(Math.PI / 4), 0.01, '子弹 x 方向分量符合 turretAngle');
T.near(spawnedBullet.dir.y, Math.sin(Math.PI / 4), 0.01, '子弹 y 方向分量符合 turretAngle');

console.log('\\n[Test 4] 360 度散射道具开火测试');
tank.buff.scatter = 5;
const beforeScatterCount = mockGame.bullets.length;
tank.fire();
T.eq(mockGame.bullets.length, beforeScatterCount + 3, '散射状态下生成 3 颗子弹');
tank.buff.scatter = 0;

console.log('\\n[Test 5] 普通模式下转向会同步更新 turretAngle');
const normalGame = {
  matchStats: [{ shots: 0, hits: 0, dmg: 0, kills: 0 }],
  bullets: [],
  parts: { muzzleBlast(){}, spark(){}, hitImpact(){}, text(){}, explosion(){} },
  addShake(){},
  world: { at: () => '.', solidTank: () => false },
  gameMode: 0 // 单人模式
};
const normalTank = new Tank(0, { c: 2, r: 2, face: 'up', color: '#38bdf8', name: '普通坦克', keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: ['Space'] } }, normalGame, 'medium');
T.near(normalTank.turretAngle, DIRS.up.a, 0.001, '普通模式初始角度为 up 朝向');
normalTank.turn('down');
T.near(normalTank.turretAngle, DIRS.down.a, 0.001, '普通模式 turn() 转向后 turretAngle 自动对齐');

console.log('\\n[Test 6] 车长同乘模式下 Tank.update() 自动根据鼠标逻辑坐标计算 turretAngle');
const canvasTankX = tank.x + FIELD_X;
const canvasTankY = tank.y + FIELD_Y;
Input.mouse.x = canvasTankX + 100;
Input.mouse.y = canvasTankY + 100;
tank.update(0.016);
const expectedAngle = Math.atan2(100, 100);
T.near(tank.turretAngle, expectedAngle, 0.01, '同乘模式下 update 自动将炮塔旋转对准鼠标位置');

console.log('\\n[Test 7] 绘制测试：drawTankBody 传入 turretAngle 不抛异常');
let drawError = null;
try {
  drawTankBody(document.getElementById('game').getContext(), 100, 100, 'up', '#38bdf8', 0, 0, Math.PI / 3);
} catch(e) {
  drawError = e;
}
T.ok(!drawError, 'drawTankBody 接收 turretAngle 参数绘制无异常');

console.log('\\n[Test 8] 边界情况：鼠标坐标与坦克重合或极大极小不产生 NaN');
Input.mouse.x = canvasTankX;
Input.mouse.y = canvasTankY;
tank.update(0.016);
T.ok(!isNaN(tank.turretAngle) && isFinite(tank.turretAngle), '坐标重合时 turretAngle 不是 NaN');

Input.mouse.x = -99999;
Input.mouse.y = 99999;
tank.update(0.016);
T.ok(!isNaN(tank.turretAngle) && isFinite(tank.turretAngle), '极大坐标下 turretAngle 不是 NaN');

console.log('\\n[Test 9] 命中反馈 Hitmarker 与 瞄准锁定辅助');
const gameTest = new Game(document.getElementById('game').getContext(), 1);
T.eq(gameTest.hitmarker, 0, '初始 hitmarker 为 0');
gameTest.triggerHitmarker();
T.near(gameTest.hitmarker, 0.18, 0.01, '触发后 hitmarker 设为 0.18s');
gameTest.update(0.05);
T.near(gameTest.hitmarker, 0.13, 0.01, 'update 正常衰减 hitmarker 计时');

console.log('\\n[Test 10] Game 集成测试：启动模式 5 (车长同乘) 并运行 150 帧');
let gameInstance = null;
let gameError = null;
try {
  gameInstance = new Game(document.getElementById('game').getContext(), 1);
  gameInstance.gameMode = 5; // 模式5: 车长同乘
  gameInstance.startMatch(0);
  T.eq(gameInstance.gameMode, 5, '游戏模式成功设置为 5');
  T.ok(gameInstance.tanks.length >= 2, '存在玩家坦克与 AI 坦克');
  T.eq(gameInstance.tanks[0].team, 0, '玩家坦克属于阵营 0');
  T.eq(gameInstance.tanks[0].name, '车长双人组', '玩家坦克名称为 车长双人组');
  
  // 模拟运行 150 帧
  for (let i = 0; i < 150; i++) {
    gameInstance.update(0.016);
    gameInstance.draw();
  }
} catch(e) {
  gameError = e;
}
T.ok(!gameError, '模式 5 运行 150 帧无崩溃: ' + (gameError ? gameError.message : ''));

globalThis.__failCount = T.summary();
`;

vm.runInContext(TEST_RUNNER, ctx);
const failCount = vm.runInContext('globalThis.__failCount', ctx);
process.exit(failCount > 0 ? 1 : 0);
