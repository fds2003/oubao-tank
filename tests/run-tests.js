// 测试运行器 - 非严格模式，模拟浏览器 <script> 标签加载
// Node.js 测试入口点

const fs = require('fs');
const vm = require('vm');

// 创建共享沙箱上下文（模拟浏览器全局作用域）
const sandbox = {
  console,
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  Date,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Infinity,
  NaN,
  Error,
  TypeError,
  RangeError,
  RegExp,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Symbol,
  Proxy,
  Reflect,
  Promise,
  // 模拟浏览器 API
  window: { addEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ width: 0, height: 0, getContext: () => ({}) }), addEventListener: () => {} },
  requestAnimationFrame: () => {},
  AudioContext: class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = 'running'; }
    createGain() { return { gain: { value: 0 }, connect: () => {} }; }
    createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    get sampleRate() { return 44100; }
  },
  localStorage: {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
    clear() { this._store = {}; }
  }
};

// 创建上下文
const context = vm.createContext(sandbox);

// 加载源文件
function loadSource(path) {
  const code = fs.readFileSync(path, 'utf8');
  vm.runInContext(code, context, { filename: path });
}

// 导出加载函数供测试文件使用
module.exports = { loadSource, context };

// 始终加载模块
loadSource('js/utils.js');
loadSource('js/audio.js');
loadSource('js/tutorial.js');
