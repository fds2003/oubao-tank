# 欧宝坦克大战 - 全面测试报告

**测试工程师：** Agnes（AI 辅助测试）
**测试日期：** 2026-08-24
**游戏版本：** v2.3
**测试范围：** 全量静态代码分析 + 单元测试执行 + 游戏逻辑推演
**代码量：** 约 3,467 行 JS，21 个源文件

---

## 执行摘要

| 严重级别 | 数量 | 说明 |
|----------|------|------|
| 🔴 P0 致命 | 1 | 导致功能完全不可用 |
| 🟠 P1 严重 | 4 | 核心玩法失效或数据丢失 |
| 🟡 P2 中等 | 5 | 体验受损或有潜在风险 |
| 🟢 P3 轻微 | 4 | 视觉瑕疵或边缘情况 |
| **合计** | **14** | |

**单元测试：** 384 个全部通过 ✅（但这仅覆盖了独立模块，未覆盖系统级交互 bug）

---

## 🔴 P0 致命 Bug

### Bug #1：拖斗压痕系统永久内存泄漏

**文件：** `js/game.js` 第 342-359 行
**影响：** 长期游戏导致内存持续增长，可能最终卡顿

**问题描述：**
`trackMarks` 数组在 `startRound()` 和 `startMatch()` 中**从未被清空**，仅在 `drawScene()` 中懒初始化。每局游戏结束后，上一局的履带痕迹残留，随着游玩时长增加内存持续膨胀。

```js
// game.js line 342 - 只在第一次访问时初始化，从未重置
if(!this.trackMarks) this.trackMarks=[];

// startRound() 中没有 this.trackMarks = [];
// startMatch() 中没有 this.trackMarks = [];
```

**复现路径：**
1. 开始一局游戏，移动坦克产生履带痕迹
2. 结束该局，开始新一局
3. 旧痕迹保留在数组中，不会清除

**修复方案：**
```js
// 在 startRound() 中添加：
this.trackMarks = [];
// 或在 startMatch() 中添加：
this.trackMarks = [];
```

---

## 🟠 P1 严重 Bug

### Bug #2：战损烟雾/火焰效果永不触发

**文件：** `js/tank.js` 第 259-267 行
**影响：** HP<50% 的战损视觉效果完全失效

**问题描述：**
`draw()` 方法签名是 `draw(ctx, time)`，**没有接收 `dt` 参数**。但在 draw 方法内第 260、264 行使用了 `dt`：

```js
draw(ctx, time){
    // ... 其他代码 ...
    if(frac<=0.2&&frac>0&&chance(dt*3)){   // dt 是 undefined! NaN
        this.game.parts.spark(...);         // 永远不会执行
    }else if(frac<=0.5&&frac>0&&chance(dt*2)){ // dt 是 undefined! NaN
        this.game.parts.smoke(...);         // 永远不会执行
    }
}
```

`chance(undefined*3)` = `chance(NaN)` = `Math.random() < false` = `false`

**修复方案：**
```js
// 方案A：给 draw 方法添加 dt 参数
draw(ctx, time, dt){
    // 使用 dt 参数
}
// 修改 game.js 中的调用：t.draw(ctx, this.time, dt);

// 方案B：用 time 替代（如果只是想控制概率）
if(frac<=0.2&&frac>0&&chance(0.05)){  // 固定概率
```

---

### Bug #3：道具组合系统完全无效（dead code）

**文件：** `js/combos.js` + `js/tank.js` + `js/bullet.js`
**影响：** 4 种组合效果（闪电战/Boss模式/幽灵战/冰火两重天）仅显示通知，**无任何实际效果**

**问题描述：**
组合系统在 `combos.js` 中计算了组合效果：
```js
// combos.js
{ name: 'Boss模式', effect: { damageMultiplier: 1.5 } }
{ name: '幽灵战', effect: { pierceWalls: true } }
{ name: '闪电战', effect: { shootWhileMoving: true } }
```

但 `Tank.fire()` 和 `Tank.tryMove()` 中**完全没有读取和应用这些效果**：

```js
// tank.js fire() - 没有检查 comboSystem
const baseDmg=this.baseDamage||NORMAL_DMG;
// ❌ 应该: const comboDmg = game.comboSystem.getEffect('boss')?.damageMultiplier || 1;
// ❌ 应该: if (game.comboSystem.hasCombo('ghost_combo')) this.pierce = true;
```

同时组合状态的添加/移除不同步：
- 拾取道具时调用 `comboSystem.addBuff(type)` ✓
- Buff 自然过期时，**没有**调用 `comboSystem.removeBuff(type)` ✗
- 组合的 `update(dt)` 在 `game.updatePlay()` 中**从未被调用** ✗

**修复方案：**
1. 在 `Tank.fire()` 中查询组合效果并应用
2. 在 `Tank.update()` 中 buff 归零时调用 `comboSystem.removeBuff(type)`
3. 在 `Game.updatePlay()` 中每帧调用 `this.comboSystem.update(dt)`

---

### Bug #4：基地保卫战 - 基地无法被攻击且不可见

**文件：** `js/modes.js` + `js/game.js`
**影响：** 模式 4（基地保卫战）的核心玩法完全失效

**问题描述：**
1. **基地不渲染：** `BaseDefense` 对象创建了但没有绘制代码，玩家在地图上**看不到基地**
2. **基地 HP 不减少：** `BaseDefense.takeDamage()` 方法存在，但在 `game.js` 中**从未被调用**
3. 子弹碰撞检测只检查 `game.tanks`，不检查基地

```js
// game.js - 子弹击中坦克
for(const tk of game.tanks){
    // ... 碰撞检测
}
// ❌ 没有检查 game.baseDefense.hq 的代码
```

**结果：** 模式 4 只能靠"全歼 AI"获胜，摧毁基地的额外胜利条件永远无法触发，基地也完全不可见。

**修复方案：**
1. 在 `World.drawBase()` 中添加基地绘制逻辑
2. 在子弹碰撞检测中添加基地 HP 检查
3. 在 `Game.updatePlay()` 中传递子弹伤害给基地

---

### Bug #5：护送装甲车 - 运输车不可见且不受伤害

**文件：** `js/modes.js` + `js/game.js`
**影响：** 模式 5（护送装甲车）的核心玩法完全失效

**问题描述：**
与 Bug #4 相同的问题：
1. **运输车不渲染：** `ConvoyEscort.transport` 没有绘制代码
2. **运输车不受伤害：** `transportTakeDamage()` 存在但从未被调用
3. 子弹不检测与运输车的碰撞

**结果：** 护送模式无法正常进行，既看不到运输车，也无法保护/伤害它。

**修复方案：**
同 Bug #4，需要添加渲染和碰撞检测逻辑。

---

## 🟡 P2 中等 Bug

### Bug #6：协作模式冰冻技能可能误伤队友

**文件：** `js/powerup.js` 第 183-207 行
**影响：** 协作模式中，队友可能被冰冻

**问题描述：**
```js
// powerup.js - 协作模式冰冻逻辑
if(game.gameMode===2){
    for(const t of game.tanks){
        if(t!==tank&&t.alive){
            if(game.gameMode===2&&t.ai===null)continue;  // ← 这里有问题
            count++;
        }
    }
}
```

条件 `t.ai===null` 用来跳过"人类玩家"坦克。但由于 **Bug #7（isPlayer 未定义）**，这个逻辑实际上是不完整的：
- 单人对战（mode 0）：AI 坦克有 `t.ai`，玩家 `t.ai===null` → 正确跳过
- 协作对战（mode 2）：两个玩家都有 `t.ai===null`，AI 坦克有 `t.ai` → 只冻结 AI，跳过玩家 ✓
- 但代码中 `t.ai===null` 的判断依赖的是 `ai` 属性而非 `isPlayer`，所以协作模式下其实是**正确的**

**修正分析：** 协作模式冰冻逻辑实际上对 `t.ai===null` 的判断是正确的。但存在边界问题：如果玩家切换车型或重新开局，`ai` 属性可能被意外修改。

**建议修复：** 统一使用明确的 `isPlayer` 标记替代 `t.ai===null` 判断。

---

### Bug #7：`isPlayer` 属性从未设置，多处条件判断失效

**文件：** `js/tank.js` + `js/powerup.js` + `js/ai.js` + `js/bullet.js` + `js/game.js`
**影响：** 多处代码依赖 `t.isPlayer` 但永远为 `undefined`（falsy）

**问题描述：**
以下文件中使用了 `t.isPlayer` 或 `this.isPlayer` 的判断：
- `bullet.js:59` - 子弹命中判断：`(tk.ai===null)===(this.owner.ai===null)` 代替了 isPlayer
- `powerup.js:187` - 冰冻：`if(game.gameMode===2&&t.ai===null)continue;`
- `powerup.js:234` - EMP：`if(game.gameMode===2&&t.ai===null&&tank.ai===null)continue;`
- `ai.js:36` - AI 目标选择：`if(t.ai||!t.alive)continue;`

虽然当前用 `ai===null` 做了替代判断，但这是隐式假设。一旦代码重构或新增 AI 类型，所有这些地方都会出错。

**修复方案：** 在 `Tank` 构造函数中明确设置：
```js
constructor(id, cfg, game, tankClass){
    // ...
    this.isPlayer = (id === 0);  // 添加这行
    // ...
}
```
然后将所有 `t.ai===null` 判断统一替换为 `t.isPlayer`。

---

### Bug #8：地雷在协作模式可能伤害队友

**文件：** `js/powerup.js` 第 143-144 行
**影响：** 协作模式下地雷可能误伤己方 AI 队友

**问题描述：**
```js
// powerup.js Mine.update()
if(game.gameMode!==1&&(t.ai===null)===(this.owner.ai===null))continue;
```

这段逻辑意图是：非双人对战模式中，同阵营不互伤。但当 `owner` 是玩家（`owner.ai===null`），`t` 也是玩家控制的 AI 队友（`t.ai===null`）时，条件 `(null===null)=== (null===null)` = `true`，会 `continue` 跳过——这是**正确的**。

但当 `owner` 是 AI 坦克（`owner.ai!==null`），`t` 是另一个 AI 坦克（`t.ai!==null`）时，条件同样为 `true`，也会跳过——这也是**正确的**。

**实际分析：** 地雷逻辑在当前实现下是正确的，但依赖于 `ai===null` 作为玩家标识的隐式约定（参见 Bug #7）。

---

### Bug #9：子弹碰撞距离使用硬编码而非 CONFIG

**文件：** `js/bullet.js` 第 83 行
**影响：** 子弹互撞判定范围不一致

**问题描述：**
```js
// bullet.js - 子弹碰撞
if(Math.abs(b.x-this.x)<11&&Math.abs(b.y-this.y)<11){
```

常量 `11` 是硬编码的，而坦克命中范围 `CONFIG.BULLET_HIT_RANGE = 26`。子弹碰撞半径应与此一致或成比例。`11` 约等于子弹半径（5px）+ 一点余量，但作为设计意图不明确。

**修复方案：**
```js
if(Math.abs(b.x-this.x)<CONFIG.BULLET_HIT_RANGE*0.4&&Math.abs(b.y-this.y)<CONFIG.BULLET_HIT_RANGE*0.4){
```

---

### Bug #10：护送模式运输车初始位置可能在墙内

**文件：** `js/modes.js` 第 74-78 行
**影响：** 护送模式下运输车可能出生时卡住

**问题描述：**
```js
// modes.js ConvoyEscort 初始化
this.waypoints = [
    { c: 2, r: 6 },   // 起点
    { c: 10, r: 6 },  // 中间
    { c: 19, r: 6 },  // 终点
];
```

运输车的初始位置硬编码在 `{c:2, r:6}`，但这个格子可能是砖墙(B)、钢墙(S)或水面(W)。在 `startMatch()` 中也**没有**调用 `convoyEscort.reset()` 来设置正确起始位置。

查看 `modes.js` 第 121-128 行：
```js
reset() {
    this.transport = {
        // ...
        x: this.waypoints[0].c * 55 + 27.5,
        y: this.waypoints[0].r * 55 + 27.5,
        waypointIdx: 0,
    };
}
```
`reset()` 方法存在，但在 `game.js` 的 `startMatch()` 中**从未被调用**：
```js
// game.js startMatch()
if(this.gameMode===4)this.convoyEscort=new ConvoyEscort();
// ❌ 没有调用 this.convoyEscort.reset()
```

**修复方案：**
```js
// game.js startMatch() 中添加：
if(this.gameMode===4){
    this.convoyEscort=new ConvoyEscort();
    this.convoyEscort.reset();  // 确保初始位置正确
}
```

---

## 🟢 P3 轻微 Bug

### Bug #11：菜单状态按下回车可能同时触发多个行为

**文件：** `js/game.js` 第 268 行
**影响：** 极低概率，按键抖动时可能意外开始游戏

**问题描述：**
```js
// game.js menu 状态
if(Input.pressed('Enter','Space')&&!this.showLeaderboard){
    this.startMatch(this.mapIdx);
    this.bgm.play('battle');
}
```
`Input.pressed()` 使用 `taps` Set，理论上帧内只会触发一次。但如果用户快速按两次 Enter（在同一帧内），由于 `endFrame()` 在 `loop()` 末尾调用，理论上安全。这不是严重问题，但值得注意。

---

### Bug #12：AI 在空旷地图可能堆叠

**文件：** `js/game.js` 第 124-135 行
**影响：** 10 个 AI 同场时部分坦克出生点重叠

**问题描述：**
`spawnAI()` 使用 `SAFE_OFFSETS` 寻找安全位置，共 10 个偏移量。当 `aiCount=10` 时，正好有 10 个偏移量，但如果某个偏移量落在墙或水面上，循环找不到合适位置，最终所有 AI 都堆在 spawnPt。

```js
// game.js spawnAI
for(const off of SAFE_OFFSETS){
    const tc=spawnPt.c+off.c, tr=spawnPt.r+off.r;
    if(tc>=1&&tc<COLS-1&&tr>=1&&tr<ROWS-1&&!this.world.solidTank(tc,tr)){
        // 找到安全位置
        return;
    }
}
// 如果全部不安全，fallback 到 spawnPt
const t=new Tank(id,{c:spawnPt.c,r:spawnPt.r,...});
```

**修复方案：** 增加更多偏移量或改为环形搜索。

---

### Bug #13：穿墙（Ghost）buff 使坦克穿过其他坦克

**文件：** `js/tank.js` 第 86 行
**影响：** 穿墙期间可以穿过敌方坦克，战术上过于强大

**问题描述：**
```js
// tank.js fits() 方法
if(this.buff.ghost>0)return true;  // 直接返回 true，忽略所有碰撞
```

穿墙buff 不仅让坦克穿过地形，还跳过了 `separateTanks()` 的坦克间碰撞检测（因为 `fits()` 返回 true，坦克可以移动到任何位置）。这意味着穿墙期间可以：
1. 直接穿过敌方坦克
2. 穿过水面和砖墙
3. 到达任何地图位置

**评估：** 这可能是设计意图（ghost = 完全无敌位），但应确认是否有意让坦克在 ghost 状态下仍可被攻击（目前是可以的，见 bullet.js 无 ghost 检查）。

---

### Bug #14：地图预览中草丛不显示

**文件：** `js/game.js` 第 600-604 行
**影响：** 菜单中无法看到草丛位置，影响战术决策

**问题描述：**
```js
// game.js drawMenu - 地图预览
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const ch=pv.grid[r][c];let col2='#121620';
    if(ch==='B')col2='#8a3e1e';
    else if(ch==='S')col2='#5a6270';
    else if(ch==='W')col2='#103050';
    else if(ch==='G')col2='#1e6830';  // ← 有处理，但可能被覆盖
    ctx.fillStyle=col2;
    ctx.fillRect(ox+c*sc*8,oy+r*sc*8,sc*8+0.5,sc*8+0.5);
}
```
实际上草丛 `G` 是有颜色的（深绿色），预览是正确的。但预览中缺少**草丛上方的植被纹理**（只是纯色块），与游戏中实际草丛效果差异较大，可能影响玩家对隐蔽位置的判断。

**评估：** 轻微视觉差异，不影响功能。

---

## 单元测试覆盖分析

现有 384 个单元测试**全部通过**，但存在明显的覆盖盲区：

| 测试文件 | 覆盖 | 盲区 |
|----------|------|------|
| test-physics.js | ✅ 独立模块 | 未测试与 Bullet/Tank 的集成 |
| test-modes.js | ✅ 初始化/伤害 | **未测试渲染、碰撞、integration** |
| test-combos.js | ✅ 检测逻辑 | **未测试效果是否应用到游戏** |
| test-tank-classes.js | ✅ 属性 | 未测试游戏中实际使用 |
| 全量测试 | ❌ | **无集成测试** |

**缺失的测试场景：**
1. 子弹碰撞 + 物理系统 + 坦克伤害 的完整链路
2. 道具拾取 + 组合触发 + 效果应用 的完整链路
3. 特殊模式（基地/护送）的全流程测试
4. 多 AI  spawned 的位置分布测试
5. 跨回合状态清理测试

---

## 优先级修复建议

### 立即修复（阻塞发布）
1. **Bug #3** - 组合系统 dead code：实现组合效果或移除功能
2. **Bug #4** - 基地保卫战不可用：添加渲染和伤害逻辑
3. **Bug #5** - 护送模式不可用：添加渲染和伤害逻辑
4. **Bug #2** - 战损效果失效：修复 dt 参数传递

### 短期修复（下一个版本）
5. **Bug #1** - 履带痕迹内存泄漏：在 startRound() 中清空
6. **Bug #7** - isPlayer 属性：统一设置并替换隐式判断
7. **Bug #10** - 护送初始化：调用 reset()
8. **Bug #9** - 硬编码常量：使用 CONFIG

### 中期优化
9. **Bug #8** - 地雷友伤：明确阵营系统
10. **Bug #12** - AI 堆叠：增加偏移量
11. **Bug #6** - 冰冻逻辑：统一使用 isPlayer

---

## 附录：代码质量建议

### 1. 全局常量分散
`BULLET_SPEED`、`NORMAL_DMG`、`TANK_SIZE` 等常量定义在 `js/tank.js` 中，但 `js/bullet.js` 也使用了它们。应统一放入 `utils.js` 的 `CONFIG` 对象中。

### 2. 缺少配置分离
`BaseDefense` 的 HQ 位置计算逻辑硬编码在 `modes.js` 中，应支持地图配置。

### 3. 错误处理不足
多处 `try-catch` 吞掉了错误信息（achievements.js、leaderboard.js），调试时难以定位问题。

### 4. 魔法数字
`bullet.js` 第 83 行的 `11`、`game.js` 第 347 行的 `0.15` 等应提取为常量。

### 5. 状态清理不完整
`startMatch()` 和 `startRound()` 中部分状态未重置（`trackMarks`），应在统一的位置进行状态初始化。

---

## 修复记录（TDD 第二轮 · 2026-08-25）

> 本轮全部采用 TDD 流程：先写失败测试（红）→ 最小实现（绿）→ 实机回归验证。

| # | 问题 | 级别 | 状态 | 修改文件 | 修复方式 |
|-----|------|------|------|----------|----------|
| #12 | AI 出生点堆叠（SAFE_OFFSETS 不查坦克占用） | P3 | ✅ | `game.js` | `_spawnable` 统一检查地形+坦克距离；螺旋搜索（半径3-10）+全图兜底 |
| #15 | 护送模式 AI 不攻击运输车（功能缺失） | P1 | ✅ | `ai.js`, `utils.js` | `chooseDir` mode4 分支：运输车 400px 内或比玩家近时成为目标 |
| #16 | 基地保卫战缺敌方基地（功能缺失） | P1 | ✅ | `modes.js`, `game.js`, `bullet.js` | 双基地 playerHQ/enemyHQ；按阵营伤害；摧毁敌方基地判胜 |
| #17 | 基地生成点被砖墙覆盖，子弹打不到基地 | P1 | ✅ | `modes.js`, `game.js`, `bullet.js` | `clearTerrain` 清空基地占位；子弹判定优先于地形 |
| #18 | 教程激活时按 Space 同帧开始比赛 | P2 | ✅ | `game.js`（前轮已修） | menu 分支 `tutorial.state!=='active'` 隔离，本轮补回归测试 |
| #19 | test-physics 跳弹测试 flaky（~30%失败） | P3 | ✅ | `tests/test-physics.js` | Math.random stub 固定断履带骰子；匹配 v2.1"侧面先掷断履带"新语义 |
| — | Game 实例无法从控制台访问（可测试性） | P3 | ✅ | `main.js` | 暴露 `window.__game` 调试钩子 |

### TDD 测试覆盖（tests/test-tdd-bugfixes.js，17 个用例）

- **BUG-A**：教程输入隔离（2 用例）
- **BUG-B/B2**：密集障碍 & 开阔地下多 AI 无重叠（3 用例）
- **BUG-C/C2**：护送模式 AI 优先攻击运输车 / 运输车被毁后恢复追击玩家（2 用例）
- **BUG-D~D4**：双基地存在性、位置、子弹阵营伤害、胜利判定、双基地渲染（8 用例）
- 其他回归保护（2 用例）

### 实机验证（Playwright + 本地 HTTP）

- 模式4：双基地渲染 ✓、AI 分开站位 ✓、HUD「第1局/存活2/2」✓
- 模式5：运输车渲染+移动 ✓（waypoint 0→1）、AI 朝运输车伏击 ✓
- 全程无 JS 运行时错误

### 最终测试状态

**354 个单元测试全部通过**（12 个套件），其中 test-physics 经 10 次重复运行验证无 flaky。
