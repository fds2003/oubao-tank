# 欧宝坦克大战 - 开发计划

> 版本：v2.0 规划 | 更新：2026-08-24

---

## 一、版本规划

```
v1.1 (已完成)  代码重构：CONFIG + spawnAI + 魔数替换
v1.2           新手引导 + 动态难度
v1.3           成就系统 + 家庭排行榜
v2.0           道具组合 + 背景音乐 + 视觉增强
v2.1           坦克自定义 + 特殊地图事件
v2.2           观战模式 + 分享功能
```

---

## 二、功能清单

### P0：核心体验（v1.2）

| # | 功能 | 说明 | 工作量 |
|---|------|------|--------|
| 1 | 新手引导/教程 | 首次进入显示操作提示，动画演示WASD+F | 小 |
| 2 | 动态难度 | 连输3局自动降低AI反应速度，赢3局恢复 | 中 |
| 3 | 新手保护 | 前3局AI开火冷却×1.5，让小朋友有时间反应 | 小 |

### P1：成就感（v1.3）

| # | 功能 | 说明 | 工作量 |
|---|------|------|--------|
| 4 | 成就系统 | 10+个成就（首次胜利/连胜/精准射手等） | 中 |
| 5 | 经验值/等级 | 每局获得XP，等级提升解锁新内容 | 中 |
| 6 | 家庭排行榜 | localStorage记录家庭成员成绩 | 小 |

### P2：趣味性（v2.0）

| # | 功能 | 说明 | 工作量 |
|---|------|------|--------|
| 7 | 道具组合效果 | 疾速+连发=闪电战，巨型+重炮=Boss模式 | 中 |
| 8 | 背景音乐 | Web Audio API程序化生成BGM | 中 |
| 9 | 受伤屏幕闪红 | 屏幕边缘红色渐变反馈 | 小 |
| 10 | 胜利动画 | 坦克跳胜利舞+彩色粒子 | 小 |

### P3：扩展内容（v2.1）

| # | 功能 | 说明 | 工作量 |
|---|------|------|--------|
| 11 | 坦克自定义 | 小型/中型/大型，不同属性 | 大 |
| 12 | 特殊地图事件 | 空袭/地震/补给箱随机触发 | 大 |
| 13 | 天气系统 | 白天/夜晚，夜晚视野缩小 | 中 |

### P4：社交功能（v2.2）

| # | 功能 | 说明 | 工作量 |
|---|------|------|--------|
| 14 | 观战模式 | 阵亡后切换视角观战队友 | 中 |
| 15 | 战绩卡片 | 胜利后生成可分享的战绩图 | 中 |
| 16 | 回放系统 | 记录精彩操作（连杀/穿墙击杀） | 大 |

---

## 三、详细设计

### 3.1 新手引导系统

**触发条件**：首次打开游戏（localStorage标记）

**引导流程**：
```
第1步：高亮「单人对战」按钮，提示"按1选择模式"
第2步：高亮地图选择，提示"← → 选择地图"  
第3步：高亮「开始」按钮，提示"按回车开始"
第4步：进入游戏后，屏幕显示WASD和F的动画演示
第5步：3秒后自动消失，游戏开始
```

**技术实现**：
- 新增 `js/tutorial.js` 模块
- 用半透明遮罩+高亮框引导注意力
- 用 `localStorage.tutorial_done` 记录是否完成

### 3.2 动态难度系统

**算法**：
```javascript
// 在 game.js 中追踪连胜/连败
this.winStreak = 0;
this.loseStreak = 0;

// 每局结束时更新
if (winner === 0) {
  this.winStreak++;
  this.loseStreak = 0;
} else {
  this.loseStreak++;
  this.winStreak = 0;
}

// 动态调整AI难度
getEffectiveDifficulty() {
  if (this.loseStreak >= 3) return 'easy';  // 连输3局降为简单
  if (this.winStreak >= 3 && this.aiDifficulty < 2) {
    this.aiDifficulty++;  // 连赢3局提升难度
  }
  return DIFF_LIST[this.aiDifficulty];
}
```

### 3.3 成就系统

**成就列表**：
```javascript
const ACHIEVEMENTS = [
  { id: 'first_win', name: '初次胜利', desc: '赢得第一局', icon: '🏆' },
  { id: 'win_streak_3', name: '三连胜', desc: '连续赢3局', icon: '🔥' },
  { id: 'win_streak_5', name: '五连胜', desc: '连续赢5局', icon: '⚡' },
  { id: 'accuracy_80', name: '精准射手', desc: '命中率>80%', icon: '🎯' },
  { id: 'survivor', name: '生存专家', desc: '一局不死亡', icon: '🛡️' },
  { id: 'power_master', name: '道具大师', desc: '拾取所有11种道具', icon: '✨' },
  { id: 'tank_killer', name: '坦克杀手', desc: '单局击杀10个AI', icon: '💀' },
  { id: 'close_call', name: '绝地反击', desc: '1HP时反杀', icon: '💚' },
  { id: 'teamwork', name: '最佳拍档', desc: '协作模式胜利', icon: '🤝' },
  { id: 'marathon', name: '马拉松', desc: '游玩10局', icon: '🏃' },
];
```

**存储结构**：
```javascript
// localStorage.oubao_achievements
{
  unlocked: ['first_win', 'accuracy_80'],
  stats: {
    totalGames: 15,
    totalWins: 8,
    bestWinStreak: 4,
    bestAccuracy: 0.82,
    powerupsCollected: ['shield', 'speed', ...]
  }
}
```

### 3.4 家庭排行榜

**数据结构**：
```javascript
// localStorage.oubao_leaderboard
{
  players: [
    { name: '爸爸', avatar: '👨', wins: 12, level: 5 },
    { name: '小明', avatar: '👦', wins: 8, level: 3 },
    { name: '妈妈', avatar: '👩', wins: 6, level: 2 }
  ]
}
```

**UI设计**：
- 主菜单新增「家庭排行」按钮
- 显示每个成员的胜场、等级、最高连胜
- 可以添加/选择玩家

### 3.5 道具组合系统

**组合规则**：
```javascript
const COMBOS = [
  { 
    name: '闪电战', 
    requires: ['speed', 'rapid'], 
    effect: '移动中射击不减速',
    color: '#ffd23f'
  },
  { 
    name: 'Boss模式', 
    requires: ['mega', 'power'], 
    effect: '体型×1.5，伤害×1.5',
    color: '#ff5555'
  },
  { 
    name: '幽灵战', 
    requires: ['ghost', 'scatter'], 
    effect: '穿墙+三发散射',
    color: '#c89dff'
  },
  {
    name: '冰火两重天',
    requires: ['freeze', 'power'],
    effect: '冰冻敌人+重炮伤害',
    color: '#9ad8ff'
  }
];
```

### 3.6 背景音乐系统

**音乐列表**：
```javascript
const BGM = {
  menu: { bpm: 120, mood: 'cheerful' },      // 轻松愉快
  battle_easy: { bpm: 140, mood: 'playful' }, // 简单难度
  battle_normal: { bpm: 160, mood: 'tense' }, // 普通难度  
  battle_hard: { bpm: 180, mood: 'intense' }, // 困难难度
  victory: { bpm: 150, mood: 'celebration' }  // 胜利
};
```

**实现方式**：
- 用 Web Audio API 程序化生成旋律
- 根据游戏状态自动切换BGM
- 添加音量控制和静音选项

---

## 四、技术架构演进

### 4.1 当前架构
```
js/
├── utils.js        常量+工具+CONFIG
├── audio.js        音效
├── input.js        输入
├── maps.js         地图
├── world.js        世界渲染
├── particles.js    粒子
├── powerup.js      道具
├── bullet.js       子弹
├── ai.js           AI
├── tank.js         坦克
├── game.js         主循环+UI
└── main.js         入口
```

### 4.2 目标架构（v2.0）
```
js/
├── core/           核心模块
│   ├── utils.js        常量+工具+CONFIG
│   ├── input.js        输入管理
│   └── audio.js        音频系统（音效+BGM）
├── game/           游戏逻辑
│   ├── tank.js         坦克
│   ├── bullet.js       子弹
│   ├── ai.js           AI
│   ├── powerup.js      道具+组合
│   └── mine.js         地雷（从powerup提取）
├── world/          世界系统
│   ├── maps.js         地图数据
│   ├── world.js        地形渲染
│   └── events.js       地图事件（v2.1）
├── ui/             界面系统
│   ├── menu.js         主菜单
│   ├── hud.js          战斗HUD
│   ├── results.js      结算画面
│   ├── tutorial.js     新手引导
│   ├── achievements.js 成就系统
│   └── leaderboard.js  排行榜
├── effects/        特效系统
│   ├── particles.js    粒子
│   └── screenshake.js  屏幕震动
├── game.js         游戏主循环
└── main.js         入口
```

**拆分原则**：
- game.js（当前495行）拆分为多个UI模块
- powerup.js（257行）拆分地雷为独立模块
- 新增模块不修改现有文件，只扩展

---

## 五、开发排期

### Phase 1：v1.2（1-2周）
- [ ] 新手引导系统（tutorial.js）
- [ ] 动态难度调整
- [ ] 新手保护机制
- [ ] 受伤屏幕闪红

### Phase 2：v1.3（1-2周）
- [ ] 成就系统（achievements.js）
- [ ] 经验值/等级系统
- [ ] 家庭排行榜（leaderboard.js）
- [ ] 结算画面增强

### Phase 3：v2.0（2-3周）
- [ ] 道具组合效果
- [ ] 背景音乐系统
- [ ] 胜利动画
- [ ] 代码架构重构

### Phase 4：v2.1（2-3周）
- [ ] 坦克自定义系统
- [ ] 特殊地图事件
- [ ] 天气系统
- [ ] 新地图设计

### Phase 5：v2.2（2-3周）
- [ ] 观战模式
- [ ] 战绩卡片生成
- [ ] 回放系统（可选）

---

## 六、测试计划

### 6.1 功能测试
- 每个新功能编写对应测试用例
- 保持现有53个测试通过
- 新增测试目标：100+用例

### 6.2 兼容性测试
- Chrome/Firefox/Safari/Edge 最新版
- 移动端浏览器（基础兼容）
- 不同分辨率（1080p/1440p/4K）

### 6.3 性能测试
- 10个AI同场竞技保持60FPS
- 粒子系统压力测试（1000+粒子）
- 内存泄漏检测

---

## 七、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 架构重构引入BUG | 高 | 先写测试，小步重构 |
| 移动端性能不足 | 中 | 降低粒子数量，简化渲染 |
| 成就系统过于复杂 | 中 | 分阶段实现，先核心后扩展 |
| BGM生成质量差 | 低 | 准备备用方案（静音/简单音效） |

---

## 八、成功指标

| 指标 | 目标 | 衡量方式 |
|------|------|----------|
| 小朋友满意度 | 能独立玩10局 | 观察游玩时长 |
| 亲子互动 | 协作模式每周玩3次 | 记录游玩频率 |
| 成就完成率 | 核心成就完成50% | 成就系统统计 |
| 性能稳定性 | 60FPS无卡顿 | 性能监控 |
