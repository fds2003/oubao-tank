'use strict';
class AI{
 constructor(tank,game,diff){
  this.tank=tank;this.game=game;this.diff=diff;
  this.dirTimer=0;this.fireTimer=0;
  this.wantedDir=null;this.wantsFire=false;
 }
 getInterval(){
  if(this.diff==='easy')return rand(1.6,2.6);
  if(this.diff==='normal')return rand(0.8,1.5);
  return rand(0.35,0.75);
 }
 getFireCD(){
  if(this.diff==='easy')return rand(0.65,1.1);
  if(this.diff==='normal')return rand(0.38,0.68);
  return rand(0.18,0.38);
 }
 getCommand(){return{dir:this.wantedDir,fire:this.wantsFire};}
 update(dt){
  this.dirTimer-=dt;this.fireTimer-=dt;
  if(this.dirTimer<=0){this.chooseDir();this.dirTimer=this.getInterval();}
  if(this.fireTimer<=0){this.wantsFire=true;this.fireTimer=this.getFireCD();}
  else this.wantsFire=false;
  if(this.diff!=='easy')this.seekPowerups();
  if(this.diff==='hard')this.dodgeBullets();
 }
 chooseDir(){
  let p=this.game.tanks[0];
  if(this.game.gameMode===2){
   let bestD=Infinity;
   for(const t of this.game.tanks){
    if(t.ai||!t.alive)continue;
    const d=Math.hypot(t.x-this.tank.x,t.y-this.tank.y);
    if(d<bestD){bestD=d;p=t;}
   }
  }
  if(this.diff==='easy'){
   if(chance(0.4))this.wantedDir=['up','down','left','right'][randInt(0,3)];
  }else{
   if(this.hasLOS(p))this.wantedDir=this.dirTo(p);
   else if(chance(0.35))this.wantedDir=['up','down','left','right'][randInt(0,3)];
  }
  if(this.isBlocked(this.wantedDir))this.wantedDir=this.openDir();
 }
 hasLOS(target){
  const dx=target.x-this.tank.x,dy=target.y-this.tank.y;
  const steps=Math.ceil(Math.hypot(dx,dy)/(CELL*0.4));
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
  return this.tank.dirKey;
 }
 dodgeBullets(){
  for(const b of this.game.bullets){
   if(b.owner===this.tank||b.dead)continue;
   if(Math.hypot(b.x-this.tank.x,b.y-this.tank.y)<80){
    this.wantedDir=(b.dirKey==='up'||b.dirKey==='down')?(chance(0.5)?'left':'right'):(chance(0.5)?'up':'down');
    this.dirTimer=0.3;return;
   }
  }
 }
 seekPowerups(){
  for(const p of this.game.powerups){
   if(Math.hypot(p.x-this.tank.x,p.y-this.tank.y)<200){
    this.wantedDir=this.dirTo(p);this.dirTimer=0.5;return;
   }
  }
 }
}
