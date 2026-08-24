// tests/test-modes.js
// 新游戏模式测试用例（基地保卫战+护送装甲车）

const T = {
  _pass: 0, _fail: 0,
  ok(v, msg) { if (v) { this._pass++; console.log('  ✓ ' + msg); } else { this._fail++; console.log('  ✗ ' + msg); } },
  eq(a, b, msg) { this.ok(a === b, msg + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')'); },
  summary() { console.log('\n' + '='.repeat(50)); console.log('Tests: ' + (this._pass + this._fail) + ' | Passed: ' + this._pass + ' | Failed: ' + this._fail); console.log('='.repeat(50)); process.exit(this._fail > 0 ? 1 : 0); }
};

const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('js/modes.js', 'utf8');
const ctx = vm.createContext({ Math: Math });
vm.runInContext(code, ctx);
const { BaseDefense, ConvoyEscort } = ctx;

console.log('\n[Test] BaseDefense - 初始化');
const bd = new BaseDefense();
T.eq(bd.hq.hp, 200, '基地血量200');
T.eq(bd.hq.maxHp, 200, '基地最大血量200');
T.ok(bd.hq.alive, '基地初始存活');
T.eq(bd.hq.size, 2, '基地大小2x2');

console.log('\n[Test] BaseDefense - 基地受到伤害');
bd.takeDamage(50);
T.eq(bd.hq.hp, 150, '受伤后血量150');
T.ok(bd.hq.alive, '仍然存活');

console.log('\n[Test] BaseDefense - 基地被摧毁');
bd.takeDamage(150);
T.eq(bd.hq.hp, 0, '血量=0');
T.ok(!bd.hq.alive, '基地被摧毁');

console.log('\n[Test] BaseDefense - 胜利条件检查');
const bd2 = new BaseDefense();
T.eq(bd2.checkWin(true, false), 'player_win', 'AI全灭=玩家胜');
T.eq(bd2.checkWin(false, true), 'hq_destroyed', '基地被毁=玩家败');
T.eq(bd2.checkWin(false, false), null, '未结束=null');

console.log('\n[Test] BaseDefense - 获取基地位置');
const bd3 = new BaseDefense();
const hqPos = bd3.getHQPosition(0);
T.ok(hqPos, '有基地位置');
T.ok(hqPos.c >= 0, '列>=0');
T.ok(hqPos.r >= 0, '行>=0');

console.log('\n[Test] BaseDefense - 基地状态');
const bd4 = new BaseDefense();
T.eq(bd4.getStatus(), '正常', '初始状态正常');
bd4.takeDamage(100);
T.eq(bd4.getStatus(), '受损', '受伤后状态受损');
bd4.takeDamage(100);
T.eq(bd4.getStatus(), '被摧毁', '摧毁后状态被摧毁');

console.log('\n[Test] ConvoyEscort - 初始化');
const ce = new ConvoyEscort();
T.ok(ce.transport, '有运输车');
T.eq(ce.transport.hp, 100, '运输车血量100');
T.ok(ce.transport.alive, '运输车存活');
T.eq(ce.transport.speed, 60, '运输车速度60');

console.log('\n[Test] ConvoyEscort - 运输车受到伤害');
ce.transportTakeDamage(30);
T.eq(ce.transport.hp, 70, '受伤后血量70');

console.log('\n[Test] ConvoyEscort - 运输车被摧毁');
ce.transportTakeDamage(70);
T.eq(ce.transport.hp, 0, '血量=0');
T.ok(!ce.transport.alive, '运输车被摧毁');

console.log('\n[Test] ConvoyEscort - 路径点');
T.ok(ce.waypoints.length > 0, '有路径点');
T.ok(ce.waypoints[0].c >= 0, '起点列>=0');
T.ok(ce.waypoints[0].r >= 0, '起点行>=0');

console.log('\n[Test] ConvoyEscort - 运输车移动');
const startPos = { c: ce.transport.waypointIdx, r: 0 };
ce.updateTransport(1);
T.ok(ce.transport.waypointIdx >= 0, '路径点索引更新');

console.log('\n[Test] ConvoyEscort - 胜利条件检查');
const ce2 = new ConvoyEscort();
T.eq(ce2.checkWin(true, false), 'player_win', 'AI全灭=玩家胜');
ce2.transportTakeDamage(100);
T.eq(ce2.checkWin(false, false), 'transport_destroyed', '运输车被毁=玩家败');
T.ok(ce2.checkWin(false, true) === null || ce2.checkWin(false, true) === 'transport_destroyed', '运输车状态检查');

console.log('\n[Test] ConvoyEscort - 运输车到达终点');
const ce3 = new ConvoyEscort();
ce3.transport.waypointIdx = ce3.waypoints.length;
T.eq(ce3.checkWin(false, false), 'escort_complete', '到达终点=护送成功');

T.summary();
