// 动态难度系统测试
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
const CONFIG = ctx.CONFIG;

const T = {
  _p: 0, _f: 0,
  eq(a, b, m) { if (a === b) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}\n    Expected: ${JSON.stringify(b)}\n    Actual:   ${JSON.stringify(a)}`); } },
  ok(v, m) { if (v) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}`); } },
  done() { console.log(`\n${'='.repeat(50)}\nTests: ${this._p+this._f} | Passed: ${this._p} | Failed: ${this._f}\n${'='.repeat(50)}`); return this._f === 0; }
};

// ============================================================
console.log('\n[Test] DynamicDifficulty - 初始化');
{
  const dd = new DynamicDifficulty();
  T.eq(dd.winStreak, 0, '初始连胜 0');
  T.eq(dd.loseStreak, 0, '初始连败 0');
  T.eq(dd.baseDifficulty, 1, '初始难度 1 (普通)');
  T.eq(dd.minDifficulty, 0, '最小难度 0 (简单)');
  T.eq(dd.maxDifficulty, 2, '最大难度 2 (困难)');
  T.eq(dd.streakThreshold, 3, '连胜/连败阈值 3');
  T.eq(dd.getEffectiveDifficulty(), 'normal', '初始难度字符串 normal');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 胜利记录');
{
  const dd = new DynamicDifficulty();
  dd.recordWin();
  T.eq(dd.winStreak, 1, '赢1局连胜=1');
  T.eq(dd.loseStreak, 0, '赢1局连败=0');
  
  dd.recordWin();
  dd.recordWin();
  T.eq(dd.winStreak, 0, '赢3局触发升级后连胜重置为0');
  T.eq(dd.getEffectiveDifficulty(), 'hard', '连胜3局难度升为困难');
  T.eq(dd.baseDifficulty, 2, 'baseDifficulty=2');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 失败记录');
{
  const dd = new DynamicDifficulty();
  dd.recordLoss();
  T.eq(dd.loseStreak, 1, '输1局连败=1');
  T.eq(dd.winStreak, 0, '输1局连胜=0');
  
  dd.recordLoss();
  dd.recordLoss();
  T.eq(dd.loseStreak, 0, '输3局触发降级后连败重置为0');
  T.eq(dd.getEffectiveDifficulty(), 'easy', '连败3局难度降为简单');
  T.eq(dd.baseDifficulty, 0, 'baseDifficulty=0');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 难度边界');
{
  // 已经是困难，赢3局不超界
  const dd1 = new DynamicDifficulty();
  dd1.baseDifficulty = 2;
  dd1.recordWin();
  dd1.recordWin();
  dd1.recordWin();
  T.eq(dd1.getEffectiveDifficulty(), 'hard', '困难时赢3局仍为困难');

  // 已经是简单，输3局不超界
  const dd2 = new DynamicDifficulty();
  dd2.baseDifficulty = 0;
  dd2.recordLoss();
  dd2.recordLoss();
  dd2.recordLoss();
  T.eq(dd2.getEffectiveDifficulty(), 'easy', '简单时输3局仍为简单');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 连胜重置连败');
{
  const dd = new DynamicDifficulty();
  dd.recordLoss();
  dd.recordLoss();
  dd.recordWin();
  T.eq(dd.loseStreak, 0, '赢一局重置连败');
  T.eq(dd.winStreak, 1, '赢一局连胜=1');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 连败重置连胜');
{
  const dd = new DynamicDifficulty();
  dd.recordWin();
  dd.recordWin();
  dd.recordLoss();
  T.eq(dd.winStreak, 0, '输一局重置连胜');
  T.eq(dd.loseStreak, 1, '输一局连败=1');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - setDifficulty');
{
  const dd = new DynamicDifficulty();
  dd.setDifficulty(2);
  T.eq(dd.baseDifficulty, 2, 'setDifficulty(2)');
  T.eq(dd.winStreak, 0, 'set后连胜=0');
  T.eq(dd.loseStreak, 0, 'set后连败=0');
  
  dd.setDifficulty(5); // 超界
  T.eq(dd.baseDifficulty, 2, '超界保持2');
  
  dd.setDifficulty(-1); // 负数
  T.eq(dd.baseDifficulty, 0, '负数保持0');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - reset');
{
  const dd = new DynamicDifficulty();
  dd.recordWin();
  dd.recordWin();
  dd.recordWin();
  T.eq(dd.baseDifficulty, 2, '连胜后难度=2');
  dd.reset();
  T.eq(dd.winStreak, 0, 'reset后连胜=0');
  T.eq(dd.loseStreak, 0, 'reset后连败=0');
  T.eq(dd.baseDifficulty, 1, 'reset后难度=1');
}

// ============================================================
console.log('\n[Test] DynamicDifficulty - 渐进式难度变化');
{
  // 模拟真实场景: 连输2局 → 赢1局 → 再输2局
  const dd = new DynamicDifficulty();
  dd.recordLoss(); dd.recordLoss(); // 连败2局
  T.eq(dd.baseDifficulty, 1, '连败2局难度仍为1');
  T.eq(dd.loseStreak, 2, '连败2局');
  
  dd.recordWin(); // 赢1局重置
  T.eq(dd.loseStreak, 0, '赢1局重置连败');
  T.eq(dd.winStreak, 1, '连胜1');
  T.eq(dd.baseDifficulty, 1, '难度仍为1');
  
  dd.recordLoss(); dd.recordLoss(); dd.recordLoss(); // 再连败3局
  T.eq(dd.baseDifficulty, 0, '再连败3局难度降为0');
}

const ok = T.done();
process.exit(ok ? 0 : 1);
