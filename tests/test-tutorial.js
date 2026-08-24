// 新手引导系统测试 - 通过 run-tests.js 加载模块
// 运行方式: node tests/run-tests.js && node tests/test-tutorial.js

const { context: ctx } = require('./run-tests.js');
const Tutorial = ctx.Tutorial;
const localStorage = ctx.localStorage;
const VIEW_W = ctx.VIEW_W;
const FONT = ctx.FONT;

// ============================================================
// 测试框架
// ============================================================
const T = {
  _p: 0, _f: 0,
  eq(a, b, m) { if (a === b) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}\n    Expected: ${JSON.stringify(b)}\n    Actual:   ${JSON.stringify(a)}`); } },
  ok(v, m) { if (v) { this._p++; console.log(`  ✓ ${m}`); } else { this._f++; console.error(`  ✗ ${m}`); } },
  done() { console.log(`\n${'='.repeat(50)}\nTests: ${this._p+this._f} | Passed: ${this._p} | Failed: ${this._f}\n${'='.repeat(50)}`); return this._f === 0; }
};

// ============================================================
// 1. 初始化
// ============================================================
console.log('\n[Test] Tutorial - 初始化');
{
  const t = new Tutorial();
  T.eq(t.state, 'idle', '初始状态 idle');
  T.eq(t.currentStep, 0, '初始步骤 0');
  T.eq(t.fadeAlpha, 0, '初始透明度 0');
  T.eq(t.stepTimer, 0, '初始计时器 0');
  T.eq(t.autoAdvance, true, '自动前进 true');
  T.eq(t.stepDuration, 4, '步骤持续 4秒');
  T.ok(Array.isArray(t.steps), 'steps 是数组');
  T.eq(t.steps.length, 5, '有 5 个步骤');
}

// ============================================================
// 2. 状态管理
// ============================================================
console.log('\n[Test] Tutorial - 状态管理');
{
  const t1 = new Tutorial(); t1.start();
  T.eq(t1.state, 'active', 'start() → active');
  t1.skip();
  T.eq(t1.state, 'skipped', 'skip() → skipped');

  const t2 = new Tutorial(); t2.start(); t2.complete();
  T.eq(t2.state, 'completed', 'complete() → completed');

  const t3 = new Tutorial(); t3.start(); t3.start();
  T.eq(t3.state, 'active', '重复 start() 不变');
}

// ============================================================
// 3. 步骤管理
// ============================================================
console.log('\n[Test] Tutorial - 步骤管理');
{
  const t = new Tutorial(); t.start();
  T.ok(t.getCurrentStep(), 'getCurrentStep() 返回对象');
  T.eq(t.getCurrentStep().id, 'mode_select', '第1步 mode_select');

  t.nextStep();
  T.eq(t.currentStep, 1, 'nextStep → 1');
  T.eq(t.getCurrentStep().id, 'map_select', '第2步 map_select');

  t.prevStep();
  T.eq(t.currentStep, 0, 'prevStep → 0');

  // 到最后完成
  const t2 = new Tutorial(); t2.start();
  for (let i = 0; i < 4; i++) t2.nextStep();
  T.eq(t2.currentStep, 4, '最后一步索引 4');
  t2.nextStep();
  T.eq(t2.state, 'completed', '最后一步 → completed');

  // 步骤内容
  const t3 = new Tutorial();
  T.ok(t3.steps[0].title, '步骤有 title');
  T.ok(t3.steps[0].description, '步骤有 description');
}

// ============================================================
// 4. 持久化
// ============================================================
console.log('\n[Test] Tutorial - 持久化');
{
  localStorage.clear();
  T.eq(Tutorial.shouldShow(), true, '首次应显示');
  Tutorial.markCompleted();
  T.eq(Tutorial.shouldShow(), false, '完成后不再显示');
  Tutorial.reset();
  T.eq(Tutorial.shouldShow(), true, '重置后再次显示');

  const t = new Tutorial(); t.start(); t.skip();
  T.eq(Tutorial.shouldShow(), false, '跳过后不再显示');
  Tutorial.reset();
}

// ============================================================
// 5. 更新逻辑
// ============================================================
console.log('\n[Test] Tutorial - 更新');
{
  const t = new Tutorial();
  t.update(1);
  T.eq(t.fadeAlpha, 0, '未开始不变');

  t.start();
  t.update(0.2);
  T.ok(t.fadeAlpha > 0, '淡入增加');
  T.ok(t.fadeAlpha < 1, '0.2秒未到1');

  const s = t.currentStep;
  t.update(5);
  T.ok(t.currentStep > s, '超时自动前进');

  const t2 = new Tutorial(); t2.start();
  t2.autoAdvance = false;
  t2.update(10);
  T.eq(t2.currentStep, 0, '禁用自动不前进');
}

// ============================================================
// 6. 输入处理
// ============================================================
console.log('\n[Test] Tutorial - 输入');
{
  const t = new Tutorial(); t.start();
  t.handleInput('Escape');
  T.eq(t.state, 'skipped', 'Escape → skip');

  const t2 = new Tutorial(); t2.start();
  t2.handleInput('Space');
  T.eq(t2.currentStep, 1, 'Space → next');

  t2.skip();
  t2.handleInput('Space');
  T.eq(t2.state, 'skipped', '非活跃不响应');
}

// ============================================================
const ok = T.done();
process.exit(ok ? 0 : 1);
