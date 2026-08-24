'use strict';
class Bullet{
 constructor(owner,x,y,dirKey,opt){
  this.owner=owner;
  this.x=x;this.y=y;
  this.dirKey=dirKey;
  if(opt.angle!=null){
   this.dir={x:Math.cos(opt.angle),y:Math.sin(opt.angle)};
  }else{
   this.dir=DIRS[dirKey];
  }
  this.speed=opt.speed||BULLET_SPEED;
  this.damage=opt.damage;
  this.big=!!opt.big;
  this.dead=false;
  this.trailT=0;
 }
 update(dt,game){
  this.x+=this.dir.x*this.speed*dt;
  this.y+=this.dir.y*this.speed*dt;
  this.trailT+=dt;
  if(this.trailT>0.025){
   this.trailT=0;
   game.parts.trail(this.x,this.y,this.owner.color,this.dir);
  }
  const c=Math.floor(this.x/CELL),r=Math.floor(this.y/CELL);
  const t=game.world.at(c,r);
  if(t==='#'){this.dead=true;return;}
  if(t==='S'){
   AudioSys.clink();
   game.parts.spark(this.x,this.y,'#d7deea',8,240);
   game.parts.flash(this.x,this.y,14);
   game.parts.ring(this.x,this.y,'#d7deea',18,2.5,0.22);
   game.addShake(1.2);
   this.dead=true;return;
  }
  if(t==='B'){
   game.world.destroyBrick(c,r);
   game.parts.debris(this.x,this.y,'#b5502a',12,180);
   game.parts.flash(this.x,this.y,12);
   game.parts.ring(this.x,this.y,'#ffb35c',20,2,0.2);
   AudioSys.crack();
   game.addShake(1.5);
   // 突击炮穿墙：销毁砖墙后子弹继续飞行
   if(this.owner.pierce){
    return;
   }
   if(this.damage>=HEAVY_DMG){
    const nc=c+this.dir.x,nr=r+this.dir.y;
    if(game.world.at(nc,nr)==='B'){
     game.world.destroyBrick(nc,nr);
     game.parts.debris(nc*CELL+CELL/2,nr*CELL+CELL/2,'#b5502a',9,170);
    }
   }
   this.dead=true;return;
  }
  for(const tk of game.tanks){
    if(tk===this.owner||!tk.alive)continue;
    if((tk.ai===null)===(this.owner.ai===null))continue;    if(Math.abs(this.x-tk.x)<CONFIG.BULLET_HIT_RANGE&&Math.abs(this.y-tk.y)<CONFIG.BULLET_HIT_RANGE){
    // 物理系统计算伤害
    const phys=game.physics.calculateDamage(tk,{x:this.x,y:this.y},this.damage);
    if(phys.isRicochet){
     game.parts.ring(tk.x,tk.y,'#c0c8d4',16,3,0.3);
     game.parts.spark(tk.x,tk.y,'#e8edf5',8,120);
     AudioSys.clink();
     game.parts.text(tk.x,tk.y-40,'跳弹！','#c0c8d4',16);
    }else if(phys.isBackHit){
     game.parts.ring(tk.x,tk.y,'#ff5555',20,4,0.35);
     game.parts.spark(tk.x,tk.y,'#ff8888',10,140);
     AudioSys.thud();
     game.parts.text(tk.x,tk.y-40,'暴击！','#ff5555',18);
    }
    if(phys.isTrackStun){
     tk.buff.slow=1.5;tk.buffMax.slow=1.5;
     game.parts.text(tk.x,tk.y-55,'断履带！','#ffaa33',14);
    }
    tk.takeDamage(phys.damage,this.owner,game);
    this.dead=true;return;
   }
  }
  for(const b of game.bullets){
   if(b===this||b.dead||b.owner===this.owner)continue;
   if(Math.abs(b.x-this.x)<11&&Math.abs(b.y-this.y)<11){
    b.dead=true;this.dead=true;
    const mx=(b.x+this.x)/2,my=(b.y+this.y)/2;
    AudioSys.clink();
    game.parts.spark(mx,my,'#ffe9a3',10,200);
    game.parts.ring(mx,my,'#ffe9a3',20,2.5,0.28);
    game.parts.flash(mx,my,12);
    game.addShake(1.8);
    return;
   }
  }
 }
 draw(ctx){
  const c=this.owner.color;
  ctx.save();
  ctx.globalAlpha=0.25;
  ctx.fillStyle=c;
  ctx.beginPath();ctx.arc(this.x-this.dir.x*14,this.y-this.dir.y*14,this.big?5:4,0,7);ctx.fill();
  ctx.globalAlpha=0.35;
  ctx.fillStyle=c;
  ctx.beginPath();ctx.arc(this.x-this.dir.x*6,this.y-this.dir.y*6,this.big?7:5.5,0,7);ctx.fill();
  ctx.globalAlpha=0.6;
  ctx.fillStyle=this.big?'#ffe0e0':'#e8f4ff';
  ctx.beginPath();ctx.arc(this.x,this.y,this.big?6.5:5,0,7);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle=this.big?'#ffd7d7':'#eaf6ff';
  ctx.beginPath();ctx.arc(this.x,this.y,this.big?5:3,0,7);ctx.fill();
  ctx.restore();
 }
}
