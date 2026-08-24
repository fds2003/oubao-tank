// tests/test-physics.js
// 跳弹+弱点物理系统测试用例

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  approx(a, b, msg, eps = 0.5) { this.ok(Math.abs(a - b) < eps, msg + ' (' + a + ' ≈ ' + b + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/physics.js', 'utf8');
const ctx = vm.createContext({ Math: Math });
vm.runInContext(code, ctx);
const { Physics } = ctx;

console.log('\n[Test] Physics - 初始化');
const ph = new Physics();
T.ok(ph, 'Physics对象创建成功');
T.eq(ph.RICOCHET_ANGLE, 65, '跳弹角度=65°');
T.eq(ph.RICOCHET_DMG_MULT, 0.3, '跳弹伤害倍率=0.3');
T.eq(ph.BACK_HIT_MULT, 1.5, '背部暴击倍率=1.5');
T.eq(ph.TRACK_STUN_CHANCE, 0.3, '断履带概率=30%');
T.eq(ph.TRACK_STUN_DUR, 1.5, '断履带持续1.5秒');

console.log('\n[Test] Physics - 计算入射角度');
// 正面：坦克朝右，子弹从右来 → 0°
T.approx(ph.getImpactAngle({x:0,y:0,face:'right'}, {x:10,y:0}), 0, '正面入射0°');
// 背面：坦克朝右，子弹从左来 → 180°
T.approx(ph.getImpactAngle({x:0,y:0,face:'right'}, {x:-10,y:0}), 180, '背面入射180°');
// 侧面：坦克朝右，子弹从上/下来 → 90°
T.approx(ph.getImpactAngle({x:0,y:0,face:'right'}, {x:0,y:10}), 90, '侧面入射90°');

console.log('\n[Test] Physics - 跳弹判定');
T.ok(ph.shouldRicochet(70), '70°触发跳弹');
T.ok(ph.shouldRicochet(90), '90°触发跳弹');
T.ok(!ph.shouldRicochet(60), '60°不触发跳弹');
T.ok(!ph.shouldRicochet(30), '30°不触发跳弹');
T.ok(!ph.shouldRicochet(65), '65°边界不触发跳弹');

console.log('\n[Test] Physics - 计算跳弹伤害');
T.approx(ph.getRicochetDamage(40), 12, '40伤害跳弹后=12');
T.approx(ph.getRicochetDamage(60), 18, '60伤害跳弹后=18');
T.approx(ph.getRicochetDamage(100), 30, '100伤害跳弹后=30');

console.log('\n[Test] Physics - 跳弹方向');
const ricochet1 = ph.getRicochetDir({x:1,y:0}, {x:0,y:-1});
T.ok(ricochet1.x !== undefined, '跳弹方向有x');
T.ok(ricochet1.y !== undefined, '跳弹方向有y');

console.log('\n[Test] Physics - 弱点判定');
T.ok(ph.isBackHit({x:0,y:0,face:'right'}, {x:-5,y:0}), '背后5像素=背部');
T.ok(!ph.isBackHit({x:0,y:0,face:'right'}, {x:5,y:0}), '前面5像素≠背部');
T.ok(!ph.isBackHit({x:0,y:0,face:'right'}, {x:0,y:5}), '侧面≠背部');
T.ok(ph.isBackHit({x:0,y:0,face:'left'}, {x:5,y:0}), '朝左时右边=背部');
T.ok(ph.isBackHit({x:0,y:0,face:'up'}, {x:0,y:5}), '朝上时下面=背部');
T.ok(ph.isBackHit({x:0,y:0,face:'down'}, {x:0,y:-5}), '朝下时上面=背部');

console.log('\n[Test] Physics - 背部暴击伤害');
T.approx(ph.getBackHitDamage(40), 60, '40伤害背部暴击=60');
T.approx(ph.getBackHitDamage(60), 90, '60伤害背部暴击=90');

console.log('\n[Test] Physics - 侧面履带判定');
T.ok(ph.isTrackHit({x:0,y:0,face:'right'}, {x:0,y:5}), '右侧=履带');
T.ok(ph.isTrackHit({x:0,y:0,face:'right'}, {x:0,y:-5}), '左侧=履带');
T.ok(!ph.isTrackHit({x:0,y:0,face:'right'}, {x:5,y:0}), '前面≠履带');
T.ok(!ph.isTrackHit({x:0,y:0,face:'right'}, {x:-5,y:0}), '后面≠履带');

console.log('\n[Test] Physics - 侧面履带触发概率');
let trackHits = 0;
for (let i = 0; i < 1000; i++) {
  if (ph.checkTrackStun()) trackHits++;
}
T.ok(trackHits > 200 && trackHits < 400, '履带触发概率约30% (' + trackHits + '/1000)');

console.log('\n[Test] Physics - 综合伤害计算');
// 正面普通命中
const normal = ph.calculateDamage({x:0,y:0,face:'right'}, {x:10,y:0}, 40);
T.eq(normal.damage, 40, '正面普通=40');
T.eq(normal.isRicochet, false, '正面不跳弹');
T.eq(normal.isBackHit, false, '正面不暴击');

// 背面命中
const backHit = ph.calculateDamage({x:0,y:0,face:'right'}, {x:-10,y:0}, 40);
T.approx(backHit.damage, 60, '背面暴击=60');
T.eq(backHit.isBackHit, true, '是背部命中');

// 大角度跳弹
const ricochet = ph.calculateDamage({x:0,y:0,face:'right'}, {x:0,y:10}, 40);
T.approx(ricochet.damage, 12, '大角度跳弹=12');
T.eq(ricochet.isRicochet, true, '是跳弹');

T.summary();
