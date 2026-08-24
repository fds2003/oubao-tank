// 新手保护机制测试
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date,
  setTimeout, parseInt, parseFloat, isNaN, Infinity, NaN, Error, TypeError,
  window: { addEventListener:()=>{}, devicePixelRatio:1 },
  document: { getElementById:()=>({width:0,height:0,getContext:()=>({})}), addEventListener:()=>{} },
  requestAnimationFrame: ()=>{},
  AudioContext: class { constructor(){this.state='running';this.currentTime=0;this.destination={}} resume(){} createGain(){return{gain:{value:0},connect:()=>{}}} createOscillator(){return{type:'',frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},start:()=>{},stop:()=>{}}} get sampleRate(){return 44100} },
  localStorage: { _store:{}, getItem(k){return this._store[k]||null}, setItem(k,v){this._store[k]=String(v)}, removeItem(k){delete this._store[k]}, clear(){this._store={}} }
};
const ctx = vm.createContext(sandbox);
function load(p){vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p})}
load('js/utils.js');
load('js/audio.js');
load('js/dynamic-difficulty.js');

const DynamicDifficulty = ctx.DynamicDifficulty;

const T = {
  _p: 0, _f: 0,
  eq(a, b, m) { if (a === b) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}\n    Expected: ${JSON.stringify(b)}\n    Actual:   ${JSON.stringify(a)}`); } },
  ok(v, m) { if (v) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}`); } },
  done() { console.log(`\n${'='.repeat(50)}\nTests: ${this._p+this._f} | Passed: ${this._p} | Failed: ${this._f}\n${'='.repeat(50)}`); return this._f === 0; }
};

// ============================================================
// 新手保护机制设计：
// - 前3局 AI 开火冷却 ×1.5
// - 实现方式：在 AI 构造时记录保护期，调整 getFireCD
// ============================================================

console.log('\n[Test] NewPlayerProtection - 概念验证');
{
  // 验证 DynamicDifficulty 可以扩展支持保护期
  const dd = new DynamicDifficulty();
  
  // 新增属性：保护期计数
  dd.gamesPlayed = 0;
  dd.protectionGames = 3;
  dd.fireCooldownMultiplier = 1.5;
  
  T.eq(dd.gamesPlayed, 0, '初始游戏数 0');
  T.eq(dd.protectionGames, 3, '保护期 3 局');
  T.eq(dd.fireCooldownMultiplier, 1.5, '开火冷却倍率 1.5');
  
  // 计算有效倍率
  dd.getFireCDMultiplier = function() {
    return this.gamesPlayed < this.protectionGames ? this.fireCooldownMultiplier : 1.0;
  };
  
  // 在保护期内
  T.ok(dd.gamesPlayed < dd.protectionGames, '第0局在保护期内');
  T.eq(dd.getFireCDMultiplier(), 1.5, '保护期内冷却×1.5');
  
  // 模拟玩了3局
  dd.gamesPlayed = 3;
  T.ok(dd.gamesPlayed >= dd.protectionGames, '第3局后离开保护期');
  T.eq(dd.getFireCDMultiplier(), 1.0, '保护期后冷却×1.0');
  
  dd.gamesPlayed = 5;
  T.eq(dd.getFireCDMultiplier(), 1.0, '第5局冷却×1.0');
}

console.log('\n[Test] NewPlayerProtection - 游戏计数');
{
  const dd = new DynamicDifficulty();
  dd.gamesPlayed = 0;
  dd.protectionGames = 3;
  
  // recordGame 方法（待实现）
  dd.recordGame = function() { this.gamesPlayed++; };
  
  dd.recordGame();
  T.eq(dd.gamesPlayed, 1, '玩1局');
  dd.recordGame();
  dd.recordGame();
  T.eq(dd.gamesPlayed, 3, '玩3局');
}

console.log('\n[Test] NewPlayerProtection - 边界情况');
{
  const dd = new DynamicDifficulty();
  dd.gamesPlayed = 0;
  dd.protectionGames = 3;
  dd.fireCooldownMultiplier = 1.5;
  
  dd.getFireCDMultiplier = function() {
    return this.gamesPlayed < this.protectionGames ? this.fireCooldownMultiplier : 1.0;
  };
  
  // 刚好在边界
  dd.gamesPlayed = 2;
  T.eq(dd.getFireCDMultiplier(), 1.5, '第2局仍在保护期');
  
  dd.gamesPlayed = 3;
  T.eq(dd.getFireCDMultiplier(), 1.0, '第3局离开保护期');
}

const ok = T.done();
process.exit(ok ? 0 : 1);
