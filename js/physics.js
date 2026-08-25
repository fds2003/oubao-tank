/**
 * physics.js - 物理系统
 * 跳弹机制 + 弱点机制（背部暴击/侧面履带）
 */
var Physics = (function(){
 // 方向向量映射
 const FACE_VEC = {
  right: {x:1,y:0},
  left:  {x:-1,y:0},
  up:    {x:0,y:-1},
  down:  {x:0,y:1}
 };

 class Physics {
  constructor() {
   this.RICOCHET_ANGLE = 65;    // 跳弹触发角度（度）
   this.RICOCHET_DMG_MULT = 0.3; // 跳弹伤害倍率
   this.BACK_HIT_MULT = 1.5;    // 背部暴击倍率
   this.BACK_HIT_ANGLE = 120;   // 背部判定角度（度）
   this.TRACK_STUN_CHANCE = 0.3; // 断履带概率
   this.TRACK_STUN_DUR = 1.5;   // 断履带持续时间
  }

  /**
   * 计算入射角度（0°=正面，180°=背面，90°=侧面）
   * @param {Object} tank - 坦克 {x,y,face}
   * @param {Object} bulletPos - 子弹位置 {x,y}
   * @returns {number} 角度（度）
   */
  getImpactAngle(tank, bulletPos) {
   const face = FACE_VEC[tank.face] || FACE_VEC.right;
   const dx = bulletPos.x - tank.x;
   const dy = bulletPos.y - tank.y;
   const len = Math.sqrt(dx*dx + dy*dy);
   if (len === 0) return 0;
   const dot = (dx/len) * face.x + (dy/len) * face.y;
   return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
  }

  /**
   * 判断是否触发跳弹
   */
  shouldRicochet(impactAngle) {
   return impactAngle > this.RICOCHET_ANGLE;
  }

  /**
   * 计算跳弹后的伤害
   */
  getRicochetDamage(baseDamage) {
   return Math.round(baseDamage * this.RICOCHET_DMG_MULT);
  }

  /**
   * 计算跳弹方向（反射）
   */
  getRicochetDir(bulletDir, tankNormal) {
   // 反射公式：r = d - 2(d·n)n
   const dot = bulletDir.x * tankNormal.x + bulletDir.y * tankNormal.y;
   return {
    x: bulletDir.x - 2 * dot * tankNormal.x,
    y: bulletDir.y - 2 * dot * tankNormal.y
   };
  }

  /**
   * 判断是否命中背部
   */
  isBackHit(tank, hitPos) {
   const angle = this.getImpactAngle(tank, hitPos);
   return angle > (180 - this.BACK_HIT_ANGLE / 2); // 大于120°=背部
  }

  /**
   * 计算背部暴击伤害
   */
  getBackHitDamage(baseDamage) {
   return Math.round(baseDamage * this.BACK_HIT_MULT);
  }

  /**
   * 判断是否命中侧面履带区域
   */
  isTrackHit(tank, hitPos) {
   const angle = this.getImpactAngle(tank, hitPos);
   return angle > 60 && angle < 120; // 侧面区域
  }

  /**
   * 检查是否触发断履带
   */
  checkTrackStun() {
   return Math.random() < this.TRACK_STUN_CHANCE;
  }

  /**
   * 综合伤害计算
   * @param {Object} tank - 被击中的坦克
   * @param {Object} hitPos - 命中位置
   * @param {number} baseDamage - 基础伤害
   * @returns {Object} { damage, isRicochet, isBackHit, isTrackStun }
   */
  calculateDamage(tank, hitPos, baseDamage) {
   const impactAngle = this.getImpactAngle(tank, hitPos);
   let damage = baseDamage;
   let isRicochet = false;
   let isBackHit = false;
   let isTrackStun = false;

   // 优先级：背部暴击 > 侧面履带(未断则按跳弹判定) > 跳弹 > 普通
   if (this.isBackHit(tank, hitPos)) {
    damage = this.getBackHitDamage(baseDamage);
    isBackHit = true;
   } else if (this.isTrackHit(tank, hitPos)) {
    // 侧面命中：先判定断履带；未断履带且入射角>65° 仍可跳弹
    isTrackStun = this.checkTrackStun();
    if (!isTrackStun && this.shouldRicochet(impactAngle)) {
     damage = this.getRicochetDamage(baseDamage);
     isRicochet = true;
    }
   } else if (this.shouldRicochet(impactAngle)) {
    damage = this.getRicochetDamage(baseDamage);
    isRicochet = true;
   }

   return { damage, isRicochet, isBackHit, isTrackStun };
  }
 }

 return Physics;
})();
