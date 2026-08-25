// tests/test-tdd-bugfixes.js
// TDD 红阶段：针对剩余 bug 的失败测试
// 运行方式: node tests/test-tdd-bugfixes.js

'use strict';
const fs = require('fs');
const vm = require('vm');

// ---------- 测试工具 ----------
const T = {
  _pass: 0, _fail: 0, _failedNames: [],
  ok(v, msg) {
    if (v) { this._pass++; console.log('  ✓ ' + msg); }
    else { this._fail++; this._failedNames.push(msg); console.log('  ✗ [FAIL] ' + msg); }
  },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  summary(name) {
    console.log('\n' + '='.repeat(50));
    console.log('[' + name + '] Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail);
    console.log('='.repeat(50));
    process.exit(this._fail > 0 ? 1 : 0);
  }
};

// ---------- VM 沙箱 ----------
const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date,
  setTimeout, setInterval, clearTimeout, clearInterval,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  Error, TypeError, RangeError, RegExp, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Promise,
  window: { addEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ width: 0, height: 0, getContext: () => ({}) }), addEventListener: () => {} },
  requestAnimationFrame: () => {},
  AudioContext: class { constructor(){this.state='running';this.currentTime=0;this.destination={};} resume(){} createGain(){return{gain:{value:0},connect:()=>{}}} createOscillator(){return{type:'',frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},start:()=>{},stop:()=>{}}} get sampleRate(){return 44100} },
  localStorage: { _store:{}, getItem(k){return this._store[k]||null}, setItem(k,v){this._store[k]=String(v)}, removeItem(k){delete this._store[k]}, clear(){this._store={}} }
};
const ctx = vm.createContext(sandbox);
function load(p){ vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p }); }

[
  'js/utils.js','js/audio.js','js/tutorial.js','js/dynamic-difficulty.js',
  'js/achievements.js','js/leaderboard.js','js/combos.js','js/bgm.js',
  'js/physics.js','js/modes.js','js/tank-classes.js','js/input.js',
  'js/maps.js','js/world.js','js/particles.js','js/powerup.js',
  'js/bullet.js','js/ai.js','js/tank.js','js/game.js'
].forEach(load);

// ---------- VM 内桥接（const/class 声明不在 context 对象上，需内部取） ----------
const bridge = vm.runInContext(`
 ({
  CONFIG, COLS, ROWS, CELL, VIEW_W, VIEW_H, FIELD_W, FIELD_H,
  get Input(){ return Input; },
  get MAP_DEFS(){ return MAP_DEFS; },
  get POWER_TYPES(){ return POWER_TYPES; },
  makeCanvasMock(){
   const calls = [];
   const fn = () => {};
   return new Proxy({}, { get(t,k){
    if(k==='measureText') return () => ({width:10});
    if(k==='createLinearGradient'||k==='createPattern') return () => ({addColorStop:fn});
    if(typeof calls !== 'undefined') {}
    return fn;
   }, set(){ return true; } });
  },
  makeGame(){
   const m = this.makeCanvasMock();
   const g = new Game(m, 1);
   return g;
  },
  resetEnv(){
   localStorage.clear();
   Input.held.clear(); Input.taps.clear();
  },
  press(code){ Input.taps.add(code); },
  clearKeys(){ Input.taps.clear(); Input.held.clear(); },
 });
`, ctx);

// 每个用例前重置环境
function freshGame(){ bridge.resetEnv(); return bridge.makeGame(); }

// ========================================
console.log('\n[BUG-A] 教程激活时按 Space 不应同帧启动比赛');
{
  const g = freshGame();
  g.state = 'menu';
  g.showLeaderboard = false;
  if (g.tutorial.state !== 'active') g.tutorial.start();

  bridge.press('Space');           // 教程翻页键 & 菜单开始键 冲突
  g.update(0.016);                 // 一帧
  bridge.clearKeys();

  T.ok(
    g.tutorial.state === 'active' || g.tutorial.state === 'completed' || g.tutorial.state === 'skipped',
    '教程状态正常流转 (got ' + g.tutorial.state + ')'
  );
  T.eq(g.state, 'menu', '教程处理输入的同帧，游戏不得离开 menu 状态');
}

// ========================================
console.log('\n[BUG-B] 密集障碍下连续 spawn 多个 AI 不得堆叠同一点');
{
  const g = freshGame();
  g.gameMode = 0; g.aiCount = 10;
  g.startMatch(11);                // 地图12「空旷平原」
  const w = g.world, s2 = w.spawns[1];

  // 把 s2 周围 9x9 区域全部封死（旧 SAFE_OFFSETS 最大半径 2 格必然全被挡）
  for (let r = s2.r - 5; r <= s2.r + 5; r++)
    for (let c = s2.c - 5; c <= s2.c + 5; c++)
      if (r >= 0 && r < bridge.ROWS && c >= 0 && c < bridge.COLS) w.set(c, r, 'S');
  // 在封死区之外留出可生成空间
  g.tanks = [g.tanks[0]];          // 仅保留玩家
  for (let i = 0; i < 10; i++) g.spawnAI(i + 1, s2, '#ff8c42', 'AI·' + i, 'medium');

  const ais = g.tanks.slice(1);
  T.eq(ais.length, 10, '10 个 AI 全部生成');
  const keys = ais.map(t => Math.round(t.x) + ',' + Math.round(t.y));
  const uniq = new Set(keys).size;
  T.eq(uniq, 10, '10 个 AI 出生位置互不重叠 (unique=' + uniq + ')');
}

// ========================================
console.log('\n[BUG-B2] SAFE_OFFSETS 可用时多个 AI 也不得重叠（占用检查）');
{
  const g = freshGame();
  g.gameMode = 0; g.aiCount = 3;
  g.startMatch(11);                // 空旷平原，SAFE_OFFSETS 全部可用
  const s2 = g.world.spawns[1];
  g.tanks = [g.tanks[0]];
  for (let i = 0; i < 3; i++) g.spawnAI(i + 1, s2, '#ff8c42', 'AI·' + i, 'medium');
  const ais = g.tanks.slice(1);
  const keys = ais.map(t => Math.round(t.x) + ',' + Math.round(t.y));
  T.eq(new Set(keys).size, 3, '开阔地 3 个 AI 位置互不重叠 (unique=' + new Set(keys).size + ')');
}

// ========================================
console.log('\n[BUG-C] 护送模式下 AI 应优先攻击运输车');
{
  const g = freshGame();
  g.gameMode = 4; g.aiCount = 1;
  g.startMatch(11);                // 空旷平原，无遮挡保证 LOS
  const ai = g.tanks[1];
  ai.ai.diff = 'hard';

  // 场景：玩家在 AI 上方 500px（LOS 通畅），运输车在 AI 右侧 120px
  g.tanks[0].x = ai.x;
  g.tanks[0].y = ai.y - 500;
  g.convoyEscort.transport.alive = true;
  g.convoyEscort.transport.x = ai.x + 120;
  g.convoyEscort.transport.y = ai.y;

  ai.ai.dirTimer = 0;              // 强制重新决策
  ai.ai.update(0.016);
  const cmd = ai.ai.getCommand();
  T.eq(cmd.dir, 'right', 'AI 应朝向右侧的运输车 (got ' + cmd.dir + ')');
}

console.log('\n[BUG-C2] 运输车被毁后 AI 恢复攻击玩家');
{
  const g = freshGame();
  g.gameMode = 4; g.aiCount = 1;
  g.startMatch(11);
  const ai = g.tanks[1];
  ai.ai.diff = 'hard';
  g.convoyEscort.transport.alive = false;   // 运输车已毁

  g.tanks[0].x = ai.x + 300;               // 玩家在右侧
  g.tanks[0].y = ai.y;

  ai.ai.dirTimer = 0;
  ai.ai.update(0.016);
  const cmd = ai.ai.getCommand();
  T.eq(cmd.dir, 'right', '运输车已毁时 AI 应回到追击玩家 (got ' + cmd.dir + ')');
}

// ========================================
console.log('\n[BUG-D] 基地保卫战应有敌我双方基地');
{
  const g = freshGame();
  g.gameMode = 3; g.aiCount = 1;
  g.startMatch(0);

  const bd = g.baseDefense;
  T.ok(bd.playerHQ && typeof bd.playerHQ.alive === 'boolean', '存在玩家基地 playerHQ');
  T.ok(bd.enemyHQ && typeof bd.enemyHQ.alive === 'boolean', '存在敌方基地 enemyHQ');
  T.ok(bd.enemyHQ.x > bridge.FIELD_W / 2, '敌方基地位于右半场 (x=' + (bd.enemyHQ||{}).x + ')');
  T.ok(bd.playerHQ.x < bridge.FIELD_W / 2, '玩家基地位于左半场 (x=' + (bd.playerHQ||{}).x + ')');
}

console.log('\n[BUG-D2] 敌方基地可被玩家子弹摧毁并触发胜利');
{
  const g = freshGame();
  g.gameMode = 3; g.aiCount = 1;
  g.startMatch(0);
  const bd = g.baseDefense;

  // 玩家子弹直接置于敌方基地中心
  const b = new (vm.runInContext('Bullet', ctx))(g.tanks[0], bd.enemyHQ.x, bd.enemyHQ.y, 'right', { damage: 9999 });
  g.bullets.push(b);
  b.update(0.016, g);

  T.ok(b.dead, '子弹命中敌方基地后销毁');
  T.eq(bd.enemyHQ.alive, false, '敌方基地被摧毁');
  const win = bd.checkWin(false, !bd.playerHQ.alive, !bd.enemyHQ.alive);
  T.eq(win, 'player_win', '摧毁敌方基地判定玩家胜利');
}

console.log('\n[BUG-D3] 我方基地被 AI 子弹摧毁则判负');
{
  const g = freshGame();
  g.gameMode = 3; g.aiCount = 1;
  g.startMatch(0);
  const bd = g.baseDefense;

  const b = new (vm.runInContext('Bullet', ctx))(g.tanks[1], bd.playerHQ.x, bd.playerHQ.y, 'left', { damage: 9999 });
  g.bullets.push(b);
  b.update(0.016, g);

  T.eq(bd.playerHQ.alive, false, '玩家基地被摧毁');
  const win = bd.checkWin(false, !bd.playerHQ.alive, !bd.enemyHQ.alive);
  T.eq(win, 'hq_destroyed', '我方基地被毁判定失败');
}

console.log('\n[BUG-D4] 双方基地均绘制（渲染不抛错）');
{
  const g = freshGame();
  g.gameMode = 3; g.aiCount = 1;
  g.startMatch(0);
  let threw = false;
  try {
    const m = bridge.makeCanvasMock();
    g.baseDefense.draw(m, 0);
  } catch (e) { threw = true; console.log('    err: ' + e.message); }
  T.ok(!threw, 'baseDefense.draw 双基地渲染无异常');
}

// ========================================
T.summary('TDD 剩余 Bug 修复');
