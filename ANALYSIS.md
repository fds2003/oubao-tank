# 坦克大战 - 代码分析与修复记录

> 所有BUG已修复并验证。
>
> 📋 需求文档：[REQUIREMENTS.md](REQUIREMENTS.md) | 📖 项目说明：[README.md](README.md)

---

## 修复记录

### 第一轮：P0×5 + P1×4（9个BUG）

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| 1 | 散射绕过子弹上限 | `tank.js` | 散射时cap减2，最低保底1 |
| 2 | HP扣减逻辑错误 | `tank.js` | `hp-=real` 替代 `hp-=dmg` |
| 3 | 巨型血条溢出 | `tank.js` | `frac=Math.min(1,hp/HP_MAX)` |
| 4 | 友军伤害不一致 | `bullet.js`+`powerup.js` | 同阵营统一禁用友伤 |
| 5 | 协作HUD重叠 | `game.js` | 回合信息移到顶部 |
| 6 | 操作面板溢出 | `game.js` | 高度自适应rows数量 |
| 7 | 地图预览溢出 | `game.js` | `sc=Math.min(tw,w,h)` |
| 8 | 伤害数字显示原始值 | `tank.js` | 改用real变量 |
| 9 | AI躲散射方向错 | `ai.js` | 用 `b.dir` 向量替代 `b.dirKey` |

### 第二轮：P2×7 + 性能×3 + 游戏性×2（12项优化）

| # | 改动 | 文件 |
|---|------|------|
| 10 | AI出生点分散 | `game.js` |
| 11 | AI死亡后不锁定目标 | `ai.js` |
| 12 | 简单AI追踪增强 | `ai.js` |
| 13 | 冰冻随AI数量衰减 | `powerup.js` |
| 14 | EMP增加减速效果 | `powerup.js`+`tank.js` |
| 15 | 删除HTML canvas死代码 | `index.html` |
| 16 | matchStats切换时重置 | `game.js` |
| 性能 | particles swap-and-pop | `particles.js` |
| 性能 | 草地位置预计算 | `world.js` |
| 游戏性 | 简单AI追踪增强 | `ai.js` |
| 游戏性 | 巨型+20%伤害 | `tank.js` |

### 第三轮：AI不动BUG（3处修复）

| 问题 | 修复 |
|------|------|
| AI出生点越界（offset超出网格） | 改为安全偏移（检查边界+墙体） |
| openDir()全堵死返回当前朝向 | 改为随机方向 |
| chooseDir()65%概率不设方向 | 改为无条件设置方向 |

### 第四轮：代码审查修复7个BUG

| 优先级 | 问题 | 文件 | 修复 |
|--------|------|------|------|
| HIGH | 双人对战地雷不伤对手 | `powerup.js` | `gameMode===1` 跳过队伍检查 |
| HIGH | 协作EMP减速队友 | `powerup.js` | 跳过同队玩家 |
| HIGH | 巨型坦克绘制偏移 | `tank.js` | scale移到translate之后 |
| HIGH | 散射无连发无法开火 | `tank.js` | cap最低保底1 |
| MEDIUM | AI追道具覆盖躲子弹 | `ai.js` | dodge优先于seekPowerups |
| MEDIUM | separateTanks推入墙壁 | `tank.js` | fits检查失败则回退 |
| MEDIUM | 穿墙模式可出界 | `tank.js` | 边界检查移到ghost之前 |

### 第五轮：地图修复

| 地图 | 问题 | 修复 |
|------|------|------|
| 八卦迷阵 | 中心22格被砖墙围死 | 移除围死的B墙 |
| 三角攻防 | 187格被钢墙封死 | 移除封死出生点的S墙 |

### 第六轮：代码重构（消除重复+统一配置）

| # | 改动 | 文件 | 说明 |
|---|------|------|------|
| 1 | 新增 `CONFIG` 配置对象 | `utils.js` | 集中管理20个游戏参数，消除散落各处的魔数 |
| 2 | 提取 `spawnAI()` 方法 | `game.js` | 将重复~40行的AI生成逻辑提取为8行公共方法 |
| 3 | 提取模块级常量 | `game.js` | `AI_COLORS`、`AI_NAMES`、`SAFE_OFFSETS`、`DIFF_LIST` 提取为顶层常量 |
| 4 | 全局魔数替换 | 多个文件 | `ai.js`×3、`bullet.js`×1、`powerup.js`×8、`game.js`×5 |

**CONFIG 配置项清单：**

| 常量 | 值 | 用途 |
|------|----|------|
| `BULLET_HIT_RANGE` | 26 | 子弹碰撞判定范围 |
| `POWERUP_PICKUP_RANGE` | 34 | 道具/地雷拾取范围 |
| `POWERUP_SPAWN_MIN_DIST` | 180 | 道具刷新距玩家最小距离 |
| `POWERUP_MIN_SPACING` | 55 | 道具之间最小间距 |
| `POWERUP_DURATION` | 8 | 增益类道具持续时间 |
| `POWERUP_INITIAL_MIN/MAX` | 4/6 | 首个道具刷新延迟（秒） |
| `POWERUP_INTERVAL_MIN/MAX` | 5/8 | 后续道具刷新间隔（秒） |
| `HEAL_AMOUNT` | 40 | 维修回血量 |
| `MEGA_HP_BONUS` | 50 | 巨型额外血量 |
| `MEGA_DURATION` | 10 | 巨型持续时间（秒） |
| `EMP_SLOW_DURATION` | 3 | EMP 减速时间（秒） |
| `MINE_LIFE` | 18 | 地雷存活时间（秒） |
| `MINE_ARM_TIME` | 0.8 | 地雷启动延迟（秒） |
| `MINE_DAMAGE` | 50 | 地雷伤害 |
| `AI_DODGE_RANGE` | 80 | AI 躲避子弹范围 |
| `AI_SEEK_RANGE` | 200 | AI 搜寻道具范围 |
| `AI_LOS_STEP` | 0.4 | AI 视线检测步长 |
| `WIN_ROUNDS` | 5 | 胜利局数 |

---

## 当前代码统计

| 文件 | 行数 | 职责 |
|------|------|------|
| utils.js | 55 | 常量、工具函数、CONFIG配置 |
| audio.js | 66 | 音效（Web Audio API） |
| input.js | 18 | 键盘输入管理 |
| maps.js | 189 | 12张地图定义+buildMap |
| world.js | 91 | 地形渲染+草地预计算 |
| particles.js | 150 | 粒子特效（swap-and-pop） |
| powerup.js | 257 | 道具系统（11种+地雷+applyPower） |
| bullet.js | 91 | 子弹逻辑（角度支持） |
| ai.js | 91 | AI控制器（LOS/路径/躲避/道具） |
| tank.js | 237 | 坦克逻辑（移动/开火/受伤/绘制） |
| game.js | 495 | 游戏主循环+spawnAI+所有UI绘制 |
| main.js | 14 | 启动入口 |
| **合计** | **~1754** | |

---

## 测试覆盖

| 测试套件 | 用例数 | 状态 |
|----------|--------|------|
| test-ai | 11 | ✓ 全部通过 |
| test-coop | 11 | ✓ 全部通过 |
| test-effects | 14 | ✓ 全部通过 |
| test-draw2 | 7 | ✓ 全部通过 |
| test-newpowerups | 10 | ✓ 全部通过 |
| test-tutorial | 33 | ✓ 全部通过 |
| test-dynamic-difficulty | 38 | ✓ 全部通过 |
| test-newplayer-protection | 12 | ✓ 全部通过 |
| test-damage-flash | 8 | ✓ 全部通过 |
| **合计** | **144** | **✓** |

### v1.2 新手体验优化（2026-08-24）

| 功能 | 文件 | 说明 |
|------|------|------|
| 新手引导系统 | tutorial.js | 5步教程，localStorage持久化 |
| 动态难度调整 | dynamic-difficulty.js | 连赢升难/连败降难 |
| 新手保护机制 | dynamic-difficulty.js | 前3局AI开火冷却×1.5 |
| 受伤屏幕闪红 | game.js + tank.js | 玩家受伤时屏幕边缘红色渐变 |

### 重构验证（2026-08-24）

| 验证项 | 状态 |
|--------|------|
| 12个JS文件语法检查 | ✓ 通过 |
| CONFIG 20个键完整性 | ✓ 通过 |
| 4个消费文件引用有效性 | ✓ 通过 |
| spawnAI 单人模式（1+2AI） | ✓ 通过 |
| spawnAI 协作模式（2+3AI） | ✓ 通过 |
| 双人模式（无AI） | ✓ 通过 |
| 道具效果（维修+40/巨型+50/护盾8s） | ✓ 通过 |
