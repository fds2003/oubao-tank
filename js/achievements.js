/**
 * achievements.js - 成就系统
 * 追踪游戏成就，localStorage持久化
 */
var AchievementSystem = (function(){
 const ACHIEVEMENTS = [
  { id:'first_win',    name:'初次胜利',   desc:'赢得第一局游戏',             icon:'🏆' },
  { id:'win_streak_3', name:'三连胜',     desc:'连续赢3局',                 icon:'🔥' },
  { id:'win_streak_5', name:'五连胜',     desc:'连续赢5局',                 icon:'⚡' },
  { id:'accuracy_80',  name:'精准射手',   desc:'单局命中率超过80%',         icon:'🎯' },
  { id:'survivor',     name:'生存专家',   desc:'一局中未死亡获胜',          icon:'🛡️' },
  { id:'power_master', name:'道具大师',   desc:'累计拾取全部11种道具',      icon:'✨' },
  { id:'tank_killer',  name:'坦克杀手',   desc:'单局击杀10个AI',            icon:'💀' },
  { id:'close_call',   name:'绝地反击',   desc:'1HP时反杀获胜',             icon:'💚' },
  { id:'teamwork',     name:'最佳拍档',   desc:'协作模式获胜',              icon:'🤝' },
  { id:'marathon',     name:'马拉松',     desc:'累计游玩10局',              icon:'🏃' },
 ];

 class AchievementSystem {
  constructor() {
   this.achievements = ACHIEVEMENTS;
   this.unlocked = [];
   this.stats = {
    totalGames: 0,
    totalWins: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    bestAccuracy: 0,
    powerupsCollected: [],
    totalKills: 0,
   };
   this._load();
  }

  _load() {
   try {
    const raw = localStorage.getItem('oubao_achievements');
    if (raw) {
     const data = JSON.parse(raw);
     this.unlocked = data.unlocked || [];
     Object.assign(this.stats, data.stats || {});
    }
   } catch(e) { console.warn('Achievements load failed:', e); }
  }
  _save() {
   try {
    localStorage.setItem('oubao_achievements', JSON.stringify({
     unlocked: this.unlocked,
     stats: this.stats,
    }));
   } catch(e) { console.warn('Achievements save failed:', e); }
  }

  isUnlocked(id) {
   return this.unlocked.indexOf(id) !== -1;
  }

  _unlock(id) {
   if (!this.isUnlocked(id)) {
    this.unlocked.push(id);
    this._save();
    return true; // newly unlocked
   }
   return false;
  }

  getAchievement(id) {
   return this.achievements.find(a => a.id === id) || null;
  }

  getUnlocked() {
   return this.achievements.filter(a => this.isUnlocked(a.id));
  }

  getLocked() {
   return this.achievements.filter(a => !this.isUnlocked(a.id));
  }

  /**
   * 记录一局游戏结果，检查并解锁成就
   * @param {Object} result
   * @param {boolean} result.won - 是否获胜
   * @param {number} result.shots - 发射数
   * @param {number} result.hits - 命中数
   * @param {number} result.killed - 击杀数
   * @param {boolean} result.survived - 是否存活
   * @param {string[]} result.powerups - 拾取的道具类型
   * @param {number} [result.lastHp] - 结束时HP（绝地反击判定）
   * @param {boolean} [result.coop] - 是否协作模式
   * @returns {string[]} 新解锁的成就ID列表
   */
  recordGame(result) {
   const newlyUnlocked = [];

   this.stats.totalGames++;
   if (result.won) this.stats.totalWins++;

   // 连胜追踪
   if (result.won) {
    this.stats.currentWinStreak++;
    if (this.stats.currentWinStreak > this.stats.bestWinStreak) {
     this.stats.bestWinStreak = this.stats.currentWinStreak;
    }
   } else {
    this.stats.currentWinStreak = 0;
   }

   // 命中率
   if (result.shots > 0) {
    const accuracy = result.hits / result.shots;
    if (accuracy > this.stats.bestAccuracy) this.stats.bestAccuracy = accuracy;
   }

   // 道具收集
   if (result.powerups) {
    for (const p of result.powerups) {
     if (this.stats.powerupsCollected.indexOf(p) === -1) {
      this.stats.powerupsCollected.push(p);
     }
    }
   }

   // 击杀数
   this.stats.totalKills += (result.killed || 0);

   this._save();

   // 检查各项成就
   if (result.won && this._unlock('first_win')) newlyUnlocked.push('first_win');
   if (this.stats.currentWinStreak >= 3 && this._unlock('win_streak_3')) newlyUnlocked.push('win_streak_3');
   if (this.stats.currentWinStreak >= 5 && this._unlock('win_streak_5')) newlyUnlocked.push('win_streak_5');
   if (result.shots > 0 && (result.hits / result.shots) >= 0.8 && this._unlock('accuracy_80')) newlyUnlocked.push('accuracy_80');
   if (result.won && result.survived && this._unlock('survivor')) newlyUnlocked.push('survivor');
   if (result.killed >= 10 && this._unlock('tank_killer')) newlyUnlocked.push('tank_killer');
   if (result.lastHp > 0 && result.lastHp <= 1 && result.won && this._unlock('close_call')) newlyUnlocked.push('close_call');
   if (result.coop && result.won && this._unlock('teamwork')) newlyUnlocked.push('teamwork');
   if (this.stats.totalGames >= 10 && this._unlock('marathon')) newlyUnlocked.push('marathon');

   // 道具大师：收集全部11种
   const allTypes = ['shield','speed','heal','rapid','freeze','power','ghost','mine','mega','scatter','emp'];
   if (this.stats.powerupsCollected.length >= allTypes.length && this._unlock('power_master')) newlyUnlocked.push('power_master');

   return newlyUnlocked;
  }

  export() {
   return JSON.stringify({ unlocked: this.unlocked, stats: this.stats });
  }

  import(jsonStr) {
   try {
    const data = JSON.parse(jsonStr);
    this.unlocked = data.unlocked || [];
    Object.assign(this.stats, data.stats || {});
    this._save();
   } catch(e) { console.warn('Achievements import failed:', e); }
  }

  reset() {
   this.unlocked = [];
   this.stats = {
    totalGames: 0, totalWins: 0, currentWinStreak: 0,
    bestWinStreak: 0, bestAccuracy: 0, powerupsCollected: [], totalKills: 0,
   };
   this._save();
  }
 }

 return AchievementSystem;
})();
