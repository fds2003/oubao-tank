'use strict';

/**
 * 车型系统
 * TANK_CLASSES - 定义4种坦克类型及其属性
 */

var TANK_CLASSES = {
  scout: {
    name: '轻型坦克',
    icon: '🚗',
    color: '#4ade80',
    hp: 70,
    speed: 240,
    damage: 25,
    cooldown: 0.3,
    scale: 0.85,
    pierce: false,
    description: '高速侦察型，适合抢道具和骚扰'
  },
  medium: {
    name: '中型坦克',
    icon: '🚙',
    color: '#60a5fa',
    hp: 100,
    speed: 180,
    damage: 35,
    cooldown: 0.4,
    scale: 1.0,
    pierce: false,
    description: '均衡型，适合各种战术'
  },
  heavy: {
    name: '重型坦克',
    icon: '🚛',
    color: '#f97316',
    hp: 150,
    speed: 140,
    damage: 45,
    cooldown: 0.5,
    scale: 1.2,
    pierce: false,
    description: '装甲型，适合推进和掩护'
  },
  assault: {
    name: '突击炮',
    icon: '💥',
    color: '#ef4444',
    hp: 80,
    speed: 160,
    damage: 60,
    cooldown: 0.8,
    scale: 1.0,
    pierce: true,
    description: '高爆发型，子弹可穿墙'
  }
};

/**
 * 获取车型信息
 * @param {string} name - 车型名称
 * @returns {Object} 车型配置对象
 */
var getTankClass = function(name) {
  return TANK_CLASSES[name] || TANK_CLASSES.medium;
};

/**
 * 获取所有车型名称列表
 * @returns {string[]}
 */
var getTankClassList = function() {
  return Object.keys(TANK_CLASSES);
};

/**
 * AI选车逻辑
 * @param {string} difficulty - AI难度
 * @param {string} playerClass - 玩家车型（可选）
 * @returns {string} 车型名称
 */
var selectAITankClass = function(difficulty, playerClass) {
  var classes = getTankClassList();
  
  if (difficulty === 'easy') {
    // 简单AI随机选车
    return classes[randInt(0, classes.length - 1)];
  }
  
  if (difficulty === 'normal') {
    // 普通AI根据玩家车型选择克制车型
    if (playerClass === 'heavy') return 'assault';  // 重克重
    if (playerClass === 'scout') return 'heavy';    // 重克轻
    if (playerClass === 'assault') return 'scout';  // 轻克突
    return 'medium';
  }
  
  if (difficulty === 'hard') {
    // 困难AI针对性选车
    if (playerClass === 'heavy') return 'assault';
    if (playerClass === 'scout') return 'heavy';
    if (playerClass === 'assault') return 'scout';
    // 默认选重型（最强）
    return 'heavy';
  }
  
  return 'medium';
};
