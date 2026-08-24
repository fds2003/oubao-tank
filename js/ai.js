'use strict';
class AI{
 constructor(tank,game,diff){
  this.tank=tank;this.game=game;this.diff=diff;
  this.dirTimer=0;this.fireTimer=0;
  this.wantedDir=null;this.wantsFire=false;
  this._stuckTimer=0;this._lastX=tank.x;this._lastY=tank.y;
 }
 getInterval(){
  if(this.diff==='easy')return rand(1.0,1.8);
  if(this.diff==='normal')return rand(0.8,1.5);
  return rand(0.35,0.75);
 }
 getFireCD(){
  let cd;
  if(this.diff==='easy')cd=rand(0.65,1.1);
  else if(this.diff==='normal')cd=rand(0.38,0.68);
  else cd=rand(0.18,0.38);
  // 新手保护期：AI开火冷却×1.5
  if(this.game.dynamicDifficulty)cd*=this.game.dynamicDifficulty.getFireCDMultiplier();
  return cd;
 }
 getCommand(){return{dir:this.wantedDir,fire:this.wantsFire};}
  update(dt){
   this.dirTimer-=dt;this.fireTimer-=dt;
   // 卡住检测：如果位置没变，累计卡住时间
   const dx=Math.abs(this.tank.x-this._lastX),dy=Math.abs(this.tank.y-this._lastY);
   if(dx<0.5&&dy<0.5&&this.wantedDir)this._stuckTimer+=dt; else this._stuckTimer=0;
   this._lastX=this.tank.x;this._lastY=this.tank.y;
   if(this._stuckTimer>1.0){this.unstuck();this._stuckTimer=0;return;}
   if(this.dirTimer<=0){this.chooseDir();this.dirTimer=this.getInterval();}
   if(this.fireTimer<=0){this.wantsFire=true;this.fireTimer=this.getFireCD();}
   else this.wantsFire=false;
   if(this.diff==='hard')this.dodgeBullets();
   if(this.diff!=='easy')this.seekPowerups();
  }
  chooseDir(){
   let p=null;
   if(this.game.gameMode===2){
    let bestD=Infinity;
    for(const t of this.game.tanks){
     if(t.ai||!t.alive)continue;
     const d=Math.hypot(t.x-this.tank.x,t.y-this.tank.y);
     if(d<bestD){bestD=d;p=t;}
    }
   }else{
    const t=this.game.tanks[0];
    if(t.alive)p=t;
   }
   if(this.diff==='easy'){
    if(p&&chance(0.4))this.wantedDir=this.dirTo(p);
    else this.wantedDir=['up','down','left','right'][randInt(0,3)];
   }else{
    if(p&&this.hasLOS(p))this.wantedDir=this.dirTo(p);
    else this.wantedDir=['up','down','left','right'][randInt(0,3)];
   }
   if(this.isBlocked(this.wantedDir))this.wantedDir=this.openDir();
  }
 hasLOS(target){
  const dx=target.x-this.tank.x,dy=target.y-this.tank.y;   const steps=Math.ceil(Math.hypot(dx,dy)/(CELL*CONFIG.AI_LOS_STEP));
  for(let i=1;i<steps;i++){
   const f=i/steps;
   const cx=Math.floor((this.tank.x+dx*f)/CELL);
   const cy=Math.floor((this.tank.y+dy*f)/CELL);
   if(this.game.world.solidTank(cx,cy))return false;
  }
  return true;
 }
 dirTo(target){
  const dx=target.x-this.tank.x,dy=target.y-this.tank.y;
  return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
 }
 isBlocked(dir){
  if(!dir)return true;
  const d=DIRS[dir];
  return!this.tank.fits(this.tank.x+d.x*CELL*0.5,this.tank.y+d.y*CELL*0.5);
 }
  openDir(){
   const ds=['up','down','left','right'];
   for(let i=ds.length-1;i>0;i--){const j=randInt(0,i);[ds[i],ds[j]]=[ds[j],ds[i]];}
   for(const d of ds)if(!this.isBlocked(d))return d;
   return['up','down','left','right'][randInt(0,3)];
  }
  unstuck(){
   // 卡住脱困：先对齐到最近的格子中心，再尝试所有方向
   const t=this.tank;
   const snap=v=>Math.round((v-CELL/2)/CELL)*CELL+CELL/2;
   const ox=t.x,oy=t.y;
   // 尝试水平对齐
   t.x=snap(t.x);
   if(t.fits(t.x,t.y)){this.wantedDir='left';t.dirKey='left';return;}
   t.x=ox;
   // 尝试垂直对齐
   t.y=snap(t.y);
   if(t.fits(t.x,t.y)){this.wantedDir='up';t.dirKey='up';return;}
   t.y=oy;
   // 尝试反方向
   const opp={up:'down',down:'up',left:'right',right:'left'};
   const reverse=opp[this.wantedDir]||'right';
   if(!this.isBlocked(reverse)){this.wantedDir=reverse;return;}
   // 最后尝试所有方向（含随机）
   this.wantedDir=this.openDir();
  }
 dodgeBullets(){
  for(const b of this.game.bullets){
   if(b.owner===this.tank||b.dead)continue;
   if(Math.hypot(b.x-this.tank.x,b.y-this.tank.y)<CONFIG.AI_DODGE_RANGE){
    const dx=b.dir.x,dy=b.dir.y;
    this.wantedDir=Math.abs(dx)>Math.abs(dy)?(chance(0.5)?'up':'down'):(chance(0.5)?'left':'right');
    this.dirTimer=0.3;return;
   }
  }
 }
 seekPowerups(){
  for(const p of this.game.powerups){
   if(Math.hypot(p.x-this.tank.x,p.y-this.tank.y)<CONFIG.AI_SEEK_RANGE){
    this.wantedDir=this.dirTo(p);this.dirTimer=0.5;return;
   }
  }
 }
}
