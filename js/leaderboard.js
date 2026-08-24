/**
 * leaderboard.js - 家庭排行榜
 * localStorage持久化，支持多玩家
 */
var Leaderboard = (function(){

 function genId() {
  return '_' + Math.random().toString(36).substr(2, 9);
 }

 class Leaderboard {
  constructor() {
   this.players = [];
   this._load();
  }

  _load() {
   try {
    const raw = localStorage.getItem('oubao_leaderboard');
    if (raw) {
     const data = JSON.parse(raw);
     this.players = data.players || [];
    }
   } catch(e) {}
  }

  _save() {
   try {
    localStorage.setItem('oubao_leaderboard', JSON.stringify({ players: this.players }));
   } catch(e) {}
  }

  addPlayer(name, avatar) {
   // 防重复
   for (const p of this.players) {
    if (p.name === name) return p;
   }
   const player = {
    id: genId(),
    name: name,
    avatar: avatar || '🎮',
    wins: 0,
    games: 0,
    kills: 0,
    bestAccuracy: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,
   };
   this.players.push(player);
   this._save();
   return player;
  }

  removePlayer(id) {
   this.players = this.players.filter(p => p.id !== id);
   this._save();
  }

  getPlayer(id) {
   return this.players.find(p => p.id === id) || null;
  }

  /**
   * 记录游戏结果
   * @param {string} playerId
   * @param {Object} result - { won, kills, accuracy }
   */
  recordResult(playerId, result) {
   const p = this.getPlayer(playerId);
   if (!p) return;

   p.games++;
   p.kills += (result.kills || 0);

   if (result.won) {
    p.wins++;
    p.currentWinStreak++;
    if (p.currentWinStreak > p.bestWinStreak) {
     p.bestWinStreak = p.currentWinStreak;
    }
   } else {
    p.currentWinStreak = 0;
   }

   if (result.accuracy > p.bestAccuracy) {
    p.bestAccuracy = result.accuracy;
   }

   this._save();
  }

  /**
   * 获取按胜场排序的排名
   * @returns {Object[]}
   */
  getRanked() {
   return this.players.slice().sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.bestAccuracy - a.bestAccuracy;
   });
  }

  export() {
   return JSON.stringify({ players: this.players });
  }

  import(jsonStr) {
   try {
    const data = JSON.parse(jsonStr);
    this.players = data.players || [];
    this._save();
   } catch(e) {}
  }

  reset() {
   this.players = [];
   this._save();
  }
 }

 return Leaderboard;
})();
