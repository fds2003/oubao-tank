'use strict';
const VIEW_W=1600,VIEW_H=900;
const CELL=55,COLS=22,ROWS=13;
const FIELD_W=COLS*CELL,FIELD_H=ROWS*CELL;
const FIELD_X=Math.floor((VIEW_W-FIELD_W)/2),FIELD_Y=88;
const EPS=0.01;
const FONT="'Segoe UI','Microsoft YaHei',sans-serif";
const DIRS={
 up:{x:0,y:-1,a:-Math.PI/2},
 down:{x:0,y:1,a:Math.PI/2},
 left:{x:-1,y:0,a:Math.PI},
 right:{x:1,y:0,a:0}
};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
// ---- 核心战斗常量（原 tank.js，集中管理；全项目引用名不变） ----
const TANK_SIZE=42,TANK_HALF=21;
const TANK_SPEED=180,SPEED_BOOSTED=270;
const BULLET_SPEED=430;
const NORMAL_DMG=35,HEAVY_DMG=55;
const COOLDOWN=0.4,RAPID_CD=0.18;
const MAX_BULLETS=2,RAPID_BULLETS=4;
const HP_MAX=100;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const randInt=(a,b)=>Math.floor(rand(a,b+1));
const chance=p=>Math.random()<p;
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
function rr(ctx,x,y,w,h,r){
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);
 ctx.arcTo(x,y,x+w,y,r);
 ctx.closePath();
}
function shade(hex,f){
 const n=parseInt(hex.slice(1),16);
 let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 r=clamp(Math.round(r*f),0,255);
 g=clamp(Math.round(g*f),0,255);
 b=clamp(Math.round(b*f),0,255);
 return 'rgb('+r+','+g+','+b+')';
}
function cellRand(c,r,n){
 const s=Math.sin(c*127.1+r*311.7+n*74.7)*43758.5453;
 return s-Math.floor(s);
}
const CONFIG={
 BULLET_HIT_RANGE:26, // TANK_HALF(21)+5
 POWERUP_PICKUP_RANGE:34,
 POWERUP_SPAWN_MIN_DIST:180,
 POWERUP_MIN_SPACING:55,
 POWERUP_DURATION:8,
 POWERUP_INITIAL_MIN:4,POWERUP_INITIAL_MAX:6,
 POWERUP_INTERVAL_MIN:5,POWERUP_INTERVAL_MAX:8,
 HEAL_AMOUNT:40,
 MEGA_HP_BONUS:50,MEGA_DURATION:10,
 EMP_SLOW_DURATION:3,
 MINE_LIFE:18,MINE_ARM_TIME:0.8,MINE_DAMAGE:50,
 AI_DODGE_RANGE:80,AI_SEEK_RANGE:200,AI_LOS_STEP:0.4,
 AI_ESCORT_ATTACK_RANGE:400, // 护送模式：运输车在此范围内成为AI优先目标
 TRACK_MARK_CHANCE:0.15,TRACK_MARK_LIFE:6,TRACK_MARK_ALPHA:0.25, // 履带压痕
 SMOKE_HEAVY_BELOW:0.2,SMOKE_LIGHT_BELOW:0.5, // 战损冒烟HP阈值（重烟/轻烟）
 TRANSPORT_HIT_HALF_W:22,TRANSPORT_HIT_HALF_H:14, // 运输车碰撞半宽/半高
  GAMEPAD_DEADZONE:0.25, // 手柄摇杆死区阈值
  SHAKE_MAX:10,          // 震屏最大强度
  DAMAGE_FLASH_TIME:0.3, // 受伤闪红持续时间
  HITMARKER_TIME:0.18,   // 命中标记持续时间
  COUNTDOWN_TIME:3,      // 回合倒计时秒数
  WIN_ROUNDS:5
};
