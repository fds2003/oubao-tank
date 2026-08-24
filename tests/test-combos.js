// tests/test-combos.js
// 道具组合系统测试用例

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/combos.js', 'utf8');
const ctx = vm.createContext({ CONFIG: { POWERUP_DURATION: 8 } });
vm.runInContext(code, ctx);
const { ComboSystem } = ctx;

console.log('\n[Test] ComboSystem - 初始化');
const cs = new ComboSystem();
T.eq(cs.activeCombos.length, 0, '初始无激活组合');

console.log('\n[Test] ComboSystem - 组合定义完整性');
T.ok(cs.combos.length >= 4, '至少4个组合');
const names = cs.combos.map(c => c.name);
T.ok(names.indexOf('闪电战') !== -1, '有闪电战组合');
T.ok(names.indexOf('Boss模式') !== -1, '有Boss模式组合');
T.ok(names.indexOf('幽灵战') !== -1, '有幽灵战组合');
T.ok(names.indexOf('冰火两重天') !== -1, '有冰火两重天组合');

console.log('\n[Test] ComboSystem - 闪电战（疾速+连发）');
const cs2 = new ComboSystem();
cs2.addBuff('speed', 8);
T.eq(cs2.activeCombos.length, 0, '只有疾速不触发');
cs2.addBuff('rapid', 8);
T.eq(cs2.activeCombos.length, 1, '疾速+连发触发闪电战');
T.eq(cs2.activeCombos[0].name, '闪电战', '组合名称正确');

console.log('\n[Test] ComboSystem - Boss模式（巨型+重炮）');
const cs3 = new ComboSystem();
cs3.addBuff('mega', 10);
cs3.addBuff('power', 8);
T.eq(cs3.activeCombos.length, 1, '巨型+重炮触发Boss模式');
T.eq(cs3.activeCombos[0].name, 'Boss模式', '组合名称正确');

console.log('\n[Test] ComboSystem - 幽灵战（穿墙+散射）');
const cs4 = new ComboSystem();
cs4.addBuff('ghost', 8);
cs4.addBuff('scatter', 8);
T.eq(cs4.activeCombos.length, 1, '穿墙+散射触发幽灵战');
T.eq(cs4.activeCombos[0].name, '幽灵战', '组合名称正确');

console.log('\n[Test] ComboSystem - 冰火两重天（冰冻+重炮）');
const cs5 = new ComboSystem();
cs5.addBuff('freeze', 2.2);
cs5.addBuff('power', 8);
T.eq(cs5.activeCombos.length, 1, '冰冻+重炮触发冰火两重天');
T.eq(cs5.activeCombos[0].name, '冰火两重天', '组合名称正确');

console.log('\n[Test] ComboSystem - buff移除后组合消失');
const cs6 = new ComboSystem();
cs6.addBuff('speed', 8);
cs6.addBuff('rapid', 8);
T.eq(cs6.activeCombos.length, 1, '闪电战已激活');
cs6.removeBuff('speed');
T.eq(cs6.activeCombos.length, 0, '移除疾速后组合消失');

console.log('\n[Test] ComboSystem - 获取组合效果');
const cs7 = new ComboSystem();
cs7.addBuff('speed', 8);
cs7.addBuff('rapid', 8);
const effect = cs7.getEffect('lightning');
T.ok(effect, 'getEffect返回效果');
T.ok(effect.damageMultiplier >= 1, '伤害倍率>=1');
T.ok(effect.speedMultiplier >= 1, '速度倍率>=1');

console.log('\n[Test] ComboSystem - 多组合同时激活');
const cs8 = new ComboSystem();
cs8.addBuff('speed', 8);
cs8.addBuff('rapid', 8);
cs8.addBuff('ghost', 8);
cs8.addBuff('scatter', 8);
T.eq(cs8.activeCombos.length, 2, '同时激活2个组合');

console.log('\n[Test] ComboSystem - 获取所有激活组合名称');
const cs9 = new ComboSystem();
cs9.addBuff('mega', 10);
cs9.addBuff('power', 8);
const comboNames = cs9.getActiveComboNames();
T.eq(comboNames.length, 1, '1个激活组合');
T.eq(comboNames[0], 'Boss模式', '名称正确');

T.summary();
