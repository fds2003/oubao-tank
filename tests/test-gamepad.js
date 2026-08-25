// tests/test-gamepad.js
// HTML5 Gamepad 原生手柄支持测试套件

const fs = require('fs');
const vm = require('vm');

const mockCtx = {
  save(){}, restore(){}, translate(){}, rotate(){}, fillRect(){},
  fill(){}, stroke(){}, beginPath(){}, arc(){}, arcTo(){}, moveTo(){},
  lineTo(){}, closePath(){}, scale(){}, setLineDash(){}, quadraticCurveTo(){},
  setTransform(){}, clip(){}, strokeRect(){}, fillText(){}, rect(){},
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => ({ addColorStop(){} }),
  createRadialGradient: () => ({ addColorStop(){} })
};

// 模拟手柄设备
let mockGamepads = [];

const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date, Set, Map,
  setTimeout, setInterval, clearTimeout, clearInterval,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  get mockGamepads() { return mockGamepads; },
  set mockGamepads(v) { mockGamepads = v; },
  navigator: {
    getGamepads: () => mockGamepads
  },
  document: { getElementById: () => ({ width: 1600, height: 900, getContext: () => mockCtx }), addEventListener: () => {} },
  AudioContext: class { constructor(){this.state='running';this.currentTime=0;this.destination={};} resume(){} createGain(){return{gain:{value:0},connect:()=>{}}} createOscillator(){return{type:'',frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},start:()=>{},stop:()=>{}}} get sampleRate(){return 44100} },
  localStorage: { _store:{}, getItem(k){return this._store[k]||null}, setItem(k,v){this._store[k]=String(v)}, removeItem(k){delete this._store[k]}, clear(){this._store = {}} },
  requestAnimationFrame: () => {}
};

const ctx = vm.createContext(sandbox);

// 按顺序载入全部游戏模块
[
  'js/utils.js','js/audio.js','js/tutorial.js','js/dynamic-difficulty.js',
  'js/achievements.js','js/leaderboard.js','js/combos.js','js/bgm.js',
  'js/physics.js','js/modes.js','js/tank-classes.js','js/input.js',
  'js/maps.js','js/world.js','js/particles.js','js/powerup.js',
  'js/bullet.js','js/ai.js','js/tank.js','js/game.js'
].forEach(p => {
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
});

const TEST_RUNNER = `
'use strict';
const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  near(a, b, eps = 0.001, msg = '') { this.ok(Math.abs(a - b) <= eps, (msg || 'near') + ' (' + a + ' ≈ ' + b + ')'); },
  summary() {
    console.log('\\n' + '='.repeat(50));
    console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail);
    console.log('='.repeat(50));
    return this._fail;
  }
};

function createMockGamepad(id = 0) {
  return {
    index: id,
    connected: true,
    axes: [0, 0, 0, 0], // [LX, LY, RX, RY]
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    vibrationActuator: {
      playEffect(type, params) {
        this.lastEffect = { type, params };
        return Promise.resolve('complete');
      }
    }
  };
}

console.log('\\n[Test 1] Input 模块 Gamepad 接口存在性');
T.ok(typeof Input.pollGamepad === 'function', 'Input 存在 pollGamepad 方法');
T.ok(typeof Input.getGamepadDir === 'function', 'Input 存在 getGamepadDir 方法');
T.ok(typeof Input.getGamepadFire === 'function', 'Input 存在 getGamepadFire 方法');
T.ok(typeof Input.vibrate === 'function', 'Input 存在 vibrate 震动方法');

console.log('\\n[Test 2] 手柄未连接时的静默与零干扰');
mockGamepads = [];
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), null, '无手柄连接时移动方向为 null');
T.eq(Input.getGamepadFire(0), false, '无手柄连接时开火为 false');
T.eq(Input.getGamepadAimAngle(0), null, '无手柄连接时瞄准角为 null');

console.log('\\n[Test 3] 摇杆死区过滤（CONFIG.GAMEPAD_DEADZONE = 0.25）');
T.eq(CONFIG.GAMEPAD_DEADZONE, 0.25, 'CONFIG 存在 GAMEPAD_DEADZONE 配置项');
const pad0 = createMockGamepad(0);
mockGamepads = [pad0];
pad0.axes[0] = 0.15; // 低于死区 0.25
pad0.axes[1] = -0.10;
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), null, '低于死区阈值（0.25）不触发移动方向');

console.log('\\n[Test 4] 左摇杆与十字键方向映射');
pad0.axes[0] = 0.8; pad0.axes[1] = 0; // 右推
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), 'right', '左摇杆右推正确解析为 right');

pad0.axes[0] = 0; pad0.axes[1] = -0.9; // 上推
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), 'up', '左摇杆上推正确解析为 up');

// 十字键 (D-pad: 12=Up, 13=Down, 14=Left, 15=Right)
pad0.axes[0] = 0; pad0.axes[1] = 0;
pad0.buttons[14].pressed = true; // D-pad Left
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), 'left', '十字键左键正确解析为 left');
pad0.buttons[14].pressed = false;

console.log('\\n[Test 5] 手柄开火按键支持（A键 / X键 / RB / RT）');
pad0.buttons[0].pressed = true; // Button A
Input.pollGamepad();
T.eq(Input.getGamepadFire(0), true, '按手柄 A 键触发开火');
pad0.buttons[0].pressed = false;

pad0.buttons[7].pressed = true; // RT
Input.pollGamepad();
T.eq(Input.getGamepadFire(0), true, '按手柄 RT 扳机键触发开火');
pad0.buttons[7].pressed = false;

console.log('\\n[Test 6] 右摇杆 360 度瞄准角度解析');
pad0.axes[2] = 0.707; pad0.axes[3] = 0.707; // 45度
Input.pollGamepad();
const aimAngle = Input.getGamepadAimAngle(0);
T.ok(aimAngle !== null, '右摇杆推移解析出瞄准角度');
T.near(aimAngle, Math.PI / 4, 0.05, '右摇杆解析出的角度符合向量方向 (45°)');

console.log('\\n[Test 7] 双手柄多玩家独立路由（Gamepad 0 -> P1, Gamepad 1 -> P2）');
const pad1 = createMockGamepad(1);
mockGamepads = [pad0, pad1];
pad0.axes[0] = -0.8; // P1 向左
pad1.axes[0] = 0.8;  // P2 向右
pad1.buttons[0].pressed = true; // P2 开火
Input.pollGamepad();
T.eq(Input.getGamepadDir(0), 'left', 'Gamepad 0 独立控制 P1 方向');
T.eq(Input.getGamepadDir(1), 'right', 'Gamepad 1 独立控制 P2 方向');
T.eq(Input.getGamepadFire(0), false, 'P1 未开火');
T.eq(Input.getGamepadFire(1), true, 'Gamepad 1 触发 P2 开火');

console.log('\\n[Test 8] 手柄热插拔测试（连接 -> 断开 -> 重新连接）');
mockGamepads = [pad0];
Input.pollGamepad();
T.eq(Input.gamepads[0].connected, true, '初始连接成功: connected=true');

mockGamepads = []; // 拔出手柄
Input.pollGamepad();
T.eq(Input.gamepads[0].connected, false, '拔出手柄后: connected=false');
T.eq(Input.getGamepadDir(0), null, '拔出后 getGamepadDir 返回 null');

mockGamepads = [pad0]; // 重新插入
Input.pollGamepad();
T.eq(Input.gamepads[0].connected, true, '重新插入手柄后: connected=true');

console.log('\\n[Test 9] 特殊模式手柄支持 (基地战/护送战/车长同乘)');
const gameInstance = new Game(document.getElementById('game').getContext(), 1);

// 基地战
gameInstance.gameMode = 3;
gameInstance.startMatch(0);
T.eq(gameInstance.gameMode, 3, '基地战正常启动');
pad0.axes[0] = 0.8;
Input.pollGamepad();
gameInstance.tanks[0].update(0.016);
T.eq(gameInstance.tanks[0].dirKey, 'right', '基地战响应手柄移动');

// 护送战
gameInstance.gameMode = 4;
gameInstance.startMatch(0);
T.eq(gameInstance.gameMode, 4, '护送战正常启动');
pad0.buttons[0].pressed = true;
Input.pollGamepad();
gameInstance.tanks[0].update(0.016);
T.ok(gameInstance.bullets.length > 0, '护送战响应手柄开火');
pad0.buttons[0].pressed = false;

// 车长同乘
gameInstance.gameMode = 5;
gameInstance.startMatch(0);
T.eq(gameInstance.gameMode, 5, '同乘模式正常启动');
pad0.axes[2] = 0; pad0.axes[3] = 1; // 右摇杆向下
Input.pollGamepad();
gameInstance.tanks[0].update(0.016);
T.near(gameInstance.tanks[0].turretAngle, Math.PI / 2, 0.05, '同乘模式下右摇杆控制炮塔朝下');

console.log('\\n[Test 10] 触觉震动与全循环稳定性');
Input.vibrate(0, 150, 0.3, 0.6);
T.ok(pad0.vibrationActuator.lastEffect, '成功向手柄发送震动指令');
T.eq(pad0.vibrationActuator.lastEffect.type, 'dual-rumble', '震动类型为 dual-rumble');

let runError = null;
try {
  for (let i = 0; i < 150; i++) {
    Input.pollGamepad();
    gameInstance.update(0.016);
    gameInstance.draw();
  }
} catch (e) {
  runError = e;
}
T.ok(!runError, '手柄连线状态下对局运行 150 帧无崩溃: ' + (runError ? runError.message : ''));

globalThis.__failCount = T.summary();
`;

vm.runInContext(TEST_RUNNER, ctx);
const failCount = vm.runInContext('globalThis.__failCount', ctx);
process.exit(failCount > 0 ? 1 : 0);
