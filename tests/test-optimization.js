// tests/test-optimization.js
// 优化专项 TDD：针对分析发现的性能/代码质量/可见性问题的失败测试
// 运行: node tests/test-optimization.js
'use strict';
const fs = require('fs');
const vm = require('vm');

// ---------- VM 沙箱（含 createElement 以支持离屏缓存路径） ----------
const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date,
  setTimeout, setInterval, clearTimeout, clearInterval,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  Error, TypeError, RangeError, RegExp, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Promise,
  window: { addEventListener: () => {}, devicePixelRatio: 1 },
  document: {
    getElementById: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: () => true }) }),
    addEventListener: () => {}
  },
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

// ---------- 测试脚本（在 vm 内执行，可访问全部类/常量） ----------
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
function mk() {
  const o = { canvas: { width: VIEW_W, height: VIEW_H }, __di: 0,
    measureText: (t) => ({ width: (t ? String(t).length : 0) * 8 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => ({}) };
  o.drawImage = function () { o.__di++; };
  return new Proxy(o, { get(t, p) { if (p in t) return t[p]; return () => {}; }, set(t, p, v) { t[p] = v; return true; } });
}
function newGame(mode, aiCount) {
  Tutorial.markCompleted();
  const g = new Game(mk(), 1);
  g.gameMode = mode;
  if (aiCount !== undefined) g.aiCount = aiCount;
  g.state = 'menu';
  return g;
}
function enterPlay(g) {
  g.startMatch(0);
  let n = 0;
  while (g.state !== 'play' && n < 800) { g.update(0.016); n++; }
  if (g.state !== 'play') throw new Error('无法进入 play, state=' + g.state);
}
function clearMap(g) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.world.set(c, r, '.');
}

// ===== F1: 模式3 基地应被渲染 =====
test('F1-baseDefense-draw', '模式3基地应被渲染(baseDefense.draw 被调用)',
  () => {
    const g = newGame(3);
    enterPlay(g);
    if (!g.baseDefense) return 'baseDefense 未创建';
    let called = false;
    const orig = g.baseDefense.draw;
    g.baseDefense.draw = function () { called = true; };
    g.draw();
    g.baseDefense.draw = orig;
    return called ? true : 'drawScene 未调用 baseDefense.draw';
  });

// ===== F2: 跳弹应反射而非消失 =====
test('F2-ricochet-reflect', '跳弹应反射且子弹不消失',
  () => {
    const g = newGame(0); enterPlay(g); clearMap(g);
    const ai = g.tanks[1]; ai.x = 200; ai.y = 200; ai.dirKey = 'right'; ai.hp = 100; ai.maxHp = 100; ai.invuln = 0;
    const pl = g.tanks[0]; pl.x = 80; pl.y = 200;
    g.physics.RICOCHET_ANGLE = 10; // 强制触发跳弹
    // 命中点取 ~43° 斜向入射（相对 ai 面朝 right）：
    // 避开 60°~120° 侧面履带区（避免 TRACK_STUN_CHANCE=0.3 随机断履带导致 flaky），
    // 一次 update 后 x≈220、y=219 → dx≈20、dy=19，命中角≈43° 稳定触发跳弹
    const b = new Bullet(pl, 227, 219, 'left', { damage: 35 });
    b.update(0.016, g);
    if (b.dead) return '跳弹后子弹被销毁(应反射存活)';
    if (!(b.dir.x !== -1 || b.dir.y !== 0)) return '子弹方向未改变(未反射)';
    if (ai.hp >= 100) return '跳弹未对坦克造成减伤';
    return true;
  });

// ===== F3: buff.slow 入 schema + 移除死变量 buffMax =====
test('F3-buff-slow-schema', 'buff 应包含 slow 且移除死变量 buffMax',
  () => {
    const g = newGame(0); enterPlay(g);
    const t = g.tanks[0];
    if (typeof t.buff.slow !== 'number') return 'buff.slow 未定义(缺省 schema)';
    if (t.buffMax !== undefined) return 'buffMax 仍存在(应为只写死变量)';
    return true;
  });

// ===== F4: 每帧分配清理（功能等价回归） =====
test('F4-perf-noalloc-regression', 'updatePlay 后死亡子弹清除且组合 buff 同步正常',
  () => {
    const g = newGame(0); enterPlay(g);
    const b = new Bullet(g.tanks[0], 100, 100, 'right', { damage: 10 }); b.dead = true; g.bullets.push(b);
    g.tanks[0].buff.shield = 2;
    g.updatePlay(0.016);
    if (g.bullets.indexOf(b) !== -1) return '死亡子弹未被清除';
    if (!g.comboSystem.activeBuffTypes.shield) return '组合系统未同步 shield buff';
    return true;
  });

// ===== F5: 地形离屏缓存 =====
test('F5-terrain-cache', 'World.drawBase 应使用离屏缓存(drawImage)',
  () => {
    const w = new World(MAP_DEFS[0]);
    if (!w._bg) return 'World 未创建离屏缓存画布 _bg';
    const m = mk();
    w.drawBase(m, 0);
    return m.__di >= 1 ? true : 'drawBase 未调用 drawImage 缓存底图';
  });

// ===== F6: 菜单预览离屏缓存 =====
test('F6-menu-preview-cache', '菜单预览应使用离屏缓存(drawImage>=12)',
  () => {
    const m = mk();
    const g = new Game(m, 1);
    if (!g._menuPreviews) return 'Game 未构建菜单预览缓存 _menuPreviews';
    g.state = 'menu'; g.gameMode = 0; g.mapIdx = 0;
    g.draw();
    return m.__di >= 12 ? true : ('菜单未对 12 张预览调用 drawImage, 实际=' + m.__di);
  });

// ===== F7: 手感/性能魔数集中到 CONFIG =====
test('F7-config-magic', '性能/手感相关魔数应集中到 CONFIG',
  () => {
    const need = ['SHAKE_MAX', 'DAMAGE_FLASH_TIME', 'HITMARKER_TIME', 'COUNTDOWN_TIME'];
    for (const k of need) if (CONFIG[k] === undefined) return 'CONFIG.' + k + ' 缺失';
    return true;
  });

__R;
`;

const results = vm.runInContext(SCRIPT, ctx, { filename: 'test-optimization-script' });

let pass = 0, fail = 0;
for (const r of results) {
  if (r.pass) { pass++; console.log('  ✓ ' + r.id + ' ' + r.name); }
  else { fail++; console.log('  ✗ [FAIL] ' + r.id + ' ' + r.name + (r.detail ? '  →  ' + r.detail : '')); }
}
console.log('\n' + '='.repeat(50));
console.log('[优化专项 TDD] 通过: ' + pass + ' / 失败: ' + fail);
console.log('='.repeat(50));
process.exit(fail > 0 ? 1 : 0);
