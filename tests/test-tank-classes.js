// 车型系统测试
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
load('js/tank-classes.js');

const T = {
  _p: 0, _f: 0,
  eq(a, b, m) { if (a === b) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}\n    Expected: ${JSON.stringify(b)}\n    Actual:   ${JSON.stringify(a)}`); } },
  ok(v, m) { if (v) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}`); } },
  approx(a, b, msg) { if (Math.abs(a - b) < 0.01) { this._p++; console.log(`  ✓ ${msg}`); } else { this._f++; console.error(`  ✗ ${msg}\n    ~${b} but got ${a}`); } },
  done() { console.log(`\n${'='.repeat(50)}\nTests: ${this._p+this._f} | Passed: ${this._p} | Failed: ${this._f}\n${'='.repeat(50)}`); return this._f === 0; }
};

// ============================================================
console.log('\n[Test] TankClasses - 数据定义完整性');
{
  const TC = ctx.TANK_CLASSES;
  T.ok(TC.scout, '轻型坦克存在');
  T.ok(TC.medium, '中型坦克存在');
  T.ok(TC.heavy, '重型坦克存在');
  T.ok(TC.assault, '突击炮存在');
  T.eq(Object.keys(TC).length, 4, '共4种车型');
}

console.log('\n[Test] TankClasses - 轻型属性');
{
  const s = ctx.TANK_CLASSES.scout;
  T.eq(s.hp, 70, 'HP=70');
  T.eq(s.speed, 240, '速度=240');
  T.eq(s.damage, 25, '伤害=25');
  T.eq(s.cooldown, 0.3, '冷却=0.3');
  T.eq(s.scale, 0.85, '体型=0.85');
  T.eq(s.pierce, false, '不穿墙');
}

console.log('\n[Test] TankClasses - 中型属性');
{
  const m = ctx.TANK_CLASSES.medium;
  T.eq(m.hp, 100, 'HP=100');
  T.eq(m.speed, 180, '速度=180');
  T.eq(m.damage, 35, '伤害=35');
  T.eq(m.cooldown, 0.4, '冷却=0.4');
  T.eq(m.scale, 1.0, '体型=1.0');
  T.eq(m.pierce, false, '不穿墙');
}

console.log('\n[Test] TankClasses - 重型属性');
{
  const h = ctx.TANK_CLASSES.heavy;
  T.eq(h.hp, 150, 'HP=150');
  T.eq(h.speed, 140, '速度=140');
  T.eq(h.damage, 45, '伤害=45');
  T.eq(h.cooldown, 0.5, '冷却=0.5');
  T.eq(h.scale, 1.2, '体型=1.2');
  T.eq(h.pierce, false, '不穿墙');
}

console.log('\n[Test] TankClasses - 突击炮属性');
{
  const a = ctx.TANK_CLASSES.assault;
  T.eq(a.hp, 80, 'HP=80');
  T.eq(a.speed, 160, '速度=160');
  T.eq(a.damage, 60, '伤害=60');
  T.eq(a.cooldown, 0.8, '冷却=0.8');
  T.eq(a.scale, 1.0, '体型=1.0');
  T.eq(a.pierce, true, '穿墙=true');
}

console.log('\n[Test] TankClasses - DPS平衡性');
{
  const TC = ctx.TANK_CLASSES;
  const dps = (d, cd) => d / cd;
  
  const scoutDPS = dps(TC.scout.damage, TC.scout.cooldown);
  const mediumDPS = dps(TC.medium.damage, TC.medium.cooldown);
  const heavyDPS = dps(TC.heavy.damage, TC.heavy.cooldown);
  const assaultDPS = dps(TC.assault.damage, TC.assault.cooldown);
  
  T.approx(scoutDPS, 83.33, '轻型DPS≈83.3');
  T.approx(mediumDPS, 87.5, '中型DPS≈87.5');
  T.approx(heavyDPS, 90.0, '重型DPS≈90.0');
  T.approx(assaultDPS, 75.0, '突击炮DPS≈75.0');
  
  // 验证DPS范围合理（最高不超过最低的1.5倍）
  const maxDPS = Math.max(scoutDPS, mediumDPS, heavyDPS, assaultDPS);
  const minDPS = Math.min(scoutDPS, mediumDPS, heavyDPS, assaultDPS);
  T.ok(maxDPS / minDPS < 1.5, 'DPS差异在合理范围内');
}

console.log('\n[Test] TankClasses - 速度对比');
{
  const TC = ctx.TANK_CLASSES;
  T.ok(TC.scout.speed > TC.medium.speed, '轻型比中型快');
  T.ok(TC.medium.speed > TC.heavy.speed, '中型比重型快');
  T.ok(TC.assault.speed > TC.heavy.speed, '突击炮比重型快');
}

console.log('\n[Test] TankClasses - HP对比');
{
  const TC = ctx.TANK_CLASSES;
  T.ok(TC.heavy.hp > TC.medium.hp, '重型血量最高');
  T.ok(TC.medium.hp > TC.scout.hp, '中型血量高于轻型');
  T.ok(TC.medium.hp > TC.assault.hp, '中型血量高于突击炮');
}

console.log('\n[Test] TankClasses - 伤害对比');
{
  const TC = ctx.TANK_CLASSES;
  T.ok(TC.assault.damage > TC.heavy.damage, '突击炮伤害最高');
  T.ok(TC.heavy.damage > TC.medium.damage, '重型伤害高于中型');
  T.ok(TC.medium.damage > TC.scout.damage, '中型伤害高于轻型');
}

console.log('\n[Test] TankClasses - 穿墙能力');
{
  const TC = ctx.TANK_CLASSES;
  T.eq(TC.scout.pierce, false, '轻型不穿墙');
  T.eq(TC.medium.pierce, false, '中型不穿墙');
  T.eq(TC.heavy.pierce, false, '重型不穿墙');
  T.eq(TC.assault.pierce, true, '突击炮穿墙');
}

console.log('\n[Test] TankClasses - 默认车型');
{
  // 验证中型是默认车型
  const defaultClass = 'medium';
  T.eq(ctx.TANK_CLASSES[defaultClass].hp, 100, '默认车型HP=100');
  T.eq(ctx.TANK_CLASSES[defaultClass].speed, 180, '默认车型速度=180');
}

console.log('\n[Test] TankClasses - getTankClass辅助函数');
{
  T.eq(ctx.getTankClass('scout').hp, 70, '获取轻型');
  T.eq(ctx.getTankClass('heavy').hp, 150, '获取重型');
  T.eq(ctx.getTankClass('invalid').hp, 100, '无效车型返回中型');
  T.eq(ctx.getTankClass(undefined).hp, 100, 'undefined返回中型');
}

console.log('\n[Test] TankClasses - 车型列表');
{
  const classList = Object.keys(ctx.TANK_CLASSES);
  T.eq(classList.length, 4, '共4种车型');
  T.ok(classList.includes('scout'), '包含轻型');
  T.ok(classList.includes('medium'), '包含中型');
  T.ok(classList.includes('heavy'), '包含重型');
  T.ok(classList.includes('assault'), '包含突击炮');
}

console.log('\n[Test] TankClasses - AI选车逻辑');
{
  const easyClass = ctx.selectAITankClass('easy', 'medium');
  T.ok(['scout','medium','heavy','assault'].includes(easyClass), '简单AI返回有效车型');
  
  // 普通AI克制关系
  T.eq(ctx.selectAITankClass('normal', 'heavy'), 'assault', '普通AI对重型选突击炮');
  T.eq(ctx.selectAITankClass('normal', 'scout'), 'heavy', '普通AI对轻型选重型');
  T.eq(ctx.selectAITankClass('normal', 'assault'), 'scout', '普通AI对突击炮选轻型');
  
  // 困难AI克制关系
  T.eq(ctx.selectAITankClass('hard', 'heavy'), 'assault', '困难AI对重型选突击炮');
  T.eq(ctx.selectAITankClass('hard', 'scout'), 'heavy', '困难AI对轻型选重型');
  T.eq(ctx.selectAITankClass('hard', 'assault'), 'scout', '困难AI对突击炮选轻型');
  T.eq(ctx.selectAITankClass('hard', 'medium'), 'heavy', '困难AI对中型选重型');
}

const ok = T.done();
process.exit(ok ? 0 : 1);
