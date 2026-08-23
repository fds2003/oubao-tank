'use strict';
const TANK_SIZE=42,TANK_HALF=21;
const TANK_SPEED=180,SPEED_BOOSTED=270;
const BULLET_SPEED=430;
const NORMAL_DMG=35,HEAVY_DMG=55;
const COOLDOWN=0.4,RAPID_CD=0.18;
const MAX_BULLETS=2,RAPID_BULLETS=4;
const HP_MAX=100;

function drawTankBody(ctx,x,y,dirKey,color,tread,recoil){
 ctx.save();
 ctx.translate(x,y);
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
 if(!a.fits(a.x,a.y)||!b.fits(b.x,b.y)){a.x=ax;a.y=ay;b.x=bx;b.y=by;}
}
class Tank{
 constructor(id,cfg,game){
  this.id=id;this.game=game;
  this.x=cfg.c*CELL+CELL/2;this.y=cfg.r*CELL+CELL/2;
  this.dirKey=cfg.face;
  this.color=cfg.color;this.name=cfg.name;this.keys=cfg.keys;
  this.hp=HP_MAX;this.alive=true;this.ai=null;
  this.cool=0;this.recoil=0;this.tread=0;this.invuln=2;
  this.stats=this.game.matchStats[id];
  this.buff={shield:0,speed:0,rapid:0,power:0,freeze:0,ghost:0,mega:0,scatter:0};
  this.buffMax={shield:1,speed:1,rapid:1,power:1,freeze:1,ghost:1,mega:1,scatter:1};
 }
 get dir(){return DIRS[this.dirKey];}
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
 }
 tryMove(dx,dy){
  const nx=this.x+dx,ny=this.y+dy;
  if(!this.fits(nx,ny))return false;
  this.x=nx;this.y=ny;
  return true;
 }
  fire(){
   const d=this.dir;
   const nx=this.x+d.x*(TANK_HALF+9),ny=this.y+d.y*(TANK_HALF+9);
   const heavy=this.buff.power>0,rapid=this.buff.rapid>0,scatter=this.buff.scatter>0,mega=this.buff.mega>0;
   const megaDmg=mega?1.2:1;
   if(scatter){
    const baseAngle=Math.atan2(d.y,d.x);
    const spread=[-0.35,0,0.35];
    for(const off of spread){
     const a=baseAngle+off;
     const bx=this.x+Math.cos(a)*(TANK_HALF+9);
     const by=this.y+Math.sin(a)*(TANK_HALF+9);
     const dirKey2=off===0?this.dirKey:(off<0?'left':'right');
     this.game.bullets.push(new Bullet(this,bx,by,dirKey2,{damage:NORMAL_DMG*megaDmg,big:false,angle:a}));
    }
    this.cool=RAPID_CD;this.recoil=4;
   }else{
    this.game.bullets.push(new Bullet(this,nx,ny,this.dirKey,{
     damage:(heavy?HEAVY_DMG:NORMAL_DMG)*megaDmg,big:heavy||rapid
    }));
    this.cool=rapid?RAPID_CD:COOLDOWN;this.recoil=heavy?6:4;
   }
  this.stats.shots++;
  this.game.parts.muzzleBlast(nx,ny,this.dirKey,this.color,heavy||scatter);
  this.game.addShake(heavy?3.5:1.8);
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
   if(attacker&&attacker.alive){attacker.stats.hits++;attacker.stats.dmg+=real;}
   const hitDir=attacker?{x:this.x-attacker.x,y:this.y-attacker.y}:null;
   game.parts.hitImpact(this.x,this.y,this.color,real,hitDir);
    game.parts.text(this.x,this.y-30,'-'+real,'#ff8585',18+real*0.06);
  AudioSys.thud();
  if(this.hp<=0){
   this.hp=0;this.alive=false;
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
  if(!this.alive)return;
  if(this.buff.freeze>0){
   if(chance(dt*7))this.game.parts.snow(this.x,this.y);
   return;
  }
    let want=null;let firing=false;
    if(this.ai){
     this.ai.update(dt);
     const cmd=this.ai.getCommand();want=cmd.dir;firing=cmd.fire;
   }else{
    const k=this.keys;
    if(Input.down(k.up))want='up';
    else if(Input.down(k.down))want='down';
    else if(Input.down(k.left))want='left';
    else if(Input.down(k.right))want='right';
    firing=Input.down(...k.fire);
   }
   if(want&&want!==this.dirKey)this.turn(want);
   let moved=false;
    if(want){
     const d=DIRS[want];
     let spd=this.buff.speed>0?SPEED_BOOSTED:TANK_SPEED;
     if(this.buff.slow>0)spd*=0.4;
     moved=this.tryMove(d.x*spd*dt,d.y*spd*dt);
    }
    if(moved)this.tread+=dt*(this.buff.speed>0?SPEED_BOOSTED:TANK_SPEED);
    const cap=Math.max(1,(this.buff.rapid>0?RAPID_BULLETS:MAX_BULLETS)-(this.buff.scatter>0?2:0));
   if(firing&&this.cool<=0){
    let mine=0;
    for(const b of this.game.bullets)if(b.owner===this&&!b.dead)mine++;
    if(mine<cap)this.fire();
   }
 }
  draw(ctx,time){
   if(!this.alive)return;
   ctx.save();
   if(this.invuln>0&&Math.floor(time*12)%2===0)ctx.globalAlpha=0.35;
   const megaOn=this.buff.mega>0;
   if(megaOn){
    ctx.translate(this.x,this.y);ctx.scale(1.25,1.25);
    drawTankBody(ctx,0,0,this.dirKey,this.color,this.tread,this.recoil);
   }else{
    drawTankBody(ctx,this.x,this.y,this.dirKey,this.color,this.tread,this.recoil);
   }
   ctx.restore();
  if(this.buff.ghost>0){
   ctx.save();ctx.globalAlpha=0.18;
   drawTankBody(ctx,this.x-12,this.y-8,this.dirKey,this.color,this.tread,this.recoil);
   ctx.globalAlpha=0.12;
   drawTankBody(ctx,this.x+12,this.y+8,this.dirKey,this.color,this.tread,this.recoil);
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
  const frac=Math.min(1,this.hp/HP_MAX);
  ctx.fillStyle=frac>0.5?this.color:(frac>0.25?'#ffd23f':'#ff5555');
  if(frac>0)ctx.fillRect(bx,by,bw*frac,bh);
 }
}
