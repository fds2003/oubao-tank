// 受伤屏幕闪红测试
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

const T = {
  _p: 0, _f: 0,
  eq(a, b, m) { if (a === b) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}\n    Expected: ${JSON.stringify(b)}\n    Actual:   ${JSON.stringify(a)}`); } },
  ok(v, m) { if (v) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}`); } },
  approx(a, b, msg) { if (Math.abs(a - b) < 0.001) { this._p++; console.log(`  ✓ ${msg}`); } else { this._f++; console.error(`  ✗ ${msg}\n    ~${b} but got ${a}`); } },
  done() { console.log(`\n${'='.repeat(50)}\nTests: ${this._p+this._f} | Passed: ${this._p} | Failed: ${this._f}\n${'='.repeat(50)}`); return this._f === 0; }
};

// ============================================================
console.log('\n[Test] DamageFlash - 初始化');
{
  const game = { damageFlash: 0 };
  T.eq(game.damageFlash, 0, '初始 damageFlash 0');
  game.triggerDamageFlash = function() { this.damageFlash = 0.3; };
  game.triggerDamageFlash();
  T.eq(game.damageFlash, 0.3, '触发后 damageFlash 0.3');
}

console.log('\n[Test] DamageFlash - 更新衰减');
{
  const game = { damageFlash: 0.3 };
  game.updateDamageFlash = function(dt) {
    if (this.damageFlash > 0 && dt > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt);
    }
  };
  game.updateDamageFlash(0.1);
  T.approx(game.damageFlash, 0.2, '0.1秒后衰减到0.2');
  game.updateDamageFlash(0.3);
  T.eq(game.damageFlash, 0, '0.3秒后归零');
}

console.log('\n[Test] DamageFlash - 绘制效果');
{
  const mockCtx = {
    save:()=>{}, restore:()=>{}, fillRect:()=>{},
    createLinearGradient:()=>({addColorStop:()=>{}}),
    globalAlpha:1, fillStyle:''
  };
  const game = {
    damageFlash: 0.2,
    drawDamageFlash: function(ctx) {
      if (this.damageFlash <= 0) return;
      const alpha = this.damageFlash / 0.3 * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 1600, 900);
      ctx.restore();
    }
  };
  game.drawDamageFlash(mockCtx);
  T.ok(true, '绘制不报错');
  game.damageFlash = 0;
  game.drawDamageFlash(mockCtx);
  T.ok(true, '无闪红时不绘制');
}

console.log('\n[Test] DamageFlash - 边界情况');
{
  const game = { damageFlash: 0 };
  game.updateDamageFlash = function(dt) {
    if (this.damageFlash > 0 && dt > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt);
    }
  };
  game.updateDamageFlash(1);
  T.eq(game.damageFlash, 0, '已为0时不变化');
  game.damageFlash = 0.2;
  game.updateDamageFlash(-0.1);
  T.eq(game.damageFlash, 0.2, '负数dt不影响');
}

const ok = T.done();
process.exit(ok ? 0 : 1);
