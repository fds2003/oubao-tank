// tests/run-all-tests.js
const fs = require('fs');
const { spawn } = require('child_process');

const files = [
  'test-codriver.js',
  'test-gamepad.js',
  'test-physics.js',
  'test-tank-classes.js',
  'test-modes.js',
  'test-combos.js',
  'test-achievements.js',
  'test-leaderboard.js',
  'test-dynamic-difficulty.js',
  'test-newplayer-protection.js',
  'test-tutorial.js',
  'test-damage-flash.js',
  'test-tdd-bugfixes.js',
  'test-bgm.js',
  'test-optimization.js',
  'integration-test.js'
];

let totalPass = 0;
let totalFail = 0;
let completed = 0;

console.log('='.repeat(50));
console.log('      欧宝坦克大战 - 全量测试套件执行');
console.log('='.repeat(50));

function runNext() {
  if (completed >= files.length) {
    console.log('='.repeat(50));
    console.log(`执行总结: 总套件 ${files.length} | 通过: ${totalPass} | 失败: ${totalFail}`);
    console.log('='.repeat(50));
    process.exit(totalFail > 0 ? 1 : 0);
  }

  const file = files[completed];
  console.log(`\n[运行] ${file}`);

  const proc = spawn('node', ['tests/' + file], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });

  proc.on('close', (code) => {
    completed++;
    if (code === 0) {
      console.log('[✓ PASS] ' + file);
      totalPass++;
    } else {
      console.log('[✗ FAIL] ' + file + ' (exit code: ' + code + ')');
      totalFail++;
    }
    runNext();
  });
}

runNext();
