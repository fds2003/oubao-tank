'use strict';
// 核心战斗常量已集中至 utils.js（TANK_SIZE/BULLET_SPEED/HP_MAX 等）

function drawTankBody(ctx,x,y,dirKey,color,tread,recoil,turretAngle){
 ctx.save();
 ctx.translate(x,y);
 // 1. 底盘与履带（随车身移动朝向旋转）
 ctx.save();
 ctx.rotate(DIRS[dirKey].a);
 ctx.fillStyle='#20242c';
 rr(ctx,-22,-20,44,10,4);ctx.fill();
 rr(ctx,-22,10,44,10,4);ctx.fill();
 ctx.fillStyle='#454d5c';
 const off=tread%8;
 for(let o=-22+off;o<20;o+=8){
  ctx.fillRect(o,-19,4,8);
  ctx.fillRect(o,11,4,8);
 }
 ctx.fillStyle=shade(color,0.95);
 rr(ctx,-16,-14,32,28,5);ctx.fill();
 ctx.strokeStyle=shade(color,0.5);
 ctx.lineWidth=2;
 rr(ctx,-16,-14,32,28,5);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,0.14)';
 ctx.fillRect(-14,-12,28,4);
 ctx.restore();

 // 2. 独立炮塔与主炮（随炮塔朝向 turretAngle 旋转）
 const tAngle=turretAngle!==undefined?turretAngle:DIRS[dirKey].a;
 ctx.save();
 ctx.rotate(tAngle);
 ctx.fillStyle='#2c313b';
 ctx.fillRect(10,-3,Math.max(8,20-recoil),6);
 ctx.fillStyle=shade(color,1.25);
 ctx.fillRect(10+Math.max(8,20-recoil)-1,-4,5,8);
 ctx.fillStyle=shade(color,0.72);
 ctx.beginPath();ctx.arc(-2,0,7,0,7);ctx.fill();
 ctx.strokeStyle=shade(color,1.2);
 ctx.lineWidth=1.5;ctx.stroke();
 ctx.strokeStyle=shade(color,1.4);
 ctx.lineWidth=2.5;
 ctx.beginPath();ctx.moveTo(12,-6);ctx.lineTo(18,0);ctx.lineTo(12,6);ctx.stroke();
 ctx.restore();

 ctx.restore();
}
function separateTanks(a,b){
 if(!a.alive||!b.alive)return;
 const dx=b.x-a.x,dy=b.y-a.y;
 const ox=TANK_SIZE*1.1-Math.abs(dx),oy=TANK_SIZE*1.1-Math.abs(dy);
 if(ox<=0||oy<=0)return;
 const ax=a.x,ay=a.y,bx=b.x,by=b.y;
 if(ox<oy){
  const s=(dx>=0?1:-1)*ox/2;
  a.x-=s;b.x+=s;
 }else{
  const s=(dy>=0?1:-1)*oy/2;
  a.y-=s;b.y+=s;
 }
 a.x=clamp(a.x,TANK_HALF,FIELD_W-TANK_HALF);
 a.y=clamp(a.y,TANK_HALF,FIELD_H-TANK_HALF);
 b.x=clamp(b.x,TANK_HALF,FIELD_W-TANK_HALF);
 b.y=clamp(b.y,TANK_HALF,FIELD_H-TANK_HALF);
 // 智能分离：只回退卡住的那一方，避免双方都回退导致永久卡住
 if(!a.fits(a.x,a.y)&&!b.fits(b.x,b.y)){a.x=ax;a.y=ay;b.x=bx;b.y=by;}
 else if(!a.fits(a.x,a.y)){a.x=ax;a.y=ay;}
 else if(!b.fits(b.x,b.y)){b.x=bx;b.y=by;}
}
class Tank{
 constructor(id,cfg,game,tankClass){
  this.id=id;this.game=game;
  this.x=cfg.c*CELL+CELL/2;this.y=cfg.r*CELL+CELL/2;
  this.dirKey=cfg.face;
  this.turretAngle=DIRS[cfg.face]?DIRS[cfg.face].a:0;
  this.color=cfg.color;this.name=cfg.name;this.keys=cfg.keys;
  // 阵营：0=玩家阵营(含协作队友), 1=敌方。双人对战(id=1)互为敌方
  this.team=(id===0||(id===1&&game.gameMode===2))?0:1;
  this.isPlayer=this.team===0;
  this.collectedPowerups=[];
  // 应用车型属性
  const cls=getTankClass(tankClass||'medium');
  this.tankClass=tankClass||'medium';
  this.hp=cls.hp;this.maxHp=cls.hp;
  this.baseSpeed=cls.speed;this.baseDamage=cls.damage;
  this.baseCooldown=cls.cooldown;this.scale=cls.scale;
  this.pierce=cls.pierce||false;
  this.alive=true;this.ai=null;
  this.cool=0;this.recoil=0;this.tread=0;this.invuln=2;
  this.stats=this.game.matchStats[id];
   this.buff={shield:0,speed:0,rapid:0,power:0,freeze:0,ghost:0,mega:0,scatter:0,slow:0};
  this.inGrass=false;
   this._lastBuffKeys=[];
 }
 get dir(){return DIRS[this.dirKey];}
 get face(){return this.dirKey;}
   fits(x,y){
    const l=x-TANK_HALF,t=y-TANK_HALF,r=x+TANK_HALF,b=y+TANK_HALF;
    if(l<0||t<0||r>=FIELD_W||b>=FIELD_H)return false;
    if(this.buff.ghost>0)return true;
    const c0=Math.floor(l/CELL),c1=Math.floor((r-EPS)/CELL);
    const r0=Math.floor(t/CELL),r1=Math.floor((b-EPS)/CELL);
    for(let cc=c0;cc<=c1;cc++)for(let cr=r0;cr<=r1;cr++)
     if(this.game.world.solidTank(cc,cr))return false;
    return true;
 }
 turn(want){
  const vert=want==='up'||want==='down';
  const target=v=>Math.round((v-CELL/2)/CELL)*CELL+CELL/2;
  const sx=this.x,sy=this.y;
  if(vert)this.x=target(this.x);else this.y=target(this.y);
  if(!this.fits(this.x,this.y)){this.x=sx;this.y=sy;}
  this.dirKey=want;
  if(!(this.game&&this.game.gameMode===5&&this.isPlayer)){
   this.turretAngle=DIRS[want].a;
  }
 }
 tryMove(dx,dy){
  const nx=this.x+dx,ny=this.y+dy;
  if(!this.fits(nx,ny))return false;
  this.x=nx;this.y=ny;
  return true;
 }
  fire(){
   const angle=this.turretAngle!==undefined?this.turretAngle:DIRS[this.dirKey].a;
   const dirX=Math.cos(angle),dirY=Math.sin(angle);
   const nx=this.x+dirX*(TANK_HALF+9),ny=this.y+dirY*(TANK_HALF+9);
   const heavy=this.buff.power>0,rapid=this.buff.rapid>0,scatter=this.buff.scatter>0,mega=this.buff.mega>0;
   const megaDmg=mega?1.2:1;
   const baseDmg=this.baseDamage||NORMAL_DMG;
   const baseCd=this.baseCooldown||COOLDOWN;
   // 应用组合伤害加成
   let comboDmgMult=1;
   if(this.game.comboSystem){
    if(this.game.comboSystem.hasCombo('boss'))comboDmgMult=1.5;
    else if(this.game.comboSystem.hasCombo('icefire'))comboDmgMult=1.3;
    else if(this.game.comboSystem.hasCombo('ghost_combo'))comboDmgMult=1.2;
   }
   if(scatter){
    const spread=[-0.35,0,0.35];
    for(const off of spread){
     const a=angle+off;
     const bx=this.x+Math.cos(a)*(TANK_HALF+9);
     const by=this.y+Math.sin(a)*(TANK_HALF+9);
     const dirKey2=off===0?this.dirKey:(off<0?'left':'right');
     this.game.bullets.push(new Bullet(this,bx,by,dirKey2,{damage:baseDmg*megaDmg*comboDmgMult,big:false,angle:a}));
    }
    this.cool=RAPID_CD;this.recoil=4;
   }else{
    this.game.bullets.push(new Bullet(this,nx,ny,this.dirKey,{
     damage:(heavy?HEAVY_DMG:baseDmg)*megaDmg*comboDmgMult,big:heavy||rapid,angle:angle
    }));
    this.cool=rapid?RAPID_CD:baseCd;this.recoil=heavy?6:4;
   }
  this.stats.shots++;
  this.game.parts.muzzleBlast(nx,ny,this.dirKey,this.color,heavy||scatter);
  // 抛壳粒子：从炮管后方弹出金色弹壳
  const shellX=this.x-dirX*12,shellY=this.y-dirY*12;
  this.game.parts.spark(shellX,shellY,'#daa520',1,80);
  this.game.addShake(heavy?3.5:1.8);
  if(this.isPlayer)Input.vibrate(this.id,70,0.15,0.25);
  if(heavy)AudioSys.heavyShoot();else AudioSys.shoot();
 }
 takeDamage(dmg,attacker,game){
  if(!this.alive)return;
  if(this.invuln>0){
   game.parts.spark(this.x,this.y,'#cfd8ea',4,120);
   return;
  }
  if(this.buff.shield>0){
   AudioSys.shieldHit();
   game.parts.shieldImpact(this.x,this.y);
   return;
  }
   const real=Math.min(dmg,this.hp);
   this.hp-=real;
   if(attacker&&attacker.alive){
    attacker.stats.hits++;attacker.stats.dmg+=real;
    if(attacker.isPlayer&&game.triggerHitmarker)game.triggerHitmarker();
   }
   const hitDir=attacker?{x:this.x-attacker.x,y:this.y-attacker.y}:null;
   game.parts.hitImpact(this.x,this.y,this.color,real,hitDir);
    game.parts.text(this.x,this.y-30,'-'+real,'#ff8585',18+real*0.06);
  AudioSys.thud();
  if(this.isPlayer)Input.vibrate(this.id,200,0.4,0.7);
  // 玩家受伤时触发屏幕闪红
  if(this.id===0)game.triggerDamageFlash();
  if(this.hp<=0){
   this.hp=0;this.alive=false;
   if(attacker&&attacker.alive&&attacker.stats)attacker.stats.kills=(attacker.stats.kills||0)+1;
   game.parts.explosion(this.x,this.y,this.color);
   AudioSys.boom();
   game.addShake(7);
  }else{
   game.addShake(2);
  }
 }
 update(dt){
  for(const k in this.buff)this.buff[k]=Math.max(0,this.buff[k]-dt);
  this.invuln=Math.max(0,this.invuln-dt);
  this.cool-=dt;
  this.recoil=Math.max(0,this.recoil-dt*26);
  // 同步组合系统：添加新buff / 移除过期buff
   if(this.game.comboSystem){
    const curKeys=[];
    for(const k in this.buff)if(this.buff[k]>0)curKeys.push(k);
    for(const k of this._lastBuffKeys){
     if(curKeys.indexOf(k)===-1)this.game.comboSystem.removeBuff(k);
    }
    for(const k of curKeys)this.game.comboSystem.addBuff(k,this.buff[k]);
    this._lastBuffKeys=curKeys;
   }
  if(!this.alive)return;
  if(this.buff.freeze>0){
   if(chance(dt*7))this.game.parts.snow(this.x,this.y);
   return;
  }
    let want=null;let firing=false;
    const padIdx=this.id<=1?this.id:0;
    const padDir=this.isPlayer?Input.getGamepadDir(padIdx):null;
    const padFire=this.isPlayer?Input.getGamepadFire(padIdx):false;
    const padAim=this.isPlayer?Input.getGamepadAimAngle(padIdx):null;
    if(this.ai){
     this.ai.update(dt);
     const cmd=this.ai.getCommand();want=cmd.dir;firing=cmd.fire;
   }else if(this.game&&this.game.gameMode===5&&this.isPlayer){
    // 车长同乘模式：P1 键盘/手柄驾驶，P2 鼠标/手柄瞄准与开火
    const k=this.keys;
    if(Input.down(k.up))want='up';
    else if(Input.down(k.down))want='down';
    else if(Input.down(k.left))want='left';
    else if(Input.down(k.right))want='right';
    if(padDir)want=padDir;
    if(padAim!==null){
     this.turretAngle=padAim;
    }else{
     const canvasTankX=this.x+FIELD_X;
     const canvasTankY=this.y+FIELD_Y;
     const m=Input.mouse;
     const dx=m.x-canvasTankX,dy=m.y-canvasTankY;
     if(dx!==0||dy!==0){
      this.turretAngle=Math.atan2(dy,dx);
     }
    }
    firing=Input.down(...k.fire)||Input.down('Enter','KeyL')||Input.mouseDown()||padFire;
   }else{
    const k=this.keys;
    if(Input.down(k.up))want='up';
    else if(Input.down(k.down))want='down';
    else if(Input.down(k.left))want='left';
    else if(Input.down(k.right))want='right';
    if(padDir)want=padDir;
    if(padAim!==null)this.turretAngle=padAim;
    firing=Input.down(...k.fire)||padFire;
   }
   if(want&&want!==this.dirKey)this.turn(want);
   let moved=false;
    if(want){
     const d=DIRS[want];
     const baseSpd=this.baseSpeed||TANK_SPEED;
     let spd=this.buff.speed>0?SPEED_BOOSTED:baseSpd;
     if(this.buff.slow>0)spd*=0.4;
     // 闪电战组合(speed+rapid)：额外速度加成
     if(this.game&&this.game.comboSystem){
      const lEff=this.game.comboSystem.getEffect('lightning');
      if(lEff&&lEff.speedMultiplier)spd*=lEff.speedMultiplier;
     }
     moved=this.tryMove(d.x*spd*dt,d.y*spd*dt);
    }
    if(moved)this.tread+=dt*(this.buff.speed>0?SPEED_BOOSTED:(this.baseSpeed||TANK_SPEED));
    const cap=Math.max(1,(this.buff.rapid>0?RAPID_BULLETS:MAX_BULLETS)-(this.buff.scatter>0?2:0));
   if(firing&&this.cool<=0){
    let mine=0;
    for(const b of this.game.bullets)if(b.owner===this&&!b.dead)mine++;
    if(mine<cap)this.fire();
   }
 }
  draw(ctx,time,dt){
   if(!this.alive)return;
   ctx.save();
   ctx.globalAlpha=1;
   // 草丛隐蔽：在草丛中半透明
   if(this.game&&this.game.world){
    const gc=Math.floor(this.x/CELL),gr=Math.floor(this.y/CELL);
    if(gc>=0&&gc<COLS&&gr>=0&&gr<ROWS&&this.game.world.at(gc,gr)==='G'){
     ctx.globalAlpha=0.35;
     this.inGrass=true;
    }else{this.inGrass=false;}
   }
   if(this.invuln>0&&Math.floor(time*12)%2===0)ctx.globalAlpha=0.35;
   const megaOn=this.buff.mega>0;
   const tankScale=this.scale||1;
   const finalScale=megaOn?1.25:tankScale;
   ctx.translate(this.x,this.y);ctx.scale(finalScale,finalScale);
   drawTankBody(ctx,0,0,this.dirKey,this.color,this.tread,this.recoil,this.turretAngle);
   ctx.restore();
  if(this.buff.ghost>0){
   ctx.save();ctx.globalAlpha=0.18;
   drawTankBody(ctx,this.x-12,this.y-8,this.dirKey,this.color,this.tread,this.recoil,this.turretAngle);
   ctx.globalAlpha=0.12;
   drawTankBody(ctx,this.x+12,this.y+8,this.dirKey,this.color,this.tread,this.recoil,this.turretAngle);
   ctx.restore();
   ctx.save();ctx.globalAlpha=0.25;
   ctx.strokeStyle='#c89dff';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.lineDashOffset=-time*30;
   rr(ctx,this.x-TANK_HALF-4,this.y-TANK_HALF-4,TANK_SIZE+8,TANK_SIZE+8,10);ctx.stroke();
   ctx.restore();
  }
  if(this.buff.freeze>0){
   ctx.fillStyle='rgba(165,214,255,0.42)';
   rr(ctx,this.x-TANK_HALF,this.y-TANK_HALF,TANK_SIZE,TANK_SIZE,6);ctx.fill();
   ctx.strokeStyle='rgba(230,245,255,0.85)';ctx.lineWidth=1.5;
   rr(ctx,this.x-TANK_HALF,this.y-TANK_HALF,TANK_SIZE,TANK_SIZE,6);ctx.stroke();
  }
  if(this.buff.shield>0){
   ctx.save();ctx.translate(this.x,this.y);ctx.rotate(time*1.6);
   ctx.strokeStyle='#4dd2ff';ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.lineDashOffset=-time*40;
   ctx.beginPath();ctx.arc(0,0,30,0,7);ctx.stroke();ctx.restore();
  }
  if(megaOn){
   ctx.save();ctx.translate(this.x,this.y);ctx.rotate(time*2);
   ctx.strokeStyle='rgba(255,85,85,0.35)';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.stroke();ctx.restore();
  }
  const bw=44,bh=6,bx=this.x-bw/2,by=this.y-TANK_HALF-14;
  ctx.fillStyle='rgba(10,13,18,0.8)';
  rr(ctx,bx-1,by-1,bw+2,bh+2,2);ctx.fill();
  const frac=Math.min(1,this.hp/(this.maxHp||HP_MAX));
  ctx.fillStyle=frac>0.5?this.color:(frac>0.25?'#ffd23f':'#ff5555');
  if(frac>0)ctx.fillRect(bx,by,bw*frac,bh);
  // 战损视觉效果
  if(this.game&&this.game.parts){
   if(frac<=CONFIG.SMOKE_HEAVY_BELOW&&frac>0&&chance(dt*3)){
    // HP<20%：火焰+黑烟
    this.game.parts.spark(this.x+rand(-6,6),this.y-10,'#ff6600',2,60);
    this.game.parts.smoke(this.x+rand(-8,8),this.y+rand(-8,8),2);
   }else if(frac<=CONFIG.SMOKE_LIGHT_BELOW&&frac>CONFIG.SMOKE_HEAVY_BELOW&&chance(dt*2)){
    // HP<50%：灰烟
    this.game.parts.smoke(this.x+rand(-6,6),this.y-10,1);
   }
  }
 }
}
