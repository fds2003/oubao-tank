// tests/test-leaderboard.js
// 家庭排行榜测试用例

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/leaderboard.js', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const { Leaderboard } = ctx;

console.log('\n[Test] Leaderboard - 初始化');
const lb = new Leaderboard();
T.eq(lb.players.length, 0, '初始无玩家');

console.log('\n[Test] Leaderboard - 添加玩家');
lb.addPlayer('小明', '👦');
T.eq(lb.players.length, 1, '添加1个玩家');
T.eq(lb.players[0].name, '小明', '玩家名正确');
T.eq(lb.players[0].avatar, '👦', '头像正确');
T.eq(lb.players[0].wins, 0, '初始胜场0');
T.eq(lb.players[0].games, 0, '初始局数0');
T.ok(lb.players[0].id, '有唯一ID');

console.log('\n[Test] Leaderboard - 添加多个玩家');
lb.addPlayer('爸爸', '👨');
lb.addPlayer('妈妈', '👩');
T.eq(lb.players.length, 3, '共3个玩家');

console.log('\n[Test] Leaderboard - 防重复添加');
lb.addPlayer('小明', '👦');
T.eq(lb.players.length, 3, '重复添加不增加');

console.log('\n[Test] Leaderboard - 记录游戏结果');
const p = lb.getPlayer(lb.players[0].id);
lb.recordResult(p.id, { won: true, kills: 3, accuracy: 0.75 });
T.eq(p.wins, 1, '胜场+1');
T.eq(p.games, 1, '局数+1');
T.eq(p.kills, 3, '击杀+3');
T.ok(p.bestAccuracy >= 0.75, '最高命中率更新');

console.log('\n[Test] Leaderboard - 输局记录');
lb.recordResult(p.id, { won: false, kills: 1, accuracy: 0.4 });
T.eq(p.wins, 1, '胜场不变');
T.eq(p.games, 2, '局数+2');
T.eq(p.kills, 4, '总击杀=4');

console.log('\n[Test] Leaderboard - 最高连胜');
lb2 = new Leaderboard();
lb2.addPlayer('测试', '🎮');
const p2 = lb2.getPlayer(lb2.players[0].id);
lb2.recordResult(p2.id, { won: true, kills: 2, accuracy: 0.6 });
lb2.recordResult(p2.id, { won: true, kills: 2, accuracy: 0.7 });
lb2.recordResult(p2.id, { won: false, kills: 1, accuracy: 0.5 });
lb2.recordResult(p2.id, { won: true, kills: 2, accuracy: 0.8 });
T.eq(p2.bestWinStreak, 2, '最高连胜=2');

console.log('\n[Test] Leaderboard - 排名排序');
const lb3 = new Leaderboard();
lb3.addPlayer('弱者', '🐢');
lb3.addPlayer('强者', '🦁');
const weak = lb3.getPlayer(lb3.players.find(p => p.name === '弱者').id);
const strong = lb3.getPlayer(lb3.players.find(p => p.name === '强者').id);
lb3.recordResult(weak.id, { won: true, kills: 1, accuracy: 0.3 });
lb3.recordResult(strong.id, { won: true, kills: 5, accuracy: 0.9 });
lb3.recordResult(strong.id, { won: true, kills: 3, accuracy: 0.8 });
const ranked = lb3.getRanked();
T.eq(ranked[0].name, '强者', '强者排第一');
T.eq(ranked[1].name, '弱者', '弱者排第二');

console.log('\n[Test] Leaderboard - 删除玩家');
lb3.removePlayer(weak.id);
T.eq(lb3.players.length, 1, '删除后剩1个玩家');

console.log('\n[Test] Leaderboard - 持久化');
const lb4 = new Leaderboard();
lb4.addPlayer('导出测试', '🎮');
lb4.recordResult(lb4.players[0].id, { won: true, kills: 5, accuracy: 0.9 });
const data = lb4.export();
const lb5 = new Leaderboard();
lb5.import(data);
T.eq(lb5.players.length, 1, '导入后1个玩家');
T.eq(lb5.players[0].wins, 1, '导入后胜场正确');
T.eq(lb5.players[0].kills, 5, '导入后击杀正确');

console.log('\n[Test] Leaderboard - 获取玩家');
const found = lb3.getPlayer(strong.id);
T.ok(found, '能找到玩家');
T.eq(found.name, '强者', '玩家名正确');

T.summary();
