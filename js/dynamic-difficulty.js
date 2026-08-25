'use strict';

/**
 * 动态难度调整系统
 * DynamicDifficulty - 根据玩家表现自动调整AI难度
 */

var DynamicDifficulty = class DynamicDifficulty {
  constructor(initialDifficulty) {
    this.winStreak = 0;
    this.loseStreak = 0;
    this.baseDifficulty = initialDifficulty !== undefined ? initialDifficulty : 1; // 0=简单, 1=普通, 2=困难
    this.minDifficulty = 0;
    this.maxDifficulty = 2;
    this.streakThreshold = 3; // 连胜/连败多少局触发难度变化
    this.diffList = ['easy', 'normal', 'hard'];
    this.gamesPlayed = 0;
    this.protectionGames = 3; // 新手保护期（局数）
    this.fireCooldownMultiplier = 1.5; // 保护期内AI开火冷却倍率
  }
  
  /**
   * 记录胜利
   */
  recordWin() {
    this.winStreak++;
    this.loseStreak = 0; // 重置连败
    
    // 连胜达到阈值，提升难度
    if (this.winStreak >= this.streakThreshold) {
      if (this.baseDifficulty < this.maxDifficulty) {
        this.baseDifficulty++;
        this.winStreak = 0; // 重置连胜计数
      }
    }
  }
  
  /**
   * 记录失败
   */
  recordLoss() {
    this.loseStreak++;
    this.winStreak = 0; // 重置连胜
    
    // 连败达到阈值，降低难度
    if (this.loseStreak >= this.streakThreshold) {
      if (this.baseDifficulty > this.minDifficulty) {
        this.baseDifficulty--;
        this.loseStreak = 0; // 重置连败计数
      }
    }
  }
  
  /**
   * 获取当前生效的难度
   * @returns {string} 'easy' | 'normal' | 'hard'
   */
  getEffectiveDifficulty() {
    return this.diffList[this.baseDifficulty];
  }
  
  /**
   * 获取当前难度索引
   * @returns {number} 0-2
   */
  getDifficultyIndex() {
    return this.baseDifficulty;
  }
  
  /**
   * 手动设置难度（用于测试或用户覆盖）
   * @param {number} index 0-2
   */
  setDifficulty(index) {
    this.baseDifficulty = Math.max(this.minDifficulty, Math.min(this.maxDifficulty, index));
    this.winStreak = 0;
    this.loseStreak = 0;
  }
  
  /**
   * 记录完成一局游戏
   */
  recordGame() {
    this.gamesPlayed++;
  }
  
  /**
   * 获取AI开火冷却倍率
   * @returns {number} 保护期内返回1.5，否则返回1.0
   */
  getFireCDMultiplier() {
    return this.gamesPlayed < this.protectionGames ? this.fireCooldownMultiplier : 1.0;
  }
  
  /**
   * 检查是否在新手保护期
   * @returns {boolean}
   */
  isNewPlayer() {
    return this.gamesPlayed < this.protectionGames;
  }
  
  /**
   * 重置所有状态
   */
  reset() {
    this.winStreak = 0;
    this.loseStreak = 0;
    this.baseDifficulty = 1;
    this.gamesPlayed = 0;
  }
};
