// tests/test-bgm.js
// 背景音乐系统测试用例

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/bgm.js', 'utf8');
const ctx = vm.createContext({ AudioContext: function(){} });
vm.runInContext(code, ctx);
const { BGM } = ctx;

console.log('\n[Test] BGM - 初始化');
const bgm = new BGM();
T.eq(bgm.currentTrack, null, '初始无当前曲目');
T.eq(bgm.isPlaying, false, '初始未播放');
T.eq(bgm.volume, 0.3, '初始音量0.3');

console.log('\n[Test] BGM - 曲目定义');
T.ok(bgm.tracks.menu, '有menu曲目');
T.ok(bgm.tracks.battle, '有battle曲目');
T.ok(bgm.tracks.victory, '有victory曲目');
T.ok(bgm.tracks.menu.notes, 'menu有音符数据');
T.ok(bgm.tracks.menu.bpm, 'menu有BPM');

console.log('\n[Test] BGM - 播放控制');
const bgm2 = new BGM();
bgm2.play('menu');
T.eq(bgm2.currentTrack, 'menu', '当前曲目=menu');
T.eq(bgm2.isPlaying, true, '正在播放');

bgm2.stop();
T.eq(bgm2.isPlaying, false, '停止后未播放');

console.log('\n[Test] BGM - 切换曲目');
const bgm3 = new BGM();
bgm3.play('menu');
bgm3.play('battle');
T.eq(bgm3.currentTrack, 'battle', '切换到battle');

console.log('\n[Test] BGM - 音量控制');
const bgm4 = new BGM();
bgm4.setVolume(0.5);
T.eq(bgm4.volume, 0.5, '音量设置为0.5');
bgm4.setVolume(1.5);
T.eq(bgm4.volume, 1.0, '音量上限1.0');
bgm4.setVolume(-0.1);
T.eq(bgm4.volume, 0, '音量下限0');

console.log('\n[Test] BGM - 静音');
const bgm5 = new BGM();
bgm5.mute();
T.eq(bgm5.muted, true, '静音后muted=true');
bgm5.unmute();
T.eq(bgm5.muted, false, '取消静音后muted=false');

console.log('\n[Test] BGM - 状态查询');
const bgm6 = new BGM();
T.eq(bgm6.getState(), 'stopped', '初始状态=stopped');
bgm6.play('battle');
T.eq(bgm6.getState(), 'playing', '播放状态=playing');

console.log('\n[Test] BGM - 暂停/恢复');
const bgm7 = new BGM();
bgm7.play('menu');
bgm7.pause();
T.eq(bgm7.getState(), 'paused', '暂停状态=paused');
bgm7.resume();
T.eq(bgm7.getState(), 'playing', '恢复状态=playing');

T.summary();
