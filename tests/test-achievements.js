// tests/test-achievements.js
// 成就系统测试用例

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  neq(a, b, msg) { this.ok(a !== b, msg); },
  approx(a, b, msg, eps = 0.5) { this.ok(Math.abs(a - b) < eps, msg + ' (' + a + ' ≈ ' + b + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

// Load achievements module
const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/achievements.js', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const { AchievementSystem } = ctx;

console.log('\n[Test] AchievementSystem - 初始化');
const as = new AchievementSystem();
T.eq(as.unlocked.length, 0, '初始无解锁成就');
T.eq(as.stats.totalGames, 0, '初始游戏数0');
T.eq(as.stats.totalWins, 0, '初始胜场0');
T.eq(as.stats.bestWinStreak, 0, '初始最高连胜0');
T.eq(as.stats.bestAccuracy, 0, '初始最高命中率0');

console.log('\n[Test] AchievementSystem - 成就定义完整性');
T.ok(as.achievements.length >= 10, '至少10个成就');
const ids = as.achievements.map(a => a.id);
T.ok(ids.includes('first_win'), '有first_win成就');
T.ok(ids.includes('win_streak_3'), '有win_streak_3成就');
T.ok(ids.includes('accuracy_80'), '有accuracy_80成就');
T.ok(ids.includes('survivor'), '有survivor成就');
T.ok(ids.includes('power_master'), '有power_master成就');
T.ok(ids.includes('tank_killer'), '有tank_killer成就');

console.log('\n[Test] AchievementSystem - 初次胜利');
as.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: ['shield'] });
T.eq(as.stats.totalGames, 1, '游戏数+1');
T.eq(as.stats.totalWins, 1, '胜场+1');
T.ok(as.isUnlocked('first_win'), '解锁first_win');

console.log('\n[Test] AchievementSystem - 连胜成就');
as2 = new AchievementSystem();
as2.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [] });
as2.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [] });
as2.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [] });
T.ok(as2.isUnlocked('win_streak_3'), '连胜3局解锁win_streak_3');
T.eq(as2.stats.bestWinStreak, 3, '最高连胜=3');

console.log('\n[Test] AchievementSystem - 精准射手');
const as3 = new AchievementSystem();
as3.recordGame({ won: true, shots: 10, hits: 9, killed: 2, survived: true, powerups: [] });
T.ok(as3.isUnlocked('accuracy_80'), '命中率90%解锁accuracy_80');
T.ok(as3.stats.bestAccuracy >= 0.8, '最高命中率>=80%');

console.log('\n[Test] AchievementSystem - 生存专家');
const as4 = new AchievementSystem();
as4.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [] });
T.ok(as4.isUnlocked('survivor'), '存活胜利解锁survivor');

console.log('\n[Test] AchievementSystem - 坦克杀手');
const as5 = new AchievementSystem();
as5.recordGame({ won: true, shots: 50, hits: 40, killed: 10, survived: true, powerups: [] });
T.ok(as5.isUnlocked('tank_killer'), '击杀10个AI解锁tank_killer');

console.log('\n[Test] AchievementSystem - 道具大师');
const as6 = new AchievementSystem();
as6.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: ['shield','speed','heal','rapid','freeze','power','ghost','mine','mega','scatter','emp'] });
T.ok(as6.isUnlocked('power_master'), '拾取所有11种道具解锁power_master');

console.log('\n[Test] AchievementSystem - 绝地反击');
const as7 = new AchievementSystem();
as7.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [], lastHp: 1 });
T.ok(as7.isUnlocked('close_call'), '1HP反杀解锁close_call');

console.log('\n[Test] AchievementSystem - 马拉松');
const as8 = new AchievementSystem();
for (let i = 0; i < 10; i++) as8.recordGame({ won: i % 2 === 0, shots: 10, hits: 5, killed: 2, survived: true, powerups: [] });
T.ok(as8.isUnlocked('marathon'), '游玩10局解锁marathon');

console.log('\n[Test] AchievementSystem - 最佳拍档');
const as9 = new AchievementSystem();
as9.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: [], coop: true });
T.ok(as9.isUnlocked('teamwork'), '协作模式胜利解锁teamwork');

console.log('\n[Test] AchievementSystem - 持久化');
const as10 = new AchievementSystem();
as10.recordGame({ won: true, shots: 10, hits: 5, killed: 2, survived: true, powerups: ['shield'] });
const data = as10.export();
const as11 = new AchievementSystem();
as11.import(data);
T.ok(as11.isUnlocked('first_win'), '导入后first_win仍解锁');
T.eq(as11.stats.totalGames, 1, '导入后游戏数正确');

console.log('\n[Test] AchievementSystem - 获取未解锁成就');
const as12 = new AchievementSystem();
const locked = as12.getLocked();
T.eq(locked.length, as12.achievements.length, '未解锁数=总数');
const unlocked = as12.getUnlocked();
T.eq(unlocked.length, 0, '已解锁数=0');

console.log('\n[Test] AchievementSystem - 获取成就详情');
const as13 = new AchievementSystem();
const detail = as13.getAchievement('first_win');
T.ok(detail, 'getAchievement返回对象');
T.eq(detail.id, 'first_win', 'id正确');
T.ok(detail.name, '有名称');
T.ok(detail.desc, '有描述');
T.ok(detail.icon, '有图标');

T.summary();
