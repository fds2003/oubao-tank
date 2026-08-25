// tests/setup.js — vm 沙箱 + 全模块加载（供 integration-test.js 使用）
'use strict';
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  console, Math, JSON, Array, Object, String, Number, Date,
  setTimeout, setInterval, clearTimeout, clearInterval,
  parseInt, parseFloat, isNaN, isFinite, Infinity, NaN,
  Error, TypeError, RangeError, RegExp, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Promise,
  window: { addEventListener: () => {}, devicePixelRatio: 1 },
  document: { getElementById: () => ({ width: 0, height: 0, getContext: () => ({}) }), addEventListener: () => {} },
  requestAnimationFrame: () => {},
  AudioContext: class { constructor(){this.state='running';this.currentTime=0;this.destination={};} resume(){} createGain(){return{gain:{value:0},connect:()=>{}}} createOscillator(){return{type:'',frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{},start:()=>{},stop:()=>{}}} get sampleRate(){return 44100} },
  localStorage: { _store:{}, getItem(k){return this._store[k]||null}, setItem(k,v){this._store[k]=String(v)}, removeItem(k){delete this._store[k]}, clear(){this._store={}} }
};

const ctx = vm.createContext(sandbox);

// 按 index.html 的实际加载顺序载入全部游戏模块
[
  'js/utils.js','js/audio.js','js/tutorial.js','js/dynamic-difficulty.js',
  'js/achievements.js','js/leaderboard.js','js/combos.js','js/bgm.js',
  'js/physics.js','js/modes.js','js/tank-classes.js','js/input.js',
  'js/maps.js','js/world.js','js/particles.js','js/powerup.js',
  'js/bullet.js','js/ai.js','js/tank.js','js/game.js'
].forEach(p => {
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
});

module.exports = { ctx, sandbox };
